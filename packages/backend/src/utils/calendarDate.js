'use strict';

/**
 * YYYY-MM-DD in the environment local timezone (aligned with Date#getFullYear/getMonth/getDate).
 * Do not use UTC from toISOString().split('T')[0] for "today" when comparing with local month/day
 * logic - in positive offsets the UTC date can lag the local calendar date and break monthly
 * sequence resets (every call looks like a new month vs a wrongly stored lastResetDate).
 */
function calendarDateLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parse DATEONLY / YYYY-MM-DD as local calendar midnight (not UTC). */
function parseDateOnlyLocal(yyyyMmDd) {
  if (!yyyyMmDd || typeof yyyyMmDd !== 'string') return new Date(NaN);
  const parts = yyyyMmDd.split('-');
  if (parts.length !== 3) return new Date(NaN);
  const y = parseInt(parts[0], 10);
  const mo = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (Number.isNaN(y) || Number.isNaN(mo) || Number.isNaN(day)) return new Date(NaN);
  return new Date(y, mo, day);
}

module.exports = { calendarDateLocal, parseDateOnlyLocal };
