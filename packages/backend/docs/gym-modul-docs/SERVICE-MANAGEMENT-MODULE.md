# Service Management Module - Complete Guide

## Overview
The **Service Management** module provides a comprehensive interface for managing all active services across members. This module enables:

- ✅ Interactive list view of all services (remaining sessions, expiry dates)
- ✅ Trainer assignment during purchase or post-purchase
- ✅ Filtering by service type, status, trainer, and expiration
- ✅ Calendar view for monthly service tracking
- ✅ Automated alerts for expiring services and low sessions
- ✅ Statistical dashboard for service analytics

## Base URL
```
/api/v1/service/management
```

---

## Endpoints

### 1. List All Active Services
```http
GET /api/v1/service/management/list
```

**Description**: Get all active services with interactive display showing remaining sessions per member and service expiration dates.

**Authentication**: Required (JWT)

**Permissions**: 
- Module: `serviceManagement`
- CASL: `read` on `ActiveService`

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number for pagination |
| `limit` | number | 20 | Items per page |
| `search` | string | '' | Search by member name, email |
| `serviceType` | string | 'all' | Filter by: `all`, `membership`, `class_package`, `pt_package`, `spa_package`, `custom` |
| `status` | string | 'all' | Filter by: `all`, `active`, `expired`, `depleted`, `cancelled`, `suspended` |
| `trainerId` | uuid | null | Filter by assigned trainer |
| `expiringInDays` | number | null | Alert: Services expiring in X days |
| `lowSessionsThreshold` | number | null | Alert: Services with sessions ≤ threshold |
| `sortBy` | string | 'endDate' | Sort by field |
| `sortOrder` | string | 'ASC' | Sort order: `ASC` or `DESC` |

**Response Example**:
```json
{
  "data": [
    {
      "id": "uuid",
      "memberId": "uuid",
      "servicePlanId": "uuid",
      "serviceType": "pt_package",
      "status": "active",
      "startDate": "2025-11-01",
      "endDate": "2025-12-31",
      "totalSessions": 12,
      "remainingSessions": 8,
      "assignedTrainerId": "uuid",
      "pricePaid": 2400000,
      
      // Enriched interactive info
      "daysUntilExpiry": 35,
      "isExpiringSoon": false,
      "isExpired": false,
      "usagePercentage": "33.33",
      "isLowSessions": false,
      
      // Alerts
      "alerts": {
        "expiryWarning": null,
        "lowSessionsWarning": null,
        "expiredMessage": null
      },
      
      // Relations
      "member": {
        "id": "uuid",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com",
        "phone": "081234567890"
      },
      "servicePlan": {
        "id": "uuid",
        "name": "12x Personal Training",
        "serviceType": "pt_package",
        "durationType": "session_based",
        "price": 2400000
      },
      "assignedTrainer": {
        "id": "uuid",
        "firstName": "Jane",
        "lastName": "Smith",
        "specializations": ["Strength & Conditioning", "Weight Loss"]
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 95,
    "itemsPerPage": 20
  }
}
```

**Usage Examples**:

```bash
# Get all active services
curl -X GET "http://localhost:3000/api/v1/service/management/list" \
  -H "Authorization: Bearer $TOKEN"

# Get services expiring in next 7 days
curl -X GET "http://localhost:3000/api/v1/service/management/list?expiringInDays=7" \
  -H "Authorization: Bearer $TOKEN"

# Get services with low sessions (≤3)
curl -X GET "http://localhost:3000/api/v1/service/management/list?lowSessionsThreshold=3" \
  -H "Authorization: Bearer $TOKEN"

# Filter by service type and trainer
curl -X GET "http://localhost:3000/api/v1/service/management/list?serviceType=pt_package&trainerId=uuid" \
  -H "Authorization: Bearer $TOKEN"

# Search by member name
curl -X GET "http://localhost:3000/api/v1/service/management/list?search=john" \
  -H "Authorization: Bearer $TOKEN"
```

---

### 2. Get Services Calendar
```http
GET /api/v1/service/management/calendar
```

**Description**: Get services in calendar format for a specific month. Useful for frontend calendar displays.

**Authentication**: Required (JWT)

**Permissions**: 
- Module: `serviceManagement`
- CASL: `read` on `ActiveService`

**Query Parameters** (Required):
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `year` | number | ✅ Yes | Target year (e.g., 2025) |
| `month` | number | ✅ Yes | Target month (1-12) |
| `serviceType` | string | No | Filter by service type |
| `memberId` | uuid | No | Filter by specific member |

**Response Example**:
```json
{
  "data": {
    "year": 2025,
    "month": 12,
    "events": [
      {
        "date": "2025-12-01",
        "type": "start",
        "eventType": "service_start",
        "title": "John Doe - 12x Personal Training",
        "serviceId": "uuid",
        "memberId": "uuid",
        "memberName": "John Doe",
        "serviceName": "12x Personal Training",
        "serviceType": "pt_package",
        "status": "active",
        "remainingSessions": 12,
        "trainerName": "Jane Smith"
      },
      {
        "date": "2025-12-31",
        "type": "end",
        "eventType": "service_end",
        "title": "[Berakhir] John Doe - 12x Personal Training",
        "serviceId": "uuid",
        "memberId": "uuid",
        "memberName": "John Doe",
        "serviceName": "12x Personal Training",
        "serviceType": "pt_package",
        "status": "active",
        "remainingSessions": 8,
        "trainerName": "Jane Smith"
      }
    ],
    "summary": {
      "totalServices": 45,
      "activeServices": 42,
      "expiringThisMonth": 12
    }
  }
}
```

**Usage Example**:
```bash
# Get December 2025 calendar
curl -X GET "http://localhost:3000/api/v1/service/management/calendar?year=2025&month=12" \
  -H "Authorization: Bearer $TOKEN"

# Get PT packages calendar for specific member
curl -X GET "http://localhost:3000/api/v1/service/management/calendar?year=2025&month=12&serviceType=pt_package&memberId=uuid" \
  -H "Authorization: Bearer $TOKEN"
```

---

### 3. Get Service Alerts
```http
GET /api/v1/service/management/alerts
```

**Description**: Get automated alerts for services expiring soon and services with low remaining sessions.

**Authentication**: Required (JWT)

**Permissions**: 
- Module: `serviceManagement`
- CASL: `read` on `ActiveService`

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `daysThreshold` | number | 7 | Services expiring within X days |
| `lowSessionsThreshold` | number | 3 | Services with sessions ≤ X |

**Response Example**:
```json
{
  "data": {
    "expiring": [
      {
        "type": "expiring",
        "severity": "high",
        "serviceId": "uuid",
        "memberId": "uuid",
        "memberName": "John Doe",
        "memberPhone": "081234567890",
        "serviceName": "Monthly Membership",
        "serviceType": "membership",
        "endDate": "2025-11-28",
        "daysUntilExpiry": 2,
        "message": "Layanan akan berakhir dalam 2 hari"
      }
    ],
    "lowSessions": [
      {
        "type": "low_sessions",
        "severity": "medium",
        "serviceId": "uuid",
        "memberId": "uuid",
        "memberName": "Jane Smith",
        "memberPhone": "081298765432",
        "serviceName": "12x Personal Training",
        "serviceType": "pt_package",
        "remainingSessions": 2,
        "totalSessions": 12,
        "message": "Hanya tersisa 2 sesi"
      }
    ]
  },
  "summary": {
    "totalAlerts": 15,
    "expiringServices": 8,
    "lowSessionServices": 7,
    "highSeverity": 5
  }
}
```

**Alert Severity**:
- `high`: ≤3 days until expiry OR 1 session remaining
- `medium`: 4-7 days until expiry OR 2-3 sessions remaining

**Usage Example**:
```bash
# Get default alerts (7 days, 3 sessions)
curl -X GET "http://localhost:3000/api/v1/service/management/alerts" \
  -H "Authorization: Bearer $TOKEN"

# Custom thresholds
curl -X GET "http://localhost:3000/api/v1/service/management/alerts?daysThreshold=14&lowSessionsThreshold=5" \
  -H "Authorization: Bearer $TOKEN"
```

---

### 4. Get Service Statistics
```http
GET /api/v1/service/management/stats
```

**Description**: Get statistical overview of services for dashboard display.

**Authentication**: Required (JWT)

**Permissions**: 
- Module: `serviceManagement`
- CASL: `read` on `ActiveService`

**Response Example**:
```json
{
  "data": {
    "byStatus": [
      { "status": "active", "count": "142" },
      { "status": "expired", "count": "38" },
      { "status": "depleted", "count": "25" },
      { "status": "cancelled", "count": "12" }
    ],
    "byServiceType": [
      { "serviceType": "membership", "count": "89" },
      { "serviceType": "pt_package", "count": "67" },
      { "serviceType": "class_package", "count": "45" },
      { "serviceType": "spa_package", "count": "16" }
    ],
    "alerts": {
      "expiring": 8,
      "lowSessions": 12
    }
  }
}
```

**Usage Example**:
```bash
curl -X GET "http://localhost:3000/api/v1/service/management/stats" \
  -H "Authorization: Bearer $TOKEN"
```

---

### 5. Assign Trainer to Service
```http
POST /api/v1/service/management/:serviceId/assign-trainer
```

**Description**: Assign or reassign a trainer to an existing active service.

**Authentication**: Required (JWT)

**Permissions**: 
- Module: `serviceManagement`
- CASL: `update` on `ActiveService`

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `serviceId` | uuid | Active service ID |

**Request Body**:
```json
{
  "trainerId": "uuid"
}
```

**Response Example**:
```json
{
  "message": "Trainer berhasil ditugaskan ke layanan",
  "data": {
    "serviceId": "uuid",
    "trainerId": "uuid",
    "trainerName": "Jane Smith",
    "memberName": "John Doe",
    "serviceName": "12x Personal Training"
  }
}
```

**Usage Example**:
```bash
curl -X POST "http://localhost:3000/api/v1/service/management/uuid/assign-trainer" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "trainerId": "trainer-uuid"
  }'
```

---

## Trainer Assignment in Purchase Flow

Trainers can also be assigned during service purchase:

### Purchase with Trainer Assignment
```http
POST /api/v1/service/active/purchase
```

**Request Body**:
```json
{
  "memberId": "uuid",
  "servicePlanId": "uuid",
  "startDate": "2025-12-01",
  "assignedTrainerId": "trainer-uuid",  // ✅ Assign during purchase
  "paymentMethod": "cash",
  "paidAmount": 2400000
}
```

### Bulk Purchase with Multiple Trainers
```json
{
  "memberId": "uuid",
  "servicePlans": [
    {
      "servicePlanId": "pt-package-uuid",
      "assignedTrainerId": "trainer-1-uuid"  // ✅ PT trainer
    },
    {
      "servicePlanId": "class-package-uuid",
      "assignedTrainerId": "trainer-2-uuid"  // ✅ Class trainer
    }
  ],
  "paymentMethods": [
    { "method": "cash", "amount": 5000000 }
  ]
}
```

---

## Frontend Integration Guide

### 1. Service Management Dashboard

```javascript
// Fetch all services with filters
async function getServicesList(filters = {}) {
  const queryParams = new URLSearchParams({
    page: filters.page || 1,
    limit: filters.limit || 20,
    serviceType: filters.serviceType || 'all',
    status: filters.status || 'all',
    sortBy: 'endDate',
    sortOrder: 'ASC'
  });

  const response = await fetch(
    `/api/v1/service/management/list?${queryParams}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  return await response.json();
}

// Display services with interactive info
function renderServiceCard(service) {
  return `
    <div class="service-card ${service.isExpiringSoon ? 'warning' : ''}">
      <h3>${service.member.firstName} ${service.member.lastName}</h3>
      <p>${service.servicePlan.name}</p>
      
      <!-- Progress bar for session usage -->
      <div class="progress-bar">
        <div class="progress" style="width: ${service.usagePercentage}%"></div>
      </div>
      <span>${service.remainingSessions}/${service.totalSessions} sessions</span>
      
      <!-- Expiry info -->
      <p class="${service.isExpiringSoon ? 'text-warning' : ''}">
        ${service.daysUntilExpiry} days remaining
      </p>
      
      <!-- Alerts -->
      ${service.alerts.expiryWarning ? 
        `<div class="alert alert-warning">${service.alerts.expiryWarning}</div>` : ''}
      ${service.alerts.lowSessionsWarning ? 
        `<div class="alert alert-info">${service.alerts.lowSessionsWarning}</div>` : ''}
      
      <!-- Trainer info -->
      ${service.assignedTrainer ? 
        `<p>Trainer: ${service.assignedTrainer.firstName} ${service.assignedTrainer.lastName}</p>` :
        `<button onclick="assignTrainer('${service.id}')">Assign Trainer</button>`
      }
    </div>
  `;
}
```

### 2. Calendar View

```javascript
// Fetch calendar data
async function getCalendar(year, month) {
  const response = await fetch(
    `/api/v1/service/management/calendar?year=${year}&month=${month}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  return await response.json();
}

// Render calendar events
function renderCalendar(calendarData) {
  // Group events by date
  const eventsByDate = {};
  calendarData.data.events.forEach(event => {
    if (!eventsByDate[event.date]) {
      eventsByDate[event.date] = [];
    }
    eventsByDate[event.date].push(event);
  });

  // Render each day with events
  Object.keys(eventsByDate).forEach(date => {
    const dayCell = document.querySelector(`[data-date="${date}"]`);
    eventsByDate[date].forEach(event => {
      const eventEl = document.createElement('div');
      eventEl.className = `calendar-event ${event.type}`;
      eventEl.innerHTML = `
        <span class="event-title">${event.title}</span>
        ${event.remainingSessions ? 
          `<span class="sessions">${event.remainingSessions} sessions left</span>` : ''}
      `;
      dayCell.appendChild(eventEl);
    });
  });
}
```

### 3. Alerts Dashboard

```javascript
// Fetch alerts
async function getAlerts() {
  const response = await fetch(
    `/api/v1/service/management/alerts?daysThreshold=7&lowSessionsThreshold=3`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  return await response.json();
}

// Display alerts with severity
function renderAlerts(alerts) {
  const alertsContainer = document.getElementById('alerts');
  
  // Expiring services
  alerts.data.expiring.forEach(alert => {
    alertsContainer.innerHTML += `
      <div class="alert alert-${alert.severity}">
        <strong>${alert.memberName}</strong>: ${alert.message}
        <br>
        Service: ${alert.serviceName}
        <br>
        Contact: ${alert.memberPhone}
        <button onclick="contactMember('${alert.memberId}')">
          Hubungi Member
        </button>
      </div>
    `;
  });
  
  // Low sessions
  alerts.data.lowSessions.forEach(alert => {
    alertsContainer.innerHTML += `
      <div class="alert alert-${alert.severity}">
        <strong>${alert.memberName}</strong>: ${alert.message}
        <br>
        Service: ${alert.serviceName}
        <br>
        Sessions: ${alert.remainingSessions}/${alert.totalSessions}
      </div>
    `;
  });
}
```

### 4. Assign Trainer

```javascript
async function assignTrainer(serviceId, trainerId) {
  const response = await fetch(
    `/api/v1/service/management/${serviceId}/assign-trainer`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ trainerId })
    }
  );

  if (response.ok) {
    const result = await response.json();
    alert(`Trainer ${result.data.trainerName} berhasil ditugaskan!`);
    // Refresh service list
    await getServicesList();
  }
}
```

---

## Filter Examples

### 1. Get Expiring Services (Next 7 Days)
```bash
GET /api/v1/service/management/list?expiringInDays=7&status=active
```

### 2. Get Low Sessions Services
```bash
GET /api/v1/service/management/list?lowSessionsThreshold=3&status=active
```

### 3. Get PT Packages by Trainer
```bash
GET /api/v1/service/management/list?serviceType=pt_package&trainerId=uuid
```

### 4. Search Member Services
```bash
GET /api/v1/service/management/list?search=john%20doe
```

---

## Error Codes

| Code | Status | Message |
|------|--------|---------|
| `MEMBER_NOT_FOUND` | 404 | Member tidak ditemukan |
| `TRAINER_NOT_FOUND` | 404 | Trainer tidak ditemukan |
| `ACTIVE_SERVICE_NOT_FOUND` | 404 | Layanan aktif tidak ditemukan |
| `VALIDATION_ERROR` | 400 | Validasi gagal |
| `UNAUTHORIZED` | 401 | Tidak memiliki izin akses |
| `MODULE_NOT_AVAILABLE` | 403 | Modul tidak tersedia |

---

## Best Practices

1. **Use Filters Wisely**
   - Use `expiringInDays` to create proactive renewal campaigns
   - Use `lowSessionsThreshold` to prompt members to book sessions

2. **Calendar Integration**
   - Fetch calendar data for current and next month
   - Show service start/end events prominently
   - Color-code by service type

3. **Alert System**
   - Check alerts daily for proactive member communication
   - High severity alerts (≤3 days, 1 session) need immediate action
   - Send automated notifications to members

4. **Trainer Assignment**
   - Assign trainers during purchase for better workflow
   - Use management endpoint for reassignments
   - Track trainer workload through filtered lists

5. **Statistics Dashboard**
   - Display stats on main dashboard
   - Monitor active/expired ratio
   - Track service type popularity

---

## Logging

All endpoints use the standardized logging system:

```javascript
logger.logInfo('Action description', {
  action: 'ACTION_CODE',
  ip: getClientIp(req),
  userAgent: getUserAgent(req),
  method: req.method,
  path: req.path,
  // ... additional context
  tenantId: req.user.tenantId,
  userId: req.user.id
});
```

Error logging includes stack traces for debugging.

---

## Version
- **Version:** 1.0
- **Last Updated:** November 26, 2025
- **Status:** Production Ready ✅
