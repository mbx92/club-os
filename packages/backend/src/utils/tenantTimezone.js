'use strict';

/**
 * Tenant Timezone Utilities
 *
 * All date boundaries in reports must use the tenant's configured timezone
 * (stored in Tenant.settings.timezone), not UTC or server local time.
 *
 * Tenant timezone is loaded by authMiddleware via req.user.tenant.settings.timezone.
 * Default fallback: Asia/Makassar (WITA, UTC+8).
 */

const DEFAULT_TIMEZONE = 'Asia/Makassar';

/**
 * Get the tenant's IANA timezone string from the request.
 * Falls back to Asia/Makassar if not set.
 * @param {import('express').Request} req
 * @returns {string} IANA timezone name e.g. 'Asia/Makassar'
 */
function getTenantTimezone(req) {
  return req?.user?.tenant?.settings?.timezone || DEFAULT_TIMEZONE;
}

/**
 * Compute the UTC offset (in ms) of a given IANA timezone at a specific instant.
 * Positive value means the timezone is ahead of UTC (e.g. +8h for Asia/Makassar).
 *
 * Uses the Intl.DateTimeFormat difference trick — works for all IANA names and
 * correctly handles DST transitions even though Asia/Makassar has none.
 *
 * @param {Date} date  - Reference instant
 * @param {string} timezone - IANA timezone
 * @returns {number} Offset in milliseconds (positive = ahead of UTC)
 */
function getTimezoneOffsetMs(date, timezone) {
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate  = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  return tzDate - utcDate; // e.g. +28_800_000 for UTC+8
}

/**
 * Return the UTC Date that corresponds to 00:00:00.000 on `dateString`
 * in the given `timezone`.
 *
 * Example: startOfDayInTz('2026-07-09', 'Asia/Makassar')
 *          → 2026-07-08T16:00:00.000Z  (midnight WITA = UTC-8h)
 *
 * @param {string} dateString - 'YYYY-MM-DD'
 * @param {string} timezone   - IANA timezone
 * @returns {Date}
 */
function startOfDayInTz(dateString, timezone) {
  const nominalUtc = new Date(`${dateString}T00:00:00.000Z`);
  const offsetMs   = getTimezoneOffsetMs(nominalUtc, timezone);
  return new Date(nominalUtc.getTime() - offsetMs);
}

/**
 * Return the UTC Date that corresponds to 23:59:59.999 on `dateString`
 * in the given `timezone`.
 *
 * Example: endOfDayInTz('2026-07-09', 'Asia/Makassar')
 *          → 2026-07-09T15:59:59.999Z
 *
 * @param {string} dateString - 'YYYY-MM-DD'
 * @param {string} timezone   - IANA timezone
 * @returns {Date}
 */
function endOfDayInTz(dateString, timezone) {
  const nominalUtc = new Date(`${dateString}T23:59:59.999Z`);
  const offsetMs   = getTimezoneOffsetMs(nominalUtc, timezone);
  return new Date(nominalUtc.getTime() - offsetMs);
}

/**
 * Return today's date string ('YYYY-MM-DD') in the given timezone.
 *
 * @param {string} timezone - IANA timezone
 * @returns {string} e.g. '2026-07-09'
 */
function todayInTz(timezone) {
  return new Date().toLocaleDateString('en-CA', { timeZone: timezone });
}

/**
 * Add (or subtract) a number of calendar days to a 'YYYY-MM-DD' string.
 * Pure string arithmetic — no timezone conversion needed.
 *
 * @param {string} dateString - 'YYYY-MM-DD'
 * @param {number} days       - positive or negative
 * @returns {string}
 */
function addDays(dateString, days) {
  const d = new Date(`${dateString}T12:00:00.000Z`); // noon UTC avoids DST edge cases
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Return the first day of the month for a given 'YYYY-MM-DD' date string.
 * @param {string} dateString
 * @returns {string} 'YYYY-MM-01'
 */
function firstDayOfMonth(dateString) {
  return dateString.slice(0, 7) + '-01';
}

/**
 * Return the last day of the previous month for a given 'YYYY-MM-DD' date string.
 * @param {string} dateString
 * @returns {string}
 */
function lastDayOfPrevMonth(dateString) {
  const [year, month] = dateString.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, 0)); // day 0 of current month = last day of prev
  return d.toISOString().slice(0, 10);
}

/**
 * Return the first day of the previous month for a given 'YYYY-MM-DD' date string.
 * @param {string} dateString
 * @returns {string}
 */
function firstDayOfPrevMonth(dateString) {
  const [year, month] = dateString.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 2, 1));
  return d.toISOString().slice(0, 10);
}

module.exports = {
  DEFAULT_TIMEZONE,
  getTenantTimezone,
  startOfDayInTz,
  endOfDayInTz,
  todayInTz,
  addDays,
  firstDayOfMonth,
  lastDayOfPrevMonth,
  firstDayOfPrevMonth,
};
