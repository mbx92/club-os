# Permission Routes - Quick Path Reference

## 📍 All Permission Routes Base Path
```
/api/v1/permissions
```

## 🔑 Available Routes

### User Permissions
```
GET  /api/v1/permissions/user
```
Get current user's permissions (CASL rules + subscription + menu)

### Routes Metadata
```
GET  /api/v1/permissions/routes
POST /api/v1/permissions/routes/regenerate  (superadmin only)
```

### Subjects List
```
GET  /api/v1/permissions/subjects
```
Returns all 65+ CASL subjects with actions

### Roles Management
```
GET    /api/v1/permissions/roles
POST   /api/v1/permissions/roles
PUT    /api/v1/permissions/roles/:id
DELETE /api/v1/permissions/roles/:id
PATCH  /api/v1/permissions/roles/:id/permissions
POST   /api/v1/permissions/roles/:id/reset  (superadmin only)
```

### Role Preview & Generation
```
GET  /api/v1/permissions/roles/:id/preview
POST /api/v1/permissions/roles/:roleId/generate-casl
```

### Menu Config
```
GET  /api/v1/permissions/menu
```

---

## ⚠️ Common Mistake

❌ **WRONG**:
```
POST /api/v1/roles/:roleId/generate-casl
```

✅ **CORRECT**:
```
POST /api/v1/permissions/roles/:roleId/generate-casl
```

**Why**: All permission-related routes are under `/permissions` namespace

---

## 🧪 Test Commands

### 1. Get All Subjects
```bash
curl http://localhost:5000/api/v1/permissions/subjects \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Get All Roles
```bash
curl http://localhost:5000/api/v1/permissions/roles \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Preview Role Permissions
```bash
curl http://localhost:5000/api/v1/permissions/roles/ROLE_ID/preview \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Generate CASL Rules
```bash
curl -X POST http://localhost:5000/api/v1/permissions/roles/ROLE_ID/generate-casl \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "permissions": {
      "Member": ["read", "create", "update"],
      "CheckIn": ["read", "create"],
      "Restaurant": ["read"]
    },
    "conditions": {
      "tenantId": "$tenantId"
    }
  }'
```

### 5. Update Role Permissions
```bash
curl -X PATCH http://localhost:5000/api/v1/permissions/roles/ROLE_ID/permissions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "permissions": {
      "caslRules": [
        {
          "subject": "Member",
          "actions": ["read", "create", "update"],
          "conditions": {"tenantId": "$tenantId"}
        }
      ],
      "uiFlags": {},
      "menuAccess": ["dashboard", "gym"]
    }
  }'
```

---

## 📊 Route Mounting Structure

```
/api/v1                            (app.js)
  └─ /permissions                   (routes/index.js)
      └─ /roles                      (permission.routes.js)
          ├─ GET    /
          ├─ POST   /
          ├─ PUT    /:id
          ├─ DELETE /:id
          ├─ PATCH  /:id/permissions
          ├─ POST   /:id/reset
          ├─ GET    /:id/preview
          └─ POST   /:roleId/generate-casl  ← HERE
```

**Full Path**: `/api/v1` + `/permissions` + `/roles/:roleId/generate-casl`  
**Result**: `/api/v1/permissions/roles/:roleId/generate-casl`

---

## 🔍 How to Find Route Paths

### Method 1: Check Route Files
1. Open `src/routes/index.js`
2. Find `router.use('/permissions', permissionRoutes)`
3. Open `src/routes/core/system/permission.routes.js`
4. Find `router.post('/roles/:roleId/generate-casl', ...)`
5. Combine: `/permissions` + `/roles/:roleId/generate-casl`

### Method 2: Check Server Logs
When server starts, it should log all registered routes (if enabled)

### Method 3: Use OpenAPI/Swagger (if configured)
Access `/api-docs` endpoint

---

## 💡 Frontend Integration

For frontend developers, use this base URL:

```javascript
// config.js
const API_BASE = 'http://localhost:5000/api/v1';
const PERMISSIONS_BASE = `${API_BASE}/permissions`;

// Example usage
const endpoints = {
  subjects: `${PERMISSIONS_BASE}/subjects`,
  roles: `${PERMISSIONS_BASE}/roles`,
  generateCasl: (roleId) => `${PERMISSIONS_BASE}/roles/${roleId}/generate-casl`,
  previewRole: (roleId) => `${PERMISSIONS_BASE}/roles/${roleId}/preview`,
};

// API call
const response = await fetch(endpoints.generateCasl(roleId), {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(payload)
});
```

---

## 📝 Notes

- All permission routes require authentication (`authenticate` middleware)
- Most require admin role (`authorizeCasl('read|update', 'Role')`)
- Some require superadmin (`requireSuperAdmin` middleware)
- All routes are logged via `auditLog` middleware

---

*Last Updated: 2025-02-22*
