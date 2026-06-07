import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

/**
 * Composable untuk mengelola audit logs
 */
export function useAuditLog() {
  const api = useApi()
  const { showError, showSuccess } = useNotification()
  const isDev = import.meta.env.DEV
  
  // Logs data
  const logs = ref([])
  const logsLoading = ref(false)
  const logsError = ref(null)
  const pagination = ref({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    limit: 50,
    hasNextPage: false,
    hasPrevPage: false
  })
  
  // Statistics data
  const stats = ref(null)
  const statsLoading = ref(false)
  const statsError = ref(null)
  
  // Selected logs for bulk operations
  const selectedLogs = ref([])
  
  /**
   * Fetch logs with filters
   */
  const fetchLogs = async (filters = {}) => {
    logsLoading.value = true
    logsError.value = null
    
    try {
      const params = {
        page: filters.page || 1,
        limit: filters.limit || 50,
        level: filters.level || 'all',
        sortBy: filters.sortBy || 'createdAt',
        sortOrder: filters.sortOrder || 'DESC',
        ...(filters.action && { action: filters.action }),
        ...(filters.userId && { userId: filters.userId }),
        ...(filters.search && { search: filters.search }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        ...(filters.filterTenantId && { filterTenantId: filters.filterTenantId })
      }
      
      const response = await api.get('/logs', { params })
      
      logs.value = response.data || []
      pagination.value = response.pagination || pagination.value
      
      if (isDev) {
        console.log('[useAuditLog] Logs fetched:', logs.value.length)
      }
      
      return response
    } catch (err) {
      logsError.value = err.message || 'Failed to fetch logs'
      showError('Failed to load audit logs')
      console.error('[useAuditLog] Fetch Error:', err)
      throw err
    } finally {
      logsLoading.value = false
    }
  }
  
  /**
   * Fetch single log detail
   */
  const fetchLogDetail = async (logId) => {
    try {
      const response = await api.get(`/logs/${logId}`)
      
      if (isDev) {
        console.log('[useAuditLog] Log detail fetched:', response.data)
      }
      
      return response.data
    } catch (err) {
      showError('Failed to load log detail')
      console.error('[useAuditLog] Fetch Detail Error:', err)
      throw err
    }
  }
  
  /**
   * Fetch log statistics
   */
  const fetchStats = async (filters = {}) => {
    statsLoading.value = true
    statsError.value = null
    
    try {
      const params = {
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        ...(filters.filterTenantId && { filterTenantId: filters.filterTenantId })
      }
      
      const response = await api.get('/logs/stats', { params })
      
      stats.value = response.data || null
      
      if (isDev) {
        console.log('[useAuditLog] Stats fetched:', stats.value)
      }
      
      return response.data
    } catch (err) {
      statsError.value = err.message || 'Failed to fetch statistics'
      showError('Failed to load log statistics')
      console.error('[useAuditLog] Stats Error:', err)
      throw err
    } finally {
      statsLoading.value = false
    }
  }
  
  /**
   * Export logs to JSON file
   */
  const exportLogs = async (filters = {}) => {
    try {
      const params = {
        ...(filters.level && filters.level !== 'all' && { level: filters.level }),
        ...(filters.action && { action: filters.action }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        ...(filters.search && { search: filters.search })
      }
      
      const response = await api.get('/logs/export', { 
        params,
        responseType: 'blob'
      })
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `logs-export-${Date.now()}.json`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      
      showSuccess('Logs exported successfully')
      
      if (isDev) {
        console.log('[useAuditLog] Logs exported')
      }
    } catch (err) {
      showError('Failed to export logs')
      console.error('[useAuditLog] Export Error:', err)
      throw err
    }
  }
  
  /**
   * Delete specific logs
   */
  const deleteLogs = async (logIds) => {
    if (!logIds || logIds.length === 0) {
      showError('No logs selected')
      return
    }
    
    try {
      // Use POST to /logs/delete endpoint
      const response = await api.post('/logs/delete', { logIds })
      
      showSuccess(`${response.deletedCount} log(s) deleted successfully`)
      selectedLogs.value = []
      
      if (isDev) {
        console.log('[useAuditLog] Logs deleted:', response.deletedCount)
      }
      
      return response
    } catch (err) {
      showError('Failed to delete logs')
      console.error('[useAuditLog] Delete Error:', err)
      throw err
    }
  }
  
  /**
   * Cleanup old logs from database and files from storage
   * Hits both /logs/cleanup and /logs/cleanup-files endpoints
   */
  const cleanupLogs = async (days = 3, tenantId = null, cleanupFiles = true) => {
    try {
      const results = {
        dbDeleted: 0,
        filesDeleted: 0
      }
      
      // Cleanup database logs
      const dbResponse = await api.post('/logs/cleanup', {
        days,
        ...(tenantId && { filterTenantId: tenantId })
      })
      results.dbDeleted = dbResponse.deletedCount || 0
      
      if (isDev) {
        console.log('[useAuditLog] Database cleanup completed:', results.dbDeleted)
      }
      
      // Cleanup log files if requested
      if (cleanupFiles) {
        try {
          const filesResponse = await api.post('/logs/cleanup-files', {
            days
          })
          results.filesDeleted = filesResponse.deletedCount || 0
          
          if (isDev) {
            console.log('[useAuditLog] File cleanup completed:', results.filesDeleted)
          }
        } catch (fileErr) {
          console.error('[useAuditLog] File Cleanup Error:', fileErr)
          // Don't throw, continue even if file cleanup fails
        }
      }
      
      // Show combined success message
      const messages = []
      if (results.dbDeleted > 0) messages.push(`${results.dbDeleted} log(s)`)
      if (results.filesDeleted > 0) messages.push(`${results.filesDeleted} file(s)`)
      
      if (messages.length > 0) {
        showSuccess(`Deleted ${messages.join(' and ')} successfully`)
      } else {
        showSuccess('Cleanup completed (no items to delete)')
      }
      
      return results
    } catch (err) {
      showError('Failed to cleanup logs')
      console.error('[useAuditLog] Cleanup Error:', err)
      throw err
    }
  }
  
  /**
   * Get level badge color
   */
  const getLevelColor = (level) => {
    const colors = {
      info: 'badge-info',
      warn: 'badge-warning',
      error: 'badge-error',
      security: 'badge-secondary',
      audit: 'badge-success',
      debug: 'badge-ghost'
    }
    return colors[level] || 'badge-neutral'
  }
  
  /**
   * Format date
   */
  const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }
  
  /**
   * Toggle log selection
   */
  const toggleLogSelection = (logId) => {
    const index = selectedLogs.value.indexOf(logId)
    if (index > -1) {
      selectedLogs.value.splice(index, 1)
    } else {
      selectedLogs.value.push(logId)
    }
  }
  
  /**
   * Select all logs
   */
  const selectAllLogs = (select = true) => {
    if (select) {
      selectedLogs.value = logs.value.map(log => log.id)
    } else {
      selectedLogs.value = []
    }
  }
  
  /**
   * Reset state
   */
  const reset = () => {
    logs.value = []
    logsLoading.value = false
    logsError.value = null
    stats.value = null
    statsLoading.value = false
    statsError.value = null
    selectedLogs.value = []
    pagination.value = {
      currentPage: 1,
      totalPages: 1,
      totalRecords: 0,
      limit: 50,
      hasNextPage: false,
      hasPrevPage: false
    }
  }
  
  return {
    // State
    logs,
    logsLoading,
    logsError,
    pagination,
    stats,
    statsLoading,
    statsError,
    selectedLogs,
    
    // Methods
    fetchLogs,
    fetchLogDetail,
    fetchStats,
    exportLogs,
    deleteLogs,
    cleanupLogs,
    getLevelColor,
    formatDate,
    toggleLogSelection,
    selectAllLogs,
    reset
  }
}
