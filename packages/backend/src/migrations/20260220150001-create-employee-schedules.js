'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('EmployeeSchedules', {
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
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      shiftStart: {
        type: Sequelize.TIME,
        allowNull: true,
      },
      shiftEnd: {
        type: Sequelize.TIME,
        allowNull: true,
      },
      isOff: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
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

    // One schedule entry per user per date per tenant
    await queryInterface.addConstraint('EmployeeSchedules', {
      fields: ['tenantId', 'userId', 'date'],
      type: 'unique',
      name: 'uq_employee_schedules_tenant_user_date',
    });

    await queryInterface.addIndex('EmployeeSchedules', ['tenantId', 'date']);
    await queryInterface.addIndex('EmployeeSchedules', ['userId']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('EmployeeSchedules');
  },
};
