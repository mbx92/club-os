'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Update Payment table
    await queryInterface.addColumn('Payments', 'subscriptionId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'Subscriptions',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
    
    await queryInterface.addColumn('Payments', 'invoiceId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'Invoices',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
    
    await queryInterface.addColumn('Payments', 'paymentType', {
      type: Sequelize.ENUM('membership', 'subscription', 'other'),
      allowNull: false,
      defaultValue: 'membership'
    });
    
    // Update Tenant table
    await queryInterface.addColumn('Tenants', 'subscriptionId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'Subscriptions',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
    
    await queryInterface.addColumn('Tenants', 'trialEndDate', {
      type: Sequelize.DATE,
      allowNull: true
    });
    
    await queryInterface.addColumn('Tenants', 'isOnTrial', {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove columns from Payment table
    await queryInterface.removeColumn('Payments', 'subscriptionId');
    await queryInterface.removeColumn('Payments', 'invoiceId');
    await queryInterface.removeColumn('Payments', 'paymentType');
    
    // Remove columns from Tenant table
    await queryInterface.removeColumn('Tenants', 'subscriptionId');
    await queryInterface.removeColumn('Tenants', 'trialEndDate');
    await queryInterface.removeColumn('Tenants', 'isOnTrial');
  }
};