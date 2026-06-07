# 🔔 Check-In System - Implementation Guide

## 📋 Overview

The Check-In System provides member attendance tracking with automatic session usage for session-based services (PT packages, class packages, etc.). It validates member eligibility, active services, and auto-decrements remaining sessions.

**Implementation Status**: ✅ **COMPLETED** (November 26, 2025)

---

## 🎯 Key Features

1. **✅ Automatic Service Validation**
   - Checks active membership or service packages
   - Validates expiry dates and remaining sessions
   - Multi-tenant isolation

2. **✅ Auto Session Usage**
   - Automatically uses session for session-based services
   - Optimistic locking for concurrency safety
   - Transaction-safe operations

3. **✅ Flexible Check-In Types**
   - General check-in (membership)
   - Service-specific check-in (PT, class packages)
   - Optional notes and checkout tracking

4. **✅ Statistics & Reporting**
   - Daily, weekly, monthly check-in counts
   - Unique member tracking
   - Filterable by date range and member

---

## 📊 Database Schema

### CheckIns Table

```sql
CREATE TABLE "CheckIns" (
  id UUID PRIMARY KEY,
  tenantId UUID NOT NULL REFERENCES "Tenants"(id),
  memberId UUID NOT NULL REFERENCES "Members"(id),
  activeServiceId UUID REFERENCES "ActiveServices"(id),
  checkInTime TIMESTAMP NOT NULL DEFAULT NOW(),
  checkOutTime TIMESTAMP,
  checkedInBy UUID REFERENCES "Users"(id),
  notes TEXT,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);

-- Indexes
CREATE INDEX checkins_activeserviceid_idx ON "CheckIns"(activeServiceId);
CREATE INDEX checkins_member_idx ON "CheckIns"(memberId);
CREATE INDEX checkins_time_idx ON "CheckIns"(checkInTime);
```

### Model Relations

```javascript
// CheckIn model
CheckIn.belongsTo(Member, { foreignKey: 'memberId', as: 'member' });
CheckIn.belongsTo(ActiveService, { foreignKey: 'activeServiceId', as: 'activeService' });
CheckIn.belongsTo(User, { foreignKey: 'checkedInBy', as: 'checkedBy' });
CheckIn.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

// ActiveService model
ActiveService.hasMany(CheckIn, { foreignKey: 'activeServiceId', as: 'checkIns' });

// Member model
Member.hasMany(CheckIn, { foreignKey: 'memberId', as: 'checkIns' });
```

---

## 🛣️ API Endpoints

### Base URL: `/api/v1/gym/check-ins`

| Method | Endpoint | Description | Auth | Feature Gate |
|--------|----------|-------------|------|--------------|
| POST | `/` | Create check-in | ✅ | gym |
| GET | `/` | List check-ins | ✅ | gym |
| GET | `/stats` | Get statistics | ✅ | gym |
| GET | `/:id` | Get check-in by ID | ✅ | gym |
| PUT | `/:id` | Update check-in | ✅ | gym |
| DELETE | `/:id` | Delete check-in | ✅ | gym |

---

## 📝 API Usage Examples

### 1. Create Check-In (General Membership)

**Validates active membership and creates check-in record**

```bash
POST /api/v1/gym/check-ins
Content-Type: application/json
Authorization: Bearer <token>

{
  "memberId": "member-uuid",
  "notes": "Morning workout"
}
```

**Response:**

```json
{
  "message": "Check-in successful",
  "data": {
    "checkIn": {
      "id": "checkin-uuid",
      "memberId": "member-uuid",
      "activeServiceId": "service-uuid",
      "checkInTime": "2025-11-26T08:30:00.000Z",
      "checkOutTime": null,
      "notes": "Morning workout",
      "member": {
        "id": "member-uuid",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com",
        "phone": "081234567890"
      },
      "checkedBy": {
        "id": "user-uuid",
        "firstName": "Admin",
        "lastName": "Staff"
      }
    },
    "activeService": {
      "id": "service-uuid",
      "serviceType": "membership",
      "servicePlanName": "30 Days Membership",
      "remainingSessions": null,
      "totalSessions": null,
      "endDate": "2025-12-26",
      "status": "active"
    },
    "sessionUsed": false
  }
}
```

**Error Responses:**

```json
// No active membership
{
  "success": false,
  "code": "NO_ACTIVE_MEMBERSHIP",
  "message": "No active membership found. Please purchase a membership."
}

// Member inactive
{
  "success": false,
  "code": "MEMBER_INACTIVE",
  "message": "Member is not active"
}
```

---

### 2. Create Check-In (PT Package with Auto Session Usage)

**Uses one session from PT package automatically**

```bash
POST /api/v1/gym/check-ins
Content-Type: application/json
Authorization: Bearer <token>

{
  "memberId": "member-uuid",
  "serviceType": "pt_package",
  "notes": "Upper body training session"
}
```

**Response:**

```json
{
  "message": "Check-in successful",
  "data": {
    "checkIn": {
      "id": "checkin-uuid",
      "memberId": "member-uuid",
      "activeServiceId": "pt-service-uuid",
      "checkInTime": "2025-11-26T09:00:00.000Z",
      "notes": "Upper body training session"
    },
    "activeService": {
      "id": "pt-service-uuid",
      "serviceType": "pt_package",
      "servicePlanName": "12x Personal Training",
      "remainingSessions": 11,
      "totalSessions": 12,
      "endDate": "2026-01-25",
      "status": "active"
    },
    "sessionUsed": true
  }
}
```

**Error Responses:**

```json
// No valid service found
{
  "success": false,
  "code": "NO_VALID_SERVICE",
  "message": "No valid pt_package service found. Please purchase a service plan."
}

// Service expired
{
  "success": false,
  "code": "SERVICE_EXPIRED",
  "message": "Service has expired"
}

// No sessions remaining
{
  "success": false,
  "code": "NO_SESSIONS_REMAINING",
  "message": "No sessions remaining"
}
```

---

### 3. Get Check-Ins List (Filtered)

```bash
GET /api/v1/gym/check-ins?page=1&limit=20&memberId=member-uuid&startDate=2025-11-01&endDate=2025-11-30
Authorization: Bearer <token>
```

**Response:**

```json
{
  "data": [
    {
      "id": "checkin-uuid",
      "memberId": "member-uuid",
      "activeServiceId": "service-uuid",
      "checkInTime": "2025-11-26T08:30:00.000Z",
      "checkOutTime": "2025-11-26T10:00:00.000Z",
      "notes": "Morning workout",
      "member": {
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com"
      },
      "checkedBy": {
        "firstName": "Admin",
        "lastName": "Staff"
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalRecords": 98,
    "limit": 20,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "filters": {
    "memberId": "member-uuid",
    "serviceType": null,
    "startDate": "2025-11-01",
    "endDate": "2025-11-30",
    "sortBy": "checkInTime",
    "sortOrder": "DESC"
  }
}
```

---

### 4. Get Check-In Statistics

```bash
GET /api/v1/gym/check-ins/stats?startDate=2025-11-01&endDate=2025-11-30
Authorization: Bearer <token>
```

**Response:**

```json
{
  "data": {
    "total": 450,
    "today": 32,
    "thisWeek": 178,
    "thisMonth": 450,
    "uniqueMembersToday": 28,
    "filters": {
      "startDate": "2025-11-01",
      "endDate": "2025-11-30",
      "memberId": null
    }
  }
}
```

---

### 5. Update Check-In (Add Checkout)

```bash
PUT /api/v1/gym/check-ins/:id
Content-Type: application/json
Authorization: Bearer <token>

{
  "checkOutTime": "2025-11-26T10:00:00.000Z",
  "notes": "Completed workout session"
}
```

**Response:**

```json
{
  "message": "Check-in updated successfully",
  "data": {
    "id": "checkin-uuid",
    "checkInTime": "2025-11-26T08:30:00.000Z",
    "checkOutTime": "2025-11-26T10:00:00.000Z",
    "notes": "Completed workout session"
  }
}
```

---

### 6. Delete Check-In

```bash
DELETE /api/v1/gym/check-ins/:id
Authorization: Bearer <token>
```

**Response:**

```json
{
  "message": "Check-in deleted successfully"
}
```

---

## 🔄 Business Logic Workflows

### Workflow 1: General Membership Check-In

```
1. Staff scans member card/ID
2. System validates member:
   - Check if member exists
   - Check if member.isActive = true
3. System finds active membership:
   - serviceType = 'membership'
   - status = 'active'
   - endDate >= currentDate
4. Create CheckIn record:
   - memberId, activeServiceId, checkInTime
5. Return success with service details
```

### Workflow 2: PT Package Check-In (Auto Session Usage)

```
1. Member arrives for PT session
2. Staff creates check-in with serviceType='pt_package'
3. System validates active PT service:
   - serviceType = 'pt_package'
   - status = 'active'
   - remainingSessions > 0
   - endDate >= currentDate
4. Auto-use one session:
   - activeService.useSession() (with optimistic locking)
   - remainingSessions -= 1
   - If remainingSessions = 0 → status = 'depleted'
5. Create CheckIn record with activeServiceId
6. Return success with updated remainingSessions
```

### Workflow 3: Class Package Check-In

```
1. Member attends group class
2. Staff creates check-in with serviceType='class_package'
3. System validates active class package
4. Auto-use one session
5. Track check-in with class details (via notes or future classId)
```

---

## 🔐 Security & Permissions

### CASL Permissions

```javascript
// Admin/Manager
can('create', 'CheckIn');
can('read', 'CheckIn');
can('update', 'CheckIn');
can('delete', 'CheckIn');

// Member (self-service)
can('create', 'CheckIn', { member: { userId: user.id } });
can('read', 'CheckIn', { member: { userId: user.id } });
```

### Feature Gating

- Requires `gym` module enabled in subscription plan
- All endpoints require authentication
- Multi-tenant isolation enforced

---

## 📊 Integration Points

### With Active Services

```javascript
// Check-in automatically links to active service
const checkIn = await CheckIn.create({
  memberId,
  activeServiceId: activeService.id,
  checkInTime: new Date()
});

// ActiveService tracks check-ins
const service = await ActiveService.findByPk(serviceId, {
  include: [{ model: CheckIn, as: 'checkIns' }]
});
```

### With Session Usage

```javascript
// For session-based services, check-in auto-uses session
if (activeService.totalSessions && activeService.remainingSessions > 0) {
  await activeService.useSession(transaction);
  sessionUsed = true;
}
```

### With Member Dashboard

```javascript
// Get member's recent check-ins
GET /api/v1/gym/check-ins?memberId={memberId}&limit=10

// Display on member profile
- Last check-in date
- Total check-ins this month
- Check-in frequency
```

---

## 🎨 Frontend Integration

### Check-In Widget

```javascript
// Member check-in form
async function checkInMember(memberId, serviceType) {
  const response = await fetch('/api/v1/gym/check-ins', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ memberId, serviceType })
  });

  const result = await response.json();

  if (response.ok) {
    alert(`Check-in successful! ${result.data.activeService.remainingSessions || ''} sessions remaining`);
  } else {
    alert(result.message);
  }
}
```

### Dashboard Statistics

```javascript
// Fetch and display stats
async function loadCheckInStats() {
  const response = await fetch('/api/v1/gym/check-ins/stats');
  const { data } = await response.json();

  document.getElementById('today-count').textContent = data.today;
  document.getElementById('week-count').textContent = data.thisWeek;
  document.getElementById('month-count').textContent = data.thisMonth;
  document.getElementById('unique-members').textContent = data.uniqueMembersToday;
}
```

---

## 🧪 Testing Examples

### Manual Testing

```bash
# 1. Check-in member with active membership
curl -X POST http://localhost:3000/api/v1/gym/check-ins \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "memberId": "member-uuid"
  }'

# 2. Check-in for PT session (auto-use session)
curl -X POST http://localhost:3000/api/v1/gym/check-ins \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "memberId": "member-uuid",
    "serviceType": "pt_package",
    "notes": "Leg day workout"
  }'

# 3. Get today's check-ins
curl -X GET "http://localhost:3000/api/v1/gym/check-ins?startDate=$(date +%Y-%m-%d)T00:00:00Z" \
  -H "Authorization: Bearer $TOKEN"

# 4. Get statistics
curl -X GET http://localhost:3000/api/v1/gym/check-ins/stats \
  -H "Authorization: Bearer $TOKEN"
```

---

## ✅ Implementation Checklist

- [x] ✅ Migration: Add `activeServiceId` to CheckIns table
- [x] ✅ Model: Update CheckIn model with associations
- [x] ✅ Controller: Check-in CRUD operations
- [x] ✅ Controller: Auto session usage logic
- [x] ✅ Controller: Statistics endpoint
- [x] ✅ Routes: Complete REST API endpoints
- [x] ✅ Middleware: Authentication & authorization
- [x] ✅ Middleware: Feature gating (gym module)
- [x] ✅ Logging: Audit trail for all operations
- [x] ✅ Error handling: Comprehensive error codes
- [x] ✅ Documentation: API guide and examples

---

## 🚀 Next Steps (Optional Enhancements)

1. **QR Code Check-In**
   - Generate member QR codes
   - Mobile app scanner integration

2. **Facial Recognition**
   - Photo capture on check-in
   - AI-powered member verification

3. **Automated Alerts**
   - SMS notification on check-in
   - Daily check-in summary emails

4. **Advanced Analytics**
   - Peak hour analysis
   - Member attendance trends
   - Class popularity metrics

5. **Geofencing**
   - Location-based check-in validation
   - Prevent remote check-ins

---

## 📄 Summary

The Check-In System is now **fully operational** with:

- ✅ **Automatic service validation** and session usage
- ✅ **Multi-tenant support** with complete isolation
- ✅ **Transaction-safe** operations with optimistic locking
- ✅ **Comprehensive API** with filtering and statistics
- ✅ **Full audit logging** for compliance
- ✅ **Production-ready** with error handling

**Status**: 100% Complete - Ready for Production Use

---

**Document Version**: 1.0  
**Last Updated**: November 26, 2025  
**Implementation By**: GitHub Copilot (Claude Sonnet 4.5)
