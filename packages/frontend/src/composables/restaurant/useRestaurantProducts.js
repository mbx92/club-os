import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

export function useRestaurantProducts() {
  const api = useApi()
  const { showSuccess, handleError } = useNotification()
  const isDev = import.meta.env.DEV

  const products = ref([])
  const product = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const lowStockProducts = ref([])

  /**
   * Get all products with pagination
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   * @param {string} params.search - Search query (name, SKU, barcode)
   * @param {string} params.categoryId - Filter by category
   * @param {string} params.locationId - Filter by location
   * @param {boolean} params.isActive - Filter by active status
   * @param {boolean} params.trackInventory - Filter by inventory tracking
   */
  const fetchProducts = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const queryParams = new URLSearchParams()
      if (params.page) queryParams.append('page', params.page)
      if (params.limit) queryParams.append('limit', params.limit)
      if (params.search) queryParams.append('search', params.search)
      if (params.categoryId) queryParams.append('categoryId', params.categoryId)
      if (params.locationId) queryParams.append('locationId', params.locationId)
      if (params.isActive !== undefined) queryParams.append('isActive', params.isActive)
      if (params.trackInventory !== undefined) queryParams.append('trackInventory', params.trackInventory)

      const queryString = queryParams.toString()
      const url = `/restaurant/products${queryString ? `?${queryString}` : ''}`

      if (isDev) {
        console.log('Fetching products from:', url)
      }

      const response = await api.get(url)

      if (isDev) {
        console.log('API Response:', response)
      }

      if (response.data && Array.isArray(response.data) && response.pagination) {
        if (isDev) {
          console.log('Response with pagination object, length:', response.data.length)
        }
        products.value = response.data
        return {
          data: response.data,
          total: response.pagination.total || 0,
          totalPages: response.pagination.totalPages || 1,
          currentPage: response.pagination.page || params.page || 1
        }
      }
      else if (Array.isArray(response.data)) {
        if (isDev) {
          console.log('Direct array response, length:', response.data.length)
        }
        products.value = response.data
        return {
          data: response.data,
          total: response.data.length,
          totalPages: 1,
          currentPage: 1
        }
      }
      else {
        if (isDev) {
          console.log('Empty or unexpected response structure')
        }
        products.value = []
        return { data: [], total: 0, totalPages: 1, currentPage: 1 }
      }
    } catch (err) {
      if (isDev) {
        console.error('Error in fetchProducts:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to fetch products')
      products.value = []
      throw err
    } finally {
      loading.value = false
    }
  }

  const getProductById = async (productId) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Fetching product by ID:', productId)
      }

      const response = await api.get(`/restaurant/products/${productId}`)

      if (isDev) {
        console.log('Product details:', response)
      }

      if (response.data) {
        product.value = response.data
        return response.data
      } else {
        product.value = response
        return response
      }
    } catch (err) {
      if (isDev) {
        console.error('Error fetching product by ID:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to fetch product details')
      throw err
    } finally {
      loading.value = false
    }
  }

  // Helper to prepare FormData
  const prepareProductFormData = (productData, imageFile) => {
    const formData = new FormData()

    // Append all fields from productData
    Object.keys(productData).forEach(key => {
      // Skip null/undefined values
      if (productData[key] === null || productData[key] === undefined) return

      // Handle arrays (tags, allergens)
      if (Array.isArray(productData[key])) {
        productData[key].forEach(item => {
          formData.append(`${key}[]`, item)
        })
      }
      // Handle boolean values
      else if (typeof productData[key] === 'boolean') {
        formData.append(key, productData[key] ? '1' : '0') // or 'true'/'false' depending on backend
      }
      // Handle other types
      else {
        formData.append(key, productData[key])
      }
    })

    // Append image file if selected
    if (imageFile) {
      formData.append('image', imageFile)
    }

    return formData
  }

  const createProduct = async (productData, imageFile = null) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Creating product with data:', productData)
      }

      const formData = prepareProductFormData(productData, imageFile)

      const response = await api.post('/restaurant/products', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      if (isDev) {
        console.log('Product created:', response)
      }

      showSuccess(response.message || 'Product created successfully')
      return response.data
    } catch (err) {
      if (isDev) {
        console.error('Error creating product:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to create product')
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateProduct = async (productId, productData, imageFile = null) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Updating product:', productId, productData)
      }

      const formData = prepareProductFormData(productData, imageFile)

      // Use PUT method as per documentation, some backends might need POST with _method=PUT for FormData
      // Docs said: PUT /api/v1/restaurant/products/:id
      const response = await api.put(`/restaurant/products/${productId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      if (isDev) {
        console.log('Product updated:', response)
      }

      showSuccess(response.message || 'Product updated successfully')
      return response.data
    } catch (err) {
      if (isDev) {
        console.error('Error updating product:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to update product')
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteProduct = async (productId) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Deleting product:', productId)
      }

      const response = await api.delete(`/restaurant/products/${productId}`)

      if (isDev) {
        console.log('Product deleted:', response)
      }

      showSuccess(response.message || 'Product deleted successfully')
      return response.data || response
    } catch (err) {
      if (isDev) {
        console.error('Error deleting product:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to delete product')
      throw err
    } finally {
      loading.value = false
    }
  }

  const adjustStock = async (productId, adjustmentData) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Adjusting stock for product:', productId, adjustmentData)
      }

      const response = await api.post(`/restaurant/products/${productId}/adjust-stock`, adjustmentData)

      if (isDev) {
        console.log('Stock adjusted:', response)
      }

      showSuccess(response.message || 'Stock adjusted successfully')
      return response.data || response
    } catch (err) {
      if (isDev) {
        console.error('Error adjusting stock:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to adjust stock')
      throw err
    } finally {
      loading.value = false
    }
  }

  const getLowStockProducts = async () => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Fetching low stock products')
      }

      const response = await api.get('/restaurant/products/low-stock')

      if (isDev) {
        console.log('Low stock products:', response)
      }

      if (response.data) {
        lowStockProducts.value = Array.isArray(response.data) ? response.data : []
        return {
          data: lowStockProducts.value,
          count: response.count || lowStockProducts.value.length
        }
      } else if (Array.isArray(response)) {
        lowStockProducts.value = response
        return {
          data: response,
          count: response.length
        }
      } else {
        lowStockProducts.value = []
        return { data: [], count: 0 }
      }
    } catch (err) {
      if (isDev) {
        console.error('Error fetching low stock products:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to fetch low stock products')
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    products,
    product,
    loading,
    error,
    lowStockProducts,
    fetchProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    adjustStock,
    getLowStockProducts
  }
}
