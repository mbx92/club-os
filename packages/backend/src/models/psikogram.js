'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Psikogram extends Model {
    static associate(models) {
      // Belongs to Tenant
      Psikogram.belongsTo(models.Tenant, {
        foreignKey: 'tenantId',
        as: 'tenant'
      });

      // Belongs to Patient
      Psikogram.belongsTo(models.Patient, {
        foreignKey: 'patientId',
        as: 'patient'
      });

      // Belongs to Session (optional)
      Psikogram.belongsTo(models.PsychologySession, {
        foreignKey: 'sessionId',
        as: 'session'
      });

      // Belongs to User (examiner)
      Psikogram.belongsTo(models.User, {
        foreignKey: 'examinerId',
        as: 'examiner'
      });
    }

    /**
     * Get recommendation label in Indonesian
     */
    getRecommendationLabel() {
      const labels = {
        recommended: 'DISARANKAN',
        not_recommended: 'TIDAK DISARANKAN'
      };
      return labels[this.recommendation] || '-';
    }

    /**
     * Get status label
     */
    getStatusLabel() {
      const labels = {
        draft: 'Draft',
        final: 'Final'
      };
      return labels[this.status] || this.status;
    }

    /**
     * Calculate participant age from birthDate
     */
    getParticipantAge() {
      if (!this.participant?.birthDate) return null;
      const today = new Date();
      const birth = new Date(this.participant.birthDate);
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return age;
    }

    /**
     * Get all ratings as flat array for statistics
     */
    getAllRatings() {
      const ratings = [];
      if (!this.sections) return ratings;

      for (const sectionKey of Object.keys(this.sections)) {
        const section = this.sections[sectionKey];
        if (section?.items && Array.isArray(section.items)) {
          for (const item of section.items) {
            if (item.rating) {
              ratings.push({
                section: sectionKey,
                title: item.title,
                rating: item.rating
              });
            }
          }
        }
      }
      return ratings;
    }

    /**
     * Count ratings by value
     */
    getRatingCounts() {
      const counts = { R: 0, K: 0, C: 0, B: 0, T: 0 };
      const ratings = this.getAllRatings();
      for (const r of ratings) {
        if (counts.hasOwnProperty(r.rating)) {
          counts[r.rating]++;
        }
      }
      return counts;
    }
  }

  Psikogram.init({
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
    patientId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Patients',
        key: 'id'
      }
    },
    sessionId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'PsychologySessions',
        key: 'id'
      }
    },
    examinerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    examDate: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    participant: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      comment: 'Snapshot of participant data: name, birthDate, education, corporate'
    },
    sections: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'Psikogram sections: kecerdasan, sikapKerja, kepribadian, kemampuanBelajar'
    },
    recommendation: {
      type: DataTypes.ENUM('recommended', 'not_recommended'),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('draft', 'final'),
      allowNull: false,
      defaultValue: 'draft'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Internal notes for examiner'
    },
    publicToken: {
      type: DataTypes.STRING(64),
      allowNull: true,
      unique: true,
      comment: 'Public share token for external access'
    },
    publicTokenExpiry: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Token expiry date'
    }
  }, {
    sequelize,
    modelName: 'Psikogram',
    tableName: 'Psikograms',
    paranoid: true, // Soft delete
    indexes: [
      {
        fields: ['tenantId'],
        name: 'psikograms_tenant_id'
      },
      {
        fields: ['patientId'],
        name: 'psikograms_patient_id'
      },
      {
        fields: ['sessionId'],
        name: 'psikograms_session_id'
      },
      {
        fields: ['examinerId'],
        name: 'psikograms_examiner_id'
      },
      {
        fields: ['status'],
        name: 'psikograms_status'
      },
      {
        fields: ['examDate'],
        name: 'psikograms_exam_date'
      },
      {
        fields: ['tenantId', 'patientId'],
        name: 'psikograms_tenant_patient'
      }
    ]
  });

  return Psikogram;
};
