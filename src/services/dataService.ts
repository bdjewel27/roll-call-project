import { supabase } from './supabaseClient';
import { ATTENDANCE_STATUS, ATTENDANCE_BENCHMARK } from '../constants/attendanceStatus';
import { calculateAttendanceStats } from '../utils/formatters';
import type {
  ClassModel,
  CreateClassPayload,
  UpdateClassPayload,
  Student,
  CreateStudentPayload,
  UpdateStudentPayload,
  Teacher,
  CreateTeacherPayload,
  UpdateTeacherPayload,
  AttendanceStatus,
  AttendanceItem,
  AttendanceRecord,
  AttendanceSessionSummary,
  AttendanceSessionDetail,
  StudentAttendanceMetric,
  AttendanceFilterParams,
} from '../types';

// --- 60-SECOND IN-MEMORY CACHE ---
const CACHE_TTL_MS = 60 * 1000;

interface MemoryCache {
  classes: { data: ClassModel[] | null; timestamp: number };
  students: Map<string, { data: Student[]; timestamp: number }>;
}

const memoryCache: MemoryCache = {
  classes: { data: null, timestamp: 0 },
  students: new Map(), // key: classId || 'ALL' -> { data, timestamp }
};

export const invalidateCache = (type: 'classes' | 'students' | null = null): void => {
  if (!type || type === 'classes') {
    memoryCache.classes = { data: null, timestamp: 0 };
  }
  if (!type || type === 'students') {
    memoryCache.students.clear();
  }
};

export const dataService = {
  invalidateCache,

  // --- CLASSES ---
  async getClasses(forceRefresh = false): Promise<ClassModel[]> {
    const now = Date.now();
    if (!forceRefresh && memoryCache.classes.data && now - memoryCache.classes.timestamp < CACHE_TTL_MS) {
      return memoryCache.classes.data;
    }

    const { data: classes, error } = await supabase
      .from('classes')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('[RollCall] Error fetching classes:', error.message);
      throw error;
    }

    // Fetch assignments from teacher_class_assignments
    const { data: assignments, error: assignError } = await supabase
      .from('teacher_class_assignments')
      .select('class_id, teacher_id');

    if (assignError) {
      console.error('[RollCall] Error fetching class assignments:', assignError.message);
      throw assignError;
    }

    const assignmentMap: Record<string, string[]> = {};
    (assignments || []).forEach((a: any) => {
      if (!assignmentMap[a.class_id]) assignmentMap[a.class_id] = [];
      assignmentMap[a.class_id].push(a.teacher_id);
    });

    // Fetch active students in one query to avoid N+1 queries
    const { data: activeStudents, error: studentsError } = await supabase
      .from('students')
      .select('class_id')
      .eq('is_active', true);

    if (studentsError) {
      console.error('[RollCall] Error fetching student counts for classes:', studentsError.message);
      throw studentsError;
    }

    const studentCountMap: Record<string, number> = {};
    (activeStudents || []).forEach((s: any) => {
      if (s.class_id) {
        studentCountMap[s.class_id] = (studentCountMap[s.class_id] || 0) + 1;
      }
    });

    const classesWithCount: ClassModel[] = (classes || []).map((cls: any) => ({
      ...cls,
      academicYear: cls.academic_year,
      studentCount: studentCountMap[cls.id] || 0,
      assignedTeacherIds: assignmentMap[cls.id] || [],
    }));

    memoryCache.classes = { data: classesWithCount, timestamp: now };
    return classesWithCount;
  },

  async getClassById(id: string): Promise<ClassModel | null> {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('[RollCall] Error fetching class:', error.message);
      return null;
    }
    return {
      ...data,
      academicYear: data.academic_year,
    };
  },

  async createClass(classData: CreateClassPayload): Promise<ClassModel> {
    const { data, error } = await supabase
      .from('classes')
      .insert([
        {
          name: classData.name,
          grade: classData.grade,
          section: classData.section,
          room: classData.room || null,
          academic_year: classData.academicYear || '2026-2027',
          is_active: true,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    invalidateCache('classes');
    return {
      ...data,
      academicYear: data.academic_year,
      studentCount: 0,
      assignedTeacherIds: [],
    };
  },

  async updateClass(id: string, updates: UpdateClassPayload): Promise<ClassModel> {
    const payload: Record<string, any> = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.grade !== undefined) payload.grade = updates.grade;
    if (updates.section !== undefined) payload.section = updates.section;
    if (updates.room !== undefined) payload.room = updates.room;
    if (updates.academicYear !== undefined) payload.academic_year = updates.academicYear;

    const { data, error } = await supabase
      .from('classes')
      .update(payload)
      .eq('id', id)
      .select();

    if (error) throw error;
    invalidateCache('classes');

    const row = Array.isArray(data) ? data[0] : data;
    return {
      ...(row || {}),
      id,
      ...updates,
      academicYear: row?.academic_year || updates.academicYear,
    };
  },

  async deleteClass(id: string): Promise<boolean> {
    // Soft-delete to preserve historical records
    const { error } = await supabase
      .from('classes')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
    invalidateCache('classes');
    return true;
  },

  async getClassesForTeacher(teacherId?: string | null): Promise<ClassModel[]> {
    const allClasses = await this.getClasses();
    if (!teacherId) return allClasses;
    return allClasses.filter((c) => (c.assignedTeacherIds || []).includes(teacherId));
  },

  async assignTeacherToClass(classId: string, teacherId: string): Promise<boolean> {
    const { error } = await supabase
      .from('teacher_class_assignments')
      .insert([{ class_id: classId, teacher_id: teacherId }]);

    if (error && error.code !== '23505') {
      throw error;
    }
    invalidateCache('classes');
    return true;
  },

  async unassignTeacherFromClass(classId: string, teacherId: string): Promise<boolean> {
    const { error } = await supabase
      .from('teacher_class_assignments')
      .delete()
      .eq('class_id', classId)
      .eq('teacher_id', teacherId);

    if (error) throw error;
    invalidateCache('classes');
    return true;
  },

  // --- AVATAR / STORAGE ---
  async uploadAvatar(file: File, customFileName: string | null = null): Promise<string | null> {
    if (!file) return null;
    const fileExt = file.name ? file.name.split('.').pop() : 'png';
    const cleanExt = fileExt?.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'png';
    const fileName = customFileName || `avatar_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${cleanExt}`;

    const { error } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.error('[RollCall] Error uploading avatar to Supabase storage:', error.message);
      throw error;
    }

    const { data: publicUrlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    return publicUrlData?.publicUrl || null;
  },

  // --- STUDENTS ---
  async getStudents(
    classId: string | string[] | null = null,
    forceRefresh: boolean | { signal?: AbortSignal; forceRefresh?: boolean } = false,
    options?: { signal?: AbortSignal }
  ): Promise<Student[]> {
    if (Array.isArray(classId) && classId.length === 0) {
      return [];
    }

    const isOptionsObj = typeof forceRefresh === 'object' && forceRefresh !== null;
    const isForce = isOptionsObj ? !!forceRefresh.forceRefresh : !!forceRefresh;
    const signal = isOptionsObj ? forceRefresh.signal : options?.signal;

    const cacheKey = Array.isArray(classId)
      ? `CLASSES_${classId.slice().sort().join(',')}`
      : classId || 'ALL';
    const now = Date.now();
    const cached = memoryCache.students.get(cacheKey);
    if (!isForce && cached && now - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    const columns = 'id, roll_no, full_name, gender, class_id, guardian_name, guardian_phone, avatar_url';
    let query = supabase
      .from('students')
      .select(columns)
      .eq('is_active', true)
      .order('roll_no');

    if (signal) {
      query = query.abortSignal(signal);
    }

    if (Array.isArray(classId)) {
      query = query.in('class_id', classId);
    } else if (classId && classId !== 'ALL') {
      query = query.eq('class_id', classId);
    }

    const initialRes = await query;
    if (signal?.aborted) return [];
    let data: any[] | null = initialRes.data;
    let error = initialRes.error;

    // Fallback if avatar_url column is not present in legacy schema
    if (error && error.message?.includes('avatar_url')) {
      let fallbackQuery = supabase
        .from('students')
        .select('id, roll_no, full_name, gender, class_id, guardian_name, guardian_phone')
        .eq('is_active', true)
        .order('roll_no');
      if (signal) {
        fallbackQuery = fallbackQuery.abortSignal(signal);
      }
      if (Array.isArray(classId)) {
        fallbackQuery = fallbackQuery.in('class_id', classId);
      } else if (classId && classId !== 'ALL') {
        fallbackQuery = fallbackQuery.eq('class_id', classId);
      }
      const res = await fallbackQuery;
      if (signal?.aborted) return [];
      data = res.data;
      error = res.error;
    }

    if (error) {
      if (signal?.aborted || error.message?.includes('AbortError')) return [];
      console.error('[RollCall] Error fetching students:', error.message);
      throw error;
    }

    const result: Student[] = (data || []).map((s: any) => ({
      id: s.id,
      rollNo: s.roll_no,
      name: s.full_name,
      gender: s.gender,
      classId: s.class_id,
      guardianName: s.guardian_name,
      guardianPhone: s.guardian_phone,
      avatarUrl: s.avatar_url || null,
      avatar_url: s.avatar_url || null,
    }));

    memoryCache.students.set(cacheKey, { data: result, timestamp: now });
    return result;
  },

  async createStudent(studentData: CreateStudentPayload): Promise<Student> {
    const avatarUrl = studentData.avatarUrl || null;

    const payload: Record<string, any> = {
      roll_no: studentData.rollNo,
      full_name: studentData.name,
      gender: studentData.gender,
      class_id: studentData.classId,
      guardian_name: studentData.guardianName || null,
      guardian_phone: studentData.guardianPhone || null,
      is_active: true,
    };
    if (avatarUrl !== undefined && avatarUrl !== null) {
      payload.avatar_url = avatarUrl;
    }

    let { data, error } = await supabase
      .from('students')
      .insert([payload])
      .select()
      .single();

    if (error && error.message?.includes('avatar_url')) {
      console.warn('[RollCall] Column avatar_url does not exist on students table. Retrying insert without avatar_url.');
      delete payload.avatar_url;
      const retry = await supabase
        .from('students')
        .insert([payload])
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) throw error;
    invalidateCache('students');
    invalidateCache('classes');
    return {
      id: data.id,
      rollNo: data.roll_no,
      name: data.full_name,
      gender: data.gender,
      classId: data.class_id,
      guardianName: data.guardian_name,
      guardianPhone: data.guardian_phone,
      avatarUrl: data.avatar_url || avatarUrl || null,
    };
  },

  async addStudent(studentData: CreateStudentPayload): Promise<Student> {
    return this.createStudent(studentData);
  },

  async updateStudent(id: string, updates: UpdateStudentPayload): Promise<Student> {
    const avatarUrl = updates.avatarUrl;

    const payload: Record<string, any> = {};
    if (updates.rollNo !== undefined) payload.roll_no = updates.rollNo;
    if (updates.name !== undefined) payload.full_name = updates.name;
    if (updates.gender !== undefined) payload.gender = updates.gender;
    if (updates.classId !== undefined) payload.class_id = updates.classId;
    if (updates.guardianName !== undefined) payload.guardian_name = updates.guardianName;
    if (updates.guardianPhone !== undefined) payload.guardian_phone = updates.guardianPhone;
    if (avatarUrl !== undefined) payload.avatar_url = avatarUrl;

    let { data, error } = await supabase
      .from('students')
      .update(payload)
      .eq('id', id)
      .select();

    if (error && error.message?.includes('avatar_url')) {
      console.warn('[RollCall] Column avatar_url does not exist on students table. Retrying update without avatar_url.');
      delete payload.avatar_url;
      const retry = await supabase
        .from('students')
        .update(payload)
        .eq('id', id)
        .select();
      data = retry.data;
      error = retry.error;
    }

    if (error) throw error;
    invalidateCache('students');
    invalidateCache('classes');

    const row = Array.isArray(data) ? data[0] : data;
    return {
      id,
      rollNo: row?.roll_no || updates.rollNo || '',
      name: row?.full_name || updates.name || '',
      gender: row?.gender || updates.gender,
      classId: row?.class_id || updates.classId || '',
      guardianName: row?.guardian_name || updates.guardianName,
      guardianPhone: row?.guardian_phone || updates.guardianPhone,
      avatarUrl: row?.avatar_url || avatarUrl || updates.avatarUrl || null,
    };
  },

  async deleteStudent(id: string): Promise<boolean> {
    // Soft-delete to preserve history
    const { error } = await supabase
      .from('students')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
    invalidateCache('students');
    invalidateCache('classes');
    return true;
  },

  // --- TEACHERS ---
  async getTeachers(): Promise<Teacher[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'teacher')
      .order('full_name');

    if (error) {
      console.error('[RollCall] Error fetching teachers:', error.message);
      throw error;
    }

    return (data || []).map((t: any) => ({
      id: t.id,
      name: t.full_name,
      email: t.email,
      phone: t.phone || '',
      subject: t.subject || '',
      assignedClassIds: [],
    }));
  },

  async createTeacher(teacherData: CreateTeacherPayload = {} as CreateTeacherPayload): Promise<Teacher> {
    if (!teacherData?.password || teacherData.password.length < 6) {
      throw new Error('Temporary password must be at least 6 characters.');
    }

    const email = (teacherData?.email || '').trim();
    const fullName = (teacherData?.name || '').trim();

    if (!email || !fullName) {
      throw new Error('Teacher name and email are required.');
    }

    // Invoke Supabase Edge Function to securely manage teacher creation via service role
    try {
      const { data, error } = await supabase.functions.invoke('manage-teachers', {
        body: {
          action: 'createTeacher',
          teacherData: {
            name: fullName,
            email,
            password: teacherData.password,
            phone: teacherData.phone?.trim() || null,
            subject: teacherData.subject?.trim() || null,
            assignedClassIds: teacherData.assignedClassIds || [],
          },
        },
      });

      if (error) {
        let errMsg = error.message;
        if (error.context?.json) {
          try {
            const body = await error.context.json();
            if (body?.error) errMsg = body.error;
          } catch {
            // ignore json parse error
          }
        }
        throw new Error(errMsg || 'Failed to create teacher via edge function.');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.warning) {
        console.warn('[RollCall] ' + data.warning);
      }

      if (data?.data) {
        return data.data;
      }

      throw new Error('Failed to create teacher. No data returned.');
    } catch (edgeErr: any) {
      const isUnavailable =
        edgeErr.message?.includes('Failed to send') ||
        edgeErr.message?.includes('not found') ||
        edgeErr.message?.includes('FunctionsFetchError') ||
        edgeErr.message?.includes('404') ||
        edgeErr.message?.includes('relay');

      if (isUnavailable) {
        throw new Error('Edge Function is required for secure teacher creation. Please ensure "manage-teachers" is deployed.');
      }
      throw edgeErr;
    }
  },

  async updateTeacher(id: string, updates: UpdateTeacherPayload): Promise<Teacher> {
    const payload: Record<string, any> = {};
    if (updates.name !== undefined) payload.full_name = updates.name;
    if (updates.email !== undefined) payload.email = updates.email;
    if (updates.phone !== undefined) payload.phone = updates.phone;
    if (updates.subject !== undefined) payload.subject = updates.subject;

    // Use .select() and handle returned rows safely to avoid coercion errors if RLS returns 0 rows
    const { data, error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', id)
      .select();

    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      console.warn('[RollCall] updateTeacher: 0 rows modified or returned. Check RLS policies on profiles table.');
      return {
        id,
        name: updates.name || '',
        email: updates.email || '',
        phone: updates.phone || '',
        subject: updates.subject || '',
      };
    }

    return {
      id: row.id,
      name: row.full_name,
      email: row.email,
      phone: row.phone || '',
      subject: row.subject || '',
    };
  },

  async deleteTeacher(id: string): Promise<boolean> {
    if (!id) {
      throw new Error('Teacher ID is required to delete teacher.');
    }

    try {
      const { data, error } = await supabase.functions.invoke('manage-teachers', {
        body: {
          action: 'deleteTeacher',
          teacherId: id,
        },
      });

      if (error) {
        let errMsg = error.message;
        if (error.context?.json) {
          try {
            const body = await error.context.json();
            if (body?.error) errMsg = body.error;
          } catch {
            // ignore
          }
        }
        throw new Error(errMsg || 'Failed to delete teacher via edge function.');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return true;
    } catch (edgeErr: any) {
      const isUnavailable =
        edgeErr.message?.includes('Failed to send') ||
        edgeErr.message?.includes('not found') ||
        edgeErr.message?.includes('FunctionsFetchError') ||
        edgeErr.message?.includes('404') ||
        edgeErr.message?.includes('relay');

      if (!isUnavailable) {
        throw edgeErr;
      }

      console.warn('[RollCall] manage-teachers edge function not available, using fallback:', edgeErr.message);

      // Fallback: Remove any assignments in teacher_class_assignments
      const { error: assignError } = await supabase
        .from('teacher_class_assignments')
        .delete()
        .eq('teacher_id', id);

      if (assignError) {
        console.error('[RollCall] Error removing teacher assignments:', assignError.message);
        throw assignError;
      }

      // Remove profile from public.profiles where id matches
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[RollCall] Error deleting teacher profile:', error.message);
        throw error;
      }

      return true;
    }
  },

  // --- ATTENDANCE ---
  async getAttendanceRecord(
    classId: string,
    date: string,
    options?: { signal?: AbortSignal }
  ): Promise<AttendanceRecord | null> {
    const signal = options?.signal;

    let sessionQuery = supabase
      .from('attendance_sessions')
      .select('id, class_id, date, marked_by, marked_at')
      .eq('class_id', classId)
      .eq('date', date);

    if (signal) {
      sessionQuery = sessionQuery.abortSignal(signal);
    }

    const { data: session, error: sErr } = await sessionQuery.maybeSingle();

    if (signal?.aborted) return null;
    if (sErr) {
      if (signal?.aborted || sErr.message?.includes('AbortError')) return null;
      throw sErr;
    }
    if (!session) return null;

    let recordsQuery = supabase
      .from('attendance_records')
      .select('*, students(id, roll_no, full_name, gender, avatar_url, is_active)')
      .eq('session_id', session.id);

    if (signal) {
      recordsQuery = recordsQuery.abortSignal(signal);
    }

    const { data: records, error: rErr } = await recordsQuery;

    if (signal?.aborted) return null;
    if (rErr) {
      if (signal?.aborted || rErr.message?.includes('AbortError')) return null;
      console.error('[RollCall] Error fetching attendance records:', rErr.message);
      throw rErr;
    }

    return {
      classId: session.class_id,
      date: session.date,
      markedBy: session.marked_by,
      markedAt: session.marked_at,
      students: (records || []).map((r: any) => ({
        studentId: r.student_id,
        status: r.status as AttendanceStatus,
        remark: r.remark || '',
        student: r.students
          ? {
              id: r.students.id,
              rollNo: r.students.roll_no,
              name: r.students.full_name,
              gender: r.students.gender,
              avatarUrl: r.students.avatar_url || null,
              avatar_url: r.students.avatar_url || null,
              isActive: r.students.is_active,
            }
          : null,
      })),
    };
  },

  async saveAttendance(
    classId: string,
    date: string,
    studentRecords: Array<{ studentId?: string; student_id?: string; status: AttendanceStatus; remark?: string | null }>,
    teacherId: string | null = null
  ): Promise<{ classId: string; date: string; students: any[] }> {
    if (!studentRecords || !Array.isArray(studentRecords) || studentRecords.length === 0) {
      throw new Error('Attendance records cannot be empty or null.');
    }

    const isValidUuid = (str: any): boolean =>
      typeof str === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

    const validTeacherId = isValidUuid(teacherId) ? teacherId : null;

    const recordsPayload = (studentRecords || []).map((r) => ({
      student_id: r.studentId || r.student_id,
      status: r.status,
      remark: r.remark || null,
    }));

    const { error } = await supabase.rpc('save_attendance_atomic', {
      p_class_id: classId,
      p_date: date,
      p_records: recordsPayload,
      p_teacher_id: validTeacherId,
    });

    if (error) {
      console.error('[RollCall] Error in save_attendance_atomic RPC:', error.message);
      throw error;
    }

    return { classId, date, students: studentRecords };
  },

  // Returns all attendance logs with optional filter, querying Supabase
  async getAttendanceHistory(
    classId: string | string[] | AttendanceFilterParams | null = null,
    startDate: string | null = null,
    endDate: string | null = null,
    options?: { signal?: AbortSignal }
  ): Promise<AttendanceSessionSummary[]> {
    let cId: string | string[] | null = null;
    let sDate: string | null = startDate;
    let eDate: string | null = endDate;
    let signal: AbortSignal | undefined = options?.signal;

    if (typeof classId === 'object' && classId !== null && !Array.isArray(classId)) {
      cId = classId.classId ?? null;
      sDate = classId.startDate ?? null;
      eDate = classId.endDate ?? null;
      if (!signal && (classId as any).signal) {
        signal = (classId as any).signal;
      }
    } else {
      cId = classId;
    }

    if (Array.isArray(cId) && cId.length === 0) {
      return [];
    }

    let query = supabase
      .from('attendance_sessions')
      .select(`
        id,
        class_id,
        date,
        marked_by,
        marked_at,
        classes (
          id,
          name,
          grade,
          section,
          room
        ),
        attendance_records (
          id,
          student_id,
          status,
          remark,
          students (
            id,
            roll_no,
            full_name
          )
        )
      `)
      .order('date', { ascending: false });

    if (Array.isArray(cId)) {
      query = query.in('class_id', cId);
    } else if (cId && cId !== 'ALL') {
      query = query.eq('class_id', cId);
    }
    if (sDate) {
      query = query.gte('date', sDate);
    }
    if (eDate) {
      query = query.lte('date', eDate);
    }

    if (signal) {
      query = query.abortSignal(signal);
    }

    const { data: sessions, error } = await query;

    if (signal?.aborted) return [];
    if (error) {
      if (signal?.aborted || error.message?.includes('AbortError')) return [];
      console.error('[RollCall] Error fetching attendance history:', error.message);
      throw error;
    }

    return (sessions || []).map((session: any) => {
      const records = session.attendance_records || [];
      const stats = calculateAttendanceStats(records);

      const students: AttendanceItem[] = records.map((r: any) => ({
        id: r.id,
        studentId: r.student_id,
        rollNo: r.students?.roll_no || '-',
        studentName: r.students?.full_name || 'Unknown Student',
        status: r.status as AttendanceStatus,
        remark: r.remark || '',
      }));

      return {
        id: session.id,
        classId: session.class_id,
        className: session.classes?.name || 'Unknown Class',
        classInfo: session.classes,
        date: session.date,
        markedBy: session.marked_by || 'Unknown',
        markedAt: session.marked_at,
        stats,
        students,
      };
    });
  },

  // Get student attendance metrics for reports
  async getStudentAttendanceMetrics(
    classId: string | string[] | AttendanceFilterParams | null = null,
    startDate: string | null = null,
    endDate: string | null = null
  ): Promise<StudentAttendanceMetric[]> {
    let cId: string | string[] | null = null;
    let sDate: string | null = startDate;
    let eDate: string | null = endDate;

    if (typeof classId === 'object' && classId !== null && !Array.isArray(classId)) {
      cId = classId.classId ?? null;
      sDate = classId.startDate ?? null;
      eDate = classId.endDate ?? null;
    } else {
      cId = classId;
    }

    if (Array.isArray(cId) && cId.length === 0) {
      return [];
    }

    const targetClass = cId && cId !== 'ALL' ? cId : null;
    const students = await this.getStudents(targetClass);
    const history = await this.getAttendanceHistory(targetClass, sDate, eDate);

    interface MetricEntry {
      total: number;
      present: number;
      absent: number;
      late: number;
      leave: number;
      sessions: AttendanceSessionDetail[];
    }

    const metricsMap = new Map<string, MetricEntry>();
    const studentMetaMap = new Map<string, Student>();

    history.forEach((session) => {
      (session.students || []).forEach((studentLog) => {
        if (!studentLog?.studentId) return;

        if (!studentMetaMap.has(studentLog.studentId)) {
          studentMetaMap.set(studentLog.studentId, {
            id: studentLog.studentId,
            rollNo: studentLog.rollNo || '-',
            name: studentLog.studentName || 'Unknown Student',
            classId: session.classId || (typeof classId === 'string' && classId !== 'ALL' ? classId : ''),
            isActive: false,
          });
        }

        let entry = metricsMap.get(studentLog.studentId);
        if (!entry) {
          entry = { total: 0, present: 0, absent: 0, late: 0, leave: 0, sessions: [] };
          metricsMap.set(studentLog.studentId, entry);
        }

        entry.total++;
        if (studentLog.status === ATTENDANCE_STATUS.PRESENT) entry.present++;
        else if (studentLog.status === ATTENDANCE_STATUS.ABSENT) entry.absent++;
        else if (studentLog.status === ATTENDANCE_STATUS.LATE) entry.late++;
        else if (studentLog.status === ATTENDANCE_STATUS.LEAVE) entry.leave++;

        entry.sessions.push({
          sessionId: session.id,
          date: session.date,
          className: session.className,
          status: studentLog.status,
          remark: studentLog.remark || '',
        });
      });
    });

    const calculateConsecutiveAbsences = (sessionList: AttendanceSessionDetail[] = []): number => {
      const sorted = [...sessionList].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      let count = 0;
      for (const s of sorted) {
        if (s.status === ATTENDANCE_STATUS.ABSENT) {
          count++;
        } else {
          break;
        }
      }
      return count;
    };

    const activeStudentIds = new Set(students.map((s) => s.id));
    const activeMetrics: StudentAttendanceMetric[] = students.map((std) => {
      const entry = metricsMap.get(std.id) || {
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        leave: 0,
        sessions: [],
      };

      const { total, present, absent, late, leave, sessions = [] } = entry;
      const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 100;
      const consecutiveAbsentDays = calculateConsecutiveAbsences(sessions);

      return {
        student: std,
        totalSessions: total,
        present,
        absent,
        late,
        leave,
        rate,
        isAtRisk: rate < ATTENDANCE_BENCHMARK.AT_RISK_THRESHOLD && total > 0,
        isConsecutiveAbsent: consecutiveAbsentDays >= 3,
        consecutiveAbsentDays,
        sessions,
      };
    });

    const historicalMetrics: StudentAttendanceMetric[] = [];
    metricsMap.forEach((entry, studentId) => {
      if (!activeStudentIds.has(studentId)) {
        const std = studentMetaMap.get(studentId) || {
          id: studentId,
          rollNo: '-',
          name: 'Unknown Student',
          classId: typeof classId === 'string' && classId !== 'ALL' ? classId : '',
          isActive: false,
        };
        const { total, present, absent, late, leave, sessions = [] } = entry;
        const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 100;
        const consecutiveAbsentDays = calculateConsecutiveAbsences(sessions);

        historicalMetrics.push({
          student: std,
          totalSessions: total,
          present,
          absent,
          late,
          leave,
          rate,
          isAtRisk: rate < ATTENDANCE_BENCHMARK.AT_RISK_THRESHOLD && total > 0,
          isConsecutiveAbsent: consecutiveAbsentDays >= 3,
          consecutiveAbsentDays,
          sessions,
        });
      }
    });

    return [...activeMetrics, ...historicalMetrics].sort((a, b) => {
      const rollA = parseInt(String(a.student.rollNo), 10);
      const rollB = parseInt(String(b.student.rollNo), 10);
      if (!isNaN(rollA) && !isNaN(rollB)) return rollA - rollB;
      return String(a.student.rollNo).localeCompare(String(b.student.rollNo));
    });
  },
};
