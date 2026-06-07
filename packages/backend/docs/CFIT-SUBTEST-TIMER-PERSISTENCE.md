# CFIT Subtest Timer Persistence - Backend Implementation Guide

## 📋 Overview

Implementasi ini mengatasi celah keamanan dimana peserta bisa refresh halaman untuk reset subtest timer CFIT. Sekarang subtest timer akan di-persist ke backend dan di-restore saat resume session.

## ⚠️ Masalah yang Diperbaiki

### 1. **Refresh Halaman Reset Timer** (Security Vulnerability)
**Sebelum:**
- Subtest timer disimpan di frontend state (Vue ref)
- Refresh halaman → Timer reset ke nilai default
- Peserta bisa exploit: hampir habis waktu → refresh → dapat waktu penuh lagi

**Sesudah:**
- Subtest timer di-persist ke backend setiap auto-save (30 detik)
- Refresh halaman → Timer di-restore dari backend
- Celah keamanan tertutup ✅

### 2. **Error Saat Force Submit dengan Koneksi Buruk**
**Sebelum:**
- Force submit gagal → Error: "Terjadi kesalahan saat mengirim jawaban"
- Peserta tidak tahu harus apa → Bingung

**Sesudah:**
- Error message lebih informatif
- Instruksi jelas: "Refresh halaman untuk mencoba mengirim ulang"
- State sudah tersimpan di backend, aman untuk refresh

---

## 🔧 Backend API Changes Required

### 1. Update Save Progress Endpoint

**Endpoint:** `POST /api/v1/psychology/public/access/:token/session/:sessionId/save`

**Request Body (Updated):**
```json
{
  "answers": {
    "series_1": {
      "answer": "A",
      "timestamp": "2025-12-24T09:00:00.000Z",
      "duration": 5
    },
    "series_2": {
      "answer": "C",
      "timestamp": "2025-12-24T09:00:15.000Z",
      "duration": 8
    }
  },
  "metadata": {
    "subtestTimers": {
      "series": 540,
      "classification": 600,
      "matrices": 600
    },
    "currentSubtest": "series",
    "currentQuestionIndex": 5,
    "forceSubmitPending": false
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Progress saved",
  "data": {
    "savedAt": "2025-12-24T09:00:30.000Z",
    "answeredCount": 2,
    "totalQuestions": 50
  }
}
```

### 2. Update Get Questions Endpoint

**Endpoint:** `GET /api/v1/psychology/public/access/:token/session/:sessionId/questions`

**Response (Updated):**
```json
{
  "success": true,
  "data": {
    "session": {
      "id": "session-uuid",
      "status": "in_progress",
      "startedAt": "2025-12-24T08:50:00.000Z",
      "completedAt": null
    },
    "testType": {
      "id": "test-type-uuid",
      "code": "CFIT",
      "name": "IQ Test",
      "config": {
        "subtestProtection": true,
        "subtests": [
          {
            "code": "series",
            "name": "Series",
            "timeLimit": 600
          },
          {
            "code": "classification",
            "name": "Classification",
            "timeLimit": 600
          }
        ]
      }
    },
    "questions": [...],
    "savedAnswers": {...},
    "metadata": {
      "subtestTimers": {
        "series": 540,
        "classification": 600
      },
      "currentSubtest": "series",
      "currentQuestionIndex": 5
    }
  }
}
```

---

## 🗄️ Database Schema Changes

### Option 1: Add metadata column to sessions table (Recommended)

```sql
ALTER TABLE psychology_sessions 
ADD COLUMN metadata JSONB DEFAULT '{}';

-- Index for faster queries
CREATE INDEX idx_psychology_sessions_metadata 
ON psychology_sessions USING GIN (metadata);
```

### Option 2: Store in existing progress/answers column

Jika tidak ingin menambah column, bisa simpan di `progress` column yang sudah ada (jika menggunakan JSONB):

```json
{
  "answers": {...},
  "metadata": {
    "subtestTimers": {...},
    "currentSubtest": "series",
    "currentQuestionIndex": 5
  }
}
```

---

## 💾 Backend Implementation Example (Node.js/Prisma)

### 1. Update Save Progress Handler

```javascript
// POST /save endpoint
async function saveProgress(req, res) {
  const { token, sessionId } = req.params;
  const { answers, metadata } = req.body;
  
  try {
    // Validate session
    const session = await prisma.psychologySession.findFirst({
      where: {
        id: sessionId,
        order: {
          accessToken: token
        },
        status: 'in_progress'
      }
    });
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found or already completed'
      });
    }
    
    // Update session with answers and metadata
    await prisma.psychologySession.update({
      where: { id: sessionId },
      data: {
        progress: {
          answers: answers,
          metadata: metadata || {} // Store metadata
        },
        updatedAt: new Date()
      }
    });
    
    // Return success
    res.json({
      success: true,
      message: 'Progress saved',
      data: {
        savedAt: new Date(),
        answeredCount: Object.keys(answers).length,
        totalQuestions: session.totalQuestions
      }
    });
    
  } catch (error) {
    console.error('Save progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save progress',
      error: error.message
    });
  }
}
```

### 2. Update Get Questions Handler

```javascript
// GET /questions endpoint
async function getQuestions(req, res) {
  const { token, sessionId } = req.params;
  
  try {
    const session = await prisma.psychologySession.findFirst({
      where: {
        id: sessionId,
        order: {
          accessToken: token
        }
      },
      include: {
        testType: {
          include: {
            questions: true
          }
        },
        order: {
          include: {
            patient: true
          }
        }
      }
    });
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    // Get saved progress
    const progress = session.progress || {};
    const savedAnswers = progress.answers || {};
    const metadata = progress.metadata || null; // Return metadata
    
    res.json({
      success: true,
      data: {
        session: {
          id: session.id,
          status: session.status,
          startedAt: session.startedAt,
          completedAt: session.completedAt
        },
        testType: session.testType,
        patient: session.order.patient,
        questions: session.testType.questions,
        savedAnswers: savedAnswers,
        metadata: metadata // Include metadata in response
      }
    });
    
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load questions',
      error: error.message
    });
  }
}
```

---

## 🧪 Testing

### Test Case 1: Subtest Timer Persistence
1. Start CFIT test
2. Answer beberapa soal di subtest 1
3. Wait for auto-save (30 seconds)
4. Refresh halaman
5. ✅ **Verify:** Subtest timer restored ke nilai sebelum refresh

### Test Case 2: Force Submit with Bad Connection
1. Start CFIT test
2. Simulate bad network (Chrome DevTools → Network → Slow 3G)
3. Wait until timer expires
4. ✅ **Verify:** Error message memberikan instruksi yang jelas
5. Refresh halaman
6. ✅ **Verify:** Dapat retry submit dengan state yang tersimpan

### Test Case 3: Manual Submit
1. Start test
2. Answer questions
3. Click submit
4. ✅ **Verify:** Final state saved before submit
5. ✅ **Verify:** Success redirect to access page

---

## 📊 Metadata Structure

```typescript
interface SessionMetadata {
  // Subtest timer tracking (untuk CFIT)
  subtestTimers?: {
    [subtestCode: string]: number; // Remaining time in seconds
  };
  
  // Current active subtest
  currentSubtest?: string;
  
  // Current question index (for resume position)
  currentQuestionIndex?: number;
  
  // Flag if force submit is pending (for retry handling)
  forceSubmitPending?: boolean;
  
  // Timestamp when metadata was last saved
  lastSavedAt?: string;
}
```

### Example Data:

```json
{
  "subtestTimers": {
    "series": 540,
    "classification": 600,
    "matrices": 480,
    "typology": 600,
    "evaluation": 600,
    "number_series": 600,
    "similarities": 600,
    "memory": 600
  },
  "currentSubtest": "series",
  "currentQuestionIndex": 5,
  "forceSubmitPending": false,
  "lastSavedAt": "2025-12-24T09:00:30.000Z"
}
```

---

## 🔐 Security Considerations

1. **Validate metadata on save:**
   - Check if subtestTimers values are within valid range
   - Prevent timer manipulation (nilai tidak boleh > configured timeLimit)

2. **Sanitize on restore:**
   - Validate restored metadata before using
   - Fallback to default if metadata corrupted

3. **Rate limiting:**
   - Limit save frequency per session (sudah ada: 30 detik auto-save)

---

## 📝 Migration Path

### Phase 1: Database Update (Day 1)
- [ ] Add `metadata` column to `psychology_sessions` table
- [ ] Run migration script
- [ ] Test database changes

### Phase 2: Backend API Update (Day 1-2)
- [ ] Update save progress endpoint
- [ ] Update get questions endpoint
- [ ] Add validation for metadata
- [ ] Test API endpoints

### Phase 3: Frontend Deployment (Day 2)
- [ ] Deploy updated frontend code
- [ ] Monitor error logs
- [ ] Verify subtest timer persistence working

### Phase 4: Monitoring (Day 3+)
- [ ] Monitor auto-save success rate
- [ ] Check for timer manipulation attempts
- [ ] Gather user feedback

---

## 🚨 Rollback Plan

If issues occur:

1. **Backend:** Set `metadata` field to optional, don't return error if not present
2. **Frontend:** Will gracefully fallback to old behavior if metadata not available
3. **Database:** `metadata` column nullable, safe to leave empty

---

## 📞 Support

For questions or issues, contact frontend team or check:
- Frontend implementation: `src/composables/psychology/usePsychologyPublic.js`
- Test page: `src/pages/psychology/public/test/[token]/[sessionId].vue`
