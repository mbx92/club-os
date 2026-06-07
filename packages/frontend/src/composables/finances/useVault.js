import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

const defaultPagination = () => ({ page: 1, limit: 20, total: 0, totalPages: 0 })

const resolvePayload = (response) => {
  if (!response) return null
  if (response.data?.data) return response.data.data
  if (response.data) return response.data
  if (response.success !== undefined && response.data) return response.data
  return response
}

export function useVault() {
  const api = useApi()
  const { showSuccess, handleError } = useNotification()

  const summary = ref(null)
  const pendingCollectionsPreview = ref([])
  const collectibles = ref({ sessions: [], daily: [], pagination: defaultPagination() })
  const mutations = ref([])

  const summaryLoading = ref(false)
  const collectiblesLoading = ref(false)
  const mutationsLoading = ref(false)
  const actionLoading = ref(false)

  const mutationPagination = ref(defaultPagination())
  const collectiblePagination = ref({ page: 1, limit: 50, total: 0, totalPages: 0 })

  const buildQueryString = (filters = {}) => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value === '' || value === null || value === undefined) return
      params.append(key, value)
    })
    return params.toString()
  }

  const fetchSummary = async (filters = {}) => {
    summaryLoading.value = true
    try {
      const queryString = buildQueryString(filters)
      const response = await api.get(`/finance/vault/summary${queryString ? `?${queryString}` : ''}`)
      const payload = resolvePayload(response) || {}

      summary.value = payload.summary || payload
      pendingCollectionsPreview.value = payload.pendingCollectionsPreview || []

      return payload
    } catch (error) {
      handleError(error, 'Gagal memuat ringkasan vault')
      throw error
    } finally {
      summaryLoading.value = false
    }
  }

  const fetchCollectibles = async (filters = {}) => {
    collectiblesLoading.value = true
    try {
      const queryString = buildQueryString(filters)
      const response = await api.get(`/finance/vault/collectibles${queryString ? `?${queryString}` : ''}`)
      const payload = resolvePayload(response) || {}

      collectibles.value = {
        sessions: payload.sessions || [],
        daily: payload.daily || [],
        pagination: payload.pagination || collectiblePagination.value,
      }
      collectiblePagination.value = payload.pagination || collectiblePagination.value

      return collectibles.value
    } catch (error) {
      handleError(error, 'Gagal memuat cash drawer yang belum diambil')
      throw error
    } finally {
      collectiblesLoading.value = false
    }
  }

  const fetchMutations = async (filters = {}) => {
    mutationsLoading.value = true
    try {
      const queryString = buildQueryString(filters)
      const response = await api.get(`/finance/vault/mutations${queryString ? `?${queryString}` : ''}`)
      const payload = resolvePayload(response)

      if (Array.isArray(payload)) {
        mutations.value = payload
        mutationPagination.value = defaultPagination()
      } else {
        mutations.value = payload?.mutations || payload?.items || payload?.data || []
        mutationPagination.value = payload?.pagination || response?.pagination || mutationPagination.value
      }

      return {
        data: mutations.value,
        pagination: mutationPagination.value,
      }
    } catch (error) {
      handleError(error, 'Gagal memuat mutasi vault')
      throw error
    } finally {
      mutationsLoading.value = false
    }
  }

  const collectToVault = async (payload) => {
    actionLoading.value = true
    try {
      const response = await api.post('/finance/vault/collect', payload)
      showSuccess('Collect cash drawer ke vault berhasil disimpan')
      return resolvePayload(response)
    } catch (error) {
      handleError(error, 'Gagal menyimpan collect ke vault')
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  return {
    summary,
    pendingCollectionsPreview,
    collectibles,
    mutations,
    summaryLoading,
    collectiblesLoading,
    mutationsLoading,
    actionLoading,
    mutationPagination,
    collectiblePagination,
    fetchSummary,
    fetchCollectibles,
    fetchMutations,
    collectToVault,
  }
}