import { supabase, createAuthClient } from './supabaseClient';
import { ATTENDANCE_STATUS } from '../constants/attendanceStatus';
import { calculateAttendanceStats } from '../utils/formatters';

// --- 60-SECOND IN-MEMORY CACHE ---
const CACHE_TTL_MS = 60 * 1000;
const memoryCache = {
  classes: { data: null, timestamp: 0 },
  students: new Map(), // key: classId || 'ALL' -> { data, timestamp }
};

export const invalidateCache = (type = null) => {
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
  async getClasses(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && memoryCache.classes.data && (now - memoryCache.classes.timestamp < CACHE_TTL_MS)) {
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

    const assignmentMap = {};
    (assignments || []).forEach((a) => {
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

    const studentCountMap = {};
    (activeStudents || []).forEach((s) => {
      if (s.class_id) {
        studentCountMap[s.class_id] = (studentCountMap[s.class_id] || 0) + 1;
      }
    });

    const classesWithCount = (classes || []).map((cls) => ({
      ...cls,
      studentCount: studentCountMap[cls.id] || 0,
      assignedTeacherIds: assignmentMap[cls.id] || [],
    }));

    memoryCache.classes = { data: classesWithCount, timestamp: now };
    return classesWithCount;
  },

  async getClassById(id) {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('[RollCall] Error fetching class:', error.message);
      return null;
    }
    return data;
  },

  async createClass(classData) {
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

  async updateClass(id, updates) {
    const payload = {};
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

  async deleteClass(id) {
    // Soft-delete to preserve historical records
    const { error } = await supabase
      .from('classes')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
    invalidateCache('classes');
    return true;
  },

  async getClassesForTeacher(teacherId) {
    const allClasses = await this.getClasses();
    if (!teacherId) return allClasses;
    return allClasses.filter((c) => (c.assignedTeacherIds || []).includes(teacherId));
  },

  async assignTeacherToClass(classId, teacherId) {
    const { error } = await supabase
      .from('teacher_class_assignments')
      .insert([{ class_id: classId, teacher_id: teacherId }]);

    if (error && error.code !== '23505') {
      throw error;
    }
    invalidateCache('classes');
    return true;
  },

  async unassignTeacherFromClass(classId, teacherId) {
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
  async uploadAvatar(file, customFileName = null) {
    if (!file) return null;
    const fileExt = file.name ? file.name.split('.').pop() : 'png';
    const cleanExt = fileExt.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'png';
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
  async getStudents(classId = null, forceRefresh = false) {
    const cacheKey = classId || 'ALL';
    const now = Date.now();
    const cached = memoryCache.students.get(cacheKey);
    if (!forceRefresh && cached && (now - cached.timestamp < CACHE_TTL_MS)) {
      return cached.data;
    }

    const columns = 'id, roll_no, full_name, gender, class_id, guardian_name, guardian_phone, avatar_url';
    let query = supabase
      .from('students')
      .select(columns)
      .eq('is_active', true)
      .order('roll_no');

    if (classId) {
      query = query.eq('class_id', classId);
    }

    let { data, error } = await query;

    // Fallback if avatar_url column is not present in legacy schema
    if (error && error.message?.includes('avatar_url')) {
      const fallbackQuery = supabase
        .from('students')
        .select('id, roll_no, full_name, gender, class_id, guardian_name, guardian_phone')
        .eq('is_active', true)
        .order('roll_no');
      const res = classId ? await fallbackQuery.eq('class_id', classId) : await fallbackQuery;
      data = res.data;
      error = res.error;
    }

    if (error) {
      console.error('[RollCall] Error fetching students:', error.message);
      throw error;
    }

    const result = (data || []).map((s) => ({
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

  async createStudent(studentData) {
    const avatarUrl = studentData.avatarUrl || null;

    const payload = {
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

  async addStudent(studentData) {
    return this.createStudent(studentData);
  },

  async updateStudent(id, updates) {
    const avatarUrl = updates.avatarUrl;

    const payload = {};
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
      rollNo: row?.roll_no || updates.rollNo,
      name: row?.full_name || updates.name,
      gender: row?.gender || updates.gender,
      classId: row?.class_id || updates.classId,
      guardianName: row?.guardian_name || updates.guardianName,
      guardianPhone: row?.guardian_phone || updates.guardianPhone,
      avatarUrl: row?.avatar_url || avatarUrl || updates.avatarUrl || null,
    };
  },

  async deleteStudent(id) {
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
  async getTeachers() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'teacher')
      .order('full_name');

    if (error) {
      console.error('[RollCall] Error fetching teachers:', error.message);
      throw error;
    }

    return (data || []).map((t) => ({
      id: t.id,
      name: t.full_name,
      email: t.email,
      phone: t.phone || '',
      subject: t.subject || '',
      assignedClassIds: [],
    }));
  },

  async createTeacher(teacherData) {
    if (!teacherData.password || teacherData.password.length < 6) {
      throw new Error('Temporary password must be at least 6 characters.');
    }

    const email = teacherData.email.trim();
    const fullName = teacherData.name.trim();

    // 1. Create teacher account in Supabase Auth using isolated client so admin session is not replaced
    const authClient = createAuthClient();
    const { data: authData, error: authError } = await authClient.auth.signUp({
      email,
      password: teacherData.password,
      options: {
        data: {
          full_name: fullName,
          role: 'teacher',
          phone: teacherData.phone?.trim() || null,
          subject: teacherData.subject?.trim() || null,
        },
      },
    });

    if (authError) {
      throw authError;
    }

    const userId = authData?.user?.id;
    if (!userId) {
      throw new Error('Failed to create teacher in Supabase Auth: No user ID returned.');
    }

    // Check if user already exists (Supabase returns empty identities when user already exists)
    if (authData.user.identities && authData.user.identities.length === 0) {
      throw new Error('A user with this email address already exists in Supabase Auth.');
    }

    // 2. Ensure profile record is created/upserted in public.profiles table
    const profilePayload = {
      id: userId,
      full_name: fullName,
      email: email,
      phone: teacherData.phone?.trim() || null,
      subject: teacherData.subject?.trim() || null,
      role: 'teacher',
    };

    let { data: profileRow, error: profileError } = await supabase
      .from('profiles')
      .upsert(profilePayload, { onConflict: 'id' })
      .select()
      .maybeSingle();

    if (profileError) {
      console.warn('[RollCall] Note on profiles upsert:', profileError.message);
      // Fallback direct insert if upsert is restricted
      const { data: insertedRow, error: insertError } = await supabase
        .from('profiles')
        .insert([profilePayload])
        .select()
        .maybeSingle();

      if (insertError) {
        throw new Error(`Failed to create teacher profile: ${insertError.message || profileError.message}`);
      }

      profileRow = insertedRow;
    }

    if (!profileRow) {
      throw new Error('Failed to create teacher profile: No profile record returned.');
    }

    return {
      id: profileRow.id,
      name: profileRow.full_name || fullName,
      email: profileRow.email || email,
      phone: profileRow.phone || teacherData.phone || '',
      subject: profileRow.subject || teacherData.subject || '',
      assignedClassIds: [],
    };
  },

  async updateTeacher(id, updates) {
    const payload = {};
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

  async deleteTeacher(id) {
    if (!id) {
      throw new Error('Teacher ID is required to delete teacher.');
    }

    // Remove any assignments in teacher_class_assignments
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
  },

  // --- ATTENDANCE ---
  async getAttendanceRecord(classId, date) {
    const { data: session, error: sErr } = await supabase
      .from('attendance_sessions')
      .select('id, class_id, date, marked_by, marked_at')
      .eq('class_id', classId)
      .eq('date', date)
      .maybeSingle();

    if (sErr) throw sErr;
    if (!session) return null;

    const { data: records, error: rErr } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('session_id', session.id);

    if (rErr) {
      console.error('[RollCall] Error fetching attendance records:', rErr.message);
      throw rErr;
    }

    return {
      classId: session.class_id,
      date: session.date,
      markedBy: session.marked_by,
      markedAt: session.marked_at,
      students: (records || []).map((r) => ({
        studentId: r.student_id,
        status: r.status,
        remark: r.remark || '',
      })),
    };
  },

  async saveAttendance(classId, date, studentRecords, teacherId = null) {
    let { data: session, error: sErr } = await supabase
      .from('attendance_sessions')
      .select('id')
      .eq('class_id', classId)
      .eq('date', date)
      .maybeSingle();

    if (sErr && sErr.code !== 'PGRST116') {
      throw sErr;
    }

    const isValidUuid = (str) =>
      typeof str === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

    const validTeacherId = isValidUuid(teacherId) ? teacherId : null;

    if (!session) {
      const { data: newSession, error: createErr } = await supabase
        .from('attendance_sessions')
        .insert([{ class_id: classId, date: date, marked_by: validTeacherId }])
        .select('id')
        .single();

      if (createErr) throw createErr;
      session = newSession;
    }

    const { error: delErr } = await supabase
      .from('attendance_records')
      .delete()
      .eq('session_id', session.id);

    if (delErr) throw delErr;

    const recordsToInsert = studentRecords.map((r) => ({
      session_id: session.id,
      student_id: r.studentId,
      class_id: classId,
      status: r.status,
      remark: r.remark || null,
    }));

    const { error: insErr } = await supabase
      .from('attendance_records')
      .insert(recordsToInsert);

    if (insErr) throw insErr;

    return { classId, date, students: studentRecords };
  },

  // Returns all attendance logs with optional filter, querying Supabase
  async getAttendanceHistory(classId = null, startDate = null, endDate = null) {
    // Support object argument or positional parameters: getAttendanceHistory({ classId, startDate, endDate }) or getAttendanceHistory(classId, startDate, endDate)
    let cId = classId;
    let sDate = startDate;
    let eDate = endDate;

    if (typeof classId === 'object' && classId !== null) {
      cId = classId.classId;
      sDate = classId.startDate;
      eDate = classId.endDate;
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

    if (cId && cId !== 'ALL') {
      query = query.eq('class_id', cId);
    }
    if (sDate) {
      query = query.gte('date', sDate);
    }
    if (eDate) {
      query = query.lte('date', eDate);
    }

    const { data: sessions, error } = await query;

    if (error) {
      console.error('[RollCall] Error fetching attendance history:', error.message);
      throw error;
    }

    return (sessions || []).map((session) => {
      const records = session.attendance_records || [];
      const stats = calculateAttendanceStats(records);

      const students = records.map((r) => ({
        id: r.id,
        studentId: r.student_id,
        rollNo: r.students?.roll_no || '-',
        studentName: r.students?.full_name || 'Unknown Student',
        status: r.status,
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
  async getStudentAttendanceMetrics(classId = null) {
    const students = await this.getStudents(classId && classId !== 'ALL' ? classId : null);
    const history = await this.getAttendanceHistory(classId && classId !== 'ALL' ? classId : null);

    const metricsMap = new Map();

    history.forEach((session) => {
      (session.students || []).forEach((studentLog) => {
        if (!studentLog?.studentId) return;

        let entry = metricsMap.get(studentLog.studentId);
        if (!entry) {
          entry = { total: 0, present: 0, absent: 0, late: 0, leave: 0 };
          metricsMap.set(studentLog.studentId, entry);
        }

        entry.total++;
        if (studentLog.status === ATTENDANCE_STATUS.PRESENT) entry.present++;
        else if (studentLog.status === ATTENDANCE_STATUS.ABSENT) entry.absent++;
        else if (studentLog.status === ATTENDANCE_STATUS.LATE) entry.late++;
        else if (studentLog.status === ATTENDANCE_STATUS.LEAVE) entry.leave++;
      });
    });

    return students.map((std) => {
      const entry = metricsMap.get(std.id) || {
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        leave: 0,
      };

      const { total, present, absent, late, leave } = entry;
      const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 100;

      return {
        student: std,
        totalSessions: total,
        present,
        absent,
        late,
        leave,
        rate,
        isAtRisk: rate < 75 && total > 0,
      };
    });
  },
};