'use strict';

const { v4: uuidv4 } = require('uuid');

// Fixed UUIDs for members (will be used by transactions seeder)
const memberIds = [
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555',
  '66666666-6666-6666-6666-666666666666',
  '77777777-7777-7777-7777-777777777777',
  '88888888-8888-8888-8888-888888888888',
  '99999999-9999-9999-9999-999999999999',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  '10101010-1010-1010-1010-101010101010',
  '20202020-2020-2020-2020-202020202020',
  '30303030-3030-3030-3030-303030303030',
  '40404040-4040-4040-4040-404040404040',
  '50505050-5050-5050-5050-505050505050'
];

const firstNames = ['John', 'Jane', 'Mike', 'Sarah', 'David', 'Emma', 'Chris', 'Lisa', 'Tom', 'Anna', 'Robert', 'Maria', 'James', 'Linda', 'Michael', 'Patricia', 'William', 'Jennifer', 'Richard', 'Elizabeth'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];

module.exports = {
  async up (queryInterface) {
    // Get first tenant ID
    const tenants = await queryInterface.sequelize.query(
      `SELECT id FROM "Tenants" LIMIT 1;`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (tenants.length === 0) {
      throw new Error('No tenant found. Please run tenant seeder first.');
    }

    const tenantId = tenants[0].id;
    const now = new Date();

    const members = memberIds.map((id, index) => ({
      id,
      tenantId,
      firstName: firstNames[index],
      lastName: lastNames[index],
      email: 'member' + (index + 1) + '@example.com',
      phone: '0812345' + String(index + 1).padStart(5, '0'),
      dateOfBirth: new Date(1990 + (index % 20), index % 12, (index % 28) + 1),
      gender: index % 3 === 0 ? 'male' : index % 3 === 1 ? 'female' : 'other',
      address: (index + 1) + ' Main Street, City',
      membershipStatus: 'active',
      joinDate: new Date(now.getTime() - (index * 7 * 24 * 60 * 60 * 1000)), // Staggered registration
      emergencyContactName: 'Emergency Contact ' + (index + 1),
      emergencyContactPhone: '0898765' + String(index + 1).padStart(5, '0'),
      notes: 'Demo member ' + (index + 1),
      createdAt: now,
      updatedAt: now
    }));

    await queryInterface.bulkInsert('Members', members, {});
  },

  async down (queryInterface) {
    await queryInterface.bulkDelete('Members', {
      id: memberIds
    }, {});
  }
};
