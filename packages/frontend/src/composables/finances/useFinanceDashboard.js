import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

/**
 * Composable for Finance Dashboard API endpoints
 * GET /finance/dashboard/overview
 * GET /finance/dashboard/summary-cards
 */
export function useFinanceDashboard() {
  const api = useApi()
  const { handleError } = useNotification()

  // State
  const overview = ref(null)
  const summaryCards = ref(null)
  const loading = ref(false)
  const overviewLoading = ref(false)
  const summaryLoading = ref(false)

  /**
   * Fetch full dashboard overview
   * Revenue, expenses, net profit, comparison to previous period,
   * revenue by module, daily trend, recent transactions
   * @param {Object} params
   * @param {String} params.startDate - YYYY-MM-DD
   * @param {String} params.endDate   - YYYY-MM-DD
   * @param {String} params.locationId
   */
  const fetchOverview = async (params = {}) => {
    overviewLoading.value = true
    try {
      const query = new URLSearchParams()
      if (params.startDate) query.append('startDate', params.startDate)
      if (params.endDate) query.append('endDate', params.endDate)
      if (params.locationId) query.append('locationId', params.locationId)

      const response = await api.get(`/finance/dashboard/overview?${query.toString()}`)
      if (response.success) {
        overview.value = response.data
        return response
      }
    } catch (error) {
      handleError(error, 'Failed to fetch dashboard overview')
      throw error
    } finally {
      overviewLoading.value = false
    }
  }

  /**
   * Fetch KPI summary cards (today, this week, this month)
   * @param {Object} params
   * @param {String} params.locationId
   */
  const fetchSummaryCards = async (params = {}) => {
    summaryLoading.value = true
    try {
      const query = new URLSearchParams()
      if (params.locationId) query.append('locationId', params.locationId)

      const response = await api.get(`/finance/dashboard/summary-cards?${query.toString()}`)
      if (response.success) {
        summaryCards.value = response.data
        return response
      }
    } catch (error) {
      handleError(error, 'Failed to fetch summary cards')
      throw error
    } finally {
      summaryLoading.value = false
    }
  }

  /**
   * Fetch both overview and summary cards
   */
  const fetchAll = async (params = {}) => {
    loading.value = true
    try {
      await Promise.all([
        fetchOverview(params),
        fetchSummaryCards(params)
      ])
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    overview,
    summaryCards,
    loading,
    overviewLoading,
    summaryLoading,

    // Methods
    fetchOverview,
    fetchSummaryCards,
    fetchAll
  }
}
