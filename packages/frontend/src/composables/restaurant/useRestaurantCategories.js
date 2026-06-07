import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

export function useRestaurantCategories() {
  const api = useApi()
  const { showSuccess, handleError } = useNotification()
  const isDev = import.meta.env.DEV

  // State
  const categories = ref([])
  const categoryTree = ref([])
  const category = ref(null)
  const loading = ref(false)
  const error = ref(null)

  // Pagination
  const currentPage = ref(1)
  const totalPages = ref(1)
  const totalItems = ref(0)

  /**
   * Fetch all categories with optional filters
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   * @param {string} params.search - Search query
   * @param {boolean} params.tree - Return as tree structure
   * @param {boolean} params.includeCount - Include product count
   * @param {boolean} params.isActive - Filter by active status
   * @param {string} params.parentId - Filter by parent ID (null for root categories)
   */
  const fetchCategories = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const queryParams = new URLSearchParams()
      if (params.page) queryParams.append('page', params.page)
      if (params.limit) queryParams.append('limit', params.limit)
      if (params.search) queryParams.append('search', params.search)
      if (params.tree !== undefined) queryParams.append('tree', params.tree)
      if (params.includeCount !== undefined) queryParams.append('includeCount', params.includeCount)
      if (params.isActive !== undefined) queryParams.append('isActive', params.isActive)
      if (params.parentId !== undefined) queryParams.append('parentId', params.parentId)

      const queryString = queryParams.toString()
      const url = `/restaurant/categories${queryString ? `?${queryString}` : ''}`

      if (isDev) {
        console.log('Fetching categories from:', url)
      }

      const response = await api.get(url)

      if (isDev) {
        console.log('Categories API Response:', response)
      }

      // Handle response
      if (response.data && Array.isArray(response.data) && response.pagination) {
        categories.value = response.data
        currentPage.value = response.pagination.page || params.page || 1
        totalPages.value = response.pagination.totalPages || 1
        totalItems.value = response.pagination.total || response.data.length
        return {
          data: response.data,
          total: totalItems.value,
          totalPages: totalPages.value,
          currentPage: currentPage.value
        }
      } else if (Array.isArray(response.data)) {
        categories.value = response.data
        totalItems.value = response.data.length
        return {
          data: response.data,
          total: response.data.length,
          totalPages: 1,
          currentPage: 1
        }
      } else if (Array.isArray(response)) {
        categories.value = response
        totalItems.value = response.length
        return {
          data: response,
          total: response.length,
          totalPages: 1,
          currentPage: 1
        }
      } else {
        categories.value = []
        return { data: [], total: 0, totalPages: 1, currentPage: 1 }
      }
    } catch (err) {
      if (isDev) {
        console.error('Fetch categories error:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to fetch categories')
      categories.value = []
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get category tree structure
   * @param {Object} params - Query parameters
   * @param {boolean} params.includeCount - Include product count per category
   * @param {boolean} params.includeInactive - Include inactive categories
   */
  const getCategoryTree = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const queryParams = new URLSearchParams()
      if (params.includeCount !== undefined) queryParams.append('includeCount', params.includeCount)
      if (params.includeInactive !== undefined) queryParams.append('includeInactive', params.includeInactive)

      const queryString = queryParams.toString()
      const url = `/restaurant/categories/tree${queryString ? `?${queryString}` : ''}`

      if (isDev) {
        console.log('Fetching category tree from:', url)
      }

      const response = await api.get(url)

      if (isDev) {
        console.log('Category tree response:', response)
      }

      if (response.data) {
        categoryTree.value = response.data
        return response.data
      } else {
        categoryTree.value = response
        return response
      }
    } catch (err) {
      if (isDev) {
        console.error('Get category tree error:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to get category tree')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get category by ID
   * @param {string} categoryId - Category ID
   */
  const getCategoryById = async (categoryId) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Fetching category by ID:', categoryId)
      }

      const response = await api.get(`/restaurant/categories/${categoryId}`)

      if (isDev) {
        console.log('Category details:', response)
      }

      if (response.data) {
        category.value = response.data
        return response.data
      } else {
        category.value = response
        return response
      }
    } catch (err) {
      if (isDev) {
        console.error('Get category error:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to get category')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Create new category
   * @param {Object} categoryData - Category data
   * @param {string} categoryData.name - Category name (required)
   * @param {string} categoryData.description - Category description
   * @param {string} categoryData.parentId - Parent category ID (null for root)
   * @param {number} categoryData.displayOrder - Display order (default: 1)
   * @param {boolean} categoryData.isActive - Active status (default: true)
   * @param {string} categoryData.imageUrl - Category image URL
   * @param {string} categoryData.icon - Category icon name
   * @param {string} categoryData.color - Category color (hex)
   */
  const createCategory = async (categoryData) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Creating category:', categoryData)
      }

      const response = await api.post('/restaurant/categories', categoryData)

      if (isDev) {
        console.log('Category created:', response)
      }

      showSuccess(response.message || 'Category created successfully')
      return response.data || response
    } catch (err) {
      if (isDev) {
        console.error('Create category error:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to create category')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Update category
   * @param {string} categoryId - Category ID
   * @param {Object} categoryData - Category data to update
   */
  const updateCategory = async (categoryId, categoryData) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Updating category:', categoryId, categoryData)
      }

      const response = await api.put(`/restaurant/categories/${categoryId}`, categoryData)

      if (isDev) {
        console.log('Category updated:', response)
      }

      showSuccess(response.message || 'Category updated successfully')
      return response.data || response
    } catch (err) {
      if (isDev) {
        console.error('Update category error:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to update category')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Delete category
   * @param {string} categoryId - Category ID
   * @param {string} moveProductsTo - Optional category ID to move products to before deletion
   */
  const deleteCategory = async (categoryId, moveProductsTo = null) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Deleting category:', categoryId, 'Move products to:', moveProductsTo)
      }

      const url = moveProductsTo
        ? `/restaurant/categories/${categoryId}?moveProductsTo=${moveProductsTo}`
        : `/restaurant/categories/${categoryId}`

      const response = await api.delete(url)

      if (isDev) {
        console.log('Category deleted:', response)
      }

      showSuccess(response.message || 'Category deleted successfully')
      return response.data || response
    } catch (err) {
      if (isDev) {
        console.error('Delete category error:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to delete category')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Reorder categories
   * @param {Array} orders - Array of category order objects
   * @param {string} orders[].id - Category ID
   * @param {number} orders[].displayOrder - New display order
   * @param {string} orders[].parentId - New parent ID (optional, for moving in tree)
   */
  const reorderCategories = async (orders) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Reordering categories:', orders)
      }

      const response = await api.post('/restaurant/categories/reorder', { orders })

      if (isDev) {
        console.log('Categories reordered:', response)
      }

      showSuccess(response.message || 'Categories reordered successfully')
      return response.data || response
    } catch (err) {
      if (isDev) {
        console.error('Reorder categories error:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to reorder categories')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Toggle category active status
   * @param {string} categoryId - Category ID
   */
  const toggleCategoryActive = async (categoryOrId) => {
    loading.value = true
    error.value = null
    try {
      if (isDev) {
        console.log('Toggling category active status:', categoryOrId)
      }

      // Determine id and current status. If caller passed the category object, use it.
      const categoryId = typeof categoryOrId === 'object' && categoryOrId !== null
        ? categoryOrId.id
        : categoryOrId

      let currentIsActive
      if (typeof categoryOrId === 'object' && categoryOrId !== null && 'isActive' in categoryOrId) {
        currentIsActive = categoryOrId.isActive !== false
      } else {
        // fetch category to get current status
        const cat = await getCategoryById(categoryId)
        currentIsActive = cat.isActive !== false
      }

      // Use updateCategory (PUT) to change isActive. Some backends don't expose a /toggle endpoint.
      const payload = { isActive: !currentIsActive }
      const response = await updateCategory(categoryId, payload)

      if (isDev) {
        console.log('Category toggled via update:', response)
      }

      showSuccess((response && response.message) || 'Category status updated')
      return (response && response.data) || response
    } catch (err) {
      if (isDev) {
        console.error('Toggle category error:', err)
      }
      error.value = err.message
      handleError(err, 'Failed to toggle category status')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get flattened list of categories for dropdowns
   * Useful for parent category selection
   * @param {boolean} excludeId - Category ID to exclude (for edit mode)
   */
  const getFlatCategories = (excludeId = null) => {
    const flatten = (cats, level = 0) => {
      let result = []
      for (const cat of cats) {
        if (excludeId && cat.id === excludeId) continue
        result.push({
          ...cat,
          level,
          displayName: '—'.repeat(level) + (level > 0 ? ' ' : '') + cat.name
        })
        if (cat.children && cat.children.length > 0) {
          result = result.concat(flatten(cat.children, level + 1))
        }
      }
      return result
    }
    return flatten(categoryTree.value)
  }

  return {
    // State
    categories,
    categoryTree,
    category,
    loading,
    error,
    currentPage,
    totalPages,
    totalItems,

    // Methods
    fetchCategories,
    getCategoryTree,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    toggleCategoryActive,
    getFlatCategories
  }
}
