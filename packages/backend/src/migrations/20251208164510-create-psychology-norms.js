'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('PsychologyNorms', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
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
        onDelete: 'CASCADE'
      },
      testTypeCode: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Code tes psikologi (e.g., CFIT, IST)'
      },
      ageGroupLabel: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Label kelompok usia (e.g., 14-0_14-11)'
      },
      ageMonthsStart: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Usia mulai dalam bulan (e.g., 168 untuk 14 tahun)'
      },
      ageMonthsEnd: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Usia akhir dalam bulan (e.g., 179 untuk 14 tahun 11 bulan)'
      },
      rawScore: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Raw score dari tes'
      },
      convertedScore: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Converted score (e.g., IQ score, stanine, percentile)'
      },
      classification: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Klasifikasi hasil (e.g., GENIUS, SUPERIOR, AVERAGE)'
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
      }
    });

    // Add indexes
    await queryInterface.addIndex('PsychologyNorms', ['tenantId'], {
      name: 'psychology_norms_tenant_id_idx'
    });

    await queryInterface.addIndex('PsychologyNorms', ['testTypeCode'], {
      name: 'psychology_norms_test_type_code_idx'
    });

    await queryInterface.addIndex('PsychologyNorms', ['ageGroupLabel'], {
      name: 'psychology_norms_age_group_idx'
    });

    // Composite index for lookup
    await queryInterface.addIndex('PsychologyNorms', 
      ['tenantId', 'testTypeCode', 'ageMonthsStart', 'ageMonthsEnd', 'rawScore'], 
      {
        name: 'psychology_norms_lookup_idx'
      }
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('PsychologyNorms');
  }
};
