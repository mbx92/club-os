import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

/**
 * Composable for Income Category Management
 */
export function useIncomeCategories() {
  const api = useApi()
  const { showSuccess, handleError } = useNotification()

  // State
  const categories = ref([])
  const category = ref(null)
  const loading = ref(false)

  /**
   * Fetch all income categories
   * @param {Object} params - Query parameters
   * @param {Boolean} params.isActive - Filter active categories only
   * @param {Boolean} params.includeStats - Include income statistics
   */
  const fetchCategories = async (params = {}) => {
    loading.value = true
    try {
      const response = await api.get('/finance/income-categories', { params })

      if (response.success) {
        categories.value = response.data
        return response
      }
    } catch (error) {
      handleError(error, 'Failed to fetch categories')
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch single category by ID
   * @param {String} id - Category ID
   */
  const fetchCategory = async (id) => {
    loading.value = true
    try {
      const response = await api.get(`/finance/income-categories/${id}`)

      if (response.success) {
        category.value = response.data
        return response
      }
    } catch (error) {
      handleError(error, 'Failed to fetch category')
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Create new income category
   * @param {Object} data - Category data
   * @param {String} data.name - Category name
   * @param {String} data.description - Description
   * @param {String} data.type - Type: donation, investment, other
   * @param {String} data.color - Hex color code (e.g., #4CAF50)
   * @param {String} data.icon - Icon identifier
   */
  const createCategory = async (data) => {
    loading.value = true
    try {
      const response = await api.post('/finance/income-categories', data)

      if (response.success) {
        showSuccess(`Category "${data.name}" has been created successfully`)
        return response
      }
    } catch (error) {
      handleError(error, 'Failed to create category')
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Update income category
   * @param {String} id - Category ID
   * @param {Object} data - Updated category data
   */
  const updateCategory = async (id, data) => {
    loading.value = true
    try {
      const response = await api.put(`/finance/income-categories/${id}`, data)

      if (response.success) {
        showSuccess('Category has been updated successfully')
        return response
      }
    } catch (error) {
      handleError(error, 'Failed to update category')
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Delete income category
   * Note: Cannot delete category with associated incomes
   * @param {String} id - Category ID
   */
  const deleteCategory = async (id) => {
    loading.value = true
    try {
      const response = await api.delete(`/finance/income-categories/${id}`)

      if (response.success) {
        showSuccess('Category has been deleted successfully')

        // Remove from local state
        categories.value = categories.value.filter(cat => cat.id !== id)

        return response
      }
    } catch (error) {
      const errorMessage = error.message?.includes('associated')
        ? 'Cannot delete category with associated incomes'
        : error.message || 'An error occurred while deleting category'

      handleError(new Error(errorMessage), 'Failed to delete category')
      throw error
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    categories,
    category,
    loading,

    // Methods
    fetchCategories,
    fetchCategory,
    createCategory,
    updateCategory,
    deleteCategory
  }
}
