'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Change paymentMethod from ENUM to STRING in TransactionPayments
    await queryInterface.sequelize.query(`
      ALTER TABLE "TransactionPayments" 
      ALTER COLUMN "paymentMethod" TYPE VARCHAR(255) USING "paymentMethod"::text;
    `);

    // Change paymentMethod from ENUM to STRING in Payments
    await queryInterface.sequelize.query(`
      ALTER TABLE "Payments" 
      ALTER COLUMN "paymentMethod" TYPE VARCHAR(255) USING "paymentMethod"::text;
    `);

    // Change paymentMethod from ENUM to STRING in MembershipPayments
    await queryInterface.sequelize.query(`
      ALTER TABLE "MembershipPayments" 
      ALTER COLUMN "paymentMethod" TYPE VARCHAR(255) USING "paymentMethod"::text;
    `);

    // Change refundMethod from ENUM to STRING in MembershipPaymentRefunds
    await queryInterface.sequelize.query(`
      ALTER TABLE "MembershipPaymentRefunds" 
      ALTER COLUMN "refundMethod" TYPE VARCHAR(255) USING "refundMethod"::text;
    `);

    // Drop old ENUM types if they exist
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_TransactionPayments_paymentMethod" CASCADE;
    `);
    
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_Payments_paymentMethod" CASCADE;
    `);
    
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_MembershipPayments_paymentMethod" CASCADE;
    `);
    
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_MembershipPaymentRefunds_refundMethod" CASCADE;
    `);

    console.log('✓ Payment method columns changed from ENUM to STRING');
  },

  async down(queryInterface, Sequelize) {
    // Recreate ENUM types
    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_TransactionPayments_paymentMethod" AS ENUM ('cash', 'credit_card', 'debit_card', 'bank_transfer', 'e_wallet', 'other');
    `);

    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_Payments_paymentMethod" AS ENUM ('cash', 'credit_card', 'debit_card', 'bank_transfer', 'e_wallet', 'other');
    `);

    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_MembershipPayments_paymentMethod" AS ENUM ('cash', 'credit_card', 'debit_card', 'bank_transfer', 'e_wallet', 'other');
    `);

    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_MembershipPaymentRefunds_refundMethod" AS ENUM ('cash', 'credit_card', 'debit_card', 'bank_transfer', 'e_wallet', 'other');
    `);

    // Revert columns to ENUM
    await queryInterface.sequelize.query(`
      ALTER TABLE "TransactionPayments" 
      ALTER COLUMN "paymentMethod" TYPE "enum_TransactionPayments_paymentMethod" USING "paymentMethod"::"enum_TransactionPayments_paymentMethod";
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "Payments" 
      ALTER COLUMN "paymentMethod" TYPE "enum_Payments_paymentMethod" USING "paymentMethod"::"enum_Payments_paymentMethod";
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "MembershipPayments" 
      ALTER COLUMN "paymentMethod" TYPE "enum_MembershipPayments_paymentMethod" USING "paymentMethod"::"enum_MembershipPayments_paymentMethod";
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "MembershipPaymentRefunds" 
      ALTER COLUMN "refundMethod" TYPE "enum_MembershipPaymentRefunds_refundMethod" USING "refundMethod"::"enum_MembershipPaymentRefunds_refundMethod";
    `);

    console.log('✓ Payment method columns reverted to ENUM');
  }
};
