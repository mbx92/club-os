'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Change logo, footer, signature from VARCHAR(500) to TEXT
    await queryInterface.changeColumn('PsychologySettings', 'logo', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    
    await queryInterface.changeColumn('PsychologySettings', 'footer', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    
    await queryInterface.changeColumn('PsychologySettings', 'signature', {
      type: Sequelize.TEXT,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    // Revert back to VARCHAR(500)
    await queryInterface.changeColumn('PsychologySettings', 'logo', {
      type: Sequelize.STRING(500),
      allowNull: true
    });
    
    await queryInterface.changeColumn('PsychologySettings', 'footer', {
      type: Sequelize.STRING(500),
      allowNull: true
    });
    
    await queryInterface.changeColumn('PsychologySettings', 'signature', {
      type: Sequelize.STRING(500),
      allowNull: true
    });
  }
};
