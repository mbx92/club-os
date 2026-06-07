'use strict';

/**
 * Migration: Add deviceEmployeeId to EmployeeSchedules & EmployeeScheduleTemplates
 *
 * Employees (DeviceEmployee) don't always have a linked system User.
 * Schedule management should work with deviceEmployeeId as the primary
 * identifier, with userId being optional (auto-filled when linked).
 *
 * Changes:
 * 1. Add deviceEmployeeId FK to EmployeeSchedules
 * 2. Make userId nullable in EmployeeSchedules
 * 3. Change unique constraint from (tenantId, periodId, userId, date) to (tenantId, periodId, deviceEmployeeId, date)
 * 4. Add deviceEmployeeId FK to EmployeeScheduleTemplates
 * 5. Make userId nullable in EmployeeScheduleTemplates
 * 6. Change unique index from (tenantId, userId, dayOfWeek) to (tenantId, deviceEmployeeId, dayOfWeek)
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // ── EmployeeSchedules ──────────────────────────────────

    // 1. Add deviceEmployeeId column
    await queryInterface.addColumn('EmployeeSchedules', 'deviceEmployeeId', {
      type: Sequelize.UUID,
      allowNull: true, // temporarily nullable to backfill
      references: { model: 'DeviceEmployees', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    // 2. Backfill deviceEmployeeId from Users.deviceEmployeeNo → DeviceEmployees
    // For existing rows that have userId linked to a User with deviceEmployeeNo
    await queryInterface.sequelize.query(`
      UPDATE "EmployeeSchedules" es
      SET "deviceEmployeeId" = de.id
      FROM "Users" u
      JOIN "DeviceEmployees" de ON de."userId" = u.id AND de."tenantId" = u."tenantId"
      WHERE es."userId" = u.id
        AND es."deviceEmployeeId" IS NULL
    `);

    // 3. Delete orphan rows that couldn't be linked (if any)
    await queryInterface.sequelize.query(`
      DELETE FROM "EmployeeSchedules" WHERE "deviceEmployeeId" IS NULL
    `);

    // 4. Now make it NOT NULL
    await queryInterface.changeColumn('EmployeeSchedules', 'deviceEmployeeId', {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'DeviceEmployees', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    // 5. Make userId nullable (raw SQL — changeColumn with references doesn't reliably alter nullability)
    await queryInterface.sequelize.query(
      `ALTER TABLE "EmployeeSchedules" ALTER COLUMN "userId" DROP NOT NULL`
    );

    // 6. Drop old unique constraint and add new one
    try {
      await queryInterface.removeConstraint('EmployeeSchedules', 'uq_employee_schedules_tenant_period_user_date');
    } catch (e) {
      // Constraint might have different name, try alternative
      try {
        await queryInterface.removeConstraint('EmployeeSchedules', 'uq_employee_schedules_tenant_user_date');
      } catch (e2) {
        console.log('Note: Could not remove old unique constraint, may already be removed');
      }
    }

    await queryInterface.addConstraint('EmployeeSchedules', {
      fields: ['tenantId', 'periodId', 'deviceEmployeeId', 'date'],
      type: 'unique',
      name: 'uq_employee_schedules_tenant_period_employee_date',
    });

    await queryInterface.addIndex('EmployeeSchedules', ['deviceEmployeeId'], {
      name: 'idx_employee_schedules_device_employee',
    });

    // ── EmployeeScheduleTemplates ──────────────────────────

    // 1. Add deviceEmployeeId column
    await queryInterface.addColumn('EmployeeScheduleTemplates', 'deviceEmployeeId', {
      type: Sequelize.UUID,
      allowNull: true, // temporarily nullable to backfill
      references: { model: 'DeviceEmployees', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    // 2. Backfill
    await queryInterface.sequelize.query(`
      UPDATE "EmployeeScheduleTemplates" est
      SET "deviceEmployeeId" = de.id
      FROM "Users" u
      JOIN "DeviceEmployees" de ON de."userId" = u.id AND de."tenantId" = u."tenantId"
      WHERE est."userId" = u.id
        AND est."deviceEmployeeId" IS NULL
    `);

    // 3. Delete orphan rows
    await queryInterface.sequelize.query(`
      DELETE FROM "EmployeeScheduleTemplates" WHERE "deviceEmployeeId" IS NULL
    `);

    // 4. Make NOT NULL
    await queryInterface.changeColumn('EmployeeScheduleTemplates', 'deviceEmployeeId', {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'DeviceEmployees', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    // 5. Make userId nullable
    // 5. Make userId nullable (raw SQL — changeColumn with references doesn't reliably alter nullability)
    await queryInterface.sequelize.query(
      `ALTER TABLE "EmployeeScheduleTemplates" ALTER COLUMN "userId" DROP NOT NULL`
    );

    // 6. Drop old unique index and add new one
    try {
      await queryInterface.removeIndex('EmployeeScheduleTemplates', 'unique_employee_schedule_template');
    } catch (e) {
      console.log('Note: Could not remove old unique index, may already be removed');
    }

    await queryInterface.addIndex('EmployeeScheduleTemplates', ['tenantId', 'deviceEmployeeId', 'dayOfWeek'], {
      unique: true,
      name: 'unique_employee_schedule_template',
    });

    await queryInterface.addIndex('EmployeeScheduleTemplates', ['deviceEmployeeId'], {
      name: 'idx_employee_schedule_templates_device_employee',
    });
  },

  async down(queryInterface, Sequelize) {
    // ── EmployeeScheduleTemplates (reverse) ──
    try {
      await queryInterface.removeIndex('EmployeeScheduleTemplates', 'idx_employee_schedule_templates_device_employee');
    } catch (e) { /* ignore */ }

    try {
      await queryInterface.removeIndex('EmployeeScheduleTemplates', 'unique_employee_schedule_template');
    } catch (e) { /* ignore */ }

    await queryInterface.changeColumn('EmployeeScheduleTemplates', 'userId', {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'Users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    await queryInterface.addIndex('EmployeeScheduleTemplates', ['tenantId', 'userId', 'dayOfWeek'], {
      unique: true,
      name: 'unique_employee_schedule_template',
    });

    await queryInterface.removeColumn('EmployeeScheduleTemplates', 'deviceEmployeeId');

    // ── EmployeeSchedules (reverse) ──
    try {
      await queryInterface.removeIndex('EmployeeSchedules', 'idx_employee_schedules_device_employee');
    } catch (e) { /* ignore */ }

    try {
      await queryInterface.removeConstraint('EmployeeSchedules', 'uq_employee_schedules_tenant_period_employee_date');
    } catch (e) { /* ignore */ }

    await queryInterface.changeColumn('EmployeeSchedules', 'userId', {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'Users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    await queryInterface.addConstraint('EmployeeSchedules', {
      fields: ['tenantId', 'periodId', 'userId', 'date'],
      type: 'unique',
      name: 'uq_employee_schedules_tenant_period_user_date',
    });

    await queryInterface.removeColumn('EmployeeSchedules', 'deviceEmployeeId');
  },
};
