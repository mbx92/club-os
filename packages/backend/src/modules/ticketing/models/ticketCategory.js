'use strict';

/**
 * TicketCategory Model - Ticketing Module
 * 
 * Categories for organizing tickets (e.g., Technical, Billing, Membership, etc.)
 * 
 * @module modules/ticketing/models/ticketCategory
 */

module.exports = (sequelize, DataTypes) => {
  const TicketCategory = sequelize.define('TicketCategory', {
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
      allowNull: false,
      comment: 'Category name (e.g., "Technical Support", "Billing")'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Category description'
    },
    color: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Hex color code for UI display'
    },
    icon: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Icon identifier for UI display'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Display order'
    }
  }, {
    tableName: 'TicketCategories',
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        fields: ['tenantId']
      },
      {
        fields: ['tenantId', 'name'],
        unique: true
      },
      {
        fields: ['isActive']
      },
      {
        fields: ['sortOrder']
      }
    ]
  });

  // Associations
  TicketCategory.associate = function(models) {
    TicketCategory.belongsTo(models.Tenant, {
      foreignKey: 'tenantId',
      as: 'tenant'
    });

    TicketCategory.hasMany(models.Ticket, {
      foreignKey: 'categoryId',
      as: 'tickets'
    });
  };

  return TicketCategory;
};
