import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  escapeCSVCell,
  downloadCSV,
  formatAttendanceHistoryRows,
  formatStudentMetricsRows,
  ATTENDANCE_HISTORY_CSV_HEADERS,
  STUDENT_METRICS_CSV_HEADERS,
} from '../csvExport';

describe('csvExport utility', () => {
  describe('escapeCSVCell', () => {
    it('returns empty quotes for null and undefined', () => {
      expect(escapeCSVCell(null)).toBe('""');
      expect(escapeCSVCell(undefined)).toBe('""');
    });

    it('preserves finite numeric values as raw numbers', () => {
      expect(escapeCSVCell(0)).toBe('0');
      expect(escapeCSVCell(42)).toBe('42');
      expect(escapeCSVCell(-15)).toBe('-15');
      expect(escapeCSVCell(99.5)).toBe('99.5');
    });

    it('wraps standard strings in double quotes', () => {
      expect(escapeCSVCell('Class 10')).toBe('"Class 10"');
      expect(escapeCSVCell('Rahim Ahmed')).toBe('"Rahim Ahmed"');
    });

    describe('OWASP Formula Injection Defense (CWE-1236)', () => {
      it('neutralizes cells starting with = by prepending single quote', () => {
        expect(escapeCSVCell('=1+1')).toBe("\"'=1+1\"");
        expect(escapeCSVCell('=cmd|/C calc!A0')).toBe("\"'=cmd|/C calc!A0\"");
      });

      it('neutralizes cells starting with + by prepending single quote', () => {
        expect(escapeCSVCell('+12345')).toBe("\"'+12345\"");
      });

      it('neutralizes cells starting with - (non-numeric string) by prepending single quote', () => {
        expect(escapeCSVCell('-2+3+cmd|')).toBe("\"'-2+3+cmd|\"");
      });

      it('neutralizes cells starting with @ by prepending single quote', () => {
        expect(escapeCSVCell('@SUM(A1:A10)')).toBe("\"'@SUM(A1:A10)\"");
      });

      it('neutralizes cells with leading spaces before formula characters', () => {
        expect(escapeCSVCell('   =SUM(1,2)')).toBe("\"'   =SUM(1,2)\"");
        expect(escapeCSVCell(' \t @AVERAGE')).toBe("\"' \t @AVERAGE\"");
      });

      it('neutralizes cells starting with control characters (tab, carriage return)', () => {
        expect(escapeCSVCell('\tmalicious')).toBe("\"'\tmalicious\"");
        expect(escapeCSVCell('\rmalicious')).toBe("\"'\rmalicious\"");
      });
    });

    describe('RFC 4180 Escaping', () => {
      it('escapes double quotes by doubling them', () => {
        expect(escapeCSVCell('He said "Hello"')).toBe('"He said ""Hello"""');
        expect(escapeCSVCell('"Quoted"')).toBe('"""Quoted"""');
      });

      it('correctly encloses strings with commas', () => {
        expect(escapeCSVCell('Dhaka, Bangladesh')).toBe('"Dhaka, Bangladesh"');
      });

      it('correctly encloses strings with newlines', () => {
        expect(escapeCSVCell("Line 1\nLine 2")).toBe('"Line 1\nLine 2"');
        expect(escapeCSVCell("Line 1\r\nLine 2")).toBe('"Line 1\r\nLine 2"');
      });
    });
  });

  describe('formatAttendanceHistoryRows', () => {
    it('returns empty array when historyLogs is empty or null', () => {
      expect(formatAttendanceHistoryRows([])).toEqual([]);
      expect(formatAttendanceHistoryRows(null)).toEqual([]);
    });

    it('formats multi-student session history into row arrays', () => {
      const logs = [
        {
          date: '2026-09-29',
          className: 'Class 9 - Section A',
          students: [
            {
              rollNo: '1',
              studentName: 'Sadia Rahman',
              status: 'present',
              remark: 'On time',
            },
            {
              rollNo: '2',
              studentName: 'Tanvir Hossain',
              status: 'absent',
              remark: 'Fever',
            },
          ],
        },
      ];

      const rows = formatAttendanceHistoryRows(logs);
      expect(rows).toHaveLength(2);
      expect(rows[0]).toEqual([
        '2026-09-29',
        'Class 9 - Section A',
        '1',
        'Sadia Rahman',
        'PRESENT',
        'On time',
      ]);
      expect(rows[1]).toEqual([
        '2026-09-29',
        'Class 9 - Section A',
        '2',
        'Tanvir Hossain',
        'ABSENT',
        'Fever',
      ]);
    });

    it('handles sessions with empty student rosters cleanly', () => {
      const logs = [
        {
          date: '2026-09-29',
          className: 'Empty Class',
          students: [],
        },
      ];
      const rows = formatAttendanceHistoryRows(logs);
      expect(rows).toEqual([['2026-09-29', 'Empty Class', '', '', '', '']]);
    });
  });

  describe('formatStudentMetricsRows', () => {
    it('returns empty array for empty or null input', () => {
      expect(formatStudentMetricsRows([])).toEqual([]);
      expect(formatStudentMetricsRows(null)).toEqual([]);
    });

    it('formats student metrics and applies at-risk flag correctly', () => {
      const metrics = [
        {
          student: { rollNo: '101', name: 'Nusrat Jahan', classId: 'cls-1' },
          totalSessions: 20,
          present: 18,
          absent: 1,
          late: 1,
          leave: 0,
          rate: 95,
          isAtRisk: false,
        },
        {
          student: { rollNo: '102', name: 'Karim Ullah', classId: 'cls-1' },
          totalSessions: 20,
          present: 12,
          absent: 7,
          late: 1,
          leave: 0,
          rate: 65,
          isAtRisk: true,
        },
        {
          student: { rollNo: '103', name: 'Farhana Akter', classId: 'cls-1' },
          totalSessions: 10,
          present: 7,
          absent: 3,
          late: 0,
          leave: 0,
          rate: 70,
          consecutiveAbsentDays: 3,
          isConsecutiveAbsent: true,
          isAtRisk: true,
        },
        {
          student: { rollNo: '104', name: 'Rahim Mia', classId: 'cls-1' },
          totalSessions: 10,
          present: 7,
          absent: 3,
          late: 0,
          leave: 0,
          rate: 80,
          consecutiveAbsentDays: 3,
          isConsecutiveAbsent: true,
          isAtRisk: true,
        },
      ];

      const rows = formatStudentMetricsRows(metrics);
      expect(rows).toHaveLength(4);
      expect(rows[0]).toEqual([
        '101',
        'Nusrat Jahan',
        'cls-1',
        20,
        18,
        1,
        1,
        0,
        '95%',
        'Good Standing',
      ]);
      expect(rows[1]).toEqual([
        '102',
        'Karim Ullah',
        'cls-1',
        20,
        12,
        7,
        1,
        0,
        '65%',
        'At Risk (Below 75%)',
      ]);
      expect(rows[2]).toEqual([
        '103',
        'Farhana Akter',
        'cls-1',
        10,
        7,
        3,
        0,
        0,
        '70%',
        'At Risk (Below 75% & 3+ Consecutive Absences)',
      ]);
      expect(rows[3]).toEqual([
        '104',
        'Rahim Mia',
        'cls-1',
        10,
        7,
        3,
        0,
        0,
        '80%',
        'At Risk (3+ Consecutive Absences)',
      ]);
    });
  });

  describe('downloadCSV & UTF-8 BOM verification', () => {
    let originalDocument;
    let originalURL;
    let mockLink;
    let createdBlob;

    beforeEach(() => {
      mockLink = {
        setAttribute: vi.fn(),
        click: vi.fn(),
      };

      originalDocument = global.document;
      originalURL = global.URL;

      global.document = {
        createElement: vi.fn().mockReturnValue(mockLink),
        body: {
          appendChild: vi.fn(),
          removeChild: vi.fn(),
        },
      };

      global.URL = {
        createObjectURL: vi.fn((blob) => {
          createdBlob = blob;
          return 'blob:http://localhost/mock-url';
        }),
        revokeObjectURL: vi.fn(),
      };
    });

    afterEach(() => {
      global.document = originalDocument;
      global.URL = originalURL;
    });

    it('prepends UTF-8 BOM (\\uFEFF) to the CSV payload and triggers download', async () => {
      const headers = ['Name', 'Status'];
      const rows = [['Rahim', 'PRESENT']];

      downloadCSV('attendance.csv', headers, rows);

      expect(global.document.createElement).toHaveBeenCalledWith('a');
      expect(mockLink.setAttribute).toHaveBeenCalledWith('href', 'blob:http://localhost/mock-url');
      expect(mockLink.setAttribute).toHaveBeenCalledWith('download', 'attendance.csv');
      expect(mockLink.click).toHaveBeenCalled();
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/mock-url');

      // Verify Blob byte-level BOM sequence [0xEF, 0xBB, 0xBF]
      expect(createdBlob).toBeDefined();
      const buffer = new Uint8Array(await createdBlob.arrayBuffer());
      expect(Array.from(buffer.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);

      // Verify decoded payload contains expected headers and rows
      const text = await createdBlob.text();
      expect(text).toContain('"Name","Status"\r\n"Rahim","PRESENT"');
    });

    it('uses CRLF (\\r\\n) row separators conforming to RFC 4180', async () => {
      const headers = ['Col1', 'Col2'];
      const rows = [
        ['A', 'B'],
        ['C', 'D'],
      ];

      downloadCSV('test.csv', headers, rows);

      // Verify CRLF separated structure
      const text = await createdBlob.text();
      expect(text).toBe('"Col1","Col2"\r\n"A","B"\r\n"C","D"');
    });
  });

  describe('Export Header Constants', () => {
    it('defines standard attendance history CSV headers', () => {
      expect(ATTENDANCE_HISTORY_CSV_HEADERS).toEqual([
        'Date',
        'Class',
        'Roll No',
        'Student Name',
        'Status',
        'Remarks',
      ]);
    });

    it('defines standard student metrics CSV headers', () => {
      expect(STUDENT_METRICS_CSV_HEADERS).toEqual([
        'Roll Number',
        'Student Name',
        'Class ID',
        'Total Sessions',
        'Present',
        'Absent',
        'Late',
        'Leave',
        'Attendance Rate (%)',
        'Status Flag',
      ]);
    });
  });
});
