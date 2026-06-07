# Printer Health Monitoring System

## 📡 Overview

Sistem monitoring kesehatan printer real-time dengan **stuck job detection** menggunakan Server-Sent Events (SSE) dan database tracking via `PrintJobs` table.

## 🎯 Features

- ✅ Real-time health monitoring setiap 10 detik
- ✅ Stuck job detection (jobs pending/printing > 5 menit)
- ✅ Connection status monitoring
- ✅ Print job statistics (success rate, avg duration)
- ✅ Multi-level health status (healthy, degraded, unhealthy)
- ✅ Consecutive failure tracking
- ✅ Job queue management

## 📊 Health Status Levels

### 🟢 **Healthy**
- Printer connected
- No stuck jobs
- All jobs completing normally

### 🟡 **Degraded**
- Printer connected
- Has stuck jobs (pending/printing for 5-15 minutes)
- May have jobs in queue

### 🔴 **Unhealthy**
- Printer disconnected, OR
- Stuck jobs > 15 minutes, OR
- Consecutive failures ≥ 5

## 📋 API Endpoints

### 1. Stream Health Status

```
GET /api/v1/system/printers/:id/stream/health
```

**Response Format:**

```json
data: {"type":"connected","message":"Health monitoring started"}

data: {
  "type": "health",
  "printerId": "uuid",
  "printerName": "Receipt Printer 1",
  "timestamp": "2024-12-07T12:00:00.000Z",
  "healthStatus": "healthy",
  "healthMessage": "Printer berfungsi normal",
  "isConnected": true,
  "stuckJobsCount": 0,
  "oldestStuckJobAge": 0,
  "consecutiveFailures": 0,
  "lastSuccessfulPrint": "2024-12-07T11:55:00.000Z",
  "stuckJobs": [],
  "statistics": {
    "total": 150,
    "completed": 145,
    "failed": 3,
    "pending": 2,
    "cancelled": 0,
    "successRate": "96.67",
    "avgDuration": 1250
  }
}
```

**Status when degraded:**

```json
data: {
  "type": "health",
  "healthStatus": "degraded",
  "healthMessage": "2 job tertunda (tertua: 7 menit)",
  "isConnected": true,
  "stuckJobsCount": 2,
  "oldestStuckJobAge": 7,
  "stuckJobs": [
    {
      "id": "job-uuid-1",
      "jobType": "receipt",
      "status": "printing",
      "attempts": 1,
      "scheduledAt": "2024-12-07T11:53:00.000Z",
      "startedAt": "2024-12-07T11:53:05.000Z",
      "ageMinutes": 7
    }
  ]
}
```

### 2. Get Printer Jobs

```
GET /api/v1/system/printers/:id/jobs?status=failed&limit=20&includeStuck=true
```

**Query Parameters:**
- `status` - Filter by status (pending, printing, completed, failed, cancelled)
- `limit` - Number of jobs (default: 50)
- `offset` - Pagination offset (default: 0)
- `includeStuck` - Include stuck jobs analysis (default: false)

**Response:**

```json
{
  "success": true,
  "data": {
    "printer": {
      "id": "printer-uuid",
      "name": "Receipt Printer 1",
      "type": "receipt"
    },
    "jobs": [
      {
        "id": "job-uuid",
        "jobType": "receipt",
        "referenceType": "Transaction",
        "referenceId": "trans-uuid",
        "status": "completed",
        "attempts": 1,
        "printDuration": 1250,
        "scheduledAt": "2024-12-07T11:00:00.000Z",
        "startedAt": "2024-12-07T11:00:01.000Z",
        "completedAt": "2024-12-07T11:00:02.250Z",
        "creator": {
          "id": "user-uuid",
          "firstName": "John",
          "lastName": "Doe",
          "email": "john@example.com"
        }
      }
    ],
    "total": 150,
    "limit": 20,
    "offset": 0,
    "stuckJobs": [
      {
        "id": "stuck-job-uuid",
        "jobType": "receipt",
        "status": "printing",
        "attempts": 2,
        "scheduledAt": "2024-12-07T11:45:00.000Z",
        "ageMinutes": 15
      }
    ]
  }
}
```

## 🧪 Testing

### 1. Test Health Stream (cURL)

```bash
curl -N -H "Authorization: Bearer YOUR_JWT" \
  http://localhost:3000/api/v1/system/printers/PRINTER_ID/stream/health
```

### 2. Test with Node.js Script

```bash
node test-health-stream.js <printerId> <jwtToken>
```

### 3. Frontend React Hook

```javascript
import { useEffect, useState } from 'react';

function usePrinterHealth(printerId) {
  const [health, setHealth] = useState({
    status: 'unknown',
    message: '',
    isConnected: false,
    stuckJobs: [],
    statistics: null
  });

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const eventSource = new EventSource(
      `/api/v1/system/printers/${printerId}/stream/health`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'health') {
        setHealth({
          status: data.healthStatus,
          message: data.healthMessage,
          isConnected: data.isConnected,
          stuckJobs: data.stuckJobs,
          statistics: data.statistics,
          consecutiveFailures: data.consecutiveFailures,
          lastSuccessfulPrint: data.lastSuccessfulPrint
        });
      }
    };

    return () => eventSource.close();
  }, [printerId]);

  return health;
}

// Usage
function PrinterHealthMonitor({ printerId }) {
  const health = usePrinterHealth(printerId);

  const getStatusColor = () => {
    switch (health.status) {
      case 'healthy': return 'green';
      case 'degraded': return 'orange';
      case 'unhealthy': return 'red';
      default: return 'gray';
    }
  };

  return (
    <div>
      <h3>Printer Health</h3>
      <div style={{ color: getStatusColor() }}>
        <p>Status: {health.status.toUpperCase()}</p>
        <p>{health.message}</p>
      </div>
      
      {health.stuckJobs.length > 0 && (
        <div>
          <h4>Stuck Jobs ({health.stuckJobs.length})</h4>
          <ul>
            {health.stuckJobs.map(job => (
              <li key={job.id}>
                {job.jobType} - {job.status} ({job.ageMinutes} min ago)
              </li>
            ))}
          </ul>
        </div>
      )}

      {health.statistics && (
        <div>
          <h4>Statistics</h4>
          <p>Success Rate: {health.statistics.successRate}%</p>
          <p>Total Jobs: {health.statistics.total}</p>
          <p>Completed: {health.statistics.completed}</p>
          <p>Failed: {health.statistics.failed}</p>
          <p>Avg Duration: {health.statistics.avgDuration}ms</p>
        </div>
      )}
    </div>
  );
}
```

## 📊 Database Schema - PrintJobs

```sql
CREATE TABLE "PrintJobs" (
  id UUID PRIMARY KEY,
  tenantId UUID NOT NULL,
  printerId VARCHAR NOT NULL,
  jobType ENUM('receipt', 'kitchen', 'label', 'invoice', 'report'),
  referenceType VARCHAR,
  referenceId UUID,
  status ENUM('pending', 'printing', 'completed', 'failed', 'cancelled'),
  priority INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 0,
  maxRetries INTEGER DEFAULT 3,
  printData TEXT NOT NULL,
  metadata JSONB,
  error TEXT,
  errorStack TEXT,
  scheduledAt TIMESTAMP,
  startedAt TIMESTAMP,
  completedAt TIMESTAMP,
  cancelledAt TIMESTAMP,
  printDuration INTEGER,
  createdBy UUID,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP,
  deletedAt TIMESTAMP
);

-- Indexes
CREATE INDEX print_jobs_tenant_idx ON "PrintJobs" (tenantId);
CREATE INDEX print_jobs_printer_idx ON "PrintJobs" (printerId);
CREATE INDEX print_jobs_status_idx ON "PrintJobs" (status);
CREATE INDEX print_jobs_queue_idx ON "PrintJobs" (tenantId, printerId, status, priority);
CREATE INDEX print_jobs_stuck_idx ON "PrintJobs" (tenantId, printerId, status, startedAt)
  WHERE status IN ('pending', 'printing');
```

## 🔄 Model Methods

### Instance Methods

```javascript
// Check if job is stuck
job.isStuck(); // returns boolean

// Check if can retry
job.canRetry(); // returns boolean

// Mark as started
await job.markStarted();

// Mark as completed
await job.markCompleted();

// Mark as failed
await job.markFailed(error);

// Mark as cancelled
await job.markCancelled();
```

### Class Methods

```javascript
// Get pending jobs
const pending = await PrintJob.getPendingJobs(tenantId, printerId, 10);

// Get stuck jobs
const stuck = await PrintJob.getStuckJobs(tenantId, printerId);

// Get statistics
const stats = await PrintJob.getStatistics(tenantId, printerId);

// Clean old jobs (> 30 days)
await PrintJob.cleanOldJobs(30);
```

## ⚙️ Configuration

### Health Check Thresholds

```javascript
// In printerSettingsController.js
const STUCK_JOB_THRESHOLD = 5;      // minutes
const UNHEALTHY_THRESHOLD = 15;     // minutes
const MAX_CONSECUTIVE_FAILURES = 5;
const HEALTH_CHECK_INTERVAL = 10000; // 10 seconds
```

### Job Retry Configuration

```javascript
// In PrintJob model
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_PRIORITY = 0;
```

## 🚀 Usage Workflow

### 1. Create Print Job

```javascript
const { PrintJob } = require('./models');

const job = await PrintJob.create({
  tenantId: 'tenant-uuid',
  printerId: 'printer-uuid',
  jobType: 'receipt',
  referenceType: 'Transaction',
  referenceId: 'trans-uuid',
  printData: Buffer.from(escposCommands).toString('base64'),
  metadata: {
    customerName: 'John Doe',
    totalAmount: 150000
  },
  createdBy: 'user-uuid'
});
```

### 2. Process Job

```javascript
// Worker/Queue processor
const pendingJobs = await PrintJob.getPendingJobs(tenantId, printerId, 5);

for (const job of pendingJobs) {
  try {
    await job.markStarted();
    
    // Send to printer
    const printData = Buffer.from(job.printData, 'base64');
    await sendToPrinter(printer.ipAddress, printer.port, printData);
    
    await job.markCompleted();
  } catch (error) {
    await job.markFailed(error);
    
    // Retry if possible
    if (job.canRetry()) {
      // Schedule retry
    }
  }
}
```

### 3. Monitor Health

```javascript
// Check printer health
const stuckJobs = await PrintJob.getStuckJobs(tenantId, printerId);

if (stuckJobs.length > 0) {
  console.warn(`Printer ${printerId} has ${stuckJobs.length} stuck jobs`);
  
  // Handle stuck jobs
  for (const job of stuckJobs) {
    if (job.attempts >= job.maxRetries) {
      await job.markFailed(new Error('Max retries exceeded'));
    } else {
      // Reset and retry
      job.status = 'pending';
      await job.save();
    }
  }
}
```

## 📝 Logging

All health monitoring activities are logged:

```json
{
  "action": "STREAM_HEALTH_START",
  "printerId": "uuid",
  "printerName": "Receipt Printer 1",
  "tenantId": "tenant-uuid",
  "userId": "user-uuid"
}
```

## 🐛 Troubleshooting

### Always showing degraded status
- Check if old jobs are stuck in database
- Run cleanup: `await PrintJob.cleanOldJobs(30)`
- Verify job processing is running

### Stuck jobs not clearing
- Check printer connection
- Verify job processor is running
- Check job error messages in database

### High consecutive failures
- Verify printer is online
- Check network connectivity
- Review printer error logs

## 🔮 Future Enhancements

- [ ] Auto-retry stuck jobs with exponential backoff
- [ ] Job priority queue processing
- [ ] Notification alerts for unhealthy printers
- [ ] Dashboard with health trends
- [ ] Job completion rate charts
- [ ] Printer performance analytics

## 📚 Related Documentation

- [Printer Connection Stream](./PRINTER-CONNECTION-STREAM.md)
- [Printer Settings Core Migration](./PRINTER-SETTINGS-CORE-MIGRATION.md)
- [Thermal Printing Plan](./plan/PHASE-03-THERMAL-PRINTING.md)
