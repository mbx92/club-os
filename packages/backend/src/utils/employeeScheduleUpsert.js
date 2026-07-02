'use strict';

const { EmployeeSchedule } = require('../models');

async function upsertEmployeeScheduleBySlot(payload, options = {}) {
  const normalized = {
    ...payload,
    periodId: payload.periodId || null,
    shiftId: payload.shiftId || null,
    shiftStart: payload.shiftStart || null,
    shiftEnd: payload.shiftEnd || null,
    isOff: Boolean(payload.isOff),
    notes: payload.notes || null,
  };

  const where = {
    tenantId: normalized.tenantId,
    periodId: normalized.periodId,
    deviceEmployeeId: normalized.deviceEmployeeId,
    date: normalized.date,
    shiftStart: normalized.shiftStart,
    shiftEnd: normalized.shiftEnd,
    isOff: normalized.isOff,
  };

  const existing = await EmployeeSchedule.findOne({
    where,
    transaction: options.transaction,
  });

  if (existing) {
    await existing.update(normalized, { transaction: options.transaction });
    return [existing, false];
  }

  const created = await EmployeeSchedule.create(normalized, {
    transaction: options.transaction,
  });

  return [created, true];
}

module.exports = {
  upsertEmployeeScheduleBySlot,
};
