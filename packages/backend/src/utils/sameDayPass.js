'use strict';

const { dateTimeInTz } = require('./tenantTimezone');

const DEFAULT_CLOSE = { hours: 22, minutes: 0 };
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function parseHm(value) {
  if (!value || typeof value !== 'string') return null;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return { hours, minutes };
}

function unwrapWorkingHours(workingHours) {
  if (!workingHours || typeof workingHours !== 'object') return null;
  if (workingHours.workingHours && typeof workingHours.workingHours === 'object') {
    return workingHours.workingHours;
  }
  return workingHours;
}

function weekdayKeyInTz(date, timezone) {
  const weekday = new Date(date).toLocaleDateString('en-US', {
    timeZone: timezone,
    weekday: 'long'
  });
  return String(weekday || '').toLowerCase();
}

/**
 * Close time from tenant working hours for the weekday of `date`.
 * Supports [open, close] arrays and { open, close, closed } objects.
 */
function getWorkingHoursClose(workingHours, date, timezone = 'Asia/Makassar') {
  const hours = unwrapWorkingHours(workingHours);
  const dayKey = weekdayKeyInTz(date, timezone);
  const dayHours = hours?.[dayKey] ?? hours?.[WEEKDAYS[new Date(date).getDay()]];

  if (dayHours == null || dayHours === 'closed') {
    return { ...DEFAULT_CLOSE };
  }
  if (Array.isArray(dayHours) && dayHours[1]) {
    return parseHm(dayHours[1]) || { ...DEFAULT_CLOSE };
  }
  if (typeof dayHours === 'object') {
    if (dayHours.closed) return { ...DEFAULT_CLOSE };
    return parseHm(dayHours.close) || { ...DEFAULT_CLOSE };
  }
  return parseHm(dayHours) || { ...DEFAULT_CLOSE };
}

function formatCloseTimeLabel(workingHours, date, timezone = 'Asia/Makassar') {
  const { hours, minutes } = getWorkingHoursClose(workingHours, date, timezone);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function endAtWorkingHoursClose(date, workingHours, timezone = 'Asia/Makassar') {
  const { hours, minutes } = getWorkingHoursClose(workingHours, date, timezone);
  const dateStr = new Date(date).toLocaleDateString('en-CA', { timeZone: timezone });
  return dateTimeInTz(dateStr, hours, minutes, timezone);
}

/**
 * 1-hari time-based atau 1 sesi session-based: qty = tiket hari pembelian.
 */
function isSameDayPassPlan(plan) {
  if (!plan) return false;

  const sessions = Number(plan.sessions || 0);
  const duration = Number(plan.duration || 0);
  const validity = Number(plan.validityDays || 0);
  const durationType = plan.durationType;

  if (durationType === 'time_based') {
    return duration === 1 || (duration === 0 && validity === 1);
  }
  if (durationType === 'session_based') {
    return sessions === 1;
  }
  if (duration === 1) return true;
  if (sessions === 1 && duration <= 1) return true;
  return validity === 1 && sessions <= 1;
}

function formatValidityUntilClose(date, timezone = 'Asia/Makassar', workingHours = null) {
  const dateStr = new Date(date).toLocaleDateString('id-ID', {
    timeZone: timezone,
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  return `${dateStr} sampai pukul ${formatCloseTimeLabel(workingHours, date, timezone)}`;
}

module.exports = {
  isSameDayPassPlan,
  getWorkingHoursClose,
  formatCloseTimeLabel,
  endAtWorkingHoursClose,
  formatValidityUntilClose,
  formatSameDayPassValidity: formatValidityUntilClose
};
