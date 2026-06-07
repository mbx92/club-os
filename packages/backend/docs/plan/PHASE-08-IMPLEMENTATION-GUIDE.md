# Psychology Module - Implementation Guide

## Tahapan Implementasi

### Phase 8.1 - Database & Models (Week 1)

#### Step 1: Create Migrations
```bash
# Generate migration files
npx sequelize-cli migration:generate --name create-psychologists
npx sequelize-cli migration:generate --name create-psychology-tests
npx sequelize-cli migration:generate --name create-test-questions
npx sequelize-cli migration:generate --name create-patients
npx sequelize-cli migration:generate --name create-test-packages
npx sequelize-cli migration:generate --name create-test-pricing
npx sequelize-cli migration:generate --name create-test-orders
npx sequelize-cli migration:generate --name create-test-sessions
npx sequelize-cli migration:generate --name create-test-answers
npx sequelize-cli migration:generate --name create-test-results
npx sequelize-cli migration:generate --name create-narrative-templates
```

#### Step 2: Create Sequelize Models

**File: `src/models/psychologist.js`**
```javascript
'use strict';
module.exports = (sequelize, DataTypes) => {
  const Psychologist = sequelize.define('Psychologist', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    tenantId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'Tenants', key: 'id' }
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true, // Optional - link to User if same person is staff
      references: { model: 'Users', key: 'id' }
    },
    licenseNumber: {
      type: DataTypes.STRING,
      allowNull: false
    },
    fullName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    specialization: {
      type: DataTypes.ENUM('clinical', 'educational', 'industrial', 'forensic', 'sport', 'general'),
      defaultValue: 'general'
    },
    credentials: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    signature: {
      type: DataTypes.TEXT // Base64 encoded
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'Psychologists',
    indexes: [
      { fields: ['tenantId', 'isActive'] },
      { fields: ['licenseNumber'] }
    ]
  });

  Psychologist.associate = function(models) {
    Psychologist.belongsTo(models.Tenant, { foreignKey: 'tenantId' });
    Psychologist.belongsTo(models.User, { foreignKey: 'userId' });
    Psychologist.hasMany(models.TestOrder, { foreignKey: 'psychologistId' });
    Psychologist.hasMany(models.TestResult, { foreignKey: 'verifiedBy' });
  };

  return Psychologist;
};
```

**File: `src/models/psychologyTest.js`**
```javascript
'use strict';
module.exports = (sequelize, DataTypes) => {
  const PsychologyTest = sequelize.define('PsychologyTest', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    tenantId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: DataTypes.TEXT,
    category: {
      type: DataTypes.ENUM('personality', 'intelligence', 'aptitude', 'interest', 'clinical', 'developmental', 'neuropsychological'),
      allowNull: false
    },
    estimatedDuration: {
      type: DataTypes.INTEGER, // minutes
      defaultValue: 30
    },
    testConfig: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    scoringConfig: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'PsychologyTests',
    indexes: [
      { fields: ['tenantId', 'isActive'] },
      { fields: ['code'] },
      { fields: ['category'] }
    ]
  });

  PsychologyTest.associate = function(models) {
    PsychologyTest.belongsTo(models.Tenant, { foreignKey: 'tenantId' });
    PsychologyTest.hasMany(models.TestQuestion, { foreignKey: 'testId', as: 'questions' });
    PsychologyTest.hasMany(models.TestPricing, { foreignKey: 'testId' });
    PsychologyTest.hasMany(models.NarrativeTemplate, { foreignKey: 'testId' });
  };

  return PsychologyTest;
};
```

### Phase 8.2 - Feature Registry Update

**Update `src/utils/featureRegistry.js`:**
```javascript
const FEATURE_REGISTRY = {
  modules: {
    // ... existing modules
    psychology: {
      name: 'Psychology Testing',
      description: 'Modul tes psikologi dengan scoring otomatis',
      plans: {
        Basic: false,
        Professional: true,
        Enterprise: true
      }
    }
  },
  limits: {
    // ... existing limits
    maxTests: {
      name: 'Maximum Psychology Tests',
      description: 'Jumlah maksimal jenis tes psikologi',
      plans: {
        Basic: 0,
        Professional: 10,
        Enterprise: -1 // unlimited
      }
    },
    maxPsychologists: {
      name: 'Maximum Psychologists',
      description: 'Jumlah maksimal psikolog',
      plans: {
        Basic: 0,
        Professional: 5,
        Enterprise: -1
      }
    }
  },
  features: {
    // ... existing features
    narrativeGeneration: {
      name: 'Narrative Generation',
      description: 'Generate interpretasi naratif otomatis',
      plans: {
        Basic: false,
        Professional: false,
        Enterprise: true
      }
    },
    testPackages: {
      name: 'Test Packages',
      description: 'Bundling multiple tests',
      plans: {
        Basic: false,
        Professional: true,
        Enterprise: true
      }
    }
  }
};
```

### Phase 8.3 - Module Structure

Mengikuti pola modular yang sudah ada (gym, subscription, voucher), psychology module akan ditempatkan di `modules/psychology`:

```
src/
├── modules/
│   └── psychology/
│       ├── index.js                    # Module entry point
│       ├── psychology.routes.js        # Main routes aggregator
│       │
│       ├── controllers/
│       │   ├── index.js
│       │   ├── psychologistController.js   # CRUD psikolog
│       │   ├── testController.js           # CRUD tes psikologi
│       │   ├── questionController.js       # CRUD pertanyaan
│       │   ├── packageController.js        # CRUD paket tes
│       │   ├── pricingController.js        # CRUD harga
│       │   ├── patientController.js        # CRUD pasien
│       │   ├── orderController.js          # Order management
│       │   ├── sessionController.js        # Test session handling
│       │   ├── answerController.js         # Answer submission
│       │   ├── resultController.js         # Result & verification
│       │   ├── narrativeController.js      # Narrative templates
│       │   └── publicController.js         # Public endpoints (no auth)
│       │
│       ├── routes/
│       │   ├── index.js
│       │   ├── psychologist.routes.js
│       │   ├── test.routes.js
│       │   ├── question.routes.js
│       │   ├── package.routes.js
│       │   ├── patient.routes.js
│       │   ├── order.routes.js
│       │   ├── session.routes.js
│       │   ├── result.routes.js
│       │   ├── narrative.routes.js
│       │   └── public.routes.js
│       │
│       ├── services/
│       │   ├── index.js
│       │   ├── scoringService.js           # Test scoring algorithms
│       │   ├── narrativeService.js         # Narrative generation
│       │   ├── testAccessService.js        # Token & QR generation
│       │   └── reportService.js            # PDF report generation
│       │
│       ├── models/                         # Module-specific models
│       │   ├── index.js
│       │   ├── psychologist.js
│       │   ├── psychologyTest.js
│       │   ├── testQuestion.js
│       │   ├── patient.js
│       │   ├── testPackage.js
│       │   ├── testPricing.js
│       │   ├── testOrder.js
│       │   ├── testSession.js
│       │   ├── testAnswer.js
│       │   ├── testResult.js
│       │   └── narrativeTemplate.js
│       │
│       ├── migrations/                     # Module-specific migrations
│       │   └── (generated migrations)
│       │
│       ├── validators/
│       │   ├── psychologistValidator.js
│       │   ├── testValidator.js
│       │   ├── orderValidator.js
│       │   └── answerValidator.js
│       │
│       └── utils/
│           ├── scoringMethods.js
│           └── constants.js
```

**Catatan**: Models dari module tetap perlu di-register di `src/models/index.js` agar Sequelize dapat mengenalinya.

### Phase 8.4 - Module Entry Point

**File: `src/modules/psychology/index.js`**
```javascript
'use strict';

/**
 * Psychology Module - Entry Point
 * 
 * This module provides psychology testing functionality:
 * - Psychologist management
 * - Test creation and configuration
 * - Order & payment processing
 * - Test session handling
 * - Scoring & result generation
 * - Narrative/interpretation templates
 */

const routes = require('./psychology.routes');
const controllers = require('./controllers');
const services = require('./services');

module.exports = {
  routes,
  controllers,
  services,
  
  // Module metadata for feature registry
  metadata: {
    name: 'psychology',
    displayName: 'Psychology Testing',
    version: '1.0.0',
    description: 'Modul tes psikologi dengan scoring otomatis'
  }
};
```

**File: `src/modules/psychology/psychology.routes.js`**
```javascript
const express = require('express');
const router = express.Router();

// Import sub-routes
const psychologistRoutes = require('./routes/psychologist.routes');
const testRoutes = require('./routes/test.routes');
const questionRoutes = require('./routes/question.routes');
const packageRoutes = require('./routes/package.routes');
const patientRoutes = require('./routes/patient.routes');
const orderRoutes = require('./routes/order.routes');
const sessionRoutes = require('./routes/session.routes');
const resultRoutes = require('./routes/result.routes');
const narrativeRoutes = require('./routes/narrative.routes');

// Mount protected routes (auth + feature gate applied at parent level)
router.use('/psychologists', psychologistRoutes);
router.use('/tests', testRoutes);
router.use('/questions', questionRoutes);
router.use('/packages', packageRoutes);
router.use('/patients', patientRoutes);
router.use('/orders', orderRoutes);
router.use('/sessions', sessionRoutes);
router.use('/results', resultRoutes);
router.use('/narratives', narrativeRoutes);

module.exports = router;
```

**File: `src/modules/psychology/routes/public.routes.js`**
```javascript
const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');

// Rate limiting for public endpoints
const rateLimit = require('express-rate-limit');
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit per IP
  message: { error: 'Too many requests, please try again later' }
});

router.use(publicLimiter);

// Access test via token
router.get('/access/:token', publicController.accessTest);

// Submit patient info
router.post('/access/:token/patient', publicController.submitPatientInfo);

// Start test session
router.post('/access/:token/start', publicController.startSession);

// Get question
router.get('/session/:sessionToken/question/:questionNumber', publicController.getQuestion);

// Submit answer
router.post('/session/:sessionToken/answer', publicController.submitAnswer);

// Complete test
router.post('/session/:sessionToken/complete', publicController.completeTest);

// View result (if allowed by configuration)
router.get('/result/:resultToken', publicController.viewResult);

module.exports = router;
```

### Phase 8.5 - Main Route Integration

**Update `src/routes/index.js`:**
```javascript
// Import psychology module
const psychologyModule = require('../modules/psychology');
const psychologyPublicRoutes = require('../modules/psychology/routes/public.routes');

// Mount protected psychology routes with feature gate
router.use('/psychology', 
  authenticate, 
  requireModule('psychology'),
  psychologyModule.routes
);

// Mount public psychology routes (no auth, no feature gate)
// Public routes still check tenant via access token
router.use('/psychology/public', psychologyPublicRoutes);
```

### Phase 8.6 - Models Registration

**Update `src/models/index.js` to include psychology models:**
```javascript
// At the end of model loading section, add:

// Load Psychology module models
const psychologyModelsPath = path.join(__dirname, '..', 'modules', 'psychology', 'models');
if (fs.existsSync(psychologyModelsPath)) {
  fs.readdirSync(psychologyModelsPath)
    .filter(file => {
      return (
        file.indexOf('.') !== 0 &&
        file !== 'index.js' &&
        file.slice(-3) === '.js' &&
        file.indexOf('.test.js') === -1
      );
    })
    .forEach(file => {
      const model = require(path.join(psychologyModelsPath, file))(sequelize, Sequelize.DataTypes);
      db[model.name] = model;
    });
}
```

### Phase 8.7 - Services Layer

**File: `src/modules/psychology/services/index.js`**
```javascript
const scoringService = require('./scoringService');
const narrativeService = require('./narrativeService');
const testAccessService = require('./testAccessService');
const reportService = require('./reportService');

module.exports = {
  scoringService,
  narrativeService,
  testAccessService,
  reportService
};
```

**File: `src/modules/psychology/services/scoringService.js`**
```javascript
/**
 * Scoring Service - Calculates test scores based on configuration
 */
class ScoringService {
  /**
   * Calculate scores for a completed test session
   * @param {Object} session - Test session with answers
   * @param {Object} test - Test with scoring config
   * @returns {Object} Calculated scores
   */
  async calculateScores(session, test) {
    const { scoringConfig } = test;
    const answers = await session.getAnswers({ include: ['question'] });
    
    switch (scoringConfig.method) {
      case 'simple':
        return this.simpleScoring(answers, scoringConfig);
      case 'category':
        return this.categoryScoring(answers, scoringConfig);
      case 'weighted':
        return this.weightedScoring(answers, scoringConfig);
      case 'irt':
        return this.irtScoring(answers, scoringConfig);
      default:
        throw new Error(`Unknown scoring method: ${scoringConfig.method}`);
    }
  }

  simpleScoring(answers, config) {
    let totalScore = 0;
    let maxScore = 0;
    
    for (const answer of answers) {
      const question = answer.question;
      const scoring = question.scoring;
      
      if (scoring.reverse) {
        totalScore += (config.maxValue - answer.answer.value + 1);
      } else {
        totalScore += answer.answer.value;
      }
      maxScore += config.maxValue;
    }
    
    return {
      rawScore: totalScore,
      maxScore,
      percentage: Math.round((totalScore / maxScore) * 100)
    };
  }

  categoryScoring(answers, config) {
    const categories = {};
    
    // Initialize categories
    for (const catName of Object.keys(config.categories)) {
      categories[catName] = { score: 0, maxScore: 0, items: 0 };
    }
    
    // Calculate per category
    for (const answer of answers) {
      const category = answer.question.scoring.category;
      if (categories[category]) {
        categories[category].score += answer.answer.value;
        categories[category].maxScore += config.maxValue;
        categories[category].items++;
      }
    }
    
    // Calculate percentages
    for (const catName of Object.keys(categories)) {
      const cat = categories[catName];
      cat.percentage = cat.maxScore > 0 
        ? Math.round((cat.score / cat.maxScore) * 100) 
        : 0;
    }
    
    return { categories };
  }

  weightedScoring(answers, config) {
    // Implement weighted scoring
  }

  irtScoring(answers, config) {
    // Item Response Theory scoring - more complex
  }

  /**
   * Convert raw scores to standard scores
   */
  standardize(rawScore, mean, sd) {
    return {
      zScore: (rawScore - mean) / sd,
      tScore: 50 + 10 * ((rawScore - mean) / sd),
      percentile: this.zToPercentile((rawScore - mean) / sd)
    };
  }

  zToPercentile(z) {
    // Normal distribution CDF approximation
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;

    const sign = z < 0 ? -1 : 1;
    z = Math.abs(z) / Math.sqrt(2);

    const t = 1.0 / (1.0 + p * z);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);

    return Math.round((0.5 * (1.0 + sign * y)) * 100);
  }
}

module.exports = new ScoringService();
```

### Phase 8.8 - Transaction Integration

**Update Transaction model source types:**
```javascript
// In Transaction model or migration
sourceType: {
  type: DataTypes.ENUM(
    'membership', 
    'pos', 
    'restaurant',
    'psychology',  // Add this
    'other'
  )
}
```

**Example Psychology Transaction:**
```javascript
// In orderController.js - when payment confirmed
// Location: src/modules/psychology/controllers/orderController.js
async function confirmPayment(orderId, paymentData) {
  const order = await TestOrder.findByPk(orderId, {
    include: [{ model: TestPackage }, { model: PsychologyTest }]
  });

  // Create transaction
  const transaction = await Transaction.create({
    tenantId: order.tenantId,
    transactionNumber: await generateUniqueSequence('PSY', order.tenantId),
    sourceType: 'psychology',
    sourceId: order.id,
    customerId: order.patientId,
    totalAmount: order.totalAmount,
    status: 'completed'
  });

  // Create transaction items
  const items = order.orderType === 'package' 
    ? [{ 
        itemType: 'package',
        itemId: order.packageId,
        name: order.package.name,
        price: order.totalAmount,
        quantity: 1
      }]
    : order.tests.map(test => ({
        itemType: 'test',
        itemId: test.id,
        name: test.name,
        price: test.TestPricing.price,
        quantity: 1
      }));

  await TransactionItem.bulkCreate(items.map(item => ({
    transactionId: transaction.id,
    ...item
  })));

  // Create payment record
  await TransactionPayment.create({
    transactionId: transaction.id,
    method: paymentData.method,
    amount: order.totalAmount,
    reference: paymentData.reference,
    status: 'completed'
  });

  // Update order status
  order.status = 'paid';
  await order.save();

  return transaction;
}
```

### Phase 8.9 - QR Code & Access Token Generation

**File: `src/modules/psychology/services/testAccessService.js`**
```javascript
const crypto = require('crypto');
const QRCode = require('qrcode');

class TestAccessService {
  /**
   * Generate unique access token for test order
   */
  generateAccessToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate session token for active test
   */
  generateSessionToken() {
    return crypto.randomBytes(16).toString('base64url');
  }

  /**
   * Build test access URL
   */
  buildAccessUrl(tenantSlug, accessToken) {
    const baseUrl = process.env.FRONTEND_URL || 'https://app.example.com';
    return `${baseUrl}/t/${tenantSlug}/test/${accessToken}`;
  }

  /**
   * Generate QR code as base64 data URL
   */
  async generateQRCode(url) {
    try {
      const qrDataUrl = await QRCode.toDataURL(url, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      return qrDataUrl;
    } catch (error) {
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Create access package for order
   */
  async createAccessPackage(order, tenant) {
    const accessToken = this.generateAccessToken();
    const accessUrl = this.buildAccessUrl(tenant.slug, accessToken);
    const qrCode = await this.generateQRCode(accessUrl);

    return {
      accessToken,
      accessUrl,
      qrCode
    };
  }

  /**
   * Validate access token and check expiry
   */
  async validateAccess(accessToken) {
    const order = await TestOrder.findOne({
      where: { accessToken },
      include: [
        { model: Tenant },
        { model: Patient },
        { model: PsychologyTest },
        { model: TestPackage }
      ]
    });

    if (!order) {
      return { valid: false, error: 'Invalid access token' };
    }

    if (order.status === 'expired' || new Date() > order.expiresAt) {
      return { valid: false, error: 'Test link has expired' };
    }

    if (order.status === 'completed') {
      return { valid: false, error: 'Test already completed' };
    }

    if (order.status === 'pending') {
      return { valid: false, error: 'Payment not confirmed' };
    }

    return { valid: true, order };
  }
}

module.exports = new TestAccessService();
```

## Testing Strategy

### Unit Tests
```
tests/modules/psychology/
├── controllers/
│   ├── psychologistController.test.js
│   ├── testController.test.js
│   ├── orderController.test.js
│   └── publicController.test.js
├── services/
│   ├── scoringService.test.js
│   ├── narrativeService.test.js
│   └── testAccessService.test.js
└── models/
    ├── psychologist.test.js
    └── testOrder.test.js
```

### Integration Tests
```
tests/integration/psychology/
├── order-flow.test.js
├── test-taking.test.js
└── result-verification.test.js
```

### Example Test File
**File: `tests/modules/psychology/services/scoringService.test.js`**
```javascript
const scoringService = require('../../../../src/modules/psychology/services/scoringService');

describe('ScoringService', () => {
  describe('simpleScoring', () => {
    it('should calculate simple sum correctly', () => {
      const answers = [
        { answer: { value: 3 }, question: { scoring: { reverse: false } } },
        { answer: { value: 4 }, question: { scoring: { reverse: false } } },
        { answer: { value: 5 }, question: { scoring: { reverse: false } } }
      ];
      const config = { maxValue: 5 };
      
      const result = scoringService.simpleScoring(answers, config);
      
      expect(result.rawScore).toBe(12);
      expect(result.maxScore).toBe(15);
      expect(result.percentage).toBe(80);
    });

    it('should handle reverse scoring', () => {
      const answers = [
        { answer: { value: 1 }, question: { scoring: { reverse: true } } }
      ];
      const config = { maxValue: 5 };
      
      const result = scoringService.simpleScoring(answers, config);
      
      expect(result.rawScore).toBe(5); // reversed: 5 - 1 + 1 = 5
    });
  });

  describe('standardize', () => {
    it('should calculate T-score correctly', () => {
      const result = scoringService.standardize(70, 50, 10);
      
      expect(result.zScore).toBe(2);
      expect(result.tScore).toBe(70);
      expect(result.percentile).toBeGreaterThan(95);
    });
  });
});
```

## Performance Considerations

1. **Large Test Caching**: Cache test questions in Redis for frequently used tests
2. **Answer Pagination**: Use pagination when loading answers for result calculation
3. **Report Generation**: Generate PDF reports asynchronously with job queue
4. **QR Code Caching**: Cache generated QR codes with TTL

## Security Checklist

- [ ] Access tokens are cryptographically secure
- [ ] Session tokens expire after completion/timeout
- [ ] Patient data is encrypted at rest
- [ ] Result access requires verification
- [ ] Rate limiting on public endpoints
- [ ] Input validation on all patient-facing forms
- [ ] SQL injection prevention in dynamic queries
- [ ] XSS prevention in narrative templates

## Deployment Checklist

- [ ] Run migrations: `npm run db:dev:migrate`
- [ ] Sync features: `npm run sync:features`
- [ ] Generate routes: `npm run generate:routes`
- [ ] Update API docs
- [ ] Configure QR code library
- [ ] Set up PDF generation service
- [ ] Configure email templates for access links
- [ ] Load test public endpoints
