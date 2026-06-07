'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add deviceEmployeeNo to Users table (staff mapping)
    await queryInterface.addColumn('Users', 'deviceEmployeeNo', {
      type: Sequelize.STRING(50),
      allowNull: true,
      comment: 'Employee number on Hikvision device for attendance matching',
    });

    // Add deviceEmployeeNo to Members table (optional member check-in)
    await queryInterface.addColumn('Members', 'deviceEmployeeNo', {
      type: Sequelize.STRING(50),
      allowNull: true,
      comment: 'Employee number on Hikvision device for member check-in matching',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Users', 'deviceEmployeeNo');
    await queryInterface.removeColumn('Members', 'deviceEmployeeNo');
  }
};
