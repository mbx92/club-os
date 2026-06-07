# Frontend Integration - Printer Monitoring System

## 📋 Overview

Complete frontend integration guides untuk sistem monitoring printer thermal dengan **real-time updates** via Server-Sent Events (SSE).

## 🎯 Features

- ✅ Real-time connection monitoring (TCP ping setiap 10 detik)
- ✅ Real-time health monitoring (stuck job detection)
- ✅ Print job list dengan pagination & filtering
- ✅ Auto-reconnect on disconnect
- ✅ Visual status indicators (🟢 healthy, 🟡 degraded, 🔴 unhealthy)
- ✅ Toast notifications untuk status changes
- ✅ Statistics dashboard (success rate, avg duration)

---

## 📚 Available Integrations

| Framework | File | Complexity | Features |
|-----------|------|------------|----------|
| **React** | [REACT-INTEGRATION.md](./REACT-INTEGRATION.md) | ⭐⭐⭐ | Hooks, Context, TypeScript types |
| **Vue 3** | [VUE-INTEGRATION.md](./VUE-INTEGRATION.md) | ⭐⭐ | Composition API, Teleport |
| **Vanilla JS** | [VANILLA-JS-INTEGRATION.md](./VANILLA-JS-INTEGRATION.md) | ⭐ | No build process, pure ES6+ |

---

## 🚀 Quick Start

### React

```bash
npm install react react-hot-toast axios
```

```jsx
import { PrinterDashboard } from './pages/PrinterDashboard';

function App() {
  return <PrinterDashboard printers={printers} />;
}
```

### Vue 3

```bash
npm install vue axios vue-toastification
```

```vue
<script setup>
import PrinterDashboard from './pages/PrinterDashboard.vue';
</script>

<template>
  <PrinterDashboard :printers="printers" />
</template>
```

### Vanilla JS

```html
<script src="printer-monitor.js"></script>
<script>
  localStorage.setItem('authToken', 'YOUR_JWT_TOKEN');
</script>
```

---

## 📡 API Endpoints Used

| Endpoint | Type | Purpose |
|----------|------|---------|
| `GET /api/v1/system/printers` | REST | Get all printers |
| `GET /api/v1/system/printers/:id/stream/connection` | **SSE** | Real-time connection status |
| `GET /api/v1/system/printers/:id/stream/health` | **SSE** | Real-time health monitoring |
| `GET /api/v1/system/printers/:id/jobs` | REST | Get print jobs with filtering |

---

## 🎨 Components Included

### 1. PrinterConnectionMonitor
Real-time TCP connection monitoring dengan latency measurement.

**Props:**
- `printerId` (string) - Printer ID to monitor

**Output:**
```
🟢 Online
Latency: 45ms
Last check: 14:30:15
```

### 2. PrinterHealthMonitor
Comprehensive health monitoring dengan stuck job detection.

**Props:**
- `printerId` (string) - Printer ID
- `onHealthChange` (function) - Callback when health changes

**Events:**
- Status badge (🟢 healthy, 🟡 degraded, 🔴 unhealthy)
- Stuck jobs warning
- Statistics grid (success rate, total jobs, avg duration)

### 3. PrinterJobList
Paginated job list dengan filtering.

**Props:**
- `printerId` (string) - Printer ID

**Features:**
- Status filter (all, completed, pending, printing, failed)
- Pagination (20 jobs per page)
- Real-time job status updates

### 4. PrinterDashboard
Complete monitoring dashboard combining all components.

**Props:**
- `printers` (array) - List of available printers

**Features:**
- Printer selector dropdown
- Printer info card
- 3-column monitoring grid
- Alert notifications

---

## 📊 Data Structures

### Connection Status
```javascript
{
  connected: boolean,
  online: boolean,
  latency: number | null,
  error: string | null,
  lastUpdate: Date
}
```

### Health Status
```javascript
{
  healthStatus: 'healthy' | 'degraded' | 'unhealthy' | 'unknown',
  healthMessage: string,
  isConnected: boolean,
  stuckJobsCount: number,
  oldestStuckJobAge: number,
  consecutiveFailures: number,
  lastSuccessfulPrint: Date | null,
  stuckJobs: StuckJob[],
  statistics: {
    total: number,
    completed: number,
    failed: number,
    pending: number,
    cancelled: number,
    successRate: string,
    avgDuration: number | null
  }
}
```

### Print Job
```javascript
{
  id: string,
  jobType: 'receipt' | 'kitchen' | 'label' | 'invoice' | 'report',
  referenceType: string,
  referenceId: string,
  status: 'pending' | 'printing' | 'completed' | 'failed' | 'cancelled',
  attempts: number,
  maxRetries: number,
  printDuration: number | null,
  scheduledAt: Date,
  startedAt: Date | null,
  completedAt: Date | null,
  error: string | null,
  creator: {
    firstName: string,
    lastName: string,
    email: string
  }
}
```

---

## 🔐 Authentication

All API calls require JWT token in Authorization header:

```javascript
headers: {
  'Authorization': `Bearer ${token}`
}
```

**Get token from:**
```javascript
const token = localStorage.getItem('authToken');
```

---

## 🎯 Health Status Logic

| Status | Condition | Color | Icon |
|--------|-----------|-------|------|
| **Healthy** 🟢 | Connected + No stuck jobs | Green | ✓ |
| **Degraded** 🟡 | Connected + Stuck jobs (5-15 min) | Yellow | ⚠ |
| **Unhealthy** 🔴 | Offline OR Stuck jobs > 15 min | Red | ✕ |
| **Unknown** ⚪ | Not yet checked | Gray | ? |

---

## 📱 Responsive Design

All components support responsive layouts:

```
Mobile:     Single column
Tablet:     2 columns  
Desktop:    3 columns (connection | health | jobs)
```

---

## 🔄 Auto-Reconnect

SSE streams automatically reconnect on disconnect:

```javascript
eventSource.onerror = () => {
  eventSource.close();
  // Reconnect after 5 seconds
  setTimeout(connect, 5000);
};
```

---

## 🎨 UI Libraries

### Recommended:

**CSS Framework:**
- Tailwind CSS (used in examples)
- Or custom CSS

**Toast Notifications:**
- React: `react-hot-toast`
- Vue: `vue-toastification`
- Vanilla: Built-in (included in examples)

**Icons (Optional):**
- Heroicons
- Font Awesome
- Material Icons

---

## 🧪 Testing

### 1. Test SSE Connection (Browser Console)

```javascript
const eventSource = new EventSource(
  '/api/v1/system/printers/PRINTER_ID/stream/health'
);

eventSource.onmessage = (e) => {
  console.log(JSON.parse(e.data));
};
```

### 2. Test API Call

```javascript
fetch('/api/v1/system/printers/PRINTER_ID/jobs?limit=5', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(r => r.json())
.then(data => console.log(data));
```

---

## 🐛 Troubleshooting

### SSE Not Working

**Problem:** EventSource not receiving data

**Solutions:**
1. Check CORS settings
2. Verify JWT token validity
3. Check browser console for errors
4. Test with cURL:
   ```bash
   curl -N -H "Authorization: Bearer TOKEN" \
     http://localhost:3000/api/v1/system/printers/ID/stream/health
   ```

### Authorization Issues

**Problem:** 401 Unauthorized

**Solutions:**
1. Verify token in localStorage
2. Check token expiration
3. Ensure `Authorization` header is sent
4. Check CASL permissions

### No Data Showing

**Problem:** Components render but no data

**Solutions:**
1. Check printer exists in database
2. Verify printer is active
3. Check backend logs for errors
4. Verify `thermalPrinting` feature is enabled

---

## 📦 Dependencies Summary

### React
```json
{
  "react": "^18.x",
  "react-hot-toast": "^2.x",
  "axios": "^1.x"
}
```

### Vue 3
```json
{
  "vue": "^3.x",
  "axios": "^1.x",
  "vue-toastification": "^2.x"
}
```

### Vanilla JS
- **No dependencies!** ✅
- Only Tailwind CSS via CDN (optional)

---

## 🚀 Production Considerations

### 1. Error Handling
```javascript
try {
  const response = await printerApi.getJobs(printerId);
  // Handle success
} catch (error) {
  // Show user-friendly error
  toast.error('Failed to load jobs. Please try again.');
  console.error('API Error:', error);
}
```

### 2. Loading States
```javascript
const [loading, setLoading] = useState(true);
const [data, setData] = useState(null);
const [error, setError] = useState(null);
```

### 3. Cleanup
```javascript
useEffect(() => {
  const eventSource = connect();
  
  return () => {
    eventSource.close(); // Cleanup on unmount
  };
}, [printerId]);
```

### 4. Rate Limiting
- SSE streams already rate-limited by backend (10s interval)
- API calls should be debounced for user-triggered actions

### 5. Security
- Always validate JWT token before API calls
- Never expose token in logs or error messages
- Use HTTPS in production

---

## 📚 Related Documentation

- [Backend API Documentation](../../PRINTER-HEALTH-MONITORING.md)
- [Backend Implementation Summary](../../PRINTER-HEALTH-IMPLEMENTATION-SUMMARY.md)
- [Printer Connection Stream](../../PRINTER-CONNECTION-STREAM.md)

---

## 💡 Tips & Best Practices

1. **Always close SSE connections** when component unmounts
2. **Use loading states** to improve UX
3. **Show toast notifications** for important status changes
4. **Implement error boundaries** (React) or error handling (Vue)
5. **Cache printer list** to reduce API calls
6. **Debounce filter changes** to prevent excessive API calls
7. **Use TypeScript** for better type safety (optional)

---

## 🎯 Next Steps

After implementing frontend:

1. **Test with real printer** - Verify TCP connection works
2. **Create print jobs** - Test job tracking system
3. **Monitor health** - Verify stuck job detection
4. **Test auto-reconnect** - Disconnect/reconnect network
5. **Load testing** - Multiple concurrent streams

---

## 🤝 Support

If you encounter issues:

1. Check browser console for errors
2. Check network tab for SSE streams
3. Verify backend is running
4. Check printer is accessible on network
5. Review backend logs

---

**Happy Monitoring! 🎉**
