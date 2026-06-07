# Testing Scripts

Folder ini berisi berbagai script untuk testing fitur-fitur aplikasi.

## Available Scripts

### Psychology Module

#### test-typetest-import-export.js
Test import/export functionality untuk psychology test types dengan verifikasi questionCount.

**Usage:**
```bash
node scripts/testing/test-typetest-import-export.js
```

**What it tests:**
- Login authentication
- Import test type dari JSON file
- Verifikasi questionCount di database
- Export test type ke JSON
- Verifikasi questionCount dalam exported JSON
- List semua test types

**Expected Results:**
- ✅ Question count dari database harus match dengan perhitungan manual
- ✅ Exported JSON harus include field `questionCount`
- ✅ Question count harus exclude instructions (hanya hitung type='question')

---

### Combined Billing

#### test-combined-billing-service-plans.js
Test combined billing service plans functionality.

---

### Health & Monitoring

#### test-health-stream.js
Test health monitoring stream.

---

### Invitation System

#### test-invitation-type.js
Test invitation types functionality.

---

### LOVE (Psikogram)

#### test-love-calculation.js
Test LOVE psychological test calculation.

#### test-love-scale-mapping.js
Test LOVE scale mapping and scoring.

---

### PDF Generation

#### test-pdf-generator.js
Test PDF generation functionality.

---

### Printing

#### test-print-api.js
Test printing API endpoints.

#### test-print.js
Test direct printing functionality.

#### test-printer-stream.js
Test printer stream functionality.

#### test-receipt-template.js
Test receipt template generation.

#### test-verify-printer.js
Test printer verification and connectivity.

---

### Service Plans

#### test-service-plan-trainer.js
Test service plan trainer support functionality.

---

## Running Tests

### Prerequisites
1. Ensure development server is running: `npm run dev`
2. Database seeded with test data
3. Valid test credentials configured

### Environment
Scripts use `.env.development` by default. Make sure it's properly configured:
```env
API_BASE_URL=http://localhost:3000/api/v1
```

### Running Individual Tests
```bash
node scripts/testing/[test-name].js
```

### Common Test Patterns

Most test scripts follow this pattern:
1. **Setup**: Load environment, configure test data
2. **Authentication**: Login to get auth token
3. **Test Operations**: Execute test scenarios
4. **Verification**: Check results and outputs
5. **Cleanup**: (optional) Clean up test data
6. **Report**: Display test results

### Test Output

Tests typically output:
- ✅ Success indicators
- ❌ Error messages
- 📊 Statistics and counts
- 📋 Data summaries

### Troubleshooting

**Connection Refused:**
- Ensure server is running on correct port
- Check API_BASE_URL configuration

**Authentication Failed:**
- Verify test credentials exist in database
- Check if user has proper permissions

**Database Errors:**
- Run migrations: `npm run db:dev:reset`
- Seed test data if needed

---

## Notes

- These scripts are for **testing only**, not for production use
- Some scripts may modify database data
- Always run against development/test environment
- Check individual script headers for specific requirements
