# CFIT Subtest Timer - Testing Checklist

## ✅ Frontend Implementation Status

**Status:** READY ✅

Frontend sudah sepenuhnya diimplementasikan sesuai dengan [CFIT-SUBTEST-TIMER-PERSISTENCE.md](./CFIT-SUBTEST-TIMER-PERSISTENCE.md)

### Implemented Features:

1. ✅ **Save Progress dengan Metadata**
   - File: `src/composables/psychology/usePsychologyPublic.js`
   - Function: `saveProgress(token, sessionId, onError, onSuccess, metadata)`
   - Metadata included: `subtestTimers`, `currentSubtest`, `currentQuestionIndex`

2. ✅ **Get Questions dengan Metadata**
   - File: `src/composables/psychology/usePsychologyPublic.js`
   - Function: `getQuestions(token, sessionId)`
   - Returns: `response.data.metadata` atau `response.data.session.metadata`

3. ✅ **Auto-save dengan Metadata Callback**
   - File: `src/pages/psychology/public/test/[token]/[sessionId].vue`
   - Metadata callback returns current state setiap 30 detik

4. ✅ **Restore Metadata saat Load**
   - File: `src/pages/psychology/public/test/[token]/[sessionId].vue`
   - Function: `loadQuestions()`
   - Restore: `subtestTimers`, `currentSubtest`, `currentQuestionIndex`

5. ✅ **Save Final State Before Submit**
   - Both manual submit dan force submit
   - Ensures state tersimpan sebelum submit

---

## 🧪 Testing Guide

### Pre-requisites

- ✅ Backend API sudah update sesuai MD
- ✅ Database migration sudah dijalankan
- ✅ Frontend code sudah di-deploy/build

---

## Test Case 1: Subtest Timer Persistence (Priority: HIGH ⭐⭐⭐)

**Objective:** Memverifikasi subtest timer tersimpan dan ter-restore dengan benar

### Steps:

1. **Login dan Start CFIT Test**
   ```
   - Buka invitation link
   - Start CFIT test
   - Masuk ke subtest pertama (Series)
   ```

2. **Answer Questions**
   ```
   - Jawab 3-5 soal di subtest pertama
   - Perhatikan timer countdown (misal: dari 600s → 540s)
   ```

3. **Wait for Auto-save**
   ```
   - Tunggu 30 detik (auto-save interval)
   - Check console log: "✅ Auto-save successful"
   - Check Network tab: POST request ke /save endpoint
   - Verify request body contains metadata
   ```

4. **Refresh Halaman (F5)**
   ```
   - Hard refresh browser (Ctrl + F5)
   - Halaman reload
   ```

5. **Verify Restoration**
   ```
   ✅ PASS jika:
   - Timer restored ke nilai sebelum refresh (≈540s, bukan 600s)
   - Current question index restored
   - Jawaban yang sudah diisi masih ada
   - Current subtest restored (Series)
   
   ❌ FAIL jika:
   - Timer reset ke 600s (nilai default)
   - Kembali ke question pertama
   - Jawaban hilang
   ```

6. **Check Console Logs**
   ```javascript
   // Expected logs:
   "✅ Restored subtest timers from backend: {series: 540, ...}"
   "✅ Restored current subtest: series"
   "✅ Restored question index: 4"
   ```

---

## Test Case 2: Force Submit dengan Network Issue (Priority: HIGH ⭐⭐⭐)

**Objective:** Memverifikasi error handling saat force submit gagal

### Steps:

1. **Start CFIT Test**
   ```
   - Login dan start test
   - Jawab beberapa soal (minimal 10 soal)
   ```

2. **Simulate Bad Network**
   ```
   - Buka Chrome DevTools (F12)
   - Tab: Network
   - Set throttling: "Slow 3G" atau "Offline"
   ```

3. **Wait for Timer Expiry**
   ```
   Option A: Wait naturally (untuk subtest pertama)
   Option B: Manual trigger via console (DEV only):
     - remainingTime.value = 1
     - Wait 1 second
   ```

4. **Force Submit Triggered**
   ```
   - Timer habis (0:00)
   - Auto force submit triggered
   ```

5. **Verify Error Message**
   ```
   ✅ PASS jika muncul error:
   "Waktu habis dan terjadi kesalahan saat mengirim jawaban. 
    Jawaban Anda telah disimpan. Silakan refresh halaman untuk 
    mencoba mengirim ulang, atau hubungi administrator jika 
    masalah berlanjut."
   
   ❌ FAIL jika:
   - Error message tidak informatif
   - Tidak ada instruksi untuk user
   ```

6. **Verify State Saved**
   ```
   - Check Network tab
   - Harus ada request POST /save sebelum submit
   - Check request body contains metadata dan answers
   ```

7. **Restore Network & Refresh**
   ```
   - Set throttling kembali: "Online" atau "No throttling"
   - Refresh halaman (F5)
   ```

8. **Verify Recovery**
   ```
   ✅ PASS jika:
   - Jawaban ter-restore dari backend
   - Current position ter-restore
   - Bisa retry submit (manual atau auto)
   
   ❌ FAIL jika:
   - Data hilang
   - Tidak bisa retry
   ```

---

## Test Case 3: Manual Submit dengan Metadata (Priority: MEDIUM ⭐⭐)

**Objective:** Memverifikasi manual submit menyimpan final state

### Steps:

1. **Start Test**
   ```
   - Start CFIT test
   - Jawab semua soal atau sebagian (sesuai allowSkip config)
   ```

2. **Click Submit Button**
   ```
   - Click tombol "Selesai"
   - Modal konfirmasi muncul
   - Click "Ya, Kirim Jawaban"
   ```

3. **Monitor Network Request**
   ```
   - Check Network tab
   - Harus ada 2 requests:
     1. POST /save (with metadata)
     2. POST /submit (with answers)
   ```

4. **Verify Success**
   ```
   ✅ PASS jika:
   - Redirect ke access page
   - Session status = "completed"
   - Final state tersimpan di database
   
   ❌ FAIL jika:
   - Submit gagal
   - Tidak redirect
   - State tidak tersimpan
   ```

---

## Test Case 4: Multiple Subtest Transition (Priority: HIGH ⭐⭐⭐)

**Objective:** Memverifikasi timer tracking untuk multiple subtest

### Steps:

1. **Start CFIT Test**
   ```
   - Start test
   - Masuk subtest pertama (Series)
   ```

2. **Complete First Subtest**
   ```
   - Jawab semua soal di subtest Series
   - Click "Lanjut ke Subtest Berikutnya"
   ```

3. **Enter Second Subtest**
   ```
   - Masuk subtest Classification
   - Timer untuk Classification dimulai (fresh 600s)
   ```

4. **Answer Some Questions**
   ```
   - Jawab 2-3 soal di Classification
   - Wait for auto-save (30s)
   ```

5. **Refresh Halaman**
   ```
   - Hard refresh (Ctrl + F5)
   ```

6. **Verify Multi-Subtest State**
   ```
   ✅ PASS jika:
   - Current subtest = Classification (bukan Series)
   - Timer Classification restored (≈560s)
   - Timer Series = 0 (sudah habis)
   - Current question index restored
   
   ❌ FAIL jika:
   - Kembali ke subtest Series
   - Timer Classification = 600s (reset)
   - Semua timer reset
   ```

7. **Check Metadata Structure**
   ```javascript
   // Expected metadata in backend:
   {
     "subtestTimers": {
       "series": 0,              // Already expired
       "classification": 560,    // Current subtest
       "matrices": 600,          // Not started yet
       // ... other subtests
     },
     "currentSubtest": "classification",
     "currentQuestionIndex": 15
   }
   ```

---

## Test Case 5: Retry Mechanism (Priority: MEDIUM ⭐⭐)

**Objective:** Memverifikasi retry dengan exponential backoff bekerja

### Steps:

1. **Start Test**
   ```
   - Start CFIT test
   - Jawab beberapa soal
   ```

2. **Simulate Intermittent Network**
   ```
   - Chrome DevTools → Network
   - Enable "Slow 3G"
   - Jangan set "Offline" (biar masih bisa retry)
   ```

3. **Wait for Auto-save**
   ```
   - Tunggu 30 detik
   - Auto-save akan triggered
   ```

4. **Monitor Console Logs**
   ```
   Expected logs (if retry needed):
   "Auto-save attempt 1 failed, retrying in 1000ms..."
   "Auto-save attempt 2 failed, retrying in 2000ms..."
   
   Then either:
   "✅ Auto-save succeeded after X attempt(s)"
   OR
   "Auto-save failed after 3 attempts"
   ```

5. **Check Event Logs**
   ```
   ✅ PASS jika:
   - Log event: "autosave_recovered" (jika berhasil setelah retry)
   - OR log event: "autosave_error" (jika gagal semua)
   - Log contains: attempts count
   
   ❌ FAIL jika:
   - Tidak ada retry
   - Langsung error tanpa retry
   ```

---

## Test Case 6: Concurrent Auto-save Prevention (Priority: LOW ⭐)

**Objective:** Memverifikasi tidak ada concurrent save

### Steps:

1. **Start Test**
   ```
   - Start test dengan network slow
   ```

2. **Force Multiple Saves**
   ```
   - Via console (DEV):
     saveProgress(token.value, sessionId.value)
     saveProgress(token.value, sessionId.value)
     saveProgress(token.value, sessionId.value)
   ```

3. **Verify Behavior**
   ```
   ✅ PASS jika:
   - Hanya 1 request aktif di Network tab
   - Console log: save request di-skip karena saving.value = true
   
   ❌ FAIL jika:
   - Multiple concurrent requests
   - Race condition
   ```

---

## 🐛 Common Issues & Solutions

### Issue 1: Timer Tidak Ter-restore
**Symptom:** Timer reset ke nilai default setelah refresh

**Possible Causes:**
1. Backend tidak mengembalikan metadata
2. Metadata format salah
3. Frontend tidak restore dengan benar

**Debug Steps:**
```javascript
// Check response di Network tab
// Expected response structure:
{
  "data": {
    "metadata": {
      "subtestTimers": {...},
      "currentSubtest": "series"
    }
  }
}

// Check console logs
// Should see: "✅ Restored subtest timers from backend: ..."
```

**Solution:**
- Verify backend response format
- Check if metadata is in `response.data.metadata` or `response.data.session.metadata`
- Frontend handles both locations

---

### Issue 2: Auto-save Tidak Include Metadata
**Symptom:** Request body tidak ada field metadata

**Debug Steps:**
```javascript
// Check auto-save request di Network tab
// Request body should have:
{
  "answers": {...},
  "metadata": {
    "subtestTimers": {...},
    "currentSubtest": "series",
    "currentQuestionIndex": 5
  }
}
```

**Solution:**
- Verify metadata callback di startAutoSave() returns object
- Check if subtestTimers.value, currentSubtestCode.value populated

---

### Issue 3: Force Submit Error Message Tidak Muncul
**Symptom:** Error saat submit tapi tidak ada message ke user

**Debug Steps:**
```javascript
// Check error.value di Vue DevTools
// Check console for error logs
```

**Solution:**
- Verify error.value assignment di catch block
- Check if error modal/alert displayed correctly

---

## 📊 Success Criteria

Test dianggap PASS jika:

- ✅ Test Case 1: PASS (Timer persistence)
- ✅ Test Case 2: PASS (Force submit error handling)
- ✅ Test Case 3: PASS (Manual submit)
- ✅ Test Case 4: PASS (Multiple subtest)
- ✅ Test Case 5: PASS (Retry mechanism)

Test Case 6 optional tapi recommended.

---

## 📝 Test Results Template

```markdown
## Test Execution Results

**Date:** 2025-12-24
**Tester:** [Your Name]
**Environment:** [Production/Staging/Development]

### Test Case 1: Subtest Timer Persistence
- Status: [ ] PASS / [ ] FAIL
- Notes: 
- Screenshot: [link]

### Test Case 2: Force Submit dengan Network Issue
- Status: [ ] PASS / [ ] FAIL
- Notes:
- Screenshot: [link]

### Test Case 3: Manual Submit dengan Metadata
- Status: [ ] PASS / [ ] FAIL
- Notes:
- Screenshot: [link]

### Test Case 4: Multiple Subtest Transition
- Status: [ ] PASS / [ ] FAIL
- Notes:
- Screenshot: [link]

### Test Case 5: Retry Mechanism
- Status: [ ] PASS / [ ] FAIL
- Notes:
- Screenshot: [link]

### Test Case 6: Concurrent Auto-save Prevention
- Status: [ ] PASS / [ ] FAIL
- Notes:
- Screenshot: [link]

---

### Overall Result: [ ] PASS / [ ] FAIL

### Issues Found:
1. [Issue description]
2. [Issue description]

### Recommendations:
1. [Recommendation]
2. [Recommendation]
```

---

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] All test cases PASS in staging
- [ ] Backend API verified working
- [ ] Database migration successful
- [ ] No console errors in browser
- [ ] Performance acceptable (auto-save tidak lag)
- [ ] Mobile testing done (responsive)
- [ ] Error logging configured
- [ ] Monitoring alerts set up

---

## 📞 Contact

**Frontend Team:** [Your contact]
**Backend Team:** [Backend contact]
**Documentation:** [CFIT-SUBTEST-TIMER-PERSISTENCE.md](./CFIT-SUBTEST-TIMER-PERSISTENCE.md)
