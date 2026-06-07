import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

/**
 * Composable for Income Management
 * Handles manual and transactional income entries
 */
export function useIncomes() {
  const api = useApi()
  const { showSuccess, handleError } = useNotification()

  // State
  const incomes = ref([])
  const income = ref(null)
  const loading = ref(false)
  const pagination = ref({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })

  /**
   * Fetch all incomes with filters and pagination
   * @param {Object} params - Query parameters
   * @param {Number} params.page - Page number
   * @param {Number} params.limit - Items per page
   * @param {String} params.type - manual or transactional
   * @param {String} params.status - pending, received, cancelled
   * @param {String} params.categoryId - Filter by category
   * @param {String} params.locationId - Filter by location
   * @param {String} params.startDate - From date (YYYY-MM-DD)
   * @param {String} params.endDate - To date (YYYY-MM-DD)
   * @param {String} params.search - Search in title/description
   * @param {String} params.sortBy - Sort field
   * @param {String} params.sortOrder - ASC or DESC
   */
  const fetchIncomes = async (params = {}) => {
    loading.value = true
    try {
      const response = await api.get('/finance/incomes', { params })

      if (response.success) {
        incomes.value = response.data.incomes || response.data

        if (response.data.pagination) {
          pagination.value = response.data.pagination
        }

        return response
      }
    } catch (error) {
      handleError(error, 'Failed to fetch incomes')
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch single income by ID
   * @param {String} id - Income ID
   */
  const fetchIncome = async (id) => {
    loading.value = true
    try {
      const response = await api.get(`/finance/incomes/${id}`)

      if (response.success) {
        income.value = response.data
        return response
      }
    } catch (error) {
      handleError(error, 'Failed to fetch income')
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Create new manual income
   * Note: Only manual incomes can be created. Transactional incomes are auto-generated.
   * @param {Object} data - Income data
   * @param {String} data.categoryId - Income category ID
   * @param {String} data.locationId - Location ID (optional)
   * @param {String} data.title - Income title
   * @param {String} data.description - Description
   * @param {Number} data.amount - Income amount
   * @param {Number} data.taxAmount - Tax amount (optional)
   * @param {String} data.incomeDate - Date of income (YYYY-MM-DD)
   * @param {String} data.receivedDate - Date payment received (YYYY-MM-DD, optional)
   * @param {String} data.paymentMethod - Payment method (optional)
   * @param {String} data.referenceNumber - Reference number (optional)
   * @param {String} data.source - Income source (optional)
   * @param {String} data.status - Status: pending, received (default: pending)
   * @param {Boolean} data.isRecurring - Is recurring income
   * @param {String} data.recurringFrequency - Frequency: daily, weekly, monthly, quarterly, yearly
   * @param {String} data.recurringEndDate - End date for recurring income
   * @param {String} data.notes - Additional notes
   * @param {Array} data.tags - Tags for categorization
   */
  const createIncome = async (data) => {
    loading.value = true
    try {
      const response = await api.post('/finance/incomes', data)

      if (response.success) {
        showSuccess(`Income "${data.title}" has been created successfully`)
        return response
      }
    } catch (error) {
      handleError(error, 'Failed to create income')
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Update manual income
   * Note: Only manual incomes can be updated. Transactional incomes are READ-ONLY.
   * @param {String} id - Income ID
   * @param {Object} data - Updated income data
   */
  const updateIncome = async (id, data) => {
    loading.value = true
    try {
      const response = await api.put(`/finance/incomes/${id}`, data)

      if (response.success) {
        showSuccess('Income has been updated successfully')
        return response
      }
    } catch (error) {
      const errorMessage = error.message?.includes('transactional')
        ? 'Transactional incomes cannot be updated. Please modify the source transaction instead.'
        : error.message || 'An error occurred while updating income'

      handleError(new Error(errorMessage), 'Failed to update income')
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Delete manual income
   * Note: Only manual incomes can be deleted. Uses soft delete.
   * @param {String} id - Income ID
   */
  const deleteIncome = async (id) => {
    loading.value = true
    try {
      const response = await api.delete(`/finance/incomes/${id}`)

      if (response.success) {
        showSuccess('Income has been deleted successfully')
        // Remove from local state
        incomes.value = incomes.value.filter(income => income.id !== id)

        return response
      }
    } catch (error) {
      const errorMessage = error.message?.includes('transactional')
        ? 'Transactional incomes cannot be deleted.'
        : error.message || 'An error occurred while deleting income'

      handleError(new Error(errorMessage), 'Failed to delete income')
      throw error
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    incomes,
    income,
    loading,
    pagination,

    // Methods
    fetchIncomes,
    fetchIncome,
    createIncome,
    updateIncome,
    deleteIncome
  }
}
