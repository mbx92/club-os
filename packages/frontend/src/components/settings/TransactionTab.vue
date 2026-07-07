<template>
  <div class="card bg-base-100 shadow-xl">
    <div class="card-body">
      <h2 class="card-title mb-2">
        <IconCreditCard class="w-6 h-6" />
        Transaction Settings
      </h2>

      <div v-if="loading" class="flex justify-center py-8">
        <span class="loading loading-spinner loading-lg"></span>
      </div>

      <form v-else @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Tax Section -->
        <div class="space-y-4">
          <h3 class="text-lg font-semibold border-b pb-2">Tax Settings</h3>

          <div class="form-control">
            <label class="label">
              <span class="label-text font-semibold">Enable Tax</span>
            </label>
            <label class="cursor-pointer flex items-center gap-3">
              <input
                type="checkbox"
                v-model="form.transaction.taxEnable"
                class="toggle toggle-primary"
              />
              <span class="label-text">Tax enabled for transactions</span>
            </label>
          </div>

          <div v-if="form.transaction.taxEnable" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="form-control">
              <label class="label">
                <span class="label-text font-semibold">Tax Percentage</span>
              </label>
              <input
                v-model.number="form.transaction.taxPercentage"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="11.0"
                class="input input-bordered w-full"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-semibold">Tax Type</span>
              </label>
              <select
                v-model="form.transaction.taxType"
                class="select select-bordered w-full"
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Service Charge Section -->
        <div class="space-y-4">
          <h3 class="text-lg font-semibold border-b pb-2">Service Charge Settings</h3>
          
          <div class="alert alert-info">
            <IconInfoCircle class="w-5 h-5" />
            <span>Service charge applies only to restaurant orders (dine-in, takeaway, delivery)</span>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text font-semibold">Enable Service Charge</span>
            </label>
            <label class="cursor-pointer flex items-center gap-3">
              <input
                type="checkbox"
                v-model="form.transaction.serviceChargeEnable"
                class="toggle toggle-primary"
              />
              <span class="label-text">Service charge enabled for restaurant orders</span>
            </label>
          </div>

          <div v-if="form.transaction.serviceChargeEnable" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="form-control">
              <label class="label">
                <span class="label-text font-semibold">Service Charge Rate</span>
              </label>
              <input
                v-model.number="form.transaction.serviceChargePercentage"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="5.0"
                class="input input-bordered w-full"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-semibold">Service Charge Type</span>
              </label>
              <select
                v-model="form.transaction.serviceChargeType"
                class="select select-bordered w-full"
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Rounding Section -->
        <div class="space-y-4">
          <h3 class="text-lg font-semibold border-b pb-2">Rounding Settings</h3>

          <div class="form-control">
            <label class="label">
              <span class="label-text font-semibold">Aktifkan Pembulatan</span>
            </label>
            <label class="cursor-pointer flex items-center gap-3">
              <input
                type="checkbox"
                v-model="form.transaction.rounding.roundingEnable"
                class="toggle toggle-primary"
              />
              <span class="label-text">Bulatkan total transaksi ke kelipatan terdekat</span>
            </label>
          </div>

          <div v-if="form.transaction.rounding.roundingEnable" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="form-control">
              <label class="label">
                <span class="label-text font-semibold">Metode Pembulatan</span>
              </label>
              <select
                v-model="form.transaction.rounding.roundingMethod"
                class="select select-bordered w-full"
              >
                <option value="nearest">Terdekat</option>
                <option value="up">Ke atas</option>
                <option value="down">Ke bawah</option>
              </select>
              <label class="label">
                <span class="label-text-alt">Terdekat: 54.625 → 54.500 atau 55.000 | Ke atas: 54.625 → 55.000 | Ke bawah: 54.625 → 54.500</span>
              </label>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-semibold">Kelipatan Pembulatan</span>
              </label>
              <select
                v-model.number="form.transaction.rounding.roundingValue"
                class="select select-bordered w-full"
              >
                <option :value="10">10</option>
                <option :value="25">25</option>
                <option :value="50">50</option>
                <option :value="100">100</option>
                <option :value="500">500</option>
                <option :value="1000">1.000</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Currency Section -->
        <div class="space-y-4">
          <h3 class="text-lg font-semibold border-b pb-2">Currency Settings</h3>

          <div class="form-control">
            <label class="label">
              <span class="label-text font-semibold">Default Currency</span>
              <span class="label-text-alt text-error">*</span>
            </label>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="form-control">
              <label class="label">
                <span class="label-text font-semibold">Currency Settings</span>
              </label>
              <select
                v-model="form.transaction.currency.defaultCurrency"
                class="select select-bordered w-full"
                required
              >
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="IDR">IDR - Indonesian Rupiah</option>
                <option value="SGD">SGD - Singapore Dollar</option>
                <option value="MYR">MYR - Malaysian Ringgit</option>
                <option value="THB">THB - Thai Baht</option>
                <option value="AUD">AUD - Australian Dollar</option>
                <option value="CAD">CAD - Canadian Dollar</option>
                <option value="JPY">JPY - Japanese Yen</option>
              </select>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-semibold">Currency Symbol</span>
              </label>
              <input
                v-model="form.transaction.currency.currencySymbol"
                type="text"
                placeholder="Rp"
                class="input input-bordered w-full"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-semibold">Decimal Separator</span>
              </label>
              <input
                v-model="form.transaction.currency.decimalSeparator"
                type="text"
                maxlength="1"
                placeholder=","
                class="input input-bordered w-full"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-semibold">Thousand Separator</span>
              </label>
              <input
                v-model="form.transaction.currency.thousandSeparator"
                type="text"
                maxlength="1"
                placeholder="."
                class="input input-bordered w-full"
              />
            </div>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text font-semibold">Use Decimals</span>
            </label>
            <label class="cursor-pointer flex items-center gap-3">
              <input
                type="checkbox"
                v-model="form.transaction.currency.useDecimals"
                class="toggle toggle-primary"
              />
              <span class="label-text">Display decimals in prices</span>
            </label>
          </div>
        </div>

        <!-- Discount Section -->
        <div class="space-y-4">
          <h3 class="text-lg font-semibold border-b pb-2">
            Discount & Coupon Settings
          </h3>

          <div class="form-control">
            <label class="label">
              <span class="label-text font-semibold"
                >Allow Multiple Discounts</span
              >
            </label>
            <label class="cursor-pointer flex items-center gap-3">
              <input
                type="checkbox"
                v-model="form.transaction.discount.allowMultipleDiscounts"
                class="toggle toggle-primary"
              />
              <span class="label-text">Allow stacking multiple discounts</span>
            </label>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text font-semibold"
                >Discount Calculation Order</span
              >
            </label>
            <select
              v-model="discountOrderOption"
              class="select select-bordered w-full"
            >
              <option value="PERCENTAGE_FIRST">PERCENTAGE_FIRST</option>
              <option value="FIXED_AMOUNT_FIRST">FIXED_AMOUNT_FIRST</option>
              <option value="PERCENTAGE_FIRST,FIXED_AMOUNT_SECOND">
                PERCENTAGE_FIRST,FIXED_AMOUNT_SECOND
              </option>
            </select>
            <label class="label">
              <span class="label-text-alt"
                >Choose calculation order for multiple discounts</span
              >
            </label>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text font-semibold"
                >Coupon Expiration Grace Period</span
              >
            </label>
            <input
              v-model.number="
                form.transaction.discount.couponExpirationGracePeriod
              "
              type="number"
              min="0"
              placeholder="0"
              class="input input-bordered w-full"
            />
            <label class="label">
              <span class="label-text-alt"
                >Additional days after coupon expiration that it can still be
                used</span
              >
            </label>
          </div>
        </div>

        <!-- Invoice Section -->
        <div class="space-y-4">
          <h3 class="text-lg font-semibold border-b pb-2">Invoice Settings</h3>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="form-control">
              <label class="label">
                <span class="label-text font-semibold">Transaction Prefix</span>
              </label>
              <input
                v-model="form.transaction.invoice.transactionPrefix"
                type="text"
                placeholder="TRX"
                class="input input-bordered w-full"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-semibold">Order Prefix</span>
              </label>
              <input
                v-model="form.transaction.invoice.orderPrefix"
                type="text"
                placeholder="ORD"
                class="input input-bordered w-full"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-semibold">Quote Prefix</span>
              </label>
              <input
                v-model="form.transaction.invoice.quotePrefix"
                type="text"
                placeholder="QUO"
                class="input input-bordered w-full"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-semibold">Invoice Prefix</span>
              </label>
              <input
                v-model="form.transaction.invoice.invoicePrefix"
                type="text"
                placeholder="INV"
                class="input input-bordered w-full"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-semibold"
                  >Starting Invoice Number</span
                >
              </label>
              <input
                v-model.number="form.transaction.invoice.startingInvoiceNumber"
                type="number"
                min="1"
                placeholder="1000"
                class="input input-bordered w-full"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-semibold">Numbering Format</span>
              </label>
              <select
                v-model="form.transaction.invoice.numberingFormat"
                class="select select-bordered w-full"
              >
                <option value="PREFIX-DATE-NUMBER">PREFIX-DATE-NUMBER</option>
                <option value="PREFIX-NUMBER">PREFIX-NUMBER</option>
                <option value="DATE-NUMBER">DATE-NUMBER</option>
                <option value="NUMBER">NUMBER</option>
              </select>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-semibold">Date Format</span>
              </label>
              <select
                v-model="form.transaction.invoice.dateFormat"
                class="select select-bordered w-full"
              >
                <option value="YYYYMM">YYYYMM</option>
                <option value="YYYYMMDD">YYYYMMDD</option>
                <option value="YYMMDD">YYMMDD</option>
                <option value="YYMM">YYMM</option>
              </select>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-semibold">Prefix Separator</span>
              </label>
              <input
                v-model="form.transaction.invoice.prefixSeparator"
                type="text"
                maxlength="3"
                placeholder="-"
                class="input input-bordered w-full"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-semibold">Number Pad Length</span>
              </label>
              <input
                v-model.number="form.transaction.invoice.numberPadLength"
                type="number"
                min="1"
                max="10"
                placeholder="4"
                class="input input-bordered w-full"
              />
              <label class="label">
                <span class="label-text-alt"
                  >Zero-padding length for invoice numbers (e.g., 4 = 0001)</span
                >
              </label>
            </div>
          </div>
                    <!-- Invoice Preview -->
          <div class="alert alert-info">
            <div class="w-full">
              <div class="flex items-center gap-2 mb-2">
                <IconEye class="w-5 h-5" />
                <span class="font-semibold">Invoice Number Preview</span>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                <div>
                  <span class="font-medium">Transaction:</span>
                  <div class="font-mono rounded mt-1">
                    {{ previewInvoiceNumber('transaction') }}
                  </div>
                </div>
                <div>
                  <span class="font-medium">Order:</span>
                  <div class="font-mono rounded mt-1">
                    {{ previewInvoiceNumber('order') }}
                  </div>
                </div>
                <div>
                  <span class="font-medium">Quote:</span>
                  <div class="font-mono rounded mt-1">
                    {{ previewInvoiceNumber('quote') }}
                  </div>
                </div>
                <div>
                  <span class="font-medium">Invoice:</span>
                  <div class="font-mono rounded mt-1">
                    {{ previewInvoiceNumber('invoice') }}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="form-control">
            <label class="label">
              <span class="label-text font-semibold"
                >Enable Email Notifications</span
              >
            </label>
            <label class="cursor-pointer flex items-center gap-3">
              <input
                type="checkbox"
                v-model="form.transaction.invoice.enableEmailNotifications"
                class="toggle toggle-primary"
              />
              <span class="label-text"
                >Send email notifications for invoices</span
              >
            </label>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text font-semibold">From Email Address</span>
            </label>
            <input
              v-model="form.transaction.invoice.fromEmailAddress"
              type="email"
              placeholder="noreply@example.com"
              class="input input-bordered w-full"
            />
            <label class="label">
              <span class="label-text-alt"
                >Email address used as sender for invoice notifications</span
              >
            </label>
          </div>


        </div>

        <!-- Shipping Section -->
        <div class="space-y-4">
          <h3 class="text-lg font-semibold border-b pb-2">Shipping Settings</h3>

          <div class="form-control">
            <label class="label">
              <span class="label-text font-semibold"
                >Shipping Calculation Type</span
              >
            </label>
            <select
              v-model="form.transaction.shipping.shippingCalculationType"
              class="select select-bordered w-full"
            >
              <option value="FLAT_RATE">Flat Rate</option>
              <option value="PER_ITEM">Per Item</option>
              <option value="TIERED_WEIGHT">Tiered by Weight</option>
            </select>
            <label class="label">
              <span class="label-text-alt"
                >Method used to calculate shipping costs</span
              >
            </label>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text font-semibold"
                >Require Shipping Address</span
              >
            </label>
            <label class="cursor-pointer flex items-center gap-3">
              <input
                type="checkbox"
                v-model="form.transaction.shipping.requireShippingAddress"
                class="toggle toggle-primary"
              />
              <span class="label-text"
                >Require shipping address for orders</span
              >
            </label>
          </div>
        </div>

        <!-- Payment Methods Section -->
        <div class="space-y-4">
          <h3 class="text-lg font-semibold border-b pb-2">Payment Methods</h3>

          <div class="alert alert-info">
            <IconInfoCircle class="w-5 h-5" />
            <span>Atur metode pembayaran yang tersedia di POS, billing, dan transaksi. Nonaktifkan metode yang tidak dipakai.</span>
          </div>

          <div class="overflow-x-auto rounded-box border border-base-300">
            <table class="table table-sm">
              <thead>
                <tr>
                  <th>Aktif</th>
                  <th>Key</th>
                  <th>Label</th>
                  <th>Perlu Bank</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(method, index) in form.transaction.payment.paymentMethods"
                  :key="method.key"
                >
                  <td>
                    <input
                      v-model="method.enabled"
                      type="checkbox"
                      class="checkbox checkbox-primary checkbox-sm"
                    />
                  </td>
                  <td class="font-mono text-xs">{{ method.key }}</td>
                  <td>
                    <input
                      v-model="method.label"
                      type="text"
                      class="input input-bordered input-sm w-full max-w-xs"
                    />
                  </td>
                  <td>
                    <input
                      v-model="method.requiresBank"
                      type="checkbox"
                      class="checkbox checkbox-sm"
                    />
                  </td>
                  <td>
                    <button
                      v-if="!method.isSystem"
                      type="button"
                      class="btn btn-ghost btn-xs text-error"
                      @click="removePaymentMethod(index)"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="grid grid-cols-1 gap-3 rounded-box border border-base-300 bg-base-200/40 p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <div class="form-control">
              <label class="label py-0">
                <span class="label-text text-xs font-semibold">Key (snake_case)</span>
              </label>
              <input
                v-model="newPaymentMethod.key"
                type="text"
                placeholder="shopeepay"
                class="input input-bordered input-sm"
              />
            </div>
            <div class="form-control">
              <label class="label py-0">
                <span class="label-text text-xs font-semibold">Label</span>
              </label>
              <input
                v-model="newPaymentMethod.label"
                type="text"
                placeholder="ShopeePay"
                class="input input-bordered input-sm"
              />
            </div>
            <button type="button" class="btn btn-sm btn-outline" @click="addPaymentMethod">
              Tambah Metode
            </button>
          </div>
        </div>

        <!-- Actions -->
        <div class="card-actions justify-end pt-4">
          <button
            type="button"
            class="btn btn-ghost"
            :disabled="saving"
            @click="resetForm"
          >
            Reset
          </button>
          <button
            type="submit"
            class="btn btn-primary"
            :class="{ loading: saving }"
            :disabled="saving || !hasChanges"
          >
            <IconDeviceFloppy v-if="!saving" class="w-5 h-5" />
            {{ saving ? "Saving..." : "Save Changes" }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useApi } from "@/composables/core/useApi";
import { useNotification } from "@/composables/core/useNotification";
import { useTenantSettings } from "@/composables/admin/useTenantSettings";
import { buildDefaultPaymentMethods } from "@/utils/paymentMethods";
import { IconCreditCard, IconDeviceFloppy, IconEye, IconInfoCircle } from "@tabler/icons-vue";

const api = useApi();
const { showSuccess, handleError } = useNotification();
const { tenantSettings, fetchTenantSettings, patchTenantSettings } = useTenantSettings();

const loading = ref(false);
const saving = ref(false);

const defaultForm = () => ({
  transaction: {
    taxEnable: false,
    taxPercentage: 0.0,
    taxType: "percentage",
    serviceChargeEnable: false,
    serviceChargePercentage: 0.0,
    serviceChargeType: "percentage",
    currency: {
      defaultCurrency: "IDR",
      currencySymbol: "Rp",
      decimalSeparator: ",",
      thousandSeparator: ".",
      useDecimals: true,
    },
    discount: {
      allowMultipleDiscounts: false,
      discountCalculationOrder: ["PERCENTAGE_FIRST", "FIXED_AMOUNT_SECOND"],
      couponExpirationGracePeriod: 0,
    },
    payment: {
      enabledGateways: [],
      paymentTimeout: 60,
      paymentMethods: buildDefaultPaymentMethods(),
      midtransConfig: {
        apiKey: "",
        clientKey: "",
        sandbox: true,
        webhookUrl: "",
      },
      stripeConfig: {
        apiKey: "",
        clientKey: "",
        sandbox: true,
        webhookUrl: "",
      },
    },
    invoice: {
      transactionPrefix: "TRX",
      orderPrefix: "ORD",
      quotePrefix: "QUO",
      invoicePrefix: "INV",
      startingInvoiceNumber: 1000,
      numberingFormat: "PREFIX-DATE-NUMBER",
      dateFormat: "YYYYMM",
      prefixSeparator: "-",
      numberPadLength: 4,
      enableEmailNotifications: false,
      fromEmailAddress: "",
    },
    rounding: {
      roundingEnable: false,
      roundingMethod: 'up',
      roundingValue: 100,
    },
    shipping: {
      shippingCalculationType: "FLAT_RATE",
      requireShippingAddress: false,
    },
  },
});

const form = ref(defaultForm());
const original = ref(null);
const newPaymentMethod = ref({ key: "", label: "" });

const mergePaymentMethods = (paymentConfig = {}) => {
  const defaults = buildDefaultPaymentMethods();
  const stored = paymentConfig.paymentMethods;

  if (!Array.isArray(stored) || stored.length === 0) {
    return defaults;
  }

  const storedKeys = new Set(stored.map((method) => method.key));
  const merged = stored.map((method) => ({ ...method }));

  for (const fallback of defaults) {
    if (!storedKeys.has(fallback.key)) {
      merged.push({ ...fallback, enabled: false });
    }
  }

  return merged;
};

const mergeTransactionSettings = (apiTx = {}) => {
  const defaultTx = defaultForm().transaction;

  return {
    ...defaultTx,
    ...apiTx,
    currency: { ...defaultTx.currency, ...apiTx.currency },
    discount: { ...defaultTx.discount, ...apiTx.discount },
    payment: {
      ...defaultTx.payment,
      ...apiTx.payment,
      paymentMethods: mergePaymentMethods(apiTx.payment),
      midtransConfig: { ...defaultTx.payment.midtransConfig, ...apiTx.payment?.midtransConfig },
      stripeConfig: { ...defaultTx.payment.stripeConfig, ...apiTx.payment?.stripeConfig },
    },
    invoice: { ...defaultTx.invoice, ...apiTx.invoice },
    rounding: { ...defaultTx.rounding, ...apiTx.rounding },
    shipping: { ...defaultTx.shipping, ...apiTx.shipping },
  };
};

const addPaymentMethod = () => {
  const key = newPaymentMethod.value.key.trim().toLowerCase().replace(/\s+/g, "_");
  const label = newPaymentMethod.value.label.trim();

  if (!key || !/^[a-z][a-z0-9_]*$/.test(key)) {
    handleError(new Error("Key harus snake_case, contoh: shopeepay"), "Key tidak valid");
    return;
  }

  if (!label) {
    handleError(new Error("Label wajib diisi"), "Label tidak valid");
    return;
  }

  const exists = form.value.transaction.payment.paymentMethods.some((method) => method.key === key);
  if (exists) {
    handleError(new Error(`Metode "${key}" sudah ada`), "Metode duplikat");
    return;
  }

  form.value.transaction.payment.paymentMethods.push({
    key,
    label,
    enabled: true,
    requiresBank: false,
    isSystem: false,
  });

  newPaymentMethod.value = { key: "", label: "" };
};

const removePaymentMethod = (index) => {
  form.value.transaction.payment.paymentMethods.splice(index, 1);
};

const discountOrderOption = ref("PERCENTAGE_FIRST,FIXED_AMOUNT_SECOND");

const hasChanges = computed(() => {
  if (!original.value) return false;
  return JSON.stringify(form.value) !== JSON.stringify(original.value);
});

onMounted(async () => {
  await loadSettings();
});

watch(
  tenantSettings,
  (newVal) => {
    if (newVal) populateForm(newVal);
  },
  { deep: true }
);

const loadSettings = async () => {
  loading.value = true;
  try {
    // Ensure tenant settings are fetched
    await fetchTenantSettings();
    if (
      tenantSettings.value &&
      tenantSettings.value.settings &&
      tenantSettings.value.settings.transaction
    ) {
      const defaultTx = defaultForm().transaction;
      const apiTx = tenantSettings.value.settings.transaction;
      
      form.value = {
        transaction: mergeTransactionSettings(apiTx),
      };
      
      // Sync discount order
      if (form.value.transaction.discount?.discountCalculationOrder) {
        discountOrderOption.value = form.value.transaction.discount.discountCalculationOrder.join(",");
      }
    }
    original.value = JSON.parse(JSON.stringify(form.value));
  } catch (err) {
    // handled in composable
  } finally {
    loading.value = false;
  }
};

const populateForm = (data) => {
  if (data.settings && data.settings.transaction) {
    const defaultTx = defaultForm().transaction;
    const apiTx = data.settings.transaction;
    
    form.value = {
      transaction: mergeTransactionSettings(apiTx),
    };
  } else {
    form.value = defaultForm();
  }
  original.value = JSON.parse(JSON.stringify(form.value));
  // sync discount order into select
  discountOrderOption.value = (
    form.value.transaction.discount?.discountCalculationOrder || []
  ).join(",");
};

const resetForm = () => {
  form.value = JSON.parse(JSON.stringify(original.value));
  discountOrderOption.value = (
    form.value.transaction.discount?.discountCalculationOrder || []
  ).join(",");
};

const handleSubmit = async () => {
  // Sync discount order option back into array
  form.value.transaction.discount.discountCalculationOrder =
    discountOrderOption.value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  saving.value = true;
  try {
    const payload = { transaction: form.value.transaction };
    await patchTenantSettings(payload, "Transaction settings updated successfully");
    original.value = JSON.parse(JSON.stringify(form.value));
    await fetchTenantSettings();
  } catch (err) {
    handleError(err, "Failed to update transaction settings");
  } finally {
    saving.value = false;
  }
};

const previewInvoiceNumber = (type) => {
  const invoice = form.value.transaction.invoice;
  let prefix = '';
  
  switch(type) {
    case 'transaction':
      prefix = invoice.transactionPrefix || 'TRX';
      break;
    case 'order':
      prefix = invoice.orderPrefix || 'ORD';
      break;
    case 'quote':
      prefix = invoice.quotePrefix || 'QUO';
      break;
    case 'invoice':
      prefix = invoice.invoicePrefix || 'INV';
      break;
  }

  const format = invoice.numberingFormat || 'PREFIX-DATE-NUMBER';
  const separator = invoice.prefixSeparator || '-';
  const padLength = invoice.numberPadLength || 4;
  const startNumber = invoice.startingInvoiceNumber || 1000;
  
  // Generate date part based on dateFormat
  const now = new Date();
  let datePart = '';
  switch(invoice.dateFormat) {
    case 'YYYYMMDD':
      datePart = now.getFullYear() + 
                 String(now.getMonth() + 1).padStart(2, '0') + 
                 String(now.getDate()).padStart(2, '0');
      break;
    case 'YYMMDD':
      datePart = String(now.getFullYear()).slice(-2) + 
                 String(now.getMonth() + 1).padStart(2, '0') + 
                 String(now.getDate()).padStart(2, '0');
      break;
    case 'YYMM':
      datePart = String(now.getFullYear()).slice(-2) + 
                 String(now.getMonth() + 1).padStart(2, '0');
      break;
    case 'YYYYMM':
    default:
      datePart = now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0');
      break;
  }
  
  const numberPart = String(startNumber).padStart(padLength, '0');
  
  // Build final format
  switch(format) {
    case 'PREFIX-DATE-NUMBER':
      return `${prefix}${separator}${datePart}${separator}${numberPart}`;
    case 'PREFIX-NUMBER':
      return `${prefix}${separator}${numberPart}`;
    case 'DATE-NUMBER':
      return `${datePart}${separator}${numberPart}`;
    case 'NUMBER':
      return numberPart;
    default:
      return `${prefix}${separator}${datePart}${separator}${numberPart}`;
  }
};

// expose to template
</script>

<style scoped>
h3 {
  color: hsl(var(--bc) / 0.9);
}
</style>
