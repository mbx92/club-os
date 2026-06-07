/**
 * Composable for Psychology Test Usage Billing Report
 * 
 * Handles:
 * - Fetch billing report (GET /psychology/reports/test-usage-billing)
 * - Export to Excel
 * - Filter by date range, test type, verification status
 * 
 * Use Cases:
 * - Monthly invoice generation
 * - Validation with clients
 * - Quality control (unverified tests)
 * - Test type specific usage reports
 */

import { ref, computed, inject } from 'vue'
import { useNotification } from '@/composables/core/useNotification'

export function useBillingReport() {
  const api = inject('api')
  const { showSuccess, showError, showWarning } = useNotification()

  // State
  const loading = ref(false)
  const exporting = ref(false)
  const report = ref(null)
  const error = ref(null)
  const paginationData = ref({})

  // Filters
  const filters = ref({
    startDate: null,
    endDate: null,
    testTypeId: null,
    verified: 'all', // 'all' | 'verified' | 'unverified'
    page: 1,
    limit: 1000 // Increased default to 1000 for better UX
  })

  // Computed
  const sessions = computed(() => report.value?.sessions || [])
  const summaryByTestType = computed(() => report.value?.summaryByTestType || [])
  const overallSummary = computed(() => report.value?.overallSummary || {})
  const pagination = computed(() => paginationData.value || {})
  const hasUnverifiedTests = computed(() => overallSummary.value?.unverifiedTests > 0)

  /**
   * Fetch billing report
   * @param {Object} params - Query parameters
   * @returns {Promise<Object|null>} Report data
   */
  const fetchReport = async (params = {}) => {
    loading.value = true
    error.value = null

    try {
      // Merge with default filters
      const queryParams = { ...filters.value, ...params }

      // Remove null/undefined values
      const cleanParams = Object.fromEntries(
        Object.entries(queryParams).filter(([_, v]) => v != null && v !== '')
      )

      console.log('🔧 Request params:', {
        original: queryParams,
        cleaned: cleanParams,
        url: '/psychology/reports/test-usage-billing'
      })

      const response = await api('/psychology/reports/test-usage-billing', {
        method: 'GET',
        params: cleanParams
      })

      console.log('🔍 Raw Response:', response)
      
      // Handle different response structures
      let data = response
      if (response?.data) {
        data = response.data
      }
      
      console.log('📊 Billing Report Response:', {
        hasData: !!data,
        hasDataProperty: !!data?.data,
        sessionsCount: data?.data?.sessions?.length,
        summaryCount: data?.data?.summaryByTestType?.length,
        success: data?.success,
        periodCovered: data?.data?.overallSummary?.periodCovered,
        requestedPeriod: {
          startDate: cleanParams.startDate,
          endDate: cleanParams.endDate
        },
        sampleSession: data?.data?.sessions?.[0],
        fullData: data
      })

      // Set report data - handle both wrapped and unwrapped responses
      const reportData = data?.data || data
      
      if (reportData && (reportData.sessions || reportData.summaryByTestType)) {
        report.value = {
          sessions: reportData.sessions || [],
          summaryByTestType: reportData.summaryByTestType || [],
          overallSummary: reportData.overallSummary || {}
        }
        
        // Set pagination data separately
        paginationData.value = data.pagination || reportData.pagination || {
          page: 1,
          limit: filters.value.limit,
          total: 0,
          totalPages: 1
        }
        
        console.log('✅ Report set successfully:', {
          sessionsCount: report.value.sessions.length,
          summaryCount: report.value.summaryByTestType.length,
          totalTests: report.value.overallSummary.totalTests,
          paginationInfo: paginationData.value,
          reportValue: report.value
        })
      } else {
        report.value = null
        paginationData.value = {}
        console.error('❌ Invalid response structure:', {
          data,
          reportData,
          hasDataData: !!data?.data,
          hasSessions: !!reportData?.sessions
        })
      }
      
      // Update filters from response
      if (data.filters) {
        filters.value = { ...filters.value, ...data.filters }
      }

      // Show warning if there are unverified tests
      if (hasUnverifiedTests.value) {
        showWarning(
          `⚠️ ${overallSummary.value.unverifiedTests} test belum diverifikasi`,
          { duration: 5000 }
        )
      }

      return report.value
    } catch (err) {
      const message = err?.data?.message || err?.message || 'Gagal memuat billing report'
      error.value = message
      showError(message)
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch monthly report
   * @param {number} month - Month (1-12)
   * @param {number} year - Year
   * @returns {Promise<Object|null>}
   */
  const fetchMonthlyReport = async (month, year) => {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`

    return await fetchReport({ startDate, endDate, page: 1, limit: 1000 })
  }

  /**
   * Fetch report for specific test type
   * @param {string} testTypeId - Test type UUID
   * @param {string} startDate - Start date
   * @param {string} endDate - End date
   * @returns {Promise<Object|null>}
   */
  const fetchByTestType = async (testTypeId, startDate, endDate) => {
    return await fetchReport({ testTypeId, startDate, endDate })
  }

  /**
   * Fetch only unverified tests
   * @param {string} startDate - Start date (optional)
   * @param {string} endDate - End date (optional)
   * @returns {Promise<Object|null>}
   */
  const fetchUnverified = async (startDate = null, endDate = null) => {
    return await fetchReport({ startDate, endDate, verified: 'unverified', limit: 1000 })
  }

  /**
   * Calculate total billing amount
   * @param {Object} rates - Test type rates (e.g., { 'CFIT': 50000, 'PAPI': 75000 })
   * @returns {Object} { breakdown, grandTotal }
   */
  const calculateBilling = (rates = {}) => {
    if (!summaryByTestType.value.length) {
      return { breakdown: [], grandTotal: 0 }
    }

    let grandTotal = 0
    const breakdown = summaryByTestType.value.map(item => {
      const rate = rates[item.testType.code] || 50000 // Default rate
      const subtotal = item.totalTests * rate

      grandTotal += subtotal

      return {
        testTypeCode: item.testType.code,
        testTypeName: item.testType.name,
        totalTests: item.totalTests,
        verifiedTests: item.verifiedTests,
        unverifiedTests: item.unverifiedTests,
        rate: rate,
        subtotal: subtotal
      }
    })

    return { breakdown, grandTotal }
  }

  /**
   * Export report to CSV
   * @param {string} filename - Optional filename
   */
  const exportToCSV = async (filename = null) => {
    if (!sessions.value.length) {
      showWarning('Tidak ada data untuk di-export')
      return
    }

    exporting.value = true

    try {
      // If there's more data than currently loaded, fetch all first
      if (pagination.value.total > sessions.value.length) {
        showInfo(`Mengambil semua ${pagination.value.total} data untuk export...`)
        
        await fetchReport({
          ...filters.value,
          limit: pagination.value.total || 10000,
          page: 1
        })
      }
      
      // Prepare CSV data
      const headers = [
        'Order Number',
        'Patient Name',
        'Patient Code',
        'Test Type',
        'Test Name',
        'Package',
        'Completed Date',
        'Duration (min)',
        'Questions Answered',
        'Total Questions',
        'Verified',
        'Verified By',
        'Verified At'
      ]

      const rows = sessions.value.map(session => [
        session.orderNumber || '-',
        session.patientName || '-',
        session.patientCode || '-',
        session.testType.code || '-',
        session.testType.name || '-',
        session.packageName || '-',
        session.completedAt ? new Date(session.completedAt).toLocaleString('id-ID') : '-',
        session.duration || '-',
        session.questionsAnswered || '-',
        session.totalQuestions || '-',
        session.verified?.isVerified ? 'Yes' : 'No',
        session.verified?.verifiedBy || '-',
        session.verified?.verifiedAt ? new Date(session.verified.verifiedAt).toLocaleString('id-ID') : '-'
      ])

      // Convert to CSV string
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n')

      // Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      const defaultFilename = filename || `Test_Usage_Billing_${filters.value.startDate}_${filters.value.endDate}.csv`
      link.download = defaultFilename
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      showSuccess('Data berhasil di-export ke CSV')
    } catch (err) {
      showError('Gagal export data: ' + err.message)
    } finally {
      exporting.value = false
    }
  }

  /**
   * Export report to Excel (requires XLSX library)
   * @param {string} filename - Optional filename
   */
  const exportToExcel = async (filename = null) => {
    if (!sessions.value.length) {
      showWarning('Tidak ada data untuk di-export')
      return
    }

    exporting.value = true

    try {
      // If there's more data than currently loaded, fetch all first
      if (pagination.value.total > sessions.value.length) {
        showInfo(`Mengambil semua ${pagination.value.total} data untuk export...`)
        
        await fetchReport({
          ...filters.value,
          limit: pagination.value.total || 10000,
          page: 1
        })
      }
      
      // Dynamically import XLSX
      const XLSX = await import('xlsx')

      // Create workbook
      const workbook = XLSX.utils.book_new()

      // Sheet 1: Summary
      const summaryData = summaryByTestType.value.map(item => ({
        'Kode Test': item.testType.code,
        'Nama Test': item.testType.name,
        'Kategori': item.testType.category,
        'Total Tests': item.totalTests,
        'Verified': item.verifiedTests,
        'Pending': item.unverifiedTests,
        'Avg Duration (min)': item.avgDurationMinutes || '-',
        'First Test': item.period?.firstTest ? new Date(item.period.firstTest).toLocaleDateString('id-ID') : '-',
        'Last Test': item.period?.lastTest ? new Date(item.period.lastTest).toLocaleDateString('id-ID') : '-'
      }))

      const summarySheet = XLSX.utils.json_to_sheet(summaryData)
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')

      // Sheet 2: Overall Summary
      const overallData = [
        { 'Metric': 'Total Tests', 'Value': overallSummary.value.totalTests || 0 },
        { 'Metric': 'Verified Tests', 'Value': overallSummary.value.verifiedTests || 0 },
        { 'Metric': 'Unverified Tests', 'Value': overallSummary.value.unverifiedTests || 0 },
        { 'Metric': 'Unique Test Types', 'Value': overallSummary.value.uniqueTestTypes || 0 },
        { 'Metric': 'Period Start', 'Value': filters.value.startDate || '-' },
        { 'Metric': 'Period End', 'Value': filters.value.endDate || '-' }
      ]
      const overallSheet = XLSX.utils.json_to_sheet(overallData)
      XLSX.utils.book_append_sheet(workbook, overallSheet, 'Overall')

      // Sheet 3: Details
      const detailsData = sessions.value.map(session => ({
        'Order Number': session.orderNumber || '-',
        'Patient Name': session.patientName || '-',
        'Patient Code': session.patientCode || '-',
        'Patient Email': session.patientEmail || '-',
        'Test Code': session.testType.code || '-',
        'Test Name': session.testType.name || '-',
        'Test Category': session.testType.category || '-',
        'Package': session.packageName || '-',
        'Completed Date': session.completedAt ? new Date(session.completedAt).toLocaleString('id-ID') : '-',
        'Duration (min)': session.duration || '-',
        'Questions Answered': session.questionsAnswered || '-',
        'Total Questions': session.totalQuestions || '-',
        'Completion %': session.totalQuestions ? Math.round((session.questionsAnswered / session.totalQuestions) * 100) : '-',
        'Verified': session.verified?.isVerified ? 'Yes' : 'No',
        'Verified By': session.verified?.verifiedBy || '-',
        'Verified At': session.verified?.verifiedAt ? new Date(session.verified.verifiedAt).toLocaleString('id-ID') : '-',
        'Has Interpretation': session.hasInterpretation ? 'Yes' : 'No',
        'Raw Score': session.scores?.raw || '-',
        'IQ Score': session.scores?.iq || '-',
        'Category': session.scores?.category || '-'
      }))

      const detailsSheet = XLSX.utils.json_to_sheet(detailsData)
      XLSX.utils.book_append_sheet(workbook, detailsSheet, 'Details')

      // Download
      const defaultFilename = filename || `Test_Usage_Billing_${filters.value.startDate}_${filters.value.endDate}.xlsx`
      XLSX.writeFile(workbook, defaultFilename)

      showSuccess('Data berhasil di-export ke Excel')
    } catch (err) {
      showError('Gagal export data: ' + err.message)
      console.error('Export error:', err)
    } finally {
      exporting.value = false
    }
  }

  /**
   * Generate invoice text/summary
   * @param {Object} rates - Test type rates
   * @returns {string} Invoice text
   */
  const generateInvoiceText = (rates = {}) => {
    const { breakdown, grandTotal } = calculateBilling(rates)

    let text = '='.repeat(50) + '\n'
    text += `INVOICE - ${overallSummary.value.periodCovered?.startDate || ''} to ${overallSummary.value.periodCovered?.endDate || ''}\n`
    text += '='.repeat(50) + '\n\n'

    text += 'Test Usage Summary:\n'
    text += '-'.repeat(50) + '\n'

    breakdown.forEach(item => {
      text += `${item.testTypeName} (${item.testTypeCode})\n`
      text += `  ${item.totalTests} tests @ Rp ${item.rate.toLocaleString('id-ID')}\n`
      text += `  Subtotal: Rp ${item.subtotal.toLocaleString('id-ID')}\n`
      text += `  (${item.verifiedTests} verified, ${item.unverifiedTests} pending)\n\n`
    })

    text += '-'.repeat(50) + '\n'
    text += `TOTAL TESTS: ${overallSummary.value.totalTests}\n`
    text += `GRAND TOTAL: Rp ${grandTotal.toLocaleString('id-ID')}\n`
    text += '='.repeat(50) + '\n'

    return text
  }

  /**
   * Set date range filter
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   */
  const setDateRange = (startDate, endDate) => {
    filters.value.startDate = startDate
    filters.value.endDate = endDate
  }

  /**
   * Reset filters to default
   */
  const resetFilters = () => {
    filters.value = {
      startDate: null,
      endDate: null,
      testTypeId: null,
      verified: 'all',
      page: 1,
      limit: 1000
    }
    report.value = null
    paginationData.value = {}
  }

  /**
   * Go to specific page
   * @param {number} page - Page number
   */
  const goToPage = (page) => {
    filters.value.page = page
    return fetchReport()
  }

  return {
    // State
    loading,
    exporting,
    report,
    error,
    filters,

    // Computed
    sessions,
    summaryByTestType,
    overallSummary,
    pagination,
    hasUnverifiedTests,

    // Methods
    fetchReport,
    fetchMonthlyReport,
    fetchByTestType,
    fetchUnverified,
    calculateBilling,
    exportToCSV,
    exportToExcel,
    generateInvoiceText,
    setDateRange,
    resetFilters,
    goToPage
  }
}
