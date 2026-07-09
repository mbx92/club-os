<route lang="yaml">
meta:
  title: Shift Report
  layout: default
</route>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useCashRegister } from "@/composables/gym/cash-register";
import { useCurrency } from "@/composables/core/useCurrency";
import dayjs from "dayjs";
import {
  IconArrowLeft,
  IconFileReport,
  IconPrinter,
  IconRefresh,
  IconBuildingStore,
  IconBarbell,
  IconReceipt,
  IconCurrencyDollar,
  IconChartBar,
  IconTag,
} from "@tabler/icons-vue";

const route = useRoute();
const router = useRouter();
const { shiftReport, loading, getShiftReport, printShiftReport } =
  useCashRegister();
const { formatCurrency } = useCurrency();

const sessionId = computed(() => route.params.id);
const printing = ref(false);

const session = computed(() => shiftReport.value?.session);
const reportCashier = computed(() => shiftReport.value?.reportCashier);
const reportGym = computed(() => shiftReport.value?.reportGym);
const expenseDetail = computed(() => shiftReport.value?.expenseDetail || []);
const cashSummary = computed(() => shiftReport.value?.cashSummary || null);
const voucherSummary = computed(() => shiftReport.value?.reportGym?.voucherSummary || null);

const formatTime = (dt) => (dt ? dayjs(dt).format("HH:mm") : "-");

const paymentLabels = {
  cash: "Tunai",
  credit_card: "Kartu",
  debit_card: "Kartu Debit",
  bank_transfer: "Transfer Bank",
  qris: "QRIS",
  e_wallet: "E-Wallet",
  compliment: "Gratis (Compliment)",
  // legacy / bank-specific
  card: "Kartu",
  ewallet: "E-Wallet",
  transfer: "Transfer Bank",
  bni: "BNI",
  bca: "BCA",
  mandiri: "Mandiri",
  gojek: "Gojek",
};

// Keys yang termasuk pembayaran kartu
const cardKeys = new Set([
  "credit_card",
  "debit_card",
  "card",
  "bni",
  "bca",
  "mandiri",
]);

const isCardPayment = (key) => cardKeys.has(key);

const nonCashPayments = computed(() => {
  if (!reportCashier.value?.paymentMethods) return [];
  return Object.entries(reportCashier.value.paymentMethods)
    .filter(([k]) => k !== "cash")
    .map(([k, v]) => ({
      key: k,
      label: paymentLabels[k] || k.toUpperCase(),
      isCard: isCardPayment(k),
      ...v,
    }));
});

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

const load = async () => {
  try {
    await getShiftReport(sessionId.value);
  } catch {
    /* handled by composable */
  }
};

const handlePrint = async () => {
  printing.value = true;
  try {
    await printShiftReport(sessionId.value);
  } catch {
    /* */
  } finally {
    printing.value = false;
  }
};

onMounted(load);
</script>

<template>
  <div class="container mx-auto px-4 py-8 max-w-4xl">
    <!-- Header -->
    <div
      class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6"
    >
      <div>
        <h1 class="text-2xl font-bold flex items-center gap-2">
          <IconFileReport class="w-7 h-7 text-primary" />
          Shift Report
        </h1>
        <p v-if="session" class="text-sm text-base-content/60 mt-1 capitalize">
          {{ session.shiftName }} &middot;
          {{
            dayjs(session.shiftDate || session.openedAt).format("DD MMMM YYYY")
          }}
        </p>
      </div>
      <div class="flex gap-2 flex-wrap">
        <button
          class="btn btn-ghost btn-sm"
          :disabled="loading"
          @click="load"
          title="Refresh"
        >
          <IconRefresh class="w-4 h-4" />
        </button>
        <button
          class="btn btn-outline btn-sm gap-1"
          :disabled="printing || loading"
          @click="handlePrint"
        >
          <span
            v-if="printing"
            class="loading loading-spinner loading-xs"
          ></span>
          <IconPrinter v-else class="w-4 h-4" />
          Cetak
        </button>
        <button class="btn btn-ghost btn-sm gap-1" @click="router.back()">
          <IconArrowLeft class="w-4 h-4" />
          Kembali
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-20">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <template v-else-if="shiftReport">
      <!-- Session Info Banner -->
      <div class="card bg-base-100 border border-base-200 shadow-sm mb-6">
        <div class="card-body py-3 px-5">
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 text-sm">
            <div>
              <div class="text-xs text-base-content/50 mb-0.5">Shift</div>
              <div class="font-semibold capitalize">
                {{ session?.shiftName }}
              </div>
            </div>
            <div>
              <div class="text-xs text-base-content/50 mb-0.5">Tanggal</div>
              <div class="font-semibold">
                {{
                  dayjs(session?.shiftDate || session?.openedAt).format(
                    "DD/MM/YYYY",
                  )
                }}
              </div>
            </div>
            <div>
              <div class="text-xs text-base-content/50 mb-0.5">Kasir Buka</div>
              <div class="font-medium">{{ session?.openedBy || "-" }}</div>
            </div>
            <div>
              <div class="text-xs text-base-content/50 mb-0.5">Kasir Tutup</div>
              <div class="font-medium">{{ session?.closedBy || "-" }}</div>
            </div>
            <div>
              <div class="text-xs text-base-content/50 mb-0.5">Buka</div>
              <div class="font-medium">{{ formatTime(session?.openedAt) }}</div>
            </div>
            <div>
              <div class="text-xs text-base-content/50 mb-0.5">Tutup</div>
              <div class="font-medium">{{ formatTime(session?.closedAt) }}</div>
            </div>
            <div>
              <div class="text-xs text-base-content/50 mb-0.5">Status</div>
              <span
                class="badge badge-sm"
                :class="
                  session?.status === 'open' ? 'badge-success' : 'badge-ghost'
                "
              >
                {{ session?.status }}
              </span>
            </div>
            <div>
              <div class="text-xs text-base-content/50 mb-0.5">Modal Awal</div>
              <div class="font-bold text-primary">
                {{ formatCurrency(session?.openingBalance || 0) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Two-column: Report Cashier + Report Gym -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <!--  REPORT CASHIER  -->
        <div
          v-if="reportCashier"
          class="card bg-base-100 border border-base-200 shadow-sm"
        >
          <div class="card-body p-0">
            <div
              class="bg-primary/10 px-5 py-3 rounded-t-2xl flex items-center gap-2"
            >
              <IconBuildingStore class="w-5 h-5 text-primary" />
              <h2 class="font-bold text-base tracking-wide">REPORT RESTO</h2>
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
                  <td>Diskon</td>
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
                <tr class="bg-success/5" v-if="reportCashier.Q_totalCash">
                  <td>Tunai</td>
                  <td class="text-right text-success">
                    {{ formatCurrency(reportCashier.Q_totalCash) }}
                  </td>
                </tr>
                <!-- COMPLEMENT -->
                <tr class="hover">
                  <td>Gratis (Compliment)</td>
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
              <span>{{ reportCashier.pax }} pax</span>
            </div>
          </div>
        </div>

        <!--  REPORT GYM  -->
        <div
          v-if="reportGym"
          class="card bg-base-100 border border-base-200 shadow-sm"
        >
          <div class="card-body p-0">
            <div
              class="bg-secondary/10 px-5 py-3 rounded-t-2xl flex items-center gap-2"
            >
              <IconBarbell class="w-5 h-5 text-secondary" />
              <h2 class="font-bold text-base tracking-wide">REPORT GYM</h2>
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
                      <span v-else>-</span>
                    </td>
                    <td class="text-right">
                      <span v-if="reportGym.memberships?.[key]?.count > 0">{{
                        formatCurrency(reportGym.memberships[key].amount)
                      }}</span>
                      <span v-else>-</span>
                    </td>
                  </tr>
                  <!-- Plan detail sub-rows -->
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
                      <span v-else>-</span>
                    </td>
                    <td class="text-right">
                      <span v-if="pkg.count > 0">{{
                        formatCurrency(pkg.amount)
                      }}</span>
                      <span v-else>-</span>
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

      <!-- Total Penjualan -->
      <div
        v-if="cashSummary"
        class="card bg-base-100 border border-base-200 shadow-sm mb-4"
      >
        <div class="card-body p-0">
          <div
            class="px-5 py-3 border-b border-base-200 flex items-center gap-2"
          >
            <IconCurrencyDollar class="w-5 h-5 text-success" />
            <h2 class="font-bold text-base">Total Penjualan</h2>
          </div>
          <table class="table table-sm text-sm">
            <tbody>
              <tr class="hover">
                <td>Cash Penjualan Resto</td>
                <td class="text-right font-medium">
                  {{ formatCurrency(cashSummary.cashSalesResto ?? 0) }}
                </td>
              </tr>
              <tr class="hover">
                <td>Cash Penjualan Gym</td>
                <td class="text-right font-medium">
                  {{ formatCurrency(cashSummary.cashSalesGym ?? 0) }}
                </td>
              </tr>
              <tr v-if="(reportCashier?.R_complimentTotal ?? 0) > 0" class="hover">
                <td class="text-warning">Compliment</td>
                <td class="text-right font-medium text-warning">
                  {{ formatCurrency(reportCashier.R_complimentTotal) }}
                </td>
              </tr>
              <tr class="bg-success/5 font-bold">
                <td>Grand Total Cash</td>
                <td class="text-right text-success">
                  {{ formatCurrency(cashSummary.grandTotalCash ?? 0) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Diskon & Voucher -->
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

      <!-- Expense Detail -->
      <div
        v-if="expenseDetail.length > 0"
        class="card bg-base-100 border border-base-200 shadow-sm mb-4"
      >
        <div class="card-body p-0">
          <div
            class="px-5 py-3 border-b border-base-200 flex items-center gap-2"
          >
            <IconReceipt class="w-5 h-5 text-error" />
            <h2 class="font-bold text-base">Detail Pengeluaran</h2>
            <span class="badge badge-sm badge-ghost ml-auto"
              >{{ expenseDetail.length }} item</span
            >
          </div>
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
                  {{ e.category || "-" }}
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
                  {{ formatCurrency(shiftReport.totalExpenses || expenseDetail.reduce((s, e) => s + (e.amount || 0), 0)) }}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- Rekap Penjualan -->
      <div class="card bg-base-100 border border-base-200 shadow-sm mb-4">
        <div class="card-body p-0">
          <div
            class="px-5 py-3 border-b border-base-200 flex items-center gap-2"
          >
            <IconChartBar class="w-5 h-5 text-primary" />
            <h2 class="font-bold text-base">Rekap Penjualan</h2>
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
              <tr class="hover">
                <td class="text-error">Total Pengeluaran Cash</td>
                <td class="text-right font-medium text-error">
                  {{ formatCurrency(expenseDetail.filter(e => e.paymentMethod === 'cash').reduce((s, e) => s + (e.amount || 0), 0)) }}
                </td>
              </tr>
              <tr class="bg-primary/5 font-bold">
                <td>Total Penghasilan Shift</td>
                <td class="text-right text-primary">
                  {{
                    formatCurrency(
                      (reportCashier?.J_grandTotal ?? 0) +
                        (reportGym?.grandTotal ?? 0) -
                        expenseDetail.filter(e => e.paymentMethod === 'cash').reduce((s, e) => s + (e.amount || 0), 0)
                    )
                  }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Cash Reconciliation -->
      <div
        v-if="session?.actualCash != null"
        class="card bg-base-100 border border-base-200 shadow-sm"
      >
        <div class="card-body py-4 px-5">
          <h2 class="font-bold text-base flex items-center gap-2 mb-4">
            <IconCurrencyDollar class="w-5 h-5 text-success" />
            Rekonsiliasi Kas
          </h2>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div class="bg-base-200 rounded-lg p-3">
              <div class="text-xs text-base-content/50 mb-1">Modal Awal</div>
              <div class="font-bold">
                {{ formatCurrency(session.openingBalance) }}
              </div>
            </div>
            <div class="bg-base-200 rounded-lg p-3">
              <div class="text-xs text-base-content/50 mb-1">Kas Aktual</div>
              <div class="font-bold">
                {{ formatCurrency(session.actualCash) }}
              </div>
            </div>
            <div
              class="rounded-lg p-3"
              :class="
                (session.difference ?? 0) === 0
                  ? 'bg-success/10'
                  : (session.difference ?? 0) > 0
                    ? 'bg-info/10'
                    : 'bg-error/10'
              "
            >
              <div class="text-xs text-base-content/50 mb-1">Selisih</div>
              <div
                class="font-bold"
                :class="
                  (session.difference ?? 0) === 0
                    ? 'text-success'
                    : (session.difference ?? 0) > 0
                      ? 'text-info'
                      : 'text-error'
                "
              >
                {{ (session.difference ?? 0) >= 0 ? "+" : ""
                }}{{ formatCurrency(session.difference ?? 0) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Empty state -->
    <div v-else-if="!loading" class="text-center py-20 text-base-content/40">
      <IconFileReport class="w-16 h-16 mx-auto mb-3 opacity-30" />
      <p>Laporan tidak ditemukan</p>
    </div>
  </div>
</template>
