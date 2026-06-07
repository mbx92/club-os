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
      console.log('No tenants found. Skipping expenses seeder.');
      return;
    }

    const expenses = [];
    let expenseCounter = 1;

    for (const tenant of tenants) {
      // Get categories for this tenant
      const categories = await queryInterface.sequelize.query(
        `SELECT id, name, type FROM "ExpenseCategories" WHERE "tenantId" = '${tenant.id}';`,
        { type: Sequelize.QueryTypes.SELECT }
      );

      if (categories.length === 0) {
        console.log(`No categories found for tenant ${tenant.id}. Skipping.`);
        continue;
      }

      // Get locations for this tenant
      const locations = await queryInterface.sequelize.query(
        `SELECT id FROM "Locations" WHERE "tenantId" = '${tenant.id}' LIMIT 1;`,
        { type: Sequelize.QueryTypes.SELECT }
      );

      const locationId = locations.length > 0 ? locations[0].id : null;

      // Get users for this tenant (for createdBy and approvedBy)
      const users = await queryInterface.sequelize.query(
        `SELECT id FROM "Users" WHERE "tenantId" = '${tenant.id}' LIMIT 2;`,
        { type: Sequelize.QueryTypes.SELECT }
      );

      const createdBy = users.length > 0 ? users[0].id : null;
      const approvedBy = users.length > 1 ? users[1].id : (users.length > 0 ? users[0].id : null);

      // Generate expenses for last 6 months
      const now = new Date();
      const expenseTemplates = [
        // FIXED EXPENSES (monthly recurring)
        {
          categoryName: 'Salaries & Wages',
          title: 'Monthly Staff Salaries',
          baseAmount: 45000000,
          isRecurring: true,
          recurringFrequency: 'monthly',
          paymentMethod: 'transfer',
          vendor: 'HR Department',
          monthlyCount: 6 // Last 6 months
        },
        {
          categoryName: 'Rent & Lease',
          title: 'Office Rent',
          baseAmount: 15000000,
          isRecurring: true,
          recurringFrequency: 'monthly',
          paymentMethod: 'transfer',
          vendor: 'Property Management Co.',
          monthlyCount: 6
        },
        {
          categoryName: 'Insurance',
          title: 'Business Insurance Premium',
          baseAmount: 5000000,
          isRecurring: true,
          recurringFrequency: 'monthly',
          paymentMethod: 'transfer',
          vendor: 'ABC Insurance',
          monthlyCount: 6
        },

        // OPERATIONAL EXPENSES (frequent)
        {
          categoryName: 'Utilities',
          title: 'Electricity Bill',
          baseAmount: 3500000,
          variance: 500000,
          isRecurring: true,
          recurringFrequency: 'monthly',
          paymentMethod: 'transfer',
          vendor: 'PLN',
          monthlyCount: 6
        },
        {
          categoryName: 'Utilities',
          title: 'Water Bill',
          baseAmount: 800000,
          variance: 200000,
          isRecurring: true,
          recurringFrequency: 'monthly',
          paymentMethod: 'transfer',
          vendor: 'PDAM',
          monthlyCount: 6
        },
        {
          categoryName: 'Utilities',
          title: 'Internet & Phone',
          baseAmount: 1200000,
          isRecurring: true,
          recurringFrequency: 'monthly',
          paymentMethod: 'debit_card',
          vendor: 'Telkom',
          monthlyCount: 6
        },
        {
          categoryName: 'Cleaning & Sanitation',
          title: 'Cleaning Supplies',
          baseAmount: 1500000,
          variance: 500000,
          isRecurring: true,
          recurringFrequency: 'monthly',
          paymentMethod: 'cash',
          vendor: 'Cleaning Services Co.',
          monthlyCount: 6
        },
        {
          categoryName: 'Office Supplies',
          title: 'Office Stationery',
          baseAmount: 800000,
          variance: 300000,
          paymentMethod: 'cash',
          vendor: 'Office Mart',
          monthlyCount: 6
        },
        {
          categoryName: 'Food & Beverage Supplies',
          title: 'Restaurant Ingredients',
          baseAmount: 8000000,
          variance: 2000000,
          paymentMethod: 'transfer',
          vendor: 'Fresh Market Supply',
          monthlyCount: 6
        },

        // VARIABLE EXPENSES
        {
          categoryName: 'Marketing & Advertising',
          title: 'Social Media Advertising',
          baseAmount: 2500000,
          variance: 1000000,
          paymentMethod: 'credit_card',
          vendor: 'Meta Ads',
          monthlyCount: 5
        },
        {
          categoryName: 'Marketing & Advertising',
          title: 'Promotional Materials',
          baseAmount: 1500000,
          variance: 500000,
          paymentMethod: 'transfer',
          vendor: 'Printing House',
          monthlyCount: 3
        },
        {
          categoryName: 'Equipment Maintenance',
          title: 'Gym Equipment Service',
          baseAmount: 3000000,
          variance: 1000000,
          paymentMethod: 'transfer',
          vendor: 'Fitness Tech Service',
          monthlyCount: 4
        },
        {
          categoryName: 'Transportation',
          title: 'Fuel & Vehicle Maintenance',
          baseAmount: 2000000,
          variance: 500000,
          paymentMethod: 'cash',
          vendor: 'Pertamina',
          monthlyCount: 6
        },
        {
          categoryName: 'Training & Development',
          title: 'Staff Training Workshop',
          baseAmount: 5000000,
          variance: 2000000,
          paymentMethod: 'transfer',
          vendor: 'Training Center',
          monthlyCount: 2
        },
        {
          categoryName: 'Professional Fees',
          title: 'Accounting Services',
          baseAmount: 3000000,
          paymentMethod: 'transfer',
          vendor: 'XYZ Accounting',
          monthlyCount: 6
        },

        // ONE-TIME EXPENSES
        {
          categoryName: 'Miscellaneous',
          title: 'Emergency Repair',
          baseAmount: 4500000,
          paymentMethod: 'cash',
          vendor: 'Quick Fix Repair',
          monthlyCount: 1
        },
        {
          categoryName: 'Equipment Maintenance',
          title: 'HVAC System Repair',
          baseAmount: 12000000,
          paymentMethod: 'transfer',
          vendor: 'Cool Air Services',
          monthlyCount: 1
        }
      ];

      // Generate expenses
      for (const template of expenseTemplates) {
        const category = categories.find(c => c.name === template.categoryName);
        if (!category) continue;

        const monthsToGenerate = template.monthlyCount || 1;

        for (let monthOffset = 0; monthOffset < monthsToGenerate; monthOffset++) {
          const expenseDate = new Date(now);
          expenseDate.setMonth(expenseDate.getMonth() - monthOffset);
          expenseDate.setDate(Math.floor(Math.random() * 20) + 1); // Random day 1-20

          const dueDate = new Date(expenseDate);
          dueDate.setDate(expenseDate.getDate() + 5); // Due 5 days after expense date

          // Calculate amount with variance
          const variance = template.variance || 0;
          const amount = template.baseAmount + (Math.random() * variance * 2 - variance);
          const taxAmount = amount * 0.0; // No tax for simplicity
          const totalAmount = amount + taxAmount;

          // Determine status based on date
          let status, paidDate = null, approvedAt = null;
          const daysSinceExpense = Math.floor((now - expenseDate) / (1000 * 60 * 60 * 24));

          if (daysSinceExpense > 10) {
            status = 'paid';
            paidDate = new Date(expenseDate);
            paidDate.setDate(paidDate.getDate() + Math.floor(Math.random() * 7) + 1);
            approvedAt = new Date(expenseDate);
            approvedAt.setDate(approvedAt.getDate() + 1);
          } else if (daysSinceExpense > 5) {
            status = 'approved';
            approvedAt = new Date(expenseDate);
            approvedAt.setDate(approvedAt.getDate() + 1);
          } else if (daysSinceExpense > 2) {
            status = 'pending';
          } else {
            status = 'draft';
          }

          const expenseNumber = `EXP-${expenseDate.getFullYear()}-${String(expenseCounter).padStart(6, '0')}`;
          expenseCounter++;

          expenses.push({
            id: uuidv4(),
            tenantId: tenant.id,
            locationId: locationId,
            categoryId: category.id,
            expenseNumber: expenseNumber,
            title: template.title,
            description: `${template.title} for ${expenseDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
            amount: Math.round(amount),
            taxAmount: Math.round(taxAmount),
            totalAmount: Math.round(totalAmount),
            expenseDate: expenseDate,
            dueDate: dueDate,
            paidDate: paidDate,
            paymentMethod: template.paymentMethod,
            referenceNumber: status === 'paid' ? `REF-${expenseNumber}` : null,
            vendor: template.vendor,
            status: status,
            isRecurring: template.isRecurring || false,
            recurringFrequency: template.recurringFrequency || null,
            recurringEndDate: template.isRecurring ? new Date(now.getFullYear() + 1, 11, 31) : null,
            attachments: JSON.stringify([]),
            notes: null,
            tags: `{${category.type},${template.categoryName.toLowerCase().replace(/[^a-z]/g, '-')}}`,
            createdBy: createdBy,
            approvedBy: status === 'approved' || status === 'paid' ? approvedBy : null,
            approvedAt: approvedAt,
            version: 1,
            createdAt: expenseDate,
            updatedAt: paidDate || approvedAt || expenseDate
          });
        }
      }
    }

    if (expenses.length > 0) {
      await queryInterface.bulkInsert('Expenses', expenses, {});
      console.log(`✅ Created ${expenses.length} expenses for ${tenants.length} tenant(s)`);
      
      // Summary by status
      const summary = expenses.reduce((acc, exp) => {
        acc[exp.status] = (acc[exp.status] || 0) + 1;
        acc.totalAmount = (acc.totalAmount || 0) + exp.totalAmount;
        return acc;
      }, {});
      
      console.log('\n📊 Expense Summary:');
      console.log(`   Total Amount: Rp ${summary.totalAmount.toLocaleString('id-ID')}`);
      console.log(`   Draft: ${summary.draft || 0}`);
      console.log(`   Pending: ${summary.pending || 0}`);
      console.log(`   Approved: ${summary.approved || 0}`);
      console.log(`   Paid: ${summary.paid || 0}`);
    } else {
      console.log('⚠️  No expenses created. Check if categories exist.');
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Expenses', null, {});
  }
};
