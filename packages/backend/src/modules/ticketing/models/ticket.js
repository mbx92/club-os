'use strict';

/**
 * Ticket Model - Ticketing Module
 * 
 * Main ticket entity for customer support, issue tracking, and service requests.
 * Supports multi-tenant architecture with full audit trail.
 * 
 * @module modules/ticketing/models/ticket
 */

module.exports = (sequelize, DataTypes) => {
  const Ticket = sequelize.define('Ticket', {
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
    ticketNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: 'Auto-generated unique ticket number (e.g., TKT-2025-0001)'
    },
    subject: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Ticket subject/title'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Detailed description of the issue or request'
    },
    status: {
      type: DataTypes.ENUM('open', 'in_progress', 'waiting_customer', 'resolved', 'closed', 'cancelled'),
      allowNull: false,
      defaultValue: 'open',
      comment: 'Current ticket status'
    },
    categoryId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'TicketCategories',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Ticket category for classification'
    },
    priorityId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'TicketPriorities',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Ticket priority level'
    },
    requesterId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
      comment: 'User who created the ticket'
    },
    assignedToId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Staff member assigned to handle the ticket'
    },
    memberId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Members',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Related member (if applicable)'
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Expected resolution date'
    },
    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the ticket was resolved'
    },
    closedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the ticket was closed'
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: [],
      comment: 'Custom tags for filtering and organization'
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'Additional metadata (custom fields, integrations, etc.)'
    },
    resolution: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Resolution description when ticket is resolved'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Optimistic locking version for concurrent updates'
    }
  }, {
    tableName: 'Tickets',
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        fields: ['tenantId']
      },
      {
        fields: ['ticketNumber'],
        unique: true
      },
      {
        fields: ['status']
      },
      {
        fields: ['requesterId']
      },
      {
        fields: ['assignedToId']
      },
      {
        fields: ['categoryId']
      },
      {
        fields: ['priorityId']
      },
      {
        fields: ['createdAt']
      },
      {
        fields: ['dueDate']
      },
      {
        name: 'tickets_tags_gin_idx',
        using: 'GIN',
        fields: ['tags']
      },
      {
        name: 'tickets_metadata_gin_idx',
        using: 'GIN',
        fields: ['metadata']
      }
    ],
    hooks: {
      beforeUpdate: (ticket) => {
        // Increment version for optimistic locking
        ticket.version += 1;

        // Auto-set resolved/closed dates
        if (ticket.changed('status')) {
          if (ticket.status === 'resolved' && !ticket.resolvedAt) {
            ticket.resolvedAt = new Date();
          }
          if (ticket.status === 'closed' && !ticket.closedAt) {
            ticket.closedAt = new Date();
          }
        }
      }
    }
  });

  // Associations
  Ticket.associate = function(models) {
    // Belongs to tenant
    Ticket.belongsTo(models.Tenant, {
      foreignKey: 'tenantId',
      as: 'tenant'
    });

    // Belongs to category
    Ticket.belongsTo(models.TicketCategory, {
      foreignKey: 'categoryId',
      as: 'category'
    });

    // Belongs to priority
    Ticket.belongsTo(models.TicketPriority, {
      foreignKey: 'priorityId',
      as: 'priority'
    });

    // Requester (user who created the ticket)
    Ticket.belongsTo(models.User, {
      foreignKey: 'requesterId',
      as: 'requester'
    });

    // Assigned staff
    Ticket.belongsTo(models.User, {
      foreignKey: 'assignedToId',
      as: 'assignedTo'
    });

    // Related member
    Ticket.belongsTo(models.Member, {
      foreignKey: 'memberId',
      as: 'member'
    });

    // Has many comments
    Ticket.hasMany(models.TicketComment, {
      foreignKey: 'ticketId',
      as: 'comments'
    });

    // Has many attachments
    Ticket.hasMany(models.TicketAttachment, {
      foreignKey: 'ticketId',
      as: 'attachments'
    });
  };

  return Ticket;
};
