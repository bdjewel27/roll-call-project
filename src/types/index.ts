/**
 * Core domain types and interfaces for the Roll Call Attendance System.
 * These types match the schemas in Supabase and the dataService runtime models.
 */

// --- ATTENDANCE STATUS & BENCHMARKS ---

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'leave';

export interface AttendanceStatusConfigItem {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}

export type AttendanceConfigMap = Record<AttendanceStatus, AttendanceStatusConfigItem>;

export interface AttendanceBenchmark {
  AT_RISK_THRESHOLD: number;
}

// --- ROLES & USERS ---

export type UserRole = 'admin' | 'teacher';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  subject?: string;
  assignedClassIds?: string[];
  createdAt?: string;
}

// --- CLASSES ---

export interface ClassModel {
  id: string;
  name: string;
  grade: string;
  section: string;
  room?: string | null;
  academicYear?: string;
  academic_year?: string;
  isActive?: boolean;
  is_active?: boolean;
  studentCount?: number;
  assignedTeacherIds?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateClassPayload {
  name: string;
  grade: string;
  section: string;
  room?: string | null;
  academicYear?: string;
}

export interface UpdateClassPayload {
  name?: string;
  grade?: string;
  section?: string;
  room?: string | null;
  academicYear?: string;
}

// --- STUDENTS ---

export interface Student {
  id: string;
  rollNo: string | number;
  name: string;
  gender?: string;
  classId: string;
  guardianName?: string | null;
  guardianPhone?: string | null;
  avatarUrl?: string | null;
  avatar_url?: string | null;
  isActive?: boolean;
  is_active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateStudentPayload {
  rollNo: string | number;
  name: string;
  gender?: string;
  classId: string;
  guardianName?: string | null;
  guardianPhone?: string | null;
  avatarUrl?: string | null;
}

export interface UpdateStudentPayload {
  rollNo?: string | number;
  name?: string;
  gender?: string;
  classId?: string;
  guardianName?: string | null;
  guardianPhone?: string | null;
  avatarUrl?: string | null;
}

// --- TEACHERS ---

export interface Teacher {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  assignedClassIds?: string[];
}

export interface CreateTeacherPayload {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  subject?: string;
  assignedClassIds?: string[];
}

export interface UpdateTeacherPayload {
  name?: string;
  email?: string;
  phone?: string;
  subject?: string;
  assignedClassIds?: string[];
}

// --- ATTENDANCE RECORDS & SESSIONS ---

export interface AttendanceItem {
  id?: string;
  studentId: string;
  rollNo?: string | number;
  studentName?: string;
  status: AttendanceStatus;
  remark?: string;
  student?: Partial<Student> | null;
}

export interface AttendanceStats {
  total: number;
  present: number;
  absent: number;
  late: number;
  leave: number;
  rate: number;
  percentage?: number;
}

export interface AttendanceRecord {
  id?: string;
  classId: string;
  className?: string;
  classInfo?: Partial<ClassModel> | null;
  date: string;
  markedBy?: string;
  markedAt?: string;
  students: AttendanceItem[];
  stats?: AttendanceStats;
}

export interface AttendanceSessionSummary {
  id: string;
  classId: string;
  className: string;
  classInfo?: Partial<ClassModel> | null;
  date: string;
  markedBy: string;
  markedAt?: string;
  stats: AttendanceStats;
  students: AttendanceItem[];
}

export interface AttendanceSessionDetail {
  sessionId: string;
  date: string;
  className?: string;
  status: AttendanceStatus;
  remark?: string;
}

export interface StudentAttendanceMetric {
  student: Student | Partial<Student>;
  totalSessions: number;
  present: number;
  absent: number;
  late: number;
  leave: number;
  rate: number;
  isAtRisk: boolean;
  isConsecutiveAbsent?: boolean;
  consecutiveAbsentDays?: number;
  riskReason?: string;
  statusLabel?: string;
  sessions?: AttendanceSessionDetail[];
}

export interface StudentAttendanceStatusInfo {
  isAtRisk: boolean;
  isBelowThreshold: boolean;
  isConsecutiveAbsent: boolean;
  consecutiveAbsentDays: number;
  hasNoSessions?: boolean;
  status: string;
  reason: string;
  label: string;
  shortLabel: string;
}

// --- QUERY FILTERS & PARAMS ---

export interface AttendanceFilterParams {
  classId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}
