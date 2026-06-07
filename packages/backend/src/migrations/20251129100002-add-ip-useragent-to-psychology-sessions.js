'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add ipAddress column
    await queryInterface.addColumn('PsychologySessions', 'ipAddress', {
      type: Sequelize.STRING(45),
      allowNull: true
    });

    // Add userAgent column
    await queryInterface.addColumn('PsychologySessions', 'userAgent', {
      type: Sequelize.TEXT,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('PsychologySessions', 'ipAddress');
    await queryInterface.removeColumn('PsychologySessions', 'userAgent');
  }
};
