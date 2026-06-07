'use strict';

/**
 * TicketAttachment Model - Ticketing Module
 * 
 * File attachments for tickets (images, documents, etc.)
 * 
 * @module modules/ticketing/models/ticketAttachment
 */

module.exports = (sequelize, DataTypes) => {
  const TicketAttachment = sequelize.define('TicketAttachment', {
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
    ticketId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Tickets',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
      comment: 'User who uploaded the file'
    },
    fileName: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Original file name'
    },
    filePath: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Stored file path'
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'File size in bytes'
    },
    mimeType: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'File MIME type'
    },
    fileType: {
      type: DataTypes.ENUM('image', 'document', 'video', 'other'),
      allowNull: false,
      defaultValue: 'other',
      comment: 'General file type category'
    }
  }, {
    tableName: 'TicketAttachments',
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        fields: ['tenantId']
      },
      {
        fields: ['ticketId']
      },
      {
        fields: ['userId']
      },
      {
        fields: ['fileType']
      }
    ]
  });

  // Associations
  TicketAttachment.associate = function(models) {
    TicketAttachment.belongsTo(models.Tenant, {
      foreignKey: 'tenantId',
      as: 'tenant'
    });

    TicketAttachment.belongsTo(models.Ticket, {
      foreignKey: 'ticketId',
      as: 'ticket'
    });

    TicketAttachment.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return TicketAttachment;
};
