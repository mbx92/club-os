# Psychology Module - Postman Testing Guide

## Overview

Koleksi Postman ini menyediakan complete testing flow untuk Psychology Module.

## Quick Start

1. **Import ke Postman**
   - Import `psychology-module.postman_collection.json`
   - Import `psychology-module.postman_environment.json`
   - Set environment ke "Psychology Module Environment"

2. **Jalankan Migration** (jika belum)
   ```bash
   npm run db:dev:migrate
   ```

3. **Start Server**
   ```bash
   npm run dev
   ```

## Test Flow

### Alur Testing Lengkap

```
┌─────────────────────────────────────────────────────────────────┐
│                      ADMIN WORKFLOW                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Login Admin                                                  │
│     └─> jwt_token saved                                          │
│                                                                  │
│  2. Create Test Types                                            │
│     ├─> Create PAPI Kostick → papiTestTypeId                    │
│     └─> Create EPPS → eppsTestTypeId                            │
│                                                                  │
│  3. Create Packages                                              │
│     ├─> Single Package → singlePackageId                        │
│     └─> Bundle Package → bundlePackageId                        │
│                                                                  │
│  4. Create Price Rules (Optional)                                │
│     ├─> Promo Code → promoCode, promoRuleId                     │
│     ├─> Bulk Discount → bulkRuleId                              │
│     └─> Member Discount → memberRuleId                          │
│                                                                  │
│  5. Create Patient                                               │
│     └─> patientId saved                                          │
│                                                                  │
│  6. Create Order                                                 │
│     └─> orderId, orderNumber saved                              │
│                                                                  │
│  7. Process Payment                                              │
│     └─> accessToken, accessExpiresAt saved                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CANDIDATE WORKFLOW                            │
│                    (Public - No JWT)                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  8. Validate Access Token                                        │
│     └─> Verify token valid, get sessions                        │
│                                                                  │
│  9. Get Test Questions                                           │
│     └─> Retrieve questions for session                          │
│                                                                  │
│  10. Start Session                                               │
│      └─> status: in_progress, startedAt set                     │
│                                                                  │
│  11. Save Progress (Auto-save)                                   │
│      └─> Answers saved periodically                             │
│                                                                  │
│  12. Submit Answers                                              │
│      └─> status: completed, previewScores returned              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 ADMIN RESULT WORKFLOW                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  13. Verify & Calculate Scores                                   │
│      └─> Backend recalculates, stores verified scores           │
│                                                                  │
│  14. Get Session Result                                          │
│      └─> Full result with interpretation                        │
│                                                                  │
│  15. Get Print Data                                              │
│      └─> Data for print-friendly page                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Folder Structure

| Folder | Description |
|--------|-------------|
| 0. Authentication | Login to get JWT token |
| 1. Test Types | CRUD for test types (PAPI, EPPS) |
| 2. Packages | Package management (single/bundle) |
| 3. Price Rules | Discounts, promo codes |
| 4. Patients | Patient/candidate CRUD |
| 5. Orders | Order creation & payment |
| 6. Public Access | Candidate test taking (no auth) |
| 7. Sessions & Results | View & verify results |
| 8. Reports | Dashboard & analytics |

## Key Variables

| Variable | Description | Set By |
|----------|-------------|--------|
| `jwt_token` | Admin JWT token | Login request |
| `papiTestTypeId` | PAPI test type UUID | Create PAPI request |
| `eppsTestTypeId` | EPPS test type UUID | Create EPPS request |
| `bundlePackageId` | Bundle package UUID | Create Bundle request |
| `patientId` | Patient UUID | Create Patient request |
| `orderId` | Order UUID | Create Order request |
| `accessToken` | Candidate access token | Process Payment request |
| `sessionId` | Test session UUID | Validate Token request |

## Testing Scenarios

### Scenario 1: Complete Flow (Happy Path)

Run folders in order:
1. 0. Authentication → Login Admin
2. 1. Test Types → Create both PAPI and EPPS
3. 2. Packages → Create Bundle Package
4. 4. Patients → Create Patient
5. 5. Orders → Create Order → Process Payment
6. 6. Public Access → Run all (simulates candidate)
7. 7. Sessions → Verify & Get Result

### Scenario 2: Promo Code Testing

1. Login Admin
2. Create Price Rules → Create Promo Code
3. Create Order with promo code
4. Verify discount applied

### Scenario 3: Bulk Order

1. Create Bulk Discount rule (min 10)
2. Calculate price with quantity=10
3. Verify bulk discount applied

### Scenario 4: Member Discount

1. Create Member Discount rule
2. Calculate price with `isMember: true`
3. Verify member discount applied

## Sample Data

### PAPI Questions (5 sample - full has 90)
```json
[
  {"id": 1, "textA": "Saya senang bekerja keras", "textB": "Saya suka mengatur", "scaleA": "G", "scaleB": "L"},
  {"id": 2, "textA": "Saya mudah bergaul", "textB": "Saya suka sendiri", "scaleA": "S", "scaleB": "W"},
  {"id": 3, "textA": "Saya perhatian detail", "textB": "Saya suka hal baru", "scaleA": "D", "scaleB": "X"},
  {"id": 4, "textA": "Saya cepat memutuskan", "textB": "Saya butuh dukungan", "scaleA": "I", "scaleB": "R"},
  {"id": 5, "textA": "Saya tenang", "textB": "Saya bersemangat", "scaleA": "E", "scaleB": "V"}
]
```

### PAPI Answers Format
```json
[
  {"id": 1, "answer": "A"},
  {"id": 2, "answer": "B"},
  {"id": 3, "answer": "A"}
]
```

### EPPS Answers Format
```json
{
  "1": "A",
  "2": "B",
  "3": "A"
}
```

## Error Handling Tests

### Invalid Access Token
```
POST /api/v1/psychology/public/validate
Body: { "accessToken": "INVALID-TOKEN" }
Expected: 401 Unauthorized
```

### Expired Token
```
POST /api/v1/psychology/public/validate
Body: { "accessToken": "EXPIRED-TOKEN" }
Expected: 401 - Token expired
```

### Invalid Promo Code
```
POST /api/v1/psychology/price-rules/validate
Body: { "code": "INVALID" }
Expected: { valid: false, error: "Invalid promo code" }
```

## Tips

1. **Run Collection**: Use Postman Runner to run entire flow
2. **Check Console**: Test scripts log useful info
3. **Variables Auto-Save**: IDs are auto-saved to environment
4. **Reset Environment**: Clear all variables to start fresh

## API Base URL

- Development: `http://localhost:8000`
- Production: Update `baseUrl` in environment

## Related Files

- Collection: `psychology-module.postman_collection.json`
- Environment: `psychology-module.postman_environment.json`
- API Docs: `../plan/PHASE-08-PSYCHOLOGY-REVISED.md`
