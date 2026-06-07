# 📮 Postman Collection - Service Management API

## 📂 Files

- **Collection:** `service-management.postman_collection.json`
- **Environment:** `service-management.postman_environment.json`

---

## 🚀 Quick Start

### 1. Import to Postman

1. Open Postman
2. Click **Import** button
3. Select both files:
   - `service-management.postman_collection.json`
   - `service-management.postman_environment.json`
4. Click **Import**

### 2. Setup Environment

1. Select **Service Management Environment** from top-right dropdown
2. Click the eye icon to view/edit variables
3. Set these variables:
   ```
   baseUrl: http://localhost:3000
   jwt_token: <your-jwt-token-after-login>
   tenantId: <your-tenant-id>
   memberId: <test-member-id>
   trainerId: <test-trainer-id>
   ```

### 3. Authenticate

Before using the collection, you need to authenticate:

1. Use the main **Gym Membership API** collection
2. Go to **Authentication** → **Login**
3. Login with your credentials
4. Copy the JWT token from response
5. Paste it into `jwt_token` environment variable

---

## 📋 Collection Structure

### 1. **Service Plans** (9 requests)
Manage service plan templates:
- ✅ List Service Plans (with filters)
- ✅ Get Service Plan by ID
- ✅ Get Service Type Stats
- ✅ Create Membership Plan (time-based)
- ✅ Create Class Package (session-based)
- ✅ Create PT Package (session-based)
- ✅ Create Spa Package (session-based)
- ✅ Update Service Plan
- ✅ Delete Service Plan

### 2. **Active Services** (9 requests)
Manage member's active services:
- ✅ Get Member Active Services (with filters)
- ✅ Get Active Service by ID
- ✅ Purchase Membership (Cash)
- ✅ Purchase PT Package with Trainer
- ✅ Purchase with Voucher
- ✅ Purchase with Custom Start Date
- ✅ Use Session
- ✅ Assign Trainer
- ✅ Cancel Active Service

### 3. **Real-World Scenarios** (3 scenarios)
Complete workflows:
- ✅ **Scenario 1:** Member Beli Membership + PT (3 steps)
- ✅ **Scenario 2:** Use PT Sessions (3 steps)
- ✅ **Scenario 3:** Multiple Services Filter (3 requests)

---

## 🎯 Usage Examples

### Example 1: Create a Membership Plan

**Request:** POST `/api/v1/service/plans`

```json
{
  "serviceType": "membership",
  "name": "30 Days Gym Membership",
  "price": 500000,
  "durationType": "time_based",
  "duration": 30,
  "accessControl": {
    "facilities": ["gym", "pool", "sauna"],
    "maxCheckIns": 30
  }
}
```

**Auto-saves:** `servicePlanId` to environment variable ✅

### Example 2: Purchase Service

**Request:** POST `/api/v1/service/active/purchase`

```json
{
  "memberId": "{{memberId}}",
  "servicePlanId": "{{servicePlanId}}",
  "paymentMethod": "cash",
  "paidAmount": 500000
}
```

**Auto-saves:** `activeServiceId` to environment variable ✅

### Example 3: Use a Session

**Request:** POST `/api/v1/service/active/{{activeServiceId}}/use-session`

```json
{
  "notes": "Completed yoga class with instructor Sarah"
}
```

---

## 🔄 Testing Workflows

### Workflow 1: Complete Member Journey

1. **Create Membership Plan**
   - Run: `Service Plans` → `Create Membership Plan`
   - Note the `servicePlanId` (auto-saved)

2. **Create PT Package**
   - Run: `Service Plans` → `Create PT Package`
   - Note the second `servicePlanId`

3. **Purchase Membership**
   - Run: `Active Services` → `Purchase Membership (Cash)`
   - Uses saved `servicePlanId`
   - Auto-saves `activeServiceId`

4. **Purchase PT Package**
   - Run: `Active Services` → `Purchase PT Package with Trainer`
   - Set different `servicePlanId` manually

5. **View All Active Services**
   - Run: `Active Services` → `Get Member Active Services`
   - Should see 2 active services

6. **Use PT Session**
   - Run: `Active Services` → `Use Session`
   - Check `remainingSessions` in response

### Workflow 2: Use Real-World Scenario

Simply run all requests in:
- `Real-World Scenarios` → `Scenario 1: Member Beli Membership + PT`

Execute steps 1, 2, 3 in order. Variables will auto-update!

---

## 🔑 Environment Variables

### Required (Set Manually)
| Variable | Description | Example |
|----------|-------------|---------|
| `baseUrl` | API base URL | `http://localhost:3000` |
| `jwt_token` | JWT authentication token | `eyJhbGc...` |
| `tenantId` | Your tenant ID | `uuid` |
| `memberId` | Test member ID | `uuid` |
| `trainerId` | Test trainer ID | `uuid` |

### Auto-Generated (By Tests)
| Variable | Description | Set By |
|----------|-------------|--------|
| `servicePlanId` | Created service plan ID | POST Create Service Plan |
| `activeServiceId` | Created active service ID | POST Purchase Service |

---

## 📊 Service Types

### Time-based (Membership)
```json
{
  "serviceType": "membership",
  "durationType": "time_based",
  "duration": 30
}
```

### Session-based (Packages)
```json
{
  "serviceType": "pt_package",
  "durationType": "session_based",
  "sessions": 12,
  "validityDays": 60
}
```

---

## 🎨 Query Parameters

### List Service Plans
```
?page=1
&limit=10
&search=yoga
&serviceType=class_package
&isActive=true
&sortBy=price
&sortOrder=DESC
```

### Get Member Active Services
```
?status=active
&serviceType=pt_package
```

---

## ⚠️ Common Issues

### Issue 1: Unauthorized (401)
**Solution:** Update `jwt_token` in environment variables
```
1. Login via main API collection
2. Copy JWT token
3. Update jwt_token variable
```

### Issue 2: Service Plan Not Found
**Solution:** Check `servicePlanId` variable
```
1. Run "Create Membership Plan" first
2. ID will be auto-saved to variable
3. Or manually set the ID
```

### Issue 3: Member Not Found
**Solution:** Set correct `memberId`
```
1. Create member via main API collection
2. Copy member ID
3. Update memberId variable
```

---

## 🔒 Security

All requests include:
- ✅ JWT Bearer token authentication
- ✅ Tenant isolation (multi-tenant)
- ✅ CASL authorization
- ✅ Feature gating
- ✅ Subscription limit checks

---

## 📚 Related Documentation

- **Full API Docs:** `docs/system-docs/UNIFIED-SERVICE-MANAGEMENT.md`
- **Quick Reference:** `docs/system-docs/SERVICE-MANAGEMENT-QUICKREF.md`
- **Implementation:** `docs/implementation-progress/UNIFIED-SERVICE-IMPLEMENTATION.md`

---

## 💡 Tips

1. **Use Scenarios** - Start with Real-World Scenarios for complete workflows
2. **Check Auto-saves** - Variables like `servicePlanId` are auto-saved
3. **Filter Results** - Use query parameters to filter list results
4. **Watch Sessions** - Track `remainingSessions` when using sessions
5. **Test Multiple Services** - Purchase multiple services for one member

---

## 📞 Support

For issues or questions:
- Check variable values in environment
- Verify JWT token is valid
- Check server logs: `logs/` directory
- Review error messages in response

---

**Collection Version:** 1.0.0  
**Last Updated:** November 23, 2025  
**Total Requests:** 21 (9 Service Plans + 9 Active Services + 3 Scenarios)
