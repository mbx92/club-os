'use strict';

/**
 * TicketPriority Model - Ticketing Module
 * 
 * Priority levels for tickets (e.g., Low, Normal, High, Urgent)
 * 
 * @module modules/ticketing/models/ticketPriority
 */

module.exports = (sequelize, DataTypes) => {
  const TicketPriority = sequelize.define('TicketPriority', {
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
      comment: 'Priority name (e.g., "Low", "Normal", "High", "Urgent")'
    },
    level: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Priority level (1=lowest, higher=more urgent)'
    },
    color: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Hex color code for UI display'
    },
    slaHours: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Service Level Agreement response time in hours'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'TicketPriorities',
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
        fields: ['level']
      },
      {
        fields: ['isActive']
      }
    ]
  });

  // Associations
  TicketPriority.associate = function(models) {
    TicketPriority.belongsTo(models.Tenant, {
      foreignKey: 'tenantId',
      as: 'tenant'
    });

    TicketPriority.hasMany(models.Ticket, {
      foreignKey: 'priorityId',
      as: 'tickets'
    });
  };

  return TicketPriority;
};
