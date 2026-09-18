/**
 * Mock Data Service for Roll Call Attendance System
 * Provides local storage persistence and mock datasets for:
 * - Classes
 * - Teachers
 * - Students
 * - Teacher-Class Assignments
 * - Multi-Day Attendance Records (Present, Absent, Late, Leave)
 */

import { ATTENDANCE_STATUS } from '../constants/attendanceStatus';

const STORAGE_KEYS = {
  CLASSES: 'rollcall_mock_classes',
  TEACHERS: 'rollcall_mock_teachers',
  STUDENTS: 'rollcall_mock_students',
  ATTENDANCE: 'rollcall_mock_attendance',
};

// Default initial datasets
const DEFAULT_CLASSES = [
  { id: 'cls-1', name: 'Grade 10 - Section A', grade: '10', section: 'A', room: 'Room 201', academicYear: '2026-2027', studentCount: 6, assignedTeacherIds: ['tch-1'] },
  { id: 'cls-2', name: 'Grade 10 - Section B', grade: '10', section: 'B', room: 'Room 202', academicYear: '2026-2027', studentCount: 5, assignedTeacherIds: ['tch-2'] },
  { id: 'cls-3', name: 'Grade 11 - Science', grade: '11', section: 'Science', room: 'Lab 1', academicYear: '2026-2027', studentCount: 5, assignedTeacherIds: ['tch-1', 'tch-3'] },
  { id: 'cls-4', name: 'Grade 12 - Commerce', grade: '12', section: 'Commerce', room: 'Room 304', academicYear: '2026-2027', studentCount: 4, assignedTeacherIds: ['tch-4'] },
];

const DEFAULT_TEACHERS = [
  { id: 'tch-1', name: 'Sarah Jenkins', email: 'teacher@school.edu', phone: '+1 (555) 234-5678', subject: 'Mathematics & Physics', assignedClassIds: ['cls-1', 'cls-3'] },
  { id: 'tch-2', name: 'Marcus Vance', email: 'm.vance@school.edu', phone: '+1 (555) 345-6789', subject: 'English Literature', assignedClassIds: ['cls-2'] },
  { id: 'tch-3', name: 'Elena Rostova', email: 'e.rostova@school.edu', phone: '+1 (555) 456-7890', subject: 'Chemistry', assignedClassIds: ['cls-3'] },
  { id: 'tch-4', name: 'David Chen', email: 'd.chen@school.edu', phone: '+1 (555) 567-8901', subject: 'Accounting & Economics', assignedClassIds: ['cls-4'] },
];

const DEFAULT_STUDENTS = [
  // Class 1 (Grade 10 - Section A)
  { id: 'std-101', rollNo: '10-01', name: 'Alice Walker', gender: 'Female', classId: 'cls-1', guardianName: 'Robert Walker', guardianPhone: '+1 555-0101' },
  { id: 'std-102', rollNo: '10-02', name: 'Brian Miller', gender: 'Male', classId: 'cls-1', guardianName: 'Diana Miller', guardianPhone: '+1 555-0102' },
  { id: 'std-103', rollNo: '10-03', name: 'Catherine Davis', gender: 'Female', classId: 'cls-1', guardianName: 'George Davis', guardianPhone: '+1 555-0103' },
  { id: 'std-104', rollNo: '10-04', name: 'Daniel Wilson', gender: 'Male', classId: 'cls-1', guardianName: 'Lisa Wilson', guardianPhone: '+1 555-0104' },
  { id: 'std-105', rollNo: '10-05', name: 'Emma Martinez', gender: 'Female', classId: 'cls-1', guardianName: 'Carlos Martinez', guardianPhone: '+1 555-0105' },
  { id: 'std-106', rollNo: '10-06', name: 'Felix Nguyen', gender: 'Male', classId: 'cls-1', guardianName: 'Thanh Nguyen', guardianPhone: '+1 555-0106' },

  // Class 2 (Grade 10 - Section B)
  { id: 'std-201', rollNo: '10-B1', name: 'Grace Hopper', gender: 'Female', classId: 'cls-2', guardianName: 'Walter Hopper', guardianPhone: '+1 555-0201' },
  { id: 'std-202', rollNo: '10-B2', name: 'Henry Adams', gender: 'Male', classId: 'cls-2', guardianName: 'Mary Adams', guardianPhone: '+1 555-0202' },
  { id: 'std-203', rollNo: '10-B3', name: 'Isabella Rossi', gender: 'Female', classId: 'cls-2', guardianName: 'Antonio Rossi', guardianPhone: '+1 555-0203' },
  { id: 'std-204', rollNo: '10-B4', name: 'Jack Taylor', gender: 'Male', classId: 'cls-2', guardianName: 'Sarah Taylor', guardianPhone: '+1 555-0204' },
  { id: 'std-205', rollNo: '10-B5', name: 'Kayla Patel', gender: 'Female', classId: 'cls-2', guardianName: 'Raj Patel', guardianPhone: '+1 555-0205' },

  // Class 3 (Grade 11 - Science)
  { id: 'std-301', rollNo: '11-S1', name: 'Liam Murphy', gender: 'Male', classId: 'cls-3', guardianName: 'Sean Murphy', guardianPhone: '+1 555-0301' },
  { id: 'std-302', rollNo: '11-S2', name: 'Mia Robinson', gender: 'Female', classId: 'cls-3', guardianName: 'Helen Robinson', guardianPhone: '+1 555-0302' },
  { id: 'std-303', rollNo: '11-S3', name: 'Noah Clark', gender: 'Male', classId: 'cls-3', guardianName: 'Edward Clark', guardianPhone: '+1 555-0303' },
  { id: 'std-304', rollNo: '11-S4', name: 'Olivia Garcia', gender: 'Female', classId: 'cls-3', guardianName: 'Manuel Garcia', guardianPhone: '+1 555-0304' },
  { id: 'std-305', rollNo: '11-S5', name: 'Paul Kim', gender: 'Male', classId: 'cls-3', guardianName: 'Jin Kim', guardianPhone: '+1 555-0305' },

  // Class 4 (Grade 12 - Commerce)
  { id: 'std-401', rollNo: '12-C1', name: 'Quinn Bailey', gender: 'Female', classId: 'cls-4', guardianName: 'Ruth Bailey', guardianPhone: '+1 555-0401' },
  { id: 'std-402', rollNo: '12-C2', name: 'Ryan Scott', gender: 'Male', classId: 'cls-4', guardianName: 'Arthur Scott', guardianPhone: '+1 555-0402' },
  { id: 'std-403', rollNo: '12-C3', name: 'Sophia Turner', gender: 'Female', classId: 'cls-4', guardianName: 'Chloe Turner', guardianPhone: '+1 555-0403' },
  { id: 'std-404', rollNo: '12-C4', name: 'Thomas Wright', gender: 'Male', classId: 'cls-4', guardianName: 'David Wright', guardianPhone: '+1 555-0404' },
];

// Helper to format ISO date YYYY-MM-DD
const formatDateKey = (d) => {
  return d.toISOString().split('T')[0];
};

// Generate default attendance records for today and the past 3 days
const initDefaultAttendance = () => {
  const records = {};
  const today = new Date();

  // Generate for the last 4 days
  for (let i = 0; i < 4; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = formatDateKey(d);

    // Class 1 attendance
    records[`cls-1_${dateStr}`] = {
      classId: 'cls-1',
      date: dateStr,
      markedBy: 'tch-1',
      markedAt: new Date(d.setHours(8, 30, 0, 0)).toISOString(),
      students: [
        { studentId: 'std-101', status: ATTENDANCE_STATUS.PRESENT, remark: '' },
        { studentId: 'std-102', status: ATTENDANCE_STATUS.PRESENT, remark: '' },
        { studentId: 'std-103', status: i === 0 ? ATTENDANCE_STATUS.LATE : ATTENDANCE_STATUS.PRESENT, remark: i === 0 ? 'Bus delay' : '' },
        { studentId: 'std-104', status: i === 1 ? ATTENDANCE_STATUS.ABSENT : ATTENDANCE_STATUS.PRESENT, remark: i === 1 ? 'Unexcused' : '' },
        { studentId: 'std-105', status: i === 2 ? ATTENDANCE_STATUS.LEAVE : ATTENDANCE_STATUS.PRESENT, remark: i === 2 ? 'Fever' : '' },
        { studentId: 'std-106', status: ATTENDANCE_STATUS.PRESENT, remark: '' },
      ],
    };

    // Class 3 attendance
    records[`cls-3_${dateStr}`] = {
      classId: 'cls-3',
      date: dateStr,
      markedBy: 'tch-1',
      markedAt: new Date(d.setHours(9, 15, 0, 0)).toISOString(),
      students: [
        { studentId: 'std-301', status: ATTENDANCE_STATUS.PRESENT, remark: '' },
        { studentId: 'std-302', status: ATTENDANCE_STATUS.PRESENT, remark: '' },
        { studentId: 'std-303', status: ATTENDANCE_STATUS.LATE, remark: 'Late arrival' },
        { studentId: 'std-304', status: ATTENDANCE_STATUS.PRESENT, remark: '' },
        { studentId: 'std-305', status: ATTENDANCE_STATUS.ABSENT, remark: 'Doctor visit' },
      ],
    };
  }

  return records;
};

// Safe storage getters and setters
const getFromStorage = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const setToStorage = (key, val) => {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (err) {
    console.error('Local storage write failed', err);
  }
};

// Mock service API
export const mockDataService = {
  // Initialization
  init() {
    if (!localStorage.getItem(STORAGE_KEYS.CLASSES)) {
      setToStorage(STORAGE_KEYS.CLASSES, DEFAULT_CLASSES);
    }
    if (!localStorage.getItem(STORAGE_KEYS.TEACHERS)) {
      setToStorage(STORAGE_KEYS.TEACHERS, DEFAULT_TEACHERS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.STUDENTS)) {
      setToStorage(STORAGE_KEYS.STUDENTS, DEFAULT_STUDENTS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.ATTENDANCE)) {
      setToStorage(STORAGE_KEYS.ATTENDANCE, initDefaultAttendance());
    }
  },

  // Reset data to defaults
  resetAll() {
    setToStorage(STORAGE_KEYS.CLASSES, DEFAULT_CLASSES);
    setToStorage(STORAGE_KEYS.TEACHERS, DEFAULT_TEACHERS);
    setToStorage(STORAGE_KEYS.STUDENTS, DEFAULT_STUDENTS);
    setToStorage(STORAGE_KEYS.ATTENDANCE, initDefaultAttendance());
  },

  // --- CLASSES ---
  getClasses() {
    this.init();
    return getFromStorage(STORAGE_KEYS.CLASSES, DEFAULT_CLASSES);
  },

  getClassById(id) {
    return this.getClasses().find((c) => c.id === id) || null;
  },

  getClassesForTeacher(teacherId) {
    const classes = this.getClasses();
    return classes.filter((c) => (c.assignedTeacherIds || []).includes(teacherId));
  },

  createClass(classData) {
    const classes = this.getClasses();
    const newClass = {
      id: `cls-${Date.now()}`,
      studentCount: 0,
      assignedTeacherIds: [],
      ...classData,
    };
    const updated = [newClass, ...classes];
    setToStorage(STORAGE_KEYS.CLASSES, updated);
    return newClass;
  },

  updateClass(id, updates) {
    const classes = this.getClasses();
    const updated = classes.map((c) => (c.id === id ? { ...c, ...updates } : c));
    setToStorage(STORAGE_KEYS.CLASSES, updated);
    return updated.find((c) => c.id === id);
  },

  deleteClass(id) {
    const classes = this.getClasses().filter((c) => c.id !== id);
    setToStorage(STORAGE_KEYS.CLASSES, classes);

    // Also remove enrolled students
    const students = this.getStudents().filter((s) => s.classId !== id);
    setToStorage(STORAGE_KEYS.STUDENTS, students);
    return true;
  },

  // --- TEACHERS ---
  getTeachers() {
    this.init();
    return getFromStorage(STORAGE_KEYS.TEACHERS, DEFAULT_TEACHERS);
  },

  createTeacher(teacherData) {
    const teachers = this.getTeachers();
    const newTeacher = {
      id: `tch-${Date.now()}`,
      assignedClassIds: [],
      ...teacherData,
    };
    const updated = [newTeacher, ...teachers];
    setToStorage(STORAGE_KEYS.TEACHERS, updated);
    return newTeacher;
  },

  updateTeacher(id, updates) {
    const teachers = this.getTeachers();
    const updated = teachers.map((t) => (t.id === id ? { ...t, ...updates } : t));
    setToStorage(STORAGE_KEYS.TEACHERS, updated);
    return updated.find((t) => t.id === id);
  },

  deleteTeacher(id) {
    const teachers = this.getTeachers().filter((t) => t.id !== id);
    setToStorage(STORAGE_KEYS.TEACHERS, teachers);

    // Unassign from any classes
    const classes = this.getClasses().map((c) => ({
      ...c,
      assignedTeacherIds: (c.assignedTeacherIds || []).filter((tid) => tid !== id),
    }));
    setToStorage(STORAGE_KEYS.CLASSES, classes);
    return true;
  },

  // --- STUDENTS ---
  getStudents(classId = null) {
    this.init();
    const all = getFromStorage(STORAGE_KEYS.STUDENTS, DEFAULT_STUDENTS);
    return classId ? all.filter((s) => s.classId === classId) : all;
  },

  createStudent(studentData) {
    const students = this.getStudents();
    const newStudent = {
      id: `std-${Date.now()}`,
      ...studentData,
    };
    const updated = [...students, newStudent];
    setToStorage(STORAGE_KEYS.STUDENTS, updated);

    // Update class student count
    if (studentData.classId) {
      this.refreshStudentCounts();
    }
    return newStudent;
  },

  updateStudent(id, updates) {
    const students = this.getStudents();
    const updated = students.map((s) => (s.id === id ? { ...s, ...updates } : s));
    setToStorage(STORAGE_KEYS.STUDENTS, updated);
    this.refreshStudentCounts();
    return updated.find((s) => s.id === id);
  },

  deleteStudent(id) {
    const students = this.getStudents().filter((s) => s.id !== id);
    setToStorage(STORAGE_KEYS.STUDENTS, students);
    this.refreshStudentCounts();
    return true;
  },

  refreshStudentCounts() {
    const classes = this.getClasses();
    const students = this.getStudents();
    const updatedClasses = classes.map((c) => ({
      ...c,
      studentCount: students.filter((s) => s.classId === c.id).length,
    }));
    setToStorage(STORAGE_KEYS.CLASSES, updatedClasses);
  },

  // --- ASSIGNMENTS ---
  assignTeacherToClass(classId, teacherId) {
    const classes = this.getClasses();
    const teachers = this.getTeachers();

    const updatedClasses = classes.map((c) => {
      if (c.id === classId) {
        const ids = new Set(c.assignedTeacherIds || []);
        ids.add(teacherId);
        return { ...c, assignedTeacherIds: Array.from(ids) };
      }
      return c;
    });

    const updatedTeachers = teachers.map((t) => {
      if (t.id === teacherId) {
        const ids = new Set(t.assignedClassIds || []);
        ids.add(classId);
        return { ...t, assignedClassIds: Array.from(ids) };
      }
      return t;
    });

    setToStorage(STORAGE_KEYS.CLASSES, updatedClasses);
    setToStorage(STORAGE_KEYS.TEACHERS, updatedTeachers);
  },

  unassignTeacherFromClass(classId, teacherId) {
    const classes = this.getClasses();
    const teachers = this.getTeachers();

    const updatedClasses = classes.map((c) => {
      if (c.id === classId) {
        return {
          ...c,
          assignedTeacherIds: (c.assignedTeacherIds || []).filter((id) => id !== teacherId),
        };
      }
      return c;
    });

    const updatedTeachers = teachers.map((t) => {
      if (t.id === teacherId) {
        return {
          ...t,
          assignedClassIds: (t.assignedClassIds || []).filter((id) => id !== classId),
        };
      }
      return t;
    });

    setToStorage(STORAGE_KEYS.CLASSES, updatedClasses);
    setToStorage(STORAGE_KEYS.TEACHERS, updatedTeachers);
  },

  // --- ATTENDANCE ---
  getAttendanceRecord(classId, date) {
    this.init();
    const store = getFromStorage(STORAGE_KEYS.ATTENDANCE, {});
    const key = `${classId}_${date}`;
    return store[key] || null;
  },

  saveAttendance(classId, date, studentRecords, teacherId = 'tch-1') {
    this.init();
    const store = getFromStorage(STORAGE_KEYS.ATTENDANCE, {});
    const key = `${classId}_${date}`;

    const record = {
      classId,
      date,
      markedBy: teacherId,
      markedAt: new Date().toISOString(),
      students: studentRecords,
    };

    store[key] = record;
    setToStorage(STORAGE_KEYS.ATTENDANCE, store);
    return record;
  },

  // Returns all attendance logs with optional filter
  getAttendanceHistory({ classId = null, startDate = null, endDate = null }) {
    this.init();
    const store = getFromStorage(STORAGE_KEYS.ATTENDANCE, {});
    const classes = this.getClasses();
    const list = Object.values(store);

    let filtered = list;
    if (classId) {
      filtered = filtered.filter((r) => r.classId === classId);
    }
    if (startDate) {
      filtered = filtered.filter((r) => r.date >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter((r) => r.date <= endDate);
    }

    // Sort descending by date
    filtered.sort((a, b) => b.date.localeCompare(a.date));

    // Enhance with class name & stats
    return filtered.map((entry) => {
      const cls = classes.find((c) => c.id === entry.classId);
      const total = entry.students.length;
      const present = entry.students.filter((s) => s.status === ATTENDANCE_STATUS.PRESENT).length;
      const absent = entry.students.filter((s) => s.status === ATTENDANCE_STATUS.ABSENT).length;
      const late = entry.students.filter((s) => s.status === ATTENDANCE_STATUS.LATE).length;
      const leave = entry.students.filter((s) => s.status === ATTENDANCE_STATUS.LEAVE).length;
      const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

      return {
        ...entry,
        className: cls ? cls.name : 'Unknown Class',
        stats: { total, present, absent, late, leave, rate },
      };
    });
  },

  // Get student attendance metrics for reports
  getStudentAttendanceMetrics(classId = null) {
    const students = this.getStudents(classId);
    const history = this.getAttendanceHistory({ classId });

    return students.map((std) => {
      let total = 0;
      let present = 0;
      let absent = 0;
      let late = 0;
      let leave = 0;

      history.forEach((session) => {
        const studentLog = session.students.find((s) => s.studentId === std.id);
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

// Initialize on import
mockDataService.init();
