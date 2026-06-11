import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

export function useProductionImport() {
  const api = useApi()
  const { showSuccess, showError } = useNotification()

  const sources = ref([])
  const analysis = ref(null)
  const dbStatus = ref(null)
  const loadingSources = ref(false)
  const loadingAnalysis = ref(false)
  const loadingStatus = ref(false)
  const runningAction = ref(false)

  const fetchSources = async () => {
    loadingSources.value = true
    try {
      const response = await api.get('/admin/database/import/sources')
      if (response.success) {
        sources.value = response.data.sources || []
        return sources.value
      }
    } catch (err) {
      showError(err.response?.data?.message || err.message || 'Gagal memuat daftar backup')
      sources.value = []
    } finally {
      loadingSources.value = false
    }
  }

  const analyzeSource = async (sourceId) => {
    if (!sourceId) return null
    loadingAnalysis.value = true
    try {
      const response = await api.get('/admin/database/import/analyze', {
        params: { sourceId },
      })
      if (response.success) {
        analysis.value = response.data
        return analysis.value
      }
    } catch (err) {
      showError(err.response?.data?.message || err.message || 'Gagal menganalisis backup')
      analysis.value = null
    } finally {
      loadingAnalysis.value = false
    }
  }

  const fetchDbStatus = async () => {
    loadingStatus.value = true
    try {
      const response = await api.get('/admin/database/import/status')
      if (response.success) {
        dbStatus.value = response.data
        return dbStatus.value
      }
    } catch (err) {
      showError(err.response?.data?.message || err.message || 'Gagal memuat status database')
      dbStatus.value = null
    } finally {
      loadingStatus.value = false
    }
  }

  const dropLegacyTables = async () => {
    runningAction.value = true
    try {
      const response = await api.post('/admin/database/import/drop-legacy', {
        confirm: 'DROP-LEGACY',
      })
      if (response.success) {
        showSuccess(response.message || 'Tabel legacy berhasil dihapus')
        await fetchDbStatus()
        return response.data
      }
    } catch (err) {
      showError(err.response?.data?.message || err.message || 'Gagal menghapus tabel legacy')
      throw err
    } finally {
      runningAction.value = false
    }
  }

  const runMigrations = async () => {
    runningAction.value = true
    try {
      const response = await api.post('/admin/database/import/migrate')
      if (response.success) {
        showSuccess('Migrasi berhasil dijalankan')
        await fetchDbStatus()
        return response.data
      }
    } catch (err) {
      showError(err.response?.data?.message || err.message || 'Gagal menjalankan migrasi')
      throw err
    } finally {
      runningAction.value = false
    }
  }

  const restoreSource = async (sourceId) => {
    runningAction.value = true
    try {
      const response = await api.post('/admin/database/import/restore', {
        sourceId,
        confirm: 'RESTORE',
        dropDatabase: true,
      })
      if (response.success) {
        showSuccess('Backup berhasil di-restore')
        await fetchDbStatus()
        return response.data
      }
    } catch (err) {
      showError(err.response?.data?.message || err.message || 'Gagal restore backup')
      throw err
    } finally {
      runningAction.value = false
    }
  }

  return {
    sources,
    analysis,
    dbStatus,
    loadingSources,
    loadingAnalysis,
    loadingStatus,
    runningAction,
    fetchSources,
    analyzeSource,
    fetchDbStatus,
    dropLegacyTables,
    runMigrations,
    restoreSource,
  }
}
