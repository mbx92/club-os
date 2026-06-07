'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Create Shifts master table
    await queryInterface.createTable('Shifts', {
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
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'e.g. Pagi, Siang, Middle, Custom',
      },
      code: {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: 'Short code e.g. P, S, M',
      },
      shiftStart: {
        type: Sequelize.TIME,
        allowNull: false,
      },
      shiftEnd: {
        type: Sequelize.TIME,
        allowNull: false,
      },
      color: {
        type: Sequelize.STRING(7),
        allowNull: true,
        comment: 'Hex color for UI display e.g. #4CAF50',
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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

    // Unique shift name per tenant
    await queryInterface.addConstraint('Shifts', {
      fields: ['tenantId', 'name'],
      type: 'unique',
      name: 'uq_shifts_tenant_name',
    });

    await queryInterface.addIndex('Shifts', ['tenantId']);

    // 2. Add shiftId column to EmployeeSchedules
    await queryInterface.addColumn('EmployeeSchedules', 'shiftId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'Shifts', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    // 3. Add shiftId column to EmployeeScheduleTemplates
    await queryInterface.addColumn('EmployeeScheduleTemplates', 'shiftId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'Shifts', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('EmployeeScheduleTemplates', 'shiftId');
    await queryInterface.removeColumn('EmployeeSchedules', 'shiftId');
    await queryInterface.dropTable('Shifts');
  },
};
