'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('EmployeeScheduleOverrides', {
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
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // One override per employee per date per tenant
    await queryInterface.addIndex('EmployeeScheduleOverrides', ['tenantId', 'userId', 'date'], {
      unique: true,
      name: 'unique_employee_schedule_override',
    });

    await queryInterface.addIndex('EmployeeScheduleOverrides', ['tenantId']);
    await queryInterface.addIndex('EmployeeScheduleOverrides', ['userId']);
    await queryInterface.addIndex('EmployeeScheduleOverrides', ['date']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('EmployeeScheduleOverrides');
  },
};
