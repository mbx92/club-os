# CASL Synchronization between Frontend and Backend

## Overview

This document explains how to synchronize CASL (Code Access Security Library) permissions between the frontend and backend of the Gym Membership Multi-Tenant system. The synchronization ensures that both the frontend (for UI elements and navigation) and backend (for API endpoints) use the same permission rules, providing a consistent security model across the entire application.

## Architecture

### Backend CASL Implementation

The backend uses CASL to protect API endpoints based on user roles and permissions. The implementation includes:

1. **Permission Definition**: Permissions are defined in the `Role` model and stored in the database.
2. **Ability Builder**: The `abilityBuilder` function in `src/utils/casl.js` creates an ability object for each user based on their role.
3. **Middleware**: The `caslMiddleware` checks if a user has the required permissions to access a specific endpoint.

### Frontend CASL Implementation

The frontend will use CASL to control UI elements and navigation based on user permissions. The implementation includes:

1. **Permission Retrieval**: The frontend retrieves user permissions from the backend via the `/api/permissions/user` endpoint.
2. **Ability Creation**: The frontend creates an ability object using the same rules as the backend.
3. **UI Control**: The frontend uses the ability object to show/hide UI elements and control navigation.

## API Endpoints

### 1. Get User Permissions

**Endpoint**: `GET /api/permissions/user`

**Description**: Retrieves the current user's permissions, including CASL rules and role permissions.

**Response**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "isSuperAdmin": false,
      "tenantId": 1,
      "role": {
        "id": 2,
        "name": "manager"
      }
    },
    "permissions": {
      "caslRules": [
        {
          "action": "read",
          "subject": "User",
          "conditions": {
            "tenantId": 1
          },
          "fields": null,
          "inverted": false
        },
        {
          "action": "create",
          "subject": "User",
          "conditions": {
            "tenantId": 1
          },
          "fields": null,
          "inverted": false
        },
        {
          "action": "update",
          "subject": "User",
          "conditions": {
            "tenantId": 1
          },
          "fields": null,
          "inverted": false
        }
      ],
      "rolePermissions": {
        "users": ["read", "create", "update"],
        "tenants": ["read", "update"],
        "members": ["read", "create", "update"],
        "memberships": ["read", "create", "update"],
        "payments": ["read"],
        "checkins": ["read", "create"]
      }
    }
  }
}
```

### 2. Get Routes Metadata

**Endpoint**: `GET /api/permissions/routes`

**Description**: Retrieves metadata for all routes in the application, including required permissions.

**Response**:
```json
{
  "success": true,
  "data": {
    "routes": {
      "users.list": {
        "path": "/users",
        "method": "GET",
        "description": "Get all users",
        "permissions": {
          "roles": ["admin", "manager"],
          "actions": ["read"],
          "resource": "User"
        }
      },
      "users.create": {
        "path": "/users",
        "method": "POST",
        "description": "Create a new user",
        "permissions": {
          "roles": ["admin", "manager"],
          "actions": ["create"],
          "resource": "User"
        }
      },
      // ... other routes
    }
  }
}
```

### 3. Get All Roles

**Endpoint**: `GET /api/permissions/roles`

**Description**: Retrieves all roles with their permissions.

**Response**:
```json
{
  "success": true,
  "data": {
    "roles": [
      {
        "id": 1,
        "name": "admin",
        "description": "Administrator with full access",
        "permissions": {
          "users": ["read", "create", "update", "delete"],
          "tenants": ["read", "create", "update", "delete"],
          "members": ["read", "create", "update", "delete"],
          "memberships": ["read", "create", "update", "delete"],
          "payments": ["read", "create", "update", "delete"],
          "checkins": ["read", "create", "update", "delete"]
        },
        "isActive": true
      },
      // ... other roles
    ]
  }
}
```

## Frontend Implementation

### 1. Permission Service

Create a service to handle permission retrieval and management:

```javascript
// services/permissionService.js

import axios from 'axios';

class PermissionService {
  constructor() {
    this.ability = null;
    this.user = null;
    this.rolePermissions = null;
  }

  async fetchUserPermissions() {
    try {
      const response = await axios.get('/api/permissions/user');
      const { user, permissions } = response.data.data;
      
      this.user = user;
      this.rolePermissions = permissions.rolePermissions;
      
      // Create ability using CASL
      const { Ability, AbilityBuilder } = await import('@casl/ability');
      const { can, build } = new AbilityBuilder(Ability);
      
      // Add rules based on CASL rules from backend
      permissions.caslRules.forEach(rule => {
        const { action, subject, conditions, inverted } = rule;
        
        if (inverted) {
          can(action, subject, conditions).unless(conditions);
        } else {
          can(action, subject, conditions);
        }
      });
      
      this.ability = build();
      
      return {
        user,
        permissions,
        ability: this.ability
      };
    } catch (error) {
      console.error('Error fetching user permissions:', error);
      throw error;
    }
  }

  async fetchRoutesMetadata() {
    try {
      const response = await axios.get('/api/permissions/routes');
      return response.data.data.routes;
    } catch (error) {
      console.error('Error fetching routes metadata:', error);
      throw error;
    }
  }

  async fetchAllRoles() {
    try {
      const response = await axios.get('/api/permissions/roles');
      return response.data.data.roles;
    } catch (error) {
      console.error('Error fetching all roles:', error);
      throw error;
    }
  }

  getAbility() {
    return this.ability;
  }

  getUser() {
    return this.user;
  }

  getRolePermissions() {
    return this.rolePermissions;
  }

  can(action, subject) {
    return this.ability ? this.ability.can(action, subject) : false;
  }

  cannot(action, subject) {
    return this.ability ? this.ability.cannot(action, subject) : true;
  }
}

export default new PermissionService();
```

### 2. Permission Provider

Create a context provider to make permissions available throughout the application:

```javascript
// contexts/PermissionContext.js

import React, { createContext, useContext, useEffect, useState } from 'react';
import permissionService from '../services/permissionService';

const PermissionContext = createContext();

export const usePermissions = () => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
};

export const PermissionProvider = ({ children }) => {
  const [ability, setAbility] = useState(null);
  const [user, setUser] = useState(null);
  const [rolePermissions, setRolePermissions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { user, permissions, ability } = await permissionService.fetchUserPermissions();
      
      setUser(user);
      setRolePermissions(permissions.rolePermissions);
      setAbility(ability);
    } catch (err) {
      setError(err);
      console.error('Error fetching permissions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  const value = {
    ability,
    user,
    rolePermissions,
    loading,
    error,
    refetch: fetchPermissions,
    can: (action, subject) => ability ? ability.can(action, subject) : false,
    cannot: (action, subject) => ability ? ability.cannot(action, subject) : true,
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
};
```

### 3. Route Guard Component

Create a component to protect routes based on permissions:

```javascript
// components/RouteGuard.js

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { usePermissions } from '../contexts/PermissionContext';

const RouteGuard = ({ children, action, subject, fallback = '/unauthorized' }) => {
  const { can, loading } = usePermissions();
  const location = useLocation();

  if (loading) {
    return <div>Loading permissions...</div>;
  }

  if (!can(action, subject)) {
    return <Navigate to={fallback} state={{ from: location }} replace />;
  }

  return children;
};

export default RouteGuard;
```

### 4. Protected Route Component

Create a component for protected routes:

```javascript
// components/ProtectedRoute.js

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import RouteGuard from './RouteGuard';

const ProtectedRoute = ({ 
  children, 
  action, 
  subject, 
  fallback = '/unauthorized',
  requireAuth = true 
}) => {
  const location = useLocation();
  const token = localStorage.getItem('token');

  if (requireAuth && !token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (action && subject) {
    return (
      <RouteGuard action={action} subject={subject} fallback={fallback}>
        {children}
      </RouteGuard>
    );
  }

  return children;
};

export default ProtectedRoute;
```

### 5. Usage in Application

#### Protecting Routes

```javascript
// App.js

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { PermissionProvider } from './contexts/PermissionContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import UnauthorizedPage from './pages/UnauthorizedPage';

function App() {
  return (
    <PermissionProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute action="read" subject="Dashboard">
                <DashboardPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/users" 
            element={
              <ProtectedRoute action="read" subject="User">
                <UsersPage />
              </ProtectedRoute>
            } 
          />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </Router>
    </PermissionProvider>
  );
}

export default App;
```

#### Controlling UI Elements

```javascript
// components/UsersPage.js

import React from 'react';
import { usePermissions } from '../contexts/PermissionContext';
import UserTable from './UserTable';
import CreateUserButton from './CreateUserButton';

const UsersPage = () => {
  const { can } = usePermissions();

  return (
    <div>
      <h1>Users</h1>
      
      {/* Only show create button if user has create permission */}
      {can('create', 'User') && <CreateUserButton />}
      
      <UserTable />
      
      {/* Only show delete button if user has delete permission */}
      {can('delete', 'User') && (
        <button onClick={handleDeleteSelected}>Delete Selected</button>
      )}
    </div>
  );
};

export default UsersPage;
```

## Dynamic Route Checking

For more dynamic route checking, you can create a utility function that checks route permissions against the user's abilities:

```javascript
// utils/routeUtils.js

import { usePermissions } from '../contexts/PermissionContext';

export const useRoutePermissions = () => {
  const { can } = usePermissions();

  const checkRoutePermission = (route) => {
    if (!route || !route.permissions) {
      return true; // Allow access if no permissions are defined
    }

    const { actions, resource } = route.permissions;

    // Check if user has all required actions for the resource
    return actions.every(action => can(action, resource));
  };

  const filterRoutesByPermission = (routes) => {
    return routes.filter(route => checkRoutePermission(route));
  };

  return {
    checkRoutePermission,
    filterRoutesByPermission
  };
};
```

## Permission Synchronization Flow

1. **User Login**: After successful login, the frontend fetches user permissions from the backend.
2. **Ability Creation**: The frontend creates an ability object using the same rules as the backend.
3. **UI Rendering**: The frontend uses the ability object to show/hide UI elements and control navigation.
4. **API Requests**: The frontend includes the JWT token in API requests, and the backend checks permissions using the same rules.
5. **Permission Updates**: If user permissions change, the frontend can refresh the ability object by re-fetching permissions from the backend.

## Dynamic Routes Metadata System

### Overview

The Dynamic Routes Metadata System automatically generates route metadata from route files, eliminating the need to manually update the `routesMetadata.js` file when adding new routes. This system scans route files and extracts metadata based on JSDoc comments and route patterns.

### How It Works

1. **Script Execution**: The `generateRoutesMetadata.js` script scans all route files in the `src/routes` directory.
2. **Route Extraction**: It extracts route information from router method calls (GET, POST, PUT, DELETE, PATCH).
3. **Metadata Generation**: It generates metadata for each route, including path, method, description, and permissions.
4. **File Generation**: It writes the metadata to `src/utils/routesMetadata.js`.

### Adding JSDoc Comments to Routes

To provide custom metadata for your routes, add JSDoc comments above each route definition:

```javascript
/**
 * @route GET /users
 * @name users.list
 * @desc Get all users
 */
router.get('/', authenticate, authorizeCasl('read', 'User'), getUsers);
```

#### JSDoc Comment Format

- `@route`: HTTP method and route path (required)
- `@name`: Unique identifier for the route (optional, auto-generated if not provided)
- `@desc`: Description of the route (optional, auto-generated if not provided)

### Running the Script

To generate or update the routes metadata file:

```bash
# Using npm script
npm run generate:routes

# Or directly with Node
node scripts/generateRoutesMetadata.js
```

### Default Permissions

The script uses default permission mappings based on route patterns:

#### HTTP Method Permissions
- `GET`: `read` action
- `POST`: `create` action
- `PUT`: `update` action
- `DELETE`: `delete` action
- `PATCH`: `update` action

#### Resource Mappings
- `auth`: `Auth` resource
- `users`: `User` resource
- `tenants`: `Tenant` resource
- `members`: `Member` resource
- `memberships`: `Membership` resource
- `membership-types`: `MembershipType` resource
- `payments`: `Payment` resource
- `check-ins`: `CheckIn` resource
- `permissions`: `Permission` resource

#### Role Mappings
- `auth`: `public` role
- `users`: `admin`, `manager` roles
- `tenants`: `admin` role
- `members`: `admin`, `manager`, `staff` roles
- `memberships`: `admin`, `manager`, `staff` roles
- `membership-types`: `admin`, `manager` roles
- `payments`: `admin`, `manager` roles
- `check-ins`: `admin`, `manager`, `staff` roles
- `permissions`: `admin`, `manager`, `staff`, `member` roles

### Customizing Permissions

If the default permissions don't meet your needs, you have two options:

#### 1. Edit the Generated File

After running the script, you can manually edit `src/utils/routesMetadata.js` to customize permissions:

```javascript
const routesMetadata = {
  "users.list": {
    "path": "/users",
    "method": "GET",
    "description": "Get all users",
    "permissions": {
      "roles": ["admin", "manager", "staff"], // Custom roles
      "actions": ["read"], // Custom actions
      "resource": "User" // Custom resource
    }
  },
  // ... other routes
};
```

#### 2. Modify the Script

For more complex customizations, you can modify the `scripts/generateRoutesMetadata.js` script:

1. **Update Default Mappings**: Modify the `defaultMethodPermissions`, `resourceMapping`, or `defaultRoles` objects.
2. **Add Custom Logic**: Add custom logic in the `generatePermissions` function.
3. **Extend JSDoc Parsing**: Add support for additional JSDoc tags like `@roles` or `@actions`.

### Integration with Development Workflow

#### Automated Generation

To ensure routes metadata is always up-to-date, you can:

1. **Add to Git Hooks**: Add a pre-commit hook to generate routes metadata:
   ```bash
   # In .git/hooks/pre-commit
   npm run generate:routes
   git add src/utils/routesMetadata.js
   ```

2. **Add to Build Process**: Include the script in your build process:
   ```json
   // In package.json
   {
     "scripts": {
       "build": "npm run generate:routes && webpack --config webpack.config.js"
     }
   }
   ```

3. **Run in Development**: Add it to your development start script:
   ```json
   // In package.json
   {
     "scripts": {
       "dev": "npm run generate:routes && nodemon src/server.js"
     }
   }
   ```

### Troubleshooting

#### Common Issues

1. **Routes Not Generated**: If new routes don't appear in the metadata file:
   - Ensure the route file ends with `Routes.js`
   - Check that routes are defined with `router.METHOD()`
   - Verify the route file is in the `src/routes` directory

2. **Permission Mismatch**: If frontend and backend permissions don't match, check if the ability objects are created using the same rules.
3. **UI Flickering**: This can happen during permission loading. Implement loading states to prevent this.
4. **403 Forbidden Errors**: If the frontend allows access but the backend denies it, check if the JWT token is included in the request and if the backend permission checks are correct.

#### Debugging Tips

1. Log the ability object in both frontend and backend to compare them.
2. Check the network requests to ensure permissions are fetched correctly.
3. Verify that the JWT token is included in API requests.
4. Use browser developer tools to inspect the ability object and permission checks.
5. Run the script with verbose logging to debug generation issues:
   ```bash
   node scripts/generateRoutesMetadata.js
   ```

### Best Practices

1. **Consistent Naming**: Use consistent naming conventions for routes and resources.
2. **Comprehensive Comments**: Add JSDoc comments to all routes for better documentation.
3. **Regular Updates**: Run the script regularly or automate it in your development workflow.
4. **Custom Permissions**: For complex permission requirements, customize the generated file rather than the script.
5. **Version Control**: Include the generated file in version control to track changes.

## Best Practices

1. **Centralized Permission Management**: Keep all permission definitions in the backend to maintain consistency.
2. **Regular Synchronization**: Refresh permissions periodically or when user roles change.
3. **Graceful Degradation**: Handle permission loading states gracefully to avoid UI flickering.
4. **Error Handling**: Implement proper error handling for permission fetching failures.
5. **Testing**: Test both frontend and backend permission checks to ensure they work together correctly.

## Troubleshooting

### Common Issues

1. **Permission Mismatch**: If frontend and backend permissions don't match, check if the ability objects are created using the same rules.
2. **UI Flickering**: This can happen during permission loading. Implement loading states to prevent this.
3. **403 Forbidden Errors**: If the frontend allows access but the backend denies it, check if the JWT token is included in the request and if the backend permission checks are correct.

### Debugging Tips

1. Log the ability object in both frontend and backend to compare them.
2. Check the network requests to ensure permissions are fetched correctly.
3. Verify that the JWT token is included in API requests.
4. Use browser developer tools to inspect the ability object and permission checks.