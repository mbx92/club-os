'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Change column type from INTEGER to VARCHAR directly with USING clause
    await queryInterface.sequelize.query(`
      ALTER TABLE "PsychologyTestTypes" 
      ALTER COLUMN version TYPE VARCHAR(255) USING version::text,
      ALTER COLUMN version SET DEFAULT '1.0'
    `);

    // Format existing records as semantic version (add .0 to make it 1.0, 2.0, etc)
    await queryInterface.sequelize.query(`
      UPDATE "PsychologyTestTypes" 
      SET version = CONCAT(version, '.0') 
      WHERE version IS NOT NULL AND version !~ '\\.'
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Extract major version number and convert back to INTEGER
    await queryInterface.sequelize.query(`
      ALTER TABLE "PsychologyTestTypes" 
      ALTER COLUMN version TYPE INTEGER USING SPLIT_PART(version, '.', 1)::integer,
      ALTER COLUMN version SET DEFAULT 1
    `);
  }
};
