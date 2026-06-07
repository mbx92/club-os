import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

export function useExpenseCategories() {
  const api = useApi()
  const { showSuccess, handleError } = useNotification()
  
  const categories = ref([])
  const category = ref(null)
  const loading = ref(false)
  const actionLoading = ref(false)

  const isDev = import.meta.env.DEV

  /**
   * Fetch all expense categories
   */
  const fetchCategories = async (filters = {}) => {
    loading.value = true
    try {
      const params = new URLSearchParams()
      
      if (filters.isActive !== undefined) params.append('isActive', filters.isActive)
      if (filters.includeStats) params.append('includeStats', filters.includeStats)

      const response = await api.get(`/finance/expense-categories?${params.toString()}`)
      
      if (isDev) {
        console.log('[useExpenseCategories] Fetched categories:', response)
      }

      categories.value = response.data || []
      return response
    } catch (error) {
      handleError(error, 'Failed to fetch expense categories')
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch category by ID
   */
  const fetchCategory = async (id) => {
    loading.value = true
    try {
      const response = await api.get(`/finance/expense-categories/${id}`)
      
      if (isDev) {
        console.log('[useExpenseCategories] Fetched category:', response)
      }

      category.value = response.data
      return response.data
    } catch (error) {
      handleError(error, 'Failed to fetch expense category')
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Create new expense category
   */
  const createCategory = async (categoryData) => {
    actionLoading.value = true
    try {
      const response = await api.post('/finance/expense-categories', categoryData)
      
      if (isDev) {
        console.log('[useExpenseCategories] Created category:', response)
      }

      showSuccess('Expense category created successfully')
      return response.data
    } catch (error) {
      handleError(error, 'Failed to create expense category')
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  /**
   * Update expense category
   */
  const updateCategory = async (id, categoryData) => {
    actionLoading.value = true
    try {
      const response = await api.put(`/finance/expense-categories/${id}`, categoryData)
      
      if (isDev) {
        console.log('[useExpenseCategories] Updated category:', response)
      }

      showSuccess('Expense category updated successfully')
      return response.data
    } catch (error) {
      handleError(error, 'Failed to update expense category')
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  /**
   * Delete expense category
   */
  const deleteCategory = async (id) => {
    actionLoading.value = true
    try {
      const response = await api.delete(`/finance/expense-categories/${id}`)
      
      if (isDev) {
        console.log('[useExpenseCategories] Deleted category:', response)
      }

      showSuccess('Expense category deleted successfully')
      return response
    } catch (error) {
      handleError(error, 'Failed to delete expense category')
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  return {
    categories,
    category,
    loading,
    actionLoading,
    fetchCategories,
    fetchCategory,
    createCategory,
    updateCategory,
    deleteCategory
  }
}
