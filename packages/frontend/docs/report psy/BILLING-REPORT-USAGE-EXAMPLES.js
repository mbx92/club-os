/**
 * Frontend Usage Examples - Billing Report Composable
 * 
 * Contoh-contoh penggunaan useBillingReport() dalam berbagai skenario
 */

// ============================================
// Example 1: Basic Usage - Vue Component
// ============================================

<template>
  <div>
    <h2>Billing Report - {{ monthName }}</h2>
    
    <div v-if="loading">Loading...</div>
    
    <div v-else-if="overallSummary.totalTests">
      <p>Total Tests: {{ overallSummary.totalTests }}</p>
      <p>Verified: {{ overallSummary.verifiedTests }}</p>
      <p>Pending: {{ overallSummary.unverifiedTests }}</p>
      
      <button @click="handleExport">Export to Excel</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useBillingReport } from '@/composables/psychology'

const {
  loading,
  overallSummary,
  fetchMonthlyReport,
  exportToExcel
} = useBillingReport()

const monthName = ref('January 2026')

onMounted(async () => {
  await fetchMonthlyReport(1, 2026)
})

const handleExport = () => {
  exportToExcel('January_2026_Billing.xlsx')
}
</script>

// ============================================
// Example 2: Dashboard Widget
// ============================================

<template>
  <div class="billing-widget">
    <h3>This Month's Usage</h3>
    
    <div class="stats">
      <div class="stat">
        <label>Total Tests</label>
        <strong>{{ overallSummary.totalTests || 0 }}</strong>
      </div>
      <div class="stat">
        <label>Verified</label>
        <strong class="text-success">{{ overallSummary.verifiedTests || 0 }}</strong>
      </div>
      <div class="stat warning" v-if="hasUnverifiedTests">
        <label>Pending Verification</label>
        <strong>{{ overallSummary.unverifiedTests }}</strong>
      </div>
    </div>
    
    <button @click="viewFullReport">View Full Report</button>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useBillingReport } from '@/composables/psychology'

const router = useRouter()

const {
  overallSummary,
  hasUnverifiedTests,
  fetchMonthlyReport
} = useBillingReport()

onMounted(() => {
  const now = new Date()
  fetchMonthlyReport(now.getMonth() + 1, now.getFullYear())
})

const viewFullReport = () => {
  router.push('/psychology/reports/billing')
}
</script>

// ============================================
// Example 3: Auto-generate Monthly Invoice
// ============================================

<script setup>
import { ref } from 'vue'
import { useBillingReport } from '@/composables/psychology'

const { 
  fetchMonthlyReport, 
  calculateBilling,
  summaryByTestType 
} = useBillingReport()

const invoiceData = ref(null)

async function generateMonthlyInvoice(month, year) {
  // 1. Fetch report data
  const report = await fetchMonthlyReport(month, year)
  
  if (!report) {
    console.error('Failed to fetch report')
    return null
  }
  
  // 2. Calculate billing with rates
  const rates = {
    'CFIT': 50000,
    'PAPI': 75000,
    'EPPS': 60000,
    'DISC': 50000,
    'MBTI': 65000
  }
  
  const billing = calculateBilling(rates)
  
  // 3. Prepare invoice data
  invoiceData.value = {
    invoiceNumber: `INV-${year}-${String(month).padStart(2, '0')}`,
    period: {
      month: month,
      year: year,
      monthName: getMonthName(month)
    },
    breakdown: billing.breakdown,
    grandTotal: billing.grandTotal,
    totalTests: report.overallSummary.totalTests,
    verifiedTests: report.overallSummary.verifiedTests,
    unverifiedTests: report.overallSummary.unverifiedTests
  }
  
  return invoiceData.value
}

function getMonthName(month) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  return months[month - 1]
}

// Usage:
// const invoice = await generateMonthlyInvoice(1, 2026)
</script>

// ============================================
// Example 4: Quality Control Check
// ============================================

<script setup>
import { ref } from 'vue'
import { useBillingReport } from '@/composables/psychology'
import { useNotification } from '@/composables/core/useNotification'

const { showWarning, showSuccess } = useNotification()

const {
  fetchUnverified,
  overallSummary,
  sessions
} = useBillingReport()

const unverifiedSessions = ref([])

async function checkUnverifiedTests(startDate, endDate) {
  await fetchUnverified(startDate, endDate)
  
  if (overallSummary.value.totalTests > 0) {
    unverifiedSessions.value = sessions.value
    
    showWarning(
      `⚠️ ${overallSummary.value.totalTests} tests pending verification`,
      { duration: 5000 }
    )
    
    return {
      ready: false,
      count: overallSummary.value.totalTests,
      sessions: unverifiedSessions.value
    }
  } else {
    showSuccess('✅ All tests verified. Ready for billing!')
    
    return {
      ready: true,
      count: 0,
      sessions: []
    }
  }
}

// Usage:
// const check = await checkUnverifiedTests('2026-01-01', '2026-01-31')
// if (!check.ready) {
//   console.log('Pending sessions:', check.sessions)
// }
</script>

// ============================================
// Example 5: Filter by Test Type
// ============================================

<script setup>
import { ref } from 'vue'
import { useBillingReport } from '@/composables/psychology'

const {
  fetchByTestType,
  summaryByTestType
} = useBillingReport()

const cfitUsage = ref(null)

async function getCFITUsageReport(startDate, endDate, cfitTestTypeId) {
  await fetchByTestType(cfitTestTypeId, startDate, endDate)
  
  if (summaryByTestType.value.length > 0) {
    const summary = summaryByTestType.value[0]
    
    cfitUsage.value = {
      testType: summary.testType,
      totalTests: summary.totalTests,
      verifiedTests: summary.verifiedTests,
      unverifiedTests: summary.unverifiedTests,
      avgDuration: summary.avgDurationMinutes,
      period: summary.period
    }
    
    console.log('\n📊 CFIT Usage Report')
    console.log(`Period: ${startDate} to ${endDate}`)
    console.log(`Total Tests: ${summary.totalTests}`)
    console.log(`Average Duration: ${summary.avgDurationMinutes} minutes`)
    console.log(`Verified: ${summary.verifiedTests}`)
    
    return cfitUsage.value
  }
  
  return null
}

// Usage:
// const usage = await getCFITUsageReport('2026-01-01', '2026-01-31', 'cfit-uuid')
</script>

// ============================================
// Example 6: Pagination Navigation
// ============================================

<template>
  <div>
    <div v-for="session in sessions" :key="session.sessionId">
      {{ session.patientName }} - {{ session.testType.name }}
    </div>
    
    <div class="pagination">
      <button 
        :disabled="pagination.page <= 1"
        @click="previousPage"
      >
        Previous
      </button>
      
      <span>Page {{ pagination.page }} of {{ pagination.totalPages }}</span>
      
      <button 
        :disabled="pagination.page >= pagination.totalPages"
        @click="nextPage"
      >
        Next
      </button>
    </div>
  </div>
</template>

<script setup>
import { useBillingReport } from '@/composables/psychology'

const {
  sessions,
  pagination,
  goToPage
} = useBillingReport()

const nextPage = () => {
  goToPage(pagination.value.page + 1)
}

const previousPage = () => {
  goToPage(pagination.value.page - 1)
}
</script>

// ============================================
// Example 7: Custom Export with Filtering
// ============================================

<script setup>
import { useBillingReport } from '@/composables/psychology'

const {
  fetchReport,
  exportToExcel,
  sessions
} = useBillingReport()

async function exportVerifiedOnlyReport(startDate, endDate) {
  // Fetch only verified tests
  await fetchReport({
    startDate,
    endDate,
    verified: 'verified',
    limit: 10000 // Get all
  })
  
  // Export to Excel
  const filename = `Verified_Tests_${startDate}_${endDate}.xlsx`
  await exportToExcel(filename)
  
  console.log(`Exported ${sessions.value.length} verified tests`)
}

// Usage:
// await exportVerifiedOnlyReport('2026-01-01', '2026-01-31')
</script>

// ============================================
// Example 8: Generate Invoice Text
// ============================================

<script setup>
import { useBillingReport } from '@/composables/psychology'

const {
  fetchMonthlyReport,
  generateInvoiceText
} = useBillingReport()

async function createInvoiceText(month, year) {
  await fetchMonthlyReport(month, year)
  
  const rates = {
    'CFIT': 50000,
    'PAPI': 75000,
    'EPPS': 60000,
    'DISC': 50000,
    'MBTI': 65000
  }
  
  const invoiceText = generateInvoiceText(rates)
  
  // Copy to clipboard
  navigator.clipboard.writeText(invoiceText)
  
  console.log('Invoice text copied to clipboard!')
  console.log(invoiceText)
  
  return invoiceText
}

// Usage:
// const text = await createInvoiceText(1, 2026)
</script>

// ============================================
// Example 9: Reactive Date Range Picker
// ============================================

<template>
  <div>
    <label>Start Date</label>
    <input v-model="filters.startDate" type="date" />
    
    <label>End Date</label>
    <input v-model="filters.endDate" type="date" />
    
    <button @click="applyFilters">Apply</button>
    <button @click="clearFilters">Clear</button>
    
    <div v-if="overallSummary.totalTests">
      Found {{ overallSummary.totalTests }} tests
    </div>
  </div>
</template>

<script setup>
import { useBillingReport } from '@/composables/psychology'

const {
  filters,
  overallSummary,
  fetchReport,
  resetFilters
} = useBillingReport()

const applyFilters = () => {
  fetchReport()
}

const clearFilters = () => {
  resetFilters()
}
</script>

// ============================================
// Example 10: Batch Export Multiple Months
// ============================================

<script setup>
import { useBillingReport } from '@/composables/psychology'

const {
  fetchMonthlyReport,
  exportToExcel
} = useBillingReport()

async function exportQuarterlyReports(year, quarter) {
  const months = {
    1: [1, 2, 3],      // Q1
    2: [4, 5, 6],      // Q2
    3: [7, 8, 9],      // Q3
    4: [10, 11, 12]    // Q4
  }
  
  const quarterMonths = months[quarter]
  
  for (const month of quarterMonths) {
    await fetchMonthlyReport(month, year)
    
    const monthName = getMonthName(month)
    await exportToExcel(`${year}_${monthName}_Billing.xlsx`)
    
    // Wait 1 second between exports
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  console.log(`✅ Exported Q${quarter} ${year} reports`)
}

function getMonthName(month) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  return months[month - 1]
}

// Usage:
// await exportQuarterlyReports(2026, 1) // Export Q1 2026
</script>

// ============================================
// Example 11: Validation Before Billing
// ============================================

<script setup>
import { ref } from 'vue'
import { useBillingReport } from '@/composables/psychology'
import { useNotification } from '@/composables/core/useNotification'

const { showError, showSuccess, showWarning } = useNotification()

const {
  fetchMonthlyReport,
  hasUnverifiedTests,
  overallSummary,
  exportToExcel
} = useBillingReport()

const validationResults = ref(null)

async function validateAndExportBilling(month, year) {
  // Step 1: Fetch report
  const report = await fetchMonthlyReport(month, year)
  
  if (!report) {
    showError('Failed to fetch report')
    return false
  }
  
  // Step 2: Validate
  const validation = {
    hasData: overallSummary.value.totalTests > 0,
    allVerified: !hasUnverifiedTests.value,
    unverifiedCount: overallSummary.value.unverifiedTests
  }
  
  validationResults.value = validation
  
  // Step 3: Check validation results
  if (!validation.hasData) {
    showError('No test data found for this period')
    return false
  }
  
  if (!validation.allVerified) {
    const proceed = confirm(
      `${validation.unverifiedCount} tests are unverified. Proceed anyway?`
    )
    
    if (!proceed) {
      showWarning('Export cancelled. Please verify all tests first.')
      return false
    }
  }
  
  // Step 4: Export
  const filename = `Billing_${year}_${String(month).padStart(2, '0')}.xlsx`
  await exportToExcel(filename)
  
  showSuccess('Billing report exported successfully!')
  return true
}

// Usage:
// const success = await validateAndExportBilling(1, 2026)
</script>

// ============================================
// Example 12: Watch Filters for Auto-update
// ============================================

<script setup>
import { watch } from 'vue'
import { useBillingReport } from '@/composables/psychology'

const {
  filters,
  fetchReport
} = useBillingReport()

// Auto-fetch when filters change
watch(
  () => [filters.value.startDate, filters.value.endDate, filters.value.verified],
  ([startDate, endDate, verified]) => {
    if (startDate && endDate) {
      fetchReport()
    }
  },
  { debounce: 500 } // Wait 500ms after last change
)
</script>

// ============================================
// Notes:
// ============================================

/**
 * Best Practices:
 * 
 * 1. Always check if data exists before accessing
 * 2. Use loading states to show feedback
 * 3. Validate before exporting or billing
 * 4. Handle errors gracefully
 * 5. Use notifications for user feedback
 * 6. Debounce filter changes
 * 7. Set reasonable limits for pagination
 * 8. Cache reports when possible
 */

/**
 * Performance Tips:
 * 
 * 1. Use pagination for large datasets
 * 2. Limit date ranges to reasonable periods
 * 3. Export in background for large data
 * 4. Use debouncing for filter changes
 * 5. Cache monthly reports
 */
