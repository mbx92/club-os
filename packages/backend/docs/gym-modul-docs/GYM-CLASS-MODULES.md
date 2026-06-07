# 🏃 Class & Class Package Modules - Gym Membership System

## 📋 Overview

Dua modul terkait class management:
1. **Class Module** - Jadwal kelas gym (yoga, spinning, boxing, dll)
2. **Class Package Module** - Paket kelas yang bisa dibeli member

---

# 📅 Class Module

## 🎯 Key Features

- ✅ **Class Scheduling** - Recurring atau one-time classes
- ✅ **Trainer Assignment** - Link ke trainer
- ✅ **Capacity Management** - Max participants
- ✅ **Booking System** - Member bisa book class
- ✅ **Attendance Tracking** - Track kehadiran
- ✅ **Commission Calculation** - Auto-create trainer commission

---

## 📊 Database Schema

### Model: Class

```javascript
Class {
  id: UUID (PK),
  tenantId: UUID (FK → Tenant),
  trainerId: UUID (FK → Trainer),
  
  // Class Info
  name: String (e.g., "Morning Yoga", "Spinning Class"),
  description: Text,
  classType: String (e.g., "yoga", "spinning", "boxing"),
  
  // Schedule
  scheduleDate: Date,
  startTime: Time,
  endTime: Time,
  duration: Integer (in minutes),
  isRecurring: Boolean,
  recurrencePattern: JSON, // { frequency: 'weekly', days: ['monday', 'wednesday'] }
  
  // Capacity
  maxParticipants: Integer,
  currentParticipants: Integer (calculated),
  
  // Pricing (optional, jika class bisa dibeli terpisah)
  price: Decimal(10, 2),
  
  // Status
  status: Enum('scheduled', 'ongoing', 'completed', 'cancelled'),
  isActive: Boolean,
  
  // Timestamps
  createdAt: DateTime,
  updatedAt: DateTime,
  deletedAt: DateTime
}
```

### Model: ClassBooking

```javascript
ClassBooking {
  id: UUID (PK),
  tenantId: UUID (FK → Tenant),
  classId: UUID (FK → Class),
  memberId: UUID (FK → Member),
  classPackageId: UUID (FK → ClassPackage, nullable),
  
  // Booking Info
  bookingDate: DateTime,
  status: Enum('booked', 'attended', 'cancelled', 'no_show'),
  
  // Payment (if separate payment)
  isPaid: Boolean,
  paidAmount: Decimal(10, 2),
  transactionId: UUID (FK → Transaction, nullable),
  
  // Attendance
  checkedInAt: DateTime,
  checkedInBy: UUID (FK → User),
  
  // Notes
  notes: Text,
  
  // Timestamps
  createdAt: DateTime,
  updatedAt: DateTime
}
```

### Relasi

```
Class
├── belongsTo Tenant (tenantId)
├── belongsTo Trainer (trainerId)
├── hasMany ClassBooking (classId)
└── hasMany TrainerCommission (classId)

ClassBooking
├── belongsTo Class (classId)
├── belongsTo Member (memberId)
└── belongsTo ClassPackage (classPackageId)
```

---

## 🔧 Migration: Create Class

```javascript
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Classes', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Tenants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      trainerId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Trainers', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      classType: {
        type: Sequelize.STRING,
        allowNull: false
      },
      scheduleDate: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      startTime: {
        type: Sequelize.TIME,
        allowNull: false
      },
      endTime: {
        type: Sequelize.TIME,
        allowNull: false
      },
      duration: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Duration in minutes'
      },
      isRecurring: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      recurrencePattern: {
        type: Sequelize.JSON,
        allowNull: true
      },
      maxParticipants: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 20
      },
      currentParticipants: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0
      },
      status: {
        type: Sequelize.ENUM('scheduled', 'ongoing', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'scheduled'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
      deletedAt: { type: Sequelize.DATE, allowNull: true }
    });

    await queryInterface.addIndex('Classes', ['tenantId']);
    await queryInterface.addIndex('Classes', ['trainerId']);
    await queryInterface.addIndex('Classes', ['scheduleDate']);
    await queryInterface.addIndex('Classes', ['status']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Classes');
  }
};
```

## 🔧 Migration: Create ClassBooking

```javascript
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ClassBookings', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Tenants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      classId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Classes', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      memberId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Members', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      classPackageId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'ClassPackages', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      bookingDate: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      status: {
        type: Sequelize.ENUM('booked', 'attended', 'cancelled', 'no_show'),
        allowNull: false,
        defaultValue: 'booked'
      },
      isPaid: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      paidAmount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      transactionId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'Transactions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      checkedInAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      checkedInBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });

    await queryInterface.addIndex('ClassBookings', ['tenantId']);
    await queryInterface.addIndex('ClassBookings', ['classId']);
    await queryInterface.addIndex('ClassBookings', ['memberId']);
    await queryInterface.addIndex('ClassBookings', ['status']);
    await queryInterface.addIndex('ClassBookings', ['classId', 'memberId'], { unique: true });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('ClassBookings');
  }
};
```

---

# 📦 Class Package Module

## 🎯 Key Features

- ✅ **Package Plans** - Define package dengan jumlah sessions
- ✅ **Active Packages** - Track package yang dimiliki member
- ✅ **Session Tracking** - Decrement remaining sessions
- ✅ **Validity Period** - Package expire setelah X days
- ✅ **POS Integration** - Bisa dibeli via transaction
- ✅ **Transaction Link** - Link ke purchase transaction

---

## 📊 Database Schema

### Model: ClassPackagePlan

```javascript
ClassPackagePlan {
  id: UUID (PK),
  tenantId: UUID (FK → Tenant),
  
  // Package Info
  name: String (e.g., "10x Class Package", "20x Yoga Sessions"),
  description: Text,
  
  // Sessions
  sessions: Integer (total sessions in package),
  
  // Pricing
  price: Decimal(10, 2),
  pricePerSession: Decimal(10, 2) (calculated),
  currency: String (default: 'IDR'),
  
  // Validity
  validityDays: Integer (package valid for X days),
  
  // Applicable Classes (optional)
  applicableClassTypes: JSON [], // ["yoga", "spinning"] or [] for all
  
  // Status
  isActive: Boolean,
  isPopular: Boolean,
  displayOrder: Integer,
  
  // Timestamps
  createdAt: DateTime,
  updatedAt: DateTime,
  deletedAt: DateTime
}
```

### Model: ClassPackage (Active Packages)

```javascript
ClassPackage {
  id: UUID (PK),
  tenantId: UUID (FK → Tenant),
  memberId: UUID (FK → Member),
  classPackagePlanId: UUID (FK → ClassPackagePlan),
  
  // Sessions
  totalSessions: Integer,
  remainingSessions: Integer,
  usedSessions: Integer (calculated),
  
  // Validity
  purchaseDate: Date,
  validUntil: Date,
  
  // Status
  status: Enum('active', 'expired', 'depleted'),
  
  // Purchase Link
  purchaseTransactionId: UUID (FK → Transaction),
  
  // Timestamps
  createdAt: DateTime,
  updatedAt: DateTime
}
```

### Relasi

```
ClassPackagePlan
├── belongsTo Tenant (tenantId)
├── hasMany ClassPackage (classPackagePlanId)
└── hasMany TransactionItem (itemId where itemType='class_package')

ClassPackage
├── belongsTo Tenant (tenantId)
├── belongsTo Member (memberId)
├── belongsTo ClassPackagePlan (classPackagePlanId)
├── belongsTo Transaction (purchaseTransactionId)
└── hasMany ClassBooking (classPackageId)
```

---

## 🔧 Migration: Create ClassPackagePlan

```javascript
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ClassPackagePlans', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Tenants', key: 'id' },
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
      sessions: {
        type: Sequelize.INTEGER,
        allowNull: false,
        validate: { min: 1 }
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        validate: { min: 0 }
      },
      pricePerSession: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: 'IDR'
      },
      validityDays: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 30
      },
      applicableClassTypes: {
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
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
      deletedAt: { type: Sequelize.DATE, allowNull: true }
    });

    await queryInterface.addIndex('ClassPackagePlans', ['tenantId']);
    await queryInterface.addIndex('ClassPackagePlans', ['isActive']);
    await queryInterface.addIndex('ClassPackagePlans', ['displayOrder']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('ClassPackagePlans');
  }
};
```

## 🔧 Migration: Create ClassPackage

```javascript
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ClassPackages', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Tenants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      memberId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Members', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      classPackagePlanId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'ClassPackagePlans', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      totalSessions: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      remainingSessions: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      usedSessions: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      purchaseDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      validUntil: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('active', 'expired', 'depleted'),
        allowNull: false,
        defaultValue: 'active'
      },
      purchaseTransactionId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'Transactions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });

    await queryInterface.addIndex('ClassPackages', ['tenantId']);
    await queryInterface.addIndex('ClassPackages', ['memberId']);
    await queryInterface.addIndex('ClassPackages', ['status']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('ClassPackages');
  }
};
```

---

## 🔄 Business Logic Flow

### Flow: Book Class with Package

```javascript
async function bookClass(req, res) {
  const { classId, memberId } = req.body;
  const transaction = await sequelize.transaction();
  
  try {
    // 1. Get class
    const classObj = await Class.findByPk(classId, { transaction });
    
    // 2. Check capacity
    if (classObj.currentParticipants >= classObj.maxParticipants) {
      throw new Error('Class is full');
    }
    
    // 3. Get member's active class package
    const classPackage = await ClassPackage.findOne({
      where: {
        memberId,
        status: 'active',
        remainingSessions: { [Op.gt]: 0 },
        validUntil: { [Op.gte]: new Date() }
      },
      transaction
    });
    
    if (!classPackage) {
      throw new Error('No active class package found');
    }
    
    // 4. Create booking
    const booking = await ClassBooking.create({
      tenantId: req.user.tenantId,
      classId,
      memberId,
      classPackageId: classPackage.id,
      bookingDate: new Date(),
      status: 'booked',
      isPaid: true // Already paid via package
    }, { transaction });
    
    // 5. Decrement remaining sessions
    await classPackage.decrement('remainingSessions', { transaction });
    await classPackage.increment('usedSessions', { transaction });
    
    // 6. Update package status if depleted
    if (classPackage.remainingSessions - 1 === 0) {
      await classPackage.update({ status: 'depleted' }, { transaction });
    }
    
    // 7. Increment class participants
    await classObj.increment('currentParticipants', { transaction });
    
    // 8. Create trainer commission (if configured)
    if (classObj.trainerId) {
      const trainer = await Trainer.findByPk(classObj.trainerId, { transaction });
      if (trainer.commissionValue > 0) {
        await TrainerCommission.create({
          tenantId: req.user.tenantId,
          trainerId: trainer.id,
          classId: classObj.id,
          transactionId: classPackage.purchaseTransactionId,
          baseAmount: classObj.price || 0,
          commissionType: trainer.commissionType,
          commissionRate: trainer.commissionValue,
          status: 'pending'
        }, { transaction });
      }
    }
    
    await transaction.commit();
    
    res.json({
      success: true,
      message: 'Class booked successfully',
      data: {
        booking,
        remainingSessions: classPackage.remainingSessions - 1
      }
    });
    
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
```

---

## 🧪 Sample Data

### Class Package Plans

```javascript
// 10x Class Package
{
  name: '10x Class Package',
  sessions: 10,
  price: 750000,
  pricePerSession: 75000,
  validityDays: 30,
  applicableClassTypes: [] // All classes
}

// 20x Yoga Package
{
  name: '20x Yoga Sessions',
  sessions: 20,
  price: 1200000,
  pricePerSession: 60000,
  validityDays: 60,
  applicableClassTypes: ['yoga']
}

// Unlimited Monthly
{
  name: 'Unlimited Classes - 1 Month',
  sessions: 999,
  price: 2000000,
  pricePerSession: 0,
  validityDays: 30,
  applicableClassTypes: []
}
```

---

## 📝 API Endpoints Summary

```javascript
// Class Management
POST   /api/v1/gym/classes
GET    /api/v1/gym/classes
GET    /api/v1/gym/classes/:id
PUT    /api/v1/gym/classes/:id
DELETE /api/v1/gym/classes/:id
POST   /api/v1/gym/classes/:id/book         // Member book class
GET    /api/v1/gym/classes/:id/bookings     // Get class bookings
POST   /api/v1/gym/classes/:id/check-in     // Check in member

// Class Package Plan
POST   /api/v1/gym/class-package-plans
GET    /api/v1/gym/class-package-plans
GET    /api/v1/gym/class-package-plans/active
GET    /api/v1/gym/class-package-plans/:id
PUT    /api/v1/gym/class-package-plans/:id
DELETE /api/v1/gym/class-package-plans/:id

// Member's Class Packages
GET    /api/v1/gym/members/:memberId/class-packages
GET    /api/v1/gym/class-packages/:id
GET    /api/v1/gym/class-packages/:id/usage-history
```

---

## 🔗 Integration Points

- ✅ **Transaction Module** - Purchase via unified transaction
- ✅ **Trainer Module** - Trainer assignment & commission
- ✅ **Member Module** - Check member's active packages
- ✅ **Voucher Module** - Apply discount on purchase

---

**Version:** 1.0  
**Last Updated:** November 23, 2025  
**Status:** Ready for Implementation
