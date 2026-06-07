<template>
  <div class="card bg-base-100 shadow-xl">
    <div class="card-body">
      <h2 class="card-title mb-2">
        <IconCreditCard class="w-6 h-6" />
        Transaction Settings
      </h2>

      <!-- Module Locked Alert -->
      <div v-if="isModuleLocked" class="alert alert-warning mb-4">
        <div class="flex items-center gap-3">
          <IconLock class="w-6 h-6" />
          <div>
            <h3 class="font-bold">Module Not Available</h3>
            <p class="text-sm">
              The "{{ lockedModule }}" module is not included in your current plan.
              Some features may be disabled.
            </p>
          </div>
        </div>
        <button
          @click="handleUpgrade"
          class="btn btn-sm btn-primary"
        >
          Upgrade Plan
        </button>
      </div>

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
                :disabled="isButtonDisabled"
              />
              <span class="label-text">Tax enabled for transactions</span>
            </label>
          </div>

          <div
            v-if="form.transaction.taxEnable"
            class="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
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
                :disabled="isButtonDisabled"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-semibold">Tax Type</span>
              </label>
              <select
                v-model="form.transaction.taxType"
                class="select select-bordered w-full"
                :disabled="isButtonDisabled"
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
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
                :disabled="isButtonDisabled"
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
                :disabled="isButtonDisabled"
              />
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="card-actions justify-end pt-4">
          <button
            type="button"
            class="btn btn-ghost"
            :disabled="saving || isButtonDisabled"
            @click="resetForm"
          >
            Reset
          </button>
          <button
            type="submit"
            class="btn btn-primary"
            :class="[{ loading: saving }, disabledClass]"
            :disabled="saving || !hasChanges || isButtonDisabled"
            v-bind="disabledAttrs"
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
import { useModuleAccess } from "@/composables/core/useModuleAccess";
import { useSubscriptionStore } from "@/stores/subscription";
import {
  IconCreditCard,
  IconDeviceFloppy,
  IconLock,
} from "@tabler/icons-vue";

const api = useApi();
const { showSuccess, handleError } = useNotification();
const { tenantSettings, fetchTenantSettings } = useTenantSettings();
const subscriptionStore = useSubscriptionStore();

// Module Access Control
const {
  isModuleLocked,
  lockedModule,
  isButtonDisabled,
  disabledClass,
  disabledAttrs,
  handleModuleError,
  hasModuleAccess,
  setModuleLocked,
} = useModuleAccess();

const loading = ref(false);
const saving = ref(false);

const defaultForm = () => ({
  transaction: {
    taxEnable: false,
    taxPercentage: 0.0,
    taxType: "percentage",
    currency: {
      defaultCurrency: "IDR",
      currencySymbol: "Rp",
      decimalSeparator: ",",
      thousandSeparator: ".",
      useDecimals: true,
    },
    // ... other transaction settings
  },
});

const form = ref(defaultForm());
const original = ref(null);

const hasChanges = computed(() => {
  if (!original.value) return false;
  return JSON.stringify(form.value) !== JSON.stringify(original.value);
});

onMounted(async () => {
  // Check module access before loading settings
  if (!hasModuleAccess("transactions")) {
    setModuleLocked("transactions");
    return;
  }

  await loadSettings();
});

watch(tenantSettings, (newVal) => {
  if (newVal) populateForm(newVal);
});

const loadSettings = async () => {
  loading.value = true;
  try {
    await fetchTenantSettings();
    if (
      tenantSettings.value &&
      tenantSettings.value.settings &&
      tenantSettings.value.settings.transaction
    ) {
      const defaultTx = defaultForm().transaction;
      const apiTx = tenantSettings.value.settings.transaction;

      form.value = {
        transaction: {
          ...defaultTx,
          ...apiTx,
          currency: { ...defaultTx.currency, ...apiTx.currency },
        },
      };
    }
    original.value = JSON.parse(JSON.stringify(form.value));
  } catch (err) {
    // Check if error is MODULE_NOT_AVAILABLE
    const isModuleError = handleModuleError(err);
    if (!isModuleError) {
      handleError(err, "Failed to load settings");
    }
  } finally {
    loading.value = false;
  }
};

const populateForm = (data) => {
  if (data.settings && data.settings.transaction) {
    const defaultTx = defaultForm().transaction;
    const apiTx = data.settings.transaction;

    form.value = {
      transaction: {
        ...defaultTx,
        ...apiTx,
        currency: { ...defaultTx.currency, ...apiTx.currency },
      },
    };
  } else {
    form.value = defaultForm();
  }
  original.value = JSON.parse(JSON.stringify(form.value));
};

const resetForm = () => {
  form.value = JSON.parse(JSON.stringify(original.value));
};

const handleSubmit = async () => {
  if (isButtonDisabled.value) return;

  saving.value = true;
  try {
    const payload = { transaction: form.value.transaction };
    await api.patch("/tenants/settings", payload);
    showSuccess("Transaction settings updated successfully");
    original.value = JSON.parse(JSON.stringify(form.value));
  } catch (err) {
    // Check if error is MODULE_NOT_AVAILABLE
    const isModuleError = handleModuleError(err);
    if (!isModuleError) {
      handleError(err, "Failed to update transaction settings");
    }
  } finally {
    saving.value = false;
  }
};

const handleUpgrade = () => {
  subscriptionStore.showUpgradeModal({
    type: "module",
    module: lockedModule.value || "transactions",
    message: "Upgrade your plan to access transaction settings",
  });
};
</script>

<style scoped>
h3 {
  color: hsl(var(--bc) / 0.9);
}
</style>
