'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Psikograms', 'publicToken', {
      type: Sequelize.STRING(64),
      allowNull: true,
      unique: true
    });
    
    await queryInterface.addColumn('Psikograms', 'publicTokenExpiry', {
      type: Sequelize.DATE,
      allowNull: true
    });

    // Add index for faster lookup
    await queryInterface.addIndex('Psikograms', ['publicToken'], {
      name: 'idx_psikograms_public_token'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('Psikograms', 'idx_psikograms_public_token');
    await queryInterface.removeColumn('Psikograms', 'publicTokenExpiry');
    await queryInterface.removeColumn('Psikograms', 'publicToken');
  }
};
