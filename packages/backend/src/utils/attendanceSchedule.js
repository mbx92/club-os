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

function getNextDateOnly(dateStr) {
  const [y, m, d] = String(dateStr).split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`;
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
  const anchorDate = getOvernightShiftAnchorDate(schedule, eventDate, tz);
  const eventLocalDate = toLocalDateOnly(eventDate, tz);
  const eventLocalMinutes = getLocalTimeMinutes(eventDate, tz);
  const shiftStartMinutes = parseTimeToMinutes(schedule.shiftStart);
  const rawShiftEndMinutes = parseTimeToMinutes(schedule.shiftEnd);
  const isOvernight = rawShiftEndMinutes <= shiftStartMinutes;
  const shiftEndMinutes = isOvernight ? rawShiftEndMinutes + 1440 : rawShiftEndMinutes;
  const dayOffset = diffDateOnlyDays(anchorDate, eventLocalDate);
  const eventOffsetMinutes = (dayOffset * 1440) + eventLocalMinutes;
  const shiftDuration = shiftEndMinutes - shiftStartMinutes;
  const minsAfterStart = eventOffsetMinutes - shiftStartMinutes;

  return {
    dayOffset,
    anchorDate,
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

function isOvernightSchedule(schedule) {
  const shiftStart = parseTimeToMinutes(schedule?.shiftStart);
  const shiftEnd = parseTimeToMinutes(schedule?.shiftEnd);
  if (shiftStart === null || shiftEnd === null) return false;
  return shiftEnd <= shiftStart;
}

function isPlausibleCheckIn(metrics, maxCheckInDistanceFromShiftStartMinutes = 120) {
  if (!metrics) return false;

  return metrics.distToStart <= maxCheckInDistanceFromShiftStartMinutes
    && metrics.distToStart <= metrics.distToEnd
    && metrics.minsAfterStart <= metrics.halfShift;
}

function isPlausibleCheckout(metrics, maxCheckoutDistanceFromShiftEndMinutes = 120) {
  if (!metrics) return false;

  return metrics.distToEnd < metrics.distToStart
    && metrics.minsAfterStart > metrics.halfShift
    && metrics.distToEnd <= maxCheckoutDistanceFromShiftEndMinutes;
}

/**
 * Night shifts are anchored on the shift START calendar date.
 * Schedules are sometimes stored on the checkout date (next morning) — remap.
 */
function getOvernightShiftAnchorDate(schedule, eventDate, timezone) {
  const scheduleDate = String(schedule?.date || '').split('T')[0];
  if (!scheduleDate || !isOvernightSchedule(schedule)) return scheduleDate;

  const tz = timezone || process.env.TZ || 'Asia/Jakarta';
  const eventLocalDate = toLocalDateOnly(eventDate, tz);
  const eventLocalMinutes = getLocalTimeMinutes(eventDate, tz);
  const shiftStartMinutes = parseTimeToMinutes(schedule.shiftStart);
  const rawShiftEndMinutes = parseTimeToMinutes(schedule.shiftEnd);
  const dayOffset = diffDateOnlyDays(scheduleDate, eventLocalDate);

  if (dayOffset === -1) {
    return getPreviousDateOnly(scheduleDate);
  }

  if (dayOffset === 0 && eventLocalMinutes <= rawShiftEndMinutes) {
    return getPreviousDateOnly(scheduleDate);
  }

  if (dayOffset === 0 && eventLocalMinutes >= shiftStartMinutes) {
    return scheduleDate;
  }

  if (dayOffset === 1 && eventLocalMinutes <= rawShiftEndMinutes) {
    return scheduleDate;
  }

  return scheduleDate;
}

function shouldSwapOvernightTimes(checkInTime, checkOutTime, schedule, timezone) {
  if (!checkInTime || !checkOutTime || !schedule) return false;

  const checkIn = new Date(checkInTime);
  const checkOut = new Date(checkOutTime);
  if (checkIn <= checkOut) return false;

  const metrics = getScheduleMetricsForEvent(checkIn, schedule, timezone)
    || getScheduleMetricsForEvent(checkOut, schedule, timezone);
  return Boolean(metrics?.isOvernight);
}

function hasScheduleEnded(schedule, referenceDate, timezone) {
  const metrics = getScheduleMetricsForEvent(referenceDate, schedule, timezone);
  if (!metrics) return false;
  return metrics.eventOffsetMinutes >= metrics.shiftEndMinutes;
}

module.exports = {
  diffDateOnlyDays,
  getLocalTimeMinutes,
  getNextDateOnly,
  getOvernightShiftAnchorDate,
  getPreviousDateOnly,
  getScheduleMetricsForEvent,
  hasScheduleEnded,
  isOvernightSchedule,
  isPlausibleCheckIn,
  isPlausibleCheckout,
  parseTimeToMinutes,
  shouldSwapOvernightTimes,
  toLocalDateOnly,
};
