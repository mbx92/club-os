# Psychology Module - Database Schema Details

> **Module Location**: `src/modules/psychology/`
> 
> Models berada di `src/modules/psychology/models/` dan di-register melalui `src/models/index.js`

## Table Relationships

```
                                    ┌─────────────────┐
                                    │     Tenants     │
                                    │   (existing)    │
                                    └────────┬────────┘
                                             │
              ┌──────────────────────────────┼──────────────────────────────┐
              │                              │                              │
              ▼                              ▼                              ▼
    ┌─────────────────┐           ┌─────────────────┐           ┌─────────────────┐
    │  Psychologists  │           │    Patients     │           │  TestPackages   │
    │                 │           │                 │           │                 │
    │ • licenseNumber │           │ • fullName      │           │ • code          │
    │ • specialization│           │ • email         │           │ • name          │
    │ • credentials   │           │ • phone         │           │ • tests[]       │
    └────────┬────────┘           │ • birthDate     │           │ • price         │
             │                    │ • personalData  │           └────────┬────────┘
             │                    └────────┬────────┘                    │
             │                             │                             │
             ▼                             │                             │
    ┌─────────────────┐                    │                             │
    │ PsychologyTests │                    │                             │
    │                 │                    │                             │
    │ • code          │                    │                             │
    │ • name          │                    │                             │
    │ • category      │                    │                             │
    │ • testConfig    │                    │                             │
    │ • scoringMethod │                    │                             │
    └────────┬────────┘                    │                             │
             │                             │                             │
             │                             │                             │
             ▼                             │                             │
    ┌─────────────────┐                    │                             │
    │  TestQuestions  │                    │                             │
    │                 │                    │                             │
    │ • questionText  │                    │                             │
    │ • questionType  │                    │                             │
    │ • options[]     │                    │                             │
    │ • scoring       │                    │                             │
    └─────────────────┘                    │                             │
                                           │                             │
                        ┌──────────────────┴─────────────────────────────┘
                        │
                        ▼
              ┌─────────────────┐
              │   TestOrders    │◄────────────────────────────────────┐
              │                 │                                      │
              │ • orderNumber   │                                      │
              │ • orderType     │         ┌─────────────────┐          │
              │ • accessToken   │         │  TestPricing    │          │
              │ • qrCode        │         │                 │          │
              │ • linkUrl       │         │ • price         │          │
              │ • status        │         │ • discountPrice │          │
              │ • expiresAt     │         │ • validFrom/To  │          │
              └────────┬────────┘         └─────────────────┘          │
                       │                                               │
                       │                                               │
                       ▼                                               │
              ┌─────────────────┐                                      │
              │  TestSessions   │                                      │
              │                 │                                      │
              │ • sessionToken  │                                      │
              │ • status        │                                      │
              │ • startedAt     │                                      │
              │ • completedAt   │                                      │
              └────────┬────────┘                                      │
                       │                                               │
           ┌───────────┴───────────┐                                   │
           │                       │                                   │
           ▼                       ▼                                   │
  ┌─────────────────┐     ┌─────────────────┐                         │
  │   TestAnswers   │     │   TestResults   │                         │
  │                 │     │                 │                         │
  │ • answer        │     │ • rawScores     │                         │
  │ • answeredAt    │     │ • calculated    │                         │
  │ • responseTime  │     │ • interpretation│                         │
  └─────────────────┘     │ • narrative     │                         │
                          │ • status        │                         │
                          │ • verifiedBy    │                         │
                          │ • reportData    │                         │
                          └────────┬────────┘                         │
                                   │                                   │
                                   │                                   │
                                   ▼                                   │
                          ┌─────────────────┐                         │
                          │NarrativeTemplate│                         │
                          │                 │                         │
                          │ • scoreRange    │                         │
                          │ • narrativeText │                         │
                          │ • variables     │                         │
                          └─────────────────┘                         │
                                                                      │
                          ┌─────────────────┐                         │
                          │  Transactions   │─────────────────────────┘
                          │   (existing)    │
                          │                 │
                          │ sourceType:     │
                          │ 'psychology'    │
                          └─────────────────┘
```

## JSONB Field Structures

### Psychologist.credentials
```json
{
  "education": [
    {
      "degree": "S2 Psikologi Klinis",
      "institution": "Universitas Indonesia",
      "year": 2015
    }
  ],
  "certifications": [
    {
      "name": "SIPP",
      "number": "1234567890",
      "issuedBy": "HIMPSI",
      "validUntil": "2026-12-31"
    }
  ],
  "experience": [
    {
      "position": "Psikolog Klinis",
      "organization": "RS XYZ",
      "from": "2016-01",
      "to": "present"
    }
  ]
}
```

### PsychologyTest.testConfig
```json
{
  "allowBack": true,
  "showProgress": true,
  "randomizeQuestions": false,
  "randomizeOptions": false,
  "timeLimit": null,
  "autoSave": true,
  "saveInterval": 30,
  "requiredFields": ["fullName", "birthDate", "gender", "email"],
  "customFields": [
    {
      "name": "education",
      "label": "Pendidikan Terakhir",
      "type": "select",
      "options": ["SD", "SMP", "SMA", "D3", "S1", "S2", "S3"],
      "required": true
    }
  ],
  "instructions": {
    "beforeStart": "Pastikan Anda dalam kondisi tenang...",
    "duringTest": "Jawab dengan jujur sesuai kondisi Anda..."
  }
}
```

### PsychologyTest.scoringConfig
```json
{
  "method": "category",
  "categories": {
    "extroversion": {
      "questions": [1, 5, 9, 13],
      "reverseQuestions": [3, 7]
    },
    "introversion": {
      "questions": [2, 6, 10, 14],
      "reverseQuestions": [4, 8]
    }
  },
  "calculation": {
    "type": "difference",
    "formula": "extroversion - introversion"
  },
  "interpretation": {
    "ranges": [
      { "min": -20, "max": -10, "label": "Strong Introvert" },
      { "min": -9, "max": -1, "label": "Mild Introvert" },
      { "min": 0, "max": 0, "label": "Ambivert" },
      { "min": 1, "max": 9, "label": "Mild Extrovert" },
      { "min": 10, "max": 20, "label": "Strong Extrovert" }
    ]
  }
}
```

### TestQuestion.options (Single Choice)
```json
[
  { "id": "a", "text": "Sangat Tidak Setuju", "value": 1 },
  { "id": "b", "text": "Tidak Setuju", "value": 2 },
  { "id": "c", "text": "Netral", "value": 3 },
  { "id": "d", "text": "Setuju", "value": 4 },
  { "id": "e", "text": "Sangat Setuju", "value": 5 }
]
```

### TestQuestion.options (Matrix)
```json
{
  "rows": [
    { "id": "r1", "text": "Saya mudah bergaul" },
    { "id": "r2", "text": "Saya suka menyendiri" },
    { "id": "r3", "text": "Saya suka pesta" }
  ],
  "columns": [
    { "id": "c1", "text": "Tidak Pernah", "value": 1 },
    { "id": "c2", "text": "Jarang", "value": 2 },
    { "id": "c3", "text": "Kadang", "value": 3 },
    { "id": "c4", "text": "Sering", "value": 4 },
    { "id": "c5", "text": "Selalu", "value": 5 }
  ]
}
```

### TestQuestion.scoring
```json
{
  "category": "extroversion",
  "weight": 1,
  "reverse": false,
  "conditional": {
    "if": { "answer": "a" },
    "then": { "category": "introversion", "value": 2 }
  }
}
```

### TestAnswer.answer (Various Types)
```json
// Single Choice
{
  "selectedOption": "c",
  "value": 3
}

// Multiple Choice
{
  "selectedOptions": ["a", "c", "e"],
  "values": [1, 3, 5]
}

// Ranking
{
  "ranking": ["b", "d", "a", "c"],
  "values": { "b": 4, "d": 3, "a": 2, "c": 1 }
}

// Matrix
{
  "answers": {
    "r1": { "column": "c4", "value": 4 },
    "r2": { "column": "c2", "value": 2 },
    "r3": { "column": "c3", "value": 3 }
  }
}

// Open Ended
{
  "text": "Saya merasa lebih nyaman ketika...",
  "wordCount": 45
}
```

### TestResult.rawScores
```json
{
  "totalQuestions": 50,
  "answeredQuestions": 48,
  "skippedQuestions": 2,
  "totalTime": 1845000,
  "categories": {
    "extroversion": {
      "score": 42,
      "maxScore": 50,
      "percentage": 84
    },
    "introversion": {
      "score": 28,
      "maxScore": 50,
      "percentage": 56
    }
  }
}
```

### TestResult.calculatedScores
```json
{
  "standardScores": {
    "extroversion": { "raw": 42, "tScore": 62, "percentile": 88 },
    "introversion": { "raw": 28, "tScore": 45, "percentile": 31 }
  },
  "dominantType": "E",
  "typeCode": "ENTJ",
  "reliability": {
    "cronbachAlpha": 0.85,
    "validResponses": true
  }
}
```

### TestResult.interpretation
```json
{
  "summary": "Extrovert dengan kecenderungan kepemimpinan yang kuat",
  "dimensions": {
    "E-I": {
      "dominant": "E",
      "score": 14,
      "description": "Sangat menyukai interaksi sosial"
    },
    "S-N": {
      "dominant": "N",
      "score": 8,
      "description": "Lebih fokus pada gambaran besar"
    }
  },
  "strengths": [
    "Kepemimpinan alami",
    "Komunikasi efektif",
    "Pengambilan keputusan cepat"
  ],
  "developmentAreas": [
    "Kesabaran dalam mendengarkan",
    "Sensitivitas terhadap perasaan orang lain"
  ]
}
```

### NarrativeTemplate.variables
```json
{
  "available": [
    "{{patientName}}",
    "{{testDate}}",
    "{{testName}}",
    "{{dominantType}}",
    "{{categoryScore}}",
    "{{percentile}}",
    "{{interpretation}}"
  ],
  "conditionals": [
    {
      "variable": "{{genderPronoun}}",
      "conditions": {
        "male": "Ia",
        "female": "Ia",
        "default": "Subjek"
      }
    }
  ]
}
```

### TestOrder.metadata
```json
{
  "referralSource": "website",
  "campaignCode": "PROMO2024",
  "discountApplied": {
    "type": "percentage",
    "value": 10,
    "code": "NEWUSER10"
  },
  "paymentInfo": {
    "method": "bank_transfer",
    "bankName": "BCA",
    "accountNumber": "1234567890"
  },
  "remindersSent": [
    { "type": "email", "sentAt": "2024-11-28T10:00:00Z" }
  ]
}
```

## Index Recommendations

```sql
-- Psychologists
CREATE INDEX idx_psychologists_tenant_active ON "Psychologists" ("tenantId", "isActive");
CREATE INDEX idx_psychologists_license ON "Psychologists" ("licenseNumber");

-- PsychologyTests
CREATE INDEX idx_psychology_tests_tenant_active ON "PsychologyTests" ("tenantId", "isActive");
CREATE INDEX idx_psychology_tests_category ON "PsychologyTests" ("category");
CREATE INDEX idx_psychology_tests_code ON "PsychologyTests" ("code");

-- TestQuestions
CREATE INDEX idx_test_questions_test_order ON "TestQuestions" ("testId", "order");

-- Patients
CREATE INDEX idx_patients_tenant ON "Patients" ("tenantId");
CREATE INDEX idx_patients_email ON "Patients" ("email");
CREATE INDEX idx_patients_phone ON "Patients" ("phone");

-- TestOrders
CREATE INDEX idx_test_orders_tenant_status ON "TestOrders" ("tenantId", "status");
CREATE INDEX idx_test_orders_access_token ON "TestOrders" ("accessToken");
CREATE INDEX idx_test_orders_patient ON "TestOrders" ("patientId");
CREATE INDEX idx_test_orders_psychologist ON "TestOrders" ("psychologistId");
CREATE INDEX idx_test_orders_expires ON "TestOrders" ("expiresAt") WHERE "status" IN ('pending', 'paid');

-- TestSessions
CREATE INDEX idx_test_sessions_order ON "TestSessions" ("orderId");
CREATE INDEX idx_test_sessions_token ON "TestSessions" ("sessionToken");
CREATE INDEX idx_test_sessions_status ON "TestSessions" ("status");

-- TestAnswers
CREATE INDEX idx_test_answers_session ON "TestAnswers" ("sessionId");
CREATE INDEX idx_test_answers_question ON "TestAnswers" ("questionId");

-- TestResults
CREATE INDEX idx_test_results_order ON "TestResults" ("orderId");
CREATE INDEX idx_test_results_patient ON "TestResults" ("patientId");
CREATE INDEX idx_test_results_status ON "TestResults" ("status");
CREATE INDEX idx_test_results_verified ON "TestResults" ("verifiedBy", "verifiedAt");

-- JSONB indexes for search
CREATE INDEX idx_patients_personal_data ON "Patients" USING GIN ("personalData");
CREATE INDEX idx_test_results_interpretation ON "TestResults" USING GIN ("interpretation");
```

## Status Enums Flow

### TestOrder Status
```
pending ──► paid ──► in_progress ──► completed ──► verified
    │                     │
    │                     └──► expired
    │
    └──► cancelled
```

### TestSession Status
```
started ──► in_progress ──► completed
    │             │
    │             ├──► paused ──► in_progress
    │             │
    │             └──► timeout
    │
    └──► abandoned
```

### TestResult Status
```
pending ──► calculated ──► reviewed ──► verified
                │
                └──► disputed ──► reviewed
```
