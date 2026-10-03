/**
 * Utility functions for date formatting, strings, and statistics calculations
 */

import { ATTENDANCE_BENCHMARK } from '../constants/attendanceStatus';

export const formatDate = (dateInput) => {
  if (!dateInput) return '';
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateInput)) {
    const [year, month, day] = dateInput.slice(0, 10).split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const BANGLADESH_TIMEZONE = 'Asia/Dhaka';

export const getTodayDateString = () => {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: BANGLADESH_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());

    const map = {};
    for (let i = 0; i < parts.length; i++) {
      map[parts[i].type] = parts[i].value;
    }
    return `${map.year}-${map.month}-${map.day}`;
  } catch {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
};

export const calculateAttendanceStats = (records = []) => {
  const safeRecords = records || [];
  const total = safeRecords.length;
  if (total === 0) {
    return { total: 0, present: 0, absent: 0, late: 0, leave: 0, rate: 0, percentage: 0 };
  }

  let present = 0;
  let absent = 0;
  let late = 0;
  let leave = 0;

  for (let i = 0; i < total; i++) {
    const status = safeRecords[i]?.status?.toLowerCase();
    if (status === 'present') present++;
    else if (status === 'absent') absent++;
    else if (status === 'late') late++;
    else if (status === 'leave') leave++;
  }

  const rate = Math.round(((present + late) / total) * 100);

  return {
    total,
    present,
    absent,
    late,
    leave,
    rate,
    percentage: rate,
  };
};

/**
 * Centralized logic to evaluate a student's attendance standing and specific risk reason.
 * A student is 'At Risk' if:
 * 1. Attendance percentage is below threshold (< 75%) with at least 1 session, OR
 * 2. Absent for 3 or more consecutive class sessions.
 *
 * @param {Object} metric - Object containing rate, totalSessions/total, consecutiveAbsentDays, isConsecutiveAbsent, isAtRisk
 * @returns {{ isAtRisk: boolean, isBelowThreshold: boolean, isConsecutiveAbsent: boolean, consecutiveAbsentDays: number, status: string, reason: string, label: string, shortLabel: string }}
 */
export const getStudentAttendanceStatus = (metric) => {
  if (!metric) {
    return {
      isAtRisk: false,
      isBelowThreshold: false,
      isConsecutiveAbsent: false,
      consecutiveAbsentDays: 0,
      status: 'Good Standing',
      reason: '',
      label: 'Good Standing',
      shortLabel: '✓ Good',
    };
  }

  const total = typeof metric.totalSessions === 'number'
    ? metric.totalSessions
    : typeof metric.total === 'number'
    ? metric.total
    : 0;

  // New student with 0 sessions recorded
  if (total === 0 && !metric.isAtRisk) {
    return {
      isAtRisk: false,
      isBelowThreshold: false,
      isConsecutiveAbsent: false,
      consecutiveAbsentDays: 0,
      hasNoSessions: true,
      status: 'No sessions recorded',
      reason: '',
      label: 'No sessions recorded',
      shortLabel: 'N/A',
    };
  }

  const rate = typeof metric.rate === 'number' ? metric.rate : 100;
  const consecutiveDays = typeof metric.consecutiveAbsentDays === 'number' ? metric.consecutiveAbsentDays : 0;

  const isBelowThreshold = total > 0 && rate < ATTENDANCE_BENCHMARK.AT_RISK_THRESHOLD;
  const isConsecutiveAbsent = !!metric.isConsecutiveAbsent || consecutiveDays >= 3;

  // Handles explicit isAtRisk boolean when provided without full session counts (e.g. mock test cases)
  const isAtRisk = (total > 0 && (isBelowThreshold || isConsecutiveAbsent)) || (total === 0 && metric.isAtRisk === true);

  let reason = '';
  let label = 'Good Standing';
  let shortLabel = '✓ Good';

  if (isAtRisk) {
    if (isBelowThreshold && isConsecutiveAbsent) {
      reason = `Below ${ATTENDANCE_BENCHMARK.AT_RISK_THRESHOLD}% & 3+ Consecutive Absences`;
      label = `At Risk (Below ${ATTENDANCE_BENCHMARK.AT_RISK_THRESHOLD}% & 3+ Consecutive Absences)`;
      shortLabel = '⚠ At Risk';
    } else if (isConsecutiveAbsent) {
      reason = '3+ Consecutive Absences';
      label = 'At Risk (3+ Consecutive Absences)';
      shortLabel = '⚠ At Risk';
    } else {
      reason = `Below ${ATTENDANCE_BENCHMARK.AT_RISK_THRESHOLD}%`;
      label = `At Risk (Below ${ATTENDANCE_BENCHMARK.AT_RISK_THRESHOLD}%)`;
      shortLabel = '⚠ At Risk';
    }
  }

  return {
    isAtRisk,
    isBelowThreshold,
    isConsecutiveAbsent,
    consecutiveAbsentDays: consecutiveDays,
    hasNoSessions: false,
    status: isAtRisk ? 'At Risk' : 'Good Standing',
    reason,
    label,
    shortLabel,
  };
};

