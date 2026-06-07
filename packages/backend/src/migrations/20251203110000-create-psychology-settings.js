'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('PsychologySettings', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: 'Tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      
      // Logo & Branding
      logo: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      footer: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      primaryColor: {
        type: Sequelize.STRING(7),
        allowNull: true,
        defaultValue: '#1e3a5f'
      },
      secondaryColor: {
        type: Sequelize.STRING(7),
        allowNull: true,
        defaultValue: '#6b7280'
      },
      
      // Psychologist Info
      psychologistName: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      licenseNumber: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      phone: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      
      // Institution Info
      institutionName: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      tagline: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      institutionWebsite: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      institutionEmail: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      institutionPhone: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      instagram: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      
      // Report Settings
      reportTitle: {
        type: Sequelize.STRING(100),
        allowNull: true,
        defaultValue: 'PSIKOGRAM'
      },
      reportSubtitle: {
        type: Sequelize.STRING(255),
        allowNull: true,
        defaultValue: 'Hasil Pemeriksaan Psikologis'
      },
      reportFooter: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      
      // Display Options
      showLogo: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      showSignature: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      showWatermark: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      
      // Signature
      signature: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create unique index on tenantId
    await queryInterface.addIndex('PsychologySettings', ['tenantId'], {
      unique: true,
      name: 'psychology_settings_tenant_unique'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('PsychologySettings');
  }
};
