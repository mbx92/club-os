<route lang="yaml">
meta:
  title: Gym Reports
  layout: default
</route>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useGymReports } from '@/composables/gym/reports'
import { 
  IconChartBar, 
  IconUsers, 
  IconCalendarEvent, 
  IconFileAnalytics, 
  IconTicket,
  IconCash,
  IconTrendingUp,
  IconTrendingDown,
  IconRefresh,
  IconArrowRight,
  IconChartPie,
  IconUserDollar,
  IconPackage,
  IconUsersGroup,
  IconBriefcase,
  IconChartDots
} from '@tabler/icons-vue'

const router = useRouter()
const { getDashboardOverview, formatCurrency, loading } = useGymReports()

const dashboard = ref(null)

const loadDashboard = async () => {
  try {
    const data = await getDashboardOverview()
    dashboard.value = data
  } catch (err) {
    console.error('Failed to load dashboard:', err)
  }
}

// New API response: { members: {total, active, inactiveRate}, checkIns: {today, thisWeek, thisMonth}, activeServices: {breakdown, total, expiringSoon} }
const activeMembers    = computed(() => dashboard.value?.members?.active ?? 0)
const checkInsToday    = computed(() => dashboard.value?.checkIns?.today ?? 0)
const checkInsMonth    = computed(() => dashboard.value?.checkIns?.thisMonth ?? 0)
const expiringSoon     = computed(() => dashboard.value?.activeServices?.expiringSoon ?? 0)
const serviceBreakdown = computed(() => dashboard.value?.activeServices?.breakdown ?? [])

const reports = [
  {
    title: 'Revenue Report',
    description: 'Revenue trends, payment analysis, and service type performance',
    icon: IconChartBar,
    route: '/gym/reports/revenue',
    color: 'bg-primary/10 text-primary',
    stats: 'Daily, Weekly, Monthly'
  },
  {
    title: 'Profit & Loss',
    description: 'P&L analysis, profit margins, and financial overview',
    icon: IconFileAnalytics,
    route: '/gym/reports/profit-loss',
    color: 'bg-success/10 text-success',
    stats: 'Financial Report'
  },
  {
    title: 'Check-in Trends',
    description: 'Check-in statistics, trends, and 3-period forecast',
    icon: IconCalendarEvent,
    route: '/gym/reports/attendance',
    color: 'bg-info/10 text-info',
    stats: 'Member Activity'
  },
  {
    title: 'Active Services',
    description: 'Expiring services, status distribution, and renewal overview',
    icon: IconTicket,
    route: '/gym/reports/service-status',
    color: 'bg-warning/10 text-warning',
    stats: 'Service Tracking'
  },
  {
    title: 'Trainer Commissions',
    description: 'Commission summary and breakdown by trainer',
    icon: IconUserDollar,
    route: '/gym/reports/trainer-commissions',
    color: 'bg-secondary/10 text-secondary',
    stats: 'Commission Report'
  },
  {
    title: 'Members',
    description: 'Active members, growth trends, and retention cohort analysis',
    icon: IconUsersGroup,
    route: '/gym/reports/members',
    color: 'bg-accent/10 text-accent',
    stats: 'Growth & Retention'
  },
  {
    title: 'Service Performance',
    description: 'Service plan sales performance and top plans ranking',
    icon: IconChartPie,
    route: '/gym/reports/services',
    color: 'bg-rose-500/10 text-rose-500',
    stats: 'Service Sales'
  },
  {
    title: 'Products',
    description: 'Product sales, top-selling items, and category breakdown',
    icon: IconPackage,
    route: '/gym/reports/products',
    color: 'bg-orange-500/10 text-orange-500',
    stats: 'Product Sales'
  },
  {
    title: 'Staff',
    description: 'Staff attendance, shift summary, and daily composition',
    icon: IconBriefcase,
    route: '/gym/reports/staff',
    color: 'bg-teal-500/10 text-teal-500',
    stats: 'Staff Management'
  },
  {
    title: 'Forecasting',
    description: 'Revenue, member, and attendance predictions',
    icon: IconChartDots,
    route: '/gym/reports/forecasting',
    color: 'bg-violet-500/10 text-violet-500',
    stats: 'AI Predictions'
  }
]

onMounted(async () => {
  await loadDashboard()
})
</script>

<template>
  <div class="container mx-auto px-4 py-6">
    <!-- Header -->
    <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-3xl font-bold">Reports & Analytics</h1>
        <p class="text-base-content/60 mt-1">Gym performance insights and member metrics</p>
      </div>
      
      <button class="btn btn-ghost btn-sm" @click="loadDashboard" :disabled="loading">
        <IconRefresh class="w-4 h-4" :class="{ 'animate-spin': loading }" />
      </button>
    </div>

    <!-- Today's Summary Stats -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <!-- Active Members -->
      <div class="stat bg-base-100 rounded-box shadow">
        <div class="stat-figure text-primary">
          <IconUsers class="w-8 h-8" />
        </div>
        <div class="stat-title">Active Members</div>
        <div class="stat-value text-primary text-2xl">
          <span v-if="loading" class="loading loading-dots loading-sm"></span>
          <span v-else>{{ activeMembers }}</span>
        </div>
        <div class="stat-desc">Total members: {{ dashboard?.members?.total ?? 0 }}</div>
      </div>

      <!-- Today's Check-ins -->
      <div class="stat bg-base-100 rounded-box shadow">
        <div class="stat-figure text-info">
          <IconCalendarEvent class="w-8 h-8" />
        </div>
        <div class="stat-title">Today's Check-ins</div>
        <div class="stat-value text-info text-2xl">
          <span v-if="loading" class="loading loading-dots loading-sm"></span>
          <span v-else>{{ checkInsToday }}</span>
        </div>
        <div class="stat-desc">This week: {{ dashboard?.checkIns?.thisWeek ?? 0 }}</div>
      </div>

      <!-- This Month Check-ins -->
      <div class="stat bg-base-100 rounded-box shadow">
        <div class="stat-figure text-success">
          <IconChartBar class="w-8 h-8" />
        </div>
        <div class="stat-title">This Month</div>
        <div class="stat-value text-success text-2xl">
          <span v-if="loading" class="loading loading-dots loading-sm"></span>
          <span v-else>{{ checkInsMonth }}</span>
        </div>
        <div class="stat-desc">Check-ins this month</div>
      </div>

      <!-- Active Services -->
      <div class="stat bg-base-100 rounded-box shadow">
        <div class="stat-figure text-warning">
          <IconTicket class="w-8 h-8" />
        </div>
        <div class="stat-title">Active Services</div>
        <div class="stat-value text-warning text-2xl">
          <span v-if="loading" class="loading loading-dots loading-sm"></span>
          <span v-else>{{ dashboard?.activeServices?.total ?? 0 }}</span>
        </div>
        <div class="stat-desc" :class="{ 'text-error': expiringSoon > 0 }">
          {{ expiringSoon }} expiring soon
        </div>
      </div>
    </div>

    <!-- Report Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <div 
        v-for="report in reports" 
        :key="report.route"
        class="card bg-base-100 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group"
        @click="router.push(report.route)"
      >
        <div class="card-body">
          <div class="flex items-start gap-4">
            <div :class="['p-4 rounded-xl', report.color]">
              <component :is="report.icon" class="w-8 h-8" />
            </div>
            <div class="flex-1">
              <h3 class="card-title group-hover:text-primary transition-colors">
                {{ report.title }}
              </h3>
              <p class="text-sm text-base-content/60 mt-1">
                {{ report.description }}
              </p>
              <div class="badge badge-ghost badge-sm mt-3">{{ report.stats }}</div>
            </div>
            <IconArrowRight class="w-5 h-5 text-base-content/40 group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </div>
        </div>
      </div>
    </div>

    <!-- Services Expiring Soon Alert -->
    <div v-if="expiringSoon > 0" class="alert alert-warning mb-6">
      <IconTicket class="w-5 h-5" />
      <div>
        <h3 class="font-bold">{{ expiringSoon }} Services Expiring Soon</h3>
        <div class="text-sm">Contact members for renewals within the next 7 days</div>
      </div>
      <button class="btn btn-sm btn-warning" @click="router.push('/gym/reports/service-status')">
        View Details
        <IconArrowRight class="w-4 h-4 ml-1" />
      </button>
    </div>

    <!-- Service Breakdown -->
    <div v-if="serviceBreakdown.length" class="card bg-base-100 shadow">
      <div class="card-body">
        <h3 class="card-title mb-4">Active Services by Type</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div 
            v-for="service in serviceBreakdown" 
            :key="service.serviceType"
            class="stat bg-base-200 rounded-lg p-4"
          >
            <div class="stat-title capitalize">{{ service.serviceType?.replace('_', ' ') }}</div>
            <div class="stat-value text-2xl">{{ service.count }}</div>
            <div class="stat-desc">active services</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
