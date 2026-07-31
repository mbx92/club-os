'use strict';

const DEFAULT_TIMEZONE = 'Asia/Makassar';

export function getTenantTimezone(authStore) {
  return authStore?.user?.tenant?.settings?.timezone
    || Intl.DateTimeFormat().resolvedOptions().timeZone
    || DEFAULT_TIMEZONE;
}

/** Today's YYYY-MM-DD in tenant timezone */
export function todayInTz(timezone) {
  return new Date().toLocaleDateString('en-CA', { timeZone: timezone });
}

/** Add calendar days to YYYY-MM-DD (timezone-neutral day arithmetic) */
export function addDays(dateString, days) {
  const d = new Date(`${dateString}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function firstDayOfMonth(dateString) {
  return `${dateString.slice(0, 7)}-01`;
}

export function lastDayOfMonth(dateString) {
  const [year, month] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

export function firstDayOfPrevMonth(dateString) {
  const [year, month] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month - 2, 1)).toISOString().slice(0, 10);
}

export function lastDayOfPrevMonth(dateString) {
  const [year, month] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 0)).toISOString().slice(0, 10);
}

/** Day of week 0=Sun … 6=Sat in tenant timezone */
export function dayOfWeekInTz(dateString, timezone) {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
  }).format(new Date(`${dateString}T12:00:00.000Z`));
  const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[weekday] ?? 0;
}
