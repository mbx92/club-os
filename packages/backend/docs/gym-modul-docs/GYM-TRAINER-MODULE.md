# 👨‍🏫 Trainer/Instructor Module - Gym Membership System

## 📋 Overview

Modul Trainer mengelola data trainer/instructor dengan sistem komisi dan **auto-create user account** untuk autentikasi. Setiap trainer yang dibuat akan otomatis dibuatkan akun user sehingga bisa login ke sistem sebagai trainer. Trainer bisa dapat komisi berupa **percentage** atau **nominal** dari transaksi yang melibatkan mereka (misal: class yang mereka handle).

---

## 🎯 Key Features

- ✅ **Auto-Create User Account** - Otomatis buat user saat trainer dibuat
- ✅ **Dual Login Method** - Login via email ATAU phone number
- ✅ **Default Password** - Password default "password123" (configurable)
- ✅ **Auto-Generate Password** - Support untuk password random (future: dengan SMTP)
- ✅ **Profile Management** - Data trainer lengkap
- ✅ **Specialization** - Keahlian trainer (yoga, spinning, boxing, dll)
- ✅ **Commission System** - Percentage ATAU fixed amount
- ✅ **Commission Tracking** - Track komisi per transaction
- ✅ **Class Assignment** - Link trainer ke class
- ✅ **Multi-Tenant** - Data isolation per tenant
- ✅ **User Association** - Link trainer ke user account

---

## 📊 Database Schema

### Model: Trainer

```javascript
Trainer {
  id: UUID (PK),
  tenantId: UUID (FK → Tenant),
  userId: UUID (FK → User), ← Auto-created
  
  // Personal Info
  firstName: String,
  lastName: String,
  email: String (unique per tenant, for login),
  phone: String (unique per tenant, for login),
  dateOfBirth: Date,
  gender: Enum('male', 'female', 'other'),
  
  // Professional Info
  specializations: JSON [], // ["yoga", "spinning", "personal_training"]
  certifications: JSON [], // [{ name, issuer, date, expiryDate }]
  bio: Text,
  photoUrl: String,
  
  // Commission Settings
  commissionType: Enum('percentage', 'fixed'),
  commissionValue: Decimal(10, 2),
  commissionNotes: Text,
  
  // Schedule
  availability: JSON {}, // { "monday": ["09:00-12:00", "14:00-18:00"], ... }
  
  // Status
  isActive: Boolean (default: true),
  hireDate: Date,
  
  // Timestamps
  createdAt: DateTime,
  updatedAt: DateTime,
  deletedAt: DateTime (soft delete)
}
```

### Model: TrainerCommission (Tracking Table)

```javascript
TrainerCommission {
  id: UUID (PK),
  tenantId: UUID (FK → Tenant),
  trainerId: UUID (FK → Trainer),
  transactionId: UUID (FK → Transaction),
  classId: UUID (FK → Class, nullable),
  
  // Commission Calculation
  baseAmount: Decimal(10, 2), // Amount yang jadi basis komisi
  commissionType: Enum('percentage', 'fixed'),
  commissionRate: Decimal(10, 2), // Percentage or fixed value
  commissionAmount: Decimal(10, 2), // Final commission
  
  // Payment
  status: Enum('pending', 'paid', 'cancelled'),
  paidAt: DateTime,
  paymentMethod: String,
  notes: Text,
  
  // Timestamps
  createdAt: DateTime,
  updatedAt: DateTime
}
```

### Relasi Database

```
Trainer
├── belongsTo Tenant (tenantId)
├── belongsTo User (userId) ← Auto-created
├── hasMany Class (trainerId)
├── hasMany TrainerCommission (trainerId)
└── hasMany ClassBooking (trainerId, for PT sessions)
```

---

## 🔧 Migrations

### Migration: Create Trainer

**File:** `src/migrations/YYYYMMDDHHMMSS-create-trainer.js`

```javascript
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Trainers', {
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
      userId: {
        type: Sequelize.UUID,
        allowNull: true, // Nullable untuk backward compatibility
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      firstName: {
        type: Sequelize.STRING,
        allowNull: false
      },
      lastName: {
        type: Sequelize.STRING,
        allowNull: false
      },
      email: {
        type: Sequelize.STRING,
        allowNull: true,
        validate: {
          isEmail: true
        }
      },
      phone: {
        type: Sequelize.STRING,
        allowNull: true
      },
      dateOfBirth: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      gender: {
        type: Sequelize.ENUM('male', 'female', 'other'),
        allowNull: true
      },
      specializations: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: []
      },
      certifications: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: []
      },
      bio: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      photoUrl: {
        type: Sequelize.STRING,
        allowNull: true
      },
      commissionType: {
        type: Sequelize.ENUM('percentage', 'fixed'),
        allowNull: false,
        defaultValue: 'percentage'
      },
      commissionValue: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      commissionNotes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      availability: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {}
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      hireDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Indexes
    await queryInterface.addIndex('Trainers', ['tenantId']);
    await queryInterface.addIndex('Trainers', ['userId']);
    await queryInterface.addIndex('Trainers', ['email']);
    await queryInterface.addIndex('Trainers', ['phone']);
    await queryInterface.addIndex('Trainers', ['tenantId', 'email'], {
      unique: true,
      where: { deletedAt: null }
    });
    await queryInterface.addIndex('Trainers', ['tenantId', 'phone'], {
      unique: true,
      where: { deletedAt: null }
    });
    await queryInterface.addIndex('Trainers', ['isActive']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Trainers');
  }
};
```

### Migration: Create TrainerCommission

**File:** `src/migrations/YYYYMMDDHHMMSS-create-trainer-commission.js`

```javascript
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('TrainerCommissions', {
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
      trainerId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Trainers',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      transactionId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Transactions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      classId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Classes',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      baseAmount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      commissionType: {
        type: Sequelize.ENUM('percentage', 'fixed'),
        allowNull: false
      },
      commissionRate: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      commissionAmount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('pending', 'paid', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending'
      },
      paidAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      paymentMethod: {
        type: Sequelize.STRING,
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Indexes
    await queryInterface.addIndex('TrainerCommissions', ['tenantId']);
    await queryInterface.addIndex('TrainerCommissions', ['trainerId']);
    await queryInterface.addIndex('TrainerCommissions', ['transactionId']);
    await queryInterface.addIndex('TrainerCommissions', ['status']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('TrainerCommissions');
  }
};
```

---

## 🏗️ Model Implementations

### Model: Trainer

**File:** `src/models/trainer.js`

```javascript
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Trainer extends Model {
    static associate(models) {
      Trainer.belongsTo(models.Tenant, {
        foreignKey: 'tenantId',
        as: 'tenant'
      });

      Trainer.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });

      Trainer.hasMany(models.Class, {
        foreignKey: 'trainerId',
        as: 'classes'
      });

      Trainer.hasMany(models.TrainerCommission, {
        foreignKey: 'trainerId',
        as: 'commissions'
      });
    }

    // Get full name
    get fullName() {
      return `${this.firstName} ${this.lastName}`.trim();
    }

    // Calculate commission from amount
    calculateCommission(baseAmount) {
      if (this.commissionType === 'percentage') {
        return (baseAmount * this.commissionValue) / 100;
      } else {
        return this.commissionValue;
      }
    }

    // Get formatted commission rate
    getFormattedCommissionRate() {
      if (this.commissionType === 'percentage') {
        return `${this.commissionValue}%`;
      } else {
        return new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR'
        }).format(this.commissionValue);
      }
    }
  }

  Trainer.init({
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
    specializations: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      get() {
        const value = this.getDataValue('specializations');
        return Array.isArray(value) ? value : [];
      }
    },
    certifications: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      get() {
        const value = this.getDataValue('certifications');
        return Array.isArray(value) ? value : [];
      }
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    photoUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    commissionType: {
      type: DataTypes.ENUM('percentage', 'fixed'),
      allowNull: false,
      defaultValue: 'percentage'
    },
    commissionValue: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        validateCommissionValue(value) {
          if (this.commissionType === 'percentage' && value > 100) {
            throw new Error('Percentage commission cannot exceed 100%');
          }
        }
      }
    },
    commissionNotes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    availability: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      get() {
        const value = this.getDataValue('availability');
        return typeof value === 'object' ? value : {};
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    hireDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'Trainer',
    paranoid: true,
    hooks: {
      beforeValidate: async (trainer, options) => {
        // Ensure at least email or phone is provided
        if (!trainer.email && !trainer.phone) {
          throw new Error('Either email or phone must be provided');
        }
      }
    }
  });

  return Trainer;
};
```

### Model: TrainerCommission

**File:** `src/models/trainerCommission.js`

```javascript
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TrainerCommission extends Model {
    static associate(models) {
      TrainerCommission.belongsTo(models.Tenant, {
        foreignKey: 'tenantId',
        as: 'tenant'
      });

      TrainerCommission.belongsTo(models.Trainer, {
        foreignKey: 'trainerId',
        as: 'trainer'
      });

      TrainerCommission.belongsTo(models.Transaction, {
        foreignKey: 'transactionId',
        as: 'transaction'
      });

      TrainerCommission.belongsTo(models.Class, {
        foreignKey: 'classId',
        as: 'class'
      });
    }

    // Mark as paid
    async markAsPaid(paymentMethod, notes) {
      this.status = 'paid';
      this.paidAt = new Date();
      this.paymentMethod = paymentMethod;
      if (notes) this.notes = notes;
      await this.save();
    }
  }

  TrainerCommission.init({
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
    trainerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Trainers',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    transactionId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Transactions',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    classId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Classes',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    baseAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    commissionType: {
      type: DataTypes.ENUM('percentage', 'fixed'),
      allowNull: false
    },
    commissionRate: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    commissionAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    status: {
      type: DataTypes.ENUM('pending', 'paid', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending'
    },
    paidAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    paymentMethod: {
      type: DataTypes.STRING,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'TrainerCommission',
    hooks: {
      beforeCreate: (commission) => {
        // Auto-calculate commission amount if not provided
        if (!commission.commissionAmount) {
          if (commission.commissionType === 'percentage') {
            commission.commissionAmount = 
              (commission.baseAmount * commission.commissionRate) / 100;
          } else {
            commission.commissionAmount = commission.commissionRate;
          }
        }
      }
    }
  });

  return TrainerCommission;
};
```

---

## 🎮 Controller Implementation

**File:** `src/controllers/gym/trainerController.js`

```javascript
const { Trainer, User, Role, Tenant, TrainerCommission, sequelize } = require('../../models');
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const logger = require('../../utils/logger');

/**
 * Helper: Generate password (default atau random)
 */
const generatePassword = () => {
  const autoGenerate = process.env.AUTO_GENERATE_PASSWORD === 'true';
  
  if (autoGenerate) {
    // Random password: 12 characters
    return Math.random().toString(36).slice(-12) + 
           Math.random().toString(36).slice(-12);
  }
  
  // Default password dari env atau fallback
  return process.env.DEFAULT_TRAINER_PASSWORD || 'password123';
};

/**
 * Helper: Send password to trainer (email/SMS)
 */
const sendPasswordToTrainer = async (trainer, password) => {
  // TODO: Implement dengan SMTP/SMS service
  // Untuk sekarang, hanya log
  console.log(`Password for ${trainer.email || trainer.phone}: ${password}`);
  
  // Future implementation:
  // if (trainer.email && process.env.SMTP_ENABLED) {
  //   await emailService.send({
  //     to: trainer.email,
  //     subject: 'Welcome to Our Gym - Trainer Account',
  //     template: 'trainer-welcome',
  //     data: { password, firstName: trainer.firstName }
  //   });
  // }
};

/**
 * Create new trainer with auto-create user account
 */
exports.createTrainer = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { tenantId } = req.user;
    const {
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      gender,
      specializations,
      certifications,
      bio,
      commissionType,
      commissionValue,
      commissionNotes,
      availability,
      hireDate
    } = req.body;

    // Validation: email or phone harus ada
    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message: 'Email or phone number is required'
      });
    }

    // Validation: firstName and lastName required
    if (!firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'First name and last name are required'
      });
    }

    // Check duplicate email in tenant
    if (email) {
      const existingByEmail = await Trainer.findOne({
        where: { tenantId, email },
        transaction
      });
      if (existingByEmail) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Trainer with this email already exists'
        });
      }
    }

    // Check duplicate phone in tenant
    if (phone) {
      const existingByPhone = await Trainer.findOne({
        where: { tenantId, phone },
        transaction
      });
      if (existingByPhone) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Trainer with this phone number already exists'
        });
      }
    }

    // Get "Trainer" role
    const trainerRole = await Role.findOne({
      where: { name: 'Trainer', tenantId },
      transaction
    });

    if (!trainerRole) {
      await transaction.rollback();
      return res.status(500).json({
        success: false,
        message: 'Trainer role not found. Please contact administrator.'
      });
    }

    // Generate password
    const plainPassword = generatePassword();

    // Create User account
    const user = await User.create({
      tenantId,
      email: email || null,
      phone: phone || null,
      password: plainPassword, // Will be hashed by model setter
      firstName,
      lastName,
      roleId: trainerRole.id,
      isActive: true,
      isSuperAdmin: false
    }, { transaction });

    // Create Trainer
    const trainer = await Trainer.create({
      tenantId,
      userId: user.id,
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      gender,
      specializations: specializations || [],
      certifications: certifications || [],
      bio,
      commissionType: commissionType || 'percentage',
      commissionValue: commissionValue || 0,
      commissionNotes,
      availability: availability || {},
      hireDate: hireDate || new Date(),
      isActive: true
    }, { transaction });

    await transaction.commit();

    // Send password to trainer (email/SMS)
    await sendPasswordToTrainer(trainer, plainPassword);

    logger.logAudit('Trainer created with user account', {
      trainerId: trainer.id,
      userId: user.id,
      trainerName: trainer.fullName,
      tenantId,
      user: req.user
    });

    // Return response
    res.status(201).json({
      success: true,
      message: 'Trainer created successfully',
      data: {
        trainer: {
          id: trainer.id,
          fullName: trainer.fullName,
          email: trainer.email,
          phone: trainer.phone,
          commissionType: trainer.commissionType,
          commissionValue: trainer.commissionValue,
          specializations: trainer.specializations
        },
        credentials: process.env.AUTO_GENERATE_PASSWORD === 'true' 
          ? { message: 'Password sent via email/SMS' }
          : { tempPassword: plainPassword } // Only for development
      }
    });

  } catch (error) {
    await transaction.rollback();
    logger.logSecurity('Error creating trainer', {
      error: error.message,
      stack: error.stack,
      tenantId: req.user.tenantId
    });
    next(error);
  }
};

/**
 * Get all trainers (with pagination & filter)
 */
exports.getAllTrainers = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { 
      page = 1, 
      limit = 10, 
      search, 
      isActive,
      specialization
    } = req.query;

    const offset = (page - 1) * limit;
    
    // Build where clause
    const where = isSuperAdmin ? {} : { tenantId };
    
    // Search by name, email, or phone
    if (search) {
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } }
      ];
    }
    
    // Filter by active status
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }
    
    // Filter by specialization (JSON contains)
    if (specialization) {
      where.specializations = {
        [Op.contains]: [specialization]
      };
    }

    const { count, rows } = await Trainer.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'phone', 'isActive', 'lastLogin']
        },
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['id', 'name']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    logger.logInfo('Trainers retrieved', {
      count: rows.length,
      totalRecords: count,
      tenantId: req.user.tenantId
    });

    res.json({
      success: true,
      data: {
        trainers: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });

  } catch (error) {
    logger.logSecurity('Error retrieving trainers', {
      error: error.message,
      tenantId: req.user.tenantId
    });
    next(error);
  }
};

/**
 * Get trainer by ID
 */
exports.getTrainerById = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const trainer = await Trainer.findOne({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'phone', 'isActive', 'lastLogin']
        },
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['id', 'name']
        },
        {
          model: TrainerCommission,
          as: 'commissions',
          limit: 10,
          order: [['createdAt', 'DESC']]
        }
      ]
    });

    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: 'Trainer not found'
      });
    }

    logger.logInfo('Trainer retrieved', {
      trainerId: trainer.id,
      tenantId: req.user.tenantId
    });

    res.json({
      success: true,
      data: trainer
    });

  } catch (error) {
    logger.logSecurity('Error retrieving trainer', {
      error: error.message,
      trainerId: req.params.id,
      tenantId: req.user.tenantId
    });
    next(error);
  }
};

/**
 * Update trainer
 */
exports.updateTrainer = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;
    const {
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      gender,
      specializations,
      certifications,
      bio,
      commissionType,
      commissionValue,
      commissionNotes,
      availability,
      isActive
    } = req.body;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const trainer = await Trainer.findOne({ where, transaction });

    if (!trainer) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Trainer not found'
      });
    }

    // Check duplicate email if changed
    if (email && email !== trainer.email) {
      const existingByEmail = await Trainer.findOne({
        where: { 
          tenantId: trainer.tenantId, 
          email,
          id: { [Op.ne]: id }
        },
        transaction
      });
      if (existingByEmail) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Trainer with this email already exists'
        });
      }
    }

    // Check duplicate phone if changed
    if (phone && phone !== trainer.phone) {
      const existingByPhone = await Trainer.findOne({
        where: { 
          tenantId: trainer.tenantId, 
          phone,
          id: { [Op.ne]: id }
        },
        transaction
      });
      if (existingByPhone) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Trainer with this phone number already exists'
        });
      }
    }

    // Update trainer
    await trainer.update({
      firstName: firstName || trainer.firstName,
      lastName: lastName || trainer.lastName,
      email: email !== undefined ? email : trainer.email,
      phone: phone !== undefined ? phone : trainer.phone,
      dateOfBirth: dateOfBirth !== undefined ? dateOfBirth : trainer.dateOfBirth,
      gender: gender || trainer.gender,
      specializations: specializations || trainer.specializations,
      certifications: certifications || trainer.certifications,
      bio: bio !== undefined ? bio : trainer.bio,
      commissionType: commissionType || trainer.commissionType,
      commissionValue: commissionValue !== undefined ? commissionValue : trainer.commissionValue,
      commissionNotes: commissionNotes !== undefined ? commissionNotes : trainer.commissionNotes,
      availability: availability || trainer.availability,
      isActive: isActive !== undefined ? isActive : trainer.isActive
    }, { transaction });

    // Update user account if email/phone changed
    if (trainer.userId) {
      await User.update({
        email: email || null,
        phone: phone || null,
        firstName: firstName || trainer.firstName,
        lastName: lastName || trainer.lastName,
        isActive: isActive !== undefined ? isActive : trainer.isActive
      }, {
        where: { id: trainer.userId },
        transaction
      });
    }

    await transaction.commit();

    logger.logAudit('Trainer updated', {
      trainerId: trainer.id,
      trainerName: trainer.fullName,
      tenantId: req.user.tenantId,
      user: req.user
    });

    res.json({
      success: true,
      message: 'Trainer updated successfully',
      data: trainer
    });

  } catch (error) {
    await transaction.rollback();
    logger.logSecurity('Error updating trainer', {
      error: error.message,
      trainerId: req.params.id,
      tenantId: req.user.tenantId
    });
    next(error);
  }
};

/**
 * Delete trainer (soft delete)
 */
exports.deleteTrainer = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const trainer = await Trainer.findOne({ where });

    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: 'Trainer not found'
      });
    }

    // Soft delete
    await trainer.destroy();

    // Also deactivate user account
    if (trainer.userId) {
      await User.update(
        { isActive: false },
        { where: { id: trainer.userId } }
      );
    }

    logger.logAudit('Trainer deleted (soft)', {
      trainerId: trainer.id,
      trainerName: trainer.fullName,
      tenantId: req.user.tenantId,
      user: req.user
    });

    res.json({
      success: true,
      message: 'Trainer deleted successfully'
    });

  } catch (error) {
    logger.logSecurity('Error deleting trainer', {
      error: error.message,
      trainerId: req.params.id,
      tenantId: req.user.tenantId
    });
    next(error);
  }
};

/**
 * Reset trainer password
 */
exports.resetTrainerPassword = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const trainer = await Trainer.findOne({ where });

    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: 'Trainer not found'
      });
    }

    if (!trainer.userId) {
      return res.status(400).json({
        success: false,
        message: 'Trainer does not have a user account'
      });
    }

    // Generate new password
    const newPassword = generatePassword();

    // Update user password
    await User.update(
      { password: newPassword }, // Will be hashed by model setter
      { where: { id: trainer.userId } }
    );

    // Send password to trainer
    await sendPasswordToTrainer(trainer, newPassword);

    logger.logAudit('Trainer password reset', {
      trainerId: trainer.id,
      userId: trainer.userId,
      tenantId: req.user.tenantId,
      user: req.user
    });

    res.json({
      success: true,
      message: 'Password reset successfully',
      data: process.env.AUTO_GENERATE_PASSWORD === 'true'
        ? { message: 'New password sent via email/SMS' }
        : { tempPassword: newPassword } // Only for development
    });

  } catch (error) {
    logger.logSecurity('Error resetting trainer password', {
      error: error.message,
      trainerId: req.params.id,
      tenantId: req.user.tenantId
    });
    next(error);
  }
};

/**
 * Get trainer commissions
 */
exports.getTrainerCommissions = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;
    const { 
      page = 1, 
      limit = 10,
      status,
      startDate,
      endDate
    } = req.query;

    const offset = (page - 1) * limit;

    // Check trainer exists
    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const trainer = await Trainer.findOne({ where });

    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: 'Trainer not found'
      });
    }

    // Build commission where clause
    const commissionWhere = { 
      trainerId: id,
      tenantId: isSuperAdmin ? trainer.tenantId : tenantId
    };

    if (status) {
      commissionWhere.status = status;
    }

    if (startDate || endDate) {
      commissionWhere.createdAt = {};
      if (startDate) commissionWhere.createdAt[Op.gte] = new Date(startDate);
      if (endDate) commissionWhere.createdAt[Op.lte] = new Date(endDate);
    }

    const { count, rows } = await TrainerCommission.findAndCountAll({
      where: commissionWhere,
      include: [
        {
          model: Transaction,
          as: 'transaction',
          attributes: ['id', 'transactionNumber', 'totalAmount', 'createdAt']
        },
        {
          model: Class,
          as: 'class',
          attributes: ['id', 'name', 'schedule']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    // Calculate summary
    const summary = await TrainerCommission.findOne({
      where: { trainerId: id, tenantId: trainer.tenantId },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalCommissions'],
        [sequelize.fn('SUM', sequelize.col('commissionAmount')), 'totalAmount'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN status = 'paid' THEN commissionAmount ELSE 0 END")), 'paidAmount'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN status = 'pending' THEN commissionAmount ELSE 0 END")), 'pendingAmount']
      ],
      raw: true
    });

    res.json({
      success: true,
      data: {
        commissions: rows,
        summary: {
          totalCommissions: parseInt(summary.totalCommissions) || 0,
          totalAmount: parseFloat(summary.totalAmount) || 0,
          paidAmount: parseFloat(summary.paidAmount) || 0,
          pendingAmount: parseFloat(summary.pendingAmount) || 0
        },
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });

  } catch (error) {
    logger.logSecurity('Error retrieving trainer commissions', {
      error: error.message,
      trainerId: req.params.id,
      tenantId: req.user.tenantId
    });
    next(error);
  }
};

/**
 * Pay trainer commission
 */
exports.payCommission = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id, commissionId } = req.params;
    const { paymentMethod, notes } = req.body;

    // Check trainer exists
    const trainerWhere = { id };
    if (!isSuperAdmin) {
      trainerWhere.tenantId = tenantId;
    }

    const trainer = await Trainer.findOne({ where: trainerWhere });

    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: 'Trainer not found'
      });
    }

    // Find commission
    const commission = await TrainerCommission.findOne({
      where: {
        id: commissionId,
        trainerId: id,
        tenantId: isSuperAdmin ? trainer.tenantId : tenantId
      }
    });

    if (!commission) {
      return res.status(404).json({
        success: false,
        message: 'Commission not found'
      });
    }

    if (commission.status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Commission already paid'
      });
    }

    // Mark as paid
    await commission.markAsPaid(paymentMethod, notes);

    logger.logAudit('Trainer commission paid', {
      commissionId: commission.id,
      trainerId: trainer.id,
      amount: commission.commissionAmount,
      paymentMethod,
      tenantId: req.user.tenantId,
      user: req.user
    });

    res.json({
      success: true,
      message: 'Commission paid successfully',
      data: commission
    });

  } catch (error) {
    logger.logSecurity('Error paying trainer commission', {
      error: error.message,
      trainerId: req.params.id,
      commissionId: req.params.commissionId,
      tenantId: req.user.tenantId
    });
    next(error);
  }
};

/**
 * Helper: Create trainer commission from transaction
 */
async function createTrainerCommission(transaction, trainer, classId = null) {
  const baseAmount = transaction.totalAmount;
  
  const commission = await TrainerCommission.create({
    tenantId: transaction.tenantId,
    trainerId: trainer.id,
    transactionId: transaction.id,
    classId,
    baseAmount,
    commissionType: trainer.commissionType,
    commissionRate: trainer.commissionValue,
    // commissionAmount will be auto-calculated by hook
    status: 'pending'
  });
  
  return commission;
}

module.exports = {
  createTrainer,
  getAllTrainers,
  getTrainerById,
  updateTrainer,
  deleteTrainer,
  resetTrainerPassword,
  getTrainerCommissions,
  payCommission,
  createTrainerCommission
};
```

---

## 🛣️ Routes

**File:** `src/routes/gym/trainer.routes.js`

```javascript
const express = require('express');
const router = express.Router();
const trainerController = require('../../controllers/gym/trainerController');
const { authenticate } = require('../../middlewares/authMiddleware');
const { authorizeCasl } = require('../../middlewares/caslMiddleware');

// All routes require authentication
router.use(authenticate);

// Create trainer
router.post('/',
  authorizeCasl('create', 'Trainer'),
  trainerController.createTrainer
);

// Get all trainers
router.get('/',
  authorizeCasl('read', 'Trainer'),
  trainerController.getAllTrainers
);

// Get trainer by ID
router.get('/:id',
  authorizeCasl('read', 'Trainer'),
  trainerController.getTrainerById
);

// Update trainer
router.put('/:id',
  authorizeCasl('update', 'Trainer'),
  trainerController.updateTrainer
);

// Delete trainer
router.delete('/:id',
  authorizeCasl('delete', 'Trainer'),
  trainerController.deleteTrainer
);

// Reset trainer password
router.post('/:id/reset-password',
  authorizeCasl('update', 'Trainer'),
  trainerController.resetTrainerPassword
);

// Get trainer commissions
router.get('/:id/commissions',
  authorizeCasl('read', 'TrainerCommission'),
  trainerController.getTrainerCommissions
);

// Pay commission
router.post('/:id/commissions/:commissionId/pay',
  authorizeCasl('update', 'TrainerCommission'),
  trainerController.payCommission
);

module.exports = router;
```

**Integrasi ke `src/routes/gym/index.js`:**

```javascript
const trainerRoutes = require('./trainer.routes');

router.use('/trainers', trainerRoutes);
```

---

## 🧪 Testing

### Test Create Trainer with Auto User Account

```bash
POST /api/v1/gym/trainers
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Smith",
  "email": "john.smith@gym.com",
  "phone": "08123456789",
  "dateOfBirth": "1985-05-15",
  "gender": "male",
  "specializations": ["yoga", "personal_training"],
  "commissionType": "percentage",
  "commissionValue": 15.00,
  "commissionNotes": "15% of class fees"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Trainer created successfully",
  "data": {
    "trainer": {
      "id": "uuid",
      "fullName": "John Smith",
      "email": "john.smith@gym.com",
      "phone": "08123456789",
      "commissionType": "percentage",
      "commissionValue": 15.00,
      "specializations": ["yoga", "personal_training"]
    },
    "credentials": {
      "tempPassword": "password123"
    }
  }
}
```

### Test Trainer Login (via Email)

```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "emailOrPhone": "john.smith@gym.com",
  "password": "password123"
}
```

### Test Trainer Login (via Phone)

```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "emailOrPhone": "08123456789",
  "password": "password123"
}
```

---

## 🔐 Authentication Integration

Update `src/controllers/auth/authController.js` untuk support login via email ATAU phone:

```javascript
// In login controller
const { emailOrPhone, password } = req.body;

// Find user by email OR phone
const user = await User.findOne({
  where: {
    [Op.or]: [
      { email: emailOrPhone },
      { phone: emailOrPhone }
    ]
  },
  include: [
    { model: Role, as: 'role' },
    { model: Tenant, as: 'tenant' }
  ]
});
```

---

## ⚙️ Environment Configuration

Add to `.env.development`:

```env
# Trainer Password Settings
DEFAULT_TRAINER_PASSWORD=password123
AUTO_GENERATE_PASSWORD=false

# SMTP Settings (for auto-generated passwords)
SMTP_ENABLED=false
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourgym.com
```

---

## 📝 Next Steps

1. ✅ Create migration file
2. ✅ Update Trainer model with validation hooks
3. ✅ Implement full controller with user auto-creation
4. ✅ Setup routes with CASL authorization
5. ✅ Update auth controller untuk dual login (jika belum)
6. ✅ Test API endpoints
7. 🔄 Implement SMTP service (future)
8. 🔄 Add commission calculation to class booking flow

---

**Version:** 2.0  
**Last Updated:** November 23, 2025  
**Status:** Ready for Implementation (with Auto User Creation)
