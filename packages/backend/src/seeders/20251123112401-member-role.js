'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if Member role already exists
    const [roles] = await queryInterface.sequelize.query(
      "SELECT id FROM \"Roles\" WHERE name = 'Member' LIMIT 1"
    );

    if (roles.length === 0) {
      await queryInterface.bulkInsert('Roles', [{
        id: uuidv4(),
        name: 'Member',
        description: 'Gym member with limited access to their own data',
        permissions: JSON.stringify({
          rules: [
            // Members can view their own profile and memberships
            { subject: 'Member', actions: ['read'], conditions: { tenantId: '$tenantId', userId: '$userId' } },
            { subject: 'Membership', actions: ['read'], conditions: { tenantId: '$tenantId', memberId: '$userId' } },
            { subject: 'CheckIn', actions: ['read', 'create'], conditions: { tenantId: '$tenantId', memberId: '$userId' } },
            { subject: 'ClassSchedule', actions: ['read'], conditions: { tenantId: '$tenantId' } },
            { subject: 'ClassEnrollment', actions: ['read', 'create', 'update'], conditions: { tenantId: '$tenantId', memberId: '$userId' } },
          ],
          uiFlags: {
            canViewOwnProfile: true,
            canBookClasses: true,
          },
          menuAccess: ['dashboard', 'classes', 'profile'],
        }),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }]);
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Roles', {
      name: 'Member'
    }, {});
  }
};
