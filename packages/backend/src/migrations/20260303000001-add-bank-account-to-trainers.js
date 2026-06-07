'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Trainers', 'bankName', {
      type: Sequelize.STRING,
      allowNull: true,
      after: 'commissionNotes'
    });

    await queryInterface.addColumn('Trainers', 'bankAccountNumber', {
      type: Sequelize.STRING,
      allowNull: true,
      after: 'bankName'
    });

    await queryInterface.addColumn('Trainers', 'bankAccountName', {
      type: Sequelize.STRING,
      allowNull: true,
      after: 'bankAccountNumber'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Trainers', 'bankName');
    await queryInterface.removeColumn('Trainers', 'bankAccountNumber');
    await queryInterface.removeColumn('Trainers', 'bankAccountName');
  }
};
