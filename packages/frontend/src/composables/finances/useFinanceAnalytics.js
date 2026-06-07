import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

/**
 * Composable for Finance Analytics (Top Selling)
 * GET /finance/analytics/top-products
 * GET /finance/analytics/top-services
 */
export function useFinanceAnalytics() {
  const api = useApi()
  const { handleError } = useNotification()

  // State
  const topProducts = ref([])
  const topServices = ref([])
  const productsLoading = ref(false)
  const servicesLoading = ref(false)
  const notSellingProducts = ref([])
  const notSellingServices = ref([])
  const notSellingProductsLoading = ref(false)
  const notSellingServicesLoading = ref(false)

  /**
   * Fetch top selling products
   * @param {Object} params
   * @param {String} params.sortBy         - 'revenue' | 'quantity'
   * @param {String} params.transactionType
   * @param {String} params.locationId
   * @param {String} params.startDate
   * @param {String} params.endDate
   * @param {Number} params.limit
   */
  const fetchTopProducts = async (params = {}) => {
    productsLoading.value = true
    try {
      const query = new URLSearchParams()
      if (params.sortBy) query.append('sortBy', params.sortBy)
      if (params.transactionType) query.append('transactionType', params.transactionType)
      if (params.locationId) query.append('locationId', params.locationId)
      if (params.startDate) query.append('startDate', params.startDate)
      if (params.endDate) query.append('endDate', params.endDate)
      if (params.limit) query.append('limit', params.limit)

      const response = await api.get(`/finance/analytics/top-products?${query.toString()}`)
      if (response.success) {
        topProducts.value = response.data?.products || response.data || []
        return response
      }
    } catch (error) {
      handleError(error, 'Failed to fetch top products')
      throw error
    } finally {
      productsLoading.value = false
    }
  }

  /**
   * Fetch top selling services / memberships
   * @param {Object} params
   * @param {String} params.sortBy        - 'revenue' | 'transactions'
   * @param {String} params.serviceType   - 'service_plan' | 'membership' | 'all'
   * @param {String} params.locationId
   * @param {String} params.startDate
   * @param {String} params.endDate
   * @param {Number} params.limit
   */
  const fetchTopServices = async (params = {}) => {
    servicesLoading.value = true
    try {
      const query = new URLSearchParams()
      if (params.sortBy) query.append('sortBy', params.sortBy)
      if (params.serviceType && params.serviceType !== 'all') query.append('serviceType', params.serviceType)
      if (params.locationId) query.append('locationId', params.locationId)
      if (params.startDate) query.append('startDate', params.startDate)
      if (params.endDate) query.append('endDate', params.endDate)
      if (params.limit) query.append('limit', params.limit)

      const response = await api.get(`/finance/analytics/top-services?${query.toString()}`)
      if (response.success) {
        topServices.value = response.data?.services || response.data || []
        return response
      }
    } catch (error) {
      handleError(error, 'Failed to fetch top services')
      throw error
    } finally {
      servicesLoading.value = false
    }
  }

  /**
   * Fetch products that had zero sales in the period
   * @param {Object} params
   * @param {String} params.startDate
   * @param {String} params.endDate
   * @param {String} params.locationId
   * @param {Number} params.limit
   */
  const fetchNotSellingProducts = async (params = {}) => {
    notSellingProductsLoading.value = true
    try {
      const query = new URLSearchParams()
      if (params.locationId) query.append('locationId', params.locationId)
      if (params.startDate) query.append('startDate', params.startDate)
      if (params.endDate) query.append('endDate', params.endDate)
      if (params.limit) query.append('limit', params.limit)

      const response = await api.get(`/finance/analytics/not-selling-products?${query.toString()}`)
      if (response.success) {
        notSellingProducts.value = response.data?.products || response.data || []
        return response
      }
    } catch (error) {
      handleError(error, 'Failed to fetch not-selling products')
      throw error
    } finally {
      notSellingProductsLoading.value = false
    }
  }

  /**
   * Fetch services/memberships that had zero sales in the period
   * @param {Object} params
   * @param {String} params.serviceType   - 'service_plan' | 'membership' | 'all'
   * @param {String} params.startDate
   * @param {String} params.endDate
   * @param {String} params.locationId
   * @param {Number} params.limit
   */
  const fetchNotSellingServices = async (params = {}) => {
    notSellingServicesLoading.value = true
    try {
      const query = new URLSearchParams()
      if (params.serviceType && params.serviceType !== 'all') query.append('serviceType', params.serviceType)
      if (params.locationId) query.append('locationId', params.locationId)
      if (params.startDate) query.append('startDate', params.startDate)
      if (params.endDate) query.append('endDate', params.endDate)
      if (params.limit) query.append('limit', params.limit)

      const response = await api.get(`/finance/analytics/not-selling-services?${query.toString()}`)
      if (response.success) {
        notSellingServices.value = response.data?.services || response.data || []
        return response
      }
    } catch (error) {
      handleError(error, 'Failed to fetch not-selling services')
      throw error
    } finally {
      notSellingServicesLoading.value = false
    }
  }

  return {
    // State
    topProducts,
    topServices,
    productsLoading,
    servicesLoading,
    notSellingProducts,
    notSellingServices,
    notSellingProductsLoading,
    notSellingServicesLoading,

    // Methods
    fetchTopProducts,
    fetchTopServices,
    fetchNotSellingProducts,
    fetchNotSellingServices
  }
}
