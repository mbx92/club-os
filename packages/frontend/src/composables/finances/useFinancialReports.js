import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

export function useFinancialReports() {
  const api = useApi()
  const { handleError } = useNotification()

  const profitLossReport = ref(null)
  const revenueReport = ref(null)
  const cashFlowReport = ref(null)
  const expenseReport = ref(null)
  const loading = ref(false)

  const isDev = import.meta.env.DEV

  const unwrap = (res) => res?.data ?? res

  const buildQuery = (filters) => {
    const p = new URLSearchParams()
    Object.entries(filters || {}).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') p.append(k, v) })
    return p.toString()
  }

  /**
   * GET /reports/finance/profit-loss
   * Returns: { byPeriod: [{period, totalRevenue, totalExpenses, netProfit, profitMargin}], summary }
   */
  const fetchProfitLoss = async (filters = {}) => {
    loading.value = true
    try {
      if (!filters.startDate || !filters.endDate) {
        throw new Error('Start date and end date are required')
      }
      const response = await api.get(`/reports/finance/profit-loss?${buildQuery(filters)}`)
      if (isDev) console.log('[useFinancialReports] P&L:', response)
      const data = unwrap(response)
      profitLossReport.value = data
      return data
    } catch (error) {
      handleError(error, 'Failed to fetch profit & loss report')
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * GET /reports/finance/revenue
   * Returns: { summary: {totalRevenue, totalTransactions, avgTransactionValue}, revenueByPeriod, revenueByType, forecast }
   */
  const fetchRevenue = async (filters = {}) => {
    loading.value = true
    try {
      if (!filters.startDate || !filters.endDate) {
        throw new Error('Start date and end date are required')
      }
      const response = await api.get(`/reports/finance/revenue?${buildQuery(filters)}`)
      if (isDev) console.log('[useFinancialReports] Revenue:', response)
      const data = unwrap(response)
      revenueReport.value = data
      return data
    } catch (error) {
      handleError(error, 'Failed to fetch revenue report')
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * GET /reports/finance/cash-flow
   * Returns: { byPeriod: [{period, totalInflow, totalOutflow, netFlow}], summary: {totalInflow, totalOutflow, netCashFlow} }
   */
  const fetchCashFlow = async (filters = {}) => {
    loading.value = true
    try {
      if (!filters.startDate || !filters.endDate) {
        throw new Error('Start date and end date are required')
      }
      const response = await api.get(`/reports/finance/cash-flow?${buildQuery(filters)}`)
      if (isDev) console.log('[useFinancialReports] Cash Flow:', response)
      const data = unwrap(response)
      cashFlowReport.value = data
      return data
    } catch (error) {
      handleError(error, 'Failed to fetch cash flow report')
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Alias kept for backward compatibility — delegates to fetchCashFlow
   * (old /finance/reports/expenses endpoint no longer exists)
   */
  const fetchExpenses = async (filters = {}) => fetchCashFlow(filters)

  /**
   * GET /reports/commissions/summary — commission summary (replaces old endpoint)
   */
  const fetchServiceCommissionIncome = async (filters = {}) => {
    loading.value = true
    try {
      const response = await api.get(`/reports/commissions/summary?${buildQuery(filters)}`)
      if (isDev) console.log('[useFinancialReports] Commission summary:', response)
      const data = unwrap(response)
      return data
    } catch (error) {
      handleError(error, 'Failed to fetch commission report')
      throw error
    } finally {
      loading.value = false
    }
  }

  const formatCurrency = (value) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value || 0)

  return {
    profitLossReport,
    revenueReport,
    cashFlowReport,
    expenseReport,
    loading,
    fetchProfitLoss,
    fetchRevenue,
    fetchCashFlow,
    fetchExpenses,
    fetchServiceCommissionIncome,
    formatCurrency
  }
}
