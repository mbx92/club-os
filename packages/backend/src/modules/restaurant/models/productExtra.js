'use strict';

/**
 * ProductExtra Model - Restaurant Module
 * 
 * Represents customizable extras/additions for products.
 * Allows products like "Nasi Goreng" to have options like "Extra Telur +5000".
 * 
 * @module modules/restaurant/models/productExtra
 */

module.exports = (sequelize, DataTypes) => {
  const ProductExtra = sequelize.define('ProductExtra', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    tenantId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Tenants',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Products',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Name of the extra (e.g., "Extra Telur", "Extra Sambal")'
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Additional price for this extra'
    },
    inputType: {
      type: DataTypes.ENUM('radio', 'checkbox', 'select'),
      allowNull: false,
      defaultValue: 'checkbox',
      comment: 'UI input type for selecting this extra'
    },
    groupName: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Group name for organizing extras (e.g., "Toppings", "Protein", "Spice Level")'
    },
    isRequired: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether customer must select this extra'
    },
    isMultiple: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether multiple selections are allowed in this group'
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Display order of extras'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    }
  }, {
    tableName: 'ProductExtras',
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        fields: ['tenantId']
      },
      {
        fields: ['productId']
      },
      {
        fields: ['tenantId', 'productId', 'isActive']
      },
      {
        fields: ['groupName']
      },
      {
        fields: ['sortOrder']
      }
    ]
  });

  ProductExtra.associate = function(models) {
    // Tenant association
    ProductExtra.belongsTo(models.Tenant, {
      foreignKey: 'tenantId',
      as: 'tenant'
    });

    // Product association
    ProductExtra.belongsTo(models.Product, {
      foreignKey: 'productId',
      as: 'product'
    });

    // Audit trail
    ProductExtra.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });

    ProductExtra.belongsTo(models.User, {
      foreignKey: 'updatedBy',
      as: 'updater'
    });
  };

  /**
   * Instance method: Format extra for display
   */
  ProductExtra.prototype.formatForDisplay = function() {
    return {
      id: this.id,
      name: this.name,
      price: parseFloat(this.price),
      priceFormatted: `+${parseFloat(this.price).toLocaleString('id-ID')}`,
      inputType: this.inputType,
      groupName: this.groupName,
      isRequired: this.isRequired,
      isMultiple: this.isMultiple,
      sortOrder: this.sortOrder,
      isActive: this.isActive
    };
  };

  /**
   * Static method: Get extras grouped by groupName
   */
  ProductExtra.getGroupedExtras = async function(productId, tenantId) {
    const extras = await this.findAll({
      where: {
        productId,
        tenantId,
        isActive: true
      },
      order: [
        ['groupName', 'ASC'],
        ['sortOrder', 'ASC'],
        ['name', 'ASC']
      ]
    });

    // Group by groupName
    const grouped = extras.reduce((acc, extra) => {
      const group = extra.groupName || 'Default';
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push(extra.formatForDisplay());
      return acc;
    }, {});

    return grouped;
  };

  /**
   * Static method: Validate selected extras
   */
  ProductExtra.validateSelection = async function(productId, tenantId, selectedExtras = []) {
    const allExtras = await this.findAll({
      where: {
        productId,
        tenantId,
        isActive: true
      }
    });

    // Check required extras
    const requiredGroups = {};
    allExtras.forEach(extra => {
      if (extra.isRequired && extra.groupName) {
        requiredGroups[extra.groupName] = true;
      }
    });

    // Validate selected extras exist
    const selectedIds = selectedExtras.map(e => e.id);
    const validExtras = allExtras.filter(e => selectedIds.includes(e.id));

    // Check if all required groups are satisfied
    const selectedGroups = {};
    validExtras.forEach(extra => {
      if (extra.groupName) {
        selectedGroups[extra.groupName] = true;
      }
    });

    const missingGroups = Object.keys(requiredGroups).filter(
      group => !selectedGroups[group]
    );

    if (missingGroups.length > 0) {
      throw new Error(`Required extras missing: ${missingGroups.join(', ')}`);
    }

    return validExtras;
  };

  /**
   * Static method: Calculate total extras price
   */
  ProductExtra.calculateTotalPrice = function(extras) {
    return extras.reduce((total, extra) => {
      const quantity = extra.quantity || 1;
      return total + (parseFloat(extra.price) * quantity);
    }, 0);
  };

  return ProductExtra;
};
