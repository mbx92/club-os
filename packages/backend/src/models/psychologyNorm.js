'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PsychologyNorm extends Model {
    static associate(models) {
      // Belongs to Tenant
      PsychologyNorm.belongsTo(models.Tenant, {
        foreignKey: 'tenantId',
        as: 'tenant'
      });
    }

    /**
     * Find norm by raw score and age
     * @param {string} testTypeCode - Code tes (e.g., 'CFIT')
     * @param {number} rawScore - Raw score dari tes
     * @param {number} ageInMonths - Usia dalam bulan
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<PsychologyNorm>}
     */
    static async findNormByScore(testTypeCode, rawScore, ageInMonths, tenantId) {
      return await this.findOne({
        where: {
          tenantId,
          testTypeCode,
          rawScore,
          ageMonthsStart: { [sequelize.Sequelize.Op.lte]: ageInMonths },
          ageMonthsEnd: { [sequelize.Sequelize.Op.gte]: ageInMonths }
        }
      });
    }

    /**
     * Get all norms for specific test type and age group
     * @param {string} testTypeCode - Code tes
     * @param {string} ageGroupLabel - Label kelompok usia
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Array<PsychologyNorm>>}
     */
    static async getNormsByAgeGroup(testTypeCode, ageGroupLabel, tenantId) {
      return await this.findAll({
        where: {
          tenantId,
          testTypeCode,
          ageGroupLabel
        },
        order: [['rawScore', 'DESC']]
      });
    }
  }

  PsychologyNorm.init({
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
      }
    },
    testTypeCode: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    ageGroupLabel: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    ageMonthsStart: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0
      }
    },
    ageMonthsEnd: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0
      }
    },
    rawScore: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0
      }
    },
    convertedScore: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    classification: {
      type: DataTypes.STRING(100),
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'PsychologyNorm',
    tableName: 'PsychologyNorms',
    indexes: [
      {
        fields: ['tenantId']
      },
      {
        fields: ['testTypeCode']
      },
      {
        fields: ['ageGroupLabel']
      },
      {
        fields: ['tenantId', 'testTypeCode', 'ageMonthsStart', 'ageMonthsEnd', 'rawScore']
      }
    ]
  });

  return PsychologyNorm;
};
