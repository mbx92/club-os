import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

export function useMainDashboard() {
  const api = useApi()
  const { handleError } = useNotification()
  const isDev = import.meta.env.DEV

  const unwrap = (res) => res?.data ?? res

  const data = ref(null)
  const loading = ref(false)
  const error = ref(null)

  const getMainDashboard = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const query = new URLSearchParams()
      if (params.locationId) query.append('locationId', params.locationId)
      const qs = query.toString()
      const endpoint = qs ? `/dashboard/main?${qs}` : '/dashboard/main'
      const res = await api.get(endpoint)
      const payload = unwrap(res)
      data.value = payload
      return payload
    } catch (err) {
      if (isDev) console.error('getMainDashboard error', err)
      error.value = err?.message || String(err)
      handleError(err, 'Failed to load dashboard')
      throw err
    } finally {
      loading.value = false
    }
  }

  const formatCurrency = (v) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v || 0)
  }

  const formatPercent = (v, d = 1) => `${(v || 0).toFixed(d)}%`

  return {
    data,
    loading,
    error,
    getMainDashboard,
    formatCurrency,
    formatPercent
  }
}
