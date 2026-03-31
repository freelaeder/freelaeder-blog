const pad = (value) => `${value}`.padStart(2, '0');

export const getDateParts = (dateValue = '') => {
  const [datePart = '', timePart = ''] = `${dateValue}`.split(' ');
  const [year = '', month = '', day = ''] = datePart.split('-');

  return {
    year,
    month: pad(month || '0'),
    day: pad(day || '0'),
    time: timePart.slice(0, 5),
  };
};

export const formatDisplayDate = (dateValue = '') => {
  const { year, month, day } = getDateParts(dateValue);
  return [year, month, day].filter(Boolean).join('.');
};

export const formatDisplayDateTime = (dateValue = '') => {
  const { year, month, day, time } = getDateParts(dateValue);
  return `${[year, month, day].filter(Boolean).join('.')} ${time}`.trim();
};

export const formatTimelineDate = (dateValue = '') => {
  const { month, day } = getDateParts(dateValue);
  return `${month}.${day}`;
};
