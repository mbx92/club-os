# Service Management - Quick Reference Card

## 🚀 Quick Start

### Base URL
```
/api/v1/service/management
```

### Authentication
All endpoints require JWT token:
```bash
Authorization: Bearer <token>
```

---

## 📋 Main Endpoints

### 1. List All Services
```bash
GET /service/management/list
```

**Common Filters**:
```bash
# Active services only
?status=active

# Expiring in 7 days (ALERT)
?expiringInDays=7

# Low sessions ≤3 (ALERT)
?lowSessionsThreshold=3

# PT packages only
?serviceType=pt_package

# By trainer
?trainerId=<uuid>

# Search member
?search=john

# Pagination
?page=1&limit=20
```

**Response Highlights**:
- `remainingSessions` - Sessions left
- `daysUntilExpiry` - Days until service ends
- `usagePercentage` - Usage percentage
- `alerts` - Warning messages

### 2. Calendar View
```bash
GET /service/management/calendar?year=2025&month=12
```

**Filters**:
```bash
# PT packages only
?serviceType=pt_package

# Specific member
?memberId=<uuid>
```

**Returns**:
- Service start/end events
- Member & trainer info
- Monthly summary

### 3. Service Alerts
```bash
GET /service/management/alerts
```

**Custom Thresholds**:
```bash
# 14 days & 5 sessions
?daysThreshold=14&lowSessionsThreshold=5

# High priority only (3 days, 1 session)
?daysThreshold=3&lowSessionsThreshold=1
```

**Returns**:
- Expiring services list
- Low session services list
- Severity levels (high/medium)
- Member contact info

### 4. Statistics
```bash
GET /service/management/stats
```

**Returns**:
- Count by status
- Count by service type
- Alert counts

### 5. Assign Trainer
```bash
POST /service/management/<serviceId>/assign-trainer
Content-Type: application/json

{
  "trainerId": "<uuid>"
}
```

---

## 🎯 Common Use Cases

### Renewal Campaign
```bash
# Get services expiring in next 7 days
GET /service/management/list?expiringInDays=7&status=active

# Contact members for renewal
foreach service:
  - Call: service.member.phoneNumber
  - Email: service.member.email
  - Message: "Your {serviceName} expires in {daysUntilExpiry} days"
```

### Trainer Workload Check
```bash
# Get trainer's active services
GET /service/management/list?trainerId=<uuid>&status=active

# Calculate total sessions
Total = sum(service.remainingSessions)
```

### Low Sessions Alert
```bash
# Get services with ≤3 sessions
GET /service/management/list?lowSessionsThreshold=3&status=active

# Remind members to book
foreach service:
  - Send SMS: "You have {remainingSessions} sessions left"
```

### Dashboard Display
```bash
# Get stats
GET /service/management/stats

# Get critical alerts
GET /service/management/alerts?daysThreshold=3&lowSessionsThreshold=1

# Display:
- Active services: stats.byStatus.active
- Expiring soon: alerts.expiring
- Low sessions: alerts.lowSessions
```

### Calendar Integration
```bash
# Get current month
GET /service/management/calendar?year=2025&month=12

# Render events
foreach event:
  if event.type === 'start':
    - Show: "🎉 {memberName} started {serviceName}"
  if event.type === 'end':
    - Show: "⚠️  {memberName}'s {serviceName} expires today"
```

---

## 📊 Response Fields Guide

### Service List Response
```json
{
  "id": "uuid",
  "serviceType": "pt_package",
  "status": "active",
  "totalSessions": 12,
  "remainingSessions": 8,
  "startDate": "2025-11-01",
  "endDate": "2025-12-31",
  
  // Interactive info
  "daysUntilExpiry": 35,
  "usagePercentage": "33.33",
  "isExpiringSoon": false,
  "isLowSessions": false,
  
  // Alerts
  "alerts": {
    "expiryWarning": "Layanan akan berakhir dalam 7 hari",
    "lowSessionsWarning": "Hanya tersisa 2 sesi",
    "expiredMessage": null
  },
  
  // Relations
  "member": { "firstName": "John", "lastName": "Doe", ... },
  "servicePlan": { "name": "12x PT", ... },
  "assignedTrainer": { "firstName": "Jane", ... }
}
```

### Alert Severity Levels
- **high**: ≤3 days OR 1 session left
- **medium**: 4-7 days OR 2-3 sessions left

---

## 🔧 Integration Examples

### JavaScript/Fetch
```javascript
// Get expiring services
const response = await fetch(
  '/api/v1/service/management/list?expiringInDays=7',
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);
const data = await response.json();

// Display alerts
data.data.forEach(service => {
  if (service.isExpiringSoon) {
    showAlert(`${service.member.firstName}: ${service.alerts.expiryWarning}`);
  }
});
```

### React Component
```jsx
function ServiceAlerts() {
  const [alerts, setAlerts] = useState([]);
  
  useEffect(() => {
    fetch('/api/v1/service/management/alerts')
      .then(res => res.json())
      .then(data => setAlerts(data.data));
  }, []);
  
  return (
    <div>
      {alerts.expiring.map(alert => (
        <div className={`alert-${alert.severity}`}>
          {alert.message}
        </div>
      ))}
    </div>
  );
}
```

### Vue 3 Composition API
```vue
<script setup>
import { ref, onMounted } from 'vue';

const services = ref([]);

onMounted(async () => {
  const res = await fetch('/api/v1/service/management/list');
  const data = await res.json();
  services.value = data.data;
});
</script>

<template>
  <div v-for="service in services" :key="service.id">
    <h3>{{ service.member.firstName }} {{ service.member.lastName }}</h3>
    <p>{{ service.remainingSessions }}/{{ service.totalSessions }} sessions</p>
    <div v-if="service.alerts.expiryWarning" class="warning">
      {{ service.alerts.expiryWarning }}
    </div>
  </div>
</template>
```

---

## 🔍 Filter Combinations

```bash
# Expiring PT packages with low sessions
GET /service/management/list?
  serviceType=pt_package&
  expiringInDays=7&
  lowSessionsThreshold=3&
  status=active

# Specific trainer's expiring services
GET /service/management/list?
  trainerId=<uuid>&
  expiringInDays=14&
  status=active

# Search member with active services
GET /service/management/list?
  search=john&
  status=active&
  sortBy=endDate&
  sortOrder=ASC
```

---

## 📞 Error Codes

| Code | Status | Meaning |
|------|--------|---------|
| `MEMBER_NOT_FOUND` | 404 | Member tidak ditemukan |
| `TRAINER_NOT_FOUND` | 404 | Trainer tidak ditemukan |
| `ACTIVE_SERVICE_NOT_FOUND` | 404 | Layanan tidak ditemukan |
| `VALIDATION_ERROR` | 400 | Input tidak valid |
| `UNAUTHORIZED` | 401 | Token tidak valid |
| `MODULE_NOT_AVAILABLE` | 403 | Modul tidak tersedia |

---

## 💡 Pro Tips

1. **Renewal Campaign**: Run daily at 9 AM
   ```bash
   GET /service/management/alerts?daysThreshold=7
   ```

2. **Dashboard Refresh**: Every 5 minutes
   ```bash
   GET /service/management/stats
   ```

3. **Calendar Load**: Current + next month
   ```bash
   GET /service/management/calendar?year=2025&month=12
   GET /service/management/calendar?year=2026&month=1
   ```

4. **Trainer Assignment**: During purchase
   ```json
   POST /service/active/purchase
   {
     "assignedTrainerId": "uuid"  // ✅ Better workflow
   }
   ```

5. **Pagination**: Start with 20 items
   ```bash
   ?page=1&limit=20
   ```

---

## 📚 Related Docs

- Full API: `docs/gym-modul-docs/SERVICE-MANAGEMENT-MODULE.md`
- Postman: `docs/postman/SERVICE-MANAGEMENT-API.postman_collection.json`
- Summary: `docs/implementation-progress/SERVICE-MANAGEMENT-IMPLEMENTATION.md`

---

**Quick Reference Card v1.0**  
**Date**: November 26, 2025  
**Status**: Production Ready ✅
