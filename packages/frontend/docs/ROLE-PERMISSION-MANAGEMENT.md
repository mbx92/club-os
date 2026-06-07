# Role & Permission Management API

## Overview
Sistem manajemen role dan permission yang memungkinkan admin untuk membuat, mengupdate, dan mengelola roles beserta permissions mereka. Permissions disimpan dalam format JSON di field `permissions` pada tabel `roles`.

## Database Structure

### Role Model
```javascript
{
  id: UUID,
  name: STRING,           // Unique role name
  description: TEXT,      // Role description
  permissions: JSON,      // Permission object
  isActive: BOOLEAN,      // Active status
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP
}
```

### Permission Structure
Permissions are stored as lowercase plural keys with arrays of allowed actions:

```json
{
  "users": ["read", "create", "update", "delete"],
  "tenants": ["read", "update"],
  "members": ["read", "create", "update", "delete"],
  "memberships": ["read", "create", "update"],
  "membershipTypes": ["read", "create", "update"],
  "payments": ["read", "create"],
  "membershipPayments": ["read", "create", "update"],
  "checkins": ["read", "create", "update"],
  "vouchers": ["read", "create", "update", "delete"],
  "transactions": ["read"],
  "subscriptions": ["read", "update"],
  "subscriptionPlans": ["read"],
  "invoices": ["read", "create", "update"],
  "roles": ["read", "create", "update", "delete"]
}
```

**Important Notes**:
- Permission keys use **lowercase plural camelCase** (e.g., `users`, `membershipPayments`)
- CASL resources use **PascalCase singular** (e.g., `User`, `MembershipPayment`)
- Backend automatically converts between these formats
- Use `GET /api/permissions/routes` to get the current available resources (see section 2)

### Available Actions
- `read` - View/list resources
- `create` - Create new resources
- `update` - Modify existing resources
- `delete` - Remove resources
- `manage` - Full access (all actions)

## API Endpoints

### 1. Get All Roles

**Endpoint**: `GET /api/permissions/roles`

**Description**: Retrieve all roles with their permissions.

**Authentication**: Required

**Authorization**: Any authenticated user can view roles

**Request**:
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/permissions/roles
```

**Response**:
```json
{
  "success": true,
  "data": {
    "roles": [
      {
        "id": "uuid-1",
        "name": "admin",
        "description": "Administrator with full access",
        "permissions": {
          "users": ["read", "create", "update", "delete"],
          "tenants": ["read", "update"],
          "members": ["read", "create", "update", "delete"],
          "memberships": ["read", "create", "update", "delete"],
          "payments": ["read", "create", "update", "delete"],
          "checkins": ["read", "create", "update", "delete"]
        },
        "isActive": true
      },
      {
        "id": "uuid-2",
        "name": "manager",
        "description": "Manager with limited access",
        "permissions": {
          "users": ["read", "update"],
          "members": ["read", "create", "update"],
          "memberships": ["read", "create", "update"],
          "payments": ["read", "create", "update"],
          "checkins": ["read", "create", "update"]
        },
        "isActive": true
      },
      {
        "id": "uuid-3",
        "name": "user",
        "description": "Regular user with minimal access",
        "permissions": {
          "users": ["read"],
          "members": ["read"],
          "memberships": ["read"],
          "payments": ["read"],
          "checkins": ["create"]
        },
        "isActive": true
      }
    ]
  }
}
```

---

### 2. Get Available Routes (Metadata)

**Endpoint**: `GET /api/permissions/routes`

**Description**: Retrieve all available routes with their metadata, including paths, methods, required permissions, and resources. This endpoint is useful for building dynamic permission UI.

**Authentication**: Required

**Authorization**: Any authenticated user can view routes

**Request**:
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/permissions/routes
```

**Response**:
```json
{
  "success": true,
  "data": {
    "routes": {
      "auth.post": {
        "path": "/auth/login",
        "method": "POST",
        "description": "Create auth",
        "permissions": {
          "roles": ["public"],
          "actions": ["create"],
          "resource": "Auth"
        }
      },
      "tenant.get": {
        "path": "/tenant/",
        "method": "GET",
        "description": "Get tenant",
        "permissions": {
          "roles": ["admin"],
          "actions": ["read"],
          "resource": "Resource"
        }
      },
      "user.get": {
        "path": "/user/",
        "method": "GET",
        "description": "Get user",
        "permissions": {
          "roles": ["admin"],
          "actions": ["read"],
          "resource": "Resource"
        }
      },
      "user.post": {
        "path": "/user/",
        "method": "POST",
        "description": "Create user",
        "permissions": {
          "roles": ["admin"],
          "actions": ["create"],
          "resource": "Resource"
        }
      }
      // ... more routes
    }
  }
}
```

**Usage - Extract Resources for Permission UI**:
```javascript
// Frontend: Extract unique resources and their actions
const extractResources = (routesMetadata) => {
  const resourceMap = {};
  
  Object.values(routesMetadata).forEach(route => {
    const { resource } = route.permissions;
    const actions = route.permissions.actions || [];
    
    if (!resourceMap[resource]) {
      resourceMap[resource] = new Set();
    }
    
    actions.forEach(action => {
      resourceMap[resource].add(action);
    });
  });
  
  // Convert to array format
  return Object.entries(resourceMap).map(([name, actions]) => ({
    name,
    actions: Array.from(actions)
  }));
};

// Example usage:
const availableResources = extractResources(response.data.routes);
// Result:
// [
//   { name: 'Auth', actions: ['read', 'create'] },
//   { name: 'Resource', actions: ['read', 'create', 'update', 'delete'] },
//   ...
// ]
```

**Note**: The routes metadata is stored in `src/utils/routesMetadata.js` and can be regenerated using:
```bash
npm run generate:routes
```

This script scans all route files and extracts metadata. After adding new routes, run this script to update the metadata.

📖 **See [Routes Metadata Guide](./ROUTES-METADATA-GUIDE.md)** for detailed information about:
- When to regenerate routes metadata
- Auto-generation options (watch mode, git hooks, CI/CD)
- Best practices and workflows
- Troubleshooting

---

### 3. Regenerate Routes Metadata

**Endpoint**: `POST /api/permissions/routes/regenerate`

**Description**: Trigger regeneration of routes metadata from all route files. This endpoint scans all `src/routes/*.js` files and updates `src/utils/routesMetadata.js`.

**Authentication**: Required

**Authorization**: Superadmin only

**Request**:
```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/permissions/routes/regenerate
```

**Response**:
```json
{
  "success": true,
  "message": "Routes metadata regenerated successfully",
  "data": {
    "routesCount": 33,
    "timestamp": "2025-11-21T10:30:00.000Z"
  }
}
```

**Error Response** (Non-superadmin):
```json
{
  "message": "Forbidden: Superadmin access required"
}
```

**Use Cases**:
- After adding new route files
- After modifying route paths or methods
- When routes metadata is out of sync
- Triggered from admin dashboard UI

**Important Notes**:
- Only accessible by superadmin for security
- Automatically reloads metadata in memory (no server restart needed)
- Operation is logged in audit trail
- Frontend `GET /api/permissions/routes` will immediately return updated data after regeneration

---

### 4. Create Role

**Endpoint**: `POST /api/permissions/roles`

**Description**: Create a new role with specified permissions.

**Authentication**: Required

**Authorization**: Admin or Superadmin only

**Request Body**:
```json
{
  "name": "trainer",
  "description": "Personal trainer with member management access",
  "permissions": {
    "members": ["read", "create", "update"],
    "memberships": ["read"],
    "checkins": ["read", "create"],
    "payments": ["read"]
  }
}
```

**Request**:
```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "trainer",
    "description": "Personal trainer with member management access",
    "permissions": {
      "members": ["read", "create", "update"],
      "memberships": ["read"],
      "checkins": ["read", "create"],
      "payments": ["read"]
    }
  }' \
  http://localhost:3000/api/permissions/roles
```

**Response**:
```json
{
  "success": true,
  "message": "Role created successfully",
  "data": {
    "role": {
      "id": "uuid-4",
      "name": "trainer",
      "description": "Personal trainer with member management access",
      "permissions": {
        "members": ["read", "create", "update"],
        "memberships": ["read"],
        "checkins": ["read", "create"],
        "payments": ["read"]
      },
      "isActive": true,
      "createdAt": "2025-11-21T00:00:00.000Z",
      "updatedAt": "2025-11-21T00:00:00.000Z"
    }
  }
}
```

**Validation**:
- `name` is required and must be unique
- Cannot create role with name of existing system roles (admin, manager, user)

**Error Responses**:
```json
// 400 - Missing name
{
  "success": false,
  "message": "Role name is required"
}

// 400 - Duplicate name
{
  "success": false,
  "message": "Role with this name already exists"
}

// 403 - Unauthorized
{
  "success": false,
  "message": "Forbidden by CASL policy"
}
```

---

### 5. Update Role Details

**Endpoint**: `PUT /api/permissions/roles/:id`

**Description**: Update role basic information (name, description, isActive). Does NOT update permissions - use PATCH endpoint for that.

**Authentication**: Required

**Authorization**: Admin or Superadmin only

**URL Parameters**:
- `id` (UUID) - Role ID

**Request Body**:
```json
{
  "name": "trainer",
  "description": "Senior personal trainer with extended access",
  "isActive": true
}
```

**Request**:
```bash
curl -X PUT \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "trainer",
    "description": "Senior personal trainer with extended access",
    "isActive": true
  }' \
  http://localhost:3000/api/permissions/roles/uuid-4
```

**Response**:
```json
{
  "success": true,
  "message": "Role updated successfully",
  "data": {
    "role": {
      "id": "uuid-4",
      "name": "trainer",
      "description": "Senior personal trainer with extended access",
      "permissions": {
        "members": ["read", "create", "update"],
        "memberships": ["read"],
        "checkins": ["read", "create"],
        "payments": ["read"]
      },
      "isActive": true,
      "createdAt": "2025-11-21T00:00:00.000Z",
      "updatedAt": "2025-11-21T01:00:00.000Z"
    }
  }
}
```

**Validation**:
- Cannot rename system roles (admin, manager, user)
- All fields are optional (partial update)

**Error Responses**:
```json
// 404 - Role not found
{
  "success": false,
  "message": "Role not found"
}

// 403 - Cannot rename system role
{
  "success": false,
  "message": "Cannot rename system roles"
}
```

---

### 6. Update Role Permissions ⭐

**Endpoint**: `PATCH /api/permissions/roles/:id/permissions`

**Description**: Update permissions for a specific role. Uses **partial update (merge)** - only updates provided permissions, keeps others unchanged.

**Authentication**: Required

**Authorization**: Admin or Superadmin only

**URL Parameters**:
- `id` (UUID) - Role ID

**Request Body**:
```json
{
  "permissions": {
    "payments": ["read", "create"],
    "vouchers": ["read", "create", "update"],
    "transactions": ["read"]
  }
}
```

**Request**:
```bash
curl -X PATCH \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "permissions": {
      "payments": ["read", "create"],
      "vouchers": ["read", "create", "update"],
      "transactions": ["read"]
    }
  }' \
  http://localhost:3000/api/permissions/roles/uuid-4/permissions
```

**Response**:
```json
{
  "success": true,
  "message": "Role permissions updated successfully",
  "data": {
    "role": {
      "id": "uuid-4",
      "name": "trainer",
      "description": "Senior personal trainer with extended access",
      "permissions": {
        "members": ["read", "create", "update"],
        "memberships": ["read"],
        "checkins": ["read", "create"],
        "payments": ["read", "create"],
        "vouchers": ["read", "create", "update"],
        "transactions": ["read"]
      },
      "isActive": true,
      "createdAt": "2025-11-21T00:00:00.000Z",
      "updatedAt": "2025-11-21T02:00:00.000Z"
    }
  }
}
```

**Important Notes**:
- **Merge behavior**: New permissions are merged with existing ones
- Existing permissions NOT mentioned in the request remain unchanged
- To remove a permission, you must explicitly set it to empty array or null
- Changes are logged for audit purposes

**Example - Removing Permissions**:
```json
{
  "permissions": {
    "payments": [],        // Remove all payment permissions
    "vouchers": null       // Remove voucher permissions completely
  }
}
```

**Validation**:
- `permissions` must be a valid object
- Permission values must be arrays of strings

**Error Responses**:
```json
// 400 - Invalid permissions
{
  "success": false,
  "message": "Valid permissions object is required"
}

// 404 - Role not found
{
  "success": false,
  "message": "Role not found"
}
```

---

### 7. Delete Role

**Endpoint**: `DELETE /api/permissions/roles/:id`

**Description**: Delete a role. Cannot delete system roles or roles currently assigned to users.

**Authentication**: Required

**Authorization**: Admin or Superadmin only

**URL Parameters**:
- `id` (UUID) - Role ID

**Request**:
```bash
curl -X DELETE \
  -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/permissions/roles/uuid-4
```

**Response**:
```json
{
  "success": true,
  "message": "Role deleted successfully"
}
```

**Validation**:
- Cannot delete system roles (admin, manager, user)
- Cannot delete role if any users are assigned to it

**Error Responses**:
```json
// 403 - System role
{
  "success": false,
  "message": "Cannot delete system roles"
}

// 400 - Role in use
{
  "success": false,
  "message": "Cannot delete role. 5 user(s) are assigned to this role."
}

// 404 - Role not found
{
  "success": false,
  "message": "Role not found"
}
```

---

## Permission Resources

### How to Get Available Resources

**Important**: The list of available resources is **dynamic** and should be retrieved from the backend using the `GET /api/permissions/routes` endpoint (see section 2).

The backend maintains a `routesMetadata.js` file that contains all available routes, their required permissions, and resources. Frontend should:

1. Call `GET /api/permissions/routes` to get all routes
2. Extract unique resources and their actions from the response
3. Build the permission UI dynamically based on this data

**Example - Building Resource List from Routes**:
```javascript
async function getAvailableResources() {
  const response = await fetch('/api/permissions/routes', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const { data } = await response.json();
  const resourceMap = {};
  
  // Extract resources from routes metadata
  Object.values(data.routes).forEach(route => {
    const { resource, actions = [] } = route.permissions;
    
    if (!resourceMap[resource]) {
      resourceMap[resource] = new Set();
    }
    
    actions.forEach(action => resourceMap[resource].add(action));
  });
  
  // Convert to array format for UI
  return Object.entries(resourceMap).map(([name, actions]) => ({
    name,
    actions: Array.from(actions),
    displayName: name // Can be mapped to user-friendly names
  }));
}

// Usage in Vue component:
const availableResources = await getAvailableResources();
// Result will be dynamic based on current backend routes:
// [
//   { name: 'Auth', actions: ['read', 'create'], displayName: 'Authentication' },
//   { name: 'Resource', actions: ['read', 'create', 'update', 'delete'], displayName: 'Resources' },
//   { name: 'User', actions: ['read', 'create', 'update', 'delete'], displayName: 'Users' },
//   ...
// ]
```

### Current Available Resources
Based on the current backend implementation, these resources are typically available:

| Resource | Description | Common Actions |
|----------|-------------|----------------|
| `Auth` | Authentication | read, create |
| `User` | User management | read, create, update, delete |
| `Tenant` | Tenant management | read, create, update, delete |
| `Member` | Gym member management | read, create, update, delete |
| `Membership` | Membership management | read, create, update, delete |
| `MembershipType` | Membership type configuration | read, create, update, delete |
| `Payment` | Payment processing | read, create, update, delete |
| `MembershipPayment` | Membership payment tracking | read, create, update, delete |
| `CheckIn` | Member check-in tracking | read, create, update, delete |
| `Voucher` | Voucher/discount management | read, create, update, delete |
| `Transaction` | Transaction history | read, create, update, delete |
| `Subscription` | Subscription management | read, create, update, delete |
| `SubscriptionPlan` | Subscription plan configuration | read, create, update, delete |
| `Invoice` | Invoice management | read, create, update, delete |
| `Role` | Role management | read, create, update, delete, manage |
| `Resource` | Generic resource (maps to specific resources) | read, create, update, delete |

**Note**: 
- The actual resource names in `routesMetadata.js` may differ from the permission keys used in role permissions
- Some routes use generic `Resource` subject which maps to specific resources (User, Tenant, etc.)
- Always fetch the latest resources using `GET /api/permissions/routes` instead of hardcoding
- To update routes metadata after adding new endpoints, run: `npm run generate:routes`
- See [Routes Metadata Guide](./ROUTES-METADATA-GUIDE.md) for automation options

### Permission Inheritance
Permissions follow these rules:
- **Superadmin**: Has `manage` (all actions) on all resources across all tenants
- **Admin**: Has permissions defined in role, scoped to their tenant
- **Manager/Other roles**: Has permissions defined in role, scoped to their tenant

## Security & Authorization

### CASL Integration
Role permissions integrate with CASL (Code Access Security Library) for fine-grained access control:

```javascript
// Backend: src/utils/casl.js
if (user.role && user.role.name === 'admin') {
  can('manage', 'Role'); // Admin can manage roles
}

// Frontend: Can check permissions
ability.can('update', 'Role');  // Returns true if user has permission
```

### Access Control
- **Route Protection**: All role management routes require authentication
- **CASL Middleware**: Checks if user has `create`, `update`, or `delete` permission on `Role` subject
- **Tenant Isolation**: Regular admins can only manage roles, but role applies tenant-wide
- **Audit Logging**: All role changes are logged for compliance

### System Roles Protection
The following roles are protected from deletion and renaming:
- `admin` - Full administrator access
- `manager` - Manager with limited permissions
- `user` - Regular user with minimal access

## Use Cases

### Creating a Custom Role for Receptionist
```bash
POST /api/permissions/roles
{
  "name": "receptionist",
  "description": "Front desk receptionist",
  "permissions": {
    "members": ["read", "create", "update"],
    "checkins": ["read", "create"],
    "payments": ["read"],
    "memberships": ["read"]
  }
}
```

### Upgrading Role Permissions
```bash
PATCH /api/permissions/roles/:id/permissions
{
  "permissions": {
    "payments": ["read", "create"],  // Add create permission
    "transactions": ["read"]         // Add new resource access
  }
}
```

### Temporarily Disabling a Role
```bash
PUT /api/permissions/roles/:id
{
  "isActive": false
}
```

### Viewing All Users with a Specific Role
```bash
GET /api/users?roleId=uuid-4
```

## Frontend Integration

### Fetching Roles for UI
```javascript
// Get all roles for dropdown/selection
const response = await fetch('/api/permissions/roles', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const { data } = await response.json();
const roles = data.roles;
```

### Updating Role Permissions in Admin Panel
```javascript
// Update permissions when admin toggles checkboxes
const updatePermissions = async (roleId, newPermissions) => {
  const response = await fetch(`/api/permissions/roles/${roleId}/permissions`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ permissions: newPermissions })
  });
  
  return await response.json();
};
```

### Checking User Permissions
```javascript
// After login, fetch user permissions
const response = await fetch('/api/permissions/user', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const { data } = await response.json();
const { rolePermissions } = data.permissions;

// Check if user can create members
const canCreateMembers = rolePermissions.members?.includes('create');
```

## Best Practices

1. **Principle of Least Privilege**: Grant only the minimum permissions needed for a role
2. **Regular Audits**: Periodically review role permissions and remove unused roles
3. **Descriptive Names**: Use clear, descriptive names for custom roles
4. **Documentation**: Document custom roles and their intended use cases
5. **Testing**: Test permission changes in a non-production environment first
6. **Backup**: Before major permission changes, export current role configuration
7. **Granular Updates**: Use PATCH for permission updates to avoid overwriting unrelated permissions

## Troubleshooting

### Permission Not Working After Update
- Clear user sessions/tokens (permissions are embedded in JWT)
- Verify CASL rules in `src/utils/casl.js` match database permissions
- Check audit logs for successful update confirmation

### Cannot Delete Role
- Check if users are assigned: `SELECT COUNT(*) FROM users WHERE roleId = 'uuid'`
- Reassign users to different role before deletion
- System roles cannot be deleted by design

### Frontend Not Reflecting New Permissions
- Ensure user logs out and logs in again (new JWT with updated permissions)
- Check `/api/permissions/user` returns updated permissions
- Verify frontend ability object is rebuilt after login

## Related Documentation

- [Routes Metadata Guide](./ROUTES-METADATA-GUIDE.md) - How to generate and manage routes metadata
- [CASL Synchronization](./CASL-SYNCHRONIZATION.md) - Frontend/Backend permission sync
- [Authentication Endpoints](./AUTHENTICATION-ENDPOINTS.md) - Login and auth flow
- [API Documentation](./API-DOCUMENTATION.md) - Complete API reference

## Changelog

### Version 1.1.0 (2025-11-21)
- Added `GET /api/permissions/routes` endpoint documentation
- Documented how to extract available resources from routes metadata
- Added dynamic resource discovery guide for frontend
- Clarified naming conventions (plural camelCase vs PascalCase)
- Updated Permission Resources section with extraction examples

### Version 1.0.0 (2025-11-21)
- Initial role management API implementation
- Create, read, update, delete role endpoints
- Permission update with merge support
- System role protection
- Audit logging integration
- Postman collection updated
