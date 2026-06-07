'use strict';
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Get default tenant
    const [tenants] = await queryInterface.sequelize.query(
      `SELECT id FROM "Tenants" ORDER BY "createdAt" ASC LIMIT 1`
    );

    if (tenants.length === 0) {
      console.log('No tenant found. Skipping CFIT norms seeding.');
      return;
    }

    const tenantId = tenants[0].id;
    const now = new Date();

    // Load CFIT norms data from JSON
    const normsFilePath = path.join(__dirname, '../../docs/soalPsikolog/data/cfit-norms.json');
    const normsData = JSON.parse(fs.readFileSync(normsFilePath, 'utf8'));

    // Check if norms already exist
    const [existing] = await queryInterface.sequelize.query(
      `SELECT COUNT(*) as count FROM "PsychologyNorms" WHERE "tenantId" = :tenantId AND "testTypeCode" = 'CFIT'`,
      { replacements: { tenantId } }
    );

    if (existing[0].count > 0) {
      console.log('CFIT norms already exist. Skipping...');
      return;
    }

    const normsToInsert = [];

    // Process each age group
    Object.entries(normsData.ageGroups).forEach(([ageGroupKey, ageGroupData]) => {
      const { label, ageMonthsStart, ageMonthsEnd, norms } = ageGroupData;

      norms.forEach(norm => {
        normsToInsert.push({
          id: uuidv4(),
          tenantId,
          testTypeCode: 'CFIT',
          ageGroupLabel: ageGroupKey,
          ageMonthsStart,
          ageMonthsEnd,
          rawScore: norm.rawScore,
          convertedScore: norm.iqScore,
          classification: norm.classification,
          createdAt: now,
          updatedAt: now
        });
      });
    });

    if (normsToInsert.length > 0) {
      await queryInterface.bulkInsert('PsychologyNorms', normsToInsert);
      console.log(`✓ Inserted ${normsToInsert.length} CFIT norms for tenant ${tenantId}`);
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('PsychologyNorms', {
      testTypeCode: 'CFIT'
    });
  }
};
