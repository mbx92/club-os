# Auto-Generated Admin Account for New Tenants

## Overview

When a SuperAdmin creates a new tenant, the system automatically generates an admin account for that tenant. This feature ensures every tenant has an initial administrator who can manage their organization immediately after creation.

## How It Works

### Automatic Admin Creation Flow

1. **SuperAdmin creates tenant** via `POST /api/v1/tenants`
2. **System validates** tenant data (especially `domain` field)
3. **Tenant is created** in database
4. **Admin role is fetched** from the system
5. **Admin account is auto-generated** with:
   - Email: `admin@{domain}`
   - Password: Based on configuration (see below)
   - First Name: "Admin"
   - Last Name: {Tenant Name}
   - Role: admin
   - Active: true
6. **Both tenant and admin** are created in a database transaction
7. **Response includes** tenant details and admin credentials

### Email Format

The admin email is automatically generated using the format:
```
admin@{domain_provided_during_tenant_registration}
```

**Example:**
- If domain is `gymxyz.com`, admin email will be `admin@gymxyz.com`
- If domain is `fitnesscenter.id`, admin email will be `admin@fitnesscenter.id`

### Password Configuration

The system supports two password modes configured via environment variables:

#### Mode 1: Default Password (Current - SMTP Not Available)

When `ENABLE_AUTO_PASSWORD_GENERATE=false` (default):
- Uses `DEFAULT_ADMIN_PASSWORD` from `.env` file
- Default value: `password123`
- **Important**: Admin should change password after first login

#### Mode 2: Auto-Generated Password (Future - When SMTP Available)

When `ENABLE_AUTO_PASSWORD_GENERATE=true`:
- Generates a secure random password automatically
- Password characteristics configurable via `.env`:
  - `PASSWORD_LENGTH`: Length of password (default: 16)
  - `PASSWORD_INCLUDE_UPPERCASE`: Include uppercase letters (default: true)
  - `PASSWORD_INCLUDE_LOWERCASE`: Include lowercase letters (default: true)
  - `PASSWORD_INCLUDE_NUMBERS`: Include numbers (default: true)
  - `PASSWORD_INCLUDE_SYMBOLS`: Include special symbols (default: true)
- Password will be sent via email when SMTP is configured

## Environment Configuration

Add these variables to your `.env.development`, `.env.test`, and `.env.production` files:

```env
# Auto-generated Admin Settings
# Default password for auto-created tenant admin accounts
DEFAULT_ADMIN_PASSWORD=password123

# Enable auto-password generation (requires SMTP setup)
ENABLE_AUTO_PASSWORD_GENERATE=false

# Password generation settings
PASSWORD_LENGTH=16
PASSWORD_INCLUDE_UPPERCASE=true
PASSWORD_INCLUDE_LOWERCASE=true
PASSWORD_INCLUDE_NUMBERS=true
PASSWORD_INCLUDE_SYMBOLS=true
```

## API Usage

### Create Tenant (SuperAdmin Only)

**Endpoint:** `POST /api/v1/tenants`

**Headers:**
```
Authorization: Bearer {superadmin_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Fitness XYZ Gym",
  "domain": "gymxyz.com",
  "address": "Jl. Sudirman No. 123, Jakarta",
  "phone": "+6281234567890",
  "email": "contact@gymxyz.com",
  "isActive": true,
  "isOnTrial": true,
  "trialEndDate": "2025-12-31"
}
```

**Response:** (201 Created)
```json
{
  "tenant": {
    "id": "uuid-tenant-id",
    "name": "Fitness XYZ Gym",
    "domain": "gymxyz.com",
    "address": "Jl. Sudirman No. 123, Jakarta",
    "phone": "+6281234567890",
    "email": "contact@gymxyz.com",
    "isActive": true,
    "isOnTrial": true,
    "trialEndDate": "2025-12-31T00:00:00.000Z",
    "createdAt": "2025-11-23T10:00:00.000Z",
    "updatedAt": "2025-11-23T10:00:00.000Z"
  },
  "admin": {
    "email": "admin@gymxyz.com",
    "password": "password123",
    "message": "Admin account created with default password. User should change password after first login."
  }
}
```

### Admin Login

After tenant creation, the admin can login immediately:

**Endpoint:** `POST /api/v1/auth/login`

**Request Body:**
```json
{
  "email": "admin@gymxyz.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid-user-id",
    "email": "admin@gymxyz.com",
    "firstName": "Admin",
    "lastName": "Fitness XYZ Gym",
    "tenantId": "uuid-tenant-id",
    "roleId": "uuid-role-id",
    "isSuperAdmin": false,
    "isActive": true
  },
  "accessToken": "jwt-token-here",
  "refreshToken": "refresh-token-here"
}
```

## Security Considerations

### Current Implementation (Default Password)

1. **Shared Default Password**: All auto-created admins initially use `DEFAULT_ADMIN_PASSWORD`
2. **SuperAdmin Responsibility**: SuperAdmin must securely share credentials with tenant admin
3. **Mandatory Password Change**: Tenant admin should change password immediately after first login
4. **Audit Logging**: All tenant creation events are logged with admin email for audit trail

### Future Implementation (Auto-Generated Password)

1. **Unique Passwords**: Each tenant admin gets a unique, secure password
2. **Email Delivery**: Password sent via email automatically (requires SMTP)
3. **Password Strength**: Configurable complexity requirements
4. **No Manual Sharing**: Eliminates manual credential sharing risks

## Database Schema

### User Model Fields (Auto-created Admin)

```javascript
{
  id: UUID,
  email: "admin@{domain}",
  password: "hashed_password",
  firstName: "Admin",
  lastName: "{Tenant Name}",
  tenantId: "{tenant_id}",
  roleId: "{admin_role_id}",
  isSuperAdmin: false,
  isActive: true,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

## Transaction Safety

The implementation uses database transactions to ensure data consistency:

- If tenant creation fails, no admin account is created
- If admin account creation fails, tenant creation is rolled back
- Atomic operation prevents orphaned records

## Error Handling

### Common Errors

1. **Missing Domain**
   - Status: 400 Bad Request
   - Message: "Domain is required for tenant creation"

2. **Admin Role Not Found**
   - Status: 500 Internal Server Error
   - Message: "Admin role not found in the system"
   - Solution: Run database seeders to create roles

3. **Duplicate Email**
   - Status: 500 Internal Server Error
   - Cause: Admin email already exists in database
   - Solution: Check if domain is already used

## Testing

### Manual Testing

1. Login as SuperAdmin
2. Create a new tenant with domain `testgym.com`
3. Verify response includes admin credentials
4. Logout from SuperAdmin
5. Login with `admin@testgym.com` and provided password
6. Verify successful login and tenant context

### Automated Testing

```javascript
// Test case example
describe('Tenant Creation with Auto Admin', () => {
  it('should create admin account when tenant is created', async () => {
    const response = await request(app)
      .post('/api/v1/tenants')
      .set('Authorization', `Bearer ${superadminToken}`)
      .send({
        name: 'Test Gym',
        domain: 'testgym.com'
      });
    
    expect(response.status).toBe(201);
    expect(response.body.admin.email).toBe('admin@testgym.com');
    expect(response.body.admin.password).toBeDefined();
  });
});
```

## Utility Functions

### Password Generator (`src/utils/passwordGenerator.js`)

#### `generatePassword(options)`

Generates a secure random password.

**Parameters:**
- `options.length`: Password length (default: from env or 16)
- `options.includeUppercase`: Include uppercase letters (default: true)
- `options.includeLowercase`: Include lowercase letters (default: true)
- `options.includeNumbers`: Include numbers (default: true)
- `options.includeSymbols`: Include symbols (default: true)

**Returns:** String - Generated password

**Example:**
```javascript
const password = generatePassword({
  length: 20,
  includeSymbols: false
});
// Returns: "aB3dEf9GhI2jKlM4nOpQ"
```

#### `getAdminPassword()`

Returns the appropriate password based on configuration.

**Returns:** 
- Auto-generated password if `ENABLE_AUTO_PASSWORD_GENERATE=true`
- Default password (`DEFAULT_ADMIN_PASSWORD`) otherwise

**Example:**
```javascript
const password = getAdminPassword();
// Returns: "password123" (when auto-generate is disabled)
// Returns: "aB3!dEf9@GhI2#jKl" (when auto-generate is enabled)
```

## Migration Plan for SMTP Integration

When SMTP becomes available:

1. **Update Environment Variables**
   ```env
   ENABLE_AUTO_PASSWORD_GENERATE=true
   
   # Add SMTP configuration
   SMTP_HOST=smtp.example.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=noreply@yourapp.com
   SMTP_PASSWORD=smtp_password
   SMTP_FROM=noreply@yourapp.com
   ```

2. **Create Email Service** (`src/services/emailService.js`)
   ```javascript
   async function sendAdminCredentials(email, password, tenantName) {
     // Send email with credentials
   }
   ```

3. **Update Tenant Controller**
   ```javascript
   // After creating admin
   if (process.env.ENABLE_AUTO_PASSWORD_GENERATE === 'true') {
     await emailService.sendAdminCredentials(
       adminEmail, 
       adminPassword, 
       tenant.name
     );
   }
   ```

4. **Update Response**
   ```javascript
   // Don't return password in response when emailed
   res.status(201).json({
     tenant,
     admin: {
       email: adminEmail,
       message: 'Admin credentials sent to email'
     }
   });
   ```

## Best Practices

1. **SuperAdmin Actions**
   - Securely share admin credentials with tenant contact person
   - Verify tenant admin changes password after first login
   - Keep audit logs of all tenant creations

2. **Tenant Admin Actions**
   - Change default password immediately after first login
   - Set up additional admin users if needed
   - Configure tenant settings and preferences

3. **Security**
   - Never log passwords in plain text
   - Use HTTPS for all credential transmissions
   - Implement password expiry policies
   - Enable two-factor authentication for admin accounts

## Troubleshooting

### Issue: Admin role not found

**Solution:**
```bash
npm run db:dev:reset
```
This reseeds the database with default roles.

### Issue: Duplicate admin email

**Cause:** Domain already used by another tenant

**Solution:**
- Use a different domain
- Or manually delete the existing admin account first

### Issue: Password not working

**Checklist:**
1. Verify `DEFAULT_ADMIN_PASSWORD` in `.env.development`
2. Check if password was changed after creation
3. Ensure using correct email format: `admin@{domain}`
4. Try password reset flow if available

## Related Files

- `src/controllers/tenant/tenantController.js` - Tenant creation logic
- `src/utils/passwordGenerator.js` - Password generation utility
- `src/models/user.js` - User model with password hashing
- `src/models/role.js` - Role model
- `.env.development` - Environment configuration

## References

- [SAAS Application Flow](./SAAS-APPLICATION-FLOW.md)
- [User Management Frontend](./USER-MANAGEMENT-FRONTEND.md)
- [Role Permission Management](./ROLE-PERMISSION-MANAGEMENT.md)
