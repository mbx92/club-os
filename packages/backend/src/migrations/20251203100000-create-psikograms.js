'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Psikograms', {
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
      patientId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Patients',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      sessionId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'PsychologySessions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      examinerId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      examDate: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      participant: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
        comment: 'Snapshot of participant data: name, birthDate, education, corporate'
      },
      sections: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Psikogram sections: kecerdasan, sikapKerja, kepribadian, kemampuanBelajar'
      },
      recommendation: {
        type: Sequelize.ENUM('recommended', 'not_recommended'),
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('draft', 'final'),
        allowNull: false,
        defaultValue: 'draft'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Internal notes for examiner'
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
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Create indexes
    await queryInterface.addIndex('Psikograms', ['tenantId'], {
      name: 'psikograms_tenant_id'
    });
    await queryInterface.addIndex('Psikograms', ['patientId'], {
      name: 'psikograms_patient_id'
    });
    await queryInterface.addIndex('Psikograms', ['sessionId'], {
      name: 'psikograms_session_id'
    });
    await queryInterface.addIndex('Psikograms', ['examinerId'], {
      name: 'psikograms_examiner_id'
    });
    await queryInterface.addIndex('Psikograms', ['status'], {
      name: 'psikograms_status'
    });
    await queryInterface.addIndex('Psikograms', ['examDate'], {
      name: 'psikograms_exam_date'
    });
    await queryInterface.addIndex('Psikograms', ['tenantId', 'patientId'], {
      name: 'psikograms_tenant_patient'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Psikograms');
  }
};
