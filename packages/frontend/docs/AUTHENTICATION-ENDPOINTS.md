# Authentication Endpoints Documentation

This document provides detailed information about the authentication endpoints available in the Gym Membership API. These endpoints are essential for user registration, login, token management, and accessing protected resources.

## Base URL

All authentication endpoints are prefixed with `/auth`:

```
https://api.example.com/auth
```

## Authentication Flow

The authentication flow follows these steps:

1. **Registration**: Create a new user account
2. **Login**: Obtain access and refresh tokens
3. **Fetch Permissions**: Get user permissions using the access token
4. **Access Protected Resources**: Use the access token in the Authorization header
5. **Token Refresh**: Use the refresh token to get a new access token when it expires
6. **Logout**: Invalidate the refresh token

**Important Note**: The login response does not include user permissions. After successful login, you need to make a separate request to the `/permissions/user` endpoint to fetch the user's permissions. This is a security best practice that keeps the login response lightweight and allows for more granular permission management.

## Endpoints

### 1. Register User

Create a new user account.

- **Endpoint**: `POST /auth/register`
- **Access**: Public
- **Description**: Register a new user with the system

#### Request Body

```json
{
  "tenantDomain": "example-gym",
  "email": "user@example.com",
  "password": "securePassword123",
  "roleName": "user",
  "isSuperAdmin": false
}
```

#### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| tenantDomain | string | Yes (for regular users) | The domain of the tenant the user belongs to |
| email | string | Yes | User's email address |
| password | string | Yes | User's password (minimum 8 characters recommended) |
| roleName | string | No | User's role name (defaults to "user") |
| isSuperAdmin | boolean | No | Set to true for superadmin registration (no tenant required) |

#### Success Response (201 Created)

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Error Responses

- **400 Bad Request**: If tenant or role is not found

```json
{
  "message": "Tenant not found"
}
```

or

```json
{
  "message": "Role not found"
}
```

- **500 Internal Server Error**: If registration fails

```json
{
  "message": "Register failed"
}
```

#### Example

```javascript
// Regular user registration
const response = await fetch('https://api.example.com/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    tenantDomain: 'example-gym',
    email: 'user@example.com',
    password: 'securePassword123',
    roleName: 'user'
  })
});

const data = await response.json();
console.log(data.token); // JWT access token
```

### 2. Login

Authenticate a user and obtain access and refresh tokens.

- **Endpoint**: `POST /auth/login`
- **Access**: Public
- **Description**: Authenticate user credentials and return tokens

#### Request Body

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

#### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| email | string | Yes | User's email address |
| password | string | Yes | User's password |

#### Success Response (200 OK)

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "user",
    "tenant": {
      "id": 1,
      "name": "Example Gym",
      "domain": "example-gym"
    }
  }
}
```

**Note**: The login response does not include user permissions. You need to fetch permissions separately using the `/permissions/user` endpoint after successful login. See the [Permissions](#permissions) section below for details.

#### Error Responses

- **400 Bad Request**: If credentials are invalid

```json
{
  "message": "Invalid credentials"
}
```

- **500 Internal Server Error**: If login fails

```json
{
  "message": "Login failed"
}
```

#### Example

```javascript
// User login
const response = await fetch('https://api.example.com/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'securePassword123'
  })
});

const data = await response.json();
console.log(data.token); // JWT access token
console.log(data.refreshToken); // JWT refresh token
console.log(data.user); // User information
```

### 3. Get User Profile

Get the current user's profile information.

- **Endpoint**: `GET /auth/profile`
- **Access**: Private (requires authentication)
- **Description**: Retrieve the authenticated user's profile

#### Headers

```
Authorization: Bearer <access_token>
```

#### Success Response (200 OK)

```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "password": "$2a$10$...",
    "roleId": 2,
    "tenantId": 1,
    "isSuperAdmin": false,
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "lastLogin": "2025-11-18T13:30:00.000Z",
    "createdAt": "2025-11-18T13:30:00.000Z",
    "updatedAt": "2025-11-18T13:30:00.000Z",
    "role": {
      "id": 2,
      "name": "user",
      "description": "Regular user",
      "createdAt": "2025-11-18T13:30:00.000Z",
      "updatedAt": "2025-11-18T13:30:00.000Z"
    },
    "tenant": {
      "id": 1,
      "name": "Example Gym",
      "domain": "example-gym",
      "createdAt": "2025-11-18T13:30:00.000Z",
      "updatedAt": "2025-11-18T13:30:00.000Z"
    }
  }
}
```

#### Error Responses

- **401 Unauthorized**: If token is missing, invalid, or expired

```json
{
  "message": "No token provided",
  "code": "NO_TOKEN"
}
```

or

```json
{
  "message": "Token expired",
  "code": "TOKEN_EXPIRED"
}
```

or

```json
{
  "message": "User not found",
  "code": "USER_NOT_FOUND"
}
```

#### Example

```javascript
// Get user profile
const response = await fetch('https://api.example.com/auth/profile', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const data = await response.json();
console.log(data.user); // User profile information
```

### 4. Refresh Token

Refresh an expired access token using a refresh token.

- **Endpoint**: `POST /auth/refresh-token`
- **Access**: Public
- **Description**: Get a new access token using a refresh token

#### Request Body

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| refreshToken | string | Yes | The refresh token obtained during login |

#### Success Response (200 OK)

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Error Responses

- **401 Unauthorized**: If refresh token is invalid or expired

```json
{
  "message": "Refresh token is required"
}
```

or

```json
{
  "message": "Invalid refresh token"
}
```

#### Example

```javascript
// Refresh access token
const response = await fetch('https://api.example.com/auth/refresh-token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    refreshToken: refreshToken
  })
});

const data = await response.json();
console.log(data.token); // New JWT access token
```

### 5. Logout

Invalidate the user's refresh token.

- **Endpoint**: `POST /auth/logout`
- **Access**: Public
- **Description**: Invalidate the user's refresh token to log out

#### Request Body

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| refreshToken | string | Yes | The refresh token to invalidate |

#### Success Response (200 OK)

```json
{
  "message": "Logout successful"
}
```

#### Error Responses

- **400 Bad Request**: If refresh token is not provided

```json
{
  "message": "Refresh token is required"
}
```

- **500 Internal Server Error**: If logout fails

```json
{
  "message": "Logout failed"
}
```

#### Example

```javascript
// Logout
const response = await fetch('https://api.example.com/auth/logout', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    refreshToken: refreshToken
  })
});

const data = await response.json();
console.log(data.message); // "Logout successful"
```

## Permissions

After successful authentication, you may need to fetch user permissions to determine what actions the user is allowed to perform. The API provides a separate endpoint for retrieving user permissions.

### Get User Permissions

Fetch the current user's permissions, including CASL rules and role-based permissions.

- **Endpoint**: `GET /permissions/user`
- **Access**: Private (requires authentication)
- **Description**: Retrieve the authenticated user's permissions

#### Headers

```
Authorization: Bearer <access_token>
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "1",
      "email": "user@example.com",
      "isSuperAdmin": false,
      "tenantId": "1",
      "role": {
        "id": "2",
        "name": "user"
      }
    },
    "permissions": {
      "caslRules": [
        {
          "action": "read",
          "subject": "User",
          "conditions": {},
          "fields": [],
          "inverted": false
        },
        {
          "action": "update",
          "subject": "User",
          "conditions": {
            "id": "1"
          },
          "fields": [],
          "inverted": false
        }
      ],
      "rolePermissions": {
        "users": {
          "create": true,
          "read": true,
          "update": false,
          "delete": false
        },
        "members": {
          "create": false,
          "read": true,
          "update": false,
          "delete": false
        }
      }
    }
  }
}
```

#### Error Responses

- **401 Unauthorized**: If token is missing, invalid, or expired

```json
{
  "success": false,
  "message": "No token provided"
}
```

- **404 Not Found**: If user is not found

```json
{
  "success": false,
  "message": "User not found"
}
```

- **500 Internal Server Error**: If server error occurs

```json
{
  "success": false,
  "message": "Internal server error",
  "error": "Error message"
}
```

#### Example

```javascript
// Get user permissions
const response = await fetch('https://api.example.com/permissions/user', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const data = await response.json();
console.log(data.permissions); // User permissions
```

### Get All Roles

Fetch all available roles with their permissions.

- **Endpoint**: `GET /permissions/roles`
- **Access**: Private (requires authentication)
- **Description**: Retrieve all roles with their permissions

#### Headers

```
Authorization: Bearer <access_token>
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "roles": [
      {
        "id": "1",
        "name": "admin",
        "description": "Administrator role",
        "permissions": {
          "users": {
            "create": true,
            "read": true,
            "update": true,
            "delete": true
          },
          "members": {
            "create": true,
            "read": true,
            "update": true,
            "delete": true
          }
        },
        "isActive": true
      },
      {
        "id": "2",
        "name": "user",
        "description": "Regular user role",
        "permissions": {
          "users": {
            "create": false,
            "read": true,
            "update": false,
            "delete": false
          },
          "members": {
            "create": false,
            "read": true,
            "update": false,
            "delete": false
          }
        },
        "isActive": true
      }
    ]
  }
}
```

#### Example

```javascript
// Get all roles
const response = await fetch('https://api.example.com/permissions/roles', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const data = await response.json();
console.log(data.roles); // All roles with permissions
```

### Get Routes Metadata

Fetch metadata about all available routes.

- **Endpoint**: `GET /permissions/routes`
- **Access**: Private (requires authentication)
- **Description**: Retrieve metadata for all API routes

#### Headers

```
Authorization: Bearer <access_token>
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "routes": {
      "auth.register": {
        "path": "/auth/register",
        "method": "POST",
        "description": "User registration",
        "access": "Public"
      },
      "auth.login": {
        "path": "/auth/login",
        "method": "POST",
        "description": "User login",
        "access": "Public"
      },
      "auth.profile": {
        "path": "/auth/profile",
        "method": "GET",
        "description": "Get user profile",
        "access": "Private"
      }
    }
  }
}
```

#### Example

```javascript
// Get routes metadata
const response = await fetch('https://api.example.com/permissions/routes', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const data = await response.json();
console.log(data.routes); // Routes metadata
```

## Token Information

### Access Token

- **Purpose**: Used to authenticate requests to protected endpoints
- **Format**: JWT (JSON Web Token)
- **Header**: `Authorization: Bearer <access_token>`
- **Expiration**: Configurable (default: 1 hour)
- **Contains**: User ID, email, role, tenant ID, and superadmin status

### Refresh Token

- **Purpose**: Used to obtain a new access token when the current one expires
- **Format**: JWT (JSON Web Token)
- **Expiration**: Configurable (default: 7 days)
- **Storage**: Should be stored securely on the client side
- **Usage**: Sent to the `/auth/refresh-token` endpoint

## Error Handling

All endpoints return appropriate HTTP status codes and error messages in JSON format:

- **200 OK**: Request successful
- **201 Created**: Resource created successfully
- **400 Bad Request**: Invalid request parameters
- **401 Unauthorized**: Authentication failed
- **500 Internal Server Error**: Server error

## Security Considerations

1. **HTTPS**: Always use HTTPS in production to protect sensitive data
2. **Token Storage**: Store tokens securely on the client side (e.g., httpOnly cookies or secure storage)
3. **Password Strength**: Implement strong password requirements on the frontend
4. **Token Expiration**: Handle token expiration gracefully by implementing token refresh logic
5. **Input Validation**: Validate all user inputs on the frontend before sending requests

## Implementation Example

Here's a complete example of implementing authentication in a frontend application:

```javascript
class AuthService {
  constructor() {
    this.baseURL = 'https://api.example.com/auth';
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
    this.user = JSON.parse(localStorage.getItem('user') || 'null');
  }

  // Save tokens and user data to localStorage
  _saveAuthData(accessToken, refreshToken, user) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.user = user;
    
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
  }

  // Clear auth data from localStorage
  _clearAuthData() {
    this.accessToken = null;
    this.refreshToken = null;
    this.user = null;
    
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }

  // Register a new user
  async register(userData) {
    try {
      const response = await fetch(`${this.baseURL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  // Login user
  async login(email, password) {
    try {
      const response = await fetch(`${this.baseURL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      this._saveAuthData(data.token, data.refreshToken, data.user);
      return data;
    } catch (error) {
      throw error;
    }
  }

  // Get user permissions
  async getUserPermissions() {
    try {
      const response = await fetch(`${this.baseURL.replace('/auth', '')}/permissions/user`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        // If token expired, try to refresh it
        if (response.status === 401) {
          await this.refreshAccessToken();
          return this.getUserPermissions(); // Retry the request
        }
        throw new Error(data.message || 'Failed to get user permissions');
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  // Get all roles
  async getAllRoles() {
    try {
      const response = await fetch(`${this.baseURL.replace('/auth', '')}/permissions/roles`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        // If token expired, try to refresh it
        if (response.status === 401) {
          await this.refreshAccessToken();
          return this.getAllRoles(); // Retry the request
        }
        throw new Error(data.message || 'Failed to get roles');
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  // Get routes metadata
  async getRoutesMetadata() {
    try {
      const response = await fetch(`${this.baseURL.replace('/auth', '')}/permissions/routes`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        // If token expired, try to refresh it
        if (response.status === 401) {
          await this.refreshAccessToken();
          return this.getRoutesMetadata(); // Retry the request
        }
        throw new Error(data.message || 'Failed to get routes metadata');
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  // Login with permissions (combines login and getUserPermissions)
  async loginWithPermissions(email, password) {
    try {
      const loginResult = await this.login(email, password);
      const permissionsResult = await this.getUserPermissions();
      
      return {
        ...loginResult,
        permissions: permissionsResult.data.permissions
      };
    } catch (error) {
      throw error;
    }
  }

  // Get user profile
  async getProfile() {
    try {
      const response = await fetch(`${this.baseURL}/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        // If token expired, try to refresh it
        if (response.status === 401 && data.code === 'TOKEN_EXPIRED') {
          await this.refreshAccessToken();
          return this.getProfile(); // Retry the request
        }
        throw new Error(data.message || 'Failed to get profile');
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  // Refresh access token
  async refreshAccessToken() {
    try {
      if (!this.refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(`${this.baseURL}/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: this.refreshToken })
      });

      const data = await response.json();
      
      if (!response.ok) {
        // If refresh token is invalid, logout the user
        if (response.status === 401) {
          this.logout();
        }
        throw new Error(data.message || 'Failed to refresh token');
      }

      this.accessToken = data.token;
      localStorage.setItem('accessToken', data.token);
      return data.token;
    } catch (error) {
      throw error;
    }
  }

  // Logout user
  async logout() {
    try {
      if (this.refreshToken) {
        await fetch(`${this.baseURL}/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken: this.refreshToken })
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this._clearAuthData();
    }
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.accessToken;
  }

  // Get authorization header for API requests
  getAuthHeader() {
    return this.accessToken ? { 'Authorization': `Bearer ${this.accessToken}` } : {};
  }
}

// Usage example
const authService = new AuthService();

// Register a new user
// try {
//   const result = await authService.register({
//     tenantDomain: 'example-gym',
//     email: 'user@example.com',
//     password: 'securePassword123',
//     roleName: 'user'
//   });
//   console.log('Registration successful:', result);
// } catch (error) {
//   console.error('Registration failed:', error.message);
// }

// Login user
// try {
//   const result = await authService.login('user@example.com', 'securePassword123');
//   console.log('Login successful:', result);
//
//   // Get user permissions
//   const permissionsResult = await authService.getUserPermissions();
//   console.log('User permissions:', permissionsResult.data.permissions);
//
//   // Get all roles
//   const rolesResult = await authService.getAllRoles();
//   console.log('All roles:', rolesResult.data.roles);
//
//   // Get routes metadata
//   const routesResult = await authService.getRoutesMetadata();
//   console.log('Routes metadata:', routesResult.data.routes);
// } catch (error) {
//   console.error('Login failed:', error.message);
// }

// Login with permissions (combined operation)
// try {
//   const result = await authService.loginWithPermissions('user@example.com', 'securePassword123');
//   console.log('Login with permissions successful:', result);
//   console.log('User permissions:', result.permissions);
// } catch (error) {
//   console.error('Login with permissions failed:', error.message);
// }

// Get user profile
// if (authService.isAuthenticated()) {
//   try {
//     const result = await authService.getProfile();
//     console.log('User profile:', result);
//   } catch (error) {
//     console.error('Failed to get profile:', error.message);
//   }
// }

// Logout
// await authService.logout();
```

## Common Issues and Solutions

### 1. Token Expiration

**Issue**: Access tokens expire after a certain time (default: 1 hour).

**Solution**: Implement automatic token refresh using the refresh token:

```javascript
// Example of making an API request with automatic token refresh
async function makeAuthenticatedRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${authService.accessToken}`
      }
    });

    if (response.status === 401) {
      const data = await response.json();
      
      // If token expired, try to refresh it
      if (data.code === 'TOKEN_EXPIRED') {
        await authService.refreshAccessToken();
        
        // Retry the request with new token
        return fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'Authorization': `Bearer ${authService.accessToken}`
          }
        });
      }
    }
    
    return response;
  } catch (error) {
    throw error;
  }
}
```

### 2. Invalid Refresh Token

**Issue**: Refresh token may become invalid if the user logs out or if the token expires.

**Solution**: Handle invalid refresh tokens by redirecting the user to the login page:

```javascript
// Example of handling invalid refresh token
try {
  await authService.refreshAccessToken();
} catch (error) {
  if (error.message === 'Invalid refresh token') {
    // Redirect to login page
    window.location.href = '/login';
    return;
  }
  throw error;
}
```

### 3. Network Errors

**Issue**: Network requests may fail due to connectivity issues.

**Solution**: Implement retry logic with exponential backoff:

```javascript
// Example of retry logic with exponential backoff
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      const response = await fetch(url, options);
      
      if (response.ok) {
        return response;
      }
      
      // If response is not OK, throw an error
      const data = await response.json();
      throw new Error(data.message || 'Request failed');
    } catch (error) {
      retryCount++;
      
      if (retryCount >= maxRetries) {
        throw error;
      }
      
      // Wait with exponential backoff
      const delay = Math.pow(2, retryCount) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

## Best Practices

1. **Token Storage**: Store tokens securely. Consider using httpOnly cookies for tokens to prevent XSS attacks.
2. **Token Refresh**: Implement automatic token refresh before the access token expires.
3. **Error Handling**: Implement comprehensive error handling for all authentication operations.
4. **User Experience**: Provide clear feedback to users during authentication processes.
5. **Security**: Always validate user inputs and sanitize data before sending it to the API.
6. **Logout**: Implement a proper logout mechanism that clears all tokens and user data.
7. **Session Management**: Consider implementing session timeout and automatic logout after a period of inactivity.