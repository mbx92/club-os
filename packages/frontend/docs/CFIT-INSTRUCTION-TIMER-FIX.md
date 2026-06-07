# CFIT Instruction Timer Fix

## 🐛 Bug Description

### Problem
Ketika peserta CFIT test berada di halaman instruksi subtest berikutnya (misalnya transisi dari Subtest 1 ke Subtest 2), timer dari subtest sebelumnya **tetap berjalan** di background.

### Impact
- Waktu terbuang saat peserta membaca instruksi
- Jika sisa waktu sedikit (misal 28 detik), subtest berikutnya bisa **ter-skip** karena timer habis sebelum peserta sempat mengerjakan
- Pengalaman test yang tidak adil karena waktu berkurang saat membaca instruksi

### Example Scenario
1. Peserta menyelesaikan Subtest 1 dengan sisa waktu **28 detik**
2. Peserta pindah ke halaman instruksi Subtest 2
3. Timer **28 detik tetap berjalan** saat peserta membaca instruksi
4. Peserta butuh 30 detik untuk membaca instruksi
5. Saat klik "Saya Mengerti", timer sudah habis (-2 detik)
6. **Subtest 2 ter-skip** dan langsung pindah ke Subtest 3 ❌

---

## ✅ Solution

### Fix Summary
Timer sekarang **DIHENTIKAN** ketika peserta masuk ke halaman instruksi, dan **DIMULAI KEMBALI** hanya ketika peserta klik tombol "Saya Mengerti, Mulai Tes".

### Implementation Changes

#### 1. Stop Timer on Instruction Page Entry

**File:** `src/pages/psychology/public/test/[token]/[sessionId].vue`

**Location:** `watch(currentQuestionIndex)` watcher

```javascript
watch(currentQuestionIndex, (newIndex, oldIndex) => {
  const question = questions.value[newIndex]
  if (question) {
    // ... existing code ...
    
    // 🔴 CRITICAL FIX: Stop timer when entering instruction page
    if (isSubtestProtectionEnabled.value && question.type === 'instruction') {
      stopTimer()
      console.log('⏸️ Timer stopped: Entering instruction page for', question.subtest)
      
      logInfo(token.value, sessionId.value, 'instruction_page_entered', {
        subtest: question.subtest,
        previousSubtest: currentSubtestCode.value,
        timerStopped: true
      })
      
      return // Exit early, don't process subtest change logic
    }
    
    // ... rest of the code ...
  }
})
```

**What it does:**
- Detects when `currentQuestion` is an instruction page
- Immediately calls `stopTimer()` to halt the countdown
- Logs the event for debugging
- Returns early to prevent any timer manipulation

---

#### 2. Start Timer After Instruction Completion

**File:** `src/pages/psychology/public/test/[token]/[sessionId].vue`

**Location:** `continueFromInstruction()` function

```javascript
const continueFromInstruction = () => {
  if (!isCfitTest.value) return
  
  // Move to next item (should be first question of subtest)
  currentQuestionIndex.value++
  visitedQuestionIndices.value.add(currentQuestionIndex.value)
  
  if (currentQuestion.value && currentQuestion.value.type === 'question') {
    const subtestCode = currentQuestion.value.subtest
    currentSubtestCode.value = subtestCode
    
    const subtestConfig = getSubtestConfig(subtestCode)
    const timeLimit = subtestConfig?.timeLimit
    
    if (timeLimit) {
      if (!subtestTimers.value[subtestCode]) {
        subtestTimers.value[subtestCode] = timeLimit
      }
      
      remainingTime.value = subtestTimers.value[subtestCode]
      
      // Log instruction completion and timer start
      logInfo(token.value, sessionId.value, 'instruction_completed', {
        subtest: subtestCode,
        timerStarted: true,
        remainingTime: remainingTime.value,
        timeLimit: timeLimit
      })
      
      if (remainingTime.value > 0) {
        stopTimer()  // Safety: stop any existing timer
        startTimer() // ▶️ Start fresh timer for new subtest
      }
    }
  }
}
```

**What it does:**
- Called when user clicks "Saya Mengerti, Mulai Tes"
- Advances to first question of the subtest
- Initializes or restores timer for the new subtest
- Starts the timer countdown
- Logs the event

---

#### 3. Handle Force Transition (Timer Expired)

**File:** `src/pages/psychology/public/test/[token]/[sessionId].vue`

**Location:** `forceNextSubtest()` function

```javascript
const forceNextSubtest = () => {
  stopTimer()
  
  // ... find next subtest logic ...
  
  if (foundNextSubtest && nextIndex < questions.value.length) {
    currentQuestionIndex.value = nextIndex
    visitedQuestionIndices.value.add(nextIndex)
    
    const nextQ = questions.value[nextIndex]
    
    // If next is instruction, DON'T start timer
    // Timer will be started when user clicks "Saya Mengerti"
    if (nextQ.type === 'instruction' && nextQ.subtest) {
      currentSubtestCode.value = nextQ.subtest
      
      logInfo(token.value, sessionId.value, 'forced_to_instruction', {
        previousSubtest: currentQ.subtest,
        nextSubtest: nextQ.subtest,
        note: 'Timer will start after instruction is completed'
      })
    } else if (nextQ.subtest) {
      // Only start timer if NOT instruction page
      currentSubtestCode.value = nextQ.subtest
      const subtestConfig = getSubtestConfig(nextQ.subtest)
      if (subtestConfig?.timeLimit) {
        if (!subtestTimers.value[nextQ.subtest]) {
          subtestTimers.value[nextQ.subtest] = subtestConfig.timeLimit
        }
        remainingTime.value = subtestTimers.value[nextQ.subtest]
        startTimer()
      }
    }
  }
}
```

**What it does:**
- Handles automatic transition when timer expires
- If landing on instruction page: **DON'T** start timer
- If landing on question page: start timer normally
- Logs the transition type

---

## 🔄 Timer Flow

### Normal Flow (Subtest to Subtest)

```
┌─────────────────────────────────────────────────────────────┐
│  Subtest 1 - Question (Timer Running)                        │
│  ⏱️ 00:28 remaining                                          │
└─────────────────────────────────────────────────────────────┘
                        ↓
            User clicks "Next" or finishes
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  Subtest 2 - Instruction Page (Timer STOPPED ⏸️)            │
│  No countdown, user can read freely                          │
└─────────────────────────────────────────────────────────────┘
                        ↓
       User clicks "Saya Mengerti, Mulai Tes"
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  Subtest 2 - Question 1 (Timer STARTED ▶️)                  │
│  ⏱️ 10:00 (fresh timer for Subtest 2)                       │
└─────────────────────────────────────────────────────────────┘
```

### Force Transition Flow (Timer Expired During Subtest)

```
┌─────────────────────────────────────────────────────────────┐
│  Subtest 1 - Question (Timer Running)                        │
│  ⏱️ 00:03... 00:02... 00:01... 00:00                        │
└─────────────────────────────────────────────────────────────┘
                        ↓
              Timer expires, auto-transition
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  Subtest 2 - Instruction Page (Timer STOPPED ⏸️)            │
│  User must read and click "Mengerti"                         │
└─────────────────────────────────────────────────────────────┘
                        ↓
       User clicks "Saya Mengerti, Mulai Tes"
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  Subtest 2 - Question 1 (Timer STARTED ▶️)                  │
│  ⏱️ 10:00 (fresh timer)                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧪 Testing Guide

### Test Case 1: Manual Transition to Instruction

1. Start CFIT test
2. Complete some questions in Subtest 1
3. Wait until timer shows **low time** (e.g., < 1 minute)
4. Navigate to next subtest (instruction page)
5. **Verify:** Timer should **STOP** (frozen, not counting down)
6. Take your time reading the instruction (e.g., wait 30 seconds)
7. Click "Saya Mengerti, Mulai Tes"
8. **Verify:** New timer should start at **full time** for Subtest 2 (e.g., 10:00)

**Expected Result:** ✅ Timer pauses during instruction, starts fresh for new subtest

---

### Test Case 2: Auto-Transition (Timer Expired)

1. Start CFIT test
2. **Simulate fast timer:** Open DevTools Console, run:
   ```javascript
   remainingTime.value = 5
   ```
3. Wait 5 seconds for timer to expire
4. **Verify:** Automatically moved to Subtest 2 instruction page
5. **Verify:** Timer should be **STOPPED** (not counting)
6. Click "Saya Mengerti, Mulai Tes"
7. **Verify:** Timer starts at full time for Subtest 2

**Expected Result:** ✅ Even on forced transition, instruction page timer is stopped

---

### Test Case 3: Resume After Refresh

1. Start CFIT test
2. Navigate to instruction page of Subtest 2
3. **Verify:** Timer is stopped
4. Refresh the page (F5)
5. **Verify:** Still on instruction page with timer stopped
6. Click "Saya Mengerti, Mulai Tes"
7. **Verify:** Timer starts correctly

**Expected Result:** ✅ Timer state preserved across refresh

---

## 📊 Log Events

The fix adds comprehensive logging for debugging:

### `instruction_page_entered`
- **When:** User navigates to instruction page
- **Data:** `subtest`, `previousSubtest`, `timerStopped: true`

### `instruction_completed`
- **When:** User clicks "Saya Mengerti" and timer starts
- **Data:** `subtest`, `timerStarted: true`, `remainingTime`, `timeLimit`

### `forced_to_instruction`
- **When:** Timer expired and auto-moved to instruction page
- **Data:** `previousSubtest`, `nextSubtest`, `note`

---

## 🔍 Debugging

If timer issues occur, check browser console for:

```
⏸️ Timer stopped: Entering instruction page for series
▶️ Starting subtest classification: 600 seconds (10m 0s)
```

Or check session logs via API for event types:
- `instruction_page_entered`
- `instruction_completed`
- `forced_to_instruction`

---

## ✨ Benefits

1. **Fair Testing:** Participants get full time for each subtest
2. **No Skip Issues:** Subtests won't be skipped due to reading time
3. **Better UX:** Users can read instructions without time pressure
4. **Logging:** Complete audit trail for debugging

---

## 📝 Notes

- This fix **only applies** to CFIT tests with `subtestProtection: true`
- Other test types are not affected
- Timer persistence still works (saved to backend metadata)
- Compatible with existing timer recovery logic

---

## 🚀 Deployment

**Status:** ✅ Implemented

**Files Modified:**
- `src/pages/psychology/public/test/[token]/[sessionId].vue`

**Breaking Changes:** None

**Backward Compatible:** Yes

---

**Date:** 2024-12-25  
**Bug Reporter:** User (Critical Issue)  
**Fix By:** GitHub Copilot  
**Priority:** Critical 🔴
