import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

export const usePackages = () => {
  const api = useApi()
  const { showSuccess, handleError } = useNotification()

  const packages = ref([])
  const packageData = ref(null)
  const loading = ref(false)
  const error = ref(null)

  /**
   * Fetch all packages
   * @param {Object} params - Query parameters { isActive }
   */
  const fetchPackages = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const queryParams = new URLSearchParams()
      if (params.isActive !== undefined) queryParams.append('isActive', params.isActive)

      const queryString = queryParams.toString()
      const response = await api.get(`/psychology/packages${queryString ? '?' + queryString : ''}`)
      packages.value = response.data || response || []
      return response
    } catch (err) {
      error.value = handleError(err, 'Failed to fetch packages')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get package by ID
   * @param {String} packageId - The package ID
   */
  const getPackageById = async (packageId) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.get(`/psychology/packages/${packageId}`)
      packageData.value = response.data || response
      return response.data || response
    } catch (err) {
      error.value = handleError(err, 'Failed to fetch package details')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Calculate package price
   * @param {String} packageId - The package ID
   * @param {Object} params - { quantity, promoCode, isMember }
   */
  const calculatePrice = async (packageId, params = {}) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.post(`/psychology/packages/${packageId}/calculate-price`, params)
      return response.data || response
    } catch (err) {
      error.value = handleError(err, 'Failed to calculate price')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Create a new package
   * @param {Object} packageData - Package data
   */
  const createPackage = async (data) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.post('/psychology/packages', data)
      showSuccess(response.message || 'Package created successfully')
      return response.data || response
    } catch (err) {
      error.value = handleError(err, 'Failed to create package')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Update an existing package
   * @param {String} packageId - The package ID
   * @param {Object} packageData - Updated package data
   */
  const updatePackage = async (packageId, data) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.put(`/psychology/packages/${packageId}`, data)
      showSuccess(response.message || 'Package updated successfully')
      return response.data || response
    } catch (err) {
      error.value = handleError(err, 'Failed to update package')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Delete a package
   * @param {String} packageId - The package ID
   */
  const deletePackage = async (packageId) => {
    loading.value = true
    error.value = null
    try {
      await api.delete(`/psychology/packages/${packageId}`)
      showSuccess('Package deleted successfully')
      packages.value = packages.value.filter(p => p.id !== packageId)
    } catch (err) {
      error.value = handleError(err, 'Failed to delete package')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get package type badge class
   * @param {String} packageType - Package type (single/bundle)
   */
  const getPackageTypeClass = (packageType) => {
    const classes = {
      single: 'badge-info',
      bundle: 'badge-secondary'
    }
    return classes[packageType] || 'badge-ghost'
  }

  /**
   * Get package type label
   * @param {String} packageType - Package type
   */
  const getPackageTypeLabel = (packageType) => {
    const labels = {
      single: 'Single Test',
      bundle: 'Bundle'
    }
    return labels[packageType] || packageType
  }

  /**
   * Format price in IDR
   * @param {Number} price - Price amount
   */
  const formatPrice = (price) => {
    if (!price && price !== 0) return '-'
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price)
  }

  /**
   * Calculate bundle savings
   * @param {Number} singlePrice - Sum of individual prices
   * @param {Number} bundlePrice - Bundle price
   */
  const calculateSavings = (singlePrice, bundlePrice) => {
    if (!singlePrice || !bundlePrice) return 0
    return singlePrice - bundlePrice
  }

  /**
   * Calculate discount percentage
   * @param {Number} singlePrice - Original price
   * @param {Number} bundlePrice - Discounted price
   */
  const calculateDiscountPercent = (singlePrice, bundlePrice) => {
    if (!singlePrice || !bundlePrice) return 0
    return Math.round(((singlePrice - bundlePrice) / singlePrice) * 100)
  }

  return {
    packages,
    packageData,
    loading,
    error,
    fetchPackages,
    getPackageById,
    calculatePrice,
    createPackage,
    updatePackage,
    deletePackage,
    getPackageTypeClass,
    getPackageTypeLabel,
    formatPrice,
    calculateSavings,
    calculateDiscountPercent
  }
}
