import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatDate,
  getTodayDateString,
  calculateAttendanceStats,
  getStudentAttendanceStatus,
  BANGLADESH_TIMEZONE,
} from '../formatters';

describe('formatters utility', () => {
  describe('formatDate', () => {
    it('returns empty string for null, undefined, or empty values', () => {
      expect(formatDate(null)).toBe('');
      expect(formatDate(undefined)).toBe('');
      expect(formatDate('')).toBe('');
    });

    it('returns empty string for invalid date inputs', () => {
      expect(formatDate('invalid-date-string')).toBe('');
      expect(formatDate(NaN)).toBe('');
    });

    it('formats YYYY-MM-DD calendar date strings correctly without timezone shift', () => {
      const result = formatDate('2026-09-29');
      expect(result).toBe('Sep 29, 2026');
    });

    it('formats ISO timestamps with date component', () => {
      const result = formatDate('2026-01-15T12:00:00.000Z');
      expect(result).toContain('2026');
      expect(result).toContain('Jan');
    });

    it('formats Date objects correctly', () => {
      const date = new Date(2026, 8, 29); // Month is 0-indexed: 8 = September
      expect(formatDate(date)).toBe('Sep 29, 2026');
    });
  });

  describe('Bangladesh Timezone (Asia/Dhaka) & getTodayDateString', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('exports BANGLADESH_TIMEZONE constant as Asia/Dhaka', () => {
      expect(BANGLADESH_TIMEZONE).toBe('Asia/Dhaka');
    });

    it('handles UTC midnight boundary: UTC 19:00 resolves to next calendar day in Dhaka (UTC+6)', () => {
      // 19:00 UTC on 2026-09-29 is 01:00 on 2026-09-30 in Asia/Dhaka (+06:00)
      vi.setSystemTime(new Date('2026-09-29T19:00:00Z'));
      expect(getTodayDateString()).toBe('2026-09-30');
    });

    it('handles UTC late-night boundary: UTC 17:59 resolves to current calendar day in Dhaka (23:59)', () => {
      // 17:59 UTC on 2026-09-29 is 23:59 on 2026-09-29 in Asia/Dhaka (+06:00)
      vi.setSystemTime(new Date('2026-09-29T17:59:00Z'));
      expect(getTodayDateString()).toBe('2026-09-29');
    });

    it('formats midday date string consistently', () => {
      vi.setSystemTime(new Date('2026-05-15T06:00:00Z')); // 12:00 in Dhaka
      expect(getTodayDateString()).toBe('2026-05-15');
    });
  });

  describe('calculateAttendanceStats', () => {
    it('handles empty or null records safely without NaN or dividing by zero', () => {
      const emptyResult = calculateAttendanceStats([]);
      expect(emptyResult).toEqual({
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        leave: 0,
        rate: 0,
        percentage: 0,
      });

      const nullResult = calculateAttendanceStats(null);
      expect(nullResult).toEqual({
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        leave: 0,
        rate: 0,
        percentage: 0,
      });

      const undefResult = calculateAttendanceStats(undefined);
      expect(undefResult).toEqual({
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        leave: 0,
        rate: 0,
        percentage: 0,
      });
    });

    it('calculates 100% attendance when all students are present', () => {
      const records = [
        { status: 'present' },
        { status: 'present' },
        { status: 'present' },
      ];
      const stats = calculateAttendanceStats(records);
      expect(stats.total).toBe(3);
      expect(stats.present).toBe(3);
      expect(stats.absent).toBe(0);
      expect(stats.rate).toBe(100);
      expect(stats.percentage).toBe(100);
    });

    it('calculates 0% attendance when all students are absent', () => {
      const records = [
        { status: 'absent' },
        { status: 'absent' },
        { status: 'absent' },
      ];
      const stats = calculateAttendanceStats(records);
      expect(stats.total).toBe(3);
      expect(stats.present).toBe(0);
      expect(stats.absent).toBe(3);
      expect(stats.rate).toBe(0);
      expect(stats.percentage).toBe(0);
    });

    it('correctly aggregates mixed statuses (present, absent, late, leave) with case insensitivity', () => {
      const records = [
        { status: 'Present' },
        { status: 'PRESENT' },
        { status: 'present' },
        { status: 'Late' }, // late counts toward physical attendance in rate
        { status: 'Absent' },
        { status: 'absent' },
        { status: 'Leave' },
        { status: 'leave' },
        { status: 'present' },
        { status: 'present' },
      ];
      // total = 10; present = 5, late = 1, absent = 2, leave = 2
      // attended = present (5) + late (1) = 6
      // rate = (6 / 10) * 100 = 60%
      const stats = calculateAttendanceStats(records);
      expect(stats.total).toBe(10);
      expect(stats.present).toBe(5);
      expect(stats.late).toBe(1);
      expect(stats.absent).toBe(2);
      expect(stats.leave).toBe(2);
      expect(stats.rate).toBe(60);
      expect(stats.percentage).toBe(60);
    });

    it('safely handles missing or malformed student status records', () => {
      const records = [
        { status: null },
        { status: undefined },
        {},
        { status: 'unknown' },
      ];
      const stats = calculateAttendanceStats(records);
      expect(stats.total).toBe(4);
      expect(stats.present).toBe(0);
      expect(stats.absent).toBe(0);
      expect(stats.rate).toBe(0);
    });
  });

  describe('getStudentAttendanceStatus', () => {
    it('returns default Good Standing for null or empty metric input', () => {
      const res = getStudentAttendanceStatus(null);
      expect(res.isAtRisk).toBe(false);
      expect(res.status).toBe('Good Standing');
      expect(res.label).toBe('Good Standing');
    });

    it('returns Good Standing when attendance is >= 75% and consecutive absences < 3', () => {
      const res = getStudentAttendanceStatus({
        totalSessions: 10,
        rate: 90,
        consecutiveAbsentDays: 1,
      });
      expect(res.isAtRisk).toBe(false);
      expect(res.status).toBe('Good Standing');
      expect(res.label).toBe('Good Standing');
      expect(res.reason).toBe('');
    });

    it('identifies At Risk due to Below 75% attendance', () => {
      const res = getStudentAttendanceStatus({
        totalSessions: 10,
        rate: 60,
        consecutiveAbsentDays: 1,
      });
      expect(res.isAtRisk).toBe(true);
      expect(res.isBelowThreshold).toBe(true);
      expect(res.isConsecutiveAbsent).toBe(false);
      expect(res.label).toBe('At Risk (Below 75%)');
      expect(res.reason).toBe('Below 75%');
    });

    it('identifies At Risk due to 3+ Consecutive Absences even if overall rate >= 75%', () => {
      const res = getStudentAttendanceStatus({
        totalSessions: 20,
        rate: 80,
        consecutiveAbsentDays: 3,
      });
      expect(res.isAtRisk).toBe(true);
      expect(res.isBelowThreshold).toBe(false);
      expect(res.isConsecutiveAbsent).toBe(true);
      expect(res.label).toBe('At Risk (3+ Consecutive Absences)');
      expect(res.reason).toBe('3+ Consecutive Absences');
    });

    it('identifies combined risk when both Below 75% and 3+ Consecutive Absences occur', () => {
      const res = getStudentAttendanceStatus({
        totalSessions: 10,
        rate: 60,
        consecutiveAbsentDays: 4,
      });
      expect(res.isAtRisk).toBe(true);
      expect(res.isBelowThreshold).toBe(true);
      expect(res.isConsecutiveAbsent).toBe(true);
      expect(res.label).toBe('At Risk (Below 75% & 3+ Consecutive Absences)');
      expect(res.reason).toBe('Below 75% & 3+ Consecutive Absences');
    });

    it('correctly identifies a student with 0 total sessions as No sessions recorded (N/A)', () => {
      const res = getStudentAttendanceStatus({
        totalSessions: 0,
        rate: 0,
        consecutiveAbsentDays: 0,
      });
      expect(res.isAtRisk).toBe(false);
      expect(res.hasNoSessions).toBe(true);
      expect(res.status).toBe('No sessions recorded');
      expect(res.label).toBe('No sessions recorded');
      expect(res.shortLabel).toBe('N/A');
    });
  });
});
