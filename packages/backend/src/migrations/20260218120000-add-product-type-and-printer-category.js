'use strict';

/**
 * Migration: Add productType to Products and printerCategory to PrinterSettings
 * 
 * Features:
 * - Add productType field to Products for kitchen/bar routing (food/beverage/other)
 * - Add printerCategory field to PrinterSettings for printer routing (all/food/beverage)
 * 
 * @migration 20260218120000-add-product-type-and-printer-category
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('Adding productType to Products and printerCategory to PrinterSettings...');

    // 1. Check if productType already exists in Products
    const productsColumns = await queryInterface.describeTable('Products');

    if (!productsColumns.productType) {
      console.log('Adding productType to Products...');

      await queryInterface.addColumn('Products', 'productType', {
        type: Sequelize.ENUM('food', 'beverage', 'other'),
        allowNull: false,
        defaultValue: 'food',
        comment: 'Product type for kitchen/bar routing: food → kitchen, beverage → bar'
      });

      // Add index for productType (idempotent)
      try {
        await queryInterface.addIndex('Products', ['productType'], {
          name: 'idx_products_product_type'
        });
      } catch (e) {
        console.log('⚠️  Index idx_products_product_type already exists, skipping...');
      }

      console.log('✅ Added productType to Products');
    } else {
      console.log('⚠️  productType already exists in Products, skipping...');
    }

    // 2. Check if printerCategory already exists in PrinterSettings
    const printerColumns = await queryInterface.describeTable('PrinterSettings');

    if (!printerColumns.printerCategory) {
      console.log('Adding printerCategory to PrinterSettings...');

      // First, create the ENUM type if it doesn't exist
      try {
        await queryInterface.sequelize.query(
          `CREATE TYPE "enum_PrinterSettings_printerCategory" AS ENUM ('all', 'food', 'beverage')`
        );
      } catch (e) {
        // Type already exists, ignore
        console.log('⚠️  ENUM type already exists, skipping...');
      }

      // Then add the column using the existing ENUM type
      await queryInterface.sequelize.query(`
        ALTER TABLE "PrinterSettings" 
        ADD COLUMN "printerCategory" "enum_PrinterSettings_printerCategory" NOT NULL DEFAULT 'all'
      `);

      // Add comment separately
      await queryInterface.sequelize.query(`
        COMMENT ON COLUMN "PrinterSettings"."printerCategory" IS 'What product categories this printer handles (all, food, beverage)'
      `);

      // Add index for printerCategory (idempotent)
      try {
        await queryInterface.addIndex('PrinterSettings', ['printerCategory'], {
          name: 'idx_printer_settings_category'
        });
      } catch (e) {
        console.log('⚠️  Index idx_printer_settings_category already exists, skipping...');
      }

      console.log('✅ Added printerCategory to PrinterSettings');
    } else {
      console.log('⚠️  printerCategory already exists in PrinterSettings, skipping...');
    }

    // 3. Set default productType for existing products based on category patterns
    try {
      const productsDesc = await queryInterface.describeTable('Products');
      if (productsDesc.category) {
        await queryInterface.sequelize.query(`
          UPDATE "Products" 
          SET "productType" = 'beverage'
          WHERE LOWER("category") SIMILAR TO '%(drink|beverage|coffee|tea|juice|soda|beer|wine|cocktail|smoothie|shake|booster)%'
            AND "productType" = 'food'
        `);
        console.log('✅ Updated existing products with beverage categories');
      } else {
        console.log('⚠️  Products table has no category column, skipping beverage auto-detect');
      }
    } catch (err) {
      console.log('⚠️  Skipping productType auto-detect:', err.message);
    }

    // 4. Set default printerCategory for existing kitchen printers
    try {
      await queryInterface.sequelize.query(`
        UPDATE "PrinterSettings"
        SET "printerCategory" = 'all'
        WHERE "printerType" = 'kitchen' AND "printerCategory" IS NULL
      `);
      console.log('✅ Updated existing kitchen printers to handle all categories');
    } catch (err) {
      console.log('⚠️  Skipping printer update:', err.message);
    }

    console.log('Migration completed successfully!');
  },

  async down(queryInterface, Sequelize) {
    console.log('Rolling back productType and printerCategory...');

    // Remove indexes first
    await queryInterface.removeIndex('Products', 'idx_products_product_type');
    await queryInterface.removeIndex('PrinterSettings', 'idx_printer_settings_category');

    // Remove columns
    await queryInterface.removeColumn('Products', 'productType');
    await queryInterface.removeColumn('PrinterSettings', 'printerCategory');

    // Drop ENUM types
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Products_productType";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_PrinterSettings_printerCategory";');

    console.log('Rollback completed!');
  }
};
