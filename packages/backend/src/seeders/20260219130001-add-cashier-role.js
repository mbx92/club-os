'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface) {
    // Cek apakah role cashier sudah ada
    const [existing] = await queryInterface.sequelize.query(
      `SELECT id FROM "Roles" WHERE name = 'cashier' LIMIT 1`
    );

    if (existing.length > 0) {
      console.log('Role cashier sudah ada, skip insert.');
      return;
    }

    await queryInterface.bulkInsert('Roles', [
      {
        id: uuidv4(),
        name: 'cashier',
        description: 'Kasir — mengelola transaksi, pembayaran, shift kas, dan check-in member',
        permissions: JSON.stringify({
          rules: [
            // Products & Categories (read only)
            { subject: 'Product', actions: ['read'], conditions: { tenantId: '$tenantId' } },
            { subject: 'ProductCategory', actions: ['read'], conditions: { tenantId: '$tenantId' } },
            { subject: 'RestaurantProduct', actions: ['read'], conditions: { tenantId: '$tenantId' } },
            { subject: 'RestaurantCategory', actions: ['read'], conditions: { tenantId: '$tenantId' } },
            
            // Transactions
            { subject: 'Transaction', actions: ['read', 'create', 'update'], conditions: { tenantId: '$tenantId' } },
            { subject: 'Payment', actions: ['read', 'create'], conditions: { tenantId: '$tenantId' } },
            
            // Vouchers (validate usage)
            { subject: 'Voucher', actions: ['read'], conditions: { tenantId: '$tenantId' } },
            
            // Members & Check-ins
            { subject: 'Member', actions: ['read'], conditions: { tenantId: '$tenantId' } },
            { subject: 'CheckIn', actions: ['read', 'create'], conditions: { tenantId: '$tenantId' } },
            { subject: 'Membership', actions: ['read'], conditions: { tenantId: '$tenantId' } },
            
            // Restaurant Tables
            { subject: 'RestaurantTable', actions: ['read', 'update'], conditions: { tenantId: '$tenantId' } },
            
            // Locations
            { subject: 'RestaurantLocation', actions: ['read'], conditions: { tenantId: '$tenantId' } },
            { subject: 'Location', actions: ['read'], conditions: { tenantId: '$tenantId' } },
            
            // Cash Register Sessions
            { subject: 'CashRegisterSession', actions: ['read', 'create', 'update'], conditions: { tenantId: '$tenantId' } },
            
            // Dashboard (read only)
            { subject: 'Dashboard', actions: ['read'], conditions: { tenantId: '$tenantId' } },
            { subject: 'Restaurant', actions: ['read'], conditions: { tenantId: '$tenantId' } },
          ],
          uiFlags: {
            canManageTransactions: true,
            canViewReports: false,
            canManageProducts: false,
          },
          // Store explicit sub-keys — parent-only keys (e.g. "restaurant") expand to ALL children.
          // Must match CASHIER_MENU_ACCESS from utils/menuKeys.js.
          menuAccess: [
            'dashboard',
            'cash-register', 'cash-register.shift', 'cash-register.dashboard', 'cash-register.history', 'cash-register.daily-report', 'cash-register.daily-summary',
            'gym', 'gym.dashboard', 'gym.members', 'gym.instructors', 'gym.classes', 'gym.memberships', 'gym.pt', 'gym.active-services', 'gym.check-ins', 'gym.pos',
            'restaurant', 'restaurant.dashboard', 'restaurant.products', 'restaurant.tables', 'restaurant.floor-plan', 'restaurant.floor-plan-pos', 'restaurant.orders',
            'vouchers',
            'back-office', 'back-office.attendance', 'back-office.devices', 'back-office.employee', 'back-office.schedule',
            'finances', 'finances.expenses', 'finances.petty-cash',
          ],
        }),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    console.log('Role cashier berhasil dibuat.');
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('Roles', { name: 'cashier' }, {});
  },
};
