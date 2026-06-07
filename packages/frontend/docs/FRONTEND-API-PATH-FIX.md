# Frontend API Path Fix - Permission Routes

**Issue**: Frontend calling wrong API paths for permission/role endpoints  
**Status**: 🔴 Requires Frontend Update  
**Priority**: HIGH

---

## 🐛 Problem

Frontend is calling:
```
❌ POST /api/v1/roles/:roleId/generate-casl
❌ GET  /api/v1/roles
❌ PUT  /api/v1/roles/:id
```

Backend requires:
```
✅ POST /api/v1/permissions/roles/:roleId/generate-casl
✅ GET  /api/v1/permissions/roles
✅ PUT  /api/v1/permissions/roles/:id
```

**Error in Browser Console**:
```
POST http://localhost:8000/api/v1/roles/835b4539-b3cd-4338-af00-e3132c68ab6f/generate-casl 404 (Not Found)
```

---

## ✅ Solution

Add `/permissions` prefix to all role-related API calls.

### Quick Fix

**Search in frontend codebase**: `'/roles/` or `"/roles/`

**Replace with**: `'/permissions/roles/` or `"/permissions/roles/`

---

## 📝 Files to Update (Frontend)

### 1. `useRolesPermissions.js` (or similar composable/hook)

**Line ~350** - Update `generateCaslForRole`:

```javascript
// ❌ BEFORE
const generateCaslForRole = async (roleId, permissions) => {
  return await apiService.post(`/api/v1/roles/${roleId}/generate-casl`, {
    permissions
  });
};

// ✅ AFTER
const generateCaslForRole = async (roleId, permissions) => {
  return await apiService.post(`/api/v1/permissions/roles/${roleId}/generate-casl`, {
    permissions
  });
};
```

### 2. API Service Files

Check these files for role endpoints:
- `src/api/roles.js`
- `src/api/permissions.js`
- `src/services/roleService.js`
- `src/composables/useRoles.js`
- `src/stores/roleStore.js`

**Pattern to find**:
```javascript
// ❌ Wrong patterns
api.get('/roles')
api.post('/roles')
api.put(`/roles/${id}`)
api.delete(`/roles/${id}`)
api.get(`/roles/${id}/preview`)
api.post(`/roles/${id}/generate-casl`)
```

**Pattern to use**:
```javascript
// ✅ Correct patterns
api.get('/permissions/roles')
api.post('/permissions/roles')
api.put(`/permissions/roles/${id}`)
api.delete(`/permissions/roles/${id}`)
api.get(`/permissions/roles/${id}/preview`)
api.post(`/permissions/roles/${id}/generate-casl`)
```

---

## 🎯 Complete API Mapping

| Method | ❌ Old Path | ✅ New Path |
|--------|------------|------------|
| GET | `/roles` | `/permissions/roles` |
| POST | `/roles` | `/permissions/roles` |
| GET | `/roles/:id` | `/permissions/roles/:id` |
| PUT | `/roles/:id` | `/permissions/roles/:id` |
| DELETE | `/roles/:id` | `/permissions/roles/:id` |
| PATCH | `/roles/:id/permissions` | `/permissions/roles/:id/permissions` |
| POST | `/roles/:id/reset` | `/permissions/roles/:id/reset` |
| GET | `/roles/:id/preview` | `/permissions/roles/:id/preview` |
| POST | `/roles/:roleId/generate-casl` | `/permissions/roles/:roleId/generate-casl` |

---

## 📦 Recommended API Service Structure

Create or update `src/api/permissions.js`:

```javascript
import api from './apiClient'; // or your API instance

const PERMISSIONS_BASE = '/api/v1/permissions';

export const permissionsApi = {
  // ==========================================
  // USER PERMISSIONS
  // ==========================================
  getUserPermissions() {
    return api.get(`${PERMISSIONS_BASE}/user`);
  },

  // ==========================================
  // SUBJECTS
  // ==========================================
  getSubjects() {
    return api.get(`${PERMISSIONS_BASE}/subjects`);
  },

  // ==========================================
  // ROLES - CRUD
  // ==========================================
  getAllRoles() {
    return api.get(`${PERMISSIONS_BASE}/roles`);
  },

  getRoleById(roleId) {
    return api.get(`${PERMISSIONS_BASE}/roles/${roleId}`);
  },

  createRole(data) {
    return api.post(`${PERMISSIONS_BASE}/roles`, data);
  },

  updateRole(roleId, data) {
    return api.put(`${PERMISSIONS_BASE}/roles/${roleId}`, data);
  },

  deleteRole(roleId) {
    return api.delete(`${PERMISSIONS_BASE}/roles/${roleId}`);
  },

  // ==========================================
  // ROLES - PERMISSIONS
  // ==========================================
  updateRolePermissions(roleId, permissions) {
    return api.patch(`${PERMISSIONS_BASE}/roles/${roleId}/permissions`, {
      permissions
    });
  },

  resetRolePermissions(roleId) {
    return api.post(`${PERMISSIONS_BASE}/roles/${roleId}/reset`);
  },

  previewRolePermissions(roleId) {
    return api.get(`${PERMISSIONS_BASE}/roles/${roleId}/preview`);
  },

  generateCaslRules(roleId, permissions, conditions = { tenantId: '$tenantId' }) {
    return api.post(`${PERMISSIONS_BASE}/roles/${roleId}/generate-casl`, {
      permissions,
      conditions
    });
  },

  // ==========================================
  // MENU & ROUTES
  // ==========================================
  getMenuConfig() {
    return api.get(`${PERMISSIONS_BASE}/menu`);
  },

  getRoutesMetadata() {
    return api.get(`${PERMISSIONS_BASE}/routes`);
  },

  regenerateRoutesMetadata() {
    return api.post(`${PERMISSIONS_BASE}/routes/regenerate`);
  },
};

export default permissionsApi;
```

---

## 🔧 Usage in Components/Composables

### Vue 3 Composable Example

```javascript
// useRoles.js
import { ref } from 'vue';
import { permissionsApi } from '@/api/permissions';

export function useRoles() {
  const roles = ref([]);
  const loading = ref(false);
  const error = ref(null);

  const fetchRoles = async () => {
    loading.value = true;
    error.value = null;
    try {
      const response = await permissionsApi.getAllRoles();
      roles.value = response.data.roles;
    } catch (err) {
      error.value = err.message;
      console.error('[useRoles] Error fetching roles:', err);
    } finally {
      loading.value = false;
    }
  };

  const generateCasl = async (roleId, permissions) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await permissionsApi.generateCaslRules(
        roleId, 
        permissions
      );
      return response.data;
    } catch (err) {
      error.value = err.message;
      console.error('[useRoles] Error generating CASL:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    roles,
    loading,
    error,
    fetchRoles,
    generateCasl,
  };
}
```

### React Hook Example

```javascript
// useRoles.js
import { useState, useCallback } from 'react';
import { permissionsApi } from '@/api/permissions';

export function useRoles() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await permissionsApi.getAllRoles();
      setRoles(response.data.roles);
    } catch (err) {
      setError(err.message);
      console.error('[useRoles] Error fetching roles:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const generateCasl = useCallback(async (roleId, permissions) => {
    setLoading(true);
    setError(null);
    try {
      const response = await permissionsApi.generateCaslRules(
        roleId, 
        permissions
      );
      return response.data;
    } catch (err) {
      setError(err.message);
      console.error('[useRoles] Error generating CASL:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    roles,
    loading,
    error,
    fetchRoles,
    generateCasl,
  };
}
```

---

## 🧪 Testing Steps

### 1. Update Frontend Code
```bash
# Search for incorrect paths
grep -r "'/roles/" src/
grep -r '"/roles/"' src/

# Search for API calls to roles
grep -r "api.get('/roles" src/
grep -r "api.post('/roles" src/
grep -r "apiService.post('/api/v1/roles" src/
```

### 2. Test in Browser

Open browser console and verify API calls:

**Before Fix** (404 errors):
```
❌ POST http://localhost:8000/api/v1/roles/xxx/generate-casl 404
❌ GET  http://localhost:8000/api/v1/roles 404
```

**After Fix** (Success):
```
✅ POST http://localhost:8000/api/v1/permissions/roles/xxx/generate-casl 200
✅ GET  http://localhost:8000/api/v1/permissions/roles 200
```

### 3. Test Key Features

- [ ] Load roles list (GET /permissions/roles)
- [ ] Create new role (POST /permissions/roles)
- [ ] Update role (PUT /permissions/roles/:id)
- [ ] Update role permissions (PATCH /permissions/roles/:id/permissions)
- [ ] Preview role permissions (GET /permissions/roles/:id/preview)
- [ ] Generate CASL rules (POST /permissions/roles/:id/generate-casl)
- [ ] Delete role (DELETE /permissions/roles/:id)

---

## 📊 Backend Route Structure

For reference, backend routes are mounted as:

```
/api/v1                              (Express app)
  └── /permissions                    (Main router)
       ├── /user                       (User permissions)
       ├── /subjects                   (All CASL subjects)
       ├── /menu                       (Menu config)
       ├── /routes                     (Routes metadata)
       └── /roles                      (Role management)
            ├── GET    /
            ├── POST   /
            ├── GET    /:id
            ├── PUT    /:id
            ├── DELETE /:id
            ├── PATCH  /:id/permissions
            ├── POST   /:id/reset
            ├── GET    /:id/preview
            └── POST   /:roleId/generate-casl  ← Target endpoint
```

**Full Path**: `/api/v1/permissions/roles/:roleId/generate-casl`

---

## 🚨 Common Mistakes to Avoid

### ❌ Don't Do This
```javascript
// Missing /permissions prefix
apiService.post(`/api/v1/roles/${id}/generate-casl`, data);

// Using /auth/roles or /admin/roles
apiService.get('/admin/roles');

// Hardcoding full URL without base path
apiService.get('http://localhost:5000/api/v1/roles');
```

### ✅ Do This
```javascript
// Correct path with /permissions
permissionsApi.generateCaslRules(id, data);

// Use API base configuration
const API_BASE = '/api/v1/permissions';
api.get(`${API_BASE}/roles`);

// Or use the service function
permissionsApi.getAllRoles();
```

---

## 📝 Checklist for Frontend Developer

- [ ] Update `useRolesPermissions.js` or similar composable
- [ ] Update API service files (`api/roles.js`, `api/permissions.js`)
- [ ] Search and replace all `/roles/` paths with `/permissions/roles/`
- [ ] Test in browser - check Network tab for correct paths
- [ ] Verify no 404 errors in console
- [ ] Test create/update/delete role functionality
- [ ] Test generate CASL rules feature
- [ ] Update any hardcoded URLs in tests
- [ ] Update API documentation/comments
- [ ] Commit changes with clear message

---

## 💬 Need Help?

If you encounter issues:

1. **Check backend is running**: `http://localhost:5000/api/v1/permissions/subjects`
2. **Verify token is valid**: Check Authorization header in Network tab
3. **Check CORS settings**: Backend must allow frontend origin
4. **Review backend logs**: Check `logs/` directory for errors
5. **Test with curl**: Confirm backend endpoint works standalone

### Test Backend Endpoint Directly

**PowerShell**:
```powershell
$token = "your-jwt-token-here"
Invoke-WebRequest `
  -Uri "http://localhost:5000/api/v1/permissions/roles" `
  -Headers @{"Authorization"="Bearer $token"}
```

**Bash**:
```bash
curl http://localhost:5000/api/v1/permissions/roles \
  -H "Authorization: Bearer your-jwt-token-here"
```

If backend returns 200, then frontend path is the issue.  
If backend returns 404, then backend routing needs checking.

---

## 📚 Related Documentation

- [PERMISSION-ROUTES-REFERENCE.md](./PERMISSION-ROUTES-REFERENCE.md) - Complete backend routes
- [PERMISSION-BUGS-FIX-REPORT.md](./PERMISSION-BUGS-FIX-REPORT.md) - Backend fixes applied
- [PERMISSION-QUICK-REFERENCE.md](./PERMISSION-QUICK-REFERENCE.md) - Quick reference guide

---

*Last Updated: 2025-02-22*  
*For: Frontend Team*  
*Status: Action Required*
