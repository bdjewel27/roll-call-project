/**
 * CSV Export utility functions
 * Uses Blob and URL.createObjectURL for reliable file downloads.
 */
import { ATTENDANCE_BENCHMARK } from '../constants/attendanceStatus';

/**
 * Sanitizes and escapes a single CSV cell value according to RFC 4180 and
 * OWASP spreadsheet formula injection defense (CWE-1236).
 *
 * 1. Handles null and undefined by returning an empty quoted string '""'.
 * 2. Preserves finite numeric values as raw numbers (e.g. 0, 10, 85).
 * 3. Neutralizes formula injection: If the string's first meaningful character
 *    is =, +, -, or @, or if leading tabs (\t) or carriage returns (\r) are present,
 *    it is prefixed with a single quote (') so spreadsheets treat it strictly as text.
 * 4. Conforms to RFC 4180: All double quotes (") are escaped as (""), and the field
 *    is enclosed in double quotes.
 *
 * @param {string|number|null|undefined} value - Raw cell value
 * @returns {string} Safe, RFC 4180-compliant CSV cell string
 */
export const escapeCSVCell = (value) => {
  if (value === null || value === undefined) {
    return '""';
  }

  // Preserve finite numeric values as numeric CSV tokens
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  let str = String(value);

  // Spreadsheet formula-injection protection (CWE-1236):
  // Check if trimmed content begins with formula characters (=, +, -, @),
  // or if raw string begins with leading control characters (\t, \r).
  const trimmed = str.trimStart();
  const isFormula = /^[=+\-@]/.test(trimmed) || /^[\t\r]/.test(str);

  if (isFormula) {
    str = `'${str}`;
  }

  // RFC 4180 double-quote escaping: replace " with "" and wrap in double quotes
  return `"${str.replace(/"/g, '""')}"`;
};

/**
 * Triggers a browser download of a CSV file using Blob and URL.createObjectURL.
 * Includes UTF-8 BOM (\uFEFF) to ensure Unicode characters (e.g. non-ASCII names) open correctly in Excel.
 * All headers and row cells are passed through escapeCSVCell to ensure RFC 4180 compliance
 * and protect against spreadsheet formula injection.
 *
 * @param {string} filename - The name of the downloaded file
 * @param {string[]} headers - Array of header strings
 * @param {Array<Array<string|number>>} rows - 2D array of rows
 */
export const downloadCSV = (filename, headers, rows) => {
  const encodedHeaders = (headers || []).map(escapeCSVCell).join(',');
  const encodedRows = (rows || []).map((row) =>
    Array.isArray(row) ? row.map(escapeCSVCell).join(',') : escapeCSVCell(row)
  );

  const csvContent = [encodedHeaders, ...encodedRows].join('\r\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const ATTENDANCE_HISTORY_CSV_HEADERS = [
  'Date',
  'Class',
  'Roll No',
  'Student Name',
  'Status',
  'Remarks',
];

/**
 * Formats attendance session history logs into raw CSV row values.
 * Cells are safely formatted and escaped by downloadCSV.
 *
 * @param {Array} historyLogs - Array of session logs with student attendance records
 * @returns {Array<Array<string>>}
 */
export const formatAttendanceHistoryRows = (historyLogs) => {
  const rows = [];
  (historyLogs || []).forEach((log) => {
    const sessionDate = log.date || '';
    const className = log.className || '';

    if (log.students && log.students.length > 0) {
      log.students.forEach((s) => {
        rows.push([
          sessionDate,
          className,
          s.rollNo || '',
          s.studentName || '',
          (s.status || '').toUpperCase(),
          s.remark || '',
        ]);
      });
    } else {
      rows.push([
        sessionDate,
        className,
        '',
        '',
        '',
        '',
      ]);
    }
  });
  return rows;
};

/**
 * Exports attendance history logs directly to a CSV download
 *
 * @param {string} filename - Target CSV filename
 * @param {Array} historyLogs - Attendance logs
 */
export const exportAttendanceHistoryCSV = (filename, historyLogs) => {
  const rows = formatAttendanceHistoryRows(historyLogs);
  downloadCSV(filename, ATTENDANCE_HISTORY_CSV_HEADERS, rows);
};

export const STUDENT_METRICS_CSV_HEADERS = [
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
];

/**
 * Formats student attendance metrics into raw CSV row values.
 * Cells are safely formatted and escaped by downloadCSV.
 *
 * @param {Array} studentMetrics - Array of student metric objects
 * @returns {Array<Array<string|number>>}
 */
export const formatStudentMetricsRows = (studentMetrics) => {
  return (studentMetrics || []).map((m) => [
    m.student?.rollNo || '',
    m.student?.name || '',
    m.student?.classId || '',
    typeof m.totalSessions === 'number' ? m.totalSessions : 0,
    typeof m.present === 'number' ? m.present : 0,
    typeof m.absent === 'number' ? m.absent : 0,
    typeof m.late === 'number' ? m.late : 0,
    typeof m.leave === 'number' ? m.leave : 0,
    `${m.rate ?? 0}%`,
    m.isAtRisk ? `At Risk (< ${ATTENDANCE_BENCHMARK.AT_RISK_THRESHOLD}%)` : 'Good Standing',
  ]);
};

/**
 * Exports student attendance metrics directly to a CSV download
 *
 * @param {string} filename - Target CSV filename
 * @param {Array} studentMetrics - Student metrics array
 */
export const exportStudentMetricsCSV = (filename, studentMetrics) => {
  const rows = formatStudentMetricsRows(studentMetrics);
  downloadCSV(filename, STUDENT_METRICS_CSV_HEADERS, rows);
};
