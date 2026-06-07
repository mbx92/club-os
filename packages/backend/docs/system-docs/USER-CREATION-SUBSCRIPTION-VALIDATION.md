# User Creation Subscription Validation

## Overview

This document describes the subscription validation requirement for creating new users in the system. Tenants must have an active subscription or trial period to add users to their organization.

## Business Rules

### General Rule
**Tenants must have an active subscription/plan to create new users.**

If a tenant does not have an active subscription or trial period:
- ❌ User creation requests will be **denied**
- 🚫 API will return `403 Forbidden` error
- 📝 Action will be logged for security audit

### Exception: First Admin User

**SuperAdmin can create the first admin user for a tenant without requiring an active subscription.**

This exception exists to:
- ✅ Allow initial tenant setup
- ✅ Enable SuperAdmin to configure new tenant accounts
- ✅ Provide flexibility during onboarding process

#### Conditions for Exception

The exception applies when **ALL** of the following conditions are met:

1. **User creating is a SuperAdmin** (`isSuperAdmin: true`)
2. **Target role is "admin"** (creating an admin user)
3. **Tenant has zero existing users** (this is the first user)

If any condition is not met, normal subscription validation applies.

## Validation Flow

```
┌─────────────────────────────────┐
│  User Creation Request          │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  Check: Is SuperAdmin creating  │
│  first admin for tenant?        │
└────────────┬────────────────────┘
             │
     ┌───────┴────────┐
     │                │
    YES              NO
     │                │
     ▼                ▼
┌─────────┐   ┌──────────────────┐
│ ALLOW   │   │ Check: Tenant    │
│ SKIP    │   │ has active trial │
│ CHECK   │   │ or subscription? │
└─────────┘   └────────┬─────────┘
                       │
              ┌────────┴────────┐
              │                 │
             YES               NO
              │                 │
              ▼                 ▼
         ┌────────┐      ┌──────────┐
         │ ALLOW  │      │  DENY    │
         │ CREATE │      │  403     │
         └────────┘      └──────────┘
```

## Implementation Details

### Location
**File:** `src/controllers/user/userController.js`  
**Function:** `createUser`

### Validation Logic

```javascript
// Determine if this is first admin by SuperAdmin
const isSuperAdminCreating = req.user && req.user.isSuperAdmin;
const role = await Role.findByPk(roleId);
const isCreatingAdmin = role && role.name === 'admin';
const existingUserCount = await User.count({ where: { tenantId } });
const isFirstAdminBySuper = isSuperAdminCreating && isCreatingAdmin && existingUserCount === 0;

if (!isFirstAdminBySuper) {
  // Check if tenant has active trial
  if (tenant.isOnTrial && now <= tenant.trialEndDate) {
    hasAccess = true;
  }
  
  // Check if tenant has active subscription
  const subscription = await Subscription.findOne({
    where: { tenantId, status: 'active' }
  });
  
  if (subscription && now >= subscription.startDate && now <= subscription.endDate) {
    hasAccess = true;
  }
  
  if (!hasAccess) {
    return res.status(403).json({ 
      message: 'Access denied. Tenant must have an active subscription or trial to create users.',
      code: 'NO_ACTIVE_SUBSCRIPTION'
    });
  }
}
```

## API Response Examples

### Success: First Admin by SuperAdmin (No Subscription)

**Request:**
```http
POST /api/v1/users
Authorization: Bearer {superadmin_token}
Content-Type: application/json

{
  "email": "admin@newcompany.com",
  "password": "secure123",
  "roleId": "{admin_role_id}",
  "tenantId": "{new_tenant_id}"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "email": "admin@newcompany.com",
  "tenantId": "{new_tenant_id}",
  "roleId": "{admin_role_id}",
  "isActive": true,
  "createdAt": "2025-11-23T10:00:00Z"
}
```

### Success: User Creation with Active Subscription

**Request:**
```http
POST /api/v1/users
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "email": "user@company.com",
  "password": "password123",
  "roleId": "{user_role_id}"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "email": "user@company.com",
  "tenantId": "{tenant_id}",
  "roleId": "{user_role_id}",
  "isActive": true,
  "createdAt": "2025-11-23T10:00:00Z"
}
```

### Failure: No Active Subscription

**Request:**
```http
POST /api/v1/users
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "email": "newuser@company.com",
  "password": "password123",
  "roleId": "{user_role_id}"
}
```

**Response:** `403 Forbidden`
```json
{
  "message": "Access denied. Tenant must have an active subscription or trial to create users.",
  "code": "NO_ACTIVE_SUBSCRIPTION",
  "details": "Please activate a subscription plan to add more users to your organization."
}
```

## Access Scenarios

### Scenario 1: SuperAdmin Creates First Admin
| Condition | Value | Result |
|-----------|-------|--------|
| Creator | SuperAdmin | ✅ |
| Target Role | admin | ✅ |
| Existing Users | 0 | ✅ |
| Subscription | None | ✅ |
| **Outcome** | **ALLOWED** | ✅ |

### Scenario 2: SuperAdmin Creates Second User
| Condition | Value | Result |
|-----------|-------|--------|
| Creator | SuperAdmin | ✅ |
| Target Role | user | ⚠️ |
| Existing Users | 1 | ⚠️ |
| Subscription | None | ❌ |
| **Outcome** | **DENIED** | ❌ |

### Scenario 3: Admin Creates User (With Trial)
| Condition | Value | Result |
|-----------|-------|--------|
| Creator | Admin | ✅ |
| Target Role | user | ✅ |
| Existing Users | 1 | ⚠️ |
| Trial Active | Yes | ✅ |
| **Outcome** | **ALLOWED** | ✅ |

### Scenario 4: Admin Creates User (With Subscription)
| Condition | Value | Result |
|-----------|-------|--------|
| Creator | Admin | ✅ |
| Target Role | user | ✅ |
| Existing Users | 5 | ⚠️ |
| Subscription | Active | ✅ |
| **Outcome** | **ALLOWED** | ✅ |

### Scenario 5: Admin Creates User (No Subscription/Trial)
| Condition | Value | Result |
|-----------|-------|--------|
| Creator | Admin | ✅ |
| Target Role | user | ✅ |
| Existing Users | 1 | ⚠️ |
| Subscription | None | ❌ |
| Trial | Expired | ❌ |
| **Outcome** | **DENIED** | ❌ |

## Security & Audit

### Logging

All user creation attempts are logged, including:

**Successful Creation:**
```javascript
logger.logAudit("User created successfully", {
  user: req.user,
  request: { method, path, ip, body },
  response: { statusCode: 201 }
});
```

**Denied Creation (No Subscription):**
```javascript
logger.logSecurity("User creation denied - no active subscription", {
  tenantId,
  user: req.user,
  request: { method, path, ip, body }
});
```

**Failed Creation (Error):**
```javascript
logger.logSecurity("User creation failed", {
  error: err.message,
  user: req.user,
  request: { method, path, ip, body }
});
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `TENANT_NOT_FOUND` | 404 | Tenant does not exist |
| `NO_ACTIVE_SUBSCRIPTION` | 403 | No active subscription or trial |

## Integration with Auto-Admin Creation

This validation works seamlessly with the auto-admin creation feature when SuperAdmin creates a new tenant:

1. **SuperAdmin creates tenant** via `POST /api/v1/tenants`
2. **System auto-creates first admin** (no subscription check applied)
3. **First admin user created successfully** ✅
4. **Any additional users** require active subscription ⚠️

See: [AUTO-ADMIN-CREATION.md](./AUTO-ADMIN-CREATION.md) for details.

## Testing

### Test Case 1: First Admin Creation (No Subscription)
```javascript
describe('User Creation Validation', () => {
  it('should allow SuperAdmin to create first admin without subscription', async () => {
    // Given: New tenant with no users, no subscription
    // When: SuperAdmin creates admin user
    // Then: User created successfully (201)
  });
});
```

### Test Case 2: Second User Creation (No Subscription)
```javascript
it('should deny user creation when tenant has no subscription', async () => {
  // Given: Tenant with 1 user, no subscription
  // When: Admin tries to create another user
  // Then: Request denied (403 NO_ACTIVE_SUBSCRIPTION)
});
```

### Test Case 3: User Creation with Trial
```javascript
it('should allow user creation during active trial period', async () => {
  // Given: Tenant on trial with trialEndDate in future
  // When: Admin creates user
  // Then: User created successfully (201)
});
```

### Test Case 4: User Creation with Subscription
```javascript
it('should allow user creation with active subscription', async () => {
  // Given: Tenant with active subscription
  // When: Admin creates user
  // Then: User created successfully (201)
});
```

### Test Case 5: User Creation After Trial Expires
```javascript
it('should deny user creation after trial expires without subscription', async () => {
  // Given: Tenant with expired trial, no subscription
  // When: Admin tries to create user
  // Then: Request denied (403 NO_ACTIVE_SUBSCRIPTION)
});
```

## Best Practices

### For SuperAdmin
1. ✅ Create initial admin account when setting up new tenant
2. ✅ Ensure tenant activates subscription before additional users needed
3. ✅ Monitor subscription status for all tenants
4. ✅ Communicate subscription requirements to tenant admins

### For Tenant Admin
1. ✅ Ensure active subscription before adding users
2. ✅ Monitor trial expiration date
3. ✅ Upgrade subscription if user limit reached
4. ✅ Plan user additions according to subscription capacity

### For Developers
1. ✅ Always check return codes when creating users programmatically
2. ✅ Handle `NO_ACTIVE_SUBSCRIPTION` error gracefully
3. ✅ Display clear error messages to end users
4. ✅ Provide link to subscription management when denied

## Troubleshooting

### Issue: "NO_ACTIVE_SUBSCRIPTION" error when creating user

**Possible Causes:**
1. Tenant has no subscription plan
2. Subscription has expired
3. Trial period has ended
4. Subscription status is not 'active'

**Solutions:**
1. Check tenant subscription status: `GET /api/v1/subscription/current`
2. Activate a subscription plan if none exists
3. Renew expired subscription
4. Contact support if subscription should be active

### Issue: Can't create ANY users for new tenant

**Check:**
1. Is this the first user? Count should be 0
2. Is the user being created an admin? Check roleId
3. Is the creator a SuperAdmin? Check `isSuperAdmin` flag
4. Verify tenant exists and tenantId is correct

### Issue: SuperAdmin can't create second user

**This is expected behavior!**
- SuperAdmin exception only applies to first admin user
- Additional users require active subscription
- Solution: Activate subscription for the tenant

## Related Documentation

- [AUTO-ADMIN-CREATION.md](./AUTO-ADMIN-CREATION.md) - Auto-generated admin for new tenants
- [SAAS-APPLICATION-FLOW.md](./SAAS-APPLICATION-FLOW.md) - Complete SaaS flow
- [SUBSCRIPTION-FEATURE-STATUS.md](./SUBSCRIPTION-FEATURE-STATUS.md) - Subscription features
- [USER-MANAGEMENT-FRONTEND.md](./USER-MANAGEMENT-FRONTEND.md) - Frontend user management

## Changelog

### Version 1.0.0 (November 23, 2025)
- ✅ Initial implementation
- ✅ Subscription validation for user creation
- ✅ Exception for first admin by SuperAdmin
- ✅ Trial period support
- ✅ Security audit logging
- ✅ Comprehensive error handling

---

**Status:** ✅ Production Ready  
**Last Updated:** November 23, 2025  
**Implemented In:** `src/controllers/user/userController.js`
