# Test Feature Sync Endpoints

## Prerequisites
1. Server harus running: `npm run dev` atau `node src/server.js`
2. Login sebagai Super Admin dan dapatkan token
3. Replace `<TOKEN>` dengan JWT token dari login

---

## Test Sequence

### 1. Health Check
```bash
curl -X GET http://localhost:3000/api/v1/admin/features/health \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json"
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "healthy": true,
    "totalPlans": 4,
    "inSync": 4,
    "outOfSync": 0,
    "details": []
  }
}
```

---

### 2. Compare Features (Dry Run)
```bash
curl -X GET http://localhost:3000/api/v1/admin/features/compare \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json"
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "inSync": true,
    "plans": [
      {
        "planName": "Basic",
        "inSync": true,
        "differences": []
      },
      {
        "planName": "Professional",
        "inSync": true,
        "differences": []
      }
    ]
  }
}
```

---

### 3. Get Feature Metadata
```bash
curl -X GET http://localhost:3000/api/v1/admin/features/metadata \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json"
```

**Expected Response**:
```json
{
  "success": true,
  "data": [
    {
      "category": "modules",
      "name": "gym",
      "type": "boolean",
      "label": "Gym Management",
      "description": "Core gym membership management",
      "icon": "💪",
      "availableIn": ["Basic", "Professional", "Business", "Enterprise"]
    },
    {
      "category": "modules",
      "name": "pos",
      "type": "boolean",
      "label": "Point of Sale",
      "description": "POS system untuk retail & merchandise",
      "icon": "🏪",
      "availableIn": ["Professional", "Business", "Enterprise"]
    }
  ]
}
```

---

### 4. Preview Plan Features
```bash
# Preview Professional plan
curl -X GET http://localhost:3000/api/v1/admin/features/preview/Professional \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json"

# Preview Enterprise plan
curl -X GET http://localhost:3000/api/v1/admin/features/preview/Enterprise \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json"
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "planName": "Professional",
    "features": {
      "modules": {
        "gym": true,
        "pos": true,
        "restaurant": false,
        "classes": true,
        "reports": true,
        "advancedReports": false
      },
      "limits": {
        "maxUsers": 10,
        "maxMembers": 500,
        "maxProducts": 200,
        "maxLocations": 2,
        "maxPrinters": 3,
        "maxTables": 0,
        "maxIntegrations": 3
      }
    }
  }
}
```

---

### 5. Sync All Plans
```bash
curl -X POST http://localhost:3000/api/v1/admin/features/sync \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json"
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Synced 4 plans successfully",
  "data": {
    "synced": [
      {
        "id": "11111111-1111-1111-1111-111111111111",
        "name": "Basic",
        "changes": 0
      },
      {
        "id": "22222222-2222-2222-2222-222222222222",
        "name": "Professional",
        "changes": 0
      }
    ],
    "errors": []
  }
}
```

---

### 6. Sync Single Plan by ID
```bash
# Get plan ID dari database atau response sebelumnya
curl -X POST http://localhost:3000/api/v1/admin/features/sync/22222222-2222-2222-2222-222222222222 \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json"
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Plan synced successfully",
  "data": {
    "id": "22222222-2222-2222-2222-222222222222",
    "name": "Professional",
    "features": { /* updated features */ }
  }
}
```

---

### 7. Create Missing Plans
```bash
curl -X POST http://localhost:3000/api/v1/admin/features/create-missing \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json"
```

**Expected Response**:
```json
{
  "success": true,
  "message": "No missing plans to create",
  "data": {
    "created": [],
    "existing": ["Basic", "Professional", "Business", "Enterprise"]
  }
}
```

---

## PowerShell Testing (Windows)

```powershell
# Set token variable
$token = "YOUR_JWT_TOKEN_HERE"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Test health check
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/admin/features/health" `
  -Method GET -Headers $headers | ConvertTo-Json -Depth 10

# Test metadata
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/admin/features/metadata" `
  -Method GET -Headers $headers | ConvertTo-Json -Depth 10

# Test preview
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/admin/features/preview/Professional" `
  -Method GET -Headers $headers | ConvertTo-Json -Depth 10

# Test sync
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/admin/features/sync" `
  -Method POST -Headers $headers | ConvertTo-Json -Depth 10
```

---

## Postman Collection

Import collection dari: `docs/gym-api.postman_collection.json`

Add new folder: **Feature Sync (Super Admin)**

Add requests:
1. GET Health Check → `/api/v1/admin/features/health`
2. GET Compare → `/api/v1/admin/features/compare`
3. GET Metadata → `/api/v1/admin/features/metadata`
4. GET Preview Professional → `/api/v1/admin/features/preview/Professional`
5. POST Sync All → `/api/v1/admin/features/sync`
6. POST Sync Single → `/api/v1/admin/features/sync/:planId`
7. POST Create Missing → `/api/v1/admin/features/create-missing`

**Set Authorization**: Bearer Token (use Super Admin token)

---

## Troubleshooting

### 401 Unauthorized
- Token expired atau invalid
- User bukan Super Admin
- Token tidak dikirim di header

### 404 Not Found
- Server belum running
- Endpoint path salah (pastikan `/api/v1/admin/features`)

### 500 Internal Server Error
- Database connection error
- Check logs di terminal

---

## Success Indicators

✅ **Health Check returns**: `healthy: true`
✅ **Metadata returns**: Array of 30+ features
✅ **Preview returns**: Complete feature object per plan
✅ **Sync returns**: Success message dengan plan details
✅ **Compare returns**: `inSync: true` untuk semua plans

