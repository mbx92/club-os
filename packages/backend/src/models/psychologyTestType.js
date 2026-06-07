'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PsychologyTestType extends Model {
    static associate(models) {
      // Belongs to Tenant
      PsychologyTestType.belongsTo(models.Tenant, {
        foreignKey: 'tenantId',
        as: 'tenant'
      });

      // Many-to-many with Packages through PackageItems
      PsychologyTestType.belongsToMany(models.PsychologyPackage, {
        through: models.PsychologyPackageItem,
        foreignKey: 'testTypeId',
        otherKey: 'packageId',
        as: 'packages'
      });

      // Has many PackageItems
      PsychologyTestType.hasMany(models.PsychologyPackageItem, {
        foreignKey: 'testTypeId',
        as: 'packageItems'
      });

      // Has many Sessions
      PsychologyTestType.hasMany(models.PsychologySession, {
        foreignKey: 'testTypeId',
        as: 'sessions'
      });
    }

    /**
     * Get question count from questions array (excluding instructions)
     */
    getQuestionCount() {
      if (Array.isArray(this.questions)) {
        // Only count actual questions, not instructions
        return this.questions.filter(q => q.type === 'question').length;
      }
      return 0;
    }

    /**
     * Get total items count (including instructions)
     */
    getTotalItemsCount() {
      if (Array.isArray(this.questions)) {
        return this.questions.length;
      }
      return 0;
    }

    /**
     * Check if test type has valid questions
     */
    hasValidQuestions() {
      return Array.isArray(this.questions) && this.questions.length > 0;
    }
  }

  PsychologyTestType.init({
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
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 50]
      }
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    category: {
      type: DataTypes.ENUM('personality', 'aptitude', 'interest', 'cognitive', 'other'),
      defaultValue: 'personality'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    questionCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    estimatedDuration: {
      type: DataTypes.INTEGER,
      defaultValue: 30,
      comment: 'Duration in minutes'
    },
    questions: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: []
    },
    answerSchema: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    scoringConfig: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    config: {
      type: DataTypes.JSONB,
      defaultValue: {
        allowBack: true,
        showProgress: true,
        randomizeQuestions: false,
        timeLimit: null
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    version: {
      type: DataTypes.STRING,
      defaultValue: '1.0'
    }
  }, {
    sequelize,
    modelName: 'PsychologyTestType',
    tableName: 'PsychologyTestTypes',
    hooks: {
      beforeSave: (instance) => {
        // Auto-calculate questionCount (excluding instructions)
        if (Array.isArray(instance.questions)) {
          // Check if questions have 'type' field
          const hasTypeField = instance.questions.some(q => q.type !== undefined);
          
          if (hasTypeField) {
            // Only count items with type 'question', not 'instruction'
            instance.questionCount = instance.questions.filter(q => q.type === 'question').length;
          } else {
            // If no 'type' field, count all items (for PAPI, EPPS, LOVE, etc.)
            instance.questionCount = instance.questions.length;
          }
        }
      }
    },
    indexes: [
      {
        unique: true,
        fields: ['tenantId', 'code'],
        name: 'psychology_test_types_tenant_code_unique'
      }
    ]
  });

  return PsychologyTestType;
};
