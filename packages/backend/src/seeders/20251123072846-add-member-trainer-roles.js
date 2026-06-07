'use strict';

const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Check if Member role exists
    const [memberRoles] = await queryInterface.sequelize.query(
      `SELECT id FROM "Roles" WHERE name = 'Member' LIMIT 1`
    );

    if (memberRoles.length === 0) {
      await queryInterface.bulkInsert('Roles', [{
        id: uuidv4(),
        name: 'Member',
        description: 'Gym member with access to member portal',
        permissions: JSON.stringify({
          memberships: ['read'],
          payments: ['read'],
          checkIns: ['read', 'create']
        }),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }]);
      console.log('✅ Member role created');
    } else {
      console.log('ℹ️  Member role already exists');
    }

    // Check if Trainer role exists
    const [trainerRoles] = await queryInterface.sequelize.query(
      `SELECT id FROM "Roles" WHERE name = 'Trainer' LIMIT 1`
    );

    if (trainerRoles.length === 0) {
      await queryInterface.bulkInsert('Roles', [{
        id: uuidv4(),
        name: 'Trainer',
        description: 'Gym trainer/instructor with access to class management and commission tracking',
        permissions: JSON.stringify({
          classes: ['read', 'update'],
          members: ['read'],
          commissions: ['read']
        }),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }]);
      console.log('✅ Trainer role created');
    } else {
      console.log('ℹ️  Trainer role already exists');
    }
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Roles', {
      name: { [Sequelize.Op.in]: ['Member', 'Trainer'] }
    }, {});
  }
};
