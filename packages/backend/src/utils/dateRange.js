'use strict';

function buildUtcStartOfDay(dateString) {
  return new Date(`${dateString}T00:00:00.000Z`);
}

function buildUtcEndOfDay(dateString) {
  return new Date(`${dateString}T23:59:59.999Z`);
}

function buildInclusiveDateRange(startDate, endDate) {
  return {
    start: buildUtcStartOfDay(startDate),
    end: buildUtcEndOfDay(endDate),
  };
}

function buildOptionalDateRangeFilter(startDate, endDate, Op) {
  const filter = {};

  if (startDate) {
    filter[Op.gte] = buildUtcStartOfDay(startDate);
  }

  if (endDate) {
    filter[Op.lte] = buildUtcEndOfDay(endDate);
  }

  return Reflect.ownKeys(filter).length > 0 ? filter : null;
}

module.exports = {
  buildUtcStartOfDay,
  buildUtcEndOfDay,
  buildInclusiveDateRange,
  buildOptionalDateRangeFilter,
};
