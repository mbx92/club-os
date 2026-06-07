'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if table already exists (idempotent)
    const tableExists = await queryInterface.sequelize.query(
      `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'PsychologyReportCaches')`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (tableExists[0].exists) {
      console.log('Table PsychologyReportCaches already exists, skipping creation');
      return;
    }

    await queryInterface.createTable('PsychologyReportCaches', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
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
      sessionId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'PsychologySessions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      reportType: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'full',
        comment: 'Report type: full, summary, detailed, participant'
      },
      filePath: {
        type: Sequelize.STRING(500),
        allowNull: false,
        comment: 'Absolute path to PDF file on disk'
      },
      fileName: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Original filename for download'
      },
      fileSize: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'File size in bytes'
      },
      mimeType: {
        type: Sequelize.STRING(100),
        defaultValue: 'application/pdf'
      },
      generatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'When this cache expires (default: 24 hours from generation)'
      },
      downloadCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      lastDownloadedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {},
        comment: 'Additional metadata: participantName, packageName, generatedBy, etc.'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      }
    });

    // Create indexes
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_report_cache_tenant 
      ON "PsychologyReportCaches"("tenantId")
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_report_cache_session 
      ON "PsychologyReportCaches"("sessionId")
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_report_cache_expires 
      ON "PsychologyReportCaches"("expiresAt")
    `);

    // Unique constraint on session + reportType
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_session_report_type 
      ON "PsychologyReportCaches"("sessionId", "reportType")
    `);

    console.log('Created PsychologyReportCaches table with indexes');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('PsychologyReportCaches');
  }
};
