/**
 * CSV Export utility functions
 * Uses Blob and URL.createObjectURL for reliable file downloads.
 */

/**
 * Triggers a browser download of a CSV file using Blob and URL.createObjectURL.
 * Includes UTF-8 BOM (\uFEFF) to ensure Unicode characters (e.g. non-ASCII names) open correctly in Excel.
 *
 * @param {string} filename - The name of the downloaded file
 * @param {string[]} headers - Array of header strings
 * @param {Array<Array<string|number>>} rows - 2D array of rows
 */
export const downloadCSV = (filename, headers, rows) => {
  const csvContent = [
    headers.join(','),
    ...rows.map((row) => (Array.isArray(row) ? row.join(',') : row)),
  ].join('\n');

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
 * Formats attendance session history logs into CSV rows
 *
 * @param {Array} historyLogs - Array of session logs with student attendance records
 * @returns {Array<Array<string>>}
 */
export const formatAttendanceHistoryRows = (historyLogs) => {
  const rows = [];
  (historyLogs || []).forEach((log) => {
    const sessionDate = log.date;
    const className = log.className || '';

    if (log.students && log.students.length > 0) {
      log.students.forEach((s) => {
        rows.push([
          `"${sessionDate}"`,
          `"${className.replace(/"/g, '""')}"`,
          `"${(s.rollNo || '').replace(/"/g, '""')}"`,
          `"${(s.studentName || '').replace(/"/g, '""')}"`,
          `"${(s.status || '').toUpperCase()}"`,
          `"${(s.remark || '').replace(/"/g, '""')}"`,
        ]);
      });
    } else {
      rows.push([
        `"${sessionDate}"`,
        `"${className.replace(/"/g, '""')}"`,
        '""',
        '""',
        '""',
        '""',
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
 * Formats student attendance metrics into CSV rows
 *
 * @param {Array} studentMetrics - Array of student metric objects
 * @returns {Array<Array<string|number>>}
 */
export const formatStudentMetricsRows = (studentMetrics) => {
  return (studentMetrics || []).map((m) => [
    `"${m.student?.rollNo || ''}"`,
    `"${m.student?.name || ''}"`,
    `"${m.student?.classId || ''}"`,
    m.totalSessions,
    m.present,
    m.absent,
    m.late,
    m.leave,
    `${m.rate}%`,
    m.isAtRisk ? 'At Risk (< 75%)' : 'Good Standing',
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
