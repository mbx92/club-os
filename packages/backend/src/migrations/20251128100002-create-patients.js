'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Patients', {
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
      code: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Auto-generated patient code (e.g., PAT-001)'
      },
      fullName: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      email: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      phone: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      birthDate: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      sex: {
        type: Sequelize.ENUM('male', 'female'),
        allowNull: true
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      personalData: {
        type: Sequelize.JSONB,
        defaultValue: {},
        comment: 'Additional personal data (education, occupation, etc.)'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Indexes
    await queryInterface.addIndex('Patients', ['tenantId'], {
      name: 'patients_tenant_id'
    });

    await queryInterface.addIndex('Patients', ['tenantId', 'code'], {
      unique: true,
      name: 'patients_tenant_code_unique',
      where: {
        code: {
          [Sequelize.Op.ne]: null
        }
      }
    });

    await queryInterface.addIndex('Patients', ['email'], {
      name: 'patients_email'
    });

    await queryInterface.addIndex('Patients', ['phone'], {
      name: 'patients_phone'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Patients');
  }
};
