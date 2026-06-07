<route lang="yaml">
meta:
  title: Top Selling Analytics
  layout: default
</route>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useFinanceAnalytics } from '@/composables/finances/useFinanceAnalytics'
import {
  IconShoppingCart,
  IconUsers,
  IconRefresh,
  IconTrendingUp,
  IconCalendar
} from '@tabler/icons-vue'

const { topProducts, topServices, productsLoading, servicesLoading, fetchTopProducts, fetchTopServices,
        notSellingProducts, notSellingServices, notSellingProductsLoading, notSellingServicesLoading,
        fetchNotSellingProducts, fetchNotSellingServices } = useFinanceAnalytics()

// Filters
const productFilters = ref({
  sortBy: 'revenue',
  transactionType: '',
  locationId: '',
  startDate: getFirstDayOfMonth(),
  endDate: getLastDayOfMonth(),
  limit: 10
})

const serviceFilters = ref({
  sortBy: 'revenue',
  serviceType: 'all',
  locationId: '',
  startDate: getFirstDayOfMonth(),
  endDate: getLastDayOfMonth(),
  limit: 10
})

const notSellingServiceFilters = ref({
  serviceType: 'all',
  locationId: '',
  startDate: getFirstDayOfMonth(),
  endDate: getLastDayOfMonth(),
  limit: 50
})

function getFirstDayOfMonth () {
  const d = new Date()
  return formatLocalDate(new Date(d.getFullYear(), d.getMonth(), 1))
}
function getLastDayOfMonth () {
  const d = new Date()
  return formatLocalDate(new Date(d.getFullYear(), d.getMonth() + 1, 0))
}

// Format date as YYYY-MM-DD in LOCAL timezone (not UTC)
function formatLocalDate (date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const selectedPeriod = ref('month')

// Month & week-of-month pickers
const today = new Date()
const selectedMonthYear = ref(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`)
const selectedWeek = ref(0) // 0 = full month, 1–5 = week number

// Returns array of week ranges for a given 'YYYY-MM' string
function getWeeksInMonth (yearMonth) {
  const [y, m] = yearMonth.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  const weeks = []
  let weekNum = 1
  let start = 1
  while (start <= lastDay) {
    const end = Math.min(start + 6, lastDay)
    weeks.push({ num: weekNum, start, end })
    weekNum++
    start = end + 1
  }
  return weeks
}

const weeksInMonth = computed(() => getWeeksInMonth(selectedMonthYear.value))

function applyMonthWeekFilter () {
  selectedPeriod.value = 'custom'
  const [y, m] = selectedMonthYear.value.split('-').map(Number)
  let start, end
  if (selectedWeek.value === 0) {
    // full month
    start = formatLocalDate(new Date(y, m - 1, 1))
    end = formatLocalDate(new Date(y, m, 0))
  } else {
    const week = weeksInMonth.value.find(w => w.num === selectedWeek.value)
    if (!week) return
    start = formatLocalDate(new Date(y, m - 1, week.start))
    end = formatLocalDate(new Date(y, m - 1, week.end))
  }
  productFilters.value.startDate = start
  productFilters.value.endDate = end
  serviceFilters.value.startDate = start
  serviceFilters.value.endDate = end
  loadAll()
}

const setPeriod = (period) => {
  selectedPeriod.value = period
  selectedWeek.value = 0
  const now = new Date()
  let start, end

  if (period === 'today') {
    const t = formatLocalDate(now)
    start = t; end = t
  } else if (period === 'week') {
    const s = new Date(now)
    const day = now.getDay() // 0=Sun, 1=Mon, ...6=Sat
    const diffToMonday = day === 0 ? -6 : 1 - day // roll back to Monday
    s.setDate(now.getDate() + diffToMonday)
    start = formatLocalDate(s)
    end = formatLocalDate(now)
  } else if (period === 'month') {
    start = getFirstDayOfMonth()
    end = getLastDayOfMonth()
  } else if (period === 'year') {
    start = `${now.getFullYear()}-01-01`
    end = `${now.getFullYear()}-12-31`
  }

  productFilters.value.startDate = start
  productFilters.value.endDate = end
  serviceFilters.value.startDate = start
  serviceFilters.value.endDate = end
  loadAll()
}

// Strip empty string / undefined values before sending to API
// Also strip serviceType 'all' since backend expects omission to mean all
const cleanParams = (obj) => {
  return Object.fromEntries(
    Object.entries(obj).filter(([k, v]) => {
      if (v === '' || v === null || v === undefined) return false
      if (k === 'serviceType' && v === 'all') return false
      return true
    })
  )
}

// Exclude sortBy from fetch — sorting is done client-side so transition-group can animate FLIP
const loadProducts = () => {
  const { sortBy, ...params } = productFilters.value
  fetchTopProducts(cleanParams(params))
}
const loadServices = () => {
  const { sortBy, ...params } = serviceFilters.value
  fetchTopServices(cleanParams(params))
}
const loadNotSelling = () => {
  const base = { startDate: productFilters.value.startDate, endDate: productFilters.value.endDate, locationId: productFilters.value.locationId }
  fetchNotSellingProducts(cleanParams(base))
  fetchNotSellingServices(cleanParams({ ...base, serviceType: notSellingServiceFilters.value.serviceType }))
}
const loadAll = () => { loadProducts(); loadServices(); loadNotSelling() }

// Client-side sort — same data, just reordered, so transition-group animates the move
const sortedProducts = computed(() => {
  const list = [...topProducts.value]
  if (productFilters.value.sortBy === 'quantity') {
    list.sort((a, b) => (b.totalQuantity || b.quantity || 0) - (a.totalQuantity || a.quantity || 0))
  } else {
    list.sort((a, b) => (b.totalRevenue || b.revenue || 0) - (a.totalRevenue || a.revenue || 0))
  }
  return list
})

const sortedServices = computed(() => {
  const list = [...topServices.value]
  if (serviceFilters.value.sortBy === 'transactions') {
    list.sort((a, b) => (b.transactionCount || b.totalCount || b.count || 0) - (a.transactionCount || a.totalCount || a.count || 0))
  } else {
    list.sort((a, b) => (b.totalRevenue || b.revenue || 0) - (a.totalRevenue || a.revenue || 0))
  }
  return list
})

const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return 'Rp 0'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

const formatNumber = (n) => {
  if (!n && n !== 0) return '0'
  return new Intl.NumberFormat('id-ID').format(n)
}

// sortBy changes: re-sort client-side only (no re-fetch needed)
// serviceType changes: re-fetch because it's a different dataset
watch(() => serviceFilters.value.serviceType, loadServices)
watch(() => notSellingServiceFilters.value.serviceType, () => fetchNotSellingServices(cleanParams({
  startDate: productFilters.value.startDate,
  endDate: productFilters.value.endDate,
  locationId: productFilters.value.locationId,
  serviceType: notSellingServiceFilters.value.serviceType
})))

onMounted(loadAll)
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-3xl font-bold">Top Selling Analytics</h1>
        <p class="text-base-content/60 mt-1">Produk dan layanan terlaris berdasarkan revenue & kuantitas</p>
      </div>
      <div class="flex gap-2">
        <button class="btn btn-ghost btn-sm" :disabled="productsLoading && servicesLoading" @click="loadAll">
          <IconRefresh class="w-4 h-4" :class="{ 'animate-spin': productsLoading || servicesLoading }" />
        </button>
      </div>
    </div>

    <!-- Period Filter -->
    <div class="card bg-base-100 shadow mb-6">
      <div class="card-body py-3 px-4">
        <!-- Quick period buttons -->
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-sm font-medium text-base-content/60 shrink-0">Period:</span>
          <div class="join">
            <button v-for="p in [['today','Hari Ini'],['week','Minggu Ini'],['month','Bulan Ini'],['year','Tahun Ini']]" :key="p[0]"
              class="join-item btn btn-sm"
              :class="selectedPeriod === p[0] ? 'btn-primary' : 'btn-ghost'"
              @click="setPeriod(p[0])">{{ p[1] }}</button>
          </div>
          <div class="divider divider-horizontal mx-0 hidden sm:flex"></div>
          <!-- Month picker -->
          <div class="flex items-center gap-2 flex-wrap">
            <IconCalendar class="w-4 h-4 text-base-content/50 shrink-0" />
            <input
              type="month"
              class="input input-sm input-bordered w-36"
              :class="selectedPeriod === 'custom' ? 'input-primary' : ''"
              v-model="selectedMonthYear"
              @change="selectedWeek = 0; applyMonthWeekFilter()"
            />
          </div>
        </div>

        <!-- Week-of-month selector (shown when custom month active) -->
        <div v-if="selectedPeriod === 'custom'" class="flex items-center gap-2 mt-2 flex-wrap">
          <span class="text-xs font-medium text-base-content/50 shrink-0">Minggu:</span>
          <div class="join">
            <button
              class="join-item btn btn-xs"
              :class="selectedWeek === 0 ? 'btn-primary' : 'btn-ghost'"
              @click="selectedWeek = 0; applyMonthWeekFilter()">Semua</button>
            <button
              v-for="w in weeksInMonth" :key="w.num"
              class="join-item btn btn-xs"
              :class="selectedWeek === w.num ? 'btn-primary' : 'btn-ghost'"
              @click="selectedWeek = w.num; applyMonthWeekFilter()">
              Minggu {{ w.num }}
              <span class="text-xs opacity-60 hidden sm:inline">&nbsp;({{ w.start }}-{{ w.end }})</span>
            </button>
          </div>
        </div>

        <!-- Active range label -->
        <div class="text-xs text-base-content/40 mt-1">
          <span>{{ productFilters.startDate }} s/d {{ productFilters.endDate }}</span>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Top Products -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <div class="flex items-center justify-between mb-4">
            <h3 class="card-title text-base flex items-center gap-2">
              <IconShoppingCart class="w-5 h-5 text-primary" />
              Top Selling Products
            </h3>
            <!-- Sort Filter -->
            <div class="join">
              <button class="join-item btn btn-xs"
                :class="productFilters.sortBy === 'revenue' ? 'btn-primary' : 'btn-ghost'"
                @click="productFilters.sortBy = 'revenue'">Revenue</button>
              <button class="join-item btn btn-xs"
                :class="productFilters.sortBy === 'quantity' ? 'btn-primary' : 'btn-ghost'"
                @click="productFilters.sortBy = 'quantity'">Quantity</button>
            </div>
          </div>

          <div v-if="productsLoading" class="space-y-3">
            <div v-for="i in 8" :key="i" class="skeleton h-10 w-full"></div>
          </div>

          <transition-group v-else-if="sortedProducts.length > 0" tag="div" name="rank" class="relative">
            <div v-for="(product, index) in sortedProducts" :key="product.itemId || product.id"
              class="flex items-center justify-between py-2.5 text-sm border-b border-base-200 last:border-0">
              <div class="flex items-center gap-2 min-w-0">
                <span class="font-bold text-base-content/30 w-5 text-right shrink-0 text-xs">{{ index + 1 }}</span>
                <div class="min-w-0">
                  <p class="font-semibold truncate">{{ product.itemName || product.name || product.productName }}</p>
                  <p v-if="product.transactionType || product.category || product.categoryName" class="text-xs text-base-content/40 capitalize">
                    {{ product.transactionType || product.category || product.categoryName }}
                  </p>
                </div>
              </div>
              <div class="text-right shrink-0 ml-3">
                <p class="font-bold text-sm" :class="productFilters.sortBy === 'revenue' ? 'text-success' : 'text-base-content/50'">
                  {{ formatCurrency(product.totalRevenue || product.revenue) }}
                </p>
                <p class="text-xs" :class="productFilters.sortBy === 'quantity' ? 'text-primary font-semibold' : 'text-base-content/40'">
                  {{ formatNumber(product.totalQuantity || product.quantity) }} unit
                </p>
              </div>
            </div>
          </transition-group>

          <div v-else class="text-center py-8 text-base-content/40">
            No product data for selected period
          </div>
        </div>
      </div>

      <!-- Top Services / Memberships -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <div class="flex items-center justify-between mb-4">
            <h3 class="card-title text-base flex items-center gap-2">
              <IconUsers class="w-5 h-5 text-secondary" />
              Top Services & Memberships
            </h3>
            <div class="flex items-center gap-2">
              <!-- Sort Filter -->
              <div class="join">
                <button class="join-item btn btn-xs"
                  :class="serviceFilters.sortBy === 'revenue' ? 'btn-secondary' : 'btn-ghost'"
                  @click="serviceFilters.sortBy = 'revenue'">Revenue</button>
                <button class="join-item btn btn-xs"
                  :class="serviceFilters.sortBy === 'transactions' ? 'btn-secondary' : 'btn-ghost'"
                  @click="serviceFilters.sortBy = 'transactions'">Transaksi</button>
              </div>
              <!-- Service Type Filter -->
              <select v-model="serviceFilters.serviceType" class="select select-bordered select-xs">
                <option value="all">All</option>
                <option value="membership">Membership</option>
                <option value="service_plan">Service Plan</option>
              </select>
            </div>
          </div>

          <div v-if="servicesLoading" class="space-y-3">
            <div v-for="i in 8" :key="i" class="skeleton h-10 w-full"></div>
          </div>

          <transition-group v-else-if="sortedServices.length > 0" tag="div" name="rank" class="relative">
            <div v-for="(service, index) in sortedServices" :key="service.itemId || service.id"
              class="flex items-center justify-between py-2.5 text-sm border-b border-base-200 last:border-0">
              <div class="flex items-center gap-2 min-w-0">
                <span class="font-bold text-base-content/30 w-5 text-right shrink-0 text-xs">{{ index + 1 }}</span>
                <div class="min-w-0">
                  <p class="font-semibold truncate">{{ service.itemName || service.name || service.serviceName }}</p>
                  <div class="flex items-center gap-1 mt-0.5">
                    <span v-if="service.transactionType || service.type || service.serviceType"
                      class="badge badge-xs capitalize"
                      :class="(service.transactionType || service.type || service.serviceType) === 'membership' ? 'badge-secondary' : 'badge-accent'">
                      {{ service.transactionType || service.type || service.serviceType }}
                    </span>
                  </div>
                </div>
              </div>
              <div class="text-right shrink-0 ml-3">
                <p class="font-bold text-sm" :class="serviceFilters.sortBy === 'revenue' ? 'text-success' : 'text-base-content/50'">
                  {{ formatCurrency(service.totalRevenue || service.revenue) }}
                </p>
                <p class="text-xs" :class="serviceFilters.sortBy === 'transactions' ? 'text-secondary font-semibold' : 'text-base-content/40'">
                  {{ formatNumber(service.transactionCount || service.totalCount || service.count) }} transaksi
                </p>
              </div>
            </div>
          </transition-group>

          <div v-else class="text-center py-8 text-base-content/40">
            No service data for selected period
          </div>
        </div>
      </div>
    </div>

    <!-- Not Selling Section -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      <!-- Not Selling Products -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <div class="flex items-center justify-between mb-4">
            <h3 class="card-title text-base flex items-center gap-2">
              <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-error/10 text-error text-xs font-bold">!</span>
              Produk Tidak Laku
            </h3>
            <span v-if="!notSellingProductsLoading" class="badge badge-error badge-outline badge-sm">{{ notSellingProducts.length }} produk</span>
          </div>

          <div v-if="notSellingProductsLoading" class="space-y-2">
            <div v-for="i in 6" :key="i" class="skeleton h-8 w-full"></div>
          </div>

          <div v-else-if="notSellingProducts.length > 0" class="overflow-x-auto">
            <table class="table table-xs">
              <thead>
                <tr class="text-base-content/50">
                  <th>#</th>
                  <th>Produk</th>
                  <th>Kategori</th>
                  <th class="text-right">Stok</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(p, i) in notSellingProducts" :key="p.itemId || p.id || i" class="hover">
                  <td class="text-base-content/40">{{ i + 1 }}</td>
                  <td class="font-medium">{{ p.itemName || p.name || p.productName }}</td>
                  <td>
                    <span v-if="p.category || p.categoryName || p.transactionType" class="badge badge-xs badge-ghost capitalize">
                      {{ p.category || p.categoryName || p.transactionType }}
                    </span>
                  </td>
                  <td class="text-right">
                    <span class="text-xs" :class="(p.stock ?? p.stockQuantity) == 0 ? 'text-error' : 'text-base-content/60'">
                      {{ p.stock ?? p.stockQuantity ?? '-' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-else class="text-center py-8 text-base-content/40">
            <p class="text-success font-medium">Semua produk terjual di periode ini 🎉</p>
          </div>
        </div>
      </div>

      <!-- Not Selling Services -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <div class="flex items-center justify-between mb-4">
            <h3 class="card-title text-base flex items-center gap-2">
              <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-warning/10 text-warning text-xs font-bold">!</span>
              Layanan Tidak Laku
            </h3>
            <div class="flex items-center gap-2">
              <select v-model="notSellingServiceFilters.serviceType" class="select select-bordered select-xs">
                <option value="all">All</option>
                <option value="membership">Membership</option>
                <option value="service_plan">Service Plan</option>
              </select>
              <span v-if="!notSellingServicesLoading" class="badge badge-warning badge-outline badge-sm">{{ notSellingServices.length }}</span>
            </div>
          </div>

          <div v-if="notSellingServicesLoading" class="space-y-2">
            <div v-for="i in 6" :key="i" class="skeleton h-8 w-full"></div>
          </div>

          <div v-else-if="notSellingServices.length > 0" class="overflow-x-auto">
            <table class="table table-xs">
              <thead>
                <tr class="text-base-content/50">
                  <th>#</th>
                  <th>Layanan</th>
                  <th>Tipe</th>
                  <th class="text-right">Harga</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(s, i) in notSellingServices" :key="s.itemId || s.id || i" class="hover">
                  <td class="text-base-content/40">{{ i + 1 }}</td>
                  <td class="font-medium">{{ s.itemName || s.name || s.serviceName }}</td>
                  <td>
                    <span v-if="s.transactionType || s.type || s.serviceType"
                      class="badge badge-xs capitalize"
                      :class="(s.transactionType || s.type || s.serviceType) === 'membership' ? 'badge-secondary' : 'badge-accent'">
                      {{ s.transactionType || s.type || s.serviceType }}
                    </span>
                  </td>
                  <td class="text-right text-xs text-base-content/60">
                    {{ s.price != null ? formatCurrency(s.price) : '-' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-else class="text-center py-8 text-base-content/40">
            <p class="text-success font-medium">Semua layanan terjual di periode ini 🎉</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* FLIP animation for rank reordering */
.rank-move {
  transition: transform 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.rank-enter-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.rank-leave-active {
  transition: opacity 0.2s ease;
  position: absolute;
  width: 100%;
}
.rank-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}
.rank-leave-to {
  opacity: 0;
}
</style>
