# 💳 Membership Plan Module - Gym Membership System

## 📋 Overview

Modul Membership Plan mengelola paket membership yang tersedia di gym. Paket ini bisa berupa membership bulanan, tahunan, atau periode custom lainnya. **Tidak ada fitur khusus** - hanya data plan yang bisa dibeli member.

---

## 🎯 Key Features

- ✅ **Simple Plan Configuration** - Nama, harga, durasi, benefit
- ✅ **No Special Features** - Pure membership plan data
- ✅ **POS Integration** - Bisa dibeli via POS system
- ✅ **Transaction Integration** - Tersimpan dalam unified transaction
- ✅ **Multi-Tenant** - Data isolation per tenant
- ✅ **Flexible Pricing** - Support berbagai tipe harga

---

## 📊 Database Schema

### Model: MembershipPlan

```javascript
MembershipPlan {
  id: UUID (PK),
  tenantId: UUID (FK → Tenant),
  
  // Plan Details
  name: String (e.g., "Gold Monthly", "Silver Annual"),
  description: Text,
  duration: Integer (in days),
  durationType: Enum('days', 'months', 'years'), // Helper display
  
  // Pricing
  price: Decimal(10, 2),
  currency: String (default: 'IDR'),
  
  // Benefits
  benefits: JSON [], // ["Access to all equipment", "1 free PT session", etc.]
  
  // Limits (optional)
  maxVisitsPerMonth: Integer (nullable), // Unlimited if null
  allowedFacilities: JSON [], // ["gym", "pool", "sauna"]
  
  // Status
  isActive: Boolean (default: true),
  isPopular: Boolean (default: false), // Badge "Popular"
  displayOrder: Integer (for sorting in UI),
  
  // Timestamps
  createdAt: DateTime,
  updatedAt: DateTime,
  deletedAt: DateTime (soft delete)
}
```

### Relasi Database

```
MembershipPlan
├── belongsTo Tenant (tenantId)
├── hasMany Membership (membershipPlanId) ← Active memberships
└── hasMany TransactionItem (itemId where itemType='membership')
```

---

## 🔧 Migration

**File:** `src/migrations/YYYYMMDDHHMMSS-create-membership-plan.js`

```javascript
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('MembershipPlans', {
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
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      duration: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Duration in days'
      },
      durationType: {
        type: Sequelize.ENUM('days', 'months', 'years'),
        allowNull: false,
        defaultValue: 'months',
        comment: 'Display helper for duration'
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: 'IDR'
      },
      benefits: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: []
      },
      maxVisitsPerMonth: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Null = unlimited'
      },
      allowedFacilities: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: []
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      isPopular: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      displayOrder: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
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
    await queryInterface.addIndex('MembershipPlans', ['tenantId']);
    await queryInterface.addIndex('MembershipPlans', ['isActive']);
    await queryInterface.addIndex('MembershipPlans', ['displayOrder']);
    await queryInterface.addIndex('MembershipPlans', ['tenantId', 'name'], {
      unique: true,
      where: { deletedAt: null }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('MembershipPlans');
  }
};
```

---

## 🏗️ Model Implementation

**File:** `src/models/membershipPlan.js`

```javascript
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MembershipPlan extends Model {
    static associate(models) {
      MembershipPlan.belongsTo(models.Tenant, {
        foreignKey: 'tenantId',
        as: 'tenant'
      });

      MembershipPlan.hasMany(models.Membership, {
        foreignKey: 'membershipPlanId',
        as: 'memberships'
      });

      // For transaction items
      MembershipPlan.hasMany(models.TransactionItem, {
        foreignKey: 'itemId',
        constraints: false,
        scope: {
          itemType: 'membership'
        },
        as: 'transactionItems'
      });
    }

    // Instance method: Format price
    getFormattedPrice() {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: this.currency
      }).format(this.price);
    }

    // Instance method: Get duration display
    getDurationDisplay() {
      const { duration, durationType } = this;
      
      if (durationType === 'days') {
        return `${duration} day${duration > 1 ? 's' : ''}`;
      } else if (durationType === 'months') {
        const months = Math.floor(duration / 30);
        return `${months} month${months > 1 ? 's' : ''}`;
      } else if (durationType === 'years') {
        const years = Math.floor(duration / 365);
        return `${years} year${years > 1 ? 's' : ''}`;
      }
      
      return `${duration} days`;
    }

    // Instance method: Calculate end date from start date
    calculateEndDate(startDate) {
      const start = new Date(startDate);
      const end = new Date(start);
      end.setDate(end.getDate() + this.duration);
      return end;
    }
  }

  MembershipPlan.init({
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
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1
      }
    },
    durationType: {
      type: DataTypes.ENUM('days', 'months', 'years'),
      allowNull: false,
      defaultValue: 'months'
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'IDR'
    },
    benefits: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      get() {
        const value = this.getDataValue('benefits');
        return Array.isArray(value) ? value : [];
      }
    },
    maxVisitsPerMonth: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1
      }
    },
    allowedFacilities: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      get() {
        const value = this.getDataValue('allowedFacilities');
        return Array.isArray(value) ? value : [];
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    isPopular: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    displayOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    sequelize,
    modelName: 'MembershipPlan',
    paranoid: true
  });

  return MembershipPlan;
};
```

---

## 🎮 Controller Implementation

**File:** `src/controllers/gym/membershipPlanController.js`

```javascript
const { MembershipPlan, Tenant } = require('../../models');
const { Op } = require('sequelize');

/**
 * Create membership plan
 */
exports.createMembershipPlan = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const {
      name,
      description,
      duration,
      durationType,
      price,
      currency,
      benefits,
      maxVisitsPerMonth,
      allowedFacilities,
      isPopular,
      displayOrder
    } = req.body;

    // Check duplicate name
    const existing = await MembershipPlan.findOne({
      where: { tenantId, name }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Membership plan with this name already exists'
      });
    }

    const plan = await MembershipPlan.create({
      tenantId,
      name,
      description,
      duration,
      durationType: durationType || 'months',
      price,
      currency: currency || 'IDR',
      benefits: benefits || [],
      maxVisitsPerMonth,
      allowedFacilities: allowedFacilities || [],
      isPopular: isPopular || false,
      displayOrder: displayOrder || 0,
      isActive: true
    });

    res.status(201).json({
      success: true,
      message: 'Membership plan created successfully',
      data: plan
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get all membership plans
 */
exports.getAllMembershipPlans = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { 
      page = 1, 
      limit = 10, 
      search,
      isActive,
      sortBy = 'displayOrder',
      order = 'ASC'
    } = req.query;

    const offset = (page - 1) * limit;
    
    // Build where clause
    const where = isSuperAdmin ? {} : { tenantId };
    
    if (search) {
      where.name = { [Op.iLike]: `%${search}%` };
    }
    
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const { count, rows } = await MembershipPlan.findAndCountAll({
      where,
      include: [{
        model: Tenant,
        as: 'tenant',
        attributes: ['id', 'name']
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, order.toUpperCase()]]
    });

    res.json({
      success: true,
      data: {
        plans: rows,
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
 * Get membership plan by ID
 */
exports.getMembershipPlanById = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const plan = await MembershipPlan.findOne({
      where,
      include: [{
        model: Tenant,
        as: 'tenant',
        attributes: ['id', 'name']
      }]
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Membership plan not found'
      });
    }

    res.json({
      success: true,
      data: plan
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Update membership plan
 */
exports.updateMembershipPlan = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;
    const {
      name,
      description,
      duration,
      durationType,
      price,
      currency,
      benefits,
      maxVisitsPerMonth,
      allowedFacilities,
      isActive,
      isPopular,
      displayOrder
    } = req.body;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const plan = await MembershipPlan.findOne({ where });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Membership plan not found'
      });
    }

    // Check duplicate name if changed
    if (name && name !== plan.name) {
      const existing = await MembershipPlan.findOne({
        where: {
          tenantId: plan.tenantId,
          name,
          id: { [Op.ne]: id }
        }
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Membership plan with this name already exists'
        });
      }
    }

    await plan.update({
      name: name || plan.name,
      description,
      duration: duration || plan.duration,
      durationType: durationType || plan.durationType,
      price: price !== undefined ? price : plan.price,
      currency: currency || plan.currency,
      benefits: benefits || plan.benefits,
      maxVisitsPerMonth,
      allowedFacilities: allowedFacilities || plan.allowedFacilities,
      isActive: isActive !== undefined ? isActive : plan.isActive,
      isPopular: isPopular !== undefined ? isPopular : plan.isPopular,
      displayOrder: displayOrder !== undefined ? displayOrder : plan.displayOrder
    });

    res.json({
      success: true,
      message: 'Membership plan updated successfully',
      data: plan
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Delete membership plan (soft delete)
 */
exports.deleteMembershipPlan = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const plan = await MembershipPlan.findOne({ where });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Membership plan not found'
      });
    }

    // Check if plan has active memberships
    const { Membership } = require('../../models');
    const activeMembershipsCount = await Membership.count({
      where: {
        membershipPlanId: id,
        status: 'active'
      }
    });

    if (activeMembershipsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete plan. ${activeMembershipsCount} active membership(s) using this plan`
      });
    }

    await plan.destroy();

    res.json({
      success: true,
      message: 'Membership plan deleted successfully'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get active/public plans (for POS/frontend)
 */
exports.getActivePlans = async (req, res, next) => {
  try {
    const { tenantId } = req.user;

    const plans = await MembershipPlan.findAll({
      where: {
        tenantId,
        isActive: true
      },
      order: [
        ['isPopular', 'DESC'],
        ['displayOrder', 'ASC'],
        ['price', 'ASC']
      ]
    });

    res.json({
      success: true,
      data: plans
    });

  } catch (error) {
    next(error);
  }
};
```

---

## 🛣️ Routes

**File:** `src/routes/gym/membershipPlan.routes.js`

```javascript
const express = require('express');
const router = express.Router();
const membershipPlanController = require('../../controllers/gym/membershipPlanController');
const { authenticate } = require('../../middlewares/authMiddleware');
const { authorizeCasl } = require('../../middlewares/caslMiddleware');

// All routes require authentication
router.use(authenticate);

// Get active plans (public for staff/POS)
router.get('/active',
  authorizeCasl('read', 'MembershipPlan'),
  membershipPlanController.getActivePlans
);

// Create plan
router.post('/',
  authorizeCasl('create', 'MembershipPlan'),
  membershipPlanController.createMembershipPlan
);

// Get all plans
router.get('/',
  authorizeCasl('read', 'MembershipPlan'),
  membershipPlanController.getAllMembershipPlans
);

// Get plan by ID
router.get('/:id',
  authorizeCasl('read', 'MembershipPlan'),
  membershipPlanController.getMembershipPlanById
);

// Update plan
router.put('/:id',
  authorizeCasl('update', 'MembershipPlan'),
  membershipPlanController.updateMembershipPlan
);

// Delete plan
router.delete('/:id',
  authorizeCasl('delete', 'MembershipPlan'),
  membershipPlanController.deleteMembershipPlan
);

module.exports = router;
```

---

## 🧪 Testing

### Create Membership Plan

```bash
POST /api/v1/gym/membership-plans
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Gold Monthly",
  "description": "Premium monthly membership with full access",
  "duration": 30,
  "durationType": "months",
  "price": 500000,
  "currency": "IDR",
  "benefits": [
    "Access to all gym equipment",
    "Access to swimming pool",
    "Access to sauna",
    "1 free personal training session",
    "Free locker"
  ],
  "maxVisitsPerMonth": null,
  "allowedFacilities": ["gym", "pool", "sauna"],
  "isPopular": true,
  "displayOrder": 1
}
```

### Get Active Plans (for POS)

```bash
GET /api/v1/gym/membership-plans/active
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Gold Monthly",
      "price": "500000.00",
      "duration": 30,
      "durationType": "months",
      "isPopular": true
    }
  ]
}
```

---

## 💰 Integration dengan Transaction

Saat membership plan dibeli via POS:

```javascript
// Create transaction with membership item
const transaction = await Transaction.create({
  tenantId,
  customerId: memberId,
  customerType: 'member',
  // ... other fields
});

// Add membership as transaction item
const transactionItem = await TransactionItem.create({
  transactionId: transaction.id,
  itemType: 'membership',
  itemId: membershipPlan.id,
  itemName: membershipPlan.name,
  quantity: 1,
  unitPrice: membershipPlan.price,
  // ... calculate totals
});

// After payment completed, create Membership record
const membership = await Membership.create({
  memberId,
  membershipPlanId: membershipPlan.id,
  startDate: new Date(),
  endDate: membershipPlan.calculateEndDate(new Date()),
  status: 'active'
});
```

---

## 📝 Sample Data (Seeder)

```javascript
// Gold Monthly
{
  name: 'Gold Monthly',
  duration: 30,
  durationType: 'months',
  price: 500000,
  isPopular: true
}

// Silver 3-Month
{
  name: 'Silver 3-Month',
  duration: 90,
  durationType: 'months',
  price: 1200000,
  isPopular: false
}

// Platinum Annual
{
  name: 'Platinum Annual',
  duration: 365,
  durationType: 'years',
  price: 5000000,
  isPopular: true
}

// Basic Monthly
{
  name: 'Basic Monthly',
  duration: 30,
  durationType: 'months',
  price: 300000,
  maxVisitsPerMonth: 12 // 12 visits per month
}
```

---

**Version:** 1.0  
**Last Updated:** November 23, 2025  
**Status:** Ready for Implementation
