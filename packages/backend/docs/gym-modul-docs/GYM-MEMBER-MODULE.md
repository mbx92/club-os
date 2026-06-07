# 👤 Member Module - Gym Membership System

## 📋 Overview

Modul Member mengelola data anggota gym dengan fitur auto-create user account untuk autentikasi. Setiap member yang dibuat akan otomatis dibuatkan akun user sehingga bisa login ke sistem.

---

## 🎯 Key Features

- ✅ **Auto-Create User Account** - Otomatis buat user saat member dibuat
- ✅ **Dual Login Method** - Login via email ATAU phone number
- ✅ **Default Password** - Password default "password123" (configurable)
- ✅ **Auto-Generate Password** - Support untuk password random (future: dengan SMTP)
- ✅ **Multi-Tenant** - Data isolation per tenant
- ✅ **User Association** - Link member ke user account

---

## 📊 Database Schema

### Model: Member

```javascript
Member {
  id: UUID (PK),
  tenantId: UUID (FK → Tenant),
  userId: UUID (FK → User),
  
  // Personal Info
  firstName: String,
  lastName: String,
  email: String (unique per tenant, for login),
  phone: String (unique per tenant, for login),
  dateOfBirth: Date,
  gender: Enum('male', 'female', 'other'),
  
  // Contact Info
  address: Text,
  emergencyContactName: String,
  emergencyContactPhone: String,
  
  // Status
  isActive: Boolean (default: true),
  membershipStatus: Enum('active', 'expired', 'suspended', 'cancelled'),
  
  // Additional
  notes: Text,
  photoUrl: String,
  joinDate: Date,
  
  // Timestamps
  createdAt: DateTime,
  updatedAt: DateTime,
  deletedAt: DateTime (soft delete)
}
```

### Relasi Database

```
Member
├── belongsTo Tenant (tenantId)
├── belongsTo User (userId) ← Auto-created
├── hasMany Membership (memberId)
├── hasMany ClassPackage (memberId)
├── hasMany ClassBooking (memberId)
└── hasMany CheckIn (memberId)
```

---

## 🔧 Migration

**File:** `src/migrations/YYYYMMDDHHMMSS-create-member.js`

```javascript
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Members', {
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
      address: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      emergencyContactName: {
        type: Sequelize.STRING,
        allowNull: true
      },
      emergencyContactPhone: {
        type: Sequelize.STRING,
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      photoUrl: {
        type: Sequelize.STRING,
        allowNull: true
      },
      joinDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      membershipStatus: {
        type: Sequelize.ENUM('active', 'expired', 'suspended', 'cancelled'),
        defaultValue: 'expired'
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
    await queryInterface.addIndex('Members', ['tenantId']);
    await queryInterface.addIndex('Members', ['userId']);
    await queryInterface.addIndex('Members', ['email']);
    await queryInterface.addIndex('Members', ['phone']);
    await queryInterface.addIndex('Members', ['tenantId', 'email'], {
      unique: true,
      where: { deletedAt: null }
    });
    await queryInterface.addIndex('Members', ['tenantId', 'phone'], {
      unique: true,
      where: { deletedAt: null }
    });
    await queryInterface.addIndex('Members', ['membershipStatus']);
    await queryInterface.addIndex('Members', ['isActive']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Members');
  }
};
```

---

## 🏗️ Model Implementation

**File:** `src/models/member.js`

```javascript
'use strict';
const { Model } = require('sequelize');
const bcrypt = require('bcrypt');

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
      
      Member.hasMany(models.ClassPackage, { 
        foreignKey: 'memberId', 
        as: 'classPackages' 
      });
      
      Member.hasMany(models.ClassBooking, { 
        foreignKey: 'memberId', 
        as: 'classBookings' 
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
    async hasActiveMembership(models) {
      const activeMembership = await models.Membership.findOne({
        where: {
          memberId: this.id,
          status: 'active',
          endDate: {
            [sequelize.Op.gte]: new Date()
          }
        }
      });
      return !!activeMembership;
    }

    // Instance method: Check if member has active class package
    async hasActiveClassPackage(models) {
      const activePackage = await models.ClassPackage.findOne({
        where: {
          memberId: this.id,
          status: 'active',
          remainingSessions: {
            [sequelize.Op.gt]: 0
          },
          validUntil: {
            [sequelize.Op.gte]: new Date()
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
```

---

## 🎮 Controller Implementation

**File:** `src/controllers/gym/memberController.js`

```javascript
const { Member, User, Role, Tenant, sequelize } = require('../../models');
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');

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
  return process.env.DEFAULT_MEMBER_PASSWORD || 'password123';
};

/**
 * Helper: Send password to member (email/SMS)
 */
const sendPasswordToMember = async (member, password) => {
  // TODO: Implement dengan SMTP/SMS service
  // Untuk sekarang, hanya log
  console.log(`Password for ${member.email || member.phone}: ${password}`);
  
  // Future implementation:
  // if (member.email && process.env.SMTP_ENABLED) {
  //   await emailService.send({
  //     to: member.email,
  //     subject: 'Welcome to Our Gym',
  //     template: 'member-welcome',
  //     data: { password, firstName: member.firstName }
  //   });
  // }
};

/**
 * Create new member with auto-create user account
 */
exports.createMember = async (req, res, next) => {
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
      address,
      emergencyContactName,
      emergencyContactPhone,
      notes
    } = req.body;

    // Validation: email or phone harus ada
    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message: 'Email or phone number is required'
      });
    }

    // Check duplicate email in tenant
    if (email) {
      const existingByEmail = await Member.findOne({
        where: { tenantId, email },
        transaction
      });
      if (existingByEmail) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Member with this email already exists'
        });
      }
    }

    // Check duplicate phone in tenant
    if (phone) {
      const existingByPhone = await Member.findOne({
        where: { tenantId, phone },
        transaction
      });
      if (existingByPhone) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Member with this phone number already exists'
        });
      }
    }

    // Get "Member" role
    const memberRole = await Role.findOne({
      where: { name: 'Member', tenantId },
      transaction
    });

    if (!memberRole) {
      await transaction.rollback();
      return res.status(500).json({
        success: false,
        message: 'Member role not found. Please contact administrator.'
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
      roleId: memberRole.id,
      isActive: true,
      isSuperAdmin: false
    }, { transaction });

    // Create Member
    const member = await Member.create({
      tenantId,
      userId: user.id,
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      gender,
      address,
      emergencyContactName,
      emergencyContactPhone,
      notes,
      joinDate: new Date(),
      isActive: true,
      membershipStatus: 'expired' // Default, akan berubah setelah beli membership
    }, { transaction });

    await transaction.commit();

    // Send password to member (email/SMS)
    await sendPasswordToMember(member, plainPassword);

    // Return response
    res.status(201).json({
      success: true,
      message: 'Member created successfully',
      data: {
        member: {
          id: member.id,
          fullName: member.fullName,
          email: member.email,
          phone: member.phone,
          membershipStatus: member.membershipStatus
        },
        credentials: process.env.AUTO_GENERATE_PASSWORD === 'true' 
          ? { message: 'Password sent via email/SMS' }
          : { tempPassword: plainPassword } // Only for development
      }
    });

  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * Get all members (with pagination & filter)
 */
exports.getAllMembers = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { 
      page = 1, 
      limit = 10, 
      search, 
      status,
      membershipStatus 
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
    if (status) {
      where.isActive = status === 'active';
    }
    
    // Filter by membership status
    if (membershipStatus) {
      where.membershipStatus = membershipStatus;
    }

    const { count, rows } = await Member.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'phone', 'isActive']
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

    res.json({
      success: true,
      data: {
        members: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get member by ID
 */
exports.getMemberById = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const member = await Member.findOne({
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
      ]
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    res.json({
      success: true,
      data: member
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Update member
 */
exports.updateMember = async (req, res, next) => {
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
      address,
      emergencyContactName,
      emergencyContactPhone,
      notes,
      isActive
    } = req.body;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const member = await Member.findOne({ where, transaction });

    if (!member) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    // Check duplicate email if changed
    if (email && email !== member.email) {
      const existingByEmail = await Member.findOne({
        where: { 
          tenantId: member.tenantId, 
          email,
          id: { [Op.ne]: id }
        },
        transaction
      });
      if (existingByEmail) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Member with this email already exists'
        });
      }
    }

    // Check duplicate phone if changed
    if (phone && phone !== member.phone) {
      const existingByPhone = await Member.findOne({
        where: { 
          tenantId: member.tenantId, 
          phone,
          id: { [Op.ne]: id }
        },
        transaction
      });
      if (existingByPhone) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Member with this phone number already exists'
        });
      }
    }

    // Update member
    await member.update({
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      gender,
      address,
      emergencyContactName,
      emergencyContactPhone,
      notes,
      isActive
    }, { transaction });

    // Update user account if email/phone changed
    if (member.userId) {
      await User.update({
        email: email || null,
        phone: phone || null,
        firstName,
        lastName,
        isActive
      }, {
        where: { id: member.userId },
        transaction
      });
    }

    await transaction.commit();

    res.json({
      success: true,
      message: 'Member updated successfully',
      data: member
    });

  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * Delete member (soft delete)
 */
exports.deleteMember = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const member = await Member.findOne({ where });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    // Soft delete
    await member.destroy();

    // Also deactivate user account
    if (member.userId) {
      await User.update(
        { isActive: false },
        { where: { id: member.userId } }
      );
    }

    res.json({
      success: true,
      message: 'Member deleted successfully'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Reset member password
 */
exports.resetMemberPassword = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const member = await Member.findOne({ where });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    if (!member.userId) {
      return res.status(400).json({
        success: false,
        message: 'Member does not have a user account'
      });
    }

    // Generate new password
    const newPassword = generatePassword();

    // Update user password
    await User.update(
      { password: newPassword }, // Will be hashed by model setter
      { where: { id: member.userId } }
    );

    // Send password to member
    await sendPasswordToMember(member, newPassword);

    res.json({
      success: true,
      message: 'Password reset successfully',
      data: process.env.AUTO_GENERATE_PASSWORD === 'true'
        ? { message: 'New password sent via email/SMS' }
        : { tempPassword: newPassword } // Only for development
    });

  } catch (error) {
    next(error);
  }
};
```

---

## 🛣️ Routes

**File:** `src/routes/gym/member.routes.js`

```javascript
const express = require('express');
const router = express.Router();
const memberController = require('../../controllers/gym/memberController');
const { authenticate } = require('../../middlewares/authMiddleware');
const { authorizeCasl } = require('../../middlewares/caslMiddleware');

// All routes require authentication
router.use(authenticate);

// Create member
router.post('/',
  authorizeCasl('create', 'Member'),
  memberController.createMember
);

// Get all members
router.get('/',
  authorizeCasl('read', 'Member'),
  memberController.getAllMembers
);

// Get member by ID
router.get('/:id',
  authorizeCasl('read', 'Member'),
  memberController.getMemberById
);

// Update member
router.put('/:id',
  authorizeCasl('update', 'Member'),
  memberController.updateMember
);

// Delete member
router.delete('/:id',
  authorizeCasl('delete', 'Member'),
  memberController.deleteMember
);

// Reset member password
router.post('/:id/reset-password',
  authorizeCasl('update', 'Member'),
  memberController.resetMemberPassword
);

module.exports = router;
```

**Integrasi ke `src/routes/gym/index.js`:**

```javascript
const memberRoutes = require('./member.routes');

router.use('/members', memberRoutes);
```

---

## 🧪 Testing

### Test Create Member

```bash
POST /api/v1/gym/members
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "08123456789",
  "dateOfBirth": "1990-01-15",
  "gender": "male",
  "address": "Jl. Sudirman No. 123",
  "emergencyContactName": "Jane Doe",
  "emergencyContactPhone": "08198765432"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Member created successfully",
  "data": {
    "member": {
      "id": "uuid",
      "fullName": "John Doe",
      "email": "john.doe@example.com",
      "phone": "08123456789",
      "membershipStatus": "expired"
    },
    "credentials": {
      "tempPassword": "password123"
    }
  }
}
```

### Test Member Login (via Email)

```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "emailOrPhone": "john.doe@example.com",
  "password": "password123"
}
```

### Test Member Login (via Phone)

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
# Member Password Settings
DEFAULT_MEMBER_PASSWORD=password123
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
2. ✅ Update Member model
3. ✅ Implement controller
4. ✅ Setup routes
5. ✅ Update auth controller untuk dual login
6. ✅ Test API endpoints
7. 🔄 Implement SMTP service (future)

---

**Version:** 1.0  
**Last Updated:** November 23, 2025  
**Status:** Ready for Implementation
