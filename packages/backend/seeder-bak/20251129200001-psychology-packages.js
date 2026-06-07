'use strict';

/**
 * Psychology Packages Seeder
 * 
 * Seeds sample packages that bundle multiple test types.
 * Demonstrates the relationship between packages, package items, and test types.
 * 
 * Package structure:
 * - PsychologyPackage: Main package info
 * - PsychologyPackageItem: Links package to test types with sequence
 */

const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    // Get first tenant
    const [tenants] = await queryInterface.sequelize.query(
      `SELECT id, name FROM "Tenants" LIMIT 1`
    );
    
    if (tenants.length === 0) {
      console.log('No tenant found, skipping psychology packages seeder');
      return;
    }
    
    const tenantId = tenants[0].id;

    // Get test types
    const [testTypes] = await queryInterface.sequelize.query(
      `SELECT id, code, name FROM "PsychologyTestTypes" WHERE "tenantId" = :tenantId`,
      { replacements: { tenantId } }
    );

    if (testTypes.length === 0) {
      console.log('No test types found, run test types seeder first');
      return;
    }

    const testTypeMap = {};
    testTypes.forEach(t => {
      testTypeMap[t.code] = t;
    });

    const now = new Date();

    // Check if packages already exist - get full data for linking items
    const [existingPackages] = await queryInterface.sequelize.query(
      `SELECT id, code, name FROM "PsychologyPackages" WHERE "tenantId" = :tenantId`,
      { replacements: { tenantId } }
    );
    
    const existingNames = existingPackages.map(p => p.name);
    const existingPackageMap = {};
    existingPackages.forEach(p => { existingPackageMap[p.code] = p; });

    // Check existing package items
    const existingPackageIds = existingPackages.map(p => p.id);
    let existingItemPackageIds = [];
    if (existingPackageIds.length > 0) {
      const [existingItems] = await queryInterface.sequelize.query(
        `SELECT DISTINCT "packageId" FROM "PsychologyPackageItems" WHERE "packageId" IN (:ids)`,
        { replacements: { ids: existingPackageIds } }
      );
      existingItemPackageIds = existingItems.map(i => i.packageId);
    }

    const packagesToInsert = [];
    const packageItemsToInsert = [];

    // Helper function to add package items
    const addPackageItems = (packageId, items) => {
      items.forEach(item => {
        packageItemsToInsert.push({
          id: uuidv4(),
          packageId,
          testTypeId: item.testTypeId,
          sortOrder: item.sortOrder,
          isRequired: true,
          createdAt: now,
          updatedAt: now
        });
      });
    };

    // Package 1: PAPI Only
    const pkg1Code = 'PKG-PAPI';
    if (!existingNames.includes('Tes Kepribadian PAPI') && testTypeMap['PAPI']) {
      const pkg1Id = uuidv4();
      packagesToInsert.push({
        id: pkg1Id,
        tenantId,
        code: pkg1Code,
        name: 'Tes Kepribadian PAPI',
        description: 'Paket tes PAPI Kostick untuk menilai kepribadian dan gaya kerja',
        packageType: 'single', // single test
        basePrice: 150000,
        finalPrice: 150000,
        estimatedDuration: 30,
        testCount: 1,
        validityDays: 7,
        isActive: true,
        sortOrder: 1,
        metadata: JSON.stringify({
          targetAudience: 'Karyawan, Calon Karyawan',
          recommendedFor: 'Rekrutmen, Pengembangan Karyawan'
        }),
        createdAt: now,
        updatedAt: now
      });
      addPackageItems(pkg1Id, [
        { testTypeId: testTypeMap['PAPI'].id, sortOrder: 1 }
      ]);
    } else if (existingPackageMap[pkg1Code] && !existingItemPackageIds.includes(existingPackageMap[pkg1Code].id) && testTypeMap['PAPI']) {
      // Package exists but items don't - add items
      addPackageItems(existingPackageMap[pkg1Code].id, [
        { testTypeId: testTypeMap['PAPI'].id, sortOrder: 1 }
      ]);
    }

    // Package 2: Full Assessment (PAPI + EPPS)
    const pkg2Code = 'PKG-FULLPERSONAL';
    if (!existingNames.includes('Asesmen Kepribadian Lengkap') && testTypeMap['PAPI'] && testTypeMap['EPPS']) {
      const pkg2Id = uuidv4();
      packagesToInsert.push({
        id: pkg2Id,
        tenantId,
        code: pkg2Code,
        name: 'Asesmen Kepribadian Lengkap',
        description: 'Paket lengkap tes kepribadian mencakup PAPI dan EPPS untuk analisis mendalam',
        packageType: 'bundle', // multiple tests
        basePrice: 350000,
        finalPrice: 350000,
        estimatedDuration: 75,
        testCount: 2,
        validityDays: 14,
        isActive: true,
        sortOrder: 2,
        metadata: JSON.stringify({
          targetAudience: 'Kandidat Level Manajerial',
          recommendedFor: 'Promosi, Assessment Center',
          estimatedTotalDuration: 75 // minutes
        }),
        createdAt: now,
        updatedAt: now
      });
      addPackageItems(pkg2Id, [
        { testTypeId: testTypeMap['PAPI'].id, sortOrder: 1 },
        { testTypeId: testTypeMap['EPPS'].id, sortOrder: 2 }
      ]);
    } else if (existingPackageMap[pkg2Code] && !existingItemPackageIds.includes(existingPackageMap[pkg2Code].id) && testTypeMap['PAPI'] && testTypeMap['EPPS']) {
      addPackageItems(existingPackageMap[pkg2Code].id, [
        { testTypeId: testTypeMap['PAPI'].id, sortOrder: 1 },
        { testTypeId: testTypeMap['EPPS'].id, sortOrder: 2 }
      ]);
    }

    // Package 3: Cognitive + Personality (IST + PAPI)
    const pkg3Code = 'PKG-COGPERSONAL';
    if (!existingNames.includes('Asesmen Kognitif & Kepribadian') && testTypeMap['PAPI'] && testTypeMap['IST']) {
      const pkg3Id = uuidv4();
      packagesToInsert.push({
        id: pkg3Id,
        tenantId,
        code: pkg3Code,
        name: 'Asesmen Kognitif & Kepribadian',
        description: 'Kombinasi tes kecerdasan IST dan kepribadian PAPI',
        packageType: 'bundle',
        basePrice: 500000,
        finalPrice: 500000,
        estimatedDuration: 120,
        testCount: 2,
        validityDays: 14,
        isActive: true,
        sortOrder: 3,
        metadata: JSON.stringify({
          targetAudience: 'Fresh Graduate, Entry Level',
          recommendedFor: 'Rekrutmen Entry Level',
          estimatedTotalDuration: 120
        }),
        createdAt: now,
        updatedAt: now
      });
      addPackageItems(pkg3Id, [
        { testTypeId: testTypeMap['IST'].id, sortOrder: 1 },
        { testTypeId: testTypeMap['PAPI'].id, sortOrder: 2 }
      ]);
    } else if (existingPackageMap[pkg3Code] && !existingItemPackageIds.includes(existingPackageMap[pkg3Code].id) && testTypeMap['PAPI'] && testTypeMap['IST']) {
      addPackageItems(existingPackageMap[pkg3Code].id, [
        { testTypeId: testTypeMap['IST'].id, sortOrder: 1 },
        { testTypeId: testTypeMap['PAPI'].id, sortOrder: 2 }
      ]);
    }

    if (packagesToInsert.length > 0) {
      await queryInterface.bulkInsert('PsychologyPackages', packagesToInsert);
      console.log(`Inserted ${packagesToInsert.length} psychology packages`);
    }

    if (packageItemsToInsert.length > 0) {
      await queryInterface.bulkInsert('PsychologyPackageItems', packageItemsToInsert);
      console.log(`Inserted ${packageItemsToInsert.length} package items`);
    }
  },

  async down(queryInterface, Sequelize) {
    // Delete package items first (foreign key)
    const [packages] = await queryInterface.sequelize.query(
      `SELECT id FROM "PsychologyPackages" WHERE name IN ('Tes Kepribadian PAPI', 'Asesmen Kepribadian Lengkap', 'Asesmen Kognitif & Kepribadian')`
    );
    
    if (packages.length > 0) {
      const packageIds = packages.map(p => p.id);
      await queryInterface.bulkDelete('PsychologyPackageItems', {
        packageId: { [Sequelize.Op.in]: packageIds }
      });
    }

    await queryInterface.bulkDelete('PsychologyPackages', {
      name: { [Sequelize.Op.in]: ['Tes Kepribadian PAPI', 'Asesmen Kepribadian Lengkap', 'Asesmen Kognitif & Kepribadian'] }
    });
  }
};
