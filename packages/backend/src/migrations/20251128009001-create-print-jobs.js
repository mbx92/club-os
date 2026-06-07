'use strict';

/**
 * Migration: Create PrintJobs Table
 * 
 * Tracks all print jobs for thermal printers with queue management,
 * retry mechanism, and health monitoring.
 * 
 * Features:
 * - Job queue with status tracking
 * - Retry mechanism with attempt counter
 * - Reference to source transaction/order
 * - Error logging for failed jobs
 * - Health monitoring (stuck job detection)
 * 
 * @migration 20241207000001-create-print-jobs
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if table already exists
    const tableExists = await queryInterface.sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'PrintJobs'
      );
    `);

    if (tableExists[0][0].exists) {
      console.log('⏭️  Table PrintJobs already exists, skipping creation...');
      return;
    }

    await queryInterface.createTable('PrintJobs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
        allowNull: false
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Tenant yang memiliki print job'
      },
      printerId: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'ID printer dari tenant.settings.printers (UUID string)'
      },
      jobType: {
        type: Sequelize.ENUM('receipt', 'kitchen', 'label', 'invoice', 'report'),
        allowNull: false,
        defaultValue: 'receipt',
        comment: 'Tipe print job'
      },
      referenceType: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Model reference (Transaction, Order, Membership, etc)'
      },
      referenceId: {
        type: Sequelize.UUID,
        allowNull: true,
        comment: 'ID dari reference model'
      },
      status: {
        type: Sequelize.ENUM('pending', 'printing', 'completed', 'failed', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'Status print job'
      },
      priority: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Priority (higher = more urgent, 0 = normal)'
      },
      attempts: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Jumlah retry attempts'
      },
      maxRetries: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 3,
        comment: 'Maximum retry attempts'
      },
      printData: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'ESC/POS commands (base64 encoded)'
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Additional job metadata'
      },
      error: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Error message if failed'
      },
      errorStack: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Full error stack trace'
      },
      scheduledAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'When job was scheduled'
      },
      startedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When printing started'
      },
      completedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When printing completed'
      },
      cancelledAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When job was cancelled'
      },
      printDuration: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Print duration in milliseconds'
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'User yang membuat print job'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Soft delete timestamp'
      }
    });

    // Indexes for performance
    await queryInterface.addIndex('PrintJobs', ['tenantId'], {
      name: 'print_jobs_tenant_idx'
    });

    await queryInterface.addIndex('PrintJobs', ['printerId'], {
      name: 'print_jobs_printer_idx'
    });

    await queryInterface.addIndex('PrintJobs', ['status'], {
      name: 'print_jobs_status_idx'
    });

    await queryInterface.addIndex('PrintJobs', ['jobType'], {
      name: 'print_jobs_type_idx'
    });

    await queryInterface.addIndex('PrintJobs', ['referenceType', 'referenceId'], {
      name: 'print_jobs_reference_idx'
    });

    // Composite index for queue processing
    await queryInterface.addIndex('PrintJobs', ['tenantId', 'printerId', 'status', 'priority'], {
      name: 'print_jobs_queue_idx'
    });

    // Index for stuck job detection (jobs in 'printing' status for > 5 minutes)
    await queryInterface.sequelize.query(`
      CREATE INDEX print_jobs_stuck_idx 
      ON "PrintJobs" ("tenantId", "printerId", "status", "startedAt")
      WHERE "status" IN ('pending', 'printing');
    `);

    // Index for scheduled jobs
    await queryInterface.addIndex('PrintJobs', ['scheduledAt'], {
      name: 'print_jobs_scheduled_idx'
    });

    // JSONB index for metadata queries
    await queryInterface.sequelize.query(`
      CREATE INDEX print_jobs_metadata_gin_idx 
      ON "PrintJobs" USING GIN ("metadata");
    `);

    // Add table comment
    await queryInterface.sequelize.query(`
      COMMENT ON TABLE "PrintJobs" IS 'Print job queue for thermal printers with retry mechanism and health monitoring';
    `);

    console.log('✅ PrintJobs table created successfully');
  },

  async down(queryInterface) {
    await queryInterface.dropTable('PrintJobs');
    console.log('✅ PrintJobs table dropped');
  }
};
