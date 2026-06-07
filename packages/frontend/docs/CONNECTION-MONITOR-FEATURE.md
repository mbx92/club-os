# Connection Monitor Feature - Documentation

## 📡 Overview

Fitur **Connection Monitor** memberikan real-time monitoring kualitas koneksi internet peserta selama mengerjakan test psikologi. Fitur ini membantu:

1. ✅ **Memberitahu peserta** jika koneksi buruk
2. ✅ **Mencegah kebingungan** saat auto-save gagal
3. ✅ **Memberikan rekomendasi** untuk perbaikan koneksi
4. ✅ **Monitoring & logging** untuk analisis

---

## 🎯 Features

### 1. **Real-time Connection Quality Indicator**

Visual indicator di header halaman test:

| Quality | Icon | Color | Latency | Description |
|---------|------|-------|---------|-------------|
| **Good** | 📶 | Green | < 200ms | Koneksi sangat baik |
| **Warning** | ⚠️ | Yellow | 200-500ms | Koneksi lambat |
| **Poor** | 📉 | Red | > 500ms | Koneksi sangat buruk |
| **Offline** | ❌ | Red | N/A | Tidak ada koneksi |

### 2. **Automatic Warning Alert**

Alert otomatis muncul di atas halaman test saat koneksi buruk/offline:

```
⚠️ Koneksi internet Anda sangat buruk. Disarankan untuk pindah 
   ke lokasi dengan koneksi WiFi yang lebih baik atau tunggu 
   hingga koneksi stabil.

   Jawaban Anda akan tetap tersimpan dan akan dikirim saat 
   koneksi kembali stabil.
```

### 3. **Periodic Ping Check**

- Interval: **10 detik** (configurable)
- Method: HEAD request ke `/health` endpoint
- Timeout: 5 detik
- Lightweight: Minimal data transfer

### 4. **Connection Quality Logging**

Setiap perubahan kualitas koneksi di-log untuk monitoring:

```javascript
{
  "eventType": "connection_quality_changed",
  "level": "warning",
  "data": {
    "from": "good",
    "to": "poor",
    "latency": 650,
    "isOnline": true
  },
  "message": "Connection quality changed: good → poor"
}
```

---

## 🔧 Implementation Details

### Composable: `useConnectionMonitor.js`

**Location:** `src/composables/core/useConnectionMonitor.js`

**Main Functions:**

```javascript
const {
  // State
  connectionQuality,  // 'good' | 'warning' | 'poor' | 'offline'
  pingLatency,        // Number (ms)
  isOnline,           // Boolean
  
  // Methods
  startMonitoring,    // Start periodic checks
  stopMonitoring,     // Stop monitoring
  pingServer,         // Manual ping check
  
  // UI Helpers
  getQualityLabel,    // Get display label
  getQualityColor,    // Get color class
  getQualityIcon,     // Get icon emoji
  getRecommendation,  // Get user recommendation
  shouldShowWarning   // Should show warning alert
} = useConnectionMonitor()
```

### Integration in Test Page

**Location:** `src/pages/psychology/public/test/[token]/[sessionId].vue`

**1. Header Indicator:**
```vue
<div class="tooltip tooltip-bottom" :data-tip="getQualityLabel()">
  <div 
    class="flex items-center gap-2 px-3 py-2 rounded-lg"
    :class="{
      'bg-success/20 text-success': connectionQuality === 'good',
      'bg-warning/20 text-warning': connectionQuality === 'warning',
      'bg-error/20 text-error': connectionQuality === 'poor'
    }"
  >
    <span>{{ getQualityIcon() }}</span>
    <span>{{ getQualityLabel() }}</span>
  </div>
</div>
```

**2. Warning Alert:**
```vue
<div v-if="shouldShowWarning()" class="bg-warning/10">
  <p class="text-warning">{{ getRecommendation() }}</p>
</div>
```

**3. Lifecycle:**
```javascript
onMounted(() => {
  startMonitoring(10000) // Check every 10 seconds
})

onUnmounted(() => {
  stopMonitoring()
})

// Log quality changes
watch(connectionQuality, (newQuality, oldQuality) => {
  if (oldQuality && newQuality !== oldQuality) {
    logWarning(token, sessionId, 'connection_quality_changed', {...})
  }
})
```

---

## 📊 Connection Quality Thresholds

| Quality Level | Latency Range | Auto-save Impact | Recommendation |
|--------------|---------------|------------------|----------------|
| **Good** | 0-199ms | ✅ Reliable | Continue normally |
| **Warning** | 200-499ms | ⚠️ May delay | Monitor progress |
| **Poor** | 500ms+ | ❌ Often fails | Improve connection |
| **Offline** | Timeout/No network | ❌ Will fail | Reconnect required |

---

## 🎨 UI Components

### Header Indicator (Desktop & Mobile)

**Desktop:**
```
┌──────────────────────┐
│ 📶 Koneksi Baik     │
└──────────────────────┘
```

**Mobile:**
```
┌────────┐
│   📶   │
└────────┘
```

### Warning Alert (Full Width)

```
╔═══════════════════════════════════════════════════════╗
║ ⚠️ Koneksi internet Anda sangat buruk.               ║
║    Disarankan untuk pindah ke lokasi dengan koneksi  ║
║    WiFi yang lebih baik...                           ║
╚═══════════════════════════════════════════════════════╝
```

---

## 🧪 Testing

### Test Case 1: Good Connection

**Steps:**
1. Start test dengan koneksi normal
2. Check header indicator

**Expected:**
- ✅ Icon: 📶
- ✅ Label: "Koneksi Baik"
- ✅ Color: Green
- ✅ No warning alert
- ✅ Latency: < 200ms

### Test Case 2: Slow Connection

**Steps:**
1. Chrome DevTools → Network → Slow 3G
2. Wait for ping check (10s)

**Expected:**
- ✅ Icon: ⚠️
- ✅ Label: "Koneksi Lambat"
- ✅ Color: Yellow
- ✅ Warning alert visible
- ✅ Latency: 200-500ms

### Test Case 3: Very Poor Connection

**Steps:**
1. Throttle network to very slow
2. Wait for ping check

**Expected:**
- ✅ Icon: 📉
- ✅ Label: "Koneksi Buruk"
- ✅ Color: Red
- ✅ Warning alert: "Disarankan pindah lokasi..."
- ✅ Latency: > 500ms

### Test Case 4: Offline

**Steps:**
1. Chrome DevTools → Network → Offline
2. Wait for ping check

**Expected:**
- ✅ Icon: ❌
- ✅ Label: "Tidak Ada Koneksi"
- ✅ Color: Red
- ✅ Warning alert: "Tidak ada koneksi internet..."
- ✅ Latency: 0

### Test Case 5: Connection Recovery

**Steps:**
1. Start with offline
2. Enable network
3. Wait for ping check

**Expected:**
- ✅ Quality changes: offline → good
- ✅ Log event: "connection_quality_changed"
- ✅ Warning alert disappears
- ✅ Auto-save resumed

---

## 🔐 Backend Requirements

### Health Check Endpoint (Required)

**Endpoint:** `GET /health` or `GET /api/health`

**Purpose:** Lightweight endpoint untuk ping check

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-24T10:00:00.000Z"
}
```

**Requirements:**
- ✅ Fast response (< 100ms ideal)
- ✅ No authentication required
- ✅ Minimal payload
- ✅ Support HEAD request method
- ✅ CORS enabled for public access

**Implementation Example (Node.js/Express):**

```javascript
// Health check endpoint
app.head('/health', (req, res) => {
  res.status(200).end()
})

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  })
})
```

---

## ⚙️ Configuration

### Environment Variables

```env
# API Base URL (default: http://localhost:8000/api)
VITE_API_URL=https://psy.clins.biz.id/api
```

### Customization Options

**1. Ping Interval:**
```javascript
// Default: 10 seconds
startMonitoring(10000)

// More frequent (not recommended - can increase server load)
startMonitoring(5000)

// Less frequent (save server resources)
startMonitoring(30000)
```

**2. Latency Thresholds:**

Edit in `useConnectionMonitor.js`:

```javascript
// Current thresholds
if (pingLatency.value < 200) {
  connectionQuality.value = 'good'
} else if (pingLatency.value < 500) {
  connectionQuality.value = 'warning'
} else {
  connectionQuality.value = 'poor'
}

// Custom thresholds
if (pingLatency.value < 150) {     // More strict
  connectionQuality.value = 'good'
} else if (pingLatency.value < 400) {
  connectionQuality.value = 'warning'
} else {
  connectionQuality.value = 'poor'
}
```

**3. Timeout:**

```javascript
// Current: 5 seconds
signal: AbortSignal.timeout(5000)

// Custom timeout
signal: AbortSignal.timeout(3000) // 3 seconds
```

---

## 📈 Benefits

### For Participants:
1. ✅ **Aware** of connection issues before problems occur
2. ✅ **Confidence** that answers are safe even with bad connection
3. ✅ **Clear instructions** on what to do when connection poor
4. ✅ **Less confusion** when auto-save fails

### For Administrators:
1. ✅ **Monitoring** connection quality across sessions
2. ✅ **Analytics** to identify network issues
3. ✅ **Better support** - can see connection logs
4. ✅ **Proactive** recommendations for test environment

---

## 🚀 Performance Impact

- **Network overhead:** Minimal (HEAD request every 10s)
- **Memory:** < 1KB (reactive state)
- **CPU:** Negligible (periodic timer only)
- **UX impact:** Positive (early warning system)

**Bandwidth Usage:**
- Request size: ~200 bytes (HEAD request)
- Response size: ~100 bytes (or 0 for HEAD)
- Frequency: 6 requests/minute
- **Total:** ~1.8 KB/minute (negligible)

---

## 🐛 Troubleshooting

### Issue 1: Always Shows "Offline"

**Possible Causes:**
- `/health` endpoint not configured
- CORS issues
- Wrong API URL

**Solution:**
```javascript
// Check console for errors
// Verify endpoint exists:
fetch('https://your-api.com/health')
  .then(r => console.log('OK'))
  .catch(e => console.error(e))
```

### Issue 2: Latency Always High

**Possible Causes:**
- Server too slow
- Geographic distance
- Network throttling active

**Solution:**
- Use CDN for static health check
- Optimize server response time
- Check DevTools throttling

### Issue 3: Warning Doesn't Disappear

**Possible Causes:**
- Connection still poor
- Ping not running
- Reactive state issue

**Solution:**
```javascript
// Manual check
pingServer().then(result => console.log(result))

// Check if monitoring active
console.log('Monitoring:', pingInterval !== null)
```

---

## 📞 Support

- **Feature Implementation:** `src/composables/core/useConnectionMonitor.js`
- **UI Integration:** `src/pages/psychology/public/test/[token]/[sessionId].vue`
- **Related Docs:** [CFIT-SUBTEST-TIMER-PERSISTENCE.md](./CFIT-SUBTEST-TIMER-PERSISTENCE.md)

---

## 🔄 Future Enhancements

### Potential Improvements:

1. **Adaptive Ping Interval:**
   ```javascript
   // Ping more frequently when connection poor
   if (connectionQuality === 'poor') {
     interval = 5000 // 5 seconds
   } else {
     interval = 10000 // 10 seconds
   }
   ```

2. **Connection History Graph:**
   - Show latency trend over time
   - Visual graph in test page

3. **Offline Mode:**
   - Queue save requests when offline
   - Auto-send when connection restored

4. **Smart Warnings:**
   - Only show warning after 2-3 poor checks
   - Avoid false positives from temporary spikes

5. **Network Type Detection:**
   ```javascript
   // Detect WiFi vs Mobile data
   const connection = navigator.connection
   if (connection.effectiveType === '4g') {
     // Adjust thresholds
   }
   ```

---

**Last Updated:** 2025-12-24
**Version:** 1.0.0
**Status:** Production Ready ✅
