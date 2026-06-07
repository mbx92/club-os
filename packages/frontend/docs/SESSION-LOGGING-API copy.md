# Psychology Session Logging API

Dokumentasi untuk sistem logging aktivitas test session psikologi.

## Overview

Session Logging digunakan untuk mencatat semua aktivitas user selama mengerjakan test psikologi. Logs berguna untuk:
- Monitoring perilaku test-taker (focus/blur, tab switching)
- Debugging masalah teknis
- Audit trail
- Analisis waktu pengerjaan per soal

## Database Schema

### Tabel: `TestSessionLogs`

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `tenantId` | UUID | FK ke Tenants |
| `sessionId` | UUID | FK ke PsychologySessions |
| `level` | ENUM | `debug`, `info`, `warn`, `error` |
| `eventType` | STRING(100) | Tipe event (lihat daftar di bawah) |
| `message` | TEXT | Pesan opsional |
| `data` | JSONB | Data tambahan (questionId, answer, timing, dll) |
| `clientTimestamp` | DATE | Timestamp dari device client |
| `ipAddress` | STRING(45) | IP address client |
| `userAgent` | TEXT | User agent browser |
| `createdAt` | DATE | Server timestamp |

---

## API Endpoints

### 1. Create Log (Public)

Endpoint untuk test-taker mengirim log selama mengerjakan test.

```
POST /api/v1/psychology/public/access/:token/session/:sessionId/log
```

**Headers:**
```
Content-Type: application/json
```

**Request Body - Single Log:**
```json
{
  "level": "info",
  "eventType": "question_answered",
  "message": "User answered question 5",
  "data": {
    "questionId": 5,
    "answer": "A",
    "timeSpent": 3500
  },
  "clientTimestamp": "2025-12-16T10:30:00.000Z"
}
```

**Request Body - Batch Logs:**
```json
{
  "logs": [
    {
      "level": "info",
      "eventType": "question_viewed",
      "data": { "questionId": 1 },
      "clientTimestamp": "2025-12-16T10:30:00.000Z"
    },
    {
      "level": "info",
      "eventType": "question_answered",
      "data": { "questionId": 1, "answer": "B" },
      "clientTimestamp": "2025-12-16T10:30:05.000Z"
    }
  ]
}
```

**⚠️ IMPORTANT LIMITS (Updated):**
- **Maximum batch size:** 100 logs per request
- **Maximum data size:** 50KB per log data field
- Logs exceeding size limit will be skipped automatically
- Frontend should implement chunking if you have more than 100 logs buffered

**Error Response (Batch Too Large):**
```json
{
  "success": false,
  "message": "Batch size too large. Maximum 100 logs per request",
  "data": {
    "maxBatchSize": 100,
    "received": 250
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Log created",
  "data": {
    "id": "uuid",
    "createdAt": "2025-12-16T10:30:00.000Z"
  }
}
```

**Response (Batch):**
```json
{
  "success": true,
  "message": "5 logs created",
  "data": {
    "count": 5,
    "skipped": 0
  }
}
```

**Note:** `skipped` indicates how many logs were rejected due to size constraints.

---

### 2. Get Session Logs (Admin)

Mengambil semua logs dengan filter.

```
GET /api/v1/psychology/session-logs
```

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Halaman (default: 1) |
| `limit` | number | Jumlah per halaman (default: 50) |
| `sessionId` | UUID | Filter by session |
| `orderId` | UUID | Filter by order (semua session dalam order) |
| `level` | string | Filter by level, comma-separated: `warn,error` |
| `eventType` | string | Filter by event type, comma-separated |
| `startDate` | ISO date | Filter dari tanggal |
| `endDate` | ISO date | Filter sampai tanggal |
| `sortBy` | string | Sort column: `createdAt`, `level`, `eventType` |
| `sortOrder` | string | `ASC` atau `DESC` |

**Contoh Request:**
```
GET /api/v1/psychology/session-logs?level=warn,error&limit=20&sortOrder=DESC
```

**Response:**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "uuid",
        "sessionId": "uuid",
        "level": "warn",
        "eventType": "page_blur",
        "message": "User left the page",
        "data": { "duration": 5000 },
        "clientTimestamp": "2025-12-16T10:30:00.000Z",
        "ipAddress": "192.168.1.1",
        "userAgent": "Mozilla/5.0...",
        "createdAt": "2025-12-16T10:30:00.000Z",
        "session": {
          "id": "uuid",
          "status": "in_progress",
          "sessionNumber": 1,
          "testType": {
            "id": "uuid",
            "code": "PAPI",
            "name": "PAPI Kostick"
          },
          "orderNumber": "PSY-20251216-001",
          "accessToken": "XXXX-XXXX-XXXX",
          "patientName": "John Doe",
          "patientEmail": "john@example.com"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 150,
      "totalPages": 3
    }
  }
}
```

---

### 3. Get Logs for Specific Session (Admin)

Mengambil semua logs untuk session tertentu.

```
GET /api/v1/psychology/sessions/:sessionId/logs
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `level` | string | Filter by level |
| `eventType` | string | Filter by event type |
| `limit` | number | Max logs (default: 100) |

**Response:**
```json
{
  "success": true,
  "data": {
    "session": {
      "id": "uuid",
      "status": "completed",
      "sessionNumber": 1,
      "testType": { "id": "uuid", "code": "PAPI", "name": "PAPI Kostick" },
      "orderNumber": "PSY-20251216-001",
      "accessToken": "XXXX-XXXX-XXXX",
      "patientName": "John Doe",
      "patientEmail": "john@example.com"
    },
    "logs": [
      {
        "id": "uuid",
        "level": "info",
        "eventType": "test_started",
        "message": null,
        "data": { "testCode": "PAPI" },
        "clientTimestamp": "2025-12-16T10:00:00.000Z",
        "ipAddress": "192.168.1.1",
        "userAgent": "Mozilla/5.0...",
        "createdAt": "2025-12-16T10:00:00.000Z"
      }
    ],
    "summary": {
      "total": 95,
      "byLevel": {
        "info": 90,
        "warn": 5
      },
      "byEventType": {
        "question_answered": 90,
        "page_blur": 3,
        "page_focus": 2
      }
    }
  }
}
```

---

### 4. Stream Session Logs (Real-time SSE)

Stream logs dalam real-time menggunakan Server-Sent Events (SSE).

```
GET /api/v1/psychology/sessions/:sessionId/logs/stream?token=<JWT_TOKEN>
```

> **Note:** Karena EventSource tidak support custom headers, auth dilakukan via query parameter `token`.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `token` | string | **Required.** JWT token untuk authentication |
| `level` | string | Filter by level, comma-separated: `warn,error` |

**Example URL:**
```
http://localhost:8000/api/v1/psychology/sessions/uuid-here/logs/stream?token=eyJhbGciOiJIUzI1...&level=warn,error
```

**Response (SSE Stream):**

```
# Initial connection message
data: {"type":"connected","session":{"id":"uuid","status":"in_progress","testType":{"code":"PAPI"},"patientName":"John Doe","accessToken":"XXXX-XXXX-XXXX"},"timestamp":"2025-12-16T10:00:00.000Z"}

# Log events (as they occur)
data: {"type":"log","data":{"id":"uuid","level":"info","eventType":"question_answered","message":null,"data":{"questionId":5,"answer":"A"},"createdAt":"2025-12-16T10:00:05.000Z"},"timestamp":"2025-12-16T10:00:05.000Z"}

# Heartbeat (every 30 seconds)
event: heartbeat
data: {"timestamp":"2025-12-16T10:00:30.000Z"}
```

---

### 5. Get Active Stream Connections

Melihat jumlah koneksi stream yang aktif.

```
GET /api/v1/psychology/session-logs/streams
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalConnections": 5,
    "totalSessions": 3,
    "streams": [
      {
        "sessionId": "uuid",
        "connectionId": "uuid-timestamp-random",
        "connectedAt": "2025-12-16T10:00:00.000Z",
        "levelFilter": ["warn", "error"]
      }
    ]
  }
}
```

---

### 6. Get Log Statistics (Admin)

Mengambil statistik logs.

```
GET /api/v1/psychology/session-logs/stats
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `startDate` | ISO date | Filter dari tanggal |
| `endDate` | ISO date | Filter sampai tanggal |
| `sessionId` | UUID | Filter by session |

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 5000,
    "uniqueSessions": 50,
    "byLevel": {
      "debug": 100,
      "info": 4500,
      "warn": 350,
      "error": 50
    },
    "byEventType": [
      { "eventType": "question_answered", "count": 4000 },
      { "eventType": "question_viewed", "count": 500 },
      { "eventType": "page_blur", "count": 200 }
    ]
  }
}
```

---

### 7. Cleanup Old Logs (Super Admin)

Menghapus logs lama (hanya debug dan info).

```
DELETE /api/v1/psychology/session-logs/cleanup
```

**Request Body:**
```json
{
  "olderThanDays": 90
}
```

**Response:**
```json
{
  "success": true,
  "message": "Deleted 1500 old logs",
  "data": {
    "deletedCount": 1500,
    "cutoffDate": "2025-09-17T00:00:00.000Z"
  }
}
```

---

## Event Types

### Session Lifecycle
| Event Type | Description | Data |
|------------|-------------|------|
| `test_started` | Test dimulai | `{ testCode }` |
| `test_resumed` | Test dilanjutkan | `{ resumeCount }` |
| `test_paused` | Test di-pause | `{ progress }` |
| `test_submitted` | Test di-submit | `{ totalAnswered }` |
| `test_completed` | Test selesai | `{ duration, totalAnswered }` |
| `test_timeout` | Test timeout | `{ timeLimit, elapsed }` |

### Question Interaction
| Event Type | Description | Data |
|------------|-------------|------|
| `question_viewed` | Soal ditampilkan | `{ questionId, questionNumber }` |
| `question_answered` | User menjawab | `{ questionId, answer, timeSpent }` |
| `question_changed` | User mengubah jawaban | `{ questionId, oldAnswer, newAnswer }` |
| `question_skipped` | Soal dilewati | `{ questionId }` |

### Navigation
| Event Type | Description | Data |
|------------|-------------|------|
| `page_navigation` | Navigasi halaman | `{ from, to }` |
| `section_started` | Mulai section baru | `{ sectionId, sectionName }` |
| `section_completed` | Selesai section | `{ sectionId, duration }` |

### Focus/Visibility
| Event Type | Description | Data |
|------------|-------------|------|
| `page_focus` | Window mendapat focus | `{}` |
| `page_blur` | Window kehilangan focus | `{}` |
| `tab_hidden` | Tab disembunyikan | `{}` |
| `tab_visible` | Tab terlihat kembali | `{ awayDuration }` |
| `window_minimized` | Window diminimize | `{}` |
| `window_restored` | Window di-restore | `{ awayDuration }` |

### Warnings/Violations
| Event Type | Description | Data |
|------------|-------------|------|
| `focus_warning` | Warning sering blur | `{ blurCount, threshold }` |
| `time_warning` | Waktu hampir habis | `{ remainingSeconds }` |
| `copy_attempt` | Mencoba copy | `{}` |
| `paste_attempt` | Mencoba paste | `{}` |
| `screenshot_attempt` | Mencoba screenshot | `{}` |

### Client Events
| Event Type | Description | Data |
|------------|-------------|------|
| `client_error` | Error di client | `{ error, stack }` |
| `network_error` | Error jaringan | `{ url, status }` |
| `auto_save` | Auto save progress | `{ answeredCount }` |
| `manual_save` | Manual save | `{ answeredCount }` |
| `custom` | Event custom | Any |

---

## Frontend Implementation

### Basic Logger Class

```javascript
class SessionLogger {
  constructor(baseUrl, token, sessionId) {
    this.baseUrl = baseUrl;
    this.token = token;
    this.sessionId = sessionId;
    this.queue = [];
    this.flushInterval = null;
    this.isOnline = navigator.onLine;
  }

  // Initialize logger
  init() {
    // Auto-flush setiap 10 detik
    this.flushInterval = setInterval(() => this.flush(), 10000);
    
    // Flush sebelum halaman ditutup
    window.addEventListener('beforeunload', () => {
      this.flush(true); // sync flush
    });

    // Track online/offline
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flush();
    });
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Auto-track focus events
    this.setupFocusTracking();
  }

  // Add log to queue
  log(eventType, data = {}, level = 'info', message = null) {
    this.queue.push({
      level,
      eventType,
      message,
      data,
      clientTimestamp: new Date().toISOString()
    });

    // Immediate flush untuk error dan warn
    if (level === 'error' || level === 'warn') {
      this.flush();
    }
  }

  // Shortcut methods
  info(eventType, data, message) { this.log(eventType, data, 'info', message); }
  warn(eventType, data, message) { this.log(eventType, data, 'warn', message); }
  error(eventType, data, message) { this.log(eventType, data, 'error', message); }

  // Send logs to server
  async flush(sync = false) {
    if (this.queue.length === 0 || !this.isOnline) return;

    const logs = [...this.queue];
    this.queue = [];

    const url = `${this.baseUrl}/api/v1/psychology/public/access/${this.token}/session/${this.sessionId}/log`;
    const body = JSON.stringify({ logs });

    try {
      if (sync && navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
      } else {
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body
        });
      }
    } catch (err) {
      // Kembalikan ke queue jika gagal
      this.queue = [...logs, ...this.queue];
      console.error('Failed to flush logs:', err);
    }
  }

  // Setup focus/visibility tracking
  setupFocusTracking() {
    let blurTime = null;
    let blurCount = 0;

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        blurTime = Date.now();
        blurCount++;
        this.warn('tab_hidden', { blurCount });
        
        // Warning jika terlalu sering
        if (blurCount >= 3) {
          this.warn('focus_warning', { blurCount, threshold: 3 });
        }
      } else {
        const awayDuration = blurTime ? Date.now() - blurTime : 0;
        this.info('tab_visible', { awayDuration });
        blurTime = null;
      }
    });

    window.addEventListener('blur', () => this.info('page_blur'));
    window.addEventListener('focus', () => this.info('page_focus'));
  }

  // Cleanup
  destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flush(true);
  }
}

// Export
export default SessionLogger;
```

### Usage Example

```javascript
import SessionLogger from './SessionLogger';

// Initialize
const logger = new SessionLogger(
  'https://api.example.com',
  'XXXX-XXXX-XXXX', // access token
  'session-uuid'
);
logger.init();

// Log test started
logger.info('test_started', { testCode: 'PAPI' });

// Log question events
function onQuestionView(questionId) {
  logger.info('question_viewed', { questionId });
}

function onAnswerSelect(questionId, answer, timeSpent) {
  logger.info('question_answered', { 
    questionId, 
    answer, 
    timeSpent 
  });
}

// Log errors
try {
  // some code
} catch (err) {
  logger.error('client_error', { 
    error: err.message, 
    stack: err.stack 
  });
}

// Log submit
function onSubmit(totalAnswered) {
  logger.info('test_submitted', { totalAnswered });
  logger.destroy(); // Final flush
}
```

### React Hook Example

```javascript
import { useEffect, useRef } from 'react';
import SessionLogger from './SessionLogger';

export function useSessionLogger(token, sessionId) {
  const loggerRef = useRef(null);

  useEffect(() => {
    if (!token || !sessionId) return;

    const logger = new SessionLogger(
      process.env.REACT_APP_API_URL,
      token,
      sessionId
    );
    logger.init();
    loggerRef.current = logger;

    return () => {
      logger.destroy();
    };
  }, [token, sessionId]);

  return loggerRef.current;
}

// Usage in component
function TestPage({ token, sessionId }) {
  const logger = useSessionLogger(token, sessionId);

  const handleAnswer = (questionId, answer) => {
    logger?.info('question_answered', { questionId, answer });
    // ... save answer
  };

  return (
    // ... component JSX
  );
}
```

---

## Best Practices

### ⚠️ CRITICAL: Preventing Maximum Stack Errors in Production

**Problem:** Sending too many logs at once causes maximum call stack errors in production.

**Solution:** Implement proper batching and chunking:

```javascript
// ✅ GOOD: Chunked batching with proper limits
class LogManager {
  constructor(maxBatchSize = 100, flushInterval = 5000) {
    this.maxBatchSize = maxBatchSize;  // Max 100 per backend limit
    this.flushInterval = flushInterval;
    this.buffer = [];
    this.timer = null;
  }

  addLog(log) {
    this.buffer.push(log);
    
    // Auto-flush if buffer reaches max size
    if (this.buffer.length >= this.maxBatchSize) {
      this.flush();
    } else if (!this.timer) {
      // Schedule flush
      this.timer = setTimeout(() => this.flush(), this.flushInterval);
    }
  }

  async flush() {
    if (this.buffer.length === 0) return;
    
    clearTimeout(this.timer);
    this.timer = null;

    // Take chunk respecting backend limit
    const chunk = this.buffer.splice(0, this.maxBatchSize);
    
    try {
      await this.sendBatch(chunk);
    } catch (err) {
      console.error('Failed to send logs:', err);
      // Optionally re-queue failed logs
    }

    // If still has buffered logs, flush again
    if (this.buffer.length > 0) {
      setTimeout(() => this.flush(), 100);
    }
  }

  async sendBatch(logs) {
    const response = await fetch(`/api/v1/psychology/public/access/${token}/session/${sessionId}/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logs })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }
    
    return response.json();
  }
}

// Usage
const logManager = new LogManager(50, 3000); // 50 logs per batch, flush every 3s

// Add logs throughout test
logManager.addLog({
  level: 'info',
  eventType: 'question_viewed',
  data: { questionId: 1 },
  clientTimestamp: new Date().toISOString()
});

// Force flush on page unload
window.addEventListener('beforeunload', () => {
  logManager.flush();
});
```

### General Best Practices

1. **✅ Batch logs** - Kumpulkan logs dan kirim batch untuk mengurangi request (max 100 per batch)
2. **✅ Respect limits** - Jangan kirim lebih dari 100 logs per request atau data > 50KB per log
3. **✅ Use sendBeacon** - Untuk flush saat page unload, gunakan `navigator.sendBeacon` dengan chunking
4. **✅ Handle offline** - Queue logs saat offline, kirim saat online kembali dengan chunking
5. **✅ Limit data size** - Keep log data under 50KB, jangan kirim screenshot/file dalam log
6. **✅ Use correct level** - `info` untuk normal events, `warn` untuk suspicious activity, `error` untuk errors
7. **✅ Cleanup regularly** - Jalankan cleanup untuk logs lama (90+ hari)
8. **✅ Implement retry** - Dengan exponential backoff untuk failed requests
9. **✅ Monitor buffer** - Alert developer jika buffer terus bertambah (possible memory leak)

---

## Real-time Log Streaming (Admin)

### SSE Client Class

```javascript
class SessionLogStream {
  constructor(baseUrl, sessionId, token) {
    this.baseUrl = baseUrl;
    this.sessionId = sessionId;
    this.token = token;
    this.eventSource = null;
    this.onLog = null;
    this.onConnect = null;
    this.onError = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  // Connect to SSE stream
  connect(options = {}) {
    const { level } = options;
    
    let url = `${this.baseUrl}/api/v1/psychology/sessions/${this.sessionId}/logs/stream`;
    if (level) {
      url += `?level=${level}`;
    }

    // EventSource doesn't support custom headers, use query param for auth
    // Or use fetch with ReadableStream for better control
    this.connectWithFetch(url);
  }

  // Connect using Fetch API (supports auth headers)
  async connectWithFetch(url) {
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'text/event-stream'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('Stream ended');
          this.handleReconnect();
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        
        // Process complete events
        const lines = buffer.split('\n\n');
        buffer = lines.pop(); // Keep incomplete event in buffer

        for (const eventBlock of lines) {
          this.processEvent(eventBlock);
        }
      }
    } catch (err) {
      console.error('Stream error:', err);
      if (this.onError) this.onError(err);
      this.handleReconnect();
    }
  }

  // Process SSE event
  processEvent(eventBlock) {
    const lines = eventBlock.split('\n');
    let eventType = 'message';
    let data = '';

    for (const line of lines) {
      if (line.startsWith('event:')) {
        eventType = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        data += line.slice(5).trim();
      }
    }

    if (!data) return;

    try {
      const parsed = JSON.parse(data);

      if (eventType === 'heartbeat') {
        // Connection alive
        return;
      }

      if (parsed.type === 'connected') {
        this.reconnectAttempts = 0;
        if (this.onConnect) this.onConnect(parsed.session);
      } else if (parsed.type === 'log') {
        if (this.onLog) this.onLog(parsed.data);
      }
    } catch (err) {
      console.error('Failed to parse event:', err);
    }
  }

  // Handle reconnection
  handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    setTimeout(() => this.connect(), delay);
  }

  // Disconnect
  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }
}

// Export
export default SessionLogStream;
```

### Usage Example

```javascript
import SessionLogStream from './SessionLogStream';

// Initialize stream
const stream = new SessionLogStream(
  'http://localhost:8000',
  'session-uuid',
  'admin-jwt-token'
);

// Set handlers
stream.onConnect = (session) => {
  console.log('Connected to session:', session.patientName);
  console.log('Access token:', session.accessToken);
};

stream.onLog = (log) => {
  console.log(`[${log.level}] ${log.eventType}:`, log.data);
  
  // Update UI
  addLogToList(log);
  
  // Highlight warnings/errors
  if (log.level === 'warn' || log.level === 'error') {
    showNotification(log);
  }
};

stream.onError = (err) => {
  console.error('Stream error:', err);
};

// Connect (filter only warn and error)
stream.connect({ level: 'warn,error' });

// Later: disconnect
// stream.disconnect();
```

---

## Troubleshooting Production Errors

### Maximum Call Stack Error

**Symptoms:**
- Frontend works fine in development
- Production throws "Maximum call stack size exceeded"
- Error occurs when sending many logs

**Root Cause:**
Sending too many logs at once (e.g., 500+ logs) causes:
1. Backend loops through all logs to broadcast via SSE
2. `forEach` on large arrays + nested function calls → stack overflow
3. Memory pressure in production (minified code has less stack space)

**Solution (Backend - Already Implemented):**
```javascript
// ✅ Backend now has protections:
- Max 100 logs per batch request
- Max 50KB per log data field
- Chunked broadcasting (20 logs per chunk with setImmediate)
- Oversized logs automatically skipped
```

**Solution (Frontend - You Must Implement):**

```javascript
// ❌ BAD: Send all logs at once
const allLogs = questionLogs.concat(focusLogs, navigationLogs); // 500+ logs
await sendLogs(allLogs); // WILL CAUSE STACK OVERFLOW

// ✅ GOOD: Chunk into batches
async function sendLogsInChunks(logs, chunkSize = 50) {
  for (let i = 0; i < logs.length; i += chunkSize) {
    const chunk = logs.slice(i, i + chunkSize);
    await sendBatch(chunk);
    // Small delay to prevent overwhelming server
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

await sendLogsInChunks(allLogs, 50); // Safe!
```

### Dev vs Production Differences

| Aspect | Development | Production |
|--------|-------------|------------|
| Stack size | Larger (~10MB) | Smaller (~1-2MB) |
| Code | Unminified | Minified (deeper call stacks) |
| Error reporting | Detailed | May be suppressed |
| Network | Fast/local | Variable latency |
| Memory | Abundant | Limited (especially mobile) |

**Key Takeaway:** Always test with **production-like data volumes** before deploying.

### Monitoring & Debugging

```javascript
// Add monitoring to your LogManager
class LogManager {
  constructor(maxBatchSize = 100, flushInterval = 5000) {
    // ... existing code
    this.stats = {
      totalLogs: 0,
      successfulBatches: 0,
      failedBatches: 0,
      skippedLogs: 0
    };
  }

  async sendBatch(logs) {
    try {
      const response = await fetch(/* ... */);
      const result = await response.json();
      
      this.stats.totalLogs += logs.length;
      this.stats.successfulBatches++;
      this.stats.skippedLogs += result.data.skipped || 0;
      
      // Alert if too many logs are being skipped
      if (result.data.skipped > 0) {
        console.warn(`${result.data.skipped} logs skipped (too large)`);
      }
      
      return result;
    } catch (err) {
      this.stats.failedBatches++;
      throw err;
    }
  }

  getStats() {
    return {
      ...this.stats,
      bufferSize: this.buffer.length,
      successRate: this.stats.successfulBatches / 
        (this.stats.successfulBatches + this.stats.failedBatches)
    };
  }
}
```

```

### React Hook for Streaming

```javascript
import { useState, useEffect, useCallback, useRef } from 'react';
import SessionLogStream from './SessionLogStream';

export function useSessionLogStream(sessionId, token, options = {}) {
  const [logs, setLogs] = useState([]);
  const [session, setSession] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const streamRef = useRef(null);

  const connect = useCallback(() => {
    if (!sessionId || !token) return;

    const stream = new SessionLogStream(
      process.env.REACT_APP_API_URL,
      sessionId,
      token
    );

    stream.onConnect = (sessionInfo) => {
      setSession(sessionInfo);
      setIsConnected(true);
      setError(null);
    };

    stream.onLog = (log) => {
      setLogs(prev => [...prev, log]);
    };

    stream.onError = (err) => {
      setError(err);
      setIsConnected(false);
    };

    stream.connect(options);
    streamRef.current = stream;

    return () => {
      stream.disconnect();
    };
  }, [sessionId, token, options.level]);

  useEffect(() => {
    const cleanup = connect();
    return cleanup;
  }, [connect]);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return {
    logs,
    session,
    isConnected,
    error,
    clearLogs
  };
}

// Usage in component
function SessionLogViewer({ sessionId }) {
  const { token } = useAuth();
  const { logs, session, isConnected, error } = useSessionLogStream(
    sessionId, 
    token,
    { level: 'info,warn,error' }
  );

  return (
    <div>
      <div className="header">
        {isConnected ? (
          <span className="status connected">● Live</span>
        ) : (
          <span className="status disconnected">● Disconnected</span>
        )}
        {session && (
          <div>
            <strong>{session.patientName}</strong> - {session.accessToken}
          </div>
        )}
      </div>

      <div className="logs">
        {logs.map(log => (
          <div key={log.id} className={`log-entry ${log.level}`}>
            <span className="time">{new Date(log.createdAt).toLocaleTimeString()}</span>
            <span className="level">{log.level}</span>
            <span className="event">{log.eventType}</span>
            <span className="data">{JSON.stringify(log.data)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Error Codes

| Error | Description |
|-------|-------------|
| `403 Forbidden` | Token invalid atau expired |
| `404 Not Found` | Session tidak ditemukan |
| `400 Bad Request` | eventType tidak diisi |

---

## Related Files

- Migration: `src/migrations/20251216100001-create-test-session-logs.js`
- Model: `src/models/testSessionLog.js`
- Controller: `src/modules/psychology/controllers/sessionLogController.js`
- Routes: `src/modules/psychology/routes/index.js`
