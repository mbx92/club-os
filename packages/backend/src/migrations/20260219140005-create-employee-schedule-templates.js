'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('EmployeeScheduleTemplates', {
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
      dayOfWeek: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: '0=Sunday, 1=Monday, ..., 6=Saturday',
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

    // One entry per employee per day of week per tenant
    await queryInterface.addIndex('EmployeeScheduleTemplates', ['tenantId', 'userId', 'dayOfWeek'], {
      unique: true,
      name: 'unique_employee_schedule_template',
    });

    await queryInterface.addIndex('EmployeeScheduleTemplates', ['tenantId']);
    await queryInterface.addIndex('EmployeeScheduleTemplates', ['userId']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('EmployeeScheduleTemplates');
  },
};
