'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Member extends Model {
    static associate(models) {
      Member.belongsTo(models.Tenant, { 
        foreignKey: 'tenantId', 
        as: 'tenant' 
      });
      
      Member.belongsTo(models.User, { 
        foreignKey: 'userId', 
        as: 'user' 
      });
      
      Member.hasMany(models.Membership, { 
        foreignKey: 'memberId', 
        as: 'memberships' 
      });
      
      Member.hasMany(models.ActiveService, { 
        foreignKey: 'memberId', 
        as: 'activeServices' 
      });
      
      Member.hasMany(models.CheckIn, { 
        foreignKey: 'memberId', 
        as: 'checkIns' 
      });
    }

    // Instance method: Get full name
    get fullName() {
      return `${this.firstName} ${this.lastName}`.trim();
    }

    // Instance method: Check if member has active membership
    async hasActiveMembership() {
      const { ActiveService } = sequelize.models;
      const activeService = await ActiveService.findOne({
        where: {
          memberId: this.id,
          status: 'active',
          serviceType: 'membership',
          endDate: {
            [sequelize.Sequelize.Op.gte]: new Date()
          }
        }
      });
      return !!activeService;
    }
    
    // Instance method: Update membership status based on active memberships
    async updateMembershipStatus() {
      const hasActive = await this.hasActiveMembership();
      
      if (hasActive && this.membershipStatus !== 'active') {
        await this.update({ membershipStatus: 'active' });
      } else if (!hasActive && this.membershipStatus === 'active') {
        await this.update({ membershipStatus: 'expired' });
      }
      
      return this.membershipStatus;
    }

    // Instance method: Check if member has active class package
    async hasActiveClassPackage() {
      const { ClassPackage } = sequelize.models;
      if (!ClassPackage) return false;
      
      const activePackage = await ClassPackage.findOne({
        where: {
          memberId: this.id,
          status: 'active',
          remainingSessions: {
            [sequelize.Sequelize.Op.gt]: 0
          },
          validUntil: {
            [sequelize.Sequelize.Op.gte]: new Date()
          }
        }
      });
      return !!activePackage;
    }
  }
  
  Member.init({
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
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    dateOfBirth: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    gender: {
      type: DataTypes.ENUM('male', 'female', 'other'),
      allowNull: true
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    emergencyContactName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    emergencyContactPhone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    photoUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    joinDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    membershipStatus: {
      type: DataTypes.ENUM('active', 'expired', 'suspended', 'cancelled'),
      defaultValue: 'expired'
    },
    deviceEmployeeNo: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Employee number on Hikvision device for member check-in matching',
    }
  }, {
    sequelize,
    modelName: 'Member',
    paranoid: true, // Enable soft delete
    hooks: {
      beforeValidate: async (member, options) => {
        // Ensure at least email or phone is provided
        if (!member.email && !member.phone) {
          throw new Error('Either email or phone must be provided');
        }
      }
    }
  });
  
  return Member;
};