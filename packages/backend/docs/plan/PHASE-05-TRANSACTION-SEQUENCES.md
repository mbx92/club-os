# FASE 5: ENHANCED TRANSACTION SEQUENCES
## Sistem Auto-Numbering dengan Race Condition Prevention

**Status**: 📋 Planning  
**Prioritas**: 🔴 High (Foundation)  
**Estimasi**: 1 minggu  
**Dependencies**: None (dapat dikerjakan parallel dengan Fase 1)

---

## 🎯 Tujuan Fase Ini

Memperkuat sistem sequence/auto-numbering yang sudah ada dengan:

1. **Database-backed sequences** - Pindah dari in-memory ke database storage
2. **Zero race condition** - Pessimistic locking untuk concurrent requests
3. **Per-tenant isolation** - Sequence terpisah per tenant
4. **Multiple sequence types** - Transaction, Invoice, Receipt, SKU, dll
5. **Configurable formats** - Format nomor dapat dikustomisasi per tenant
6. **Rollover strategies** - Reset sequence per tahun/bulan/hari
7. **Audit trail** - Track semua sequence generation

---

## 📊 Current Implementation

### Existing `sequenceGenerator.js`

```javascript
// utils/sequenceGenerator.js (CURRENT)
const { sequelize } = require('../models');

async function generate(tenantId, sequenceType, prefix = '') {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const day = String(new Date().getDate()).padStart(2, '0');
  
  const datePrefix = sequenceType === 'transaction' 
    ? `${year}${month}${day}` 
    : `${year}${month}`;
  
  // Simple counter (PROBLEM: race condition possible)
  const lastNumber = await getLastSequenceNumber(tenantId, sequenceType, datePrefix);
  const nextNumber = lastNumber + 1;
  const paddedNumber = String(nextNumber).padStart(4, '0');
  
  return `${prefix}-${datePrefix}-${paddedNumber}`;
}
```

**Problems:**
- ⚠️ Race condition saat concurrent requests
- ⚠️ In-memory counter, hilang saat restart
- ⚠️ Tidak ada locking mechanism
- ⚠️ Format tidak flexible

---

## 🏗️ New Architecture

### 1. Model `SequenceCounter` (NEW)

```javascript
// models/sequenceCounter.js
SequenceCounter.init({
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  tenantId: { type: DataTypes.UUID, allowNull: false },
  
  // Sequence Info
  sequenceType: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },  // 'transaction', 'invoice', 'receipt', 'product-sku', etc.
  
  // Period (untuk rollover)
  period: DataTypes.STRING,  // 'YYYYMMDD', 'YYYYMM', 'YYYY', atau 'GLOBAL'
  
  // Counter
  currentValue: { 
    type: DataTypes.INTEGER, 
    defaultValue: 0,
    allowNull: false
  },
  
  // Format Configuration (JSON)
  formatConfig: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  /* Example formatConfig:
  {
    "prefix": "TRX",
    "periodFormat": "YYYYMMDD",     // atau "YYYYMM", "YYYY", null
    "numberLength": 4,               // padding zeros
    "separator": "-",
    "customPattern": "{prefix}{separator}{period}{separator}{number}"
  }
  */
  
  // Constraints
  maxValue: DataTypes.INTEGER,  // Optional: auto-rollover saat reach max
  
  // Last Generated
  lastGeneratedAt: DataTypes.DATE,
  lastGeneratedValue: DataTypes.STRING,  // The actual formatted number
  
  // Audit
  createdAt: DataTypes.DATE,
  updatedAt: DataTypes.DATE
}, {
  sequelize,
  modelName: 'SequenceCounter',
  tableName: 'SequenceCounters',
  timestamps: true,
  indexes: [
    { 
      fields: ['tenantId', 'sequenceType', 'period'], 
      unique: true,
      name: 'unique_sequence_per_tenant_type_period'
    },
    { fields: ['tenantId'] },
    { fields: ['sequenceType'] },
    { fields: ['period'] }
  ]
});
```

### 2. Enhanced Sequence Generator Service

```javascript
// services/sequenceService.js (NEW)
const { SequenceCounter } = require('../models');
const { sequelize } = require('../models');

class SequenceService {
  /**
   * Generate next sequence number dengan pessimistic locking
   */
  async generateNext(tenantId, sequenceType, customFormat = null) {
    const transaction = await sequelize.transaction({
      isolationLevel: sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE
    });
    
    try {
      // Get atau create format config
      const formatConfig = customFormat || this.getDefaultFormat(sequenceType);
      
      // Calculate period
      const period = this.calculatePeriod(formatConfig.periodFormat);
      
      // Find atau create sequence counter dengan LOCK
      let counter = await SequenceCounter.findOne({
        where: {
          tenantId,
          sequenceType,
          period: period || 'GLOBAL'
        },
        lock: transaction.LOCK.UPDATE,  // Pessimistic lock
        transaction
      });
      
      if (!counter) {
        // Create new counter
        counter = await SequenceCounter.create({
          tenantId,
          sequenceType,
          period: period || 'GLOBAL',
          currentValue: 0,
          formatConfig
        }, { transaction });
      }
      
      // Increment counter
      const nextValue = counter.currentValue + 1;
      
      // Check max value
      if (counter.maxValue && nextValue > counter.maxValue) {
        await transaction.rollback();
        throw new Error(`Sequence ${sequenceType} reached max value ${counter.maxValue}`);
      }
      
      // Format number
      const formattedNumber = this.formatNumber(
        nextValue,
        formatConfig,
        period
      );
      
      // Update counter
      await counter.update({
        currentValue: nextValue,
        lastGeneratedAt: new Date(),
        lastGeneratedValue: formattedNumber
      }, { transaction });
      
      await transaction.commit();
      
      return formattedNumber;
    } catch (error) {
      await transaction.rollback();
      console.error('Generate sequence error:', error);
      throw error;
    }
  }
  
  /**
   * Bulk generate sequences (untuk batch operations)
   */
  async generateBulk(tenantId, sequenceType, count, customFormat = null) {
    const transaction = await sequelize.transaction({
      isolationLevel: sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE
    });
    
    try {
      const formatConfig = customFormat || this.getDefaultFormat(sequenceType);
      const period = this.calculatePeriod(formatConfig.periodFormat);
      
      let counter = await SequenceCounter.findOne({
        where: {
          tenantId,
          sequenceType,
          period: period || 'GLOBAL'
        },
        lock: transaction.LOCK.UPDATE,
        transaction
      });
      
      if (!counter) {
        counter = await SequenceCounter.create({
          tenantId,
          sequenceType,
          period: period || 'GLOBAL',
          currentValue: 0,
          formatConfig
        }, { transaction });
      }
      
      const startValue = counter.currentValue + 1;
      const endValue = startValue + count - 1;
      
      if (counter.maxValue && endValue > counter.maxValue) {
        await transaction.rollback();
        throw new Error(`Bulk generation exceeds max value`);
      }
      
      // Generate all numbers
      const numbers = [];
      for (let i = startValue; i <= endValue; i++) {
        numbers.push(this.formatNumber(i, formatConfig, period));
      }
      
      // Update counter
      await counter.update({
        currentValue: endValue,
        lastGeneratedAt: new Date(),
        lastGeneratedValue: numbers[numbers.length - 1]
      }, { transaction });
      
      await transaction.commit();
      
      return numbers;
    } catch (error) {
      await transaction.rollback();
      console.error('Bulk generate sequence error:', error);
      throw error;
    }
  }
  
  /**
   * Get current value (tanpa increment)
   */
  async getCurrentValue(tenantId, sequenceType) {
    const formatConfig = this.getDefaultFormat(sequenceType);
    const period = this.calculatePeriod(formatConfig.periodFormat);
    
    const counter = await SequenceCounter.findOne({
      where: {
        tenantId,
        sequenceType,
        period: period || 'GLOBAL'
      }
    });
    
    return counter ? counter.currentValue : 0;
  }
  
  /**
   * Reset sequence counter
   */
  async resetCounter(tenantId, sequenceType, period = null) {
    const where = { tenantId, sequenceType };
    if (period) where.period = period;
    
    const result = await SequenceCounter.update(
      { 
        currentValue: 0,
        lastGeneratedAt: null,
        lastGeneratedValue: null
      },
      { where }
    );
    
    return result[0]; // Number of rows updated
  }
  
  /**
   * Configure custom format untuk tenant
   */
  async configureFormat(tenantId, sequenceType, formatConfig) {
    const period = this.calculatePeriod(formatConfig.periodFormat);
    
    let counter = await SequenceCounter.findOne({
      where: {
        tenantId,
        sequenceType,
        period: period || 'GLOBAL'
      }
    });
    
    if (counter) {
      await counter.update({ formatConfig });
    } else {
      counter = await SequenceCounter.create({
        tenantId,
        sequenceType,
        period: period || 'GLOBAL',
        currentValue: 0,
        formatConfig
      });
    }
    
    return counter;
  }
  
  // === HELPER METHODS ===
  
  getDefaultFormat(sequenceType) {
    const formats = {
      'transaction': {
        prefix: 'TRX',
        periodFormat: 'YYYYMMDD',
        numberLength: 4,
        separator: '-'
      },
      'invoice': {
        prefix: 'INV',
        periodFormat: 'YYYYMM',
        numberLength: 4,
        separator: '-'
      },
      'receipt': {
        prefix: 'RCPT',
        periodFormat: 'YYYYMM',
        numberLength: 4,
        separator: '-'
      },
      'product-sku': {
        prefix: 'PRD',
        periodFormat: 'YYYYMMDD',
        numberLength: 4,
        separator: '-'
      },
      'voucher': {
        prefix: 'VCH',
        periodFormat: 'YYYY',
        numberLength: 6,
        separator: '-'
      },
      'member': {
        prefix: 'MBR',
        periodFormat: 'YYYY',
        numberLength: 5,
        separator: '-'
      }
    };
    
    return formats[sequenceType] || {
      prefix: 'SEQ',
      periodFormat: null,
      numberLength: 4,
      separator: '-'
    };
  }
  
  calculatePeriod(periodFormat) {
    if (!periodFormat) return null;
    
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    switch (periodFormat) {
      case 'YYYYMMDD':
        return `${year}${month}${day}`;
      case 'YYYYMM':
        return `${year}${month}`;
      case 'YYYY':
        return `${year}`;
      default:
        return null;
    }
  }
  
  formatNumber(value, formatConfig, period) {
    const { prefix, numberLength, separator } = formatConfig;
    
    const paddedNumber = String(value).padStart(numberLength, '0');
    
    let formatted = '';
    
    if (prefix) {
      formatted += prefix;
    }
    
    if (period) {
      formatted += separator + period;
    }
    
    formatted += separator + paddedNumber;
    
    return formatted;
  }
}

module.exports = new SequenceService();
```

### 3. Update Existing Files

#### Update `transactionController.js`

```javascript
// controllers/transactionController.js (UPDATE)
const sequenceService = require('../services/sequenceService');

async createTransaction(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const tenantId = req.user.tenantId;
    
    // Generate transaction number dengan new sequence service
    const transactionNumber = await sequenceService.generateNext(
      tenantId, 
      'transaction'
    );
    
    const newTransaction = await Transaction.create({
      transactionNumber,
      tenantId,
      // ... rest of fields
    }, { transaction });
    
    // ... rest of logic
    
    await transaction.commit();
    res.status(201).json({ success: true, data: newTransaction });
  } catch (error) {
    await transaction.rollback();
    // ... error handling
  }
}
```

#### Update `productController.js`

```javascript
// controllers/productController.js (UPDATE)
const sequenceService = require('../services/sequenceService');

async createProduct(req, res) {
  try {
    const tenantId = req.user.tenantId;
    const productData = req.body;
    
    // Generate SKU dengan new sequence service
    if (!productData.sku) {
      productData.sku = await sequenceService.generateNext(
        tenantId,
        'product-sku'
      );
    }
    
    const product = await Product.create({
      ...productData,
      tenantId
    });
    
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    // ... error handling
  }
}
```

---

## 🎮 Admin Endpoints (NEW)

```javascript
// controllers/sequenceController.js (NEW)
const sequenceService = require('../services/sequenceService');
const { SequenceCounter } = require('../models');

class SequenceController {
  // GET /api/v1/admin/sequences
  async getAllSequences(req, res) {
    try {
      const tenantId = req.user.tenantId;
      
      const sequences = await SequenceCounter.findAll({
        where: { tenantId },
        order: [['sequenceType', 'ASC'], ['period', 'DESC']]
      });
      
      res.json({ success: true, data: sequences });
    } catch (error) {
      console.error('Get sequences error:', error);
      res.status(500).json({ success: false, message: 'Error fetching sequences' });
    }
  }
  
  // POST /api/v1/admin/sequences/:type/reset
  async resetSequence(req, res) {
    try {
      const { type } = req.params;
      const { period } = req.body;
      const tenantId = req.user.tenantId;
      
      const count = await sequenceService.resetCounter(tenantId, type, period);
      
      res.json({
        success: true,
        message: `Reset ${count} sequence(s)`,
        data: { sequenceType: type, period, resetCount: count }
      });
    } catch (error) {
      console.error('Reset sequence error:', error);
      res.status(500).json({ success: false, message: 'Error resetting sequence' });
    }
  }
  
  // PUT /api/v1/admin/sequences/:type/configure
  async configureFormat(req, res) {
    try {
      const { type } = req.params;
      const { formatConfig } = req.body;
      const tenantId = req.user.tenantId;
      
      const counter = await sequenceService.configureFormat(
        tenantId,
        type,
        formatConfig
      );
      
      res.json({
        success: true,
        message: 'Format configured',
        data: counter
      });
    } catch (error) {
      console.error('Configure format error:', error);
      res.status(500).json({ success: false, message: 'Error configuring format' });
    }
  }
}

module.exports = new SequenceController();
```

---

## 🛣️ Routes

```javascript
// routes/v1/adminRoutes.js (NEW)
const express = require('express');
const router = express.Router();
const sequenceController = require('../../controllers/sequenceController');
const authMiddleware = require('../../middlewares/authMiddleware');
const caslMiddleware = require('../../middlewares/caslMiddleware');

router.use(authMiddleware.authenticate);

// Sequences Management (Admin only)
router.get('/sequences',
  caslMiddleware.authorize('manage', 'settings'),
  sequenceController.getAllSequences
);

router.post('/sequences/:type/reset',
  caslMiddleware.authorize('manage', 'settings'),
  sequenceController.resetSequence
);

router.put('/sequences/:type/configure',
  caslMiddleware.authorize('manage', 'settings'),
  sequenceController.configureFormat
);

module.exports = router;
```

```javascript
// src/app.js (ADD)
const adminRoutes = require('./routes/v1/adminRoutes');
app.use('/api/v1/admin', adminRoutes);
```

---

## 📝 Migration Strategy

### Migration: Create SequenceCounters Table

```javascript
// migrations/YYYYMMDDHHMMSS-create-sequence-counters.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('SequenceCounters', {
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
      sequenceType: {
        type: Sequelize.STRING,
        allowNull: false
      },
      period: {
        type: Sequelize.STRING
      },
      currentValue: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      formatConfig: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      maxValue: {
        type: Sequelize.INTEGER
      },
      lastGeneratedAt: {
        type: Sequelize.DATE
      },
      lastGeneratedValue: {
        type: Sequelize.STRING
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });
    
    // Unique constraint
    await queryInterface.addConstraint('SequenceCounters', {
      fields: ['tenantId', 'sequenceType', 'period'],
      type: 'unique',
      name: 'unique_sequence_per_tenant_type_period'
    });
    
    // Indexes
    await queryInterface.addIndex('SequenceCounters', ['tenantId']);
    await queryInterface.addIndex('SequenceCounters', ['sequenceType']);
    await queryInterface.addIndex('SequenceCounters', ['period']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('SequenceCounters');
  }
};
```

### Migration: Seed Initial Sequences

```javascript
// migrations/YYYYMMDDHHMMSS-seed-initial-sequences.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tenants = await queryInterface.sequelize.query(
      'SELECT id FROM "Tenants"',
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    const now = new Date();
    const sequenceTypes = [
      {
        type: 'transaction',
        config: { prefix: 'TRX', periodFormat: 'YYYYMMDD', numberLength: 4, separator: '-' }
      },
      {
        type: 'invoice',
        config: { prefix: 'INV', periodFormat: 'YYYYMM', numberLength: 4, separator: '-' }
      },
      {
        type: 'receipt',
        config: { prefix: 'RCPT', periodFormat: 'YYYYMM', numberLength: 4, separator: '-' }
      },
      {
        type: 'product-sku',
        config: { prefix: 'PRD', periodFormat: 'YYYYMMDD', numberLength: 4, separator: '-' }
      }
    ];
    
    const records = [];
    for (const tenant of tenants) {
      for (const seqType of sequenceTypes) {
        records.push({
          id: Sequelize.UUIDV4,
          tenantId: tenant.id,
          sequenceType: seqType.type,
          period: 'GLOBAL',
          currentValue: 0,
          formatConfig: JSON.stringify(seqType.config),
          createdAt: now,
          updatedAt: now
        });
      }
    }
    
    if (records.length > 0) {
      await queryInterface.bulkInsert('SequenceCounters', records);
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('SequenceCounters', null, {});
  }
};
```

---

## 🧪 Testing Strategy

### Unit Tests

```javascript
// tests/services/sequenceService.test.js
const sequenceService = require('../../services/sequenceService');
const { SequenceCounter } = require('../../models');

describe('Sequence Service', () => {
  describe('generateNext', () => {
    it('should generate sequence with correct format', async () => {
      const number = await sequenceService.generateNext(tenantId, 'transaction');
      expect(number).toMatch(/^TRX-\d{8}-\d{4}$/);
    });
    
    it('should increment counter', async () => {
      const num1 = await sequenceService.generateNext(tenantId, 'invoice');
      const num2 = await sequenceService.generateNext(tenantId, 'invoice');
      
      expect(num2).not.toBe(num1);
    });
    
    it('should handle concurrent requests without duplicates', async () => {
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(sequenceService.generateNext(tenantId, 'transaction'));
      }
      
      const numbers = await Promise.all(promises);
      const uniqueNumbers = new Set(numbers);
      
      expect(uniqueNumbers.size).toBe(100); // No duplicates
    });
  });
  
  describe('generateBulk', () => {
    it('should generate multiple sequences', async () => {
      const numbers = await sequenceService.generateBulk(tenantId, 'receipt', 10);
      expect(numbers.length).toBe(10);
      expect(new Set(numbers).size).toBe(10); // All unique
    });
  });
});
```

### Load Testing

```javascript
// tests/load/sequence-concurrency.test.js
const axios = require('axios');

describe('Sequence Concurrency Load Test', () => {
  it('should handle 1000 concurrent sequence generations', async () => {
    const promises = [];
    
    for (let i = 0; i < 1000; i++) {
      promises.push(
        axios.post('/api/v1/transactions', {
          // transaction data
        }, {
          headers: { Authorization: `Bearer ${token}` }
        })
      );
    }
    
    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled');
    
    // Get all transaction numbers
    const transactionNumbers = successful.map(r => r.value.data.data.transactionNumber);
    const uniqueNumbers = new Set(transactionNumbers);
    
    expect(uniqueNumbers.size).toBe(successful.length); // No duplicate numbers
  });
});
```

---

## 📝 Implementation Checklist

### Day 1-2: Database & Model
- [ ] Create SequenceCounter model
- [ ] Create migration
- [ ] Test migration up/down
- [ ] Create seed migration untuk existing tenants

### Day 3-4: Sequence Service
- [ ] Implement generateNext() dengan pessimistic locking
- [ ] Implement generateBulk()
- [ ] Implement getCurrentValue()
- [ ] Implement resetCounter()
- [ ] Implement configureFormat()
- [ ] Unit tests

### Day 5: Integration
- [ ] Update transactionController
- [ ] Update productController
- [ ] Update invoiceController
- [ ] Update any other controllers using sequences

### Day 6: Admin Endpoints
- [ ] Create sequenceController
- [ ] Create admin routes
- [ ] Test dengan Postman

### Day 7: Testing & Deployment
- [ ] Load testing untuk concurrency
- [ ] Integration tests
- [ ] Documentation
- [ ] Deploy ke staging

---

## 📊 Performance Benchmarks

**Target Metrics:**
- Sequence generation time: < 50ms (P95)
- Zero duplicate numbers under 1000 concurrent requests
- Database lock wait time: < 10ms average
- Support 10,000 sequences/minute per tenant

---

## 🔄 Backward Compatibility

Old `sequenceGenerator.js` dapat di-deprecate secara bertahap:

```javascript
// utils/sequenceGenerator.js (DEPRECATED)
const sequenceService = require('../services/sequenceService');

async function generate(tenantId, sequenceType, prefix = '') {
  console.warn('sequenceGenerator.generate() is deprecated. Use sequenceService.generateNext() instead.');
  return await sequenceService.generateNext(tenantId, sequenceType);
}

module.exports = { generate };
```

---

**Status**: Ready for implementation ✅  
**Next**: [PHASE-06-COMBINED-TRANSACTIONS.md](./PHASE-06-COMBINED-TRANSACTIONS.md)
