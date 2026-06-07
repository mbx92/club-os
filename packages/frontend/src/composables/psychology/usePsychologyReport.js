/**
 * Composable for Psychology PDF Report Generation
 * 
 * Handles:
 * - Report generation (POST /psychology/reports/:sessionId/pdf)
 * - Report download (GET /psychology/reports/download/:cacheId)
 * - Report status check (GET /psychology/reports/:sessionId/status)
 * 
 * Flow:
 * 1. Check status → if cached use it
 * 2. If not cached → generate new report
 * 3. Download the report
 */

import { ref, inject } from 'vue'
import { useNotification } from '@/composables/core/useNotification'

export function usePsychologyReport() {
  const api = inject('api')
  const { showSuccess, showError, showInfo } = useNotification()

  // State
  const generating = ref(false)
  const downloading = ref(false)
  const checkingStatus = ref(false)
  const reportInfo = ref(null)
  const error = ref(null)

  /**
   * Extract cacheId from downloadUrl
   * @param {string} downloadUrl - URL like "/api/v1/psychology/reports/download/uuid-here"
   * @returns {string|null} Extracted cacheId
   */
  const extractCacheId = (downloadUrl) => {
    if (!downloadUrl) return null
    // Extract the last segment of the URL path (the cacheId/UUID)
    const match = downloadUrl.match(/\/download\/([a-f0-9-]+)$/i)
    return match ? match[1] : null
  }

  /**
   * Check report status for a session
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object|null>} Report info if exists
   */
  const checkReportStatus = async (sessionId) => {
    checkingStatus.value = true
    error.value = null
    
    try {
      const response = await api(`/psychology/reports/${sessionId}/status`)
      const data = response?.data || response
      
      // Check if reports array has items (new format)
      if (data?.reports?.length > 0) {
        const report = data.reports[0] // Use first/latest report
        const cacheId = report.cacheId || extractCacheId(report.downloadUrl)
        reportInfo.value = {
          cacheId: cacheId,
          downloadUrl: report.downloadUrl,
          fileName: report.fileName,
          fileSize: report.fileSize,
          expiresAt: report.expiresAt,
          isExpired: report.isExpired,
          cached: true
        }
        return reportInfo.value
      }
      
      // Fallback: check old format with cached flag
      if (data?.cached) {
        const cacheId = data.cacheId || extractCacheId(data.downloadUrl)
        reportInfo.value = {
          cacheId: cacheId,
          downloadUrl: data.downloadUrl,
          fileName: data.fileName,
          fileSize: data.fileSize,
          expiresAt: data.expiresAt,
          cached: true
        }
        return reportInfo.value
      }
      
      reportInfo.value = null
      return null
    } catch (err) {
      // 404 means no cached report - not an error
      if (err?.status === 404 || err?.response?.status === 404) {
        reportInfo.value = null
        return null
      }
      error.value = err?.message || 'Gagal memeriksa status report'
      return null
    } finally {
      checkingStatus.value = false
    }
  }

  /**
   * Generate a new report for a session
   * @param {string} sessionId - Session ID
   * @param {Object} options - Generation options
   * @param {string} options.reportType - Report type (e.g., 'full', 'summary')
   * @param {boolean} options.forceRegenerate - Force regenerate even if cached
   * @param {boolean} options.includeCharts - Include charts in report
   * @returns {Promise<Object|null>} Report info if successful
   */
  const generateReport = async (sessionId, options = {}) => {
    generating.value = true
    error.value = null
    
    try {
      const payload = {
        reportType: options.reportType || 'full',
        forceRegenerate: options.forceRegenerate || false,
        includeCharts: options.includeCharts !== false // default true
      }
      
      const response = await api(`/psychology/reports/${sessionId}/pdf`, {
        method: 'POST',
        body: payload
      })
      
      const data = response?.data || response
      
      // Extract cacheId from downloadUrl if not provided directly
      const cacheId = data.cacheId || extractCacheId(data.downloadUrl)
      
      reportInfo.value = {
        cacheId: cacheId,
        downloadUrl: data.downloadUrl,
        fileName: data.fileName,
        fileSize: data.fileSize,
        expiresAt: data.expiresAt,
        cached: data.cached || false
      }
      
      if (data.cached) {
        showInfo('Report sudah tersedia, menggunakan cache')
      } else {
        showSuccess('Report berhasil dibuat')
      }
      
      return reportInfo.value
    } catch (err) {
      const message = err?.data?.message || err?.message || 'Gagal membuat report'
      error.value = message
      showError(message)
      return null
    } finally {
      generating.value = false
    }
  }

  /**
   * Download a generated report
   * @param {string} cacheId - Cache ID from generate response
   * @param {string} fileName - Optional filename for download
   * @returns {Promise<boolean>} True if download successful
   */
  const downloadReport = async (cacheId, fileName = null) => {
    if (!cacheId && reportInfo.value?.cacheId) {
      cacheId = reportInfo.value.cacheId
    }
    
    if (!cacheId) {
      showError('Cache ID tidak tersedia')
      return false
    }
    
    downloading.value = true
    error.value = null
    
    try {
      const response = await api(`/psychology/reports/download/${cacheId}`, {
        responseType: 'blob'
      })
      
      // Create blob and download
      const blob = new Blob([response], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName || reportInfo.value?.fileName || `report-${cacheId}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      showSuccess('Report berhasil diunduh')
      return true
    } catch (err) {
      // Handle expired report (410 Gone)
      if (err?.status === 410 || err?.response?.status === 410) {
        error.value = 'Report sudah kadaluarsa, silakan generate ulang'
        showError('Report sudah kadaluarsa, silakan generate ulang')
        reportInfo.value = null
        return false
      }
      
      const message = err?.data?.message || err?.message || 'Gagal mengunduh report'
      error.value = message
      showError(message)
      return false
    } finally {
      downloading.value = false
    }
  }

  /**
   * Generate and download report in one call
   * Checks status first, generates if needed, then downloads
   * @param {string} sessionId - Session ID
   * @param {Object} options - Generation options
   * @returns {Promise<boolean>} True if successful
   */
  const generateAndDownload = async (sessionId, options = {}) => {
    // First check if report is already cached
    const existingReport = await checkReportStatus(sessionId)
    
    if (existingReport && !options.forceRegenerate) {
      // Use cached report
      return await downloadReport(existingReport.cacheId, existingReport.fileName)
    }
    
    // Generate new report
    const newReport = await generateReport(sessionId, options)
    
    if (!newReport) {
      return false
    }
    
    // Download the generated report
    return await downloadReport(newReport.cacheId, newReport.fileName)
  }

  /**
   * Format expiry time for display
   * @param {string} expiresAt - ISO date string
   * @returns {string} Formatted expiry string
   */
  const formatExpiry = (expiresAt) => {
    if (!expiresAt) return '-'
    
    const expiry = new Date(expiresAt)
    const now = new Date()
    const diffMs = expiry - now
    
    if (diffMs <= 0) return 'Kadaluarsa'
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    
    if (diffHours > 0) {
      return `${diffHours} jam ${diffMins} menit lagi`
    }
    return `${diffMins} menit lagi`
  }

  /**
   * Format file size for display
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted file size
   */
  const formatFileSize = (bytes) => {
    if (!bytes) return '-'
    
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  /**
   * Clear report info (reset state)
   */
  const clearReportInfo = () => {
    reportInfo.value = null
    error.value = null
  }

  /**
   * Check if report is expired
   * @returns {boolean}
   */
  const isReportExpired = () => {
    // Check isExpired flag from API response first
    if (reportInfo.value?.isExpired === true) return true
    if (reportInfo.value?.isExpired === false) return false
    
    // Fallback: check expiresAt date
    if (!reportInfo.value?.expiresAt) return true
    return new Date(reportInfo.value.expiresAt) <= new Date()
  }

  return {
    // State
    generating,
    downloading,
    checkingStatus,
    reportInfo,
    error,
    
    // Methods
    checkReportStatus,
    generateReport,
    downloadReport,
    generateAndDownload,
    clearReportInfo,
    isReportExpired,
    
    // Formatters
    formatExpiry,
    formatFileSize
  }
}
