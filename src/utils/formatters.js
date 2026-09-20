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
