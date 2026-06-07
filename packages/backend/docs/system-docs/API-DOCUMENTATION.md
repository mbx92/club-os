# Gym Membership Multi-Tenant API Documentation

## Overview

This API provides a comprehensive solution for managing gym memberships in a multi-tenant architecture. The system supports multiple gyms (tenants) with their own members, memberships, payments, and check-ins while maintaining strict data isolation between tenants.

## Base URL

- Development: `http://localhost:3000/api`
- Production: `https://api.yourdomain.com/api`

## Authentication

All API endpoints (except login and register) require authentication using JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Response Format

All API responses follow this structure:

```json
{
  "success": true,
  "message": "Success message",
  "data": {}
}
```

Or in case of error:

```json
{
  "success": false,
  "message": "Error message",
  "error": {}
}
```

## API Endpoints

### 1. Authentication

#### 1.1 Register User
Register a new user for a specific tenant or a superadmin.

**Endpoint:** `POST /auth/register`

**Request Body (Regular User):**
```json
{
  "tenantDomain": "tenant-a.com",
  "email": "user@tenant-a.com",
  "password": "securePassword123",
  "roleName": "user"
}
```

**Request Body (Admin/Manager):**
```json
{
  "tenantDomain": "tenant-a.com",
  "email": "admin@tenant-a.com",
  "password": "securePassword123",
  "roleName": "admin"
}
```

**Request Body (Superadmin):**
```json
{
  "email": "superadmin@gym-system.com",
  "password": "securePassword123",
  "isSuperAdmin": true
}
```

**Notes:**
- For regular users, admins, and managers, the `tenantDomain` and `roleName` fields are required.
- For superadmin registration, only `email` and `password` are required, along with `isSuperAdmin: true`.
- Superadmin users have access to all tenants and data in the system.
- The system will automatically assign the appropriate role based on the provided `roleName` or `isSuperAdmin` flag.

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### 1.2 Login User
Authenticate a user and receive a JWT token.

**Endpoint:** `POST /auth/login`

**Request Body:**
```json
{
  "email": "user@tenant-a.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "email": "user@tenant-a.com",
      "role": "user",
      "tenant": {
        "id": "uuid",
        "name": "Tenant A",
        "domain": "tenant-a.com"
      }
    }
  }
}
```

#### 1.3 Get User Profile
Get the current user's profile information.

**Endpoint:** `GET /auth/profile`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@tenant-a.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+1234567890",
      "role": "user",
      "tenant": {
        "id": "uuid",
        "name": "Tenant A",
        "domain": "tenant-a.com"
      }
    }
  }
}
```

### 2. Tenant Management

#### 2.1 Get All Tenants
Get a list of all tenants. (Superadmin and Admin only)

**Endpoint:** `GET /tenants`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Notes:**
- Superadmins can view all tenants in the system.
- Admins can only view their own tenant information.

**Response:**
```json
{
  "success": true,
  "message": "Tenants retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "name": "Tenant A",
      "domain": "tenant-a.com",
      "address": "123 Main St",
      "phone": "+1234567890",
      "email": "info@tenant-a.com",
      "isActive": true
    }
  ]
}
```

#### 2.2 Get Tenant by ID
Get details of a specific tenant.

**Endpoint:** `GET /tenants/:id`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Notes:**
- Superadmins can view details of any tenant in the system.
- Admins can only view details of their own tenant.

**Response:**
```json
{
  "success": true,
  "message": "Tenant retrieved successfully",
  "data": {
    "id": "uuid",
    "name": "Tenant A",
    "domain": "tenant-a.com",
    "address": "123 Main St",
    "phone": "+1234567890",
    "email": "info@tenant-a.com",
    "logo": "url-to-logo",
    "settings": {},
    "isActive": true
  }
}
```

#### 2.3 Create Tenant
Create a new tenant. (Superadmin only)

**Endpoint:** `POST /tenants`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Notes:**
- Only superadmins can create new tenants.
- When a new tenant is created, the system automatically creates the default roles (admin, manager, user) for that tenant.

**Request Body:**
```json
{
  "name": "New Tenant",
  "domain": "new-tenant.com",
  "address": "456 Oak St",
  "phone": "+0987654321",
  "email": "info@new-tenant.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Tenant created successfully",
  "data": {
    "id": "uuid",
    "name": "New Tenant",
    "domain": "new-tenant.com",
    "address": "456 Oak St",
    "phone": "+0987654321",
    "email": "info@new-tenant.com",
    "isActive": true
  }
}
```

#### 2.4 Update Tenant
Update an existing tenant. (Superadmin only)

**Endpoint:** `PUT /tenants/:id`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Notes:**
- Only superadmins can update tenant information.
- Admins can only update their own tenant's profile information through the user profile endpoint.

**Request Body:**
```json
{
  "name": "Updated Tenant Name",
  "address": "789 Pine St"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Tenant updated successfully",
  "data": {
    "id": "uuid",
    "name": "Updated Tenant Name",
    "domain": "tenant-a.com",
    "address": "789 Pine St",
    "phone": "+1234567890",
    "email": "info@tenant-a.com",
    "isActive": true
  }
}
```

#### 2.5 Delete Tenant
Delete a tenant. (Superadmin only)

**Endpoint:** `DELETE /tenants/:id`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Notes:**
- Only superadmins can delete tenants.
- Deleting a tenant will also delete all associated data (members, memberships, payments, check-ins).
- This action is irreversible and should be used with caution.

**Response:**
```json
{
  "success": true,
  "message": "Tenant deleted successfully"
}
```

### 3. Member Management

#### 3.1 Get All Members
Get a list of all members for the current tenant.

**Endpoint:** `GET /members`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Query Parameters:**
- `tenantId` (optional, superadmin only): Filter by tenant ID. Only superadmins can use this parameter to view members from other tenants.

**Notes:**
- Regular users, managers, and admins can only view members from their own tenant.
- Superadmins can view members from all tenants, and can optionally filter by tenant ID.

**Response:**
```json
{
  "success": true,
  "message": "Members retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "tenantId": "uuid",
      "userId": "uuid",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "phone": "+1234567890",
      "dateOfBirth": "1990-01-01",
      "gender": "male",
      "address": "123 Main St",
      "emergencyContactName": "Jane Doe",
      "emergencyContactPhone": "+0987654321",
      "notes": "Regular member",
      "isActive": true,
      "membershipStatus": "active"
    }
  ]
}
```

#### 3.2 Get Member by ID
Get details of a specific member.

**Endpoint:** `GET /members/:id`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Notes:**
- Regular users, managers, and admins can only view members from their own tenant.
- Superadmins can view members from any tenant.

**Response:**
```json
{
  "success": true,
  "message": "Member retrieved successfully",
  "data": {
    "id": "uuid",
    "tenantId": "uuid",
    "userId": "uuid",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phone": "+1234567890",
    "dateOfBirth": "1990-01-01",
    "gender": "male",
    "address": "123 Main St",
    "emergencyContactName": "Jane Doe",
    "emergencyContactPhone": "+0987654321",
    "notes": "Regular member",
    "isActive": true,
    "membershipStatus": "active"
  }
}
```

#### 3.3 Create Member
Create a new member.

**Endpoint:** `POST /members`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Notes:**
- Regular users, managers, and admins can only create members for their own tenant.
- Superadmins can create members for any tenant by including a `tenantId` in the request body.

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane.smith@example.com",
  "phone": "+1234567890",
  "dateOfBirth": "1985-05-15",
  "gender": "female",
  "address": "456 Oak St",
  "emergencyContactName": "John Smith",
  "emergencyContactPhone": "+0987654321",
  "notes": "New member"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Member created successfully",
  "data": {
    "id": "uuid",
    "tenantId": "uuid",
    "userId": null,
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane.smith@example.com",
    "phone": "+1234567890",
    "dateOfBirth": "1985-05-15",
    "gender": "female",
    "address": "456 Oak St",
    "emergencyContactName": "John Smith",
    "emergencyContactPhone": "+0987654321",
    "notes": "New member",
    "isActive": true,
    "membershipStatus": "expired"
  }
}
```

#### 3.4 Update Member
Update an existing member.

**Endpoint:** `PUT /members/:id`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Notes:**
- Regular users, managers, and admins can only update members from their own tenant.
- Superadmins can update members from any tenant.

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Johnson",
  "phone": "+1112223333"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Member updated successfully",
  "data": {
    "id": "uuid",
    "tenantId": "uuid",
    "userId": null,
    "firstName": "Jane",
    "lastName": "Johnson",
    "email": "jane.smith@example.com",
    "phone": "+1112223333",
    "dateOfBirth": "1985-05-15",
    "gender": "female",
    "address": "456 Oak St",
    "emergencyContactName": "John Smith",
    "emergencyContactPhone": "+0987654321",
    "notes": "New member",
    "isActive": true,
    "membershipStatus": "expired"
  }
}
```

#### 3.5 Delete Member
Delete a member.

**Endpoint:** `DELETE /members/:id`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Notes:**
- Regular users, managers, and admins can only delete members from their own tenant.
- Superadmins can delete members from any tenant.

**Response:**
```json
{
  "success": true,
  "message": "Member deleted successfully"
}
```

### 4. Membership Type Management

#### 4.1 Get All Membership Types
Get a list of all membership types for the current tenant.

**Endpoint:** `GET /membership-types`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Query Parameters:**
- `tenantId` (optional, superadmin only): Filter by tenant ID. Only superadmins can use this parameter to view membership types from other tenants.

**Notes:**
- Regular users, managers, and admins can only view membership types from their own tenant.
- Superadmins can view membership types from all tenants, and can optionally filter by tenant ID.

**Response:**
```json
{
  "success": true,
  "message": "Membership types retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "tenantId": "uuid",
      "name": "Basic",
      "description": "Basic membership",
      "duration": 30,
      "price": 29.99,
      "maxCheckIns": null,
      "accessHours": {
        "monday": ["08:00", "22:00"],
        "tuesday": ["08:00", "22:00"],
        "wednesday": ["08:00", "22:00"],
        "thursday": ["08:00", "22:00"],
        "friday": ["08:00", "22:00"],
        "saturday": ["08:00", "20:00"],
        "sunday": ["08:00", "20:00"]
      },
      "facilities": ["gym", "locker"],
      "isActive": true
    }
  ]
}
```

#### 4.2 Get Membership Type by ID
Get details of a specific membership type.

**Endpoint:** `GET /membership-types/:id`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Notes:**
- Regular users, managers, and admins can only view membership types from their own tenant.
- Superadmins can view membership types from any tenant.

**Response:**
```json
{
  "success": true,
  "message": "Membership type retrieved successfully",
  "data": {
    "id": "uuid",
    "tenantId": "uuid",
    "name": "Basic",
    "description": "Basic membership",
    "duration": 30,
    "price": 29.99,
    "maxCheckIns": null,
    "accessHours": {
      "monday": ["08:00", "22:00"],
      "tuesday": ["08:00", "22:00"],
      "wednesday": ["08:00", "22:00"],
      "thursday": ["08:00", "22:00"],
      "friday": ["08:00", "22:00"],
      "saturday": ["08:00", "20:00"],
      "sunday": ["08:00", "20:00"]
    },
    "facilities": ["gym", "locker"],
    "isActive": true
  }
}
```

#### 4.3 Create Membership Type
Create a new membership type.

**Endpoint:** `POST /membership-types`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Notes:**
- Regular users, managers, and admins can only create membership types for their own tenant.
- Superadmins can create membership types for any tenant by including a `tenantId` in the request body.

**Request Body:**
```json
{
  "name": "Premium",
  "description": "Premium membership with all facilities",
  "duration": 30,
  "price": 99.99,
  "maxCheckIns": null,
  "accessHours": {
    "monday": ["06:00", "23:00"],
    "tuesday": ["06:00", "23:00"],
    "wednesday": ["06:00", "23:00"],
    "thursday": ["06:00", "23:00"],
    "friday": ["06:00", "23:00"],
    "saturday": ["06:00", "23:00"],
    "sunday": ["06:00", "23:00"]
  },
  "facilities": ["gym", "pool", "sauna", "locker", "parking"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Membership type created successfully",
  "data": {
    "id": "uuid",
    "tenantId": "uuid",
    "name": "Premium",
    "description": "Premium membership with all facilities",
    "duration": 30,
    "price": 99.99,
    "maxCheckIns": null,
    "accessHours": {
      "monday": ["06:00", "23:00"],
      "tuesday": ["06:00", "23:00"],
      "wednesday": ["06:00", "23:00"],
      "thursday": ["06:00", "23:00"],
      "friday": ["06:00", "23:00"],
      "saturday": ["06:00", "23:00"],
      "sunday": ["06:00", "23:00"]
    },
    "facilities": ["gym", "pool", "sauna", "locker", "parking"],
    "isActive": true
  }
}
```

#### 4.4 Update Membership Type
Update an existing membership type.

**Endpoint:** `PUT /membership-types/:id`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Notes:**
- Regular users, managers, and admins can only update membership types from their own tenant.
- Superadmins can update membership types from any tenant.

**Request Body:**
```json
{
  "name": "Premium Plus",
  "price": 129.99
}
```

**Response:**
```json
{
  "success": true,
  "message": "Membership type updated successfully",
  "data": {
    "id": "uuid",
    "tenantId": "uuid",
    "name": "Premium Plus",
    "description": "Premium membership with all facilities",
    "duration": 30,
    "price": 129.99,
    "maxCheckIns": null,
    "accessHours": {
      "monday": ["06:00", "23:00"],
      "tuesday": ["06:00", "23:00"],
      "wednesday": ["06:00", "23:00"],
      "thursday": ["06:00", "23:00"],
      "friday": ["06:00", "23:00"],
      "saturday": ["06:00", "23:00"],
      "sunday": ["06:00", "23:00"]
    },
    "facilities": ["gym", "pool", "sauna", "locker", "parking"],
    "isActive": true
  }
}
```

#### 4.5 Delete Membership Type
Delete a membership type.

**Endpoint:** `DELETE /membership-types/:id`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Notes:**
- Regular users, managers, and admins can only delete membership types from their own tenant.
- Superadmins can delete membership types from any tenant.

**Response:**
```json
{
  "success": true,
  "message": "Membership type deleted successfully"
}
```

### 5. Membership Management

#### 5.1 Get All Memberships
Get a list of all memberships for the current tenant.

**Endpoint:** `GET /memberships`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Query Parameters:**
- `tenantId` (optional, superadmin only): Filter by tenant ID. Only superadmins can use this parameter to view memberships from other tenants.

**Notes:**
- Regular users, managers, and admins can only view memberships from their own tenant.
- Superadmins can view memberships from all tenants, and can optionally filter by tenant ID.

**Response:**
```json
{
  "success": true,
  "message": "Memberships retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "tenantId": "uuid",
      "memberId": "uuid",
      "membershipTypeId": "uuid",
      "startDate": "2023-01-01",
      "endDate": "2023-01-31",
      "price": 29.99,
      "paymentStatus": "paid",
      "autoRenew": false,
      "status": "active",
      "notes": "Regular membership"
    }
  ]
}
```

#### 5.2 Get Membership by ID
Get details of a specific membership.

**Endpoint:** `GET /memberships/:id`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Notes:**
- Regular users, managers, and admins can only view memberships from their own tenant.
- Superadmins can view memberships from any tenant.

**Response:**
```json
{
  "success": true,
  "message": "Membership retrieved successfully",
  "data": {
    "id": "uuid",
    "tenantId": "uuid",
    "memberId": "uuid",
    "membershipTypeId": "uuid",
    "startDate": "2023-01-01",
    "endDate": "2023-01-31",
    "price": 29.99,
    "paymentStatus": "paid",
    "autoRenew": false,
    "status": "active",
    "notes": "Regular membership"
  }
}
```

#### 5.3 Create Membership
Create a new membership.

**Endpoint:** `POST /memberships`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Notes:**
- Regular users, managers, and admins can only create memberships for their own tenant.
- Superadmins can create memberships for any tenant by including a `tenantId` in the request body.

**Request Body:**
```json
{
  "memberId": "uuid",
  "membershipTypeId": "uuid",
  "startDate": "2023-02-01",
  "endDate": "2023-03-01",
  "price": 29.99,
  "autoRenew": false,
  "notes": "New membership"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Membership created successfully",
  "data": {
    "id": "uuid",
    "tenantId": "uuid",
    "memberId": "uuid",
    "membershipTypeId": "uuid",
    "startDate": "2023-02-01",
    "endDate": "2023-03-01",
    "price": 29.99,
    "paymentStatus": "pending",
    "autoRenew": false,
    "status": "active",
    "notes": "New membership"
  }
}
```

#### 5.4 Update Membership
Update an existing membership.

**Endpoint:** `PUT /memberships/:id`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Notes:**
- Regular users, managers, and admins can only update memberships from their own tenant.
- Superadmins can update memberships from any tenant.

**Request Body:**
```json
{
  "endDate": "2023-03-15",
  "autoRenew": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Membership updated successfully",
  "data": {
    "id": "uuid",
    "tenantId": "uuid",
    "memberId": "uuid",
    "membershipTypeId": "uuid",
    "startDate": "2023-02-01",
    "endDate": "2023-03-15",
    "price": 29.99,
    "paymentStatus": "pending",
    "autoRenew": true,
    "status": "active",
    "notes": "New membership"
  }
}
```

#### 5.5 Delete Membership
Delete a membership.

**Endpoint:** `DELETE /memberships/:id`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Notes:**
- Regular users, managers, and admins can only delete memberships from their own tenant.
- Superadmins can delete memberships from any tenant.

**Response:**
```json
{
  "success": true,
  "message": "Membership deleted successfully"
}
```

### 6. Payment Management

#### 6.1 Get All Payments
Get a list of all payments for the current tenant.

**Endpoint:** `GET /payments`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Query Parameters:**
- `tenantId` (optional, superadmin only): Filter by tenant ID. Only superadmins can use this parameter to view payments from other tenants.

**Notes:**
- Regular users, managers, and admins can only view payments from their own tenant.
- Superadmins can view payments from all tenants, and can optionally filter by tenant ID.

**Response:**
```json
{
  "success": true,
  "message": "Payments retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "tenantId": "uuid",
      "membershipId": "uuid",
      "amount": 29.99,
      "paymentMethod": "credit_card",
      "transactionId": "txn_123456789",
      "status": "completed",
      "processedBy": "uuid",
      "paymentDate": "2023-01-01T12:00:00Z",
      "notes": "Monthly payment"
    }
  ]
}
```

#### 6.2 Get Payment by ID
Get details of a specific payment.

**Endpoint:** `GET /payments/:id`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Notes:**
- Regular users, managers, and admins can only view payments from their own tenant.
- Superadmins can view payments from any tenant.

**Response:**
```json
{
  "success": true,
  "message": "Payment retrieved successfully",
  "data": {
    "id": "uuid",
    "tenantId": "uuid",
    "membershipId": "uuid",
    "amount": 29.99,
    "paymentMethod": "credit_card",
    "transactionId": "txn_123456789",
    "status": "completed",
    "processedBy": "uuid",
    "paymentDate": "2023-01-01T12:00:00Z",
    "notes": "Monthly payment"
  }
}
```

#### 6.3 Create Payment
Create a new payment.

**Endpoint:** `POST /payments`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Notes:**
- Regular users, managers, and admins can only create payments for their own tenant.
- Superadmins can create payments for any tenant by including a `tenantId` in the request body.

**Request Body:**
```json
{
  "membershipId": "uuid",
  "amount": 29.99,
  "paymentMethod": "credit_card",
  "transactionId": "txn_987654321",
  "notes": "Monthly payment"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment created successfully",
  "data": {
    "id": "uuid",
    "tenantId": "uuid",
    "membershipId": "uuid",
    "amount": 29.99,
    "paymentMethod": "credit_card",
    "transactionId": "txn_987654321",
    "status": "pending",
    "processedBy": "uuid",
    "paymentDate": null,
    "notes": "Monthly payment"
  }
}
```

#### 6.4 Update Payment
Update an existing payment.

**Endpoint:** `PUT /payments/:id`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Notes:**
- Regular users, managers, and admins can only update payments from their own tenant.
- Superadmins can update payments from any tenant.

**Request Body:**
```json
{
  "status": "completed",
  "paymentDate": "2023-02-01T12:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment updated successfully",
  "data": {
    "id": "uuid",
    "tenantId": "uuid",
    "membershipId": "uuid",
    "amount": 29.99,
    "paymentMethod": "credit_card",
    "transactionId": "txn_987654321",
    "status": "completed",
    "processedBy": "uuid",
    "paymentDate": "2023-02-01T12:00:00Z",
    "notes": "Monthly payment"
  }
}
```

#### 6.5 Delete Payment
Delete a payment.

**Endpoint:** `DELETE /payments/:id`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Notes:**
- Regular users, managers, and admins can only delete payments from their own tenant.
- Superadmins can delete payments from any tenant.

**Response:**
```json
{
  "success": true,
  "message": "Payment deleted successfully"
}
```

### 7. Check-In Management

#### 7.1 Get All Check-Ins
Get a list of all check-ins for the current tenant.

**Endpoint:** `GET /check-ins`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Query Parameters:**
- `memberId` (optional): Filter by member ID
- `startDate` (optional): Filter by start date (YYYY-MM-DD)
- `endDate` (optional): Filter by end date (YYYY-MM-DD)
- `tenantId` (optional, superadmin only): Filter by tenant ID. Only superadmins can use this parameter to view check-ins from other tenants.

**Notes:**
- Regular users, managers, and admins can only view check-ins from their own tenant.
- Superadmins can view check-ins from all tenants, and can optionally filter by tenant ID.

**Response:**
```json
{
  "success": true,
  "message": "Check-ins retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "tenantId": "uuid",
      "memberId": "uuid",
      "checkInTime": "2023-01-01T08:30:00Z",
      "checkOutTime": "2023-01-01T10:30:00Z",
      "checkedInBy": "uuid",
      "notes": "Morning workout"
    }
  ]
}
```

#### 7.2 Get Check-In by ID
Get details of a specific check-in.

**Endpoint:** `GET /check-ins/:id`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Notes:**
- Regular users, managers, and admins can only view check-ins from their own tenant.
- Superadmins can view check-ins from any tenant.

**Response:**
```json
{
  "success": true,
  "message": "Check-in retrieved successfully",
  "data": {
    "id": "uuid",
    "tenantId": "uuid",
    "memberId": "uuid",
    "checkInTime": "2023-01-01T08:30:00Z",
    "checkOutTime": "2023-01-01T10:30:00Z",
    "checkedInBy": "uuid",
    "notes": "Morning workout"
  }
}
```

#### 7.3 Create Check-In
Create a new check-in.

**Endpoint:** `POST /check-ins`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Notes:**
- Regular users, managers, and admins can only create check-ins for their own tenant.
- Superadmins can create check-ins for any tenant by including a `tenantId` in the request body.

**Request Body:**
```json
{
  "memberId": "uuid",
  "notes": "Evening workout"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Check-in created successfully",
  "data": {
    "id": "uuid",
    "tenantId": "uuid",
    "memberId": "uuid",
    "checkInTime": "2023-01-01T18:00:00Z",
    "checkOutTime": null,
    "checkedInBy": "uuid",
    "notes": "Evening workout"
  }
}
```

#### 7.4 Update Check-In
Update an existing check-in.

**Endpoint:** `PUT /check-ins/:id`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Notes:**
- Regular users, managers, and admins can only update check-ins from their own tenant.
- Superadmins can update check-ins from any tenant.

**Request Body:**
```json
{
  "checkOutTime": "2023-01-01T20:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Check-in updated successfully",
  "data": {
    "id": "uuid",
    "tenantId": "uuid",
    "memberId": "uuid",
    "checkInTime": "2023-01-01T18:00:00Z",
    "checkOutTime": "2023-01-01T20:00:00Z",
    "checkedInBy": "uuid",
    "notes": "Evening workout"
  }
}
```

#### 7.5 Delete Check-In
Delete a check-in.

**Endpoint:** `DELETE /check-ins/:id`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Notes:**
- Regular users, managers, and admins can only delete check-ins from their own tenant.
- Superadmins can delete check-ins from any tenant.

**Response:**
```json
{
  "success": true,
  "message": "Check-in deleted successfully"
}
```

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 422 | Unprocessable Entity |
| 500 | Internal Server Error |

## Role-Based Access Control

The API implements role-based access control with the following roles:

### 1. Superadmin
- Highest level of access with full control over the entire system
- Can manage all tenants, users, members, memberships, payments, and check-ins across all tenants
- Can create, view, update, and delete any data in the system
- Can access and manipulate data from all tenants without restriction
- Has a special `isSuperAdmin` flag set to `true` and `tenantId` set to `null`
- Identified by the "admin" role name in the database

### 2. Admin
- Full access to all resources within their tenant
- Can manage users, members, memberships, payments, and check-ins within their tenant
- Cannot manage tenants or access data from other tenants
- Can create and manage users with manager and user roles within their tenant

### 3. Manager
- Can manage members, memberships, payments, and check-ins within their tenant
- Cannot manage tenants or users with admin role
- Cannot access data from other tenants
- Can create and manage users with user role within their tenant

### 4. User
- Can view and update their own profile
- Can view their own membership and payment information
- Can check-in to the gym
- Cannot access data from other users or tenants