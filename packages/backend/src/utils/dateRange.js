'use strict';

const {
  DEFAULT_TIMEZONE,
  startOfDayInTz,
  endOfDayInTz,
} = require('./tenantTimezone');

function buildStartOfDay(dateString, timezone = DEFAULT_TIMEZONE) {
  return startOfDayInTz(dateString, timezone);
}

function buildEndOfDay(dateString, timezone = DEFAULT_TIMEZONE) {
  return endOfDayInTz(dateString, timezone);
}

/** @deprecated Prefer buildStartOfDay — kept for existing imports */
function buildUtcStartOfDay(dateString, timezone = DEFAULT_TIMEZONE) {
  return buildStartOfDay(dateString, timezone);
}

/** @deprecated Prefer buildEndOfDay — kept for existing imports */
function buildUtcEndOfDay(dateString, timezone = DEFAULT_TIMEZONE) {
  return buildEndOfDay(dateString, timezone);
}

function buildInclusiveDateRange(startDate, endDate, timezone = DEFAULT_TIMEZONE) {
  return {
    start: buildStartOfDay(startDate, timezone),
    end: buildEndOfDay(endDate, timezone),
  };
}

function buildOptionalDateRangeFilter(startDate, endDate, Op, timezone = DEFAULT_TIMEZONE) {
  const filter = {};

  if (startDate) {
    filter[Op.gte] = buildStartOfDay(startDate, timezone);
  }

  if (endDate) {
    filter[Op.lte] = buildEndOfDay(endDate, timezone);
  }

  return Reflect.ownKeys(filter).length > 0 ? filter : null;
}

function buildDateFieldFilter(startDate, endDate, Op, timezone = DEFAULT_TIMEZONE) {
  if (startDate && endDate) {
    return {
      [Op.between]: [buildStartOfDay(startDate, timezone), buildEndOfDay(endDate, timezone)],
    };
  }

  return buildOptionalDateRangeFilter(startDate, endDate, Op, timezone) || undefined;
}

function mergeDateRangeInto(where, field, startDate, endDate, Op, timezone = DEFAULT_TIMEZONE) {
  const range = buildOptionalDateRangeFilter(startDate, endDate, Op, timezone);
  if (!range) return;
  where[field] = { ...(where[field] || {}), ...range };
}

module.exports = {
  buildStartOfDay,
  buildEndOfDay,
  buildUtcStartOfDay,
  buildUtcEndOfDay,
  buildInclusiveDateRange,
  buildOptionalDateRangeFilter,
  buildDateFieldFilter,
  mergeDateRangeInto,
};
