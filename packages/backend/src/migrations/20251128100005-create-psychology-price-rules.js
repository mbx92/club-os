'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('PsychologyPriceRules', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Rule name (e.g., Promo Tahun Baru 2025)'
      },
      code: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Promo code for promo_code rule type'
      },
      ruleType: {
        type: Sequelize.ENUM('package_discount', 'bulk_discount', 'time_based', 'member_discount', 'promo_code'),
        allowNull: false
      },
      packageId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'PsychologyPackages',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Specific package for package_discount, null = all packages'
      },
      discountType: {
        type: Sequelize.ENUM('percentage', 'fixed'),
        allowNull: false
      },
      discountValue: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false
      },
      minQuantity: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
        comment: 'Minimum quantity for bulk_discount'
      },
      maxUsage: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Maximum times this rule can be used (null = unlimited)'
      },
      usageCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'How many times this rule has been used'
      },
      validFrom: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Start date for time_based rules'
      },
      validUntil: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'End date for time_based rules'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      priority: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Higher priority rules are applied first'
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {},
        comment: 'Additional rule configuration'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Indexes
    await queryInterface.addIndex('PsychologyPriceRules', ['tenantId', 'isActive'], {
      name: 'psychology_price_rules_tenant_active'
    });

    await queryInterface.addIndex('PsychologyPriceRules', ['tenantId', 'code'], {
      unique: true,
      name: 'psychology_price_rules_tenant_code_unique',
      where: {
        code: {
          [Sequelize.Op.ne]: null
        }
      }
    });

    await queryInterface.addIndex('PsychologyPriceRules', ['validFrom', 'validUntil'], {
      name: 'psychology_price_rules_validity'
    });

    await queryInterface.addIndex('PsychologyPriceRules', ['tenantId', 'ruleType'], {
      name: 'psychology_price_rules_type'
    });

    await queryInterface.addIndex('PsychologyPriceRules', ['tenantId', 'priority'], {
      name: 'psychology_price_rules_priority'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('PsychologyPriceRules');
  }
};
