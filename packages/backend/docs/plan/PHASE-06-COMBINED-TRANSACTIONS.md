# FASE 6: COMBINED MULTI-MODULE TRANSACTIONS
## Transaksi Gabungan: Membership + Classes + Café dalam 1 Bill

**Status**: 📋 Planning  
**Prioritas**: 🟡 Medium  
**Estimasi**: 2 minggu  
**Dependencies**: Fase 2 (POS & Restaurant), Fase 5 (Transaction Sequences)

---

## 🎯 Tujuan Fase Ini

Mengimplementasikan kemampuan **combined billing** dimana 1 transaksi bisa mengandung:

1. **Membership purchase** - Beli/renew membership gym
2. **Class booking/payment** - Bayar kelas (yoga, spinning, boxing, dll)
3. **POS items** - Beli produk retail (merchandise, suplemen, dll)
4. **Restaurant/Café** - Order makanan/minuman
5. **Multiple payment methods** - Split payment (cash + card, dll)
6. **Voucher/discount** - Apply discount ke combined transaction
7. **Atomic operations** - All-or-nothing transaction processing

**Use Cases:**
- Member beli membership + kelas + protein shake dalam 1 transaksi
- Member order makanan + beli merchandise sambil check-in
- Café customer (non-member) order makanan + beli supplement

---

## 📊 Current Architecture Review

### Existing `Transaction` Model (Already Good!)

```javascript
// models/transaction.js (EXISTING - REVIEW)
Transaction.init({
  id: UUID,
  tenantId: UUID,
  transactionNumber: STRING,
  
  // Customer Info
  customerId: UUID,           // Could be Member or null (walk-in)
  customerType: ENUM('member', 'non-member'),
  customerName: STRING,       // For non-members
  
  // Amounts
  subtotalAmount: DECIMAL,
  taxAmount: DECIMAL,
  discountAmount: DECIMAL,
  totalAmount: DECIMAL,
  
  // Voucher
  voucherId: UUID,
  
  // Reference
  restaurantTableId: UUID,    // If ordered from table
  
  // Status
  status: ENUM('pending', 'completed', 'cancelled', 'refunded'),
  
  // Audit
  createdBy: UUID,
  version: INTEGER,           // Optimistic locking
  // ... timestamps
});
```

### Existing `TransactionItem` Model (Already Polymorphic!)

```javascript
// models/transactionItem.js (EXISTING - REVIEW)
TransactionItem.init({
  id: UUID,
  transactionId: UUID,
  
  // Polymorphic Item
  itemType: ENUM('membership', 'product'),  // ⭐ Need to ADD 'class'
  itemId: UUID,                             // Can reference Membership or Product
  
  quantity: INTEGER,
  unitPrice: DECIMAL,
  totalPrice: DECIMAL,
  
  taxAmount: DECIMAL,
  discountAmount: DECIMAL,
  
  notes: TEXT,
  metadata: JSONB,
  
  // ... timestamps
});
```

### Existing `TransactionPayment` Model (Supports Multiple Payments!)

```javascript
// models/transactionPayment.js (EXISTING - GOOD)
TransactionPayment.init({
  id: UUID,
  transactionId: UUID,
  
  amount: DECIMAL,
  paymentMethod: ENUM('cash', 'credit_card', 'debit_card', 'bank_transfer', 'e_wallet', 'qris', 'other'),
  
  paymentGatewayRef: STRING,
  notes: TEXT,
  
  // ... timestamps
});
```

**Conclusion:** Architecture sudah sangat baik! Tinggal:
1. Extend `itemType` untuk support 'class'
2. Create `Class` model
3. Enhance `transactionController` untuk handle complex validation

---

## 🏗️ New Models Needed

### 1. Model `Class` (NEW)

```javascript
// models/class.js
Class.init({
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  tenantId: { type: DataTypes.UUID, allowNull: false },
  locationId: { type: DataTypes.UUID },
  
  // Class Info
  name: { type: DataTypes.STRING, allowNull: false },  // e.g., "Yoga", "Spinning", "Boxing"
  description: DataTypes.TEXT,
  
  // Category
  categoryId: { type: DataTypes.UUID },  // FK ke ClassCategory
  
  // Pricing
  price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  dropInPrice: { type: DataTypes.DECIMAL(10, 2) },  // Harga untuk non-member
  
  // Capacity
  maxCapacity: { type: DataTypes.INTEGER, defaultValue: 20 },
  
  // Duration
  durationMinutes: { type: DataTypes.INTEGER, defaultValue: 60 },
  
  // Instructor
  instructorId: { type: DataTypes.UUID },  // FK ke User (instructor)
  
  // Status
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  
  // Audit
  createdAt: DataTypes.DATE,
  updatedAt: DataTypes.DATE,
  deletedAt: DataTypes.DATE
}, {
  sequelize,
  modelName: 'Class',
  tableName: 'Classes',
  paranoid: true,
  indexes: [
    { fields: ['tenantId'] },
    { fields: ['locationId'] },
    { fields: ['categoryId'] },
    { fields: ['instructorId'] }
  ]
});
```

### 2. Model `ClassSchedule` (NEW)

```javascript
// models/classSchedule.js
ClassSchedule.init({
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  tenantId: { type: DataTypes.UUID, allowNull: false },
  classId: { type: DataTypes.UUID, allowNull: false },
  locationId: { type: DataTypes.UUID },
  
  // Schedule
  scheduleDate: { type: DataTypes.DATEONLY, allowNull: false },
  startTime: { type: DataTypes.TIME, allowNull: false },
  endTime: { type: DataTypes.TIME, allowNull: false },
  
  // Instructor (bisa override dari Class)
  instructorId: { type: DataTypes.UUID },
  
  // Capacity (bisa override dari Class)
  maxCapacity: DataTypes.INTEGER,
  currentBookings: { type: DataTypes.INTEGER, defaultValue: 0 },
  
  // Status
  status: {
    type: DataTypes.ENUM('scheduled', 'ongoing', 'completed', 'cancelled'),
    defaultValue: 'scheduled'
  },
  
  // Notes
  notes: DataTypes.TEXT,
  
  // Audit
  createdAt: DataTypes.DATE,
  updatedAt: DataTypes.DATE,
  deletedAt: DataTypes.DATE
}, {
  sequelize,
  modelName: 'ClassSchedule',
  tableName: 'ClassSchedules',
  paranoid: true,
  indexes: [
    { fields: ['tenantId'] },
    { fields: ['classId'] },
    { fields: ['scheduleDate'] },
    { fields: ['status'] },
    { fields: ['scheduleDate', 'startTime'] }
  ]
});
```

### 3. Model `ClassBooking` (NEW)

```javascript
// models/classBooking.js
ClassBooking.init({
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  tenantId: { type: DataTypes.UUID, allowNull: false },
  classScheduleId: { type: DataTypes.UUID, allowNull: false },
  memberId: { type: DataTypes.UUID, allowNull: false },
  
  // Payment Reference
  transactionId: { type: DataTypes.UUID },  // FK ke Transaction
  transactionItemId: { type: DataTypes.UUID },  // FK ke TransactionItem
  
  // Booking Status
  status: {
    type: DataTypes.ENUM('booked', 'attended', 'no-show', 'cancelled'),
    defaultValue: 'booked'
  },
  
  // Check-in
  checkedInAt: DataTypes.DATE,
  
  // Notes
  notes: DataTypes.TEXT,
  
  // Audit
  createdAt: DataTypes.DATE,
  updatedAt: DataTypes.DATE,
  deletedAt: DataTypes.DATE
}, {
  sequelize,
  modelName: 'ClassBooking',
  tableName: 'ClassBookings',
  paranoid: true,
  indexes: [
    { fields: ['tenantId'] },
    { fields: ['classScheduleId'] },
    { fields: ['memberId'] },
    { fields: ['transactionId'] },
    { fields: ['status'] }
  ]
});
```

### 4. Model `ClassCategory` (NEW)

```javascript
// models/classCategory.js
ClassCategory.init({
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  tenantId: { type: DataTypes.UUID, allowNull: false },
  
  name: { type: DataTypes.STRING, allowNull: false },
  description: DataTypes.TEXT,
  color: DataTypes.STRING,
  icon: DataTypes.STRING,
  
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  
  createdAt: DataTypes.DATE,
  updatedAt: DataTypes.DATE,
  deletedAt: DataTypes.DATE
}, {
  sequelize,
  modelName: 'ClassCategory',
  tableName: 'ClassCategories',
  paranoid: true,
  indexes: [
    { fields: ['tenantId'] }
  ]
});
```

### 5. Associations

```javascript
// models/index.js (ADD)

// Class associations
Class.belongsTo(Tenant, { foreignKey: 'tenantId' });
Class.belongsTo(Location, { as: 'location', foreignKey: 'locationId' });
Class.belongsTo(ClassCategory, { as: 'category', foreignKey: 'categoryId' });
Class.belongsTo(User, { as: 'instructor', foreignKey: 'instructorId' });
Class.hasMany(ClassSchedule, { as: 'schedules', foreignKey: 'classId' });

ClassCategory.belongsTo(Tenant, { foreignKey: 'tenantId' });
ClassCategory.hasMany(Class, { as: 'classes', foreignKey: 'categoryId' });

ClassSchedule.belongsTo(Tenant, { foreignKey: 'tenantId' });
ClassSchedule.belongsTo(Class, { as: 'class', foreignKey: 'classId' });
ClassSchedule.belongsTo(Location, { as: 'location', foreignKey: 'locationId' });
ClassSchedule.belongsTo(User, { as: 'instructor', foreignKey: 'instructorId' });
ClassSchedule.hasMany(ClassBooking, { as: 'bookings', foreignKey: 'classScheduleId' });

ClassBooking.belongsTo(Tenant, { foreignKey: 'tenantId' });
ClassBooking.belongsTo(ClassSchedule, { as: 'schedule', foreignKey: 'classScheduleId' });
ClassBooking.belongsTo(Member, { as: 'member', foreignKey: 'memberId' });
ClassBooking.belongsTo(Transaction, { as: 'transaction', foreignKey: 'transactionId' });
ClassBooking.belongsTo(TransactionItem, { as: 'transactionItem', foreignKey: 'transactionItemId' });

// Update TransactionItem polymorphic association
TransactionItem.belongsTo(Membership, { as: 'membership', foreignKey: 'itemId', constraints: false });
TransactionItem.belongsTo(Product, { as: 'product', foreignKey: 'itemId', constraints: false });
TransactionItem.belongsTo(Class, { as: 'class', foreignKey: 'itemId', constraints: false });  // NEW
```

---

## 🔄 Update Existing Models

### Extend `TransactionItem.itemType`

```javascript
// migrations/YYYYMMDDHHMMSS-add-class-to-transaction-item-type.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add 'class' to itemType enum
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_TransactionItems_itemType" 
      ADD VALUE 'class';
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Cannot remove enum value in PostgreSQL
    // Need to recreate enum if rollback needed
  }
};
```

---

## 🎮 Enhanced Transaction Controller

### Combined Transaction Creation

```javascript
// controllers/transactionController.js (ENHANCE)
const { 
  Transaction, TransactionItem, TransactionPayment,
  Product, Membership, Class, ClassSchedule, ClassBooking,
  Member, Voucher, StockMovement
} = require('../models');
const { sequelize } = require('../models');
const sequenceService = require('../services/sequenceService');

class TransactionController {
  /**
   * Create combined transaction
   * POST /api/v1/transactions/combined
   */
  async createCombinedTransaction(req, res) {
    const transaction = await sequelize.transaction({
      isolationLevel: sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE
    });
    
    try {
      const tenantId = req.user.tenantId;
      const {
        customerId,
        customerType,
        customerName,
        items,              // Array of { type, id, quantity, notes }
        payments,           // Array of { method, amount }
        voucherId,
        restaurantTableId,
        notes
      } = req.body;
      
      // === VALIDATION ===
      
      if (!items || items.length === 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'At least one item is required'
        });
      }
      
      // Validate customer
      if (customerType === 'member' && !customerId) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Customer ID required for member transactions'
        });
      }
      
      // === PROCESS ITEMS ===
      
      const processedItems = [];
      let subtotal = 0;
      let totalTax = 0;
      let totalDiscount = 0;
      
      for (const item of items) {
        let processedItem;
        
        if (item.type === 'product') {
          processedItem = await this.processProductItem(item, tenantId, transaction);
        } else if (item.type === 'membership') {
          processedItem = await this.processMembershipItem(item, tenantId, customerId, transaction);
        } else if (item.type === 'class') {
          processedItem = await this.processClassItem(item, tenantId, customerId, transaction);
        } else {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: `Invalid item type: ${item.type}`
          });
        }
        
        processedItems.push(processedItem);
        subtotal += parseFloat(processedItem.totalPrice);
        totalTax += parseFloat(processedItem.taxAmount || 0);
      }
      
      // === APPLY VOUCHER ===
      
      if (voucherId) {
        const voucher = await Voucher.findByPk(voucherId, { transaction });
        
        if (!voucher || !voucher.isActive) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: 'Invalid or inactive voucher'
          });
        }
        
        // Calculate discount
        if (voucher.discountType === 'percentage') {
          totalDiscount = subtotal * (parseFloat(voucher.discountValue) / 100);
          if (voucher.maxDiscountAmount) {
            totalDiscount = Math.min(totalDiscount, parseFloat(voucher.maxDiscountAmount));
          }
        } else {
          totalDiscount = parseFloat(voucher.discountValue);
        }
        
        // Check min purchase
        if (voucher.minPurchaseAmount && subtotal < parseFloat(voucher.minPurchaseAmount)) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: `Minimum purchase amount for this voucher is ${voucher.minPurchaseAmount}`
          });
        }
      }
      
      const totalAmount = subtotal + totalTax - totalDiscount;
      
      // === VALIDATE PAYMENTS ===
      
      if (!payments || payments.length === 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'At least one payment method is required'
        });
      }
      
      const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      
      if (Math.abs(totalPaid - totalAmount) > 0.01) {  // Allow 1 cent difference for rounding
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Payment amount mismatch. Total: ${totalAmount}, Paid: ${totalPaid}`
        });
      }
      
      // === CREATE TRANSACTION ===
      
      const transactionNumber = await sequenceService.generateNext(tenantId, 'transaction');
      
      const newTransaction = await Transaction.create({
        tenantId,
        transactionNumber,
        customerId,
        customerType,
        customerName,
        subtotalAmount: subtotal,
        taxAmount: totalTax,
        discountAmount: totalDiscount,
        totalAmount,
        voucherId,
        restaurantTableId,
        status: 'completed',
        notes,
        createdBy: req.user.id
      }, { transaction });
      
      // === CREATE TRANSACTION ITEMS ===
      
      for (const processedItem of processedItems) {
        const transactionItem = await TransactionItem.create({
          transactionId: newTransaction.id,
          itemType: processedItem.type,
          itemId: processedItem.id,
          quantity: processedItem.quantity,
          unitPrice: processedItem.unitPrice,
          totalPrice: processedItem.totalPrice,
          taxAmount: processedItem.taxAmount,
          discountAmount: 0,  // Item-level discount bisa ditambahkan nanti
          notes: processedItem.notes,
          metadata: processedItem.metadata
        }, { transaction });
        
        // Link class booking jika ada
        if (processedItem.type === 'class' && processedItem.bookingId) {
          await ClassBooking.update({
            transactionId: newTransaction.id,
            transactionItemId: transactionItem.id
          }, {
            where: { id: processedItem.bookingId },
            transaction
          });
        }
        
        // Activate membership jika ada
        if (processedItem.type === 'membership' && processedItem.membershipId) {
          await Membership.update({
            status: 'active',
            activatedAt: new Date()
          }, {
            where: { id: processedItem.membershipId },
            transaction
          });
        }
      }
      
      // === CREATE PAYMENTS ===
      
      for (const payment of payments) {
        const receiptNumber = await sequenceService.generateNext(tenantId, 'receipt');
        
        await TransactionPayment.create({
          transactionId: newTransaction.id,
          amount: payment.amount,
          paymentMethod: payment.method,
          receiptNumber,
          paymentGatewayRef: payment.gatewayRef,
          notes: payment.notes
        }, { transaction });
      }
      
      // === UPDATE VOUCHER USAGE ===
      
      if (voucherId) {
        await VoucherUsage.create({
          tenantId,
          voucherId,
          transactionId: newTransaction.id,
          memberId: customerId,
          discountAmount: totalDiscount
        }, { transaction });
      }
      
      // === COMMIT ===
      
      await transaction.commit();
      
      // === AUTO-PRINT (async, non-blocking) ===
      
      if (req.subscriptionFeatures?.printing?.autoPrint) {
        const printingService = require('../services/printingService');
        printingService.autoPrintTransaction(newTransaction.id, req.user.id)
          .catch(err => console.error('Auto-print failed:', err));
      }
      
      // === RESPONSE ===
      
      await newTransaction.reload({
        include: [
          { 
            model: TransactionItem, 
            as: 'items',
            include: [
              { model: Product, as: 'product' },
              { model: Membership, as: 'membership' },
              { model: Class, as: 'class' }
            ]
          },
          { model: TransactionPayment, as: 'payments' },
          { model: Voucher, as: 'voucher' }
        ]
      });
      
      res.status(201).json({
        success: true,
        data: newTransaction
      });
      
    } catch (error) {
      await transaction.rollback();
      console.error('Create combined transaction error:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating transaction',
        error: error.message
      });
    }
  }
  
  // === HELPER METHODS ===
  
  async processProductItem(item, tenantId, transaction) {
    const product = await Product.findOne({
      where: { id: item.id, tenantId },
      lock: transaction.LOCK.UPDATE,
      transaction
    });
    
    if (!product) {
      throw new Error(`Product not found: ${item.id}`);
    }
    
    if (!product.isAvailable) {
      throw new Error(`Product not available: ${product.name}`);
    }
    
    // Check stock
    if (product.trackInventory && product.stockQuantity < item.quantity) {
      throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stockQuantity}`);
    }
    
    // Deduct stock
    if (product.trackInventory) {
      await product.update({
        stockQuantity: product.stockQuantity - item.quantity
      }, { transaction });
      
      // Create stock movement
      await StockMovement.create({
        tenantId,
        productId: product.id,
        locationId: product.locationId,
        movementType: 'out',
        quantity: -item.quantity,
        previousQuantity: product.stockQuantity + item.quantity,
        newQuantity: product.stockQuantity,
        referenceType: 'sale',
        notes: `Sale via transaction`
      }, { transaction });
    }
    
    const unitPrice = parseFloat(product.price);
    const totalPrice = unitPrice * item.quantity;
    const taxAmount = product.taxable ? totalPrice * (parseFloat(product.taxRate) / 100) : 0;
    
    return {
      type: 'product',
      id: product.id,
      quantity: item.quantity,
      unitPrice,
      totalPrice,
      taxAmount,
      notes: item.notes,
      metadata: {}
    };
  }
  
  async processMembershipItem(item, tenantId, memberId, transaction) {
    // Get membership type
    const membershipType = await MembershipType.findOne({
      where: { id: item.membershipTypeId, tenantId },
      transaction
    });
    
    if (!membershipType) {
      throw new Error('Membership type not found');
    }
    
    // Create membership record
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + membershipType.durationDays);
    
    const membership = await Membership.create({
      tenantId,
      memberId,
      membershipTypeId: membershipType.id,
      startDate,
      endDate,
      status: 'pending',  // Will be activated after transaction commit
      price: membershipType.price
    }, { transaction });
    
    return {
      type: 'membership',
      id: membership.id,
      membershipId: membership.id,
      quantity: 1,
      unitPrice: parseFloat(membershipType.price),
      totalPrice: parseFloat(membershipType.price),
      taxAmount: 0,
      notes: item.notes,
      metadata: {
        membershipType: membershipType.name,
        startDate,
        endDate
      }
    };
  }
  
  async processClassItem(item, tenantId, memberId, transaction) {
    const classSchedule = await ClassSchedule.findOne({
      where: { id: item.classScheduleId, tenantId },
      include: [{ model: Class, as: 'class' }],
      lock: transaction.LOCK.UPDATE,
      transaction
    });
    
    if (!classSchedule) {
      throw new Error('Class schedule not found');
    }
    
    if (classSchedule.status !== 'scheduled') {
      throw new Error(`Class is ${classSchedule.status}, cannot book`);
    }
    
    // Check capacity
    if (classSchedule.currentBookings >= classSchedule.maxCapacity) {
      throw new Error('Class is full');
    }
    
    // Check if already booked
    const existingBooking = await ClassBooking.findOne({
      where: {
        classScheduleId: classSchedule.id,
        memberId,
        status: { [Op.in]: ['booked', 'attended'] }
      },
      transaction
    });
    
    if (existingBooking) {
      throw new Error('Already booked for this class');
    }
    
    // Create booking
    const booking = await ClassBooking.create({
      tenantId,
      classScheduleId: classSchedule.id,
      memberId,
      status: 'booked'
    }, { transaction });
    
    // Update class capacity
    await classSchedule.update({
      currentBookings: classSchedule.currentBookings + 1
    }, { transaction });
    
    // Get member to check if member atau drop-in
    const member = await Member.findByPk(memberId, { transaction });
    const price = member ? classSchedule.class.price : classSchedule.class.dropInPrice;
    
    return {
      type: 'class',
      id: classSchedule.class.id,
      bookingId: booking.id,
      quantity: 1,
      unitPrice: parseFloat(price),
      totalPrice: parseFloat(price),
      taxAmount: 0,
      notes: item.notes,
      metadata: {
        className: classSchedule.class.name,
        scheduleDate: classSchedule.scheduleDate,
        startTime: classSchedule.startTime,
        endTime: classSchedule.endTime
      }
    };
  }
}

module.exports = new TransactionController();
```

---

## 🛣️ Routes

```javascript
// routes/v1/transactionRoutes.js (ADD)
const { requireFeature } = require('../../middlewares/featureGateMiddleware');

// Combined transaction
router.post('/transactions/combined',
  requireFeature('transactions', 'combinedBilling'),
  transactionController.createCombinedTransaction
);
```

---

## 📝 API Request Example

```json
{
  "customerId": "member-uuid",
  "customerType": "member",
  "items": [
    {
      "type": "membership",
      "membershipTypeId": "membership-type-uuid",
      "notes": "Renew membership"
    },
    {
      "type": "class",
      "classScheduleId": "class-schedule-uuid",
      "notes": "Yoga class booking"
    },
    {
      "type": "product",
      "id": "product-uuid-1",
      "quantity": 2,
      "notes": "Protein shake"
    },
    {
      "type": "product",
      "id": "product-uuid-2",
      "quantity": 1,
      "notes": "Gym towel"
    }
  ],
  "payments": [
    {
      "method": "cash",
      "amount": 500000
    },
    {
      "method": "credit_card",
      "amount": 300000,
      "gatewayRef": "midtrans-ref-123"
    }
  ],
  "voucherId": "voucher-uuid",
  "notes": "Member beli membership + kelas + produk"
}
```

---

## 📝 Implementation Checklist

### Week 1: Models & Database
- [ ] Day 1-2: Create Class, ClassSchedule, ClassBooking, ClassCategory models
- [ ] Day 3: Migrations & associations
- [ ] Day 4-5: Seeders & testing

### Week 2: Transaction Logic
- [ ] Day 6-8: Enhance transactionController dengan combined logic
- [ ] Day 9: Testing (unit + integration)
- [ ] Day 10: Documentation & deployment

---

**Status**: Ready for implementation ✅  
**Next**: [PHASE-07-THIRD-PARTY-INTEGRATIONS.md](./PHASE-07-THIRD-PARTY-INTEGRATIONS.md)
