<route lang="yaml">
meta:
  title: Gym Dashboard
  layout: default
</route>

<script setup>
import { ref, onMounted, computed, watch, nextTick, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import { useGymDashboard } from "@/composables/gym/dashboard";
import {
  Chart,
  CategoryScale,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  BarElement,
  BarController,
  DoughnutController,
  ArcElement,
  Legend,
} from 'chart.js'
import {
  IconCash,
  IconReceipt,
  IconUsers,
  IconChartBar,
  IconTrendingUp,
  IconTrendingDown,
  IconRefresh,
  IconCheck,
  IconCalendar,
  IconBrandGoogleFit,
} from "@tabler/icons-vue";

Chart.register(
  CategoryScale, LinearScale,
  LineController, LineElement, PointElement, Filler,
  BarElement, BarController,
  DoughnutController, ArcElement,
  Tooltip, Legend
);

const router = useRouter();
const {
  getComprehensiveDashboard,
  comprehensiveDashboard,
  formatCurrency,
  formatPercent,
  loading,
} = useGymDashboard();

const selectedLocation = ref("");
const dashboard = computed(() => comprehensiveDashboard.value);

const paymentLabel = (method) => {
  const map = {
    cash: 'Tunai',
    credit_card: 'Kartu',
    debit_card: 'Kartu Debit',
    bank_transfer: 'Transfer Bank',
    qris: 'QRIS',
    e_wallet: 'E-Wallet',
    compliment: 'Gratis/Komplemen'
  }
  return map[method] || (method || '').replace(/_/g, ' ')
}

const loadDashboard = async () => {
  try {
    await getComprehensiveDashboard({
      locationId: selectedLocation.value || undefined,
    });
    await nextTick();
    createAllCharts();
  } catch (err) {
    console.error("Failed to load dashboard:", err);
  }
};

// Quick links to different modules
const quickLinks = [
  {
    title: "Members",
    description: "Member management and registration",
    icon: IconUsers,
    route: "/gym/members",
    color: "bg-primary/10 text-primary",
    stats: "Management",
  },
  {
    title: "Check-ins",
    description: "Member attendance and check-in logs",
    icon: IconCheck,
    route: "/gym/check-ins",
    color: "bg-success/10 text-success",
    stats: "Attendance",
  },
  {
    title: "Transactions",
    description: "Payment and transaction history",
    icon: IconReceipt,
    route: "/gym/transactions",
    color: "bg-info/10 text-info",
    stats: "Payments",
  },
  {
    title: "Reports",
    description: "Revenue, attendance, and performance reports",
    icon: IconChartBar,
    route: "/gym/reports",
    color: "bg-warning/10 text-warning",
    stats: "Analytics",
  },
  {
    title: "Service Plans",
    description: "Membership and service plan management",
    icon: IconBrandGoogleFit,
    route: "/gym/service-plans",
    color: "bg-secondary/10 text-secondary",
    stats: "Services",
  },
  {
    title: "Classes",
    description: "Group classes and schedules",
    icon: IconCalendar,
    route: "/gym/classes",
    color: "bg-accent/10 text-accent",
    stats: "Schedule",
  },
];

// ─── Charts ───
const memberChartCanvas = ref(null);
const peakChartCanvas = ref(null);
const servicesChartCanvas = ref(null);
const paymentChartCanvas = ref(null);
const alertsChartCanvas = ref(null);

let memberChartInstance = null;
let peakChartInstance = null;
let servicesChartInstance = null;
let paymentChartInstance = null;
let alertsChartInstance = null;

// ─── Member Statistics (line) ───
const createMemberChart = () => {
  if (!memberChartCanvas.value) return;
  const members = dashboard.value?.members;
  if (!members) return;

  const labels = ['Active', 'New', 'Expiring'];
  const data = [
    members.active || 0,
    members.newThisMonth || 0,
    members.expiringMemberships || 0,
  ];

  if (memberChartInstance) {
    memberChartInstance.data.datasets[0].data = data;
    memberChartInstance.update();
    return;
  }

  const ctx = memberChartCanvas.value.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 200);
  gradient.addColorStop(0, 'rgba(108, 92, 231, 0.25)');
  gradient.addColorStop(1, 'rgba(108, 92, 231, 0.02)');

  memberChartInstance = new Chart(memberChartCanvas.value, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data,
        borderColor: '#6c5ce7',
        borderWidth: 2,
        backgroundColor: gradient,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: ['#00a96e', '#6c5ce7', '#f59e0b'],
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: { callbacks: { label: (ctx) => ` ${ctx.raw} members` } },
        legend: { display: false },
      },
      scales: {
        x: { ticks: { color: 'oklch(var(--bc) / 0.5)', font: { size: 11 } }, grid: { display: false } },
        y: { display: false, beginAtZero: true },
      },
    },
  });
};

// ─── Peak Hours (horizontal bar) ───
const createPeakChart = () => {
  if (!peakChartCanvas.value) return;
  const peaks = dashboard.value?.attendance?.peakHours?.slice(0, 8) || [];
  if (!peaks.length) return;

  const labels = peaks.map(p => `${p.hour}:00`);
  const data = peaks.map(p => p.checkIns || 0);

  if (peakChartInstance) {
    peakChartInstance.data.labels = labels;
    peakChartInstance.data.datasets[0].data = data;
    peakChartInstance.update();
    return;
  }

  peakChartInstance = new Chart(peakChartCanvas.value, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: data.map((_, i) => i === 0 ? '#6c5ce7' : 'oklch(var(--p) / 0.5)'),
        borderRadius: 4,
        borderSkipped: false,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: { callbacks: { label: (ctx) => ` ${ctx.raw} check-ins` } },
        legend: { display: false },
      },
      scales: {
        x: { display: false, beginAtZero: true },
        y: { ticks: { color: 'oklch(var(--bc) / 0.6)', font: { size: 11 } }, grid: { display: false } },
      },
    },
  });
};

// ─── Active Services (doughnut) ───
const createServicesChart = () => {
  if (!servicesChartCanvas.value) return;
  const breakdown = dashboard.value?.services?.active?.breakdown;
  if (!breakdown || !breakdown.length) return;

  const labels = breakdown.map(s => (s.type || '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
  const data = breakdown.map(s => s.count || 0);
  const colors = ['#00a96e', '#6c5ce7', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6'];

  if (servicesChartInstance) {
    servicesChartInstance.data.labels = labels;
    servicesChartInstance.data.datasets[0].data = data;
    servicesChartInstance.update();
    return;
  }

  servicesChartInstance = new Chart(servicesChartCanvas.value, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: labels.map((_, i) => colors[i % colors.length]),
        borderWidth: 0,
        borderRadius: 0,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.raw}` } },
        legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true, font: { size: 10 }, color: 'oklch(var(--bc) / 0.6)' } },
      },
    },
  });
};

// ─── Payment Methods (doughnut) ───
const createPaymentChart = () => {
  if (!paymentChartCanvas.value) return;
  const methods = dashboard.value?.payments?.methods;
  if (!methods || !methods.length) return;

  const labels = methods.map(p => paymentLabel(p.method));
  const data = methods.map(p => parseFloat(p.total) || 0);
  const colors = ['#00a96e', '#6c5ce7', '#3b82f6', '#f59e0b', '#ef4444', '#ec4899'];

  if (paymentChartInstance) {
    paymentChartInstance.data.labels = labels;
    paymentChartInstance.data.datasets[0].data = data;
    paymentChartInstance.update();
    return;
  }

  paymentChartInstance = new Chart(paymentChartCanvas.value, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: labels.map((_, i) => colors[i % colors.length]),
        borderWidth: 0,
        borderRadius: 0,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '60%',
      plugins: {
        tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${formatCurrency(ctx.raw)}` } },
        legend: { position: 'bottom', labels: { padding: 14, usePointStyle: true, font: { size: 10 }, color: 'oklch(var(--bc) / 0.6)' } },
      },
    },
  });
};

// ─── Alerts (bar) ───
const createAlertsChart = () => {
  if (!alertsChartCanvas.value) return;

  // If no alert data, destroy any existing chart
  if (!dashboard.value?.alerts) {
    if (alertsChartInstance) { alertsChartInstance.destroy(); alertsChartInstance = null; }
    return;
  }

  const alerts = dashboard.value.alerts;
  const entries = [
    { label: 'Expiring', value: alerts.expiringMemberships || 0, color: '#f59e0b' },
    { label: 'Low Sessions', value: alerts.lowSessionServices || 0, color: '#ef4444' },
    { label: 'New Members', value: alerts.newMembersToday || 0, color: '#00a96e' },
  ].filter(e => e.value > 0);

  if (!entries.length) {
    if (alertsChartInstance) { alertsChartInstance.destroy(); alertsChartInstance = null; }
    return;
  }

  const labels = entries.map(e => e.label);
  const data = entries.map(e => e.value);
  const colors = entries.map(e => e.color);

  if (alertsChartInstance) {
    alertsChartInstance.data.labels = labels;
    alertsChartInstance.data.datasets[0].data = data;
    alertsChartInstance.data.datasets[0].backgroundColor = colors;
    alertsChartInstance.update();
    return;
  }

  alertsChartInstance = new Chart(alertsChartCanvas.value, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderRadius: 6,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: { callbacks: { label: (ctx) => ` ${ctx.raw}` } },
        legend: { display: false },
      },
      scales: {
        x: { ticks: { color: 'oklch(var(--bc) / 0.5)', font: { size: 11 } }, grid: { display: false } },
        y: { display: false, beginAtZero: true },
      },
    },
  });
};

const createAllCharts = () => {
  createMemberChart();
  createPeakChart();
  createServicesChart();
  createPaymentChart();
  createAlertsChart();
};

// Watch dashboard data to update charts
watch(() => dashboard.value, () => {
  nextTick(() => createAllCharts());
}, { deep: true });

onMounted(() => {
  loadDashboard();
  // Auto-refresh every 30 seconds
  const interval = setInterval(loadDashboard, 30000);
  onBeforeUnmount(() => {
    clearInterval(interval);
    [memberChartInstance, peakChartInstance, servicesChartInstance, paymentChartInstance, alertsChartInstance].forEach(inst => {
      if (inst) { inst.destroy(); }
    });
    memberChartInstance = peakChartInstance = servicesChartInstance = paymentChartInstance = alertsChartInstance = null;
  });
});
</script>

<template>
  <div class="container mx-auto px-4 py-6">
    <!-- Header -->
    <div
      class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6"
    >
      <div>
        <h1 class="text-3xl font-bold">Gym Dashboard</h1>
        <p class="text-base-content/60 mt-1">
          Real-time overview and quick access
        </p>
      </div>

      <div class="flex items-center gap-3">
        <button
          class="btn btn-ghost btn-sm"
          @click="loadDashboard"
          :disabled="loading"
        >
          <IconRefresh class="w-4 h-4" :class="{ 'animate-spin': loading }" />
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading && !dashboard" class="flex justify-center py-20">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <template v-else-if="dashboard">
      <!-- Revenue Overview -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <!-- Today's Revenue -->
        <div class="stat bg-base-100 rounded-box shadow">
          <div class="stat-figure text-primary">
            <IconCash class="w-8 h-8" />
          </div>
          <div class="stat-title">Today's Revenue</div>
          <div class="stat-value text-primary text-2xl">
            {{ formatCurrency(dashboard.revenue?.today?.total || 0) }}
          </div>
          <div class="stat-desc flex items-center gap-1">
            <template v-if="dashboard.revenue?.today?.change > 0">
              <IconTrendingUp class="w-4 h-4 text-success" />
              <span class="text-success"
                >+{{ formatPercent(dashboard.revenue.today.change) }}</span
              >
            </template>
            <template v-else-if="dashboard.revenue?.today?.change < 0">
              <IconTrendingDown class="w-4 h-4 text-error" />
              <span class="text-error">{{
                formatPercent(dashboard.revenue.today.change)
              }}</span>
            </template>
            <span class="ml-1">vs yesterday</span>
          </div>
        </div>

        <!-- Active Members -->
        <div class="stat bg-base-100 rounded-box shadow">
          <div class="stat-figure text-success">
            <IconUsers class="w-8 h-8" />
          </div>
          <div class="stat-title">Active Members</div>
          <div class="stat-value text-success text-2xl">
            {{ dashboard.members?.active || 0 }}
          </div>
          <div class="stat-desc">
            {{ dashboard.members?.total || 0 }} total members
          </div>
        </div>

        <!-- Today's Check-ins -->
        <div class="stat bg-base-100 rounded-box shadow">
          <div class="stat-figure text-info">
            <IconCheck class="w-8 h-8" />
          </div>
          <div class="stat-title">Check-ins Today</div>
          <div class="stat-value text-info text-2xl">
            {{ dashboard.attendance?.today?.total || 0 }}
          </div>
          <div class="stat-desc flex items-center gap-1">
            <template v-if="dashboard.attendance?.today?.change > 0">
              <IconTrendingUp class="w-4 h-4 text-success" />
              <span class="text-success"
                >+{{ formatPercent(dashboard.attendance.today.change) }}</span
              >
            </template>
            <template v-else-if="dashboard.attendance?.today?.change < 0">
              <IconTrendingDown class="w-4 h-4 text-error" />
              <span class="text-error">{{
                formatPercent(dashboard.attendance.today.change)
              }}</span>
            </template>
          </div>
        </div>

        <!-- Monthly Revenue -->
        <div class="stat bg-base-100 rounded-box shadow">
          <div class="stat-figure text-warning">
            <IconChartBar class="w-8 h-8" />
          </div>
          <div class="stat-title">This Month</div>
          <div class="stat-value text-warning text-2xl">
            {{ formatCurrency(dashboard.revenue?.thisMonth?.total || 0) }}
          </div>
          <div class="stat-desc flex items-center gap-1">
            <template v-if="dashboard.revenue?.thisMonth?.change > 0">
              <IconTrendingUp class="w-4 h-4 text-success" />
              <span class="text-success"
                >+{{ formatPercent(dashboard.revenue.thisMonth.change) }}</span
              >
            </template>
            <template v-else-if="dashboard.revenue?.thisMonth?.change < 0">
              <IconTrendingDown class="w-4 h-4 text-error" />
              <span class="text-error">{{
                formatPercent(dashboard.revenue.thisMonth.change)
              }}</span>
            </template>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="card bg-base-100 border border-base-200 shadow-sm mb-8">
        <div class="card-body py-4">
          <h3 class="text-sm font-semibold text-base-content/50 uppercase tracking-wide mb-3">Quick Actions</h3>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5">
            <button
              v-for="link in quickLinks"
              :key="link.route"
              class="btn btn-ghost justify-start gap-3 h-auto py-3 px-3 rounded-xl font-normal"
              @click="router.push(link.route)"
            >
              <span :class="['flex shrink-0 items-center justify-center size-9 rounded-xl', link.color]">
                <component :is="link.icon" class="size-5" />
              </span>
              <span class="text-sm text-left leading-tight">{{ link.title }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Members & Attendance Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <!-- Member Stats Chart -->
        <div class="card bg-base-100 border border-base-200 shadow-sm">
          <div class="card-body">
            <h3 class="card-title text-base mb-1">Member Statistics</h3>
            <p class="text-xs text-base-content/40 -mt-1 mb-3">KPI overview</p>
            <div class="relative h-36">
              <canvas ref="memberChartCanvas"></canvas>
            </div>
            <div class="mt-3 pt-3 border-t border-base-200 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs">
              <span class="flex items-center gap-1.5"><span class="size-2 rounded-full bg-[#00a96e]"></span> Active: <strong>{{ dashboard.members?.active || 0 }}</strong></span>
              <span class="flex items-center gap-1.5"><span class="size-2 rounded-full bg-[#6c5ce7]"></span> New: <strong>{{ dashboard.members?.newThisMonth || 0 }}</strong></span>
              <span class="flex items-center gap-1.5"><span class="size-2 rounded-full bg-[#f59e0b]"></span> Expiring: <strong>{{ dashboard.members?.expiringMemberships || 0 }}</strong></span>
              <span class="flex items-center gap-1.5 ml-auto"><span class="text-base-content/40">Total: <strong>{{ dashboard.members?.total || 0 }}</strong></span></span>
            </div>
          </div>
        </div>

        <!-- Peak Hours Chart -->
        <div class="card bg-base-100 border border-base-200 shadow-sm">
          <div class="card-body">
            <h3 class="card-title text-base mb-1">Peak Hours Today</h3>
            <p class="text-xs text-base-content/40 -mt-1 mb-2">Check-in distribution by hour</p>
            <div class="relative h-48">
              <canvas ref="peakChartCanvas"></canvas>
            </div>
            <div class="mt-2 pt-2 border-t border-base-200 flex justify-between text-xs">
              <span class="text-base-content/40">Unique Members: <strong>{{ dashboard.attendance?.today?.unique || 0 }}</strong></span>
              <span class="text-base-content/40">Total: <strong>{{ dashboard.attendance?.today?.total || 0 }}</strong></span>
            </div>
          </div>
        </div>
      </div>

      <!-- Active Services & Payments -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <!-- Active Services Chart -->
        <div class="card bg-base-100 border border-base-200 shadow-sm">
          <div class="card-body">
            <h3 class="card-title text-base mb-1">Active Services</h3>
            <p class="text-xs text-base-content/40 -mt-1 mb-2">Breakdown by type</p>
            <div class="relative h-52">
              <canvas ref="servicesChartCanvas"></canvas>
            </div>
            <div class="mt-1 pt-2 border-t border-base-200 text-xs text-base-content/40">
              Total Active: <strong>{{ dashboard.services?.active?.total || 0 }}</strong>
            </div>
          </div>
        </div>

        <!-- Payment Methods Chart -->
        <div class="card bg-base-100 border border-base-200 shadow-sm">
          <div class="card-body">
            <h3 class="card-title text-base mb-1">Payment Methods Today</h3>
            <p class="text-xs text-base-content/40 -mt-1 mb-2">Distribution by method</p>
            <div class="relative h-52">
              <canvas ref="paymentChartCanvas"></canvas>
            </div>
          </div>
        </div>
      </div>

      <!-- Alerts Chart -->
      <div
        v-if="dashboard.alerts"
        class="card bg-base-100 border border-base-200 shadow-sm mb-8"
      >
        <div class="card-body">
          <h3 class="card-title text-base mb-1">Alerts & Notifications</h3>
          <p class="text-xs text-base-content/40 -mt-1 mb-3">Issues requiring attention</p>
          <div class="relative h-28">
            <canvas ref="alertsChartCanvas"></canvas>
          </div>
        </div>
      </div>

      <!-- Recent Transactions -->
      <div
        v-if="dashboard.recentTransactions?.length"
        class="card bg-base-100 shadow mb-8"
      >
        <div class="card-body">
          <h3 class="card-title mb-4">Recent Transactions</h3>

          <div class="overflow-x-auto">
            <table class="table">
              <thead>
                <tr>
                  <th>Transaction #</th>
                  <th class="text-right">Amount</th>
                  <th>Status</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="txn in dashboard.recentTransactions"
                  :key="txn.id"
                  class="hover"
                >
                  <td class="font-mono text-sm">{{ txn.transactionNumber }}</td>
                  <td class="text-right font-semibold">
                    {{ formatCurrency(txn.amount) }}
                  </td>
                  <td>
                    <span class="badge badge-success badge-sm capitalize">{{
                      txn.status
                    }}</span>
                  </td>
                  <td class="text-sm text-base-content/60">
                    {{ new Date(txn.createdAt).toLocaleString("id-ID") }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
