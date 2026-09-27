/**
 * Attendance statuses supported by the Roll Call Attendance System
 */
export const ATTENDANCE_STATUS = {
  PRESENT: 'present',
  ABSENT: 'absent',
  LATE: 'late',
  LEAVE: 'leave',
};

export const ATTENDANCE_BENCHMARK = {
  AT_RISK_THRESHOLD: 75,
};

export const ATTENDANCE_CONFIG = {
  [ATTENDANCE_STATUS.PRESENT]: {
    label: 'Present',
    color: '#10b981', // green
    bgColor: '#d1fae5',
    borderColor: '#a7f3d0',
    textColor: '#065f46',
  },
  [ATTENDANCE_STATUS.ABSENT]: {
    label: 'Absent',
    color: '#ef4444', // red
    bgColor: '#fee2e2',
    borderColor: '#fca5a5',
    textColor: '#991b1b',
  },
  [ATTENDANCE_STATUS.LATE]: {
    label: 'Late',
    color: '#f59e0b', // amber
    bgColor: '#fef3c7',
    borderColor: '#fde68a',
    textColor: '#92400e',
  },
  [ATTENDANCE_STATUS.LEAVE]: {
    label: 'Leave',
    color: '#3b82f6', // blue
    bgColor: '#dbeafe',
    borderColor: '#bfdbfe',
    textColor: '#1e40af',
  },
};
