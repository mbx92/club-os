# Psychology PDF Report - Frontend Integration Guide

## Overview

Dokumentasi integrasi frontend Vue 3 untuk fitur download PDF report hasil tes psikologi. PDF di-generate di backend menggunakan PDFKit dan di-cache selama 24 jam.

## New Feature: Analisis per Aspek

PDF report sekarang menyertakan section **"Analisis per Aspek"** yang mengelompokkan skor berdasarkan aspek psikologis seperti:

- **Intelegensi** - Kemampuan berpikir analitis dan pemecahan masalah
- **Stabilitas Emosi** - Kemampuan mengendalikan emosi dan tetap tenang
- **Kepercayaan Diri** - Keyakinan terhadap kemampuan diri
- **Kepemimpinan** - Kemampuan memimpin dan mempengaruhi
- **Hubungan Sosial** - Kemampuan berinteraksi dengan orang lain
- **Motivasi Kerja** - Dorongan untuk mencapai prestasi
- dll.

Setiap aspek menampilkan:
- Nama aspek dengan deskripsi
- Rata-rata skor (percentage bar)
- Skala-skala individual yang termasuk dalam aspek tersebut

---

## API Endpoints

### 1. Generate PDF Report

```
POST /api/v1/psychology/reports/:sessionId/pdf
```

**Request Body:**
```json
{
  "reportType": "full",           // "full" | "summary"
  "forceRegenerate": false,       // true = bypass cache
  "options": {
    "includeCharts": true,
    "includeRawScores": false,
    "language": "id"              // "id" | "en"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "downloadUrl": "/api/v1/psychology/reports/download/abc123-uuid",
    "fileName": "report-full-john-doe-1733123456789.pdf",
    "fileSize": 45678,
    "fileSizeFormatted": "44.61 KB",
    "expiresAt": "2025-12-03T10:00:00Z",
    "expiresIn": "23 hours 45 minutes",
    "cached": true
  }
}
```

### 2. Download PDF File

```
GET /api/v1/psychology/reports/download/:cacheId
```

**Response:** Binary PDF file stream

**Headers:**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="report-xxx.pdf"
Content-Length: 45678
```

### 3. Check Report Status

```
GET /api/v1/psychology/reports/:sessionId/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "uuid",
    "sessionStatus": "completed",
    "canGenerateReport": true,
    "reports": [
      {
        "cacheId": "uuid",
        "reportType": "full",
        "fileName": "report-full-xxx.pdf",
        "fileSize": 45678,
        "fileSizeFormatted": "44.61 KB",
        "generatedAt": "2025-12-02T10:00:00Z",
        "expiresAt": "2025-12-03T10:00:00Z",
        "isExpired": false,
        "expiresIn": "23 hours",
        "downloadCount": 3,
        "lastDownloadedAt": "2025-12-02T14:00:00Z",
        "downloadUrl": "/api/v1/psychology/reports/download/uuid"
      }
    ],
    "availableReportTypes": ["full", "summary"]
  }
}
```

### 4. Delete Report Cache (Admin)

```
DELETE /api/v1/psychology/reports/:sessionId/cache
```

**Response:**
```json
{
  "success": true,
  "message": "Deleted 2 cached report(s)"
}
```

### 5. Get Cache Statistics (Admin)

```
GET /api/v1/psychology/reports/cache/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalReports": 150,
    "totalSize": 67890123,
    "totalSizeFormatted": "64.75 MB",
    "totalDownloads": 523
  }
}
```

---

## Report Types

| Type | Description | Content | Pages |
|------|-------------|---------|-------|
| `full` | Laporan lengkap | Cover, Data Peserta, Semua Skor, Analisis Visual, Interpretasi, Key Findings | 5-7 |
| `summary` | Ringkasan singkat | Quick Summary, Top 5 Skor, Interpretasi Singkat | 1-2 |

---

## Prerequisites

Session harus memenuhi kondisi:
- **Status**: `completed` atau `verified`
- **Tenant**: Session milik tenant yang sama dengan user

---

## Vue 3 Integration

### 1. Composable: usePsychologyReport

```javascript
// composables/usePsychologyReport.js
import { ref, computed } from 'vue'
import { useApi } from '@/composables/useApi'

export function usePsychologyReport() {
  const { api } = useApi()
  
  const loading = ref(false)
  const generating = ref(false)
  const downloading = ref(false)
  const error = ref(null)
  const reportStatus = ref(null)

  /**
   * Generate PDF report
   * @param {string} sessionId - Session UUID
   * @param {Object} options - Report options
   * @returns {Promise<Object>} Generate result with downloadUrl
   */
  async function generateReport(sessionId, options = {}) {
    generating.value = true
    error.value = null
    
    try {
      const response = await api.post(`/psychology/reports/${sessionId}/pdf`, {
        reportType: options.reportType || 'full',
        forceRegenerate: options.forceRegenerate || false,
        options: {
          includeCharts: options.includeCharts !== false,
          includeRawScores: options.includeRawScores || false,
          language: options.language || 'id'
        }
      })
      
      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Gagal generate report'
      throw err
    } finally {
      generating.value = false
    }
  }

  /**
   * Download PDF file from cache
   * @param {string} cacheId - Cache UUID
   * @param {string} fileName - Filename for download
   */
  async function downloadReport(cacheId, fileName = 'psychology-report.pdf') {
    downloading.value = true
    error.value = null
    
    try {
      const response = await api.get(`/psychology/reports/download/${cacheId}`, {
        responseType: 'blob'
      })
      
      // Create blob URL and trigger download
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', fileName)
      document.body.appendChild(link)
      link.click()
      
      // Cleanup
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      return true
    } catch (err) {
      // Handle expired report
      if (err.response?.status === 410) {
        error.value = 'Report sudah expired. Silakan generate ulang.'
      } else {
        error.value = err.response?.data?.message || 'Gagal download report'
      }
      throw err
    } finally {
      downloading.value = false
    }
  }

  /**
   * Generate and immediately download PDF
   * @param {string} sessionId - Session UUID
   * @param {Object} options - Report options
   */
  async function generateAndDownload(sessionId, options = {}) {
    loading.value = true
    error.value = null
    
    try {
      // Step 1: Generate
      const result = await generateReport(sessionId, options)
      
      if (!result.success) {
        throw new Error(result.message || 'Generate failed')
      }
      
      // Step 2: Download
      const cacheId = extractCacheId(result.data.downloadUrl)
      await downloadReport(cacheId, result.data.fileName)
      
      return result
    } catch (err) {
      // Error already set in sub-functions
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Check report cache status for a session
   * @param {string} sessionId - Session UUID
   */
  async function checkReportStatus(sessionId) {
    loading.value = true
    error.value = null
    
    try {
      const response = await api.get(`/psychology/reports/${sessionId}/status`)
      reportStatus.value = response.data.data
      return response.data.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Gagal cek status report'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Download existing cached report (if available)
   * @param {string} sessionId - Session UUID
   * @param {string} reportType - Report type
   */
  async function downloadCachedReport(sessionId, reportType = 'full') {
    loading.value = true
    error.value = null
    
    try {
      // Check if cached report exists
      const status = await checkReportStatus(sessionId)
      
      const cachedReport = status.reports?.find(
        r => r.reportType === reportType && !r.isExpired
      )
      
      if (cachedReport) {
        // Download existing
        await downloadReport(cachedReport.cacheId, cachedReport.fileName)
        return { cached: true, ...cachedReport }
      } else {
        // Generate new
        return await generateAndDownload(sessionId, { reportType })
      }
    } finally {
      loading.value = false
    }
  }

  /**
   * Delete cached reports for a session (admin)
   * @param {string} sessionId - Session UUID
   */
  async function deleteCache(sessionId) {
    loading.value = true
    
    try {
      const response = await api.delete(`/psychology/reports/${sessionId}/cache`)
      reportStatus.value = null
      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Gagal hapus cache'
      throw err
    } finally {
      loading.value = false
    }
  }

  // Helper: Extract cacheId from downloadUrl
  function extractCacheId(downloadUrl) {
    return downloadUrl.split('/').pop()
  }

  // Computed: Check if any operation is in progress
  const isLoading = computed(() => loading.value || generating.value || downloading.value)

  // Computed: Has cached report
  const hasCachedReport = computed(() => {
    return reportStatus.value?.reports?.some(r => !r.isExpired) || false
  })

  // Computed: Can generate report
  const canGenerate = computed(() => {
    return reportStatus.value?.canGenerateReport || false
  })

  return {
    // State
    loading,
    generating,
    downloading,
    error,
    reportStatus,
    
    // Computed
    isLoading,
    hasCachedReport,
    canGenerate,
    
    // Methods
    generateReport,
    downloadReport,
    generateAndDownload,
    checkReportStatus,
    downloadCachedReport,
    deleteCache
  }
}
```

---

### 2. Component: Download Button

```vue
<!-- components/psychology/PdfDownloadButton.vue -->
<template>
  <div class="pdf-download">
    <!-- Single Download Button -->
    <button
      v-if="!showOptions"
      @click="handleQuickDownload"
      :disabled="isLoading || !canDownload"
      :class="['btn', 'btn-primary', { 'btn-loading': isLoading }]"
    >
      <template v-if="generating">
        <span class="spinner"></span>
        Generating PDF...
      </template>
      <template v-else-if="downloading">
        <span class="spinner"></span>
        Downloading...
      </template>
      <template v-else>
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M12 3v12m0 0l-4-4m4 4l4-4M3 17v2a2 2 0 002 2h14a2 2 0 002-2v-2" 
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Download PDF
      </template>
    </button>

    <!-- Dropdown with Options -->
    <div v-else class="dropdown">
      <button
        @click="toggleDropdown"
        :disabled="isLoading || !canDownload"
        class="btn btn-primary dropdown-toggle"
      >
        <template v-if="isLoading">
          <span class="spinner"></span>
          {{ loadingText }}
        </template>
        <template v-else>
          📄 Download Report
        </template>
      </button>

      <div v-if="dropdownOpen" class="dropdown-menu">
        <button @click="handleDownload('full')" class="dropdown-item">
          📋 Full Report
          <span class="text-muted">Laporan lengkap (5-7 halaman)</span>
        </button>
        <button @click="handleDownload('summary')" class="dropdown-item">
          📝 Summary Report
          <span class="text-muted">Ringkasan (1-2 halaman)</span>
        </button>
        <hr v-if="hasCachedReport" />
        <button 
          v-if="hasCachedReport" 
          @click="handleForceRegenerate" 
          class="dropdown-item text-warning"
        >
          🔄 Regenerate Report
          <span class="text-muted">Buat ulang PDF baru</span>
        </button>
      </div>
    </div>

    <!-- Error Message -->
    <div v-if="error" class="error-toast">
      {{ error }}
      <button @click="error = null" class="close-btn">&times;</button>
    </div>

    <!-- Cannot Download Notice -->
    <p v-if="!canDownload && session" class="text-muted text-sm mt-2">
      <template v-if="session.status === 'in_progress'">
        ⏳ Tes masih berlangsung
      </template>
      <template v-else-if="session.status === 'pending'">
        ⏳ Tes belum dimulai
      </template>
      <template v-else>
        ❌ Report tidak tersedia untuk status: {{ session.status }}
      </template>
    </p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { usePsychologyReport } from '@/composables/usePsychologyReport'

const props = defineProps({
  sessionId: {
    type: String,
    required: true
  },
  session: {
    type: Object,
    default: null
  },
  showOptions: {
    type: Boolean,
    default: false
  },
  defaultType: {
    type: String,
    default: 'full'
  }
})

const emit = defineEmits(['downloaded', 'error'])

const {
  generating,
  downloading,
  error,
  reportStatus,
  isLoading,
  hasCachedReport,
  canGenerate,
  generateAndDownload,
  checkReportStatus,
  downloadCachedReport
} = usePsychologyReport()

const dropdownOpen = ref(false)

// Can download if session completed/verified
const canDownload = computed(() => {
  if (props.session) {
    return ['completed', 'verified'].includes(props.session.status)
  }
  return canGenerate.value
})

// Loading text
const loadingText = computed(() => {
  if (generating.value) return 'Generating...'
  if (downloading.value) return 'Downloading...'
  return 'Loading...'
})

// Toggle dropdown
function toggleDropdown() {
  dropdownOpen.value = !dropdownOpen.value
}

// Close dropdown when clicking outside
function handleClickOutside(e) {
  if (!e.target.closest('.dropdown')) {
    dropdownOpen.value = false
  }
}

// Quick download (default type)
async function handleQuickDownload() {
  await handleDownload(props.defaultType)
}

// Download with specific type
async function handleDownload(reportType) {
  dropdownOpen.value = false
  
  try {
    const result = await downloadCachedReport(props.sessionId, reportType)
    emit('downloaded', result)
  } catch (err) {
    emit('error', err)
  }
}

// Force regenerate
async function handleForceRegenerate() {
  dropdownOpen.value = false
  
  try {
    const result = await generateAndDownload(props.sessionId, {
      reportType: props.defaultType,
      forceRegenerate: true
    })
    emit('downloaded', result)
  } catch (err) {
    emit('error', err)
  }
}

// Check status on mount
onMounted(() => {
  if (props.sessionId) {
    checkReportStatus(props.sessionId).catch(() => {})
  }
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.pdf-download {
  position: relative;
  display: inline-block;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #2563eb;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #1d4ed8;
}

.btn-primary:disabled {
  background: #93c5fd;
  cursor: not-allowed;
}

.btn-loading {
  pointer-events: none;
}

.icon {
  width: 18px;
  height: 18px;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.dropdown {
  position: relative;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  min-width: 250px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.15);
  z-index: 1000;
  overflow: hidden;
}

.dropdown-item {
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 12px 16px;
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
  transition: background 0.2s;
}

.dropdown-item:hover {
  background: #f1f5f9;
}

.dropdown-item .text-muted {
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
}

.error-toast {
  position: fixed;
  bottom: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #fef2f2;
  color: #dc2626;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.close-btn {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  opacity: 0.6;
}

.close-btn:hover {
  opacity: 1;
}

.text-muted {
  color: #64748b;
}

.text-sm {
  font-size: 13px;
}

.text-warning {
  color: #d97706;
}

.mt-2 {
  margin-top: 8px;
}
</style>
```

---

### 3. Usage Examples

#### Basic Usage
```vue
<template>
  <PdfDownloadButton :session-id="session.id" :session="session" />
</template>
```

#### With Dropdown Options
```vue
<template>
  <PdfDownloadButton 
    :session-id="session.id" 
    :session="session"
    show-options
    @downloaded="onDownloaded"
    @error="onError"
  />
</template>

<script setup>
function onDownloaded(result) {
  console.log('Downloaded:', result.fileName)
}

function onError(err) {
  console.error('Download failed:', err)
}
</script>
```

#### In Session Detail Page
```vue
<template>
  <div class="session-detail">
    <header class="session-header">
      <h1>{{ session.testType.name }}</h1>
      <div class="actions">
        <PdfDownloadButton 
          :session-id="session.id"
          :session="session"
          show-options
        />
      </div>
    </header>

    <div class="session-content">
      <!-- Session details... -->
    </div>
  </div>
</template>
```

#### Programmatic Download
```vue
<script setup>
import { usePsychologyReport } from '@/composables/usePsychologyReport'

const { generateAndDownload, isLoading, error } = usePsychologyReport()

async function downloadFullReport(sessionId) {
  try {
    await generateAndDownload(sessionId, {
      reportType: 'full',
      language: 'id'
    })
    
    // Show success notification
    notify.success('Report berhasil didownload')
  } catch (err) {
    notify.error(err.message)
  }
}
</script>
```

---

### 4. Report Status Component

```vue
<!-- components/psychology/ReportStatusBadge.vue -->
<template>
  <div class="report-status" v-if="status">
    <div v-for="report in status.reports" :key="report.cacheId" class="report-item">
      <span class="report-type">{{ formatType(report.reportType) }}</span>
      
      <span v-if="report.isExpired" class="badge badge-expired">
        Expired
      </span>
      <span v-else class="badge badge-ready">
        Ready
      </span>
      
      <span class="report-meta">
        {{ report.fileSizeFormatted }} • 
        {{ report.downloadCount }} downloads
      </span>
      
      <button 
        v-if="!report.isExpired"
        @click="$emit('download', report)"
        class="btn-sm"
      >
        Download
      </button>
    </div>
    
    <p v-if="status.reports.length === 0" class="no-reports">
      Belum ada report. Klik download untuk generate.
    </p>
  </div>
</template>

<script setup>
defineProps({
  status: Object
})

defineEmits(['download'])

function formatType(type) {
  return type === 'full' ? 'Full Report' : 'Summary'
}
</script>
```

---

## Error Handling

### HTTP Status Codes

| Status | Meaning | Action |
|--------|---------|--------|
| `200` | Success | Download file |
| `400` | Session not completed | Show message, wait until test done |
| `404` | Session/Cache not found | Check session ID |
| `410` | Report expired | Regenerate report |
| `500` | Server error | Retry or contact support |

### Error Messages

```javascript
const ERROR_MESSAGES = {
  'SESSION_NOT_FOUND': 'Session tidak ditemukan',
  'CANNOT_GENERATE_INCOMPLETE': 'Tidak dapat generate report. Tes belum selesai.',
  'REPORT_EXPIRED': 'Report sudah expired. Silakan generate ulang.',
  'FILE_NOT_FOUND': 'File report tidak ditemukan. Silakan generate ulang.',
  'PERMISSION_DENIED': 'Anda tidak memiliki akses ke report ini.'
}

function getErrorMessage(error) {
  const code = error.response?.data?.code
  return ERROR_MESSAGES[code] || error.response?.data?.message || 'Terjadi kesalahan'
}
```

---

## Best Practices

### 1. Check Status Before Download
```javascript
// Avoid unnecessary generation
async function smartDownload(sessionId) {
  const status = await checkReportStatus(sessionId)
  
  const cached = status.reports?.find(r => 
    r.reportType === 'full' && !r.isExpired
  )
  
  if (cached) {
    // Use cached
    await downloadReport(cached.cacheId, cached.fileName)
  } else {
    // Generate new
    await generateAndDownload(sessionId)
  }
}
```

### 2. Show Loading State
```vue
<button :disabled="isLoading">
  <span v-if="generating">Generating PDF...</span>
  <span v-else-if="downloading">Downloading...</span>
  <span v-else>Download PDF</span>
</button>
```

### 3. Handle Expired Reports
```javascript
async function downloadWithRetry(cacheId, sessionId, fileName) {
  try {
    await downloadReport(cacheId, fileName)
  } catch (err) {
    if (err.response?.status === 410) {
      // Report expired, regenerate
      await generateAndDownload(sessionId)
    } else {
      throw err
    }
  }
}
```

### 4. Preload Report Status
```javascript
// In session list page
async function loadSessions() {
  const sessions = await api.get('/psychology/sessions')
  
  // Preload report status for completed sessions
  const completedIds = sessions
    .filter(s => s.status === 'completed')
    .map(s => s.id)
  
  await Promise.all(
    completedIds.map(id => checkReportStatus(id).catch(() => {}))
  )
}
```

---

## TypeScript Definitions

```typescript
// types/psychology-report.ts

interface ReportGenerateRequest {
  reportType?: 'full' | 'summary'
  forceRegenerate?: boolean
  options?: {
    includeCharts?: boolean
    includeRawScores?: boolean
    language?: 'id' | 'en'
  }
}

interface ReportGenerateResponse {
  success: boolean
  data: {
    downloadUrl: string
    fileName: string
    fileSize: number
    fileSizeFormatted: string
    expiresAt: string
    expiresIn: string
    cached: boolean
  }
}

interface ReportCacheItem {
  cacheId: string
  reportType: 'full' | 'summary'
  fileName: string
  fileSize: number
  fileSizeFormatted: string
  generatedAt: string
  expiresAt: string
  isExpired: boolean
  expiresIn: string
  downloadCount: number
  lastDownloadedAt: string | null
  downloadUrl: string | null
}

interface ReportStatusResponse {
  success: boolean
  data: {
    sessionId: string
    sessionStatus: string
    canGenerateReport: boolean
    reports: ReportCacheItem[]
    availableReportTypes: string[]
  }
}

interface ReportCacheStats {
  totalReports: number
  totalSize: number
  totalSizeFormatted: string
  totalDownloads: number
}
```

---

## Flowchart: Download Process

```
┌──────────────────────────────────────────────────────────────────┐
│                    USER CLICKS DOWNLOAD                           │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │  Session completed? │
                   └─────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │ NO                            │ YES
              ▼                               ▼
    ┌─────────────────┐            ┌─────────────────────┐
    │ Show error:     │            │ Check report status │
    │ "Test belum     │            │ GET /status         │
    │ selesai"        │            └─────────────────────┘
    └─────────────────┘                       │
                                              ▼
                                   ┌─────────────────────┐
                                   │ Has valid cache?    │
                                   └─────────────────────┘
                                              │
                              ┌───────────────┴───────────────┐
                              │ YES                           │ NO
                              ▼                               ▼
                   ┌─────────────────┐            ┌─────────────────┐
                   │ Download cached │            │ Generate new    │
                   │ GET /download   │            │ POST /pdf       │
                   └─────────────────┘            └─────────────────┘
                              │                               │
                              │                               ▼
                              │                   ┌─────────────────┐
                              │                   │ Download new    │
                              │                   │ GET /download   │
                              │                   └─────────────────┘
                              │                               │
                              └───────────────┬───────────────┘
                                              │
                                              ▼
                                   ┌─────────────────┐
                                   │ Save file to    │
                                   │ user's device   │
                                   └─────────────────┘
                                              │
                                              ▼
                                   ┌─────────────────┐
                                   │ Show success    │
                                   │ notification    │
                                   └─────────────────┘
```

---

## Related Documentation

- [PSYCHOLOGY-MODULE-FRONTEND.md](./PSYCHOLOGY-MODULE-FRONTEND.md) - Main psychology module integration
- [PHASE-12-PSYCHOLOGY-PDF-REPORT-GENERATOR.md](../plan/PHASE-12-PSYCHOLOGY-PDF-REPORT-GENERATOR.md) - Technical specification
