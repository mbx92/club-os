# Phase 08: Psychology Testing Module

## Overview

Module Psikologi adalah fitur premium untuk tenant yang menyediakan layanan tes psikologi. Module ini memungkinkan psikolog untuk:
- Mengelola bank soal tes psikologi
- Menjual tes individual atau paket tes
- Generate QR code untuk akses tes pasien
- Mengumpulkan dan menganalisis jawaban
- Verifikasi hasil dan generate laporan
- Integrasi dengan sistem billing/invoice

## Business Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PSYCHOLOGY MODULE FLOW                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │ Setup Tests │───▶│ Create Order │───▶│ Generate QR │───▶│ Send to     │  │
│  │ & Packages  │    │ (Test/Pkg)   │    │ Code/Link   │    │ Patient     │  │
│  └─────────────┘    └──────────────┘    └─────────────┘    └──────────────┘  │
│                                                                    │          │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────┐           ▼          │
│  │ Download    │◀───│ Verify &     │◀───│ Review      │    ┌─────────────┐  │
│  │ Report/PDF  │    │ Generate     │    │ Answers     │◀───│ Patient     │  │
│  └─────────────┘    │ Narrative    │    └─────────────┘    │ Takes Test  │  │
│         │           └──────────────┘                        └─────────────┘  │
│         ▼                                                                     │
│  ┌─────────────┐                                                              │
│  │ Invoice &   │                                                              │
│  │ Payment     │                                                              │
│  └─────────────┘                                                              │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Feature Registry Integration

### Add to `featureRegistry.js`

```javascript
// In FEATURE_REGISTRY.modules
modules: {
  // ... existing modules
  psychology: false,           // Psychology testing module
}

// In plan configurations
Basic: {
  modules: { psychology: false }
},
Professional: {
  modules: { psychology: true }  // Available from Professional
},
Enterprise: {
  modules: { psychology: true }
}

// Add psychology-specific limits
limits: {
  maxPsychologists: 5,        // Max psychologists per tenant
  maxTestsPerMonth: 100,      // Max tests administered per month
  maxTestTemplates: 50,       // Max custom test templates
}
```

## Database Schema

### Entity Relationship Diagram

```
┌────────────────────┐       ┌────────────────────┐
│      Tenants       │       │       Users        │
│  (existing table)  │       │  (existing table)  │
└─────────┬──────────┘       └─────────┬──────────┘
          │                            │
          │ tenantId                   │ psychologistId (userId)
          ▼                            ▼
┌─────────────────────────────────────────────────────────────┐
│                       Psychologists                          │
│  id, tenantId, userId, licenseNumber, specialization,       │
│  credentials (JSONB), isActive, createdAt, updatedAt        │
└─────────────────────────────────────────────────────────────┘
          │
          │ psychologistId
          ▼
┌─────────────────────────────────────────────────────────────┐
│                      PsychologyTests                         │
│  id, tenantId, psychologistId, code, name, description,     │
│  category, duration, instructions, testConfig (JSONB),      │
│  scoringMethod, isActive, version, createdAt, updatedAt     │
└─────────────────────────────────────────────────────────────┘
          │
          │ testId
          ▼
┌─────────────────────────────────────────────────────────────┐
│                     TestQuestions                            │
│  id, testId, questionNumber, questionText, questionType,    │
│  options (JSONB), scoring (JSONB), category, isRequired,    │
│  order, createdAt, updatedAt                                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      TestPackages                            │
│  id, tenantId, code, name, description, tests (JSONB),      │
│  price, discountPrice, validDays, isActive,                 │
│  createdAt, updatedAt                                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      TestPricing                             │
│  id, tenantId, testId, packageId, price, discountPrice,     │
│  validFrom, validTo, isActive, createdAt, updatedAt         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                       Patients                               │
│  id, tenantId, code, fullName, email, phone, birthDate,     │
│  gender, address, personalData (JSONB), isActive,           │
│  createdAt, updatedAt                                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      TestOrders                              │
│  id, tenantId, orderNumber, patientId, psychologistId,      │
│  orderType (test/package), testId, packageId, accessToken,  │
│  qrCode, linkUrl, status, expiresAt, totalAmount,           │
│  notes, createdAt, updatedAt                                │
└─────────────────────────────────────────────────────────────┘
          │
          │ orderId
          ▼
┌─────────────────────────────────────────────────────────────┐
│                     TestSessions                             │
│  id, orderId, testId, patientId, sessionToken, status,      │
│  startedAt, completedAt, ipAddress, userAgent,              │
│  createdAt, updatedAt                                       │
└─────────────────────────────────────────────────────────────┘
          │
          │ sessionId
          ▼
┌─────────────────────────────────────────────────────────────┐
│                     TestAnswers                              │
│  id, sessionId, questionId, answer (JSONB), answeredAt,     │
│  responseTime, createdAt, updatedAt                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      TestResults                             │
│  id, sessionId, orderId, patientId, testId, rawScores       │
│  (JSONB), calculatedScores (JSONB), interpretation (JSONB), │
│  narrative (TEXT), status, verifiedBy, verifiedAt,          │
│  reportData (JSONB), createdAt, updatedAt                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    NarrativeTemplates                        │
│  id, tenantId, testId, scoreRange (JSONB), category,        │
│  narrativeText (TEXT), variables (JSONB), isActive,         │
│  createdAt, updatedAt                                       │
└─────────────────────────────────────────────────────────────┘

Integration with existing Transaction system:
┌─────────────────────────────────────────────────────────────┐
│              Transactions (existing)                         │
│  + sourceType: 'psychology'                                  │
│  + sourceId: orderId                                         │
└─────────────────────────────────────────────────────────────┘
```

## Detailed Table Schemas

### 1. Psychologists
```javascript
{
  id: UUID (PK),
  tenantId: UUID (FK -> Tenants),
  userId: UUID (FK -> Users),
  licenseNumber: STRING,           // Nomor STR/SIPP
  specialization: STRING,          // Klinis, Pendidikan, Industri, dll
  credentials: JSONB,              // {
                                   //   education: [...],
                                   //   certifications: [...],
                                   //   experience: [...]
                                   // }
  isActive: BOOLEAN,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP
}
```

### 2. PsychologyTests
```javascript
{
  id: UUID (PK),
  tenantId: UUID (FK -> Tenants),
  psychologistId: UUID (FK -> Psychologists),
  code: STRING UNIQUE,             // e.g., "MBTI", "DISC", "EPPS"
  name: STRING,
  description: TEXT,
  category: ENUM('personality', 'intelligence', 'aptitude', 
                 'interest', 'clinical', 'developmental', 'other'),
  duration: INTEGER,               // dalam menit
  instructions: TEXT,              // instruksi untuk pasien
  testConfig: JSONB,               // {
                                   //   allowBack: true,
                                   //   showProgress: true,
                                   //   randomizeQuestions: false,
                                   //   timeLimit: null,
                                   //   requiredFields: ['name', 'birthDate', 'gender']
                                   // }
  scoringMethod: ENUM('sum', 'weighted', 'category', 'custom'),
  scoringConfig: JSONB,            // Konfigurasi perhitungan skor
  isActive: BOOLEAN,
  version: INTEGER,                // Optimistic locking
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP
}
```

### 3. TestQuestions
```javascript
{
  id: UUID (PK),
  testId: UUID (FK -> PsychologyTests),
  questionNumber: INTEGER,
  questionText: TEXT,
  questionType: ENUM('single_choice', 'multiple_choice', 'likert_scale',
                     'true_false', 'ranking', 'open_ended', 'matrix'),
  options: JSONB,                  // [
                                   //   { id: 'a', text: 'Sangat Setuju', value: 5 },
                                   //   { id: 'b', text: 'Setuju', value: 4 },
                                   //   ...
                                   // ]
  scoring: JSONB,                  // {
                                   //   category: 'extroversion',
                                   //   weights: { 'a': 5, 'b': 4, ... },
                                   //   reverse: false
                                   // }
  category: STRING,                // Subskala/dimensi
  isRequired: BOOLEAN,
  order: INTEGER,
  media: JSONB,                    // { type: 'image', url: '...' }
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP
}
```

### 4. TestPackages
```javascript
{
  id: UUID (PK),
  tenantId: UUID (FK -> Tenants),
  code: STRING UNIQUE,
  name: STRING,
  description: TEXT,
  tests: JSONB,                    // [
                                   //   { testId: '...', order: 1 },
                                   //   { testId: '...', order: 2 }
                                   // ]
  price: DECIMAL(12, 2),
  discountPrice: DECIMAL(12, 2),
  validDays: INTEGER,              // Masa berlaku setelah pembelian
  isActive: BOOLEAN,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP
}
```

### 5. TestPricing
```javascript
{
  id: UUID (PK),
  tenantId: UUID (FK -> Tenants),
  testId: UUID (FK -> PsychologyTests, nullable),
  packageId: UUID (FK -> TestPackages, nullable),
  price: DECIMAL(12, 2),
  discountPrice: DECIMAL(12, 2),
  validFrom: DATE,
  validTo: DATE,
  isActive: BOOLEAN,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP
}
```

### 6. Patients
```javascript
{
  id: UUID (PK),
  tenantId: UUID (FK -> Tenants),
  code: STRING,                    // Auto-generated patient code
  fullName: STRING,
  email: STRING,
  phone: STRING,
  birthDate: DATE,
  gender: ENUM('male', 'female', 'other'),
  address: TEXT,
  personalData: JSONB,             // {
                                   //   education: '...',
                                   //   occupation: '...',
                                   //   maritalStatus: '...',
                                   //   emergencyContact: {...}
                                   // }
  isActive: BOOLEAN,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP
}
```

### 7. TestOrders
```javascript
{
  id: UUID (PK),
  tenantId: UUID (FK -> Tenants),
  orderNumber: STRING UNIQUE,      // Auto-generated: PSY-202411-0001
  patientId: UUID (FK -> Patients, nullable), // Bisa diisi setelah pasien register
  psychologistId: UUID (FK -> Psychologists),
  orderType: ENUM('test', 'package'),
  testId: UUID (FK -> PsychologyTests, nullable),
  packageId: UUID (FK -> TestPackages, nullable),
  accessToken: STRING UNIQUE,      // Token untuk akses tes
  qrCode: TEXT,                    // Base64 QR code image
  linkUrl: STRING,                 // Full URL untuk akses tes
  status: ENUM('pending', 'paid', 'in_progress', 'completed', 
               'verified', 'cancelled', 'expired'),
  expiresAt: TIMESTAMP,            // Batas waktu pengerjaan
  totalAmount: DECIMAL(12, 2),
  notes: TEXT,
  metadata: JSONB,                 // Additional order data
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP
}
```

### 8. TestSessions
```javascript
{
  id: UUID (PK),
  orderId: UUID (FK -> TestOrders),
  testId: UUID (FK -> PsychologyTests),
  patientId: UUID (FK -> Patients),
  sessionToken: STRING UNIQUE,
  status: ENUM('started', 'in_progress', 'paused', 
               'completed', 'abandoned', 'timeout'),
  startedAt: TIMESTAMP,
  completedAt: TIMESTAMP,
  lastActivityAt: TIMESTAMP,
  currentQuestion: INTEGER,        // Track progress
  ipAddress: STRING,
  userAgent: TEXT,
  deviceInfo: JSONB,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP
}
```

### 9. TestAnswers
```javascript
{
  id: UUID (PK),
  sessionId: UUID (FK -> TestSessions),
  questionId: UUID (FK -> TestQuestions),
  answer: JSONB,                   // {
                                   //   selectedOption: 'a',
                                   //   selectedOptions: ['a', 'c'],
                                   //   text: '...',
                                   //   ranking: [1, 3, 2, 4]
                                   // }
  answeredAt: TIMESTAMP,
  responseTime: INTEGER,           // dalam milliseconds
  isSkipped: BOOLEAN,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP
}
```

### 10. TestResults
```javascript
{
  id: UUID (PK),
  sessionId: UUID (FK -> TestSessions),
  orderId: UUID (FK -> TestOrders),
  patientId: UUID (FK -> Patients),
  testId: UUID (FK -> PsychologyTests),
  rawScores: JSONB,                // {
                                   //   total: 120,
                                   //   categories: {
                                   //     'extroversion': 25,
                                   //     'introversion': 15,
                                   //     ...
                                   //   }
                                   // }
  calculatedScores: JSONB,         // Normalized/standardized scores
  interpretation: JSONB,           // {
                                   //   dominant: 'ENTJ',
                                   //   percentiles: {...},
                                   //   categories: {...}
                                   // }
  narrative: TEXT,                 // Generated narrative report
  status: ENUM('pending', 'calculated', 'reviewed', 
               'verified', 'disputed'),
  verifiedBy: UUID (FK -> Users),
  verifiedAt: TIMESTAMP,
  verificationNotes: TEXT,
  reportData: JSONB,               // Data for PDF generation
  pdfUrl: STRING,                  // Generated PDF report URL
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP
}
```

### 11. NarrativeTemplates
```javascript
{
  id: UUID (PK),
  tenantId: UUID (FK -> Tenants),
  testId: UUID (FK -> PsychologyTests),
  scoreRange: JSONB,               // {
                                   //   category: 'extroversion',
                                   //   min: 20,
                                   //   max: 30
                                   // }
  category: STRING,
  narrativeText: TEXT,             // Template with variables:
                                   // "{{patientName}} menunjukkan kecenderungan..."
  variables: JSONB,                // Available variables for template
  isActive: BOOLEAN,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP
}
```

## API Endpoints

### Master Data APIs

```
# Psychologists
GET    /api/v1/psychology/psychologists
POST   /api/v1/psychology/psychologists
GET    /api/v1/psychology/psychologists/:id
PUT    /api/v1/psychology/psychologists/:id
DELETE /api/v1/psychology/psychologists/:id

# Tests
GET    /api/v1/psychology/tests
POST   /api/v1/psychology/tests
GET    /api/v1/psychology/tests/:id
PUT    /api/v1/psychology/tests/:id
DELETE /api/v1/psychology/tests/:id
POST   /api/v1/psychology/tests/:id/duplicate
GET    /api/v1/psychology/tests/:id/questions
POST   /api/v1/psychology/tests/:id/questions
PUT    /api/v1/psychology/tests/:id/questions/:questionId
DELETE /api/v1/psychology/tests/:id/questions/:questionId
POST   /api/v1/psychology/tests/:id/questions/reorder

# Packages
GET    /api/v1/psychology/packages
POST   /api/v1/psychology/packages
GET    /api/v1/psychology/packages/:id
PUT    /api/v1/psychology/packages/:id
DELETE /api/v1/psychology/packages/:id

# Pricing
GET    /api/v1/psychology/pricing
POST   /api/v1/psychology/pricing
PUT    /api/v1/psychology/pricing/:id
DELETE /api/v1/psychology/pricing/:id

# Patients
GET    /api/v1/psychology/patients
POST   /api/v1/psychology/patients
GET    /api/v1/psychology/patients/:id
PUT    /api/v1/psychology/patients/:id
GET    /api/v1/psychology/patients/:id/history

# Narrative Templates
GET    /api/v1/psychology/narratives
POST   /api/v1/psychology/narratives
PUT    /api/v1/psychology/narratives/:id
DELETE /api/v1/psychology/narratives/:id
```

### Order & Testing APIs

```
# Orders
GET    /api/v1/psychology/orders
POST   /api/v1/psychology/orders
GET    /api/v1/psychology/orders/:id
PUT    /api/v1/psychology/orders/:id/status
POST   /api/v1/psychology/orders/:id/regenerate-qr
DELETE /api/v1/psychology/orders/:id

# Public Test Access (No auth required, token-based)
GET    /api/v1/public/psychology/test/:accessToken
POST   /api/v1/public/psychology/test/:accessToken/register
POST   /api/v1/public/psychology/test/:accessToken/start
GET    /api/v1/public/psychology/test/:sessionToken/questions
POST   /api/v1/public/psychology/test/:sessionToken/answer
POST   /api/v1/public/psychology/test/:sessionToken/complete

# Sessions (Admin)
GET    /api/v1/psychology/sessions
GET    /api/v1/psychology/sessions/:id
GET    /api/v1/psychology/sessions/:id/answers

# Results
GET    /api/v1/psychology/results
GET    /api/v1/psychology/results/:id
POST   /api/v1/psychology/results/:id/calculate
POST   /api/v1/psychology/results/:id/verify
POST   /api/v1/psychology/results/:id/generate-report
GET    /api/v1/psychology/results/:id/download

# Reports & Analytics
GET    /api/v1/psychology/reports/summary
GET    /api/v1/psychology/reports/tests-administered
GET    /api/v1/psychology/reports/revenue
```

## Directory Structure

Menggunakan struktur modular yang konsisten dengan arsitektur project:

```
src/
├── modules/
│   └── psychology/
│       ├── index.js                    # Module entry point
│       ├── psychology.routes.js        # Main routes aggregator
│       │
│       ├── controllers/
│       │   ├── index.js
│       │   ├── psychologistController.js
│       │   ├── testController.js
│       │   ├── questionController.js
│       │   ├── packageController.js
│       │   ├── pricingController.js
│       │   ├── patientController.js
│       │   ├── orderController.js
│       │   ├── sessionController.js
│       │   ├── resultController.js
│       │   ├── narrativeController.js
│       │   └── publicController.js
│       │
│       ├── routes/
│       │   ├── index.js
│       │   ├── psychologist.routes.js
│       │   ├── test.routes.js
│       │   ├── question.routes.js
│       │   ├── package.routes.js
│       │   ├── pricing.routes.js
│       │   ├── patient.routes.js
│       │   ├── order.routes.js
│       │   ├── session.routes.js
│       │   ├── result.routes.js
│       │   ├── narrative.routes.js
│       │   └── public.routes.js
│       │
│       ├── services/
│       │   ├── index.js
│       │   ├── scoringService.js        # Calculate test scores
│       │   ├── narrativeService.js      # Generate narratives
│       │   ├── testAccessService.js     # QR codes & access tokens
│       │   └── reportService.js         # PDF report generation
│       │
│       ├── models/
│       │   ├── index.js
│       │   ├── psychologist.js
│       │   ├── psychologyTest.js
│       │   ├── testQuestion.js
│       │   ├── testPackage.js
│       │   ├── testPricing.js
│       │   ├── patient.js
│       │   ├── testOrder.js
│       │   ├── testSession.js
│       │   ├── testAnswer.js
│       │   ├── testResult.js
│       │   └── narrativeTemplate.js
│       │
│       ├── validators/
│       │   ├── psychologistValidator.js
│       │   ├── testValidator.js
│       │   ├── orderValidator.js
│       │   └── answerValidator.js
│       │
│       └── utils/
│           ├── scoringMethods.js        # Different scoring algorithms
│           ├── testTypes.js             # Test type configurations
│           ├── constants.js             # Module constants
│           └── reportTemplates.js       # PDF report templates
│
├── migrations/
│   ├── 20251128000001-create-psychologists.js
│   ├── 20251128000002-create-psychology-tests.js
│   ├── 20251128000003-create-test-questions.js
│   ├── 20251128000004-create-test-packages.js
│   ├── 20251128000005-create-test-pricing.js
│   ├── 20251128000006-create-patients.js
│   ├── 20251128000007-create-test-orders.js
│   ├── 20251128000008-create-test-sessions.js
│   ├── 20251128000009-create-test-answers.js
│   ├── 20251128000010-create-test-results.js
│   └── 20251128000011-create-narrative-templates.js
│
└── models/
    └── index.js                         # Updated to load psychology models
```

### Module Entry Point

**File: `src/modules/psychology/index.js`**
```javascript
'use strict';

/**
 * Psychology Module
 * 
 * Provides psychology testing functionality including:
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
  
  // Module metadata
  metadata: {
    name: 'psychology',
    displayName: 'Psychology Testing',
    version: '1.0.0',
    description: 'Modul tes psikologi dengan scoring otomatis'
  }
};
```

### Main Route Integration

**Update `src/routes/index.js`:**
```javascript
// Import psychology module
const psychologyModule = require('../modules/psychology');
const psychologyPublicRoutes = require('../modules/psychology/routes/public.routes');

// Mount protected routes with feature gate
router.use('/psychology', 
  authenticate, 
  requireModule('psychology'),
  psychologyModule.routes
);

// Mount public routes (no auth, token-based access)
router.use('/psychology/public', psychologyPublicRoutes);
```

### Models Registration

**Update `src/models/index.js`:**
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

## Feature Gate Integration

### Middleware Usage

```javascript
// In routes/psychology/index.js
const { requireModule } = require('../../middlewares/featureGateMiddleware');

// All psychology routes require the module
router.use(requireModule('psychology'));

// Example route with additional authorization
router.get('/tests', 
  authenticate,
  authorizeCasl('read', 'PsychologyTest'),
  testController.getTests
);
```

### Add to featureRegistry.js

```javascript
// Add psychology module
FEATURE_REGISTRY: {
  modules: {
    // ... existing
    psychology: {
      name: 'Psychology Testing',
      description: 'Psychological assessment and testing module',
      dependsOn: [], // No dependencies
    }
  },
  
  limits: {
    // ... existing
    maxPsychologists: {
      description: 'Maximum psychologists per tenant',
      type: 'number'
    },
    maxTestsPerMonth: {
      description: 'Maximum tests administered per month',
      type: 'number'
    },
    maxTestTemplates: {
      description: 'Maximum custom test templates',
      type: 'number'
    }
  }
},

// Plan configurations
PLAN_CONFIGURATIONS: {
  Basic: {
    modules: { psychology: false },
    limits: { maxPsychologists: 0, maxTestsPerMonth: 0, maxTestTemplates: 0 }
  },
  Professional: {
    modules: { psychology: true },
    limits: { maxPsychologists: 3, maxTestsPerMonth: 100, maxTestTemplates: 20 }
  },
  Enterprise: {
    modules: { psychology: true },
    limits: { maxPsychologists: -1, maxTestsPerMonth: -1, maxTestTemplates: -1 } // Unlimited
  }
}
```

## Transaction Integration

### Order to Transaction Flow

```javascript
// When order is paid, create transaction
const createPsychologyTransaction = async (order, paymentDetails) => {
  const transaction = await Transaction.create({
    tenantId: order.tenantId,
    transactionNumber: await generateSequence('TRX'),
    transactionDate: new Date(),
    transactionType: 'sale',
    sourceType: 'psychology',
    sourceId: order.id,
    customerId: order.patientId,
    subtotal: order.totalAmount,
    tax: calculateTax(order.totalAmount),
    total: order.totalAmount + calculateTax(order.totalAmount),
    status: 'completed',
    processedBy: order.psychologistId
  });
  
  // Create transaction item
  await TransactionItem.create({
    transactionId: transaction.id,
    itemType: 'service',
    itemId: order.testId || order.packageId,
    itemName: order.orderType === 'test' ? order.test.name : order.package.name,
    quantity: 1,
    unitPrice: order.totalAmount,
    subtotal: order.totalAmount
  });
  
  return transaction;
};
```

## Implementation Phases

### Phase 8.1: Core Setup (Week 1)
- [ ] Create database migrations
- [ ] Create Sequelize models
- [ ] Setup model associations
- [ ] Add to feature registry
- [ ] Create basic routes structure

### Phase 8.2: Master Data (Week 2)
- [ ] Psychologists CRUD
- [ ] Tests CRUD with questions
- [ ] Packages CRUD
- [ ] Pricing management
- [ ] Patients CRUD
- [ ] Narrative templates CRUD

### Phase 8.3: Order & QR System (Week 3)
- [ ] Order creation
- [ ] QR code generation
- [ ] Access token system
- [ ] Public test access routes
- [ ] Patient registration flow

### Phase 8.4: Testing Flow (Week 4)
- [ ] Test session management
- [ ] Answer collection
- [ ] Progress tracking
- [ ] Session timeout handling
- [ ] Answer validation

### Phase 8.5: Scoring & Results (Week 5)
- [ ] Scoring service implementation
- [ ] Different scoring methods
- [ ] Result calculation
- [ ] Verification workflow
- [ ] Narrative generation

### Phase 8.6: Reports & Integration (Week 6)
- [ ] PDF report generation
- [ ] Transaction integration
- [ ] Invoice generation
- [ ] Analytics & reporting
- [ ] Testing & QA

## Security Considerations

1. **Access Token Security**
   - Tokens should be UUID v4 + random string
   - Expire after configurable period
   - One-time use for registration
   - Rate limiting on public endpoints

2. **Patient Data Privacy**
   - Encrypt sensitive personal data
   - GDPR/data protection compliance
   - Audit logging for all access
   - Data retention policies

3. **Test Integrity**
   - Prevent answer manipulation
   - Track session anomalies
   - IP/device fingerprinting
   - Time-based answer validation

## Sample Test Configuration

### MBTI-like Test Config
```javascript
{
  testConfig: {
    allowBack: true,
    showProgress: true,
    randomizeQuestions: false,
    timeLimit: null,
    requiredFields: ['fullName', 'birthDate', 'gender', 'email']
  },
  scoringMethod: 'category',
  scoringConfig: {
    categories: ['E-I', 'S-N', 'T-F', 'J-P'],
    calculation: 'highest_category',
    resultFormat: 'type_code' // e.g., "ENTJ"
  }
}
```

### Likert Scale Test Config
```javascript
{
  testConfig: {
    allowBack: false,
    showProgress: true,
    randomizeQuestions: true,
    timeLimit: 30, // minutes
    requiredFields: ['fullName', 'email']
  },
  scoringMethod: 'sum',
  scoringConfig: {
    scales: {
      'depression': { min: 0, max: 63, cutoffs: [13, 19, 28] },
      'anxiety': { min: 0, max: 63, cutoffs: [9, 15, 25] }
    },
    interpretation: {
      'minimal': [0, 13],
      'mild': [14, 19],
      'moderate': [20, 28],
      'severe': [29, 63]
    }
  }
}
```

## Next Steps

1. Review and approve schema design
2. Create migrations for all tables
3. Implement models with associations
4. Update feature registry
5. Begin Phase 8.1 implementation

---

**Document Version:** 1.0  
**Created:** November 28, 2025  
**Author:** System Architect
