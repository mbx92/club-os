# User Management - Frontend Integration Guide

## Overview
Dokumentasi ini menjelaskan cara mengintegrasikan frontend dengan API User Management. API ini mendukung multi-tenancy dan role-based access control (RBAC).

## Base URL
```
/api/v1/users
```

## Authentication
Semua endpoint memerlukan JWT token dalam header:
```
Authorization: Bearer <token>
```

---

## Endpoints

### 1. Get All Users
Mengambil daftar semua users.

**Endpoint:**
```
GET /api/v1/users
```

**Authorization:**
- Super Admin: Dapat melihat semua users dari semua tenant
- Tenant Admin/User: Hanya dapat melihat users dari tenant yang sama

**Response Success (200):**
```json
[
  {
    "id": 1,
    "email": "admin@example.com",
    "roleId": 1,
    "tenantId": 1,
    "isSuperAdmin": false,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z",
    "tenant": {
      "id": 1,
      "name": "Gym ABC",
      "subdomain": "gym-abc"
    },
    "role": {
      "id": 1,
      "name": "Admin",
      "permissions": [...]
    }
  }
]
```

**Frontend Implementation Example:**
```javascript
async function getAllUsers() {
  try {
    const response = await fetch('/api/v1/users', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) throw new Error('Failed to fetch users');
    
    const users = await response.json();
    return users;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
}
```

---

### 2. Get User by ID
Mengambil detail user berdasarkan ID.

**Endpoint:**
```
GET /api/v1/users/:id
```

**Parameters:**
- `id` (path parameter): User ID

**Authorization:**
- Super Admin: Dapat melihat user dari tenant manapun
- Tenant Admin/User: Hanya dapat melihat user dari tenant yang sama

**Response Success (200):**
```json
{
  "id": 1,
  "email": "admin@example.com",
  "roleId": 1,
  "tenantId": 1,
  "isSuperAdmin": false,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z",
  "tenant": {
    "id": 1,
    "name": "Gym ABC",
    "subdomain": "gym-abc"
  },
  "role": {
    "id": 1,
    "name": "Admin",
    "permissions": [...]
  }
}
```

**Response Error (404):**
```json
{
  "message": "User not found"
}
```

**Response Error (403):**
```json
{
  "message": "Forbidden: you can only access users from your own tenant"
}
```

**Frontend Implementation Example:**
```javascript
async function getUserById(userId) {
  try {
    const response = await fetch(`/api/v1/users/${userId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 404) {
      throw new Error('User not found');
    }
    
    if (response.status === 403) {
      throw new Error('You do not have permission to view this user');
    }
    
    if (!response.ok) throw new Error('Failed to fetch user');
    
    const user = await response.json();
    return user;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
}
```

---

### 3. Create User
Membuat user baru.

**Endpoint:**
```
POST /api/v1/users
```

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "securePassword123",
  "roleId": 2,
  "tenantId": 1
}
```

**Field Descriptions:**
- `email` (required): Email address user (harus unique)
- `password` (required): Password user (akan di-hash)
- `roleId` (required): ID role yang akan diberikan
- `tenantId` (optional untuk super admin): ID tenant. Jika non-super admin, akan otomatis menggunakan tenantId dari user yang membuat

**Authorization:**
- Super Admin: Dapat membuat user untuk tenant manapun
- Tenant Admin: Hanya dapat membuat user untuk tenant mereka sendiri (tenantId diabaikan dari request body)

**Response Success (201):**
```json
{
  "id": 5,
  "email": "newuser@example.com",
  "roleId": 2,
  "tenantId": 1,
  "isSuperAdmin": false,
  "createdAt": "2025-01-15T10:30:00.000Z",
  "updatedAt": "2025-01-15T10:30:00.000Z"
}
```

**Response Error (400):**
```json
{
  "message": "Validation error",
  "errors": [...]
}
```

**Frontend Implementation Example:**
```javascript
async function createUser(userData) {
  try {
    const response = await fetch('/api/v1/users', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: userData.email,
        password: userData.password,
        roleId: userData.roleId,
        tenantId: userData.tenantId // Optional untuk super admin
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create user');
    }
    
    const newUser = await response.json();
    return newUser;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}
```

---

### 4. Update User
Mengupdate data user yang sudah ada.

**Endpoint:**
```
PUT /api/v1/users/:id
```

**Parameters:**
- `id` (path parameter): User ID

**Request Body:**
```json
{
  "email": "updated@example.com",
  "password": "newPassword123",
  "roleId": 3
}
```

**Field Descriptions:**
- `email` (optional): Email baru
- `password` (optional): Password baru (akan di-hash)
- `roleId` (optional): Role ID baru

**Authorization:**
- Super Admin: Dapat update user dari tenant manapun
- Tenant Admin: Hanya dapat update user dari tenant yang sama

**Response Success (200):**
```json
{
  "id": 5,
  "email": "updated@example.com",
  "roleId": 3,
  "tenantId": 1,
  "isSuperAdmin": false,
  "createdAt": "2025-01-15T10:30:00.000Z",
  "updatedAt": "2025-01-15T11:45:00.000Z"
}
```

**Response Error (404):**
```json
{
  "message": "User not found"
}
```

**Response Error (403):**
```json
{
  "message": "Forbidden: you can only update users from your own tenant"
}
```

**Frontend Implementation Example:**
```javascript
async function updateUser(userId, userData) {
  try {
    const response = await fetch(`/api/v1/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: userData.email,
        password: userData.password, // Optional
        roleId: userData.roleId
      })
    });
    
    if (response.status === 404) {
      throw new Error('User not found');
    }
    
    if (response.status === 403) {
      throw new Error('You do not have permission to update this user');
    }
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update user');
    }
    
    const updatedUser = await response.json();
    return updatedUser;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}
```

---

### 5. Delete User
Menghapus user.

**Endpoint:**
```
DELETE /api/v1/users/:id
```

**Parameters:**
- `id` (path parameter): User ID

**Authorization:**
- Super Admin: Dapat delete user dari tenant manapun
- Tenant Admin: Hanya dapat delete user dari tenant yang sama

**Response Success (200):**
```json
{
  "message": "User deleted"
}
```

**Response Error (404):**
```json
{
  "message": "User not found"
}
```

**Response Error (403):**
```json
{
  "message": "Forbidden: you can only delete users from your own tenant"
}
```

**Frontend Implementation Example:**
```javascript
async function deleteUser(userId) {
  try {
    const response = await fetch(`/api/v1/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 404) {
      throw new Error('User not found');
    }
    
    if (response.status === 403) {
      throw new Error('You do not have permission to delete this user');
    }
    
    if (!response.ok) throw new Error('Failed to delete user');
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
}
```

---

## React Component Examples

### User List Component
```jsx
import React, { useState, useEffect } from 'react';

function UserList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch users');
      
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    
    try {
      const response = await fetch(`/api/v1/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to delete user');
      
      // Refresh user list
      fetchUsers();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>User Management</h2>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Email</th>
            <th>Role</th>
            <th>Tenant</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td>{user.id}</td>
              <td>{user.email}</td>
              <td>{user.role?.name}</td>
              <td>{user.tenant?.name}</td>
              <td>
                <button onClick={() => handleDelete(user.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default UserList;
```

### Create User Form Component
```jsx
import React, { useState } from 'react';

function CreateUserForm({ onSuccess }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    roleId: '',
    tenantId: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create user');
      }

      const newUser = await response.json();
      
      // Reset form
      setFormData({ email: '', password: '', roleId: '', tenantId: '' });
      
      // Call success callback
      if (onSuccess) onSuccess(newUser);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3>Create New User</h3>
      
      {error && <div className="error">{error}</div>}
      
      <div>
        <label>Email:</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
      </div>
      
      <div>
        <label>Password:</label>
        <input
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required
        />
      </div>
      
      <div>
        <label>Role ID:</label>
        <input
          type="number"
          value={formData.roleId}
          onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
          required
        />
      </div>
      
      <div>
        <label>Tenant ID (Super Admin only):</label>
        <input
          type="number"
          value={formData.tenantId}
          onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
        />
      </div>
      
      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create User'}
      </button>
    </form>
  );
}

export default CreateUserForm;
```

---

## Security & Authorization

### Multi-Tenancy
- **Super Admin**: Dapat mengakses dan mengelola users dari semua tenant
- **Tenant Admin/User**: Hanya dapat mengakses dan mengelola users dari tenant mereka sendiri

### Password Security
- Password di-hash menggunakan bcrypt dengan salt rounds 10
- Password tidak pernah dikembalikan dalam response API

### Audit Logging
Semua operasi user management dicatat dalam audit log dengan informasi:
- User yang melakukan operasi
- Request details (method, path, IP, body)
- Response status code
- Timestamp

---

## Error Handling

### Common Error Responses

**401 Unauthorized:**
```json
{
  "message": "Unauthorized"
}
```
Token tidak valid atau sudah expired.

**403 Forbidden:**
```json
{
  "message": "Forbidden: you can only access users from your own tenant"
}
```
User tidak memiliki permission untuk mengakses resource.

**404 Not Found:**
```json
{
  "message": "User not found"
}
```
User dengan ID tersebut tidak ditemukan.

**400 Bad Request:**
```json
{
  "message": "Validation error",
  "errors": [
    {
      "field": "email",
      "message": "Email must be unique"
    }
  ]
}
```
Data tidak valid atau tidak memenuhi requirement.

**500 Internal Server Error:**
```json
{
  "message": "Internal server error"
}
```
Terjadi error di server.

---

## Best Practices

### 1. Token Management
```javascript
// Store token after login
localStorage.setItem('token', token);

// Remove token on logout
localStorage.removeItem('token');

// Check token expiry
function isTokenExpired(token) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  return Date.now() >= payload.exp * 1000;
}
```

### 2. Error Handling
```javascript
async function apiCall(url, options) {
  try {
    const response = await fetch(url, options);
    
    if (response.status === 401) {
      // Redirect to login
      window.location.href = '/login';
      return;
    }
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}
```

### 3. Loading States
```javascript
const [isLoading, setIsLoading] = useState(false);

async function handleAction() {
  setIsLoading(true);
  try {
    await performAction();
  } finally {
    setIsLoading(false);
  }
}
```

### 4. Form Validation
```javascript
function validateUserForm(data) {
  const errors = {};
  
  if (!data.email || !data.email.includes('@')) {
    errors.email = 'Valid email is required';
  }
  
  if (!data.password || data.password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  }
  
  if (!data.roleId) {
    errors.roleId = 'Role is required';
  }
  
  return errors;
}
```

---

## Testing

### Example Test Cases
```javascript
describe('User Management API', () => {
  test('should fetch all users', async () => {
    const users = await getAllUsers();
    expect(Array.isArray(users)).toBe(true);
  });
  
  test('should create new user', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'password123',
      roleId: 2
    };
    
    const newUser = await createUser(userData);
    expect(newUser.email).toBe(userData.email);
    expect(newUser.password).toBeUndefined();
  });
  
  test('should handle 404 error', async () => {
    await expect(getUserById(99999))
      .rejects
      .toThrow('User not found');
  });
});
```

---

## Related Documentation
- [Authentication Endpoints](./AUTHENTICATION-ENDPOINTS.md)
- [Role & Permission Management](./ROLE-PERMISSION-MANAGEMENT.md)
- [CASL Synchronization](./CASL-SYNCHRONIZATION.md)
