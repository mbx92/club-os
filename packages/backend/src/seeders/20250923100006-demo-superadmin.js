'use strict';

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');

module.exports = {
  async up (queryInterface) {
    const passwordHash = await bcrypt.hash('superadmin123', 10);

    // Get admin role
    const roles = await queryInterface.sequelize.query(
      `SELECT id, name FROM "Roles";`
    );
    const adminRole = roles[0].find(r => r.name === 'admin');

    await queryInterface.bulkInsert('Users', [
      {
        id: uuidv4(),
        tenantId: null, // Superadmin has no tenant
        email: 'superadmin@gym-system.com',
        password: passwordHash,
        firstName: 'Super',
        lastName: 'Admin',
        phone: '+1111111111',
        isSuperAdmin: true,
        roleId: adminRole.id,
        isActive: true,
        lastLogin: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  async down (queryInterface) {
    await queryInterface.bulkDelete('Users', {
      email: 'superadmin@gym-system.com'
    });
  }
};