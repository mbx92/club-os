'use strict';

/**
 * Migration: Extend Products table with JSONB support for POS/Restaurant
 * 
 * Dependencies: 
 * - ProductCategories table (20251126000001)
 * - Locations table (20251126000002)
 * 
 * Changes:
 * 1. Add productDetails JSONB field for flexible product data
 * 2. Add categoryId FK to ProductCategories
 * 3. Add locationId FK to Locations
 * 4. Add taxable boolean flag
 * 5. Add version field for optimistic locking
 * 6. Rename stock fields for clarity
 * 7. Create GIN indexes for JSONB performance
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // 1. Check and alter productDetails from JSON to JSONB if needed
      const tableDescription = await queryInterface.describeTable('Products');
      
      if (tableDescription.productDetails) {
        // Column exists - alter type from JSON to JSONB
        await queryInterface.sequelize.query(
          'ALTER TABLE "Products" ALTER COLUMN "productDetails" TYPE JSONB USING "productDetails"::jsonb;',
          { transaction }
        );
        console.log('✅ Altered productDetails column from JSON to JSONB');
      } else {
        // Column doesn't exist - add it
        await queryInterface.addColumn('Products', 'productDetails', {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: {},
          comment: 'JSONB field for flexible product data (variants, options, ingredients, etc.)'
        }, { transaction });
        console.log('✅ Added productDetails JSONB column');
      }

      // 2. Add categoryId if not exists
      if (!tableDescription.categoryId) {
        await queryInterface.addColumn('Products', 'categoryId', {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'ProductCategories',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
          comment: 'Foreign key to ProductCategories table'
        }, { transaction });
        console.log('✅ Added categoryId column');
      }

      // 3. Add locationId if not exists
      if (!tableDescription.locationId) {
        await queryInterface.addColumn('Products', 'locationId', {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'Locations',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
          comment: 'Foreign key to Locations table for multi-location support'
        }, { transaction });
        console.log('✅ Added locationId column');
      }

      // 4. Add taxable if not exists
      if (!tableDescription.taxable) {
        await queryInterface.addColumn('Products', 'taxable', {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          comment: 'Whether this product is subject to tax'
        }, { transaction });
        console.log('✅ Added taxable column');
      }

      // 5. Add version if not exists
      if (!tableDescription.version) {
        await queryInterface.addColumn('Products', 'version', {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
          comment: 'Optimistic locking version field'
        }, { transaction });
        console.log('✅ Added version column');
      }

      // 6. Rename columns for clarity (check if old names exist)
      if (tableDescription.stock && !tableDescription.stockQuantity) {
        await queryInterface.renameColumn('Products', 'stock', 'stockQuantity', { transaction });
        console.log('✅ Renamed stock to stockQuantity');
      }
      
      if (tableDescription.minStock && !tableDescription.minStockLevel) {
        await queryInterface.renameColumn('Products', 'minStock', 'minStockLevel', { transaction });
        console.log('✅ Renamed minStock to minStockLevel');
      }
      
      if (tableDescription.isTrackStock && !tableDescription.trackInventory) {
        await queryInterface.renameColumn('Products', 'isTrackStock', 'trackInventory', { transaction });
        console.log('✅ Renamed isTrackStock to trackInventory');
      }

      // 3. Create indexes
      
      // GIN index on entire productDetails JSONB field
      await queryInterface.sequelize.query(
        'CREATE INDEX IF NOT EXISTS idx_products_product_details ON "Products" USING GIN ("productDetails");',
        { transaction }
      );

      // B-tree index on productDetails.productType path (text values need B-tree or gin_trgm_ops)
      await queryInterface.sequelize.query(
        'CREATE INDEX IF NOT EXISTS idx_products_product_type ON "Products" (("productDetails"->>\'productType\'));',
        { transaction }
      );

      // B-tree index on productDetails.isAvailable path
      await queryInterface.sequelize.query(
        'CREATE INDEX IF NOT EXISTS idx_products_is_available ON "Products" ((("productDetails"->>\'isAvailable\')::boolean));',
        { transaction }
      );

      // B-tree indexes for FK columns
      await queryInterface.addIndex('Products', ['categoryId'], {
        name: 'idx_products_category_id',
        transaction
      });

      await queryInterface.addIndex('Products', ['locationId'], {
        name: 'idx_products_location_id',
        transaction
      });

      // Composite index for common queries
      await queryInterface.addIndex('Products', ['tenantId', 'categoryId', 'isActive'], {
        name: 'idx_products_tenant_category_active',
        transaction
      });

      await queryInterface.addIndex('Products', ['tenantId', 'locationId', 'trackInventory'], {
        name: 'idx_products_tenant_location_inventory',
        transaction
      });

      // Version field index for optimistic locking
      await queryInterface.addIndex('Products', ['id', 'version'], {
        name: 'idx_products_id_version',
        transaction
      });

      await transaction.commit();
      console.log('✅ Products table extended with JSONB support');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration failed:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      const tableDescription = await queryInterface.describeTable('Products');
      
      // Drop indexes (with IF EXISTS check)
      await queryInterface.sequelize.query(
        'DROP INDEX IF EXISTS idx_products_id_version;',
        { transaction }
      );
      await queryInterface.sequelize.query(
        'DROP INDEX IF EXISTS idx_products_tenant_location_inventory;',
        { transaction }
      );
      await queryInterface.sequelize.query(
        'DROP INDEX IF EXISTS idx_products_tenant_category_active;',
        { transaction }
      );
      await queryInterface.sequelize.query(
        'DROP INDEX IF EXISTS idx_products_location_id;',
        { transaction }
      );
      await queryInterface.sequelize.query(
        'DROP INDEX IF EXISTS idx_products_category_id;',
        { transaction }
      );
      await queryInterface.sequelize.query(
        'DROP INDEX IF EXISTS idx_products_is_available;',
        { transaction }
      );
      await queryInterface.sequelize.query(
        'DROP INDEX IF EXISTS idx_products_product_type;',
        { transaction }
      );
      await queryInterface.sequelize.query(
        'DROP INDEX IF EXISTS idx_products_product_details;',
        { transaction }
      );

      // Rename columns back (if renamed versions exist)
      if (tableDescription.trackInventory && !tableDescription.isTrackStock) {
        await queryInterface.renameColumn('Products', 'trackInventory', 'isTrackStock', { transaction });
      }
      if (tableDescription.minStockLevel && !tableDescription.minStock) {
        await queryInterface.renameColumn('Products', 'minStockLevel', 'minStock', { transaction });
      }
      if (tableDescription.stockQuantity && !tableDescription.stock) {
        await queryInterface.renameColumn('Products', 'stockQuantity', 'stock', { transaction });
      }

      // Remove columns (if they exist)
      if (tableDescription.version) {
        await queryInterface.removeColumn('Products', 'version', { transaction });
      }
      if (tableDescription.taxable) {
        await queryInterface.removeColumn('Products', 'taxable', { transaction });
      }
      if (tableDescription.locationId) {
        await queryInterface.removeColumn('Products', 'locationId', { transaction });
      }
      if (tableDescription.categoryId) {
        await queryInterface.removeColumn('Products', 'categoryId', { transaction });
      }
      
      // Revert productDetails from JSONB back to JSON
      if (tableDescription.productDetails) {
        await queryInterface.sequelize.query(
          'ALTER TABLE "Products" ALTER COLUMN "productDetails" TYPE JSON USING "productDetails"::json;',
          { transaction }
        );
      }

      await transaction.commit();
      console.log('✅ Products table reverted to original state');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }
};
