'use strict';

function toLocalDateOnly(date, timezone) {
  return date.toLocaleDateString('en-CA', {
    timeZone: timezone || process.env.TZ || 'Asia/Jakarta',
  });
}

function getPreviousDateOnly(dateStr) {
  const [y, m, d] = String(dateStr).split('-').map(Number);
  const prev = new Date(Date.UTC(y, m - 1, d - 1));
  return `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, '0')}-${String(prev.getUTCDate()).padStart(2, '0')}`;
}

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;
  const [h, m] = String(timeStr).split(':').map(Number);
  return (h * 60) + m;
}

function diffDateOnlyDays(fromDateStr, toDateStr) {
  const [fromY, fromM, fromD] = String(fromDateStr).split('-').map(Number);
  const [toY, toM, toD] = String(toDateStr).split('-').map(Number);
  const fromUtc = Date.UTC(fromY, fromM - 1, fromD);
  const toUtc = Date.UTC(toY, toM - 1, toD);
  return Math.round((toUtc - fromUtc) / 86400000);
}

function getLocalTimeMinutes(date, timezone) {
  const localTime = date.toLocaleTimeString('en-GB', {
    timeZone: timezone || process.env.TZ || 'Asia/Jakarta',
    hour12: false,
  });
  const [h, m] = localTime.split(':').map(Number);
  return (h * 60) + m;
}

function getScheduleMetricsForEvent(eventDate, schedule, timezone) {
  if (!schedule || schedule.isOff || !schedule.shiftStart || !schedule.shiftEnd || !schedule.date) {
    return null;
  }

  const tz = timezone || process.env.TZ || 'Asia/Jakarta';
  const scheduleDate = String(schedule.date).split('T')[0];
  const eventLocalDate = toLocalDateOnly(eventDate, tz);
  const eventLocalMinutes = getLocalTimeMinutes(eventDate, tz);
  const shiftStartMinutes = parseTimeToMinutes(schedule.shiftStart);
  const rawShiftEndMinutes = parseTimeToMinutes(schedule.shiftEnd);
  const isOvernight = rawShiftEndMinutes <= shiftStartMinutes;
  const shiftEndMinutes = isOvernight ? rawShiftEndMinutes + 1440 : rawShiftEndMinutes;
  const dayOffset = diffDateOnlyDays(scheduleDate, eventLocalDate);
  const eventOffsetMinutes = (dayOffset * 1440) + eventLocalMinutes;
  const shiftDuration = shiftEndMinutes - shiftStartMinutes;
  const minsAfterStart = eventOffsetMinutes - shiftStartMinutes;

  return {
    dayOffset,
    eventLocalDate,
    eventLocalMinutes,
    eventOffsetMinutes,
    isOvernight,
    shiftStartMinutes,
    shiftEndMinutes,
    shiftDuration,
    halfShift: shiftDuration / 2,
    minsAfterStart,
    distToStart: Math.abs(eventOffsetMinutes - shiftStartMinutes),
    distToEnd: Math.abs(eventOffsetMinutes - shiftEndMinutes),
  };
}

function isPlausibleCheckout(metrics, maxCheckoutDistanceFromShiftEndMinutes = 120) {
  if (!metrics) return false;

  return metrics.distToEnd < metrics.distToStart
    && metrics.minsAfterStart > metrics.halfShift
    && metrics.distToEnd <= maxCheckoutDistanceFromShiftEndMinutes;
}

function hasScheduleEnded(schedule, referenceDate, timezone) {
  const metrics = getScheduleMetricsForEvent(referenceDate, schedule, timezone);
  if (!metrics) return false;
  return metrics.eventOffsetMinutes >= metrics.shiftEndMinutes;
}

module.exports = {
  diffDateOnlyDays,
  getLocalTimeMinutes,
  getPreviousDateOnly,
  getScheduleMetricsForEvent,
  hasScheduleEnded,
  isPlausibleCheckout,
  parseTimeToMinutes,
  toLocalDateOnly,
};
