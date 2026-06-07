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
    "count": 5
  }
}
```

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
          "orderNumber": "PSY-20251216-001"
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
      "orderNumber": "PSY-20251216-001"
    },
    "logs": [
      {
        "id": "uuid",
        "level": "info",
        "eventType": "test_started",
        "message": null,
        "data": { "testCode": "PAPI" },
        "clientTimestamp": "2025-12-16T10:00:00.000Z",
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

### 4. Get Log Statistics (Admin)

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

### 5. Cleanup Old Logs (Super Admin)

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

1. **Batch logs** - Kumpulkan logs dan kirim batch untuk mengurangi request
2. **Use sendBeacon** - Untuk flush saat page unload, gunakan `navigator.sendBeacon`
3. **Handle offline** - Queue logs saat offline, kirim saat online kembali
4. **Limit data size** - Jangan kirim data terlalu besar di field `data`
5. **Use correct level** - `info` untuk normal events, `warn` untuk suspicious activity, `error` untuk errors
6. **Cleanup regularly** - Jalankan cleanup untuk logs lama (90+ hari)

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
