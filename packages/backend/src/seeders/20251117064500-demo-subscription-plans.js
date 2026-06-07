'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('SubscriptionPlans', [
      {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Basic',
        description: 'Perfect for small gyms and fitness centers',
        price: 99.99,
        duration: 30,
        maxUsers: 1,
        maxMembers: 50,
        features: JSON.stringify({
          dashboard: true,
          memberManagement: true,
          checkIn: true,
          basicReports: true,
          paymentProcessing: false,
          customBranding: false,
          apiAccess: false
        }),
        isActive: true,
        sortOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        name: 'Professional',
        description: 'Great for growing fitness businesses',
        price: 199.99,
        duration: 30,
        maxUsers: 3,
        maxMembers: 200,
        features: JSON.stringify({
          dashboard: true,
          memberManagement: true,
          checkIn: true,
          basicReports: true,
          advancedReports: true,
          paymentProcessing: true,
          customBranding: false,
          apiAccess: false
        }),
        isActive: true,
        sortOrder: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        name: 'Business',
        description: 'For established fitness chains',
        price: 399.99,
        duration: 30,
        maxUsers: 10,
        maxMembers: 1000,
        features: JSON.stringify({
          dashboard: true,
          memberManagement: true,
          checkIn: true,
          basicReports: true,
          advancedReports: true,
          paymentProcessing: true,
          customBranding: true,
          apiAccess: true,
          prioritySupport: true
        }),
        isActive: true,
        sortOrder: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '44444444-4444-4444-4444-444444444444',
        name: 'Enterprise',
        description: 'For large fitness enterprises',
        price: 799.99,
        duration: 30,
        maxUsers: -1, // Unlimited
        maxMembers: -1, // Unlimited
        features: JSON.stringify({
          dashboard: true,
          memberManagement: true,
          checkIn: true,
          basicReports: true,
          advancedReports: true,
          paymentProcessing: true,
          customBranding: true,
          apiAccess: true,
          prioritySupport: true,
          dedicatedAccountManager: true,
          customIntegration: true
        }),
        isActive: true,
        sortOrder: 4,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('SubscriptionPlans', {
      id: [
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222',
        '33333333-3333-3333-3333-333333333333',
        '44444444-4444-4444-4444-444444444444'
      ]
    }, {});
  }
};