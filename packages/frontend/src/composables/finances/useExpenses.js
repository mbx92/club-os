import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

export function useExpenses() {
  const api = useApi()
  const { showSuccess, handleError } = useNotification()
  
  const expenses = ref([])
  const expense = ref(null)
  const loading = ref(false)
  const actionLoading = ref(false)
  const pagination = ref({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })

  const isDev = import.meta.env.DEV

  /**
   * Fetch all expenses with filters
   */
  const fetchExpenses = async (filters = {}) => {
    loading.value = true
    try {
      const params = new URLSearchParams()
      
      // Pagination
      if (filters.page) params.append('page', filters.page)
      if (filters.limit) params.append('limit', filters.limit)
      
      // Filters
      if (filters.status) params.append('status', filters.status)
      if (filters.categoryId) params.append('categoryId', filters.categoryId)
      if (filters.locationId) params.append('locationId', filters.locationId)
      if (filters.fundSource) params.append('fundSource', filters.fundSource)
      if (filters.accountId) params.append('accountId', filters.accountId)
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)
      if (filters.search) params.append('search', filters.search)
      
      // Sorting
      if (filters.sortBy) params.append('sortBy', filters.sortBy)
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder)

      const response = await api.get(`/finance/expenses?${params.toString()}`)
      
      if (isDev) {
        console.log('[useExpenses] Fetched expenses:', response)
      }

      expenses.value = response.data.expenses || []
      pagination.value = response.data.pagination || pagination.value
      
      return response
    } catch (error) {
      handleError(error, 'Failed to fetch expenses')
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch expense by ID
   */
  const fetchExpense = async (id) => {
    loading.value = true
    try {
      const response = await api.get(`/finance/expenses/${id}`)
      
      if (isDev) {
        console.log('[useExpenses] Fetched expense:', response)
      }

      expense.value = response.data
      return response.data
    } catch (error) {
      handleError(error, 'Failed to fetch expense')
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Create new expense
   */
  const createExpense = async (expenseData) => {
    actionLoading.value = true
    try {
      const response = await api.post('/finance/expenses', expenseData)
      
      if (isDev) {
        console.log('[useExpenses] Created expense:', response)
      }

      showSuccess('Expense created successfully')
      return response.data
    } catch (error) {
      handleError(error, 'Failed to create expense')
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  /**
   * Update expense
   */
  const updateExpense = async (id, expenseData) => {
    actionLoading.value = true
    try {
      const response = await api.put(`/finance/expenses/${id}`, expenseData)
      
      if (isDev) {
        console.log('[useExpenses] Updated expense:', response)
      }

      showSuccess('Expense updated successfully')
      return response.data
    } catch (error) {
      handleError(error, 'Failed to update expense')
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  /**
   * Delete expense
   */
  const deleteExpense = async (id) => {
    actionLoading.value = true
    try {
      const response = await api.delete(`/finance/expenses/${id}`)
      
      if (isDev) {
        console.log('[useExpenses] Deleted expense:', response)
      }

      showSuccess('Expense deleted successfully')
      return response
    } catch (error) {
      handleError(error, 'Failed to delete expense')
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  /**
   * Approve expense
   */
  const approveExpense = async (id) => {
    actionLoading.value = true
    try {
      const response = await api.post(`/finance/expenses/${id}/approve`)
      
      if (isDev) {
        console.log('[useExpenses] Approved expense:', response)
      }

      showSuccess('Expense approved successfully')
      return response.data
    } catch (error) {
      handleError(error, 'Failed to approve expense')
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  /**
   * Mark expense as paid
   */
  const markAsPaid = async (id, paymentData) => {
    actionLoading.value = true
    try {
      const response = await api.post(`/finance/expenses/${id}/pay`, paymentData)
      
      if (isDev) {
        console.log('[useExpenses] Marked expense as paid:', response)
      }

      showSuccess('Expense marked as paid successfully')
      return response // return full response so caller can access pettyCash balance info
    } catch (error) {
      handleError(error, 'Failed to mark expense as paid')
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  /**
   * Reopen expense (admin only)
   */
  const reopenExpense = async (id) => {
    actionLoading.value = true
    try {
      const response = await api.post(`/finance/expenses/${id}/reopen`)

      if (isDev) {
        console.log('[useExpenses] Reopened expense:', response)
      }

      showSuccess('Expense reopened successfully')
      return response.data
    } catch (error) {
      handleError(error, 'Failed to reopen expense')
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  return {
    expenses,
    expense,
    loading,
    actionLoading,
    pagination,
    fetchExpenses,
    fetchExpense,
    createExpense,
    updateExpense,
    deleteExpense,
    approveExpense,
    markAsPaid,
    reopenExpense,
  }
}
