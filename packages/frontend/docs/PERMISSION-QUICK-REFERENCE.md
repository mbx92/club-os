# Permission System - Quick Reference Guide

> **Last Updated**: 2025-02-22  
> **Status**: ✅ Ready for Production

---

## 🚀 Quick Start (5 Minutes)

### 1. Test the Fix

```bash
# Start server
npm run dev

# Test subjects endpoint
curl http://localhost:5000/api/v1/permissions/subjects \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" | jq

# Should return 65+ subjects
```

### 2. Verify Restaurant Module

```bash
# Login as admin
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "password"}'

# Extract token from response, then:
export TOKEN="your_jwt_token_here"

# Test Restaurant dashboard
curl http://localhost:5000/api/v1/restaurant/dashboard/overview \
  -H "Authorization: Bearer $TOKEN"

# Test Restaurant products
curl http://localhost:5000/api/v1/restaurant/products \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📚 What Changed

### Files Modified

| File | Change | Lines |
|------|--------|-------|
| `src/config/routePermissions.js` | Restaurant: 12 → 68 routes | 295-368 |
| `src/config/routePermissions.js` | Hikvision: 14 → 24 routes | 530-590 |
| `src/services/permissionService.js` | Fixed action format | 142 |
| `src/controllers/core/system/permissionController.js` | Added 3 endpoints | +150 lines |
| `src/routes/core/system/permission.routes.js` | Added 3 routes | +30 lines |

### New API Endpoints

```
GET  /api/v1/permissions/subjects          # List all 65+ subjects
GET  /api/v1/roles/:id/preview             # Preview role permissions
POST /api/v1/roles/:roleId/generate-casl   # Generate CASL rules from form
```

---

## 🎯 Restaurant Module Subjects (8 Total)

| Subject | Purpose | Example Routes |
|---------|---------|----------------|
| `Restaurant` | Dashboard access | `/dashboard/overview`, `/dashboard/sales-trend` |
| `RestaurantCategory` | Categories | `/categories`, `/categories/:id` |
| `RestaurantProduct` | Products & extras | `/products`, `/products/:id/adjust-stock` |
| `RestaurantLocation` | Locations/kitchen | `/locations`, `/locations/:id/stock-summary` |
| `RestaurantTable` | Tables | `/tables`, `/tables/:id/occupy` |
| `Order` | Order operations | `/orders`, `/orders/:id/split`, `/orders/:id/payment` |
| `RestaurantStock` | Stock movements | `/stock-movements/stock-in`, `/stock-movements/transfer` |
| `RestaurantReport` | Reports | `/reports/sales`, `/reports/daily-summary` |

---

## 💡 Usage Examples

### 1. Check User Permission

```javascript
// In controller
const { can } = req.ability;

if (can('read', 'RestaurantProduct')) {
  // Allow access to products
} else {
  return res.status(403).json({ message: 'Forbidden' });
}
```

### 2. Add Permission to Route

```javascript
// In routes file
router.get('/products', 
  authenticate,
  requireModule('restaurant'),
  authorizeCasl('read', 'RestaurantProduct'),
  productController.getAll
);
```

### 3. Update Role Permissions

```javascript
// Via API
const rolePermissions = {
  caslRules: [
    { 
      subject: 'Restaurant', 
      actions: ['read'], 
      conditions: { tenantId: '$tenantId' } 
    },
    { 
      subject: 'RestaurantProduct', 
      actions: ['read', 'create', 'update'], 
      conditions: { tenantId: '$tenantId' } 
    },
    { 
      subject: 'Order', 
      actions: ['read', 'create', 'update'], 
      conditions: { tenantId: '$tenantId' } 
    }
  ]
};

await role.update({ caslRules: rolePermissions.caslRules });
```

### 4. Get Subject for Route

```javascript
const { getSubjectForRoute } = require('../config/routePermissions');

const routePath = '/restaurant/products';
const method = 'GET';

const mapping = getSubjectForRoute(routePath, method);
// Returns: { subject: 'RestaurantProduct', actions: ['read'] }
```

---

## 🔍 Troubleshooting

### Issue: Frontend shows "Permission denied" for Restaurant

**Solution**: Update role permissions to include Restaurant subjects

```sql
-- Check current role permissions
SELECT name, "caslRules" 
FROM "Roles" 
WHERE name = 'cashier';

-- If Restaurant subjects missing, update:
UPDATE "Roles"
SET "caslRules" = "caslRules" || 
  '[
    {"subject": "Restaurant", "actions": ["read"], "conditions": {"tenantId": "$tenantId"}},
    {"subject": "RestaurantProduct", "actions": ["read"], "conditions": {"tenantId": "$tenantId"}},
    {"subject": "Order", "actions": ["read", "create"], "conditions": {"tenantId": "$tenantId"}}
  ]'::jsonb
WHERE name = 'cashier';
```

### Issue: Subjects endpoint returns old data

**Solution**: Restart server to reload routePermissions.js

```bash
# Stop server (Ctrl+C)
# Start again
npm run dev
```

### Issue: Permission check fails with correct subject

**Debug Steps**:
1. Check route mapping in `src/config/routePermissions.js`
2. Verify subject name matches exactly (case-sensitive)
3. Check user's role permissions include the subject
4. Verify tenantId condition matches

```javascript
// Debug in controller
console.log('User Ability:', req.ability.rules);
console.log('Can access?', req.ability.can('read', 'RestaurantProduct'));
```

### Issue: "Cannot find subject for route"

**Solution**: Add route to `src/config/routePermissions.js`

```javascript
// Example
'/your/new/route': {
  GET: { subject: 'YourSubject', actions: ['read'] },
  POST: { subject: 'YourSubject', actions: ['create'] }
}
```

Then regenerate routes:
```bash
npm run generate:routes
```

---

## 📋 Checklist for New Routes

When adding a new protected route:

- [ ] Define subject name (use module prefix, e.g., `Restaurant*`)
- [ ] Add to `src/config/routePermissions.js` with correct method
- [ ] Add `authorizeCasl(action, subject)` middleware to route
- [ ] Update default role permissions in `src/utils/defaultRolePermissions.js`
- [ ] Regenerate routes metadata: `npm run generate:routes`
- [ ] Test with role that has permission
- [ ] Test with role that lacks permission (should return 403)
- [ ] Update API documentation

---

## 🎓 Permission Format Reference

### OLD Format (Deprecated ❌)
```json
{
  "subject": "Member",
  "action": "read",
  "actions": [],
  "conditions": {}
}
```

### NEW Format (Correct ✅)
```json
{
  "subject": "Member",
  "actions": ["read", "update"],
  "conditions": {
    "tenantId": "$tenantId"
  }
}
```

### Available Actions
- `read` - View/list resources
- `create` - Create new resources
- `update` - Modify existing resources
- `delete` - Remove resources
- `manage` - Full access (superadmin only)

### Runtime Variables
- `$tenantId` - Replaced with `req.user.tenantId`
- `$userId` - Replaced with `req.user.id`
- `$roleId` - Replaced with `req.user.roleId`

---

## 🔐 Common Permission Patterns

### 1. Basic Resource Access
```javascript
{
  subject: 'Member',
  actions: ['read'],
  conditions: { tenantId: '$tenantId' }
}
```

### 2. Full CRUD Access
```javascript
{
  subject: 'Member',
  actions: ['read', 'create', 'update', 'delete'],
  conditions: { tenantId: '$tenantId' }
}
```

### 3. Own Records Only
```javascript
{
  subject: 'Transaction',
  actions: ['read'],
  conditions: { 
    tenantId: '$tenantId',
    createdBy: '$userId'
  }
}
```

### 4. Superadmin (No Restrictions)
```javascript
{
  subject: 'all',
  actions: ['manage'],
  conditions: {}
}
```

### 5. Module Dashboard
```javascript
{
  subject: 'Restaurant',
  actions: ['read'],
  conditions: { tenantId: '$tenantId' }
}
```

---

## 📊 Subject Count by Module

```
Core:         10 subjects
Gym:          15 subjects
Restaurant:    8 subjects  ← Fixed
Finance:       6 subjects
Psychology:    8 subjects
Subscription:  4 subjects
Voucher:       1 subject
Hikvision:     1 subject   ← Fixed
POS:           4 subjects
Advanced:      8 subjects
─────────────────────────
Total:        65+ subjects
```

---

## 🚨 Critical Notes

1. **Always prefix subjects with module name** to avoid conflicts
   - ✅ `RestaurantProduct`, `GymProduct`
   - ❌ `Product` (too generic)

2. **Use exact subject names** - they are case-sensitive
   - ✅ `RestaurantProduct`
   - ❌ `restaurantproduct`, `Restaurant_Product`

3. **Always include conditions** for tenant isolation
   - ✅ `conditions: { tenantId: '$tenantId' }`
   - ❌ `conditions: {}` (except for superadmin)

4. **Actions must be arrays** in new format
   - ✅ `actions: ['read', 'create']`
   - ❌ `action: 'read'` (old format)

5. **Regenerate routes after changes** to routePermissions.js
   ```bash
   npm run generate:routes
   ```

---

## 📖 Related Documentation

- [COMPLETE-SUBJECT-MAPPING-AUDIT.md](./COMPLETE-SUBJECT-MAPPING-AUDIT.md) - Full audit report
- [RESTAURANT-ROUTE-MAPPING-FIX.md](./RESTAURANT-ROUTE-MAPPING-FIX.md) - Restaurant fix details
- [PERMISSION-SYSTEM-IMPLEMENTATION.md](./PERMISSION-SYSTEM-IMPLEMENTATION.md) - Technical docs
- [CASL-PERMISSION-STRUCTURE.md](./CASL-PERMISSION-STRUCTURE.md) - Original requirements

---

## 🛠️ Next Steps

1. ✅ Routes mapped for Restaurant & Hikvision
2. ✅ Permission format fixed
3. ✅ New endpoints added
4. ⏳ **TODO**: Run migration script for existing roles
5. ⏳ **TODO**: Update default role permissions
6. ⏳ **TODO**: Test with frontend integration
7. ⏳ **TODO**: Update role management UI

---

## 💬 Need Help?

Common questions:

**Q: How do I add a new subject?**  
A: Add route to `routePermissions.js`, use in `authorizeCasl()`, run `generate:routes`

**Q: User has permission but still gets 403?**  
A: Check conditions match (especially tenantId), verify subject name spelling

**Q: How to give user access to entire module?**  
A: Add all module subjects to role's caslRules with appropriate actions

**Q: What's the difference between `read` and `manage`?**  
A: `read` is view-only, `manage` includes all actions (usually superadmin only)

**Q: Can I use wildcards in subjects?**  
A: No, use exact subject names. For multiple subjects, add separate rules.

---

*For detailed technical documentation, see [COMPLETE-SUBJECT-MAPPING-AUDIT.md](./COMPLETE-SUBJECT-MAPPING-AUDIT.md)*
