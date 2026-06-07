# 📊 Phase 5: Reports & Analytics

**Duration:** Week 6-7  
**Effort:** ~30 hours  
**Priority:** MEDIUM  
**Dependencies:** Phase 1-4 complete  
**Status:** 📋 Ready to Start

---

## 📊 Overview

Build comprehensive reporting and analytics system for business insights: sales reports, product performance, table analytics, and daily summaries.

### Goals
1. ✅ Sales reports with flexible grouping (day/week/month/hour)
2. ✅ Product performance reports
3. ✅ Table performance analytics
4. ✅ Daily summary dashboard
5. ✅ Interactive charts and visualizations
6. ✅ Export capabilities (CSV/Excel)

### Success Criteria
- Sales reports show revenue trends
- Product performance identifies top sellers
- Table analytics show turnover and revenue
- Daily summaries provide actionable insights
- All reports exportable
- Charts are responsive and interactive

---

## 🗂️ Files to Create

### Composables (1 file)
```
src/composables/restaurant/
└── useRestaurantReports.js          ✨ NEW (~3 hours)
```

### Pages (5 files)
```
src/pages/restaurant/reports/
├── index.vue                        ✨ NEW (~3 hours)
├── sales.vue                        ✨ NEW (~4 hours)
├── products.vue                     ✨ NEW (~3 hours)
├── tables.vue                       ✨ NEW (~3 hours)
└── daily.vue                        ✨ NEW (~4 hours)
```

### Components (6 files)
```
src/components/restaurant/reports/
├── SalesChart.vue                   ✨ NEW (~3 hours)
├── ProductPerformanceTable.vue      ✨ NEW (~2 hours)
├── TableRevenueChart.vue            ✨ NEW (~2 hours)
├── DailySummaryCards.vue            ✨ NEW (~2 hours)
├── HourlySalesChart.vue             ✨ NEW (~2 hours)
└── PaymentMethodPieChart.vue        ✨ NEW (~2 hours)
```

---

## 📝 Files to Modify

### Dashboard (1 file)
```
src/pages/restaurant/
└── index.vue                        📝 UPDATE (~1 hour)
```

---

## 🔧 Implementation Details

### 1. Create useRestaurantReports Composable

**File:** `src/composables/restaurant/useRestaurantReports.js`

**API Endpoints:**
- GET `/restaurant/reports/sales`
- GET `/restaurant/reports/products`
- GET `/restaurant/reports/tables`
- GET `/restaurant/reports/daily-summary`
- GET `/restaurant/stock-report`

**Code Structure:**
```javascript
import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

export function useRestaurantReports() {
  const api = useApi()
  const { handleError } = useNotification()
  const isDev = import.meta.env.DEV

  // State
  const salesReport = ref(null)
  const productReport = ref(null)
  const tableReport = ref(null)
  const dailySummary = ref(null)
  const stockReport = ref(null)
  const loading = ref(false)
  const error = ref(null)

  // Get sales report
  const getSalesReport = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const queryParams = new URLSearchParams({
        startDate: params.startDate,
        endDate: params.endDate,
        groupBy: params.groupBy || 'day',
        ...params
      }).toString()

      const response = await api.get(`/restaurant/reports/sales?${queryParams}`)
      salesReport.value = response.data
      return response.data
    } catch (err) {
      if (isDev) console.error('Get sales report error:', err)
      error.value = err.message
      handleError(err, 'Failed to get sales report')
      throw err
    } finally {
      loading.value = false
    }
  }

  // Get product performance report
  const getProductReport = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const queryParams = new URLSearchParams({
        startDate: params.startDate,
        endDate: params.endDate,
        limit: params.limit || 10,
        sortBy: params.sortBy || 'quantity',
        ...params
      }).toString()

      const response = await api.get(`/restaurant/reports/products?${queryParams}`)
      productReport.value = response.data
      return response.data
    } catch (err) {
      if (isDev) console.error('Get product report error:', err)
      error.value = err.message
      handleError(err, 'Failed to get product report')
      throw err
    } finally {
      loading.value = false
    }
  }

  // Get table performance report
  const getTableReport = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const queryParams = new URLSearchParams({
        startDate: params.startDate,
        endDate: params.endDate,
        ...params
      }).toString()

      const response = await api.get(`/restaurant/reports/tables?${queryParams}`)
      tableReport.value = response.data
      return response.data
    } catch (err) {
      if (isDev) console.error('Get table report error:', err)
      error.value = err.message
      handleError(err, 'Failed to get table report')
      throw err
    } finally {
      loading.value = false
    }
  }

  // Get daily summary
  const getDailySummary = async (date, locationId = null) => {
    loading.value = true
    error.value = null
    try {
      const params = new URLSearchParams({ date })
      if (locationId) params.append('locationId', locationId)

      const response = await api.get(`/restaurant/reports/daily-summary?${params.toString()}`)
      dailySummary.value = response.data
      return response.data
    } catch (err) {
      if (isDev) console.error('Get daily summary error:', err)
      error.value = err.message
      handleError(err, 'Failed to get daily summary')
      throw err
    } finally {
      loading.value = false
    }
  }

  // Get stock report (alias)
  const getStockReport = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const queryParams = new URLSearchParams({
        reportType: params.reportType || 'current',
        ...params
      }).toString()

      const response = await api.get(`/restaurant/stock-report?${queryParams}`)
      stockReport.value = response.data
      return response.data
    } catch (err) {
      if (isDev) console.error('Get stock report error:', err)
      error.value = err.message
      handleError(err, 'Failed to get stock report')
      throw err
    } finally {
      loading.value = false
    }
  }

  // Export report to CSV
  const exportToCSV = (data, filename) => {
    try {
      const csv = convertToCSV(data)
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      if (isDev) console.error('Export CSV error:', err)
      handleError(err, 'Failed to export CSV')
    }
  }

  // Helper: Convert to CSV
  const convertToCSV = (data) => {
    if (!Array.isArray(data) || data.length === 0) return ''
    
    const headers = Object.keys(data[0])
    const rows = data.map(row => 
      headers.map(header => {
        const value = row[header]
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value
      }).join(',')
    )
    
    return [headers.join(','), ...rows].join('\n')
  }

  return {
    // State
    salesReport,
    productReport,
    tableReport,
    dailySummary,
    stockReport,
    loading,
    error,

    // Methods
    getSalesReport,
    getProductReport,
    getTableReport,
    getDailySummary,
    getStockReport,
    exportToCSV
  }
}
```

**Time Estimate:** 3 hours

---

### 2. Create Reports Index Page

**File:** `src/pages/restaurant/reports/index.vue`

**Features:**
- Reports overview/dashboard
- Quick links to detailed reports
- Key metrics summary
- Date range selector

**Code Structure:**
```vue
<route lang="yaml">
meta:
  title: Reports
  layout: default
</route>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { IconChartBar, IconShoppingCart, IconTable, IconCalendar, IconPackage } from '@tabler/icons-vue'
import { useRestaurantReports } from '@/composables/restaurant/useRestaurantReports'

const router = useRouter()
const { getDailySummary, loading } = useRestaurantReports()

const today = ref(new Date().toISOString().split('T')[0])
const summary = ref(null)

const loadSummary = async () => {
  try {
    summary.value = await getDailySummary(today.value)
  } catch (err) {
    console.error('Failed to load summary:', err)
  }
}

const reports = [
  {
    title: 'Sales Report',
    description: 'Revenue trends and payment analysis',
    icon: IconChartBar,
    route: '/restaurant/reports/sales',
    color: 'text-primary'
  },
  {
    title: 'Product Performance',
    description: 'Top selling products and categories',
    icon: IconShoppingCart,
    route: '/restaurant/reports/products',
    color: 'text-success'
  },
  {
    title: 'Table Analytics',
    description: 'Table turnover and revenue',
    icon: IconTable,
    route: '/restaurant/reports/tables',
    color: 'text-info'
  },
  {
    title: 'Daily Summary',
    description: 'Comprehensive daily report',
    icon: IconCalendar,
    route: '/restaurant/reports/daily',
    color: 'text-warning'
  },
  {
    title: 'Stock Report',
    description: 'Inventory levels and movements',
    icon: IconPackage,
    route: '/restaurant/stock',
    color: 'text-secondary'
  }
]

onMounted(() => {
  loadSummary()
})
</script>

<template>
  <div class="container mx-auto px-4 py-6">
    <h1 class="text-3xl font-bold mb-6">Reports & Analytics</h1>

    <!-- Today's Summary -->
    <div v-if="summary" class="stats shadow w-full mb-6">
      <div class="stat">
        <div class="stat-title">Total Orders</div>
        <div class="stat-value">{{ summary.totalOrders }}</div>
        <div class="stat-desc">{{ today }}</div>
      </div>
      <div class="stat">
        <div class="stat-title">Revenue</div>
        <div class="stat-value text-primary">
          {{ new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(summary.totalRevenue) }}
        </div>
        <div class="stat-desc">Today's sales</div>
      </div>
      <div class="stat">
        <div class="stat-title">Avg Order Value</div>
        <div class="stat-value text-success">
          {{ new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(summary.avgOrderValue) }}
        </div>
        <div class="stat-desc">Per order</div>
      </div>
    </div>

    <!-- Report Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="report in reports"
        :key="report.route"
        class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer"
        @click="router.push(report.route)"
      >
        <div class="card-body">
          <component :is="report.icon" :class="['w-12 h-12 mb-4', report.color]" />
          <h2 class="card-title">{{ report.title }}</h2>
          <p class="text-base-content/60">{{ report.description }}</p>
          <div class="card-actions justify-end mt-4">
            <button class="btn btn-primary btn-sm">View Report</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
```

**Time Estimate:** 3 hours

---

### 3. Create Sales Report Page

**File:** `src/pages/restaurant/reports/sales.vue`

**Features:**
- Date range selector
- Group by selector (day/week/month/hour)
- Location filter
- Order type filter
- Sales trend chart
- Payment method breakdown
- Export to CSV

**Time Estimate:** 4 hours

---

### 4. Create Product Performance Page

**File:** `src/pages/restaurant/reports/products.vue`

**Features:**
- Date range selector
- Category filter
- Sort by (quantity/revenue)
- Top products table
- Category breakdown chart
- Export to CSV

**Time Estimate:** 3 hours

---

### 5. Create Table Performance Page

**File:** `src/pages/restaurant/reports/tables.vue`

**Features:**
- Date range selector
- Location filter
- Table turnover metrics
- Revenue per table
- Table utilization chart
- Export to CSV

**Time Estimate:** 3 hours

---

### 6. Create Daily Summary Page

**File:** `src/pages/restaurant/reports/daily.vue`

**Features:**
- Date selector
- Location filter
- Comprehensive metrics cards
- Hourly sales distribution
- Top products of the day
- Payment method breakdown
- Order type breakdown
- Export to PDF/CSV

**Time Estimate:** 4 hours

---

### 7. Create SalesChart Component

**File:** `src/components/restaurant/reports/SalesChart.vue`

**Features:**
- Line/bar chart for sales trends
- Multiple data series (revenue, orders, avg)
- Responsive design
- Interactive tooltips
- Time-based X-axis

**Recommendation:** Use Chart.js or ApexCharts

**Code Structure (using Chart.js):**
```vue
<script setup>
import { ref, computed, watch } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

const props = defineProps({
  data: {
    type: Array,
    default: () => []
  },
  groupBy: {
    type: String,
    default: 'day'
  }
})

const chartData = computed(() => {
  return {
    labels: props.data.map(d => d.period),
    datasets: [
      {
        label: 'Revenue',
        data: props.data.map(d => d.revenue),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4
      },
      {
        label: 'Orders',
        data: props.data.map(d => d.orders),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
        yAxisID: 'y1'
      }
    ]
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false
  },
  scales: {
    y: {
      type: 'linear',
      display: true,
      position: 'left',
      title: {
        display: true,
        text: 'Revenue (IDR)'
      }
    },
    y1: {
      type: 'linear',
      display: true,
      position: 'right',
      title: {
        display: true,
        text: 'Orders'
      },
      grid: {
        drawOnChartArea: false
      }
    }
  }
}
</script>

<template>
  <div class="w-full h-96">
    <Line :data="chartData" :options="chartOptions" />
  </div>
</template>
```

**Time Estimate:** 3 hours

---

### 8. Create ProductPerformanceTable Component

**File:** `src/components/restaurant/reports/ProductPerformanceTable.vue`

**Features:**
- Sortable table
- Product name, category, quantity, revenue
- Bar chart inline for visual comparison
- Pagination

**Time Estimate:** 2 hours

---

### 9. Create Additional Chart Components

**Files:**
- `TableRevenueChart.vue` - Bar chart for table revenue
- `DailySummaryCards.vue` - Metric cards for daily summary
- `HourlySalesChart.vue` - Hourly distribution chart
- `PaymentMethodPieChart.vue` - Payment method breakdown

**Time Estimate:** 2 hours each (8 hours total)

---

## 📦 Additional Dependencies

Install charting library:

```bash
npm install chart.js vue-chartjs
# OR
npm install apexcharts vue3-apexcharts
```

Install date utilities (if not already installed):

```bash
npm install date-fns
# OR
npm install dayjs
```

---

## ✅ Testing Checklist

### Sales Reports
- [ ] Generate sales report for date range
- [ ] Group by day shows daily data
- [ ] Group by week shows weekly aggregates
- [ ] Group by month shows monthly aggregates
- [ ] Group by hour shows hourly distribution
- [ ] Location filter works
- [ ] Order type filter works
- [ ] Chart renders correctly
- [ ] Export to CSV works

### Product Reports
- [ ] Top products by quantity
- [ ] Top products by revenue
- [ ] Category filter works
- [ ] Date range filter works
- [ ] Table is sortable
- [ ] Export to CSV works

### Table Reports
- [ ] Table turnover calculated correctly
- [ ] Revenue per table accurate
- [ ] Location filter works
- [ ] Chart displays properly
- [ ] Export to CSV works

### Daily Summary
- [ ] All metrics display correctly
- [ ] Hourly distribution shows 24 hours
- [ ] Top products listed
- [ ] Payment breakdown accurate
- [ ] Order type breakdown correct
- [ ] Export to CSV/PDF works

---

## 📊 Progress Tracking

- [ ] useRestaurantReports composable created
- [ ] Reports index page created
- [ ] Sales report page created
- [ ] Product report page created
- [ ] Table report page created
- [ ] Daily summary page created
- [ ] SalesChart component created
- [ ] ProductPerformanceTable component created
- [ ] TableRevenueChart component created
- [ ] DailySummaryCards component created
- [ ] HourlySalesChart component created
- [ ] PaymentMethodPieChart component created
- [ ] Dashboard updated with reports link
- [ ] All tests passing

**Estimated Completion:** End of Week 7

---

## 🚀 Next Steps

After completing Phase 5, proceed to:
- **Phase 6:** Combined Billing (Feature-gated)
- Review `RESTAURANT-PHASE-6-COMBINED-BILLING.md`

---

**Created:** December 1, 2025  
**Status:** 📋 Ready to Start
