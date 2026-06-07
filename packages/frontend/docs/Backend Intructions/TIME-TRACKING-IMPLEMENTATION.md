# Time Tracking Implementation Guide

## Overview

System sudah mendukung tracking waktu per-soal untuk semua tipe test psikologi. Backend dapat menerima, menyimpan, dan menampilkan data timing di report XLSX dan PDF.

## Answer Format

### Old Format (Backward Compatible)
```json
{
  "series_1": "A",
  "series_2": "B",
  "series_3": "C"
}
```

### New Format (With Timing)
```json
{
  "series_1": {
    "answer": "A",
    "timestamp": "2025-12-10T05:30:15.123Z",
    "duration": 5
  },
  "series_2": {
    "answer": "B", 
    "timestamp": "2025-12-10T05:30:20.456Z",
    "duration": 8
  },
  "series_3": {
    "answer": "C",
    "timestamp": "2025-12-10T05:30:28.789Z", 
    "duration": 3
  }
}
```

### Field Descriptions

- **answer** (string): Jawaban user (A/B/C/D atau value lain sesuai test type)
- **timestamp** (ISO 8601 string): Waktu ketika jawaban disubmit
- **duration** (number): Durasi dalam **detik** dari soal ditampilkan sampai dijawab

## Frontend Implementation

### 1. State Management

```javascript
// Add to component state
const [questionTimers, setQuestionTimers] = useState({});
const [answers, setAnswers] = useState({});

// Track when question is first displayed
useEffect(() => {
  if (currentQuestionId && !questionTimers[currentQuestionId]) {
    setQuestionTimers(prev => ({
      ...prev,
      [currentQuestionId]: Date.now()
    }));
  }
}, [currentQuestionId]);
```

### 2. Answer Submission with Timing

```javascript
const handleAnswerChange = (questionId, answerValue) => {
  const startTime = questionTimers[questionId];
  const duration = startTime 
    ? Math.round((Date.now() - startTime) / 1000) 
    : 0;
  
  const answerData = {
    answer: answerValue,
    timestamp: new Date().toISOString(),
    duration: duration
  };
  
  setAnswers(prev => ({
    ...prev,
    [questionId]: answerData
  }));
};
```

### 3. Save Progress API Call

**Endpoint**: `POST /api/v1/psychology/public/:token/sessions/:sessionId/progress`

**Request Body**:
```json
{
  "answers": {
    "series_1": {
      "answer": "A",
      "timestamp": "2025-12-10T05:30:15.123Z",
      "duration": 5
    },
    "series_2": {
      "answer": "B",
      "timestamp": "2025-12-10T05:30:20.456Z",
      "duration": 8
    }
  }
}
```

**Example Code**:
```javascript
const saveProgress = async () => {
  try {
    const response = await fetch(
      `/api/v1/psychology/public/${accessToken}/sessions/${sessionId}/progress`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers })
      }
    );
    
    const data = await response.json();
    console.log('Progress saved:', data.data.answeredCount);
  } catch (error) {
    console.error('Failed to save progress:', error);
  }
};
```

### 4. Submit Answers API Call

**Endpoint**: `POST /api/v1/psychology/public/:token/sessions/:sessionId/submit`

**Request Body**: Same format as save progress

**Example Code**:
```javascript
const submitTest = async () => {
  try {
    const response = await fetch(
      `/api/v1/psychology/public/${accessToken}/sessions/${sessionId}/submit`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers })
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      if (error.data?.unanswered > 0) {
        alert(`Masih ada ${error.data.unanswered} soal yang belum dijawab`);
        return;
      }
      throw new Error(error.message);
    }
    
    const data = await response.json();
    console.log('Test completed:', data.data);
    // Navigate to results page
  } catch (error) {
    console.error('Failed to submit:', error);
  }
};
```

## Resume Test Functionality

Ketika user melanjutkan test yang belum selesai:

```javascript
useEffect(() => {
  if (session.answers) {
    // Load existing answers
    setAnswers(session.answers);
    
    // Initialize timers for unanswered questions only
    const timers = {};
    Object.keys(session.answers).forEach(qId => {
      // Don't reset timer for already answered questions
      timers[qId] = null; 
    });
    setQuestionTimers(timers);
  }
}, [session]);
```

**Important**: Jangan reset timer untuk soal yang sudah dijawab. Duration yang tersimpan tetap dipertahankan.

## Report Display

### XLSX Export

Data timing akan muncul di:

1. **Sheet "Progress Subtes"**:
   - Column "Waktu (menit)": Total waktu untuk subtes (sum dari duration semua soal)

2. **Sheet "Detail Jawaban"**:
   - Column "Waktu (detik)": Duration per soal
   - Column "Waktu Jawab": Timestamp formatted (DD/MM/YYYY HH:mm:ss)

### PDF Export

- **Progress table**: Menampilkan total waktu per subtes
- **Detail answers table**: Menampilkan duration dan timestamp per soal

## Backward Compatibility

Backend **100% backward compatible** dengan format lama:

- Old format sessions tetap bisa dibuka dan di-export
- Report akan menampilkan `0` untuk duration dan `completedAt` untuk timestamp
- Tidak ada error atau breaking changes

## Testing Checklist

- [ ] Timer starts ketika soal pertama kali ditampilkan
- [ ] Duration dihitung dengan benar (dalam detik)
- [ ] Timestamp dalam format ISO 8601
- [ ] Save progress menyimpan timing data
- [ ] Resume test mempertahankan timing yang sudah ada
- [ ] Submit answers mengirim format baru
- [ ] XLSX export menampilkan timing dengan benar
- [ ] PDF export menampilkan timing dengan benar
- [ ] Subtest totals dihitung dengan benar (sum dari question durations)

## API Endpoints Summary

| Method | Endpoint | Purpose | Timing Required |
|--------|----------|---------|-----------------|
| POST | `/api/v1/psychology/public/:token/sessions/:sessionId/progress` | Save progress | Optional |
| POST | `/api/v1/psychology/public/:token/sessions/:sessionId/submit` | Submit answers | Optional |
| GET | `/api/v1/psychology/reports/session/:sessionId/export/xlsx` | Export XLSX | N/A |
| GET | `/api/v1/psychology/reports/session/:sessionId/export/pdf` | Export PDF | N/A |

## Notes

1. **Duration calculation**: Always use `Math.round()` untuk convert milliseconds ke seconds
2. **Timestamp format**: Always use `new Date().toISOString()` untuk consistency
3. **Timer initialization**: Track start time ketika soal **pertama kali** ditampilkan, bukan saat component mount
4. **Multiple answers**: Jika user mengubah jawaban, duration tetap dari **first display** sampai **last change**
5. **Network errors**: Implement retry logic untuk save progress, jangan sampai timing data hilang

## Backend Implementation Details

### Helper Functions (reportExportService.js)

```javascript
const getAnswerValue = (answerData) => {
  if (typeof answerData === 'object' && answerData.answer !== undefined) {
    return answerData.answer;
  }
  return answerData; // Old format
};

const getAnswerTimestamp = (answerData) => {
  return (typeof answerData === 'object' && answerData.timestamp) 
    ? answerData.timestamp : null;
};

const getAnswerDuration = (answerData) => {
  return (typeof answerData === 'object' && answerData.duration !== undefined) 
    ? answerData.duration : 0;
};
```

### Subtest Time Calculation

```javascript
// Sum all question durations in subtest
for (const q of questions) {
  const answerData = answers[q.id];
  const duration = getAnswerDuration(answerData);
  subtestStats[subtest].timeMinutes += Math.round(duration / 60);
}
```

### Detail Answers with Timing

```javascript
const userAnswer = getAnswerValue(answerData);
const duration = getAnswerDuration(answerData);
const timestamp = getAnswerTimestamp(answerData);

detailAnswers.push({
  // ... other fields
  timeSeconds: duration,
  answerTime: timestamp ? formatDate(new Date(timestamp)) : formatDate(session.completedAt)
});
```

## Example Complete Flow

1. **User starts test**: Timer initialized untuk soal pertama
2. **User answers Q1**: Duration calculated (5 detik), data saved: `{ answer: "A", timestamp: "...", duration: 5 }`
3. **Move to Q2**: Timer initialized untuk Q2
4. **Auto-save progress**: POST request dengan answers format baru
5. **User closes browser**: Data tersimpan di database
6. **User resumes test**: Load answers, timer hanya untuk soal belum dijawab
7. **Complete test**: POST submit dengan semua timing data
8. **Admin exports report**: XLSX dan PDF menampilkan timing lengkap

## Support

Jika ada pertanyaan atau issue dengan implementasi timing:
1. Check console untuk error messages
2. Verify answer format di network tab (harus object dengan answer/timestamp/duration)
3. Test dengan session yang sudah completed
4. Check report export untuk verify timing data tersimpan dengan benar
