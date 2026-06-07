'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    // Get all tenants
    const tenants = await queryInterface.sequelize.query(
      'SELECT id FROM "Tenants";',
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (tenants.length === 0) {
      console.log('No tenants found. Skipping expense categories seeder.');
      return;
    }

    const categories = [
      {
        name: 'Salaries & Wages',
        description: 'Employee salaries, wages, and bonuses',
        type: 'fixed',
        color: '#4CAF50',
        icon: 'people'
      },
      {
        name: 'Utilities',
        description: 'Electricity, water, internet, phone bills',
        type: 'operational',
        color: '#2196F3',
        icon: 'flash'
      },
      {
        name: 'Rent & Lease',
        description: 'Office/gym rent and lease payments',
        type: 'fixed',
        color: '#FF9800',
        icon: 'home'
      },
      {
        name: 'Equipment Maintenance',
        description: 'Gym equipment repair and maintenance',
        type: 'variable',
        color: '#9C27B0',
        icon: 'build'
      },
      {
        name: 'Marketing & Advertising',
        description: 'Social media ads, promotions, marketing materials',
        type: 'variable',
        color: '#E91E63',
        icon: 'megaphone'
      },
      {
        name: 'Office Supplies',
        description: 'Stationery, printing, office materials',
        type: 'operational',
        color: '#795548',
        icon: 'document'
      },
      {
        name: 'Cleaning & Sanitation',
        description: 'Cleaning services, sanitizers, hygiene products',
        type: 'operational',
        color: '#00BCD4',
        icon: 'water'
      },
      {
        name: 'Insurance',
        description: 'Business insurance, liability coverage',
        type: 'fixed',
        color: '#607D8B',
        icon: 'shield'
      },
      {
        name: 'Professional Fees',
        description: 'Accounting, legal, consulting fees',
        type: 'variable',
        color: '#3F51B5',
        icon: 'briefcase'
      },
      {
        name: 'Training & Development',
        description: 'Staff training, certifications, workshops',
        type: 'variable',
        color: '#FF5722',
        icon: 'school'
      },
      {
        name: 'Food & Beverage Supplies',
        description: 'Restaurant ingredients and supplies',
        type: 'operational',
        color: '#8BC34A',
        icon: 'restaurant'
      },
      {
        name: 'Transportation',
        description: 'Fuel, vehicle maintenance, delivery costs',
        type: 'operational',
        color: '#FFC107',
        icon: 'car'
      },
      {
        name: 'Miscellaneous',
        description: 'Other business expenses',
        type: 'one_time',
        color: '#9E9E9E',
        icon: 'ellipsis-horizontal'
      }
    ];

    const now = new Date();
    const expenseCategories = [];

    tenants.forEach(tenant => {
      categories.forEach(category => {
        expenseCategories.push({
          id: uuidv4(),
          tenantId: tenant.id,
          name: category.name,
          description: category.description,
          type: category.type,
          isActive: true,
          color: category.color,
          icon: category.icon,
          createdAt: now,
          updatedAt: now
        });
      });
    });

    await queryInterface.bulkInsert('ExpenseCategories', expenseCategories, {});
    console.log(`✅ Created ${expenseCategories.length} expense categories for ${tenants.length} tenant(s)`);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('ExpenseCategories', null, {});
  }
};
