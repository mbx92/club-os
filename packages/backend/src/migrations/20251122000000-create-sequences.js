'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Sequences', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'Sequence name (e.g., invoice_number, receipt_number)'
      },
      prefix: {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: 'Prefix for the sequence (e.g., INV, RCT)'
      },
      currentValue: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Current sequence value'
      },
      step: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: 'Increment step'
      },
      padLength: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 6,
        comment: 'Zero-padding length for the number'
      },
      resetPeriod: {
        type: Sequelize.ENUM('none', 'daily', 'monthly', 'yearly'),
        defaultValue: 'monthly',
        comment: 'When to reset the sequence'
      },
      lastResetDate: {
        type: Sequelize.DATEONLY,
        allowNull: true,
        comment: 'Last date when sequence was reset'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Create index for faster lookups
    await queryInterface.addIndex('Sequences', ['name'], {
      name: 'sequences_name_idx'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Sequences');
  }
};
