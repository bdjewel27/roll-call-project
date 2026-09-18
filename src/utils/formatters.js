/**
 * Utility functions for date formatting, strings, and statistics calculations
 */

export const formatDate = (dateInput) => {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const getTodayDateString = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

export const calculateAttendanceStats = (records = []) => {
  const total = records.length;
  if (total === 0) {
    return { total: 0, present: 0, absent: 0, late: 0, leave: 0, percentage: 0 };
  }

  const counts = records.reduce(
    (acc, record) => {
      const status = record.status?.toLowerCase();
      if (acc[status] !== undefined) {
        acc[status]++;
      }
      return acc;
    },
    { present: 0, absent: 0, late: 0, leave: 0 }
  );

  const percentage = Math.round(((counts.present + counts.late) / total) * 100);

  return {
    total,
    ...counts,
    percentage,
  };
};
