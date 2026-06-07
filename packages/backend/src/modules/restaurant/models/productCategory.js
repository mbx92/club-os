'use strict';

/**
 * ProductCategory Model - Restaurant Module
 * 
 * Hierarchical category system for products.
 * Supports parent-child relationships for nested categories.
 * 
 * @module modules/restaurant/models/productCategory
 */

module.exports = (sequelize, DataTypes) => {
  const ProductCategory = sequelize.define('ProductCategory', {
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
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    parentId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'ProductCategories',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Parent category for hierarchical structure'
    },
    color: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Hex color code for UI display (e.g., #FF5733)'
    },
    icon: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Icon name or emoji for UI display'
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Display order for sorting categories'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'ProductCategories',
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        fields: ['tenantId']
      },
      {
        fields: ['parentId']
      },
      {
        fields: ['sortOrder']
      },
      {
        fields: ['tenantId', 'isActive', 'sortOrder']
      },
      {
        fields: ['tenantId', 'name'],
        unique: true,
        name: 'product_categories_tenant_name_unique'
      }
    ]
  });

  ProductCategory.associate = function(models) {
    // Tenant association
    ProductCategory.belongsTo(models.Tenant, {
      foreignKey: 'tenantId',
      as: 'tenant'
    });

    // Self-referential: Parent category
    ProductCategory.belongsTo(ProductCategory, {
      foreignKey: 'parentId',
      as: 'parent'
    });

    // Self-referential: Child categories
    ProductCategory.hasMany(ProductCategory, {
      foreignKey: 'parentId',
      as: 'children'
    });

    // Products in this category
    ProductCategory.hasMany(models.Product, {
      foreignKey: 'categoryId',
      as: 'products'
    });
  };

  /**
   * Instance method: Check if category is a root category (no parent)
   */
  ProductCategory.prototype.isRoot = function() {
    return this.parentId === null;
  };

  /**
   * Instance method: Get full category path (e.g., "Food > Beverages > Coffee")
   */
  ProductCategory.prototype.getFullPath = async function() {
    const path = [this.name];
    let current = this;

    while (current.parentId) {
      current = await ProductCategory.findByPk(current.parentId);
      if (current) {
        path.unshift(current.name);
      } else {
        break;
      }
    }

    return path.join(' > ');
  };

  /**
   * Instance method: Get all descendant categories
   */
  ProductCategory.prototype.getDescendants = async function() {
    const descendants = [];
    const children = await ProductCategory.findAll({
      where: { parentId: this.id }
    });

    for (const child of children) {
      descendants.push(child);
      const childDescendants = await child.getDescendants();
      descendants.push(...childDescendants);
    }

    return descendants;
  };

  /**
   * Static method: Get root categories for tenant
   */
  ProductCategory.getRootCategories = async function(tenantId) {
    return await this.findAll({
      where: {
        tenantId,
        parentId: null,
        isActive: true
      },
      order: [['sortOrder', 'ASC'], ['name', 'ASC']],
      include: [{
        model: ProductCategory,
        as: 'children',
        where: { isActive: true },
        required: false,
        order: [['sortOrder', 'ASC']]
      }]
    });
  };

  /**
   * Static method: Get category tree with all descendants
   */
  ProductCategory.getCategoryTree = async function(tenantId) {
    const rootCategories = await this.getRootCategories(tenantId);
    
    const buildTree = async (category) => {
      const children = await ProductCategory.findAll({
        where: { parentId: category.id, isActive: true },
        order: [['sortOrder', 'ASC']]
      });

      return {
        ...category.toJSON(),
        children: await Promise.all(children.map(buildTree))
      };
    };

    return await Promise.all(rootCategories.map(buildTree));
  };

  /**
   * Static method: Get product count per category
   */
  ProductCategory.getProductCounts = async function(tenantId) {
    return await this.findAll({
      where: { tenantId, isActive: true },
      attributes: [
        'id',
        'name',
        [sequelize.fn('COUNT', sequelize.col('products.id')), 'productCount']
      ],
      include: [{
        model: sequelize.models.Product,
        as: 'products',
        attributes: [],
        where: { isActive: true },
        required: false
      }],
      group: ['ProductCategory.id'],
      order: [['sortOrder', 'ASC']]
    });
  };

  /**
   * Hook: Validate parent-child relationship
   */
  ProductCategory.beforeSave(async (category) => {
    // Prevent self-referencing
    if (category.parentId === category.id) {
      throw new Error('Category cannot be its own parent');
    }

    // Prevent circular references
    if (category.parentId) {
      let current = category.parentId;
      const visited = new Set([category.id]);

      while (current) {
        if (visited.has(current)) {
          throw new Error('Circular category reference detected');
        }
        visited.add(current);

        const parent = await ProductCategory.findByPk(current);
        if (!parent) break;
        current = parent.parentId;
      }
    }
  });

  return ProductCategory;
};
