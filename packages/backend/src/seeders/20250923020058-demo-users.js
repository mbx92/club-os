'use strict';

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');

module.exports = {
  async up(queryInterface) {
    const passwordHash = await bcrypt.hash('password123', 10);
    const superadminPasswordHash = await bcrypt.hash('superadmin123', 10);

    // Ambil tenant & role id (asumsi kita punya 2 tenant, 3 role)
    const tenants = await queryInterface.sequelize.query(
      `SELECT id, name FROM "Tenants";`
    );

    const roles = await queryInterface.sequelize.query(
      `SELECT id, name FROM "Roles";`
    );

    const tenantA = tenants[0].find(t => t.name === 'Tenant A');
    const tenantB = tenants[0].find(t => t.name === 'Tenant B');

    const adminRole = roles[0].find(r => r.name === 'admin');
    const managerRole = roles[0].find(r => r.name === 'manager');
    const userRole = roles[0].find(r => r.name === 'user');
    const cashierRole = roles[0].find(r => r.name === 'cashier');

    await queryInterface.bulkInsert('Users', [
      // Admin for Tenant A
      {
        id: uuidv4(),
        tenantId: tenantA.id,
        isSuperAdmin: false,
        email: 'admin@tenant-a.com',
        password: passwordHash,
        firstName: 'Admin',
        lastName: 'User',
        phone: '+1234567890',
        roleId: adminRole.id,
        isActive: true,
        lastLogin: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      // Manager for Tenant A
      {
        id: uuidv4(),
        tenantId: tenantA.id,
        isSuperAdmin: false,
        email: 'manager@tenant-a.com',
        password: passwordHash,
        firstName: 'Manager',
        lastName: 'User',
        phone: '+1234567891',
        roleId: managerRole.id,
        isActive: true,
        lastLogin: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      // Regular user for Tenant A
      {
        id: uuidv4(),
        tenantId: tenantA.id,
        isSuperAdmin: false,
        email: 'user@tenant-a.com',
        password: passwordHash,
        firstName: 'Regular',
        lastName: 'User',
        phone: '+1234567892',
        roleId: userRole.id,
        isActive: true,
        lastLogin: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      // Cashier for Tenant A
      {
        id: uuidv4(),
        tenantId: tenantA.id,
        isSuperAdmin: false,
        email: 'cashier@tenant-a.com',
        password: passwordHash,
        firstName: 'Cashier',
        lastName: 'User',
        phone: '+1234567893',
        roleId: cashierRole.id,
        isActive: true,
        lastLogin: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      // Admin for Tenant B
      {
        id: uuidv4(),
        tenantId: tenantB.id,
        isSuperAdmin: false,
        email: 'admin@tenant-b.com',
        password: passwordHash,
        firstName: 'Admin',
        lastName: 'User',
        phone: '+0987654320',
        roleId: adminRole.id,
        isActive: true,
        lastLogin: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      // Regular user for Tenant B
      {
        id: uuidv4(),
        tenantId: tenantB.id,
        isSuperAdmin: false,
        email: 'user@tenant-b.com',
        password: passwordHash,
        firstName: 'Regular',
        lastName: 'User',
        phone: '+0987654321',
        roleId: userRole.id,
        isActive: true,
        lastLogin: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('Users', null, {});
  }
};
