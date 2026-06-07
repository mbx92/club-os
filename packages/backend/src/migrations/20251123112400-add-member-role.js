'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Member role will be seeded via seeder file
    // This migration is kept for schema consistency
  },

  async down(queryInterface, Sequelize) {
    // Rollback handled by seeder
  }
};
