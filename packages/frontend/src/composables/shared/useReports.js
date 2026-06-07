/**
 * useReports — comprehensive composable covering all /api/v1/reports/* endpoints
 *
 * Docs: docs/REPORT-ENDPOINTS.md
 */
import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

export function useReports() {
  const api = useApi()
  const { handleError } = useNotification()
  const isDev = import.meta.env.DEV

  // ── shared state ──────────────────────────────────────────────────────────
  const loading = ref(false)
  const error = ref(null)

  // per-section reactive data
  const gymOverview = ref(null)
  const checkinTrends = ref(null)
  const membershipStats = ref(null)

  const membersActive = ref(null)
  const membersGrowth = ref(null)
  const membersRetention = ref(null)

  const servicesPerformance = ref(null)
  const servicesActive = ref(null)

  const financeRevenue = ref(null)
  const financeProfitLoss = ref(null)
  const financeCashFlow = ref(null)

  const productsPerformance = ref(null)
  const productsTopSelling = ref(null)
  const productsByCategory = ref(null)

  const restaurantSales = ref(null)
  const restaurantTableUtil = ref(null)
  const restaurantTopItems = ref(null)

  const staffAttendance = ref(null)
  const staffDailyComposition = ref(null)
  const staffShiftSummary = ref(null)

  const commissionSummary = ref(null)
  const commissionTrends = ref(null)
  const commissionByTrainer = ref(null)

  const forecasting = ref(null)
  const dailySummary = ref(null)

  // ── helpers ───────────────────────────────────────────────────────────────
  const unwrap = (res) => res?.data ?? res

  const buildQuery = (params = {}) => {
    const q = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') q.append(k, v)
    })
    return q.toString()
  }

  const withLoading = async (fn) => {
    loading.value = true
    error.value = null
    try {
      return await fn()
    } catch (err) {
      error.value = err?.message || 'Request failed'
      handleError(err, err?.message || 'Request failed')
      throw err
    } finally {
      loading.value = false
    }
  }

  // ── 1. Gym Reports — /reports/gym ─────────────────────────────────────────

  /**
   * GET /reports/gym/overview
   * Returns: { members, checkIns, activeServices }
   */
  const getGymOverview = () =>
    withLoading(async () => {
      const res = await api.get('/reports/gym/overview')
      if (isDev) console.log('🏋️ [reports] gym/overview', res)
      gymOverview.value = unwrap(res)
      return gymOverview.value
    })

  /**
   * GET /reports/gym/checkin-trends
   * Params: startDate, endDate, groupBy (daily|weekly|monthly)
   * Returns: { trends: [{period, count, uniqueMembers}], forecast }
   */
  const getCheckinTrends = (params = {}) =>
    withLoading(async () => {
      const res = await api.get(`/reports/gym/checkin-trends?${buildQuery(params)}`)
      if (isDev) console.log('📅 [reports] gym/checkin-trends', res)
      checkinTrends.value = unwrap(res)
      return checkinTrends.value
    })

  /**
   * GET /reports/gym/membership-stats
   * Returns: { byPlan, statusDistribution, newSubscriptionsThisMonth }
   */
  const getMembershipStats = () =>
    withLoading(async () => {
      const res = await api.get('/reports/gym/membership-stats')
      if (isDev) console.log('📊 [reports] gym/membership-stats', res)
      membershipStats.value = unwrap(res)
      return membershipStats.value
    })

  // ── 2. Member Reports — /reports/members ──────────────────────────────────

  /**
   * GET /reports/members/active
   * Params: search, gender, membershipStatus
   * Returns: { summary, statusBreakdown, members }
   */
  const getMembersActive = (params = {}) =>
    withLoading(async () => {
      const res = await api.get(`/reports/members/active?${buildQuery(params)}`)
      if (isDev) console.log('👥 [reports] members/active', res)
      membersActive.value = unwrap(res)
      return membersActive.value
    })

  /**
   * GET /reports/members/growth
   * Params: startDate, endDate, groupBy (daily|weekly|monthly|yearly)
   * Returns: { summary, growthByPeriod, forecast }
   */
  const getMembersGrowth = (params = {}) =>
    withLoading(async () => {
      const res = await api.get(`/reports/members/growth?${buildQuery(params)}`)
      if (isDev) console.log('📈 [reports] members/growth', res)
      membersGrowth.value = unwrap(res)
      return membersGrowth.value
    })

  /**
   * GET /reports/members/retention
   * Params: months (default 6)
   * Returns: { cohorts, checkInFrequency }
   */
  const getMembersRetention = (params = {}) =>
    withLoading(async () => {
      const res = await api.get(`/reports/members/retention?${buildQuery(params)}`)
      if (isDev) console.log('🔄 [reports] members/retention', res)
      membersRetention.value = unwrap(res)
      return membersRetention.value
    })

  // ── 3. Service Reports — /reports/services ────────────────────────────────

  /**
   * GET /reports/services/performance
   * Params: startDate, endDate, groupBy, serviceType
   * Returns: { salesByPeriod, byServiceType, topPlans, forecast }
   */
  const getServicesPerformance = (params = {}) =>
    withLoading(async () => {
      const res = await api.get(`/reports/services/performance?${buildQuery(params)}`)
      if (isDev) console.log('🎯 [reports] services/performance', res)
      servicesPerformance.value = unwrap(res)
      return servicesPerformance.value
    })

  /**
   * GET /reports/services/active
   * Returns: { statusDistribution, byServiceType, expiringSoon, autoRenewEnabled }
   */
  const getServicesActive = () =>
    withLoading(async () => {
      const res = await api.get('/reports/services/active')
      if (isDev) console.log('🎫 [reports] services/active', res)
      servicesActive.value = unwrap(res)
      return servicesActive.value
    })

  // ── 4. Finance Reports — /reports/finance ────────────────────────────────

  /**
   * GET /reports/finance/revenue
   * Params: startDate, endDate, groupBy
   * Returns: { summary, revenueByPeriod, revenueByType, forecast }
   */
  const getFinanceRevenue = (params = {}) =>
    withLoading(async () => {
      const res = await api.get(`/reports/finance/revenue?${buildQuery(params)}`)
      if (isDev) console.log('💰 [reports] finance/revenue', res)
      financeRevenue.value = unwrap(res)
      return financeRevenue.value
    })

  /**
   * GET /reports/finance/profit-loss
   * Params: startDate, endDate, groupBy
   * Returns: { byPeriod, summary }
   */
  const getFinanceProfitLoss = (params = {}) =>
    withLoading(async () => {
      const res = await api.get(`/reports/finance/profit-loss?${buildQuery(params)}`)
      if (isDev) console.log('📊 [reports] finance/profit-loss', res)
      financeProfitLoss.value = unwrap(res)
      return financeProfitLoss.value
    })

  /**
   * GET /reports/finance/cash-flow
   * Params: startDate, endDate, groupBy
   * Returns: { byPeriod, summary }
   */
  const getFinanceCashFlow = (params = {}) =>
    withLoading(async () => {
      const res = await api.get(`/reports/finance/cash-flow?${buildQuery(params)}`)
      if (isDev) console.log('💸 [reports] finance/cash-flow', res)
      financeCashFlow.value = unwrap(res)
      return financeCashFlow.value
    })

  // ── 5. Product Reports — /reports/products ───────────────────────────────

  /**
   * GET /reports/products/performance
   * Params: startDate, endDate, groupBy, categoryId, productType
   * Returns: { summary, salesByPeriod, forecast }
   */
  const getProductsPerformance = (params = {}) =>
    withLoading(async () => {
      const res = await api.get(`/reports/products/performance?${buildQuery(params)}`)
      if (isDev) console.log('📦 [reports] products/performance', res)
      productsPerformance.value = unwrap(res)
      return productsPerformance.value
    })

  /**
   * GET /reports/products/top-selling
   * Params: startDate, endDate, limit (default 20), sortBy (revenue|quantity)
   * Returns: { topProducts }
   */
  const getProductsTopSelling = (params = {}) =>
    withLoading(async () => {
      const res = await api.get(`/reports/products/top-selling?${buildQuery(params)}`)
      if (isDev) console.log('🏆 [reports] products/top-selling', res)
      productsTopSelling.value = unwrap(res)
      return productsTopSelling.value
    })

  /**
   * GET /reports/products/by-category
   * Params: startDate, endDate
   * Returns: { byCategory }
   */
  const getProductsByCategory = (params = {}) =>
    withLoading(async () => {
      const res = await api.get(`/reports/products/by-category?${buildQuery(params)}`)
      if (isDev) console.log('🗂️ [reports] products/by-category', res)
      productsByCategory.value = unwrap(res)
      return productsByCategory.value
    })

  // ── 6. Restaurant Reports — /reports/restaurant ──────────────────────────

  /**
   * GET /reports/restaurant/sales
   * Params: startDate, endDate, groupBy (daily|weekly|monthly), locationId
   * Returns: { summary, salesByPeriod }
   */
  const getRestaurantSales = (params = {}) =>
    withLoading(async () => {
      const res = await api.get(`/reports/restaurant/sales?${buildQuery(params)}`)
      if (isDev) console.log('🍽️ [reports] restaurant/sales', res)
      restaurantSales.value = unwrap(res)
      return restaurantSales.value
    })

  /**
   * GET /reports/restaurant/table-utilization
   * Params: startDate, endDate, locationId
   * Returns: { tables, summary }
   */
  const getRestaurantTableUtil = (params = {}) =>
    withLoading(async () => {
      const res = await api.get(`/reports/restaurant/table-utilization?${buildQuery(params)}`)
      if (isDev) console.log('🪑 [reports] restaurant/table-utilization', res)
      restaurantTableUtil.value = unwrap(res)
      return restaurantTableUtil.value
    })

  /**
   * GET /reports/restaurant/top-items
   * Params: startDate, endDate, limit (default 10)
   * Returns: { topItems }
   */
  const getRestaurantTopItems = (params = {}) =>
    withLoading(async () => {
      const res = await api.get(`/reports/restaurant/top-items?${buildQuery(params)}`)
      if (isDev) console.log('⭐ [reports] restaurant/top-items', res)
      restaurantTopItems.value = unwrap(res)
      return restaurantTopItems.value
    })

  // ── 7. Staff Reports — /reports/staff ────────────────────────────────────

  /**
   * GET /reports/staff/attendance
   * Params: startDate, endDate, userId, groupBy
   * Returns: { summary, attendanceByPeriod, perStaff }
   */
  const getStaffAttendance = (params = {}) =>
    withLoading(async () => {
      const res = await api.get(`/reports/staff/attendance?${buildQuery(params)}`)
      if (isDev) console.log('🗓️ [reports] staff/attendance', res)
      staffAttendance.value = unwrap(res)
      return staffAttendance.value
    })

  /**
   * GET /reports/staff/daily-composition
   * Params: startDate (REQUIRED), endDate (REQUIRED)
   * Returns: { summary, composition }
   */
  const getStaffDailyComposition = (params = {}) =>
    withLoading(async () => {
      if (!params.startDate || !params.endDate) {
        throw new Error('startDate and endDate are required for daily composition')
      }
      const res = await api.get(`/reports/staff/daily-composition?${buildQuery(params)}`)
      if (isDev) console.log('👔 [reports] staff/daily-composition', res)
      staffDailyComposition.value = unwrap(res)
      return staffDailyComposition.value
    })

  /**
   * GET /reports/staff/shift-summary
   * Params: startDate, endDate
   * Returns: { shiftDistribution }
   */
  const getStaffShiftSummary = (params = {}) =>
    withLoading(async () => {
      const res = await api.get(`/reports/staff/shift-summary?${buildQuery(params)}`)
      if (isDev) console.log('⏰ [reports] staff/shift-summary', res)
      staffShiftSummary.value = unwrap(res)
      return staffShiftSummary.value
    })

  // ── 8. Commission Reports — /reports/commissions ─────────────────────────

  /**
   * GET /reports/commissions/summary
   * Params: startDate, endDate, status (pending|paid|cancelled)
   * Returns: { summary, byTrainer }
   */
  const getCommissionSummary = (params = {}) =>
    withLoading(async () => {
      const res = await api.get(`/reports/commissions/summary?${buildQuery(params)}`)
      if (isDev) console.log('💼 [reports] commissions/summary', res)
      commissionSummary.value = unwrap(res)
      return commissionSummary.value
    })

  /**
   * GET /reports/commissions/trends
   * Params: startDate, endDate, groupBy (daily|weekly|monthly)
   * Returns: { trends, forecast }
   */
  const getCommissionTrends = (params = {}) =>
    withLoading(async () => {
      const res = await api.get(`/reports/commissions/trends?${buildQuery(params)}`)
      if (isDev) console.log('📈 [reports] commissions/trends', res)
      commissionTrends.value = unwrap(res)
      return commissionTrends.value
    })

  /**
   * GET /reports/commissions/by-trainer/:trainerId
   * Params: startDate, endDate, status, page, limit
   * Returns: { trainer, summary, commissions, pagination }
   */
  const getCommissionByTrainer = (trainerId, params = {}) =>
    withLoading(async () => {
      const res = await api.get(`/reports/commissions/by-trainer/${trainerId}?${buildQuery(params)}`)
      if (isDev) console.log(`💰 [reports] commissions/by-trainer/${trainerId}`, res)
      commissionByTrainer.value = unwrap(res)
      return commissionByTrainer.value
    })

  // ── 9. Forecasting Reports — /reports/forecasting ────────────────────────

  /**
   * GET /reports/forecasting/revenue | members | attendance | expenses | comprehensive
   * Params: months, periodsAhead, [transactionType for revenue]
   * Returns: { historical, forecast, trend, growthRate }
   */
  /**
   * GET /reports/daily/daily-summary/export
   * Params: startDate, endDate
   * Downloads the file directly (CSV/Excel) from the server.
   */
  const getDailySummaryExport = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
      const qs = buildQuery(params)
      const url = `${baseURL}/reports/daily/daily-summary/export${qs ? `?${qs}` : ''}`
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')
      const tenantId = localStorage.getItem('tenantId')
      const headers = { 'X-Client-Name': 'Gym FE Web App' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      if (tenantId) headers['X-Tenant-ID'] = tenantId

      const response = await fetch(url, { method: 'GET', headers })
      if (!response.ok) throw new Error(`Export gagal: ${response.statusText}`)

      const blob = await response.blob()
      let filename = `daily-summary_${params.startDate || ''}_${params.endDate || ''}`
      const contentDisposition = response.headers.get('content-disposition')
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/)
        if (match?.[1]) filename = match[1]
      } else {
        const contentType = response.headers.get('content-type') || ''
        if (contentType.includes('sheet') || contentType.includes('excel')) filename += '.xlsx'
        else filename += '.csv'
      }

      const objectUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(objectUrl)
      if (isDev) console.log('📥 [reports] daily-summary exported:', filename)
    } catch (err) {
      error.value = err.message
      handleError(err, 'Gagal mengunduh rekap penjualan')
      throw err
    } finally {
      loading.value = false
    }
  }

  const getForecasting = (type = 'comprehensive', params = {}) =>
    withLoading(async () => {
      const validTypes = ['revenue', 'members', 'attendance', 'expenses', 'comprehensive']
      if (!validTypes.includes(type)) throw new Error(`Unknown forecasting type: ${type}`)
      const res = await api.get(`/reports/forecasting/${type}?${buildQuery(params)}`)
      if (isDev) console.log(`🔮 [reports] forecasting/${type}`, res)
      forecasting.value = unwrap(res)
      return forecasting.value
    })

  // ── Utilities ─────────────────────────────────────────────────────────────

  const formatCurrency = (value) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value || 0)

  const formatNumber = (value) =>
    new Intl.NumberFormat('id-ID').format(value || 0)

  const formatPeriod = (isoString) => {
    if (!isoString) return '-'
    return new Date(isoString).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const exportToCSV = (data, filename = 'report') => {
    if (!Array.isArray(data) || !data.length) return
    const headers = Object.keys(data[0])
    const rows = data.map(row => headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return {
    // State
    loading,
    error,
    gymOverview,
    checkinTrends,
    membershipStats,
    membersActive,
    membersGrowth,
    membersRetention,
    servicesPerformance,
    servicesActive,
    financeRevenue,
    financeProfitLoss,
    financeCashFlow,
    productsPerformance,
    productsTopSelling,
    productsByCategory,
    restaurantSales,
    restaurantTableUtil,
    restaurantTopItems,
    staffAttendance,
    staffDailyComposition,
    staffShiftSummary,
    commissionSummary,
    commissionTrends,
    commissionByTrainer,
    forecasting,
    dailySummary,

    // Gym
    getGymOverview,
    getCheckinTrends,
    getMembershipStats,

    // Members
    getMembersActive,
    getMembersGrowth,
    getMembersRetention,

    // Services
    getServicesPerformance,
    getServicesActive,

    // Finance
    getFinanceRevenue,
    getFinanceProfitLoss,
    getFinanceCashFlow,

    // Products
    getProductsPerformance,
    getProductsTopSelling,
    getProductsByCategory,

    // Restaurant
    getRestaurantSales,
    getRestaurantTableUtil,
    getRestaurantTopItems,

    // Staff
    getStaffAttendance,
    getStaffDailyComposition,
    getStaffShiftSummary,

    // Commissions
    getCommissionSummary,
    getCommissionTrends,
    getCommissionByTrainer,

    // Forecasting
    getForecasting,

    // Daily Summary Export
    getDailySummaryExport,

    // Utilities
    formatCurrency,
    formatNumber,
    formatPeriod,
    exportToCSV
  }
}
