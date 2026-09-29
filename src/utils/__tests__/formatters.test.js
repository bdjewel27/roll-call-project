import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatDate,
  getTodayDateString,
  calculateAttendanceStats,
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
});
