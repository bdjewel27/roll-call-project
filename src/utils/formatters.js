/**
 * Utility functions for date formatting, strings, and statistics calculations
 */

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
