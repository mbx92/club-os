'use strict';

module.exports = {
  async up(queryInterface) {
    try {
      await queryInterface.removeConstraint('EmployeeSchedules', 'uq_employee_schedules_tenant_period_employee_date');
    } catch (error) {
      console.log('Note: constraint uq_employee_schedules_tenant_period_employee_date not found, skipping removal.');
    }

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_employee_schedules_slot"
      ON "EmployeeSchedules" (
        "tenantId",
        COALESCE("periodId", '00000000-0000-0000-0000-000000000000'::uuid),
        "deviceEmployeeId",
        date,
        COALESCE("shiftStart", '00:00:00'::time),
        COALESCE("shiftEnd", '00:00:00'::time),
        "isOff"
      )
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS "uq_employee_schedules_slot"
    `);

    await queryInterface.addConstraint('EmployeeSchedules', {
      fields: ['tenantId', 'periodId', 'deviceEmployeeId', 'date'],
      type: 'unique',
      name: 'uq_employee_schedules_tenant_period_employee_date',
    });
  }
};
