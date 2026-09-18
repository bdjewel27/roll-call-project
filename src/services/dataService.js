import { supabase } from './supabaseClient';
import { ATTENDANCE_STATUS } from '../constants/attendanceStatus';

export const dataService = {
  // --- CLASSES ---
  async getClasses() {
    const { data: classes, error } = await supabase
      .from('classes')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('[RollCall] Error fetching classes:', error.message);
      return [];
    }

    // Fetch assignments from teacher_class_assignments
    const { data: assignments } = await supabase
      .from('teacher_class_assignments')
      .select('class_id, teacher_id');

    const assignmentMap = {};
    (assignments || []).forEach((a) => {
      if (!assignmentMap[a.class_id]) assignmentMap[a.class_id] = [];
      assignmentMap[a.class_id].push(a.teacher_id);
    });

    // প্রতি ক্লাসের শিক্ষার্থীদের সংখ্যা গণনা
    const classesWithCount = await Promise.all(
      (classes || []).map(async (cls) => {
        const { count, error: countErr } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('class_id', cls.id)
          .eq('is_active', true);

        return {
          ...cls,
          studentCount: countErr ? 0 : (count || 0),
          assignedTeacherIds: assignmentMap[cls.id] || [],
        };
      })
    );

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
    return true;
  },

  async unassignTeacherFromClass(classId, teacherId) {
    const { error } = await supabase
      .from('teacher_class_assignments')
      .delete()
      .eq('class_id', classId)
      .eq('teacher_id', teacherId);

    if (error) throw error;
    return true;
  },

  // --- STUDENTS ---
  async getStudents(classId = null) {
    let query = supabase
      .from('students')
      .select('*')
      .eq('is_active', true)
      .order('roll_no');

    if (classId) {
      query = query.eq('class_id', classId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[RollCall] Error fetching students:', error.message);
      return [];
    }

    return (data || []).map((s) => ({
      id: s.id,
      rollNo: s.roll_no,
      name: s.full_name,
      gender: s.gender,
      classId: s.class_id,
      guardianName: s.guardian_name,
      guardianPhone: s.guardian_phone,
    }));
  },

  async createStudent(studentData) {
    const { data, error } = await supabase
      .from('students')
      .insert([
        {
          roll_no: studentData.rollNo,
          full_name: studentData.name,
          gender: studentData.gender,
          class_id: studentData.classId,
          guardian_name: studentData.guardianName || null,
          guardian_phone: studentData.guardianPhone || null,
          is_active: true,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      rollNo: data.roll_no,
      name: data.full_name,
      gender: data.gender,
      classId: data.class_id,
      guardianName: data.guardian_name,
      guardianPhone: data.guardian_phone,
    };
  },

  async updateStudent(id, updates) {
    const payload = {};
    if (updates.rollNo !== undefined) payload.roll_no = updates.rollNo;
    if (updates.name !== undefined) payload.full_name = updates.name;
    if (updates.gender !== undefined) payload.gender = updates.gender;
    if (updates.classId !== undefined) payload.class_id = updates.classId;
    if (updates.guardianName !== undefined) payload.guardian_name = updates.guardianName;
    if (updates.guardianPhone !== undefined) payload.guardian_phone = updates.guardianPhone;

    const { data, error } = await supabase
      .from('students')
      .update(payload)
      .eq('id', id)
      .select();

    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    return {
      id,
      rollNo: row?.roll_no || updates.rollNo,
      name: row?.full_name || updates.name,
      gender: row?.gender || updates.gender,
      classId: row?.class_id || updates.classId,
      guardianName: row?.guardian_name || updates.guardianName,
      guardianPhone: row?.guardian_phone || updates.guardianPhone,
    };
  },

  async deleteStudent(id) {
    // Soft-delete to preserve history
    const { error } = await supabase
      .from('students')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
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
      return [];
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
    // Creates profile row directly if profile trigger/auth handled separately
    const { data, error } = await supabase
      .from('profiles')
      .insert([
        {
          full_name: teacherData.name,
          email: teacherData.email,
          phone: teacherData.phone || null,
          subject: teacherData.subject || null,
          role: 'teacher',
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      name: data.full_name,
      email: data.email,
      phone: data.phone || '',
      subject: data.subject || '',
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
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);

    if (error) throw error;
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

    if (sErr || !session) return null;

    const { data: records, error: rErr } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('session_id', session.id);

    if (rErr) {
      console.error('[RollCall] Error fetching attendance records:', rErr.message);
      return null;
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

    await supabase.from('attendance_records').delete().eq('session_id', session.id);

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
      return [];
    }

    return (sessions || []).map((session) => {
      const records = session.attendance_records || [];
      const total = records.length;
      const present = records.filter((r) => r.status === ATTENDANCE_STATUS.PRESENT).length;
      const absent = records.filter((r) => r.status === ATTENDANCE_STATUS.ABSENT).length;
      const late = records.filter((r) => r.status === ATTENDANCE_STATUS.LATE).length;
      const leave = records.filter((r) => r.status === ATTENDANCE_STATUS.LEAVE).length;
      const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

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
        stats: { total, present, absent, late, leave, rate },
        students,
      };
    });
  },

  // Get student attendance metrics for reports
  async getStudentAttendanceMetrics(classId = null) {
    const students = await this.getStudents(classId && classId !== 'ALL' ? classId : null);
    const history = await this.getAttendanceHistory(classId && classId !== 'ALL' ? classId : null);

    return students.map((std) => {
      let total = 0;
      let present = 0;
      let absent = 0;
      let late = 0;
      let leave = 0;

      history.forEach((session) => {
        const studentLog = (session.students || []).find((s) => s.studentId === std.id);
        if (studentLog) {
          total++;
          if (studentLog.status === ATTENDANCE_STATUS.PRESENT) present++;
          else if (studentLog.status === ATTENDANCE_STATUS.ABSENT) absent++;
          else if (studentLog.status === ATTENDANCE_STATUS.LATE) late++;
          else if (studentLog.status === ATTENDANCE_STATUS.LEAVE) leave++;
        }
      });

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