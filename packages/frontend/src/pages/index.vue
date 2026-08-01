<route lang="yaml">
path: /
name: index
meta:
  title: Dashboard
  layout: default
</route>

<template>
  <div class="min-h-screen bg-base-200/50">
    <div class="mx-auto max-w-7xl space-y-6 px-4 py-6">

      <!-- ═══════════ HERO HEADER ═══════════ -->
      <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-secondary p-6 text-primary-content shadow-xl md:p-8">
        <div class="absolute -top-10 -right-10 h-48 w-48 rounded-full bg-white/10 blur-2xl"></div>
        <div class="absolute -bottom-8 -left-8 h-36 w-36 rounded-full bg-white/5 blur-xl"></div>
        <div class="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p class="mb-1 text-sm opacity-70">{{ greetingText }}</p>
            <h1 class="text-2xl font-extrabold tracking-tight md:text-4xl">
              {{ userName || 'Dashboard' }}
            </h1>
            <p class="mt-2 flex items-center gap-2 text-sm opacity-60">
              <IconCalendar class="w-4 h-4" />
              {{ currentDate }}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <div class="mr-4 hidden text-right md:block">
              <div class="text-xs opacity-70">Last refresh</div>
              <div class="text-sm font-medium tabular-nums">{{ lastRefreshTime || '—' }}</div>
            </div>
            <button
              class="btn btn-ghost btn-sm gap-2 border border-white/20 text-primary-content hover:bg-white/20"
              @click="load()"
              :disabled="loading"
            >
              <IconRefresh class="w-4 h-4" :class="{ 'animate-spin': loading }" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <!-- ═══════════ LOADING STATE ═══════════ -->
      <div v-if="loading && !hasLoaded" class="flex flex-col items-center justify-center py-20 gap-4">
        <span class="loading loading-ring loading-lg text-primary"></span>
        <span class="text-sm text-base-content/50">Memuat data dashboard…</span>
      </div>

      <template v-else>

        <!-- ═══════════ STAT CARDS ═══════════ -->
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div
            v-for="(card, idx) in statCards"
            :key="card.label"
            class="group relative overflow-hidden rounded-xl bg-base-100 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-lg cursor-default"
            :style="{ animationDelay: `${idx * 80}ms` }"
          >
            <div class="relative p-5">
              <div class="flex items-center justify-between mb-3">
                <span class="text-xs font-semibold uppercase tracking-wider text-base-content/50">{{ card.label }}</span>
                <div class="rounded-lg p-2" :class="card.iconBg">
                  <component :is="card.icon" class="w-5 h-5" :class="card.iconColor" />
                </div>
              </div>
              <div class="text-2xl font-bold tabular-nums">{{ card.value }}</div>
              <div class="mt-1 text-xs text-base-content/50">{{ card.sub }}</div>
            </div>
          </div>
        </div>

        <!-- ═══════════ REVENUE BREAKDOWN + PAYMENTS ═══════════ -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <!-- Revenue by Module -->
          <div class="card bg-base-100 shadow-md transition-shadow hover:shadow-lg lg:col-span-2">
            <div class="card-body">
              <div class="flex items-center justify-between mb-4">
                <h3 class="card-title text-base">
                  <IconChartBar class="w-5 h-5 text-primary" />
                  Revenue by Module
                </h3>
                <span class="badge badge-ghost badge-sm">Hari ini</span>
              </div>

              <div v-if="(summary.revenue?.today?.byModule || []).length === 0" class="flex flex-col items-center py-8 text-base-content/30">
                <IconChartBar class="w-12 h-12 mb-2" />
                <span class="text-sm">Belum ada data hari ini</span>
              </div>

              <div v-else class="space-y-4">
                <div
                  v-for="(m, i) in summary.revenue?.today?.byModule || []"
                  :key="m.module"
                  class="group/bar"
                >
                  <div class="flex items-center justify-between text-sm mb-1">
                    <span class="capitalize font-medium">{{ m.module }}</span>
                    <span class="font-semibold tabular-nums">{{ formatCurrency(m.total) }}</span>
                  </div>
                  <div class="w-full bg-base-200 rounded-full h-3 overflow-hidden">
                    <div
                      class="h-full rounded-full transition-all duration-700 ease-out group-hover/bar:brightness-110"
                      :class="barColors[i % barColors.length]"
                      :style="{ width: getModulePercent(m.total) + '%' }"
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Payment Methods -->
          <div class="card bg-base-100 shadow-md transition-shadow hover:shadow-lg">
            <div class="card-body">
              <h3 class="card-title text-base mb-4">
                <IconCreditCard class="w-5 h-5 text-secondary" />
                Payment Methods
              </h3>

              <div v-if="!summary.payments?.length" class="flex flex-col items-center py-8 text-base-content/30">
                <IconCreditCard class="w-10 h-10 mb-2" />
                <span class="text-sm">Tidak ada data</span>
              </div>

              <div v-else class="space-y-3">
                <div
                  v-for="pm in summary.payments"
                  :key="pm.method"
                  class="flex items-center gap-3 p-3 rounded-lg bg-base-200/50 hover:bg-base-200 transition-colors"
                >
                  <div class="w-8 h-8 rounded-full flex items-center justify-center" :class="paymentIconClass(pm.method)">
                    <component :is="paymentIcon(pm.method)" class="w-4 h-4" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium capitalize truncate">{{ paymentLabel(pm.method) }}</div>
                    <div class="text-xs text-base-content/50">{{ pm.transactions || 0 }} trx</div>
                  </div>
                  <div class="font-semibold text-sm tabular-nums">{{ formatCurrency(pm.total) }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ═══════════ MODULE CARDS ═══════════ -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

          <!-- GYM MODULE -->
          <div
            class="card cursor-pointer border-l-4 border-success bg-base-100 shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
            @click="$router.push('/gym')"
          >
            <div class="card-body">
              <div class="flex items-center justify-between">
                <h3 class="card-title text-base">
                  <div class="p-2 rounded-lg bg-success/10 mr-1">
                    <IconBarbell class="w-5 h-5 text-success" />
                  </div>
                  Gym
                </h3>
                <IconArrowRight class="w-4 h-4 text-base-content/30 group-hover:text-success transition-colors" />
              </div>
              <div class="grid grid-cols-2 gap-3 mt-4">
                <div class="relative overflow-hidden bg-success/5 rounded-xl p-4 text-center group/stat hover:bg-success/10 transition-colors">
                  <IconUsers class="w-8 h-8 text-success/20 absolute -bottom-1 -right-1" />
                  <div class="text-2xl font-bold text-success">{{ animatedGymMembers }}</div>
                  <div class="text-xs text-base-content/60 mt-1">Active Members</div>
                </div>
                <div class="relative overflow-hidden bg-info/5 rounded-xl p-4 text-center group/stat hover:bg-info/10 transition-colors">
                  <IconCheck class="w-8 h-8 text-info/20 absolute -bottom-1 -right-1" />
                  <div class="text-2xl font-bold text-info">{{ animatedGymCheckins }}</div>
                  <div class="text-xs text-base-content/60 mt-1">Check-ins Today</div>
                </div>
              </div>
              <div v-if="modules.gym?.members?.expiringSoon" class="mt-3 text-xs flex items-center gap-1 text-warning">
                <IconAlertTriangle class="w-3.5 h-3.5" />
                {{ modules.gym.members.expiringSoon }} member(s) expiring soon
              </div>
            </div>
          </div>

          <!-- RESTAURANT MODULE -->
          <div
            class="card cursor-pointer border-l-4 border-primary bg-base-100 shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
            @click="$router.push('/restaurant')"
          >
            <div class="card-body">
              <div class="flex items-center justify-between">
                <h3 class="card-title text-base">
                  <div class="p-2 rounded-lg bg-primary/10 mr-1">
                    <IconToolsKitchen2 class="w-5 h-5 text-primary" />
                  </div>
                  Restaurant
                </h3>
                <IconArrowRight class="w-4 h-4 text-base-content/30" />
              </div>
              <div class="grid grid-cols-2 gap-3 mt-4">
                <div class="relative overflow-hidden bg-primary/5 rounded-xl p-4 text-center hover:bg-primary/10 transition-colors">
                  <IconArmchair class="w-8 h-8 text-primary/20 absolute -bottom-1 -right-1" />
                  <div class="text-2xl font-bold text-primary">{{ modules.restaurant?.tables?.occupied || 0 }}</div>
                  <div class="text-xs text-base-content/60 mt-1">Tables Occupied</div>
                </div>
                <div class="relative overflow-hidden bg-warning/5 rounded-xl p-4 text-center hover:bg-warning/10 transition-colors">
                  <IconReceipt class="w-8 h-8 text-warning/20 absolute -bottom-1 -right-1" />
                  <div class="text-2xl font-bold text-warning">{{ modules.restaurant?.orders?.todayCompleted || modules.restaurant?.orders?.today || 0 }}</div>
                  <div class="text-xs text-base-content/60 mt-1">Orders Today</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ═══════════ QUICK ACTIONS ═══════════ -->
        <div class="card bg-base-100 shadow-md">
          <div class="card-body">
            <h3 class="card-title text-base mb-3">
              <IconBolt class="w-5 h-5 text-warning" />
              Quick Actions
            </h3>
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <button
                v-for="action in quickActions"
                :key="action.label"
                class="flex flex-col items-center gap-2 p-4 rounded-xl border border-base-200 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 group/action"
                @click="$router.push(action.route)"
              >
                <div class="p-2.5 rounded-xl transition-colors" :class="action.bg">
                  <component :is="action.icon" class="w-5 h-5 transition-transform duration-200 group-hover/action:scale-110" :class="action.color" />
                </div>
                <span class="text-xs font-medium text-center">{{ action.label }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- ═══════════ RECENT ACTIVITY + ALERTS ═══════════ -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <!-- Recent Activity -->
          <div class="card bg-base-100 shadow-md lg:col-span-2">
            <div class="card-body">
              <div class="flex items-center justify-between mb-4">
                <h3 class="card-title text-base">
                  <IconClock class="w-5 h-5 text-info" />
                  Recent Activity
                </h3>
                <span class="badge badge-ghost badge-sm">{{ (data?.recentActivity || []).length }} latest</span>
              </div>

              <div v-if="!(data?.recentActivity?.length)" class="flex flex-col items-center py-10 text-base-content/30">
                <IconClock class="w-12 h-12 mb-2" />
                <span class="text-sm">Belum ada aktivitas terbaru</span>
              </div>

              <div v-else class="space-y-2 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                <div
                  v-for="(a, idx) in data?.recentActivity || []"
                  :key="a.id"
                  class="flex items-center gap-3 p-3 rounded-lg hover:bg-base-200/50 transition-colors group/row"
                >
                  <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0" :class="moduleColor(a.module)">
                    <component :is="moduleIcon(a.module)" class="w-4 h-4" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="font-mono text-sm truncate">{{ a.transactionNumber }}</span>
                      <span class="badge badge-xs" :class="moduleBadge(a.module)">{{ a.module }}</span>
                    </div>
                    <div class="text-xs text-base-content/50 mt-0.5">
                      {{ formatRelativeTime(a.createdAt) }}
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="font-semibold text-sm tabular-nums">{{ formatCurrency(a.amount) }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Alerts -->
          <div class="card bg-base-100 shadow-md">
            <div class="card-body">
              <h3 class="card-title text-base mb-4">
                <IconBell class="w-5 h-5 text-error" />
                Alerts
              </h3>

              <div v-if="!hasAlerts" class="flex flex-col items-center py-10 text-base-content/30">
                <IconCheck class="w-10 h-10 mb-2 text-success/50" />
                <span class="text-sm">Semua baik-baik saja!</span>
              </div>

              <div v-else class="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                <template v-for="(list, key) in data?.alerts || {}" :key="key">
                  <div
                    v-for="item in list"
                    :key="item.type"
                    class="flex items-start gap-3 p-3 rounded-lg transition-colors"
                    :class="alertRowClass(key)"
                  >
                    <div class="mt-0.5 shrink-0">
                      <component :is="alertIcon(key)" class="w-4 h-4" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="text-sm font-medium">{{ item.message }}</div>
                      <div class="text-xs opacity-60 mt-0.5">{{ item.count }} item(s)</div>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>

      </template>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, computed, onBeforeUnmount } from 'vue'
import { useMainDashboard } from '@/composables/shared'
import { useAuthStore } from '@/stores/auth'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/id'

import {
  IconRefresh,
  IconCalendar,
  IconCash,
  IconReceipt,
  IconUsers,
  IconChartBar,
  IconCreditCard,
  IconBarbell,
  IconToolsKitchen2,
  IconArmchair,
  IconCheck,
  IconArrowRight,
  IconBolt,
  IconClock,
  IconBell,
  IconAlertTriangle,
  IconAlertCircle,
  IconInfoCircle,
  IconTrendingUp,
  IconWallet,
  IconBuildingStore,
  IconBrain,
  IconUserPlus,
  IconClipboardCheck,
  IconReportMoney,
  IconGift,
} from '@tabler/icons-vue'

dayjs.extend(relativeTime)
dayjs.locale('id')

const auth = useAuthStore()
const { data, loading, error, getMainDashboard, formatCurrency } = useMainDashboard()

const summary = ref({})
const modules = ref({})
const hasLoaded = ref(false)
const lastRefreshTime = ref('')
const animatedGymMembers = ref(0)
const animatedGymCheckins = ref(0)

// ─── Greeting ───
const userName = computed(() => auth.user?.name || auth.user?.username || '')

const greetingText = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'Selamat Pagi 👋'
  if (h < 15) return 'Selamat Siang 👋'
  if (h < 18) return 'Selamat Sore 👋'
  return 'Selamat Malam 👋'
})

const currentDate = computed(() => dayjs().format('dddd, D MMMM YYYY'))

// ─── Stat cards ───
const statCards = computed(() => {
  const rev = summary.value.revenue?.today || {}
  const revRounding = parseFloat(rev.rounding) || 0
  const revSub = revRounding !== 0
    ? `${rev.transactions || 0} transaksi · Rounding ${revRounding >= 0 ? '+' : ''}${formatCurrency(revRounding)}`
    : `${rev.transactions || 0} transaksi`
  return [
    {
      label: "Today's Revenue",
      value: formatCurrency(rev.total),
      sub: revSub,
      icon: IconCash,
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
      iconColor: 'text-emerald-600',
      gradient: 'bg-gradient-to-br from-emerald-500/5 to-transparent',
    },
    {
      label: 'Active Members',
      value: modules.value.gym?.members?.active || 0,
      sub: 'Gym members',
      icon: IconUsers,
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600',
      gradient: 'bg-gradient-to-br from-blue-500/5 to-transparent',
    },
    {
      label: 'Check-ins Today',
      value: modules.value.gym?.attendance?.today || 0,
      sub: 'Gym attendance',
      icon: IconClipboardCheck,
      iconBg: 'bg-violet-100 dark:bg-violet-900/30',
      iconColor: 'text-violet-600',
      gradient: 'bg-gradient-to-br from-violet-500/5 to-transparent',
    },
    {
      label: 'Orders Today',
      value: modules.value.restaurant?.orders?.todayCompleted || modules.value.restaurant?.orders?.today || 0,
      sub: 'Restaurant orders',
      icon: IconReceipt,
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: 'text-amber-600',
      gradient: 'bg-gradient-to-br from-amber-500/5 to-transparent',
    },
  ]
})

// ─── Revenue bar chart helpers ───
const barColors = [
  'bg-primary',
  'bg-secondary',
  'bg-accent',
  'bg-success',
  'bg-info',
  'bg-warning',
]

const getModulePercent = (total) => {
  const maxVal = Math.max(...(summary.value.revenue?.today?.byModule || []).map(m => m.total || 0), 1)
  return Math.max(((total || 0) / maxVal) * 100, 4)
}

// ─── Payment helpers ───
const paymentIcon = (method) => {
  const m = method?.toLowerCase()
  if (m?.includes('cash')) return IconCash
  if (m?.includes('transfer') || m?.includes('bank')) return IconBuildingStore
  if (m?.includes('card') || m?.includes('debit') || m?.includes('credit')) return IconCreditCard
  if (m?.includes('wallet') || m?.includes('qris') || m?.includes('e-money')) return IconWallet
  if (m?.includes('compliment')) return IconGift
  return IconCreditCard
}

const paymentLabel = (method) => {
  const map = {
    cash: 'Tunai',
    credit_card: 'Kartu Kredit',
    debit_card: 'Kartu Debit',
    bank_transfer: 'Transfer Bank',
    qris: 'QRIS',
    e_wallet: 'E-Wallet',
    compliment: 'Gratis/Komplemen'
  }
  return map[method] || (method || '').replace(/_/g, ' ')
}

const paymentIconClass = (method) => {
  const m = method?.toLowerCase()
  if (m?.includes('cash')) return 'bg-success/10 text-success'
  if (m?.includes('transfer') || m?.includes('bank')) return 'bg-info/10 text-info'
  if (m?.includes('card')) return 'bg-primary/10 text-primary'
  if (m?.includes('compliment')) return 'bg-warning/10 text-warning'
  return 'bg-secondary/10 text-secondary'
}

// ─── Quick actions ───
const quickActions = [
  { label: 'New Member', icon: IconUserPlus, route: '/gym/members', bg: 'bg-success/10', color: 'text-success' },
  { label: 'Check-in', icon: IconClipboardCheck, route: '/gym/check-ins', bg: 'bg-info/10', color: 'text-info' },
  { label: 'Transactions', icon: IconReceipt, route: '/gym/transactions', bg: 'bg-primary/10', color: 'text-primary' },
  { label: 'Reports', icon: IconReportMoney, route: '/gym/reports', bg: 'bg-warning/10', color: 'text-warning' },
  { label: 'Restaurant', icon: IconToolsKitchen2, route: '/restaurant', bg: 'bg-accent/10', color: 'text-accent' },
  { label: 'Finances', icon: IconCash, route: '/finances', bg: 'bg-emerald-500/10', color: 'text-emerald-600' },
]

// ─── Module helpers (activity) ───
const moduleIcon = (mod) => {
  const m = mod?.toLowerCase()
  if (m === 'gym') return IconBarbell
  if (m === 'restaurant') return IconToolsKitchen2
  return IconReceipt
}

const moduleColor = (mod) => {
  const m = mod?.toLowerCase()
  if (m === 'gym') return 'bg-success/10 text-success'
  if (m === 'restaurant') return 'bg-primary/10 text-primary'
  return 'bg-base-200 text-base-content/60'
}

const moduleBadge = (mod) => {
  const m = mod?.toLowerCase()
  if (m === 'gym') return 'badge-success'
  if (m === 'restaurant') return 'badge-primary'
  return 'badge-ghost'
}

// ─── Alert helpers ───
const hasAlerts = computed(() => {
  if (!data.value?.alerts) return false
  return Object.values(data.value.alerts).some(arr => arr?.length > 0)
})

const alertRowClass = (key) => {
  if (key === 'critical') return 'bg-error/5 text-error'
  if (key === 'warning') return 'bg-warning/5 text-warning'
  return 'bg-info/5 text-info'
}

const alertIcon = (key) => {
  if (key === 'critical') return IconAlertCircle
  if (key === 'warning') return IconAlertTriangle
  return IconInfoCircle
}

// ─── Time ───
const formatRelativeTime = (date) => {
  if (!date) return ''
  return dayjs(date).fromNow()
}

// ─── Animated counters ───
const animateValue = (target, endVal) => {
  const duration = 800
  const start = 0
  const startTime = performance.now()

  const step = (currentTime) => {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)
    // ease-out cubic
    const eased = 1 - Math.pow(1 - progress, 3)
    target.value = Math.round(eased * endVal)
    if (progress < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

// ─── Auto-refresh ───
let refreshInterval = null

// ─── Load ───
const load = async () => {
  try {
    const payload = await getMainDashboard()
    const d = payload?.data ?? payload
    summary.value = d.summary || {}
    modules.value = d.modules || {}
    hasLoaded.value = true
    lastRefreshTime.value = dayjs().format('HH:mm:ss')

    // Animate counters
    animateValue(animatedGymMembers, modules.value.gym?.members?.active || 0)
    animateValue(animatedGymCheckins, modules.value.gym?.attendance?.today || 0)
  } catch (err) {
    // handled in composable
  }
}

onMounted(() => {
  load()
  // Auto refresh every 5 minutes
  refreshInterval = setInterval(load, 5 * 60 * 1000)
})

onBeforeUnmount(() => {
  if (refreshInterval) clearInterval(refreshInterval)
})
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: oklch(var(--bc) / 0.15);
  border-radius: 999px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: oklch(var(--bc) / 0.25);
}
</style>
