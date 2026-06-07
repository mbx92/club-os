import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

/**
 * Composable untuk mengelola database backup & restore
 */
export function useDatabaseBackup() {
  const api = useApi()
  const { showSuccess, showError } = useNotification()

  // State
  const backups = ref([])
  const databaseInfo = ref(null)
  const isLoading = ref(false)
  const isCreatingBackup = ref(false)

  /**
   * Fetch all backups
   */
  const fetchBackups = async () => {
    isLoading.value = true
    try {
      const response = await api.get('/admin/database/backups')

      if (response.success) {
        backups.value = response.data.backups || []
        console.log('[useDatabaseBackup] Backups fetched:', backups.value.length)
        return backups.value
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to load backups'
      showError(errorMessage)
      console.error('[useDatabaseBackup] Fetch Error:', err)
      backups.value = []
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Create new backup
   */
  const createBackup = async () => {
    isCreatingBackup.value = true
    try {
      const response = await api.post('/admin/database/backup')

      if (response.success) {
        console.log('[useDatabaseBackup] Backup created:', response.data)
        showSuccess(`Backup created successfully: ${response.data.filename}`)
        
        // Refresh backups list
        await fetchBackups()
        
        return response.data
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to create backup'
      showError(errorMessage)
      console.error('[useDatabaseBackup] Create Error:', err)
      throw err
    } finally {
      isCreatingBackup.value = false
    }
  }

  /**
   * Download backup file
   */
  const downloadBackup = async (filename) => {
    try {
      const response = await api(`/admin/database/download/${filename}`, {
        responseType: 'blob'
      })
      
      // Create blob and download
      const blob = new Blob([response], { type: 'application/sql' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      showSuccess('Backup file downloaded successfully')
      console.log('[useDatabaseBackup] Downloaded:', filename)
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to download backup'
      showError(errorMessage)
      console.error('[useDatabaseBackup] Download Error:', err)
    }
  }

  /**
   * Delete backup file
   */
  const deleteBackup = async (filename) => {
    try {
      const response = await api.delete(`/admin/database/backups/${filename}`)

      if (response.success) {
        console.log('[useDatabaseBackup] Backup deleted:', filename)
        showSuccess('Backup file deleted successfully')
        
        // Refresh backups list
        await fetchBackups()
        
        return true
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to delete backup'
      showError(errorMessage)
      console.error('[useDatabaseBackup] Delete Error:', err)
      return false
    }
  }

  /**
   * Get database information
   */
  const fetchDatabaseInfo = async () => {
    try {
      const response = await api.get('/admin/database/info')

      if (response.success) {
        databaseInfo.value = response.data
        console.log('[useDatabaseBackup] Database info fetched:', databaseInfo.value)
        return databaseInfo.value
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to load database info'
      showError(errorMessage)
      console.error('[useDatabaseBackup] Info Error:', err)
      databaseInfo.value = null
    }
  }

  return {
    // State
    backups,
    databaseInfo,
    isLoading,
    isCreatingBackup,

    // Methods
    fetchBackups,
    createBackup,
    downloadBackup,
    deleteBackup,
    fetchDatabaseInfo
  }
}
