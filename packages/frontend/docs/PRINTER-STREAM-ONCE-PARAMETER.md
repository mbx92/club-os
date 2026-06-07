# Printer Stream `once=true` Parameter Fix

## Problem

SSE (Server-Sent Events) endpoints for printer monitoring create **persistent connections** that never close. When these endpoints are called during form operations (edit/save), the browser waits indefinitely for the response to complete, causing:

- ✗ Loading spinners that never stop
- ✗ Forms that appear to hang
- ✗ Poor user experience

## Root Cause

```javascript
// ❌ PROBLEM: Persistent SSE connection (never closes)
fetch(`/api/v1/system/printers/${id}/stream/connection`)
// Browser waits forever because SSE keeps the connection open

// ❌ PROBLEM: Using these in forms causes hanging
const stream = usePrinterStream(printerId)
stream.connect() // Opens persistent connection during form load
```

## Solution

Add `?once=true` query parameter to get a **single JSON response** instead of a persistent stream:

```javascript
// ✅ SOLUTION: One-time check (completes in ~3 seconds)
fetch(`/api/v1/system/printers/${id}/stream/connection?once=true`)
// Returns JSON immediately and closes connection ✓

// ✅ SOLUTION: Use checkOnce for forms
const stream = usePrinterStream(printerId)
const status = await stream.checkOnce() // Single check, no hanging
```

## Endpoint Behavior Modes

| Endpoint | Default Behavior | With `?once=true` |
|----------|------------------|-------------------|
| `GET /:id/stream/connection` | SSE stream (real-time monitoring) | Single ping → JSON response → close ✓ |
| `GET /:id/stream/health` | SSE stream (continuous health monitoring) | Single check → JSON response → close ✓ |

### Default Mode (Real-time Monitoring)
```javascript
// Use for: Dashboard monitoring, live status updates
GET /api/v1/system/printers/:id/stream/connection
// → SSE stream with continuous status updates
// → Connection stays open indefinitely
// → Use for real-time monitoring dashboards
```

### Once Mode (One-time Check)
```javascript
// Use for: Forms, validations, quick status checks
GET /api/v1/system/printers/:id/stream/connection?once=true
// → Single JSON response with current status
// → Connection closes immediately after response
// → Use for form operations and quick checks
```

## Updated Frontend Code

### 1. usePrinterStream.js

Added `checkOnce()` method for one-time connection checks:

```javascript
import { usePrinterStream } from '@/composables/gym/usePrinterStream'

// ❌ OLD: Don't use connect() in forms (causes hanging)
const stream = usePrinterStream(printerId)
stream.connect() // Opens persistent SSE connection

// ✅ NEW: Use checkOnce() in forms
const stream = usePrinterStream(printerId)
try {
  const status = await stream.checkOnce()
  console.log('Printer status:', status)
  // { status: 'online', latency: 45, timestamp: '...' }
} catch (error) {
  console.error('Connection failed:', error)
}
```

### 2. usePrinterHealth.js

Added `checkOnce()` method for one-time health checks:

```javascript
import { usePrinterHealth } from '@/composables/gym/usePrinterHealth'

// ✅ Use checkOnce() for form validations
const healthCheck = usePrinterHealth(printerId)
try {
  const health = await healthCheck.checkOnce()
  console.log('Printer health:', health)
  // {
  //   healthStatus: 'healthy',
  //   isConnected: true,
  //   stuckJobsCount: 0,
  //   statistics: { ... }
  // }
} catch (error) {
  console.error('Health check failed:', error)
}
```

### 3. printer-settings.js

Added standalone helper functions:

```javascript
import { usePrinterSettings } from '@/composables/gym/printer-settings'

const { checkConnectionOnce, checkHealthOnce } = usePrinterSettings()

// ✅ Quick connection check (no streaming)
const connectionStatus = await checkConnectionOnce(printerId)

// ✅ Quick health check (no streaming)
const healthStatus = await checkHealthOnce(printerId)
```

## When to Use Each Mode

### Use Persistent Stream (Default) ✓
- Real-time monitoring dashboards
- Live status indicators on printer list/cards
- Continuous health monitoring
- Long-running status updates

```javascript
// Example: Real-time dashboard
const stream = usePrinterStream(printerId)
stream.connect() // Keep open for continuous updates

watch(stream.status, (newStatus) => {
  console.log('Status changed:', newStatus)
})
```

### Use Once Mode (?once=true) ✓
- Form validations (before save)
- Form load (initial status check)
- Test connection button clicks
- Quick status verification
- Any operation where you need **one response** then done

```javascript
// Example: Form validation before save
async function validatePrinterBeforeSave(printerId) {
  const stream = usePrinterStream(printerId)
  const status = await stream.checkOnce() // ✅ Returns immediately
  
  if (!status.online) {
    throw new Error('Printer is offline')
  }
  
  return true
}
```

## Migration Guide

### Before (Causes Hanging)

```javascript
// ❌ In form component
const testConnection = async (printerId) => {
  const stream = usePrinterStream(printerId)
  stream.connect() // Hangs forever
  // Loading spinner never stops...
}
```

### After (Fixed)

```javascript
// ✅ In form component
const testConnection = async (printerId) => {
  loading.value = true
  try {
    const stream = usePrinterStream(printerId)
    const result = await stream.checkOnce() // Completes immediately
    
    if (result.online) {
      showSuccess(`Printer online (${result.latency}ms)`)
    } else {
      showError('Printer offline')
    }
  } catch (error) {
    showError(error.message)
  } finally {
    loading.value = false // Loading stops properly ✓
  }
}
```

## Example: Printer Form Modal

```vue
<script setup>
import { ref } from 'vue'
import { usePrinterStream } from '@/composables/gym/usePrinterStream'
import { usePrinterHealth } from '@/composables/gym/usePrinterHealth'

const props = defineProps(['printer'])
const loading = ref(false)
const connectionStatus = ref(null)

// ✅ Check connection when form opens
const checkPrinterStatus = async () => {
  if (!props.printer?.id) return
  
  loading.value = true
  try {
    const stream = usePrinterStream(props.printer.id)
    connectionStatus.value = await stream.checkOnce()
    console.log('Printer status:', connectionStatus.value)
  } catch (error) {
    console.error('Failed to check printer:', error)
  } finally {
    loading.value = false // ✓ Loading completes
  }
}

// ✅ Validate before saving
const savePrinter = async () => {
  loading.value = true
  try {
    // Quick connection check before save
    const stream = usePrinterStream(props.printer.id)
    const status = await stream.checkOnce()
    
    if (!status.online) {
      showWarning('Warning: Printer appears offline')
    }
    
    // Proceed with save
    await api.put(`/system/printers/${props.printer.id}`, formData)
    showSuccess('Printer saved successfully')
  } catch (error) {
    showError(error.message)
  } finally {
    loading.value = false // ✓ Loading completes
  }
}

onMounted(() => {
  checkPrinterStatus()
})
</script>
```

## API Response Examples

### Stream Connection with `?once=true`

**Request:**
```http
GET /api/v1/system/printers/abc123/stream/connection?once=true
Authorization: Bearer <token>
Accept: application/json
```

**Response (Success):**
```json
{
  "type": "status",
  "printerId": "abc123",
  "printerName": "Kitchen Printer",
  "status": "online",
  "latency": 45,
  "timestamp": "2026-02-22T10:30:00Z"
}
```

**Response (Offline):**
```json
{
  "type": "status",
  "printerId": "abc123",
  "printerName": "Kitchen Printer",
  "status": "offline",
  "error": "Connection timeout",
  "timestamp": "2026-02-22T10:30:00Z"
}
```

### Stream Health with `?once=true`

**Request:**
```http
GET /api/v1/system/printers/abc123/stream/health?once=true
Authorization: Bearer <token>
Accept: application/json
```

**Response:**
```json
{
  "type": "health",
  "printerId": "abc123",
  "printerName": "Kitchen Printer",
  "healthStatus": "healthy",
  "healthMessage": "Operating normally",
  "isConnected": true,
  "stuckJobsCount": 0,
  "oldestStuckJobAge": 0,
  "consecutiveFailures": 0,
  "lastSuccessfulPrint": "2026-02-22T09:45:00Z",
  "stuckJobs": [],
  "statistics": {
    "total": 150,
    "completed": 145,
    "failed": 5,
    "successRate": 96.67,
    "avgDuration": 234
  },
  "timestamp": "2026-02-22T10:30:00Z"
}
```

## Testing Checklist

- [ ] Form opens without hanging spinner
- [ ] "Test Connection" button completes within 3-5 seconds
- [ ] Form save operations complete normally
- [ ] Loading indicators stop properly after checks
- [ ] Real-time monitoring still works on dashboard
- [ ] Error messages display correctly for offline printers
- [ ] Browser network tab shows request completes (not pending forever)

## Backend Requirements

The backend must support the `?once=true` query parameter on both endpoints:

```javascript
// Backend implementation (example)
router.get('/system/printers/:id/stream/connection', async (req, res) => {
  const { once } = req.query
  
  if (once === 'true') {
    // Single ping mode
    const status = await checkPrinterConnection(req.params.id)
    res.json({
      type: 'status',
      printerId: req.params.id,
      status: status.online ? 'online' : 'offline',
      latency: status.latency,
      timestamp: new Date().toISOString()
    })
    return
  }
  
  // SSE stream mode
  res.setHeader('Content-Type', 'text/event-stream')
  // ... continue with SSE implementation
})
```

## Summary

✅ **Use `?once=true`** for:
- Form operations (open, save, validate)
- Test connection buttons
- Any one-time status checks

✅ **Use default (no parameter)** for:
- Real-time monitoring dashboards
- Live status indicators
- Continuous health monitoring

The frontend now provides both options through:
- `checkOnce()` methods in composables
- `checkConnectionOnce()` and `checkHealthOnce()` helper functions
- Original `connect()` methods for streaming

This ensures loading spinners complete properly while maintaining real-time monitoring capabilities where needed.
