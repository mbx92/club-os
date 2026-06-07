'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up (queryInterface) {
    await queryInterface.bulkInsert('Roles', [
      {
        id: uuidv4(),
        name: 'admin',
        description: 'Administrator with full access',
        permissions: JSON.stringify({
          tenants: ['read', 'create', 'update', 'delete'],
          users: ['read', 'create', 'update', 'delete'],
          roles: ['read', 'create', 'update', 'delete'],
          members: ['read', 'create', 'update', 'delete'],
          servicePlans: ['read', 'create', 'update', 'delete'],
          activeServices: ['read', 'create', 'update', 'delete'],
          payments: ['read', 'create', 'update', 'delete'],
          checkIns: ['read', 'create', 'update', 'delete']
        }),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        name: 'manager',
        description: 'Manager with limited access',
        permissions: JSON.stringify({
          members: ['read', 'create', 'update', 'delete'],
          servicePlans: ['read', 'create', 'update', 'delete'],
          activeServices: ['read', 'create', 'update', 'delete'],
          payments: ['read', 'create', 'update', 'delete'],
          checkIns: ['read', 'create', 'update', 'delete']
        }),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        name: 'user',
        description: 'Regular user',
        permissions: JSON.stringify({
          activeServices: ['read'],
          payments: ['read'],
          checkIns: ['read', 'create']
        }),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        name: 'Member',
        description: 'Gym member with access to member portal',
        permissions: JSON.stringify({
          activeServices: ['read'],
          payments: ['read'],
          checkIns: ['read', 'create']
        }),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
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
      }
    ]);
  },

  async down (queryInterface) {
    await queryInterface.bulkDelete('Roles', null, {});
  }
};
