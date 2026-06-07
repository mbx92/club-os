# Permission System Implementation - Technical Documentation

## Overview

This document describes the updated permission system that addresses frontend requirements for CASL-based authorization. The system now provides:

1. **Proper CASL Rules Format**: `actions` array instead of singular `action`
2. **Route-to-Subject Mapping**: Clear mapping between API routes and CASL subjects
3. **Permission Management Endpoints**: APIs for managing and previewing permissions
4. **Migration Tools**: Scripts to convert existing permissions

## Changes Implemented

### 1. Fixed caslRules Format (Priority 1 - URGENT)

#### Problem
```javascript
// ❌ OLD FORMAT (incorrect)
{
  "action": "manage",      // Singular string
  "subject": "all",
  "actions": []            // Empty array
}
```

#### Solution
```javascript
// ✅ NEW FORMAT (correct)
{
  "subject": "all",        // Subject first
  "actions": ["manage"],   // Array with values
  "conditions": {          // Conditions for multi-tenancy
    "tenantId": "$tenantId"
  }
}
```

#### File Changed
- **File**: `src/services/permissionService.js`
- **Function**: `serializeAbility()`
- **Change**: Modified to output `actions` array and reordered properties

```javascript
function serializeAbility(ability) {
  return ability.rules.map(rule => ({
    subject:    typeof rule.subject === 'function' ? rule.subject.modelName : rule.subject,
    actions:    Array.isArray(rule.action) ? rule.action : [rule.action],  // ✅ Convert to array
    conditions: rule.conditions || undefined,
    fields:     rule.fields     || undefined,
    inverted:   rule.inverted   || undefined,
  }));
}
```

---

### 2. Route-to-Subject Mapping (Priority 2 - HIGH)

#### Created: `src/config/routePermissions.js`

A comprehensive mapping of all backend routes to their corresponding CASL subjects.

**Features:**
- Maps 200+ routes to specific subjects
- Supports HTTP method-specific permissions
- Provides utility functions for querying

**Example Mappings:**
```javascript
// Simple mapping
'/gym/check-ins': {
  GET: { subject: 'CheckIn', actions: ['read'] },
  POST: { subject: 'CheckIn', actions: ['create'] }
}

// Method-specific
'/gym/trainers/:id': {
  GET: { subject: 'Instructor', actions: ['read'] },
  PUT: { subject: 'Instructor', actions: ['update'] },
  DELETE: { subject: 'Instructor', actions: ['delete'] }
}
```

**Utility Functions:**
```javascript
const { 
  getAllSubjects,        // Get all unique subjects
  getSubjectForRoute,    // Get subject for specific route
  getRoutesForSubject    // Get all routes for a subject
} = require('../config/routePermissions');

// Usage
const subjects = getAllSubjects();
// Returns: ['User', 'Member', 'CheckIn', 'Transaction', ...]

const mapping = getSubjectForRoute('/gym/members', 'GET');
// Returns: { subject: 'Member', actions: ['read'] }

const routes = getRoutesForSubject('Member');
// Returns: [{ path: '/gym/members', method: 'GET', ... }, ...]
```

---

### 3. New Permission Management Endpoints (Priority 3 - MEDIUM)

Added to `src/controllers/core/system/permissionController.js` and `src/routes/core/system/permission.routes.js`

#### 3.1 Get All Subjects

**Endpoint**: `GET /api/v1/permissions/subjects`

**Description**: Returns all available CASL subjects

**Response**:
```json
{
  "success": true,
  "data": {
    "subjects": [
      "Auth",
      "CashRegisterSession",
      "CheckIn",
      "Dashboard",
      "Expense",
      "ExpenseCategory",
      "Income",
      "IncomeCategory",
      "Instructor",
      "Member",
      "Transaction",
      "User",
      "..."
    ],
    "count": 65
  }
}
```

**Use Case**: Frontend permission management UI for selecting available subjects

---

#### 3.2 Preview Role Permissions

**Endpoint**: `GET /api/v1/permissions/roles/:id/preview`

**Description**: Preview computed permissions for a role including allowed routes

**Response**:
```json
{
  "success": true,
  "data": {
    "role": {
      "id": "uuid",
      "name": "cashier",
      "description": "Cashier role"
    },
    "permissions": {
      "caslRules": [
        {
          "subject": "Member",
          "actions": ["read", "create"],
          "conditions": { "tenantId": "$tenantId" }
        },
        {
          "subject": "CheckIn",
          "actions": ["read", "create"],
          "conditions": { "tenantId": "$tenantId" }
        }
      ],
      "uiFlags": {
        "canManageUsers": false,
        "canManageRoles": false
      },
      "menuAccess": ["dashboard", "gym"],
      "allowedRoutes": [
        {
          "path": "/gym/members",
          "method": "GET",
          "subject": "Member",
          "actions": ["read"]
        },
        {
          "path": "/gym/check-ins",
          "method": "POST",
          "subject": "CheckIn",
          "actions": ["create"]
        }
      ],
      "summary": {
        "totalRules": 15,
        "totalRoutes": 45,
        "totalMenus": 2,
        "subjects": ["Member", "CheckIn", "Transaction", "..."]
      }
    }
  }
}
```

**Use Case**: Admin UI to visualize what a role can access

---

#### 3.3 Generate CASL Rules

**Endpoint**: `POST /api/v1/permissions/roles/:roleId/generate-casl`

**Description**: Generate CASL rules from simplified frontend form

**Request Body**:
```json
{
  "subjects": [
    {
      "subject": "Member",
      "actions": ["read", "create", "update"]
    },
    {
      "subject": "CheckIn",
      "actions": ["read", "create"]
    },
    {
      "subject": "Transaction",
      "actions": ["read"]
    }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "message": "Generated 3 CASL rules for role \"cashier\"",
  "data": {
    "role": {
      "id": "uuid",
      "name": "cashier"
    },
    "caslRules": [
      {
        "subject": "Member",
        "actions": ["read", "create", "update"],
        "conditions": { "tenantId": "$tenantId" }
      },
      {
        "subject": "CheckIn",
        "actions": ["read", "create"],
        "conditions": { "tenantId": "$tenantId" }
      },
      {
        "subject": "Transaction",
        "actions": ["read"],
        "conditions": { "tenantId": "$tenantId" }
      }
    ]
  }
}
```

**Use Case**: Admin UI for managing role permissions with a simple form

---

### 4. Migration Script (Priority 4 - MEDIUM)

#### Created: `scripts/migratePermissionFormat.js`

**Purpose**: Convert existing role permissions from old format to new format

**Usage**:
```bash
# Preview changes (dry-run)
node scripts/migratePermissionFormat.js --dry-run

# Apply changes
node scripts/migratePermissionFormat.js
```

**What It Does**:
1. Fetches all roles from database
2. Converts each CASL rule from old format to new format
3. Adds default conditions (`tenantId: '$tenantId'`)
4. Updates roles in database (unless --dry-run)
5. Provides detailed summary of changes

**Example Output**:
```
═══════════════════════════════════════════════════════════════
Permission Format Migration Script
═══════════════════════════════════════════════════════════════
Mode: 🔍 DRY-RUN (preview only)

Found 8 roles to process

   🔄 Role "cashier": Converting 15 rules
      OLD: {
        "action": "read",
        "subject": "Member",
        "conditions": { "tenantId": "$tenantId" }
      }
      NEW: {
        "subject": "Member",
        "actions": ["read"],
        "conditions": { "tenantId": "$tenantId" }
      }
   🔍 Role "cashier": Would be migrated (dry-run mode)

═══════════════════════════════════════════════════════════════
Migration Summary
═══════════════════════════════════════════════════════════════
Total roles:         8
Processed:           6
Skipped:             2
Total rules changed: 87

⚠️  DRY-RUN MODE: No changes were applied
Run without --dry-run to apply changes
```

---

## API Endpoint Summary

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/permissions/subjects` | Get all CASL subjects | Admin |
| GET | `/permissions/roles/:id/preview` | Preview role permissions | Admin |
| POST | `/permissions/roles/:roleId/generate-casl` | Generate CASL rules | Admin |
| GET | `/permissions/user` | Get current user permissions | Authenticated |
| GET | `/permissions/routes` | Get routes metadata | Authenticated |
| GET | `/permissions/menu` | Get menu config | Admin |
| GET | `/permissions/roles` | Get all roles | Authenticated |
| POST | `/permissions/roles` | Create new role | Admin |
| PUT | `/permissions/roles/:id` | Update role | Admin |
| PATCH | `/permissions/roles/:id/permissions` | Update role permissions | Admin |
| DELETE | `/permissions/roles/:id` | Delete role | Admin |
| POST | `/permissions/roles/:id/reset` | Reset to defaults | SuperAdmin |

---

## Data Flow

### 1. Login Flow
```
User Login
    ↓
buildUserPermissions(userId)
    ↓
defineAbilitiesFor(user)  →  Build CASL Ability
    ↓
serializeAbility(ability)  →  Convert to frontend format
    ↓
{
  caslRules: [{ subject, actions[], conditions }],
  uiFlags: { ... },
  subscription: { ... },
  menuItems: [ ... ]
}
    ↓
Frontend receives & stores
```

### 2. Permission Check Flow
```
Frontend Route Access
    ↓
Check caslRules:
  ability.can('read', 'Member')
    ↓
Allowed? → Proceed
Denied?  → Redirect/Error
```

### 3. Backend Route Protection
```
HTTP Request
    ↓
authenticate middleware  →  Verify JWT
    ↓
authorizeCasl('read', 'Member')
    ↓
defineAbilitiesFor(user)
    ↓
ability.can('read', 'Member')?
    ↓
Yes → Controller
No  → 403 Forbidden
```

---

## Database Schema

### Role Model
```javascript
{
  id: UUID,
  name: STRING,
  description: TEXT,
  permissions: JSON {
    caslRules: [
      {
        subject: STRING,
        actions: STRING[],
        conditions: OBJECT,
        fields: STRING[],
        inverted: BOOLEAN
      }
    ],
    uiFlags: {
      canManageUsers: BOOLEAN,
      canManageRoles: BOOLEAN,
      canViewLogs: BOOLEAN,
      canManageSettings: BOOLEAN,
      canManageTenant: BOOLEAN
    },
    menuAccess: STRING[]
  },
  isActive: BOOLEAN
}
```

---

## Testing Guide

### 1. Test Migration Script
```bash
# First, run dry-run to preview
node scripts/migratePermissionFormat.js --dry-run

# If preview looks good, apply changes
node scripts/migratePermissionFormat.js
```

### 2. Test New Endpoints

#### Get Subjects
```bash
curl -X GET http://localhost:5000/api/v1/permissions/subjects \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Preview Role
```bash
curl -X GET http://localhost:5000/api/v1/permissions/roles/ROLE_ID/preview \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Generate CASL Rules
```bash
curl -X POST http://localhost:5000/api/v1/permissions/roles/ROLE_ID/generate-casl \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subjects": [
      { "subject": "Member", "actions": ["read", "create"] }
    ]
  }'
```

### 3. Test Login Response
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password"
  }'
```

**Expected Response Structure**:
```json
{
  "token": "...",
  "refreshToken": "...",
  "user": { ... },
  "permissions": {
    "user": { ... },
    "caslRules": [
      {
        "subject": "all",
        "actions": ["manage"],
        "conditions": { "tenantId": "$tenantId" }
      }
    ],
    "uiFlags": { ... },
    "subscription": { ... },
    "menuItems": [ ... ],
    "menuAccess": [ ... ]
  }
}
```

---

## Troubleshooting

### Issue: Frontend still receiving old format

**Cause**: Cached tokens or database not migrated

**Solution**:
1. Run migration script: `node scripts/migratePermissionFormat.js`
2. Clear frontend localStorage/sessionStorage
3. Login again to get fresh token

---

### Issue: "actions" array is empty

**Cause**: Role has old format in database

**Solution**:
1. Run migration script
2. Or manually update role:
```sql
UPDATE "Roles" 
SET permissions = jsonb_set(
  permissions, 
  '{caslRules}', 
  (SELECT jsonb_agg(
    jsonb_set(rule, '{actions}', jsonb_build_array(rule->>'action')) 
    FROM jsonb_array_elements(permissions->'caslRules') rule
  ))
)
WHERE name = 'role_name';
```

---

### Issue: Permission denied for valid role

**Cause**: Subject mismatch or conditions not resolved

**Solution**:
1. Check route mapping in `src/config/routePermissions.js`
2. Verify subject name matches exactly (case-sensitive)
3. Check conditions are properly resolved in `src/utils/casl.js`

---

## Best Practices

### 1. Always Use Subject Names Consistently
```javascript
// ✅ Good - consistent naming
{ subject: 'Member', actions: ['read'] }
{ subject: 'CheckIn', actions: ['read'] }

// ❌ Bad - inconsistent
{ subject: 'member', actions: ['read'] }  // lowercase
{ subject: 'check_in', actions: ['read'] }  // snake_case
```

### 2. Always Include Conditions for Multi-Tenancy
```javascript
// ✅ Good - has tenant isolation
{
  subject: 'Member',
  actions: ['read'],
  conditions: { tenantId: '$tenantId' }
}

// ❌ Bad - no tenant isolation (unless super admin)
{
  subject: 'Member',
  actions: ['read']
}
```

### 3. Use 'manage' Action for Full Access
```javascript
// Instead of:
{
  subject: 'Member',
  actions: ['read', 'create', 'update', 'delete']
}

// Use:
{
  subject: 'Member',
  actions: ['manage']  // Implies all CRUD actions
}
```

---

## Migration Timeline

### Phase 1: Backend Updates (Current)
- ✅ Fix caslRules format in serializeAbility
- ✅ Create route-to-subject mapping
- ✅ Add permission management endpoints
- ✅ Create migration script

### Phase 2: Database Migration (Next)
- [ ] Run migration script in development
- [ ] Test with different roles
- [ ] Verify all permissions work correctly
- [ ] Document any issues

### Phase 3: Production Deployment
- [ ] Backup production database
- [ ] Run migration script on production
- [ ] Monitor for errors
- [ ] Rollback plan ready

### Phase 4: Frontend Integration
- [ ] Frontend team tests new format
- [ ] Update frontend permission checks
- [ ] Deploy frontend changes

---

## Support

For questions or issues related to the permission system:

1. **Check Logs**: `logs/combined.log` or `logs/error.log`
2. **Check Database**: Verify Role.permissions structure
3. **Run Preview**: Use `/permissions/roles/:id/preview` to see computed permissions
4. **Contact**: Backend team

---

## Related Files

- `src/services/permissionService.js` - Permission building logic
- `src/config/routePermissions.js` - Route-to-subject mapping
- `src/controllers/core/system/permissionController.js` - Permission APIs
- `src/routes/core/system/permission.routes.js` - Permission routes
- `src/utils/casl.js` - CASL ability builder
- `src/utils/defaultRolePermissions.js` - Default role permissions
- `src/middlewares/caslMiddleware.js` - CASL authorization middleware
- `scripts/migratePermissionFormat.js` - Migration script
- `docs/CASL-PERMISSION-STRUCTURE.md` - Original requirements doc
