'use strict';

/**
 * Migration: Update SubscriptionPlan features field
 * 
 * Menambahkan comprehensive feature schema untuk subscription plans:
 * - Module access (gym, pos, restaurant, classes, reports)
 * - Limits (maxUsers, maxMembers, maxProducts, dll)
 * - Transaction features (combined billing, installments, vouchers, dll)
 * - Payment features (cash, card, transfer, ewallet, dll)
 * - Printing features (thermal printer, templates, auto-print)
 * - Restaurant features (table management, kitchen display, touchscreen)
 * - Integration features (SMS, WhatsApp, email, payment gateway)
 * - Support features (priority support, dedicated account, customization)
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Get existing plans
    const plans = await queryInterface.sequelize.query(
      'SELECT id, name, features FROM "SubscriptionPlans"',
      { type: Sequelize.QueryTypes.SELECT }
    );

    console.log(`Found ${plans.length} subscription plans to update`);

    for (const plan of plans) {
      let newFeatures = {};
      
      // Determine features based on plan name/tier
      if (plan.name === 'Basic' || plan.name === 'basic') {
        newFeatures = {
          modules: {
            gym: true,
            pos: false,
            restaurant: false,
            classes: false,
            reports: true,
            advancedReports: false
          },
          limits: {
            maxUsers: 3,
            maxMembers: 50,
            maxProducts: 0,
            maxLocations: 1,
            maxPrinters: 0,
            maxTables: 0,
            maxIntegrations: 0
          },
          transactions: {
            combinedBilling: false,
            installments: false,
            vouchers: false,
            loyaltyPoints: false,
            refunds: false
          },
          payments: {
            cash: true,
            creditCard: false,
            bankTransfer: false,
            eWallet: false,
            qris: false,
            paymentGateway: false
          },
          printing: {
            thermalPrinter: false,
            customTemplates: false,
            autoPrint: false,
            logo: false
          },
          restaurant: {
            tableManagement: false,
            kitchenDisplay: false,
            customTableLayout: false,
            touchscreenMode: false
          },
          integrations: {
            sms: false,
            whatsapp: false,
            email: true,
            paymentGateway: false,
            accounting: false
          },
          support: {
            prioritySupport: false,
            dedicatedAccount: false,
            customization: false
          }
        };
      } else if (plan.name === 'Professional' || plan.name === 'professional') {
        newFeatures = {
          modules: {
            gym: true,
            pos: true,
            restaurant: true,
            classes: true,
            reports: true,
            advancedReports: false
          },
          limits: {
            maxUsers: 10,
            maxMembers: 500,
            maxProducts: 0,
            maxLocations: 3,
            maxPrinters: 3,
            maxTables: 20,
            maxIntegrations: 5
          },
          transactions: {
            combinedBilling: true,
            installments: true,
            vouchers: true,
            loyaltyPoints: false,
            refunds: true
          },
          payments: {
            cash: true,
            creditCard: true,
            bankTransfer: true,
            eWallet: true,
            qris: true,
            paymentGateway: true
          },
          printing: {
            thermalPrinter: true,
            customTemplates: false,
            autoPrint: true,
            logo: true
          },
          restaurant: {
            tableManagement: true,
            kitchenDisplay: false,
            customTableLayout: false,
            touchscreenMode: true
          },
          integrations: {
            sms: true,
            whatsapp: false,
            email: true,
            paymentGateway: true,
            accounting: false
          },
          support: {
            prioritySupport: false,
            dedicatedAccount: false,
            customization: false
          }
        };
      } else if (plan.name === 'Enterprise' || plan.name === 'enterprise') {
        newFeatures = {
          modules: {
            gym: true,
            pos: true,
            restaurant: true,
            classes: true,
            reports: true,
            advancedReports: true
          },
          limits: {
            maxUsers: 0,        // 0 = Unlimited
            maxMembers: 0,      // 0 = Unlimited
            maxProducts: 0,     // 0 = Unlimited
            maxLocations: 0,    // 0 = Unlimited
            maxPrinters: 0,     // 0 = Unlimited
            maxTables: 0,       // 0 = Unlimited
            maxIntegrations: 0  // 0 = Unlimited
          },
          transactions: {
            combinedBilling: true,
            installments: true,
            vouchers: true,
            loyaltyPoints: true,
            refunds: true
          },
          payments: {
            cash: true,
            creditCard: true,
            bankTransfer: true,
            eWallet: true,
            qris: true,
            paymentGateway: true
          },
          printing: {
            thermalPrinter: true,
            customTemplates: true,
            autoPrint: true,
            logo: true
          },
          restaurant: {
            tableManagement: true,
            kitchenDisplay: true,
            customTableLayout: true,
            touchscreenMode: true
          },
          integrations: {
            sms: true,
            whatsapp: true,
            email: true,
            paymentGateway: true,
            accounting: true
          },
          support: {
            prioritySupport: true,
            dedicatedAccount: true,
            customization: true
          }
        };
      } else {
        // Default/unknown plan: same as Basic
        console.log(`Unknown plan name: ${plan.name}, using Basic features`);
        newFeatures = {
          modules: {
            gym: true,
            pos: false,
            restaurant: false,
            classes: false,
            reports: true,
            advancedReports: false
          },
          limits: {
            maxUsers: 5,
            maxMembers: 100,
            maxProducts: 0,
            maxLocations: 1,
            maxPrinters: 0,
            maxTables: 0,
            maxIntegrations: 0
          },
          transactions: {
            combinedBilling: false,
            installments: false,
            vouchers: false,
            loyaltyPoints: false,
            refunds: false
          },
          payments: {
            cash: true,
            creditCard: false,
            bankTransfer: false,
            eWallet: false,
            qris: false,
            paymentGateway: false
          },
          printing: {
            thermalPrinter: false,
            customTemplates: false,
            autoPrint: false,
            logo: false
          },
          restaurant: {
            tableManagement: false,
            kitchenDisplay: false,
            customTableLayout: false,
            touchscreenMode: false
          },
          integrations: {
            sms: false,
            whatsapp: false,
            email: true,
            paymentGateway: false,
            accounting: false
          },
          support: {
            prioritySupport: false,
            dedicatedAccount: false,
            customization: false
          }
        };
      }

      // Update plan with new features
      await queryInterface.sequelize.query(
        'UPDATE "SubscriptionPlans" SET features = :features, "updatedAt" = NOW() WHERE id = :id',
        {
          replacements: { 
            features: JSON.stringify(newFeatures), 
            id: plan.id 
          }
        }
      );

      console.log(`✓ Updated plan: ${plan.name} (${plan.id})`);
    }

    console.log('Migration completed successfully');
  },

  down: async (queryInterface, Sequelize) => {
    // Rollback to simple features structure
    console.log('Rolling back subscription plan features...');
    
    await queryInterface.sequelize.query(
      `UPDATE "SubscriptionPlans" 
       SET features = '{"maxUsers": 5, "maxMembers": 100}'::jsonb, 
           "updatedAt" = NOW()`
    );

    console.log('Rollback completed');
  }
};
