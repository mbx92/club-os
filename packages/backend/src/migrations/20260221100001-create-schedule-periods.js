'use strict';

/**
 * Migration: Restructure Employee Scheduling to Period-based System
 *
 * Changes:
 * 1. Create SchedulePeriods table (period header with startDate/endDate)
 * 2. Add periodId FK to EmployeeSchedules
 * 3. Change unique constraint from (tenantId, userId, date) to (tenantId, periodId, userId, date)
 *    so multiple staff can work on the same date within a period
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Create SchedulePeriods table
    await queryInterface.createTable('SchedulePeriods', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Tenants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Period name e.g. "Februari 2026", "Week 8 - March"',
      },
      startDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      endDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('draft', 'active', 'closed'),
        allowNull: false,
        defaultValue: 'draft',
        comment: 'draft=being prepared, active=current schedule, closed=archived',
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    await queryInterface.addIndex('SchedulePeriods', ['tenantId']);
    await queryInterface.addIndex('SchedulePeriods', ['tenantId', 'status']);
    await queryInterface.addIndex('SchedulePeriods', ['tenantId', 'startDate', 'endDate']);

    // 2. Add periodId to EmployeeSchedules
    await queryInterface.addColumn('EmployeeSchedules', 'periodId', {
      type: Sequelize.UUID,
      allowNull: true, // nullable for backward compat with existing data
      references: { model: 'SchedulePeriods', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    // 3. Remove old unique constraint (tenantId, userId, date)
    try {
      await queryInterface.removeConstraint('EmployeeSchedules', 'uq_employee_schedules_tenant_user_date');
    } catch (e) {
      // Constraint may not exist, safe to ignore
      console.log('Note: Old constraint uq_employee_schedules_tenant_user_date not found, skipping removal.');
    }

    // 4. Add new unique constraint (tenantId, periodId, userId, date)
    //    This allows same user on same date in different periods (shouldn't happen but safe)
    //    And multiple users on the same date within the same period
    await queryInterface.addConstraint('EmployeeSchedules', {
      fields: ['tenantId', 'periodId', 'userId', 'date'],
      type: 'unique',
      name: 'uq_employee_schedules_tenant_period_user_date',
    });

    await queryInterface.addIndex('EmployeeSchedules', ['periodId']);
  },

  async down(queryInterface, Sequelize) {
    // Reverse: remove new constraint, remove periodId, remove table
    try {
      await queryInterface.removeConstraint('EmployeeSchedules', 'uq_employee_schedules_tenant_period_user_date');
    } catch (e) { /* ignore */ }

    await queryInterface.removeColumn('EmployeeSchedules', 'periodId');

    // Restore old unique constraint
    await queryInterface.addConstraint('EmployeeSchedules', {
      fields: ['tenantId', 'userId', 'date'],
      type: 'unique',
      name: 'uq_employee_schedules_tenant_user_date',
    });

    await queryInterface.dropTable('SchedulePeriods');
  },
};
