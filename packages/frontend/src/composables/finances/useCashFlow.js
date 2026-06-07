import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

/**
 * Composable for Cash Flow Management and Analysis
 * GET /finance/cash-flow/summary
 * GET /finance/cash-flow/by-category
 * GET /finance/cash-flow/projection
 */
export function useCashFlow() {
  const api = useApi()
  const { handleError } = useNotification()

  // State — keyed to actual API response shape
  const summaryData = ref(null)       // { summary: {...}, cashFlow: [...] }
  const categoryData = ref(null)      // { inflows: [...], outflows: [...] }
  const projectionData = ref(null)    // { historical: {...}, projections: [...] }

  const summaryLoading = ref(false)
  const categoryLoading = ref(false)
  const projectionLoading = ref(false)

  /**
   * GET /finance/cash-flow/summary
   * @param {Object} params  startDate*, endDate*, groupBy, locationId
   */
  const fetchSummary = async (params = {}) => {
    summaryLoading.value = true
    try {
      const q = new URLSearchParams()
      if (params.startDate)  q.append('startDate', params.startDate)
      if (params.endDate)    q.append('endDate', params.endDate)
      if (params.groupBy)    q.append('groupBy', params.groupBy)
      if (params.locationId) q.append('locationId', params.locationId)

      const response = await api.get(`/finance/cash-flow/summary?${q.toString()}`)
      if (response.success) {
        summaryData.value = response.data
        return response
      }
    } catch (error) {
      handleError(error, 'Gagal mengambil data ringkasan arus kas')
    } finally {
      summaryLoading.value = false
    }
  }

  /**
   * GET /finance/cash-flow/by-category
   * @param {Object} params  startDate*, endDate*, type (inflow|outflow), locationId
   */
  const fetchCategoryBreakdown = async (params = {}) => {
    categoryLoading.value = true
    try {
      const q = new URLSearchParams()
      if (params.startDate)  q.append('startDate', params.startDate)
      if (params.endDate)    q.append('endDate', params.endDate)
      if (params.type && params.type !== 'both') q.append('type', params.type)
      if (params.locationId) q.append('locationId', params.locationId)

      const response = await api.get(`/finance/cash-flow/by-category?${q.toString()}`)
      if (response.success) {
        categoryData.value = response.data
        return response
      }
    } catch (error) {
      handleError(error, 'Gagal mengambil data kategori arus kas')
    } finally {
      categoryLoading.value = false
    }
  }

  /**
   * GET /finance/cash-flow/projection
   * @param {Object} params  months (default 3)
   */
  const fetchProjection = async (params = {}) => {
    projectionLoading.value = true
    try {
      const q = new URLSearchParams()
      if (params.months) q.append('months', params.months)

      const response = await api.get(`/finance/cash-flow/projection?${q.toString()}`)
      if (response.success) {
        projectionData.value = response.data
        return response
      }
    } catch (error) {
      handleError(error, 'Gagal mengambil proyeksi arus kas')
    } finally {
      projectionLoading.value = false
    }
  }

  return {
    summaryData,
    categoryData,
    projectionData,
    summaryLoading,
    categoryLoading,
    projectionLoading,
    fetchSummary,
    fetchCategoryBreakdown,
    fetchProjection,
  }
}
