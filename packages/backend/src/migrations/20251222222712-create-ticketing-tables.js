'use strict';

/**
 * Migration: Create Ticketing Tables
 * 
 * Creates all tables for the ticketing module:
 * - TicketCategories
 * - TicketPriorities
 * - Tickets
 * - TicketComments
 * - TicketAttachments
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create TicketCategories table
    await queryInterface.createTable('TicketCategories', {
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
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      color: {
        type: Sequelize.STRING,
        allowNull: true
      },
      icon: {
        type: Sequelize.STRING,
        allowNull: true
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      sortOrder: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Create TicketPriorities table
    await queryInterface.createTable('TicketPriorities', {
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
        type: Sequelize.STRING,
        allowNull: false
      },
      level: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      color: {
        type: Sequelize.STRING,
        allowNull: true
      },
      slaHours: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Create Tickets table
    await queryInterface.createTable('Tickets', {
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
      ticketNumber: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      subject: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('open', 'in_progress', 'waiting_customer', 'resolved', 'closed', 'cancelled'),
        allowNull: false,
        defaultValue: 'open'
      },
      categoryId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'TicketCategories',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      priorityId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'TicketPriorities',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      requesterId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      assignedToId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      memberId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Members',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      dueDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      resolvedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      closedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      tags: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: true,
        defaultValue: []
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {}
      },
      resolution: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      version: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Create TicketComments table
    await queryInterface.createTable('TicketComments', {
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
      ticketId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Tickets',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      comment: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      isInternal: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      isSystemGenerated: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Create TicketAttachments table
    await queryInterface.createTable('TicketAttachments', {
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
      ticketId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Tickets',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      fileName: {
        type: Sequelize.STRING,
        allowNull: false
      },
      filePath: {
        type: Sequelize.STRING,
        allowNull: false
      },
      fileSize: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      mimeType: {
        type: Sequelize.STRING,
        allowNull: false
      },
      fileType: {
        type: Sequelize.ENUM('image', 'document', 'video', 'other'),
        allowNull: false,
        defaultValue: 'other'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Add indexes for TicketCategories
    await queryInterface.addIndex('TicketCategories', ['tenantId']);
    await queryInterface.addIndex('TicketCategories', ['tenantId', 'name'], { unique: true });
    await queryInterface.addIndex('TicketCategories', ['isActive']);
    await queryInterface.addIndex('TicketCategories', ['sortOrder']);

    // Add indexes for TicketPriorities
    await queryInterface.addIndex('TicketPriorities', ['tenantId']);
    await queryInterface.addIndex('TicketPriorities', ['tenantId', 'name'], { unique: true });
    await queryInterface.addIndex('TicketPriorities', ['level']);
    await queryInterface.addIndex('TicketPriorities', ['isActive']);

    // Add indexes for Tickets
    await queryInterface.addIndex('Tickets', ['tenantId']);
    await queryInterface.addIndex('Tickets', ['ticketNumber'], { unique: true });
    await queryInterface.addIndex('Tickets', ['status']);
    await queryInterface.addIndex('Tickets', ['requesterId']);
    await queryInterface.addIndex('Tickets', ['assignedToId']);
    await queryInterface.addIndex('Tickets', ['categoryId']);
    await queryInterface.addIndex('Tickets', ['priorityId']);
    await queryInterface.addIndex('Tickets', ['createdAt']);
    await queryInterface.addIndex('Tickets', ['dueDate']);
    
    // GIN indexes for JSONB and array fields
    await queryInterface.sequelize.query(
      'CREATE INDEX tickets_tags_gin_idx ON "Tickets" USING GIN (tags);'
    );
    await queryInterface.sequelize.query(
      'CREATE INDEX tickets_metadata_gin_idx ON "Tickets" USING GIN (metadata);'
    );

    // Add indexes for TicketComments
    await queryInterface.addIndex('TicketComments', ['tenantId']);
    await queryInterface.addIndex('TicketComments', ['ticketId']);
    await queryInterface.addIndex('TicketComments', ['userId']);
    await queryInterface.addIndex('TicketComments', ['createdAt']);
    await queryInterface.addIndex('TicketComments', ['isInternal']);

    // Add indexes for TicketAttachments
    await queryInterface.addIndex('TicketAttachments', ['tenantId']);
    await queryInterface.addIndex('TicketAttachments', ['ticketId']);
    await queryInterface.addIndex('TicketAttachments', ['userId']);
    await queryInterface.addIndex('TicketAttachments', ['fileType']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('TicketAttachments');
    await queryInterface.dropTable('TicketComments');
    await queryInterface.dropTable('Tickets');
    await queryInterface.dropTable('TicketPriorities');
    await queryInterface.dropTable('TicketCategories');
  }
};
