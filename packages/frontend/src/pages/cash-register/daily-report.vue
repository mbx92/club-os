<route lang="yaml">
meta:
  title: Laporan Harian Kasir
  layout: default
</route>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useCashRegister } from "@/composables/gym/cash-register";
import { useCurrency } from "@/composables/core/useCurrency";
import dayjs from "dayjs";
import {
  IconCalendarStats,
  IconRefresh,
  IconBuildingStore,
  IconBarbell,
  IconReceipt,
  IconCurrencyDollar,
  IconChartBar,
  IconCash,
  IconAlertTriangle,
  IconCircleCheck,
  IconClockHour4,
  IconPrinter,
  IconTag,
} from "@tabler/icons-vue";

const { getDailyReport, printDailyReport, dailyReport, loading } =
  useCashRegister();
const { formatCurrency } = useCurrency();

// ── Filters ──────────────────────────────────────────────
const selectedDate = ref(dayjs().format("YYYY-MM-DD"));
const selectedType = ref("all");

const dateLabel = computed(() =>
  dayjs(selectedDate.value).format("dddd, DD MMMM YYYY"),
);

const printing = ref(false);

const handlePrint = async () => {
  printing.value = true;
  try {
    await printDailyReport({
      date: selectedDate.value,
      type: selectedType.value,
    });
  } catch {
    /* handled by composable */
  } finally {
    printing.value = false;
  }
};

// ── Derived data ──────────────────────────────────────────
const shifts = computed(() => dailyReport.value?.shifts || []);
const summary = computed(() => dailyReport.value?.summary || {});
const reportCashier = computed(() => dailyReport.value?.reportCashier || null);
const reportGym = computed(() => dailyReport.value?.reportGym || null);
const expenseDetail = computed(() => dailyReport.value?.expenseDetail || []);
const voucherSummary = computed(() => dailyReport.value?.reportGym?.voucherSummary || null);
const cashSummary = computed(() => dailyReport.value?.cashSummary || null);
const hasRestaurantCashSales = computed(
  () =>
    (parseFloat(reportCashier.value?.Q_totalCash) || 0) > 0 ||
    (parseFloat(cashSummary.value?.cashSalesResto) || 0) > 0
);

// ── Payment helpers ───────────────────────────────────────
const paymentLabels = {
  cash: "Tunai",
  credit_card: "Kartu",
  debit_card: "Kartu Debit",
  bank_transfer: "Transfer Bank",
  qris: "QRIS",
  e_wallet: "E-Wallet",
  compliment: "Gratis (Compliment)",
  card: "Kartu",
  ewallet: "E-Wallet",
  transfer: "Transfer Bank",
  bni: "BNI",
  bca: "BCA",
  mandiri: "Mandiri",
  gojek: "Gojek",
};

const nonCashPayments = computed(() => {
  if (!reportCashier.value?.paymentMethods) return [];
  return Object.entries(reportCashier.value.paymentMethods)
    .filter(([k]) => k !== "cash")
    .map(([k, v]) => ({
      key: k,
      label: paymentLabels[k] || k.toUpperCase(),
      ...v,
    }));
});

const cardKeys = new Set([
  "credit_card",
  "debit_card",
  "card",
  "bni",
  "bca",
  "mandiri",
]);
const isCardPayment = (key) => cardKeys.has(key);

const cardPayments = computed(() => {
  if (!reportCashier.value?.paymentMethods) return [];
  return Object.entries(reportCashier.value.paymentMethods)
    .filter(([k]) => isCardPayment(k))
    .map(([k, v]) => ({ key: k, label: paymentLabels[k] || k.toUpperCase(), ...v }));
});

const cardTotal = computed(() =>
  cardPayments.value.reduce((s, p) => s + (p.amount || 0), 0)
);

const cardBankDetail = computed(() =>
  cardPayments.value.flatMap((p) => p.detail || [])
);

const qrisPayment = computed(
  () => reportCashier.value?.paymentMethods?.qris || null
);

const qrisBankDetail = computed(
  () => qrisPayment.value?.detail || []
);

const otherNonCashPayments = computed(() => {
  if (!reportCashier.value?.paymentMethods) return [];
  return Object.entries(reportCashier.value.paymentMethods)
    .filter(
      ([k]) =>
        !isCardPayment(k) && k !== "cash" && k !== "qris" && k !== "compliment"
    )
    .map(([k, v]) => ({ key: k, label: paymentLabels[k] || k.toUpperCase(), ...v }));
});

const membershipKeys = [
  "daily",
  "weekly",
  "1month",
  "3month",
  "6month",
  "12month",
];

// ── Load ──────────────────────────────────────────────────
const load = async () => {
  try {
    await getDailyReport({
      date: selectedDate.value,
      type: selectedType.value,
    });
  } catch {
    /* handled by composable */
  }
};

watch([selectedDate, selectedType], load);
onMounted(load);

// ── Helpers ───────────────────────────────────────────────
const diffClass = (val) => {
  const n = parseFloat(val) || 0;
  if (n === 0) return "text-success";
  if (n > 0) return "text-info";
  return "text-error";
};

const shiftStatusBadge = (status) =>
  status === "open" ? "badge-success" : "badge-ghost";
</script>

<template>
  <div class="container mx-auto px-4 py-8 max-w-5xl">
    <!-- Header -->
    <div
      class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6"
    >
      <div>
        <h1 class="text-2xl font-bold flex items-center gap-2">
          <IconCalendarStats class="w-7 h-7 text-primary" />
          Laporan Harian Kasir
        </h1>
        <p class="text-sm text-base-content/60 mt-1">{{ dateLabel }}</p>
      </div>
      <div class="flex items-center gap-2">
        <button
          class="btn btn-outline btn-sm gap-1"
          :disabled="printing || loading || !dailyReport"
          @click="handlePrint"
        >
          <span
            v-if="printing"
            class="loading loading-spinner loading-xs"
          ></span>
          <IconPrinter v-else class="w-4 h-4" />
          Cetak
        </button>
        <button
          class="btn btn-ghost btn-sm"
          :disabled="loading"
          title="Refresh"
          @click="load"
        >
          <span
            v-if="loading"
            class="loading loading-spinner loading-xs"
          ></span>
          <IconRefresh v-else class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-3 mb-6">
      <input
        v-model="selectedDate"
        type="date"
        class="input input-bordered input-sm"
      />
      <select v-model="selectedType" class="select select-bordered select-sm">
        <option value="all">Semua (Kasir + Gym)</option>
        <option value="cashier">Kasir / POS saja</option>
        <option value="gym">Gym saja</option>
      </select>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="flex justify-center py-24">
      <span class="loading loading-spinner loading-lg text-primary"></span>
    </div>

    <template v-else-if="dailyReport">
      <!-- ── Summary Cards ── -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div
          class="stat bg-base-100 border border-base-200 rounded-xl p-4 shadow-sm"
        >
          <div class="stat-title text-xs">Total Shift</div>
          <div class="stat-value text-lg">{{ summary.totalShifts ?? 0 }}</div>
          <div class="stat-desc">
            <span class="text-success">{{ summary.openShifts ?? 0 }} buka</span>
            &middot;
            <span>{{ summary.closedShifts ?? 0 }} tutup</span>
          </div>
        </div>
        <div
          class="stat bg-base-100 border border-base-200 rounded-xl p-4 shadow-sm"
        >
          <div class="stat-title text-xs">Total Transaksi</div>
          <div class="stat-value text-lg">
            {{ summary.totalTransactions ?? 0 }}
          </div>
          <div class="stat-desc text-xs">Semua shift</div>
        </div>
        <div
          class="stat bg-base-100 border border-base-200 rounded-xl p-4 shadow-sm"
        >
          <div class="stat-title text-xs">Total Pengeluaran</div>
          <div class="stat-value text-lg text-error">
            {{ formatCurrency(summary.totalExpenses ?? 0) }}
          </div>
          <div class="stat-desc text-xs">Petty cash</div>
        </div>
        <div
          class="stat rounded-xl p-4 shadow-sm border"
          :class="
            (summary.totalDifference ?? 0) <= 0
              ? 'bg-error/10 border-error/20'
              : 'bg-info/10 border-info/20'
          "
        >
          <div class="stat-title text-xs">Total Selisih</div>
          <div
            class="stat-value text-lg"
            :class="diffClass(summary.totalDifference)"
          >
            {{ (summary.totalDifference ?? 0) >= 0 ? "+" : ""
            }}{{ formatCurrency(summary.totalDifference ?? 0) }}
          </div>
          <div class="stat-desc text-xs">Semua shift</div>
        </div>
      </div>

      <!-- ── Shifts Table ── -->
      <div
        v-if="shifts.length"
        class="card bg-base-100 border border-base-200 shadow-sm mb-6"
      >
        <div class="card-body p-0">
          <div
            class="px-5 py-3 border-b border-base-200 flex items-center gap-2"
          >
            <IconClockHour4 class="w-5 h-5 text-primary" />
            <h2 class="font-bold text-base">Ringkasan Shift</h2>
            <span class="badge badge-sm badge-ghost ml-auto"
              >{{ shifts.length }} shift</span
            >
          </div>
          <div class="overflow-x-auto">
            <table class="table table-sm text-sm">
              <thead>
                <tr class="bg-base-200/50 text-xs text-base-content/60">
                  <th>Shift</th>
                  <th>Status</th>
                  <th class="text-right">Modal Awal</th>
                  <th class="text-right">Kas Aktual</th>
                  <th class="text-right">Cash In</th>
                  <th class="text-right">Selisih</th>
                  <th class="text-center">Trx</th>
                  <th class="text-center">Kasir</th>
                  <th class="text-center">Gym</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="s in shifts" :key="s.id" class="hover">
                  <td class="font-medium capitalize">{{ s.shiftName }}</td>
                  <td>
                    <span
                      class="badge badge-sm"
                      :class="shiftStatusBadge(s.status)"
                      >{{ s.status }}</span
                    >
                  </td>
                  <td class="text-right">
                    {{ formatCurrency(s.openingBalance) }}
                  </td>
                  <td class="text-right">{{ formatCurrency(s.actualCash) }}</td>
                  <td class="text-right">{{ formatCurrency(s.cashIn) }}</td>
                  <td
                    class="text-right font-semibold"
                    :class="diffClass(s.difference)"
                  >
                    {{ (parseFloat(s.difference) || 0) >= 0 ? "+" : ""
                    }}{{ formatCurrency(s.difference) }}
                  </td>
                  <td class="text-center text-base-content/70">
                    {{ s.transactionCount ?? "—" }}
                  </td>
                  <td class="text-center text-base-content/70">
                    {{ s.cashierCount ?? "—" }}
                  </td>
                  <td class="text-center text-base-content/70">
                    {{ s.gymCount ?? "—" }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ── Report Columns ── -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <!-- Report Cashier -->
        <div
          v-if="reportCashier && selectedType !== 'gym'"
          class="card bg-base-100 border border-base-200 shadow-sm"
        >
          <div class="card-body p-0">
            <div
              class="bg-primary/10 px-5 py-3 rounded-t-2xl flex items-center gap-2"
            >
              <IconBuildingStore class="w-5 h-5 text-primary" />
              <h2 class="font-bold text-base tracking-wide">REPORT RESTO</h2>
              <span class="ml-auto text-xs text-base-content/50">{{
                dayjs(selectedDate).format("DD/MM/YYYY")
              }}</span>
            </div>
            <table class="table table-sm text-sm">
              <tbody>
                <tr class="hover">
                  <td>Penjualan</td>
                  <td class="text-right font-medium">
                    {{ formatCurrency(reportCashier.A_penjualan) }}
                  </td>
                </tr>
                <tr class="hover">
                  <td>Discount</td>
                  <td class="text-right">
                    {{ formatCurrency(reportCashier.C_discount) }}
                  </td>
                </tr>
                <tr class="hover">
                  <td>Service</td>
                  <td class="text-right">
                    {{ formatCurrency(reportCashier.F_serviceCharge) }}
                  </td>
                </tr>
                <tr class="hover">
                  <td>Tax</td>
                  <td class="text-right">
                    {{ formatCurrency(reportCashier.G_tax) }}
                  </td>
                </tr>
                <tr class="hover">
                  <td>Rounding</td>
                  <td class="text-right">
                    {{ formatCurrency(reportCashier.H_rounding) }}
                  </td>
                </tr>
                <tr class="hover">
                  <td>Tipping</td>
                  <td class="text-right">
                    {{ formatCurrency(reportCashier.I_tipping) }}
                  </td>
                </tr>
                <tr class="bg-primary/5 font-bold">
                  <td>GRAND TOTAL</td>
                  <td class="text-right text-primary">
                    {{ formatCurrency(reportCashier.J_grandTotal) }}
                  </td>
                </tr>
                <!-- #KARTU -->
                <tr v-if="cardTotal > 0" class="hover">
                  <td>
                    Kartu
                    <span class="badge badge-xs badge-ghost ml-1">
                      {{ cardPayments.reduce((s, p) => s + (p.count || 0), 0) }}x
                    </span>
                  </td>
                  <td class="text-right">{{ formatCurrency(cardTotal) }}</td>
                </tr>
                <!-- ##LIST KARTU -->
                <tr
                  v-for="bank in cardBankDetail"
                  :key="bank.bankName"
                  class="bg-info/5"
                >
                  <td class="pl-6 text-xs text-base-content/60">
                    <span class="mr-1 text-base-content/30">&rsaquo;</span>
                    {{ bank.bankName }}
                    <span class="badge badge-xs badge-ghost ml-1"
                      >{{ bank.transactionCount }}x</span
                    >
                  </td>
                  <td class="text-right text-xs text-info font-medium">
                    {{ formatCurrency(bank.total) }}
                  </td>
                </tr>
                <!-- QRIS -->
                <tr
                  v-if="qrisPayment"
                  class="hover"
                  :class="qrisPayment.amount === 0 ? 'opacity-40' : ''"
                >
                  <td>
                    QRIS
                    <span
                      v-if="qrisPayment.count"
                      class="badge badge-xs badge-ghost ml-1"
                      >{{ qrisPayment.count }}x</span
                    >
                  </td>
                  <td class="text-right">
                    {{ formatCurrency(qrisPayment.amount) }}
                  </td>
                </tr>
                <!-- QRIS Bank Detail -->
                <tr
                  v-for="bank in qrisBankDetail"
                  :key="bank.bankName"
                  class="bg-info/5"
                >
                  <td class="pl-6 text-xs text-base-content/60">
                    <span class="mr-1 text-base-content/30">&rsaquo;</span>
                    {{ bank.bankName }}
                    <span class="badge badge-xs badge-ghost ml-1"
                      >{{ bank.transactionCount }}x</span
                    >
                  </td>
                  <td class="text-right text-xs text-info font-medium">
                    {{ formatCurrency(bank.total) }}
                  </td>
                </tr>
                <!-- Other non-cash (e_wallet, bank_transfer, etc.) -->
                <template v-for="pm in otherNonCashPayments" :key="pm.key">
                  <tr
                    class="hover"
                    :class="pm.amount === 0 ? 'opacity-40' : ''"
                  >
                    <td>
                      {{ pm.label }}
                      <span
                        v-if="pm.count"
                        class="badge badge-xs badge-ghost ml-1"
                        >{{ pm.count }}x</span
                      >
                    </td>
                    <td class="text-right">{{ formatCurrency(pm.amount) }}</td>
                  </tr>
                  <tr
                    v-for="bank in pm.detail || []"
                    :key="bank.bankName"
                    class="bg-info/5"
                  >
                    <td class="pl-6 text-xs text-base-content/60">
                      <span class="mr-1 text-base-content/30">&rsaquo;</span>
                      {{ bank.bankName }}
                      <span class="badge badge-xs badge-ghost ml-1"
                        >{{ bank.transactionCount }}x</span
                      >
                    </td>
                    <td class="text-right text-xs text-info font-medium">
                      {{ formatCurrency(bank.total) }}
                    </td>
                  </tr>
                </template>
                <!-- TOTAL CASH - TUNAI -->
                <tr v-if="hasRestaurantCashSales" class="bg-success/5">
                  <td>Tunai</td>
                  <td class="text-right text-success">
                    {{ formatCurrency(reportCashier.Q_totalCash) }}
                  </td>
                </tr>
                <!-- COMPLEMENT -->
                <tr class="hover">
                  <td>Complement</td>
                  <td class="text-right">
                    {{ formatCurrency(reportCashier.R_complimentTotal) }}
                  </td>
                </tr>
              </tbody>
            </table>
            <div
              class="px-5 py-3 border-t border-base-200 text-xs text-base-content/50 flex gap-4 flex-wrap"
            >
              <span>{{ reportCashier.transactionCount }} transaksi</span>
              <span v-if="reportCashier.deliveryCount"
                >{{ reportCashier.deliveryCount }} delivery</span
              >
              <span v-if="reportCashier.pax">{{ reportCashier.pax }} pax</span>
            </div>
          </div>
        </div>

        <!-- Report Gym -->
        <div
          v-if="reportGym && selectedType !== 'cashier'"
          class="card bg-base-100 border border-base-200 shadow-sm"
        >
          <div class="card-body p-0">
            <div
              class="bg-secondary/10 px-5 py-3 rounded-t-2xl flex items-center gap-2"
            >
              <IconBarbell class="w-5 h-5 text-secondary" />
              <h2 class="font-bold text-base tracking-wide">REPORT GYM</h2>
              <span class="ml-auto text-xs text-base-content/50">{{
                dayjs(selectedDate).format("DD/MM/YYYY")
              }}</span>
            </div>
            <table class="table table-sm text-sm">
              <thead>
                <tr class="bg-base-200/50 text-xs text-base-content/50">
                  <th>Item</th>
                  <th class="text-center">Qty</th>
                  <th class="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <!-- Memberships -->
                <template v-for="key in membershipKeys" :key="key">
                  <tr
                    class="hover"
                    :class="
                      !(reportGym.memberships?.[key]?.count > 0)
                        ? 'opacity-40'
                        : ''
                    "
                  >
                    <td class="font-medium min-w-[130px]">
                      {{ reportGym.memberships?.[key]?.label || key }}
                    </td>
                    <td class="text-center w-20 text-xs">
                      <template v-if="reportGym.memberships?.[key]?.count > 0">
                        <span class="font-medium"
                          >{{
                            reportGym.memberships[key].pax ??
                            reportGym.memberships[key].count
                          }}
                          org</span
                        >
                        <span
                          v-if="
                            reportGym.memberships[key].pax &&
                            reportGym.memberships[key].pax !==
                              reportGym.memberships[key].count
                          "
                          class="block text-base-content/40"
                          >({{ reportGym.memberships[key].count }}x)</span
                        >
                      </template>
                      <span v-else>—</span>
                    </td>
                    <td class="text-right">
                      <span v-if="reportGym.memberships?.[key]?.count > 0">{{
                        formatCurrency(reportGym.memberships[key].amount)
                      }}</span>
                      <span v-else>—</span>
                    </td>
                  </tr>
                  <!-- Plan / service package sub-rows -->
                  <tr
                    v-for="plan in reportGym.memberships?.[key]?.plans || []"
                    :key="plan.id"
                    class="bg-base-200/40"
                  >
                    <td class="pl-6 text-xs text-base-content/70">
                      <span class="mr-1 text-base-content/30">&rsaquo;</span
                      >{{ plan.name }}
                    </td>
                    <td class="text-center text-xs text-base-content/60">
                      {{ plan.pax ?? plan.count }}x
                      <span
                        v-if="plan.pax && plan.pax !== plan.count"
                        class="text-base-content/40"
                        >({{ plan.count }})</span
                      >
                    </td>
                    <td class="text-right text-xs text-base-content/70">
                      {{ formatCurrency(plan.amount) }}
                    </td>
                  </tr>
                </template>
                <!-- Session Packages -->
                <template
                  v-for="(pkg, pkgKey) in reportGym.sessionPackages"
                  :key="pkgKey"
                >
                  <tr
                    class="hover"
                    :class="!(pkg.count > 0) ? 'opacity-40' : ''"
                  >
                    <td class="font-medium min-w-[130px]">
                      {{ pkg.label || pkgKey }}
                    </td>
                    <td class="text-center w-20 text-xs">
                      <span v-if="pkg.count > 0" class="font-medium"
                        >{{ pkg.count }}x</span
                      >
                      <span v-else>—</span>
                    </td>
                    <td class="text-right">
                      <span v-if="pkg.count > 0">{{
                        formatCurrency(pkg.amount)
                      }}</span>
                      <span v-else>—</span>
                    </td>
                  </tr>
                  <tr
                    v-for="plan in pkg.plans || []"
                    :key="plan.id"
                    class="bg-base-200/40"
                  >
                    <td class="pl-6 text-xs text-base-content/70">
                      <span class="mr-1 text-base-content/30">&rsaquo;</span
                      >{{ plan.name }}
                    </td>
                    <td class="text-center text-xs text-base-content/60">
                      {{ plan.count }}x
                    </td>
                    <td class="text-right text-xs text-base-content/70">
                      {{ formatCurrency(plan.amount) }}
                    </td>
                  </tr>
                </template>
                <!-- Other items -->
                <tr
                  v-for="(item, name) in reportGym.otherItems"
                  :key="name"
                  class="hover"
                >
                  <td class="font-medium">{{ name }}</td>
                  <td class="text-center text-xs">{{ item.count }}</td>
                  <td class="text-right">{{ formatCurrency(item.amount) }}</td>
                </tr>

                <tr class="bg-secondary/5 font-bold">
                  <td>GRAND TOTAL</td>
                  <td></td>
                  <td class="text-right text-primary">
                    {{ formatCurrency(reportGym.grandTotal) }}
                  </td>
                </tr>

                <!-- Payment methods -->
                <template
                  v-for="(pm, method) in reportGym.paymentMethods"
                  :key="method"
                >
                  <tr
                    class="hover"
                    :class="pm.amount === 0 ? 'opacity-40' : ''"
                  >
                    <td class="text-base-content/60">
                      {{ paymentLabels[method] || method.toUpperCase() }}
                    </td>
                    <td class="text-center text-xs text-base-content/50">
                      {{ pm.count ? `${pm.count}x` : "" }}
                    </td>
                    <td class="text-right">{{ formatCurrency(pm.amount) }}</td>
                  </tr>
                  <!-- Detail per bank -->
                  <tr
                    v-for="bank in pm.detail || []"
                    :key="bank.bankName"
                    class="bg-info/5"
                  >
                    <td class="pl-6 text-xs text-base-content/60">
                      <span class="mr-1 text-base-content/30">&rsaquo;</span>
                      {{ bank.bankName }}
                      <span class="badge badge-xs badge-ghost ml-1"
                        >{{ bank.transactionCount }}x</span
                      >
                    </td>
                    <td></td>
                    <td class="text-right text-xs text-info font-medium">
                      {{ formatCurrency(bank.total) }}
                    </td>
                  </tr>
                </template>
                <tr v-if="reportGym.totalDiscount > 0" class="hover">
                  <td class="text-warning/80">TOTAL DISCOUNT</td>
                  <td></td>
                  <td class="text-right text-warning font-medium">
                    -{{ formatCurrency(reportGym.totalDiscount) }}
                  </td>
                </tr>

              </tbody>
            </table>
            <div
              class="px-5 py-3 border-t border-base-200 text-xs text-base-content/50"
            >
              {{ reportGym.transactionCount }} transaksi
              <span v-if="reportGym.totalPax"
                >&middot; {{ reportGym.totalPax }} pax</span
              >
            </div>
          </div>
        </div>
      </div>

      <!-- ── Total Penjualan ── -->
      <div
        v-if="cashSummary"
        class="card bg-base-100 border border-base-200 shadow-sm mb-6"
      >
        <div class="card-body p-0">
          <div
            class="px-5 py-3 border-b border-base-200 flex items-center gap-2"
          >
            <IconCash class="w-5 h-5 text-success" />
            <h2 class="font-bold text-base">Total Penjualan</h2>
          </div>
          <table class="table table-sm text-sm">
            <tbody>
              <!-- Cash breakdown -->
              <tr class="bg-base-200/50">
                <td colspan="2" class="text-xs font-semibold text-base-content/60 py-1">
                  <span class="inline-block w-2 h-2 rounded-full bg-success mr-2"></span>
                  Tunai (Cash)
                </td>
              </tr>
              <tr v-if="hasRestaurantCashSales" class="hover">
                <td class="pl-4">Cash Penjualan Resto</td>
                <td class="text-right font-medium">
                  {{ formatCurrency(cashSummary.cashSalesResto ?? 0) }}
                </td>
              </tr>
              <tr class="hover">
                <td class="pl-4">Cash Penjualan Gym</td>
                <td class="text-right font-medium">
                  {{ formatCurrency(cashSummary.cashSalesGym ?? 0) }}
                </td>
              </tr>
              <tr class="bg-success/5 font-semibold">
                <td class="pl-4">Subtotal Cash</td>
                <td class="text-right text-success">
                  {{ formatCurrency((cashSummary.cashSalesResto ?? 0) + (cashSummary.cashSalesGym ?? 0)) }}
                </td>
              </tr>
              <!-- Non-Cash breakdown -->
              <tr class="bg-base-200/50">
                <td colspan="2" class="text-xs font-semibold text-base-content/60 py-1">
                  <span class="inline-block w-2 h-2 rounded-full bg-info mr-2"></span>
                  Non-Tunai (QRIS, Transfer, Kartu, dll)
                </td>
              </tr>
              <tr v-if="(cashSummary.nonCashSalesResto ?? 0) > 0" class="hover">
                <td class="pl-4">Non-Cash Penjualan Resto</td>
                <td class="text-right font-medium">
                  {{ formatCurrency(cashSummary.nonCashSalesResto ?? 0) }}
                </td>
              </tr>
              <tr v-if="(cashSummary.nonCashSalesGym ?? 0) > 0" class="hover">
                <td class="pl-4">Non-Cash Penjualan Gym</td>
                <td class="text-right font-medium">
                  {{ formatCurrency(cashSummary.nonCashSalesGym ?? 0) }}
                </td>
              </tr>
              <tr class="bg-info/5 font-semibold">
                <td class="pl-4">Subtotal Non-Cash</td>
                <td class="text-right text-info">
                  {{ formatCurrency(cashSummary.totalNonCash ?? 0) }}
                </td>
              </tr>
              <!-- Rounding (selisih pembulatan) -->
              <tr v-if="(reportCashier?.H_rounding ?? 0) !== 0" class="bg-warning/5 hover">
                <td class="pl-4">
                  <span class="inline-block w-2 h-2 rounded-full bg-warning mr-2"></span>
                  Pembulatan (Rounding)
                </td>
                <td class="text-right font-medium"
                  :class="(reportCashier?.H_rounding ?? 0) > 0 ? 'text-success' : 'text-error'">
                  {{ (reportCashier?.H_rounding ?? 0) >= 0 ? '+' : '' }}{{ formatCurrency(reportCashier?.H_rounding ?? 0) }}
                </td>
              </tr>
              <!-- Balance: Revenue + Rounding = Cash + Non-Cash -->
              <tr class="bg-base-200/30">
                <td class="text-xs text-base-content/60 pl-4">
                  <IconCircleCheck class="w-3 h-3 inline mr-1" />
                  Revenue + Rounding = Cash + Non-Cash
                </td>
                <td class="text-right font-bold">
                  {{ formatCurrency((cashSummary.totalSales ?? 0) + (reportCashier?.H_rounding ?? 0)) }}
                </td>
              </tr>
              <tr v-if="(reportCashier?.R_complimentTotal ?? 0) > 0" class="hover">
                <td class="text-warning">Compliment</td>
                <td class="text-right font-medium text-warning">
                  {{ formatCurrency(reportCashier.R_complimentTotal) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ── Expense Detail ── -->
      <div
        v-if="expenseDetail.length > 0"
        class="card bg-base-100 border border-base-200 shadow-sm mb-4"
      >
        <div class="card-body p-0">
          <div
            class="px-5 py-3 border-b border-base-200 flex items-center gap-2"
          >
            <IconReceipt class="w-5 h-5 text-error" />
            <h2 class="font-bold text-base">Detail Pengeluaran Laci</h2>
            <span class="badge badge-sm badge-ghost ml-auto"
              >{{ expenseDetail.length }} item</span
            >
          </div>
          <div class="overflow-x-auto">
            <table class="table table-sm text-sm">
              <thead>
                <tr class="bg-base-200/50">
                  <th>Keterangan</th>
                  <th>Kategori</th>
                  <th>Metode</th>
                  <th class="text-right">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="e in expenseDetail" :key="e.id" class="hover">
                  <td class="font-medium">{{ e.title }}</td>
                  <td class="text-xs text-base-content/60">
                    {{ e.category || "—" }}
                  </td>
                  <td>
                    <span class="badge badge-xs badge-outline">{{
                      e.paymentMethod
                    }}</span>
                  </td>
                  <td class="text-right text-error font-medium">
                    {{ formatCurrency(e.amount) }}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="font-bold bg-error/5">
                  <td colspan="3">Total Pengeluaran</td>
                  <td class="text-right text-error">
                    {{ formatCurrency(summary.totalExpenses || expenseDetail.reduce((s, e) => s + (e.amount || 0), 0)) }}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      <!-- ── Diskon & Voucher ── -->
      <div
        v-if="voucherSummary && voucherSummary.count > 0"
        class="card bg-base-100 border border-base-200 shadow-sm mb-4"
      >
        <div class="card-body p-0">
          <div
            class="px-5 py-3 border-b border-base-200 flex items-center gap-2"
          >
            <IconTag class="w-5 h-5 text-warning" />
            <h2 class="font-bold text-base">Diskon &amp; Voucher</h2>
            <span class="badge badge-sm badge-ghost ml-auto"
              >{{ voucherSummary.count }}x digunakan</span
            >
          </div>
          <table class="table table-sm text-sm">
            <thead>
              <tr class="bg-base-200/50 text-xs text-base-content/50">
                <th>Kode</th>
                <th>Nama Voucher</th>
                <th class="text-center">Pemakaian</th>
                <th class="text-right">Total Diskon</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="v in voucherSummary.vouchers"
                :key="v.code"
                class="hover"
              >
                <td>
                  <span class="badge badge-outline badge-sm font-mono">{{ v.code }}</span>
                </td>
                <td class="font-medium">{{ v.name }}</td>
                <td class="text-center text-xs">{{ v.count }}x</td>
                <td class="text-right text-warning font-medium">
                  -{{ formatCurrency(v.totalDiscount) }}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="font-bold bg-warning/5">
                <td colspan="3">Total Diskon</td>
                <td class="text-right text-warning">
                  -{{ formatCurrency(voucherSummary.totalDiscount) }}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- ── Rekap Harian ── -->
      <div class="card bg-base-100 border border-base-200 shadow-sm mb-6">
        <div class="card-body p-0">
          <div
            class="px-5 py-3 border-b border-base-200 flex items-center gap-2"
          >
            <IconChartBar class="w-5 h-5 text-primary" />
            <h2 class="font-bold text-base">Rekap Harian</h2>
          </div>
          <table class="table table-sm text-sm">
            <tbody>
              <tr v-if="reportCashier" class="hover">
                <td>Total Penjualan Resto</td>
                <td class="text-right font-medium">
                  {{ formatCurrency(reportCashier.J_grandTotal ?? 0) }}
                </td>
              </tr>
              <tr v-if="reportGym" class="hover">
                <td>Total Penjualan Gym</td>
                <td class="text-right font-medium">
                  {{ formatCurrency(reportGym.grandTotal ?? 0) }}
                </td>
              </tr>
              <!-- Cash vs Non-Cash breakdown -->
              <tr v-if="cashSummary" class="bg-base-200/50">
                <td colspan="2" class="text-xs font-semibold text-base-content/60 py-1">
                  Breakdown Pembayaran
                </td>
              </tr>
              <tr v-if="cashSummary" class="hover">
                <td class="pl-4">
                  <span class="inline-block w-2 h-2 rounded-full bg-success mr-2"></span>
                  Tunai (Cash)
                </td>
                <td class="text-right font-medium text-success">
                  {{ formatCurrency((cashSummary.cashSalesResto ?? 0) + (cashSummary.cashSalesGym ?? 0)) }}
                </td>
              </tr>
              <tr v-if="cashSummary" class="hover">
                <td class="pl-4">
                  <span class="inline-block w-2 h-2 rounded-full bg-info mr-2"></span>
                  Non-Tunai (QRIS, Transfer, Kartu, dll)
                </td>
                <td class="text-right font-medium text-info">
                  {{ formatCurrency(cashSummary.totalNonCash ?? 0) }}
                </td>
              </tr>
              <!-- Rounding detail -->
              <tr v-if="(reportCashier?.H_rounding ?? 0) !== 0" class="hover">
                <td class="pl-4">
                  <span class="inline-block w-2 h-2 rounded-full bg-warning mr-2"></span>
                  Pembulatan (Rounding)
                </td>
                <td class="text-right font-medium"
                  :class="(reportCashier?.H_rounding ?? 0) > 0 ? 'text-success' : 'text-error'">
                  {{ (reportCashier?.H_rounding ?? 0) >= 0 ? '+' : '' }}{{ formatCurrency(reportCashier?.H_rounding ?? 0) }}
                </td>
              </tr>
              <!-- Balance check: Revenue + Rounding = Cash + Non-Cash -->
              <tr v-if="cashSummary" class="bg-success/5">
                <td class="pl-4 text-xs text-base-content/60">
                  <IconCircleCheck class="w-3 h-3 inline text-success mr-1" />
                  Revenue + Rounding = Cash + Non-Cash
                </td>
                <td class="text-right font-medium">
                  {{ formatCurrency((cashSummary.cashSalesResto ?? 0) + (cashSummary.cashSalesGym ?? 0) + (cashSummary.totalNonCash ?? 0)) }}
                </td>
              </tr>
              <tr class="hover">
                <td class="text-error">Total Pengeluaran Cash</td>
                <td class="text-right font-medium text-error">
                  {{ formatCurrency(summary.totalExpenses ?? 0) }}
                </td>
              </tr>
              <tr class="bg-primary/5 font-bold">
                <td>Total Penghasilan Hari Ini</td>
                <td class="text-right text-primary">
                  {{
                    formatCurrency(
                      (reportCashier?.J_grandTotal ?? 0) +
                        (reportGym?.grandTotal ?? 0) -
                        (summary.totalExpenses ?? 0)
                    )
                  }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ── Shift Selisih Alert ── -->
      <div
        v-if="(summary.totalDifference ?? 0) < 0"
        class="alert alert-error shadow-sm"
      >
        <IconAlertTriangle class="w-5 h-5 shrink-0" />
        <span
          >Terdapat selisih kas sebesar
          <strong>{{ formatCurrency(summary.totalDifference) }}</strong> pada
          hari ini. Silakan periksa di halaman
          <em>Settings → System &amp; Audit Log</em> untuk diagnosa.</span
        >
      </div>
      <div
        v-else-if="
          (summary.closedShifts ?? 0) > 0 &&
          (summary.totalDifference ?? 0) === 0
        "
        class="alert alert-success shadow-sm"
      >
        <IconCircleCheck class="w-5 h-5 shrink-0" />
        <span>Semua shift seimbang. Tidak ada selisih kas.</span>
      </div>
    </template>

    <!-- Empty state -->
    <div v-else-if="!loading" class="text-center py-24 text-base-content/40">
      <IconCalendarStats class="w-16 h-16 mx-auto mb-3 opacity-30" />
      <p class="text-lg font-medium">Tidak ada data</p>
      <p class="text-sm mt-1">Belum ada shift pada tanggal yang dipilih</p>
    </div>
  </div>
</template>
