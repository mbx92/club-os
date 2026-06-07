# Test Session Logging System

## Overview
Sistem logging otomatis untuk menangkap dan menyimpan event penting selama test session. Log dikirim ke backend untuk analisis admin.

**Note**: Implementasi ini mengikuti spesifikasi lengkap di [SESSION-LOGGING-API.md](./SESSION-LOGGING-API.md).

## Key Features
- ✅ **Batch logging** - Logs dikumpulkan dan dikirim dalam batch untuk efisiensi
- ✅ **Auto-flush** - Otomatis kirim setiap 10 detik atau saat batch penuh
- ✅ **Retry mechanism** - Re-queue logs yang gagal dikirim
- ✅ **Critical priority** - Error dan critical events langsung dikirim
- ✅ **Cleanup on unmount** - Flush remaining logs sebelum page close

## Events yang Dilog

Menggunakan event types dari [SESSION-LOGGING-API.md](./SESSION-LOGGING-API.md).

### Error Level Events (❌)
- **client_error**: Error di client-side code
  - Data: error message, stack trace, testType, questionId (if applicable)
- **submit_error**: Error saat submit jawaban
  - Data: error message, answeredCount, testType
- **test_timeout**: Test auto-submit karena waktu habis (dengan warning)
  - Data: answeredCount, unansweredCount, totalQuestions, testType, reason

### Warning Level Events (⚠️)
- **timer_invalid**: Timer tidak bisa dimulai karena remainingTime invalid
  - Data: remainingTime, testType, currentSubtest
- **timer_already_running**: Attempt untuk start timer yang sudah running
  - Data: remainingTime, testType
- **subtest_time_expired**: Waktu subtest habis, force move ke subtest berikutnya
  - Data: subtest, currentQuestionIndex, answeredInSubtest
- **time_warning**: Waktu hampir habis (opsional, untuk future implementation)
  - Data: remainingSeconds, testType

### Info Level Events (ℹ️)
- **session_loaded**: Session berhasil dimuat
  - Data: totalQuestions, savedAnswers, testType, isResume
- **test_started**: Test dimulai (pertama kali)
  - Data: testCode, testType
- **test_resumed**: Test dilanjutkan dari session sebelumnya
  - Data: resumeCount, savedAnswers, testType
- **cfit_resumed_no_autostart**: CFIT resume session tanpa auto-start timer
  - Data: remainingTime, currentSubtest, currentQuestionIndex, savedAnswers
- **timer_started**: Timer dimulai
  - Data: remainingTime, testType, currentSubtest, currentQuestionIndex
- **test_completed**: User klik tombol selesai sendiri (normal completion)
  - Data: answeredCount, unansweredCount, totalQuestions, testType, remainingTime

## Data yang Dicatat

Setiap log mencakup (sesuai SESSION-LOGGING-API.md):
```javascript
{
  level: "error|warn|info",
  eventType: "event_name",
  message: "Optional message",
  data: {
    // Event-specific data
    url: "https://...",
    userAgent: "Mozilla/5.0...",
    screen: { width: 1920, height: 1080 }
  },
  clientTimestamp: "2025-12-16T10:30:00.000Z"
}
```

### Batch Format
Logs dikirim dalam batch:
```javascript
{
  logs: [
    { level: "info", eventType: "test_started", ... },
    { level: "info", eventType: "timer_started", ... },
    // ... more logs
  ]
}
```

## Backend Implementation

Implementasi lengkap ada di [SESSION-LOGGING-API.md](./SESSION-LOGGING-API.md).

### Quick Reference

**Endpoint untuk menerima log:**
```
POST /api/v1/psychology/public/access/:token/session/:sessionId/log
```

Body (batch):
```json
{
  "logs": [
    {
      "level": "info",
      "eventType": "test_started",
      "message": null,
      "data": { "testCode": "PAPI" },
      "clientTimestamp": "2025-12-16T10:30:00.000Z"
    }
  ]
}
```

**Endpoint untuk admin:**
```
GET /api/v1/psychology/session-logs?level=warn,error&limit=50
```

## Database Schema

```sql
CREATE TABLE test_session_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES test_sessions(id),
  timestamp TIMESTAMP NOT NULL,
  level VARCHAR(20) NOT NULL, -- critical, warning, info
  event_type VARCHAR(100) NOT NULL,
  details JSONB,
  user_agent TEXT,
  url TEXT,
  screen JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_session_logs_session_id ON test_session_logs(session_id);
CREATE INDEX idx_session_logs_level ON test_session_logs(level);
CREATE INDEX idx_session_logs_event_type ON test_session_logs(event_type);
CREATE INDEX idx_session_logs_timestamp ON test_session_logs(timestamp DESC);
```

## Usage

### Frontend Implementation

Logger sudah terintegrasi di test page (`[sessionId].vue`). Berikut cara penggunaan:

```javascript
import { useTestLogger } from '@/composables/psychology'

const {
  logError,
  logWarning,
  logInfo,
  flushLogs,
  startAutoFlush,
  stopAutoFlush
} = useTestLogger()

// Start auto-flush saat timer dimulai
startAutoFlush(token.value, sessionId.value)

// Log events
logInfo(token.value, sessionId.value, 'test_started', { 
  testCode: 'PAPI' 
})

logWarning(token.value, sessionId.value, 'timer_invalid', { 
  remainingTime: 0,
  testType: 'PAPI'
})

logError(token.value, sessionId.value, 'submit_error', {
  error: 'Network timeout',
  answeredCount: 45
})

// Manual flush (opsional)
await flushLogs(token.value, sessionId.value)

// Stop auto-flush saat cleanup
stopAutoFlush()
```

### Automatic Logging

System akan otomatis log event-event berikut:
- ✅ Session loaded / resumed
- ✅ Timer started / invalid / already running
- ✅ Subtest time expired (CFIT)
- ✅ Test completion (normal / timeout)
- ✅ Submit errors
- ✅ Critical events (force submit prevented, dll)

### Batch Behavior

- Logs dikumpulkan di queue
- Auto-flush setiap **10 detik**
- Auto-flush saat **batch mencapai 10 logs**
- **Immediate flush** untuk error/critical events
- Re-queue jika send gagal (auto-retry)

### Admin View
1. Buka `/psychology/logs`
2. Filter by:
   - Level (critical/warning/info)
   - Event Type
   - Session ID
3. Klik "Detail" untuk lihat full log data

## Troubleshooting Guide

### Problem: Test langsung selesai tanpa jawaban
Check logs untuk:
- `force_submit_prevented`: Timer salah kalkulasi
- `timer_invalid`: remainingTime <= 0 saat start
- `session_loaded` dengan `isResume: true`: Check savedAnswers count

### Problem: CFIT pindah subtest mendadak
Check logs untuk:
- `subtest_time_expired`: Timer habis
- `timer_started`: Kapan timer dimulai dan berapa lama

### Problem: Auto-submit tidak terduga
Check logs untuk:
- `test_completed_force`: Lihat answeredCount dan reason
- `timer_started`: Validasi remainingTime saat timer dimulai
