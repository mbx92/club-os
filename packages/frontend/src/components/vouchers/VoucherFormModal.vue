<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { useVouchers } from "@/composables/gym/voucher-management";
import { IconPercentage, IconCash } from "@tabler/icons-vue";
import CurrencyInput from "@/components/shared/CurrencyInput.vue";

const props = defineProps({
  voucher: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(["close", "saved"]);

const { createVoucher, updateVoucher, loading } = useVouchers();

// Modal ref for dialog API
const modal = ref(null);

// Form data
const formData = ref({
  code: "",
  name: "",
  description: "",
  type: "percentage",
  value: 0,
  maxDiscountAmount: null,
  minPurchaseAmount: 0,
  applicableTo: "all",
  applicableItems: [],
  startDate: "",
  endDate: "",
  usageLimit: null,
  userUsageLimit: null,
  isActive: true,
  isPublic: true,
});

// Validation errors
const errors = ref({});

// Type options
const typeOptions = [
  { value: "percentage", label: "Percentage Discount", icon: IconPercentage },
  { value: "fixed", label: "Fixed Amount", icon: IconCash },
];

// Applicable to options
const applicableToOptions = [
  {
    value: "all",
    label: "All Items",
    description: "Can be used on any purchase",
  },
  {
    value: "membership",
    label: "Membership Only",
    description: "Only for membership purchases",
  },
  {
    value: "product",
    label: "Products Only",
    description: "Only for product purchases",
  },
];

// Computed
const isEditMode = computed(() => !!props.voucher);
const modalTitle = computed(() =>
  isEditMode.value ? "Edit Voucher" : "Create New Voucher"
);

// Watch type change to reset maxDiscountAmount if not percentage
watch(
  () => formData.value.type,
  (newType) => {
    if (newType === "fixed") {
      formData.value.maxDiscountAmount = null;
    }
  }
);

// Initialize form data
const initFormData = () => {
  if (props.voucher) {
    // Edit mode - populate with existing data
    formData.value = {
      code: props.voucher.code || "",
      name: props.voucher.name || "",
      description: props.voucher.description || "",
      type: props.voucher.type || "percentage",
      value: parseFloat(props.voucher.value) || 0,
      maxDiscountAmount: props.voucher.maxDiscountAmount
        ? parseFloat(props.voucher.maxDiscountAmount)
        : null,
      minPurchaseAmount: props.voucher.minPurchaseAmount
        ? parseFloat(props.voucher.minPurchaseAmount)
        : 0,
      applicableTo: props.voucher.applicableTo || "all",
      applicableItems: props.voucher.applicableItems || [],
      startDate: props.voucher.startDate
        ? new Date(props.voucher.startDate).toISOString().slice(0, 16)
        : "",
      endDate: props.voucher.endDate
        ? new Date(props.voucher.endDate).toISOString().slice(0, 16)
        : "",
      usageLimit: props.voucher.usageLimit || null,
      userUsageLimit: props.voucher.userUsageLimit || null,
      isActive:
        props.voucher.isActive !== undefined ? props.voucher.isActive : true,
      isPublic:
        props.voucher.isPublic !== undefined ? props.voucher.isPublic : true,
    };
  } else {
    // Create mode - set default dates
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    formData.value.startDate = tomorrow.toISOString().slice(0, 16);
    formData.value.endDate = nextMonth.toISOString().slice(0, 16);
  }
};

// Validate form
const validateForm = () => {
  errors.value = {};

  // Code validation
  if (!formData.value.code?.trim()) {
    errors.value.code = "Voucher code is required";
  } else if (!/^[A-Z0-9_-]+$/.test(formData.value.code)) {
    errors.value.code =
      "Code must contain only uppercase letters, numbers, hyphens, and underscores";
  }

  // Name validation
  if (!formData.value.name?.trim()) {
    errors.value.name = "Voucher name is required";
  }

  // Value validation
  if (!formData.value.value || formData.value.value <= 0) {
    errors.value.value = "Value must be greater than 0";
  } else if (
    formData.value.type === "percentage" &&
    formData.value.value > 100
  ) {
    errors.value.value = "Percentage cannot exceed 100%";
  }

  // Max discount validation (for percentage type)
  if (
    formData.value.type === "percentage" &&
    formData.value.maxDiscountAmount &&
    formData.value.maxDiscountAmount <= 0
  ) {
    errors.value.maxDiscountAmount = "Max discount must be greater than 0";
  }

  // Min purchase validation
  if (
    formData.value.minPurchaseAmount &&
    formData.value.minPurchaseAmount < 0
  ) {
    errors.value.minPurchaseAmount = "Minimum purchase cannot be negative";
  }

  // Date validation
  if (!formData.value.startDate) {
    errors.value.startDate = "Start date is required";
  }
  if (!formData.value.endDate) {
    errors.value.endDate = "End date is required";
  }
  if (formData.value.startDate && formData.value.endDate) {
    const start = new Date(formData.value.startDate);
    const end = new Date(formData.value.endDate);
    if (end <= start) {
      errors.value.endDate = "End date must be after start date";
    }
  }

  // Usage limit validation
  if (formData.value.usageLimit && formData.value.usageLimit <= 0) {
    errors.value.usageLimit = "Usage limit must be greater than 0";
  }
  if (formData.value.userUsageLimit && formData.value.userUsageLimit <= 0) {
    errors.value.userUsageLimit = "User usage limit must be greater than 0";
  }

  // Focus on first error field
  if (Object.keys(errors.value).length > 0) {
    const firstErrorField = Object.keys(errors.value)[0];
    setTimeout(() => {
      const element = document.querySelector(`[class*="input-error"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.focus();
      }
    }, 100);
  }

  return Object.keys(errors.value).length === 0;
};

// Handle submit
const handleSubmit = async () => {
  if (!validateForm()) {
    return;
  }

  try {
    // Prepare payload
    const payload = {
      code: formData.value.code.trim().toUpperCase(),
      name: formData.value.name.trim(),
      description: formData.value.description?.trim() || "",
      type: formData.value.type,
      value: parseFloat(formData.value.value),
      applicableTo: formData.value.applicableTo,
      applicableItems: formData.value.applicableItems || [],
      startDate: new Date(formData.value.startDate).toISOString(),
      endDate: new Date(formData.value.endDate).toISOString(),
      isActive: formData.value.isActive,
      isPublic: formData.value.isPublic,
    };

    // Add optional fields
    if (
      formData.value.type === "percentage" &&
      formData.value.maxDiscountAmount
    ) {
      payload.maxDiscountAmount = parseFloat(formData.value.maxDiscountAmount);
    }
    if (formData.value.minPurchaseAmount) {
      payload.minPurchaseAmount = parseFloat(formData.value.minPurchaseAmount);
    }
    if (formData.value.usageLimit) {
      payload.usageLimit = parseInt(formData.value.usageLimit);
    }
    if (formData.value.userUsageLimit) {
      payload.userUsageLimit = parseInt(formData.value.userUsageLimit);
    }

    // Submit
    if (isEditMode.value) {
      await updateVoucher(props.voucher.id, payload);
    } else {
      await createVoucher(payload);
    }

    emit("saved");
  } catch (error) {
    console.error("Failed to save voucher:", error);
    // Error is already shown by composable
  }
};

// Format currency for display using tenant settings
import { useCurrency } from "@/composables/subscription/useCurrency";
const { formatCurrency: formatCurrencyFn } = useCurrency();
const formatCurrency = (value) => {
  if (!value) return formatCurrencyFn(0);
  return formatCurrencyFn(value);
};

onMounted(() => {
  initFormData();
});

// Modal controls
const openModal = () => {
  initFormData();
  modal.value?.showModal();
};

const closeModal = () => {
  modal.value?.close();
  emit("close");
};

const resetForm = () => {
  initFormData();
  errors.value = {};
};

defineExpose({ openModal, closeModal, resetForm });
</script>

<template>
  <dialog ref="modal" class="modal">
    <div class="modal-box w-11/12 max-w-4xl max-h-[90vh]">
      <form method="dialog">
        <button
          class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
          @click="closeModal"
        >
          ✕
        </button>
      </form>

      <h3 class="font-bold text-lg mb-4">
        {{ modalTitle }}
      </h3>

        <form @submit.prevent="handleSubmit">
          <div class="space-y-6 overflow-y-auto max-h-[calc(90vh-180px)] px-2">
            <!-- Basic Information -->
            <div>
              <h4 class="font-semibold text-base mb-3">Basic Information</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div class="form-control">
                  <label class="label"
                    ><span class="label-text">Voucher Code *</span></label
                  >
                  <input
                    v-model="formData.code"
                    type="text"
                    placeholder="e.g., NEWYEAR2025"
                    class="input input-bordered w-full"
                    :class="{ 'input-error': errors.code }"
                    :disabled="isEditMode"
                    maxlength="50"
                    @input="formData.code = formData.code.toUpperCase()"
                  />
                  <label v-if="errors.code" class="label"
                    ><span class="label-text-alt text-error">{{
                      errors.code
                    }}</span></label
                  >
                  <label v-else class="label"
                    ><span class="label-text-alt"
                      >Uppercase letters, numbers, hyphens, and underscores
                      only</span
                    ></label
                  >
                </div>

                <div class="form-control">
                  <label class="label"
                    ><span class="label-text">Voucher Name *</span></label
                  >
                  <input
                    v-model="formData.name"
                    type="text"
                    placeholder="e.g., New Year Discount"
                    class="input input-bordered w-full"
                    :class="{ 'input-error': errors.name }"
                    maxlength="100"
                  />
                  <label v-if="errors.name" class="label"
                    ><span class="label-text-alt text-error">{{
                      errors.name
                    }}</span></label
                  >
                </div>
              </div>

              <div class="form-control w-full">
                <label class="label"
                  ><span class="label-text font-medium"
                    >Description</span
                  ></label
                >
                <textarea
                  v-model="formData.description"
                  placeholder="Describe what this voucher is for..."
                  class="textarea textarea-bordered h-20 w-full resize-none"
                  maxlength="500"
                ></textarea>
                <label class="label"
                  ><span class="label-text-alt text-base-content/60"
                    >{{ formData.description?.length || 0 }} / 500</span
                  ></label
                >
              </div>
            </div>

            <!-- Discount Configuration -->
            <div>
              <h4 class="font-semibold text-base mb-3">
                Discount Configuration
              </h4>
              <div class="form-control max-w-3xl">
                <label class="label"
                  ><span class="label-text">Discount Type *</span></label
                >
                <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label
                    v-for="option in typeOptions"
                    :key="option.value"
                    class="cursor-pointer"
                  >
                    <input
                      type="radio"
                      v-model="formData.type"
                      :value="option.value"
                      class="hidden"
                    />
                    <div
                      :class="[
                        'rounded-2xl border-2 transition-all',
                        formData.type === option.value
                          ? 'border-primary bg-primary/5'
                          : 'border-base-300 hover:border-base-content/20',
                      ]"
                    >
                      <div class="flex items-center gap-3 p-3">
                        <div class="flex items-center gap-3">
                          <component
                            :is="option.icon"
                            :size="20"
                            :class="
                              formData.type === option.value
                                ? 'text-primary'
                                : 'text-base-content/60'
                            "
                          />
                          <span class="text-sm font-medium">{{ option.label }}</span>
                        </div>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div class="mt-4 grid max-w-3xl grid-cols-1 gap-3 md:grid-cols-3">
                <div class="form-control">
                  <label class="label"
                    ><span class="label-text">Discount Value *</span></label
                  >
                  <div class="join w-full">
                    <CurrencyInput
                      v-if="formData.type !== 'percentage'"
                      v-model="formData.value"
                      :min="0"
                      placeholder="50000"
                      :input-class="errors.value ? 'input input-sm input-bordered join-item w-full input-error' : 'input input-sm input-bordered join-item w-full'"
                    />
                    <input
                      v-else
                      v-model.number="formData.value"
                      type="number"
                      placeholder="20"
                      class="input input-sm input-bordered join-item w-full"
                      :class="{ 'input-error': errors.value }"
                      min="0"
                      max="100"
                    />
                    <span class="join-item inline-flex h-8 shrink-0 items-center justify-center rounded-r-lg border border-base-300 bg-base-200 px-3 text-sm font-medium text-base-content/70">{{
                      formData.type === "percentage" ? "%" : "Rp"
                    }}</span>
                  </div>
                  <label v-if="errors.value" class="label"
                    ><span class="label-text-alt text-error">{{
                      errors.value
                    }}</span></label
                  >
                </div>

                <div v-if="formData.type === 'percentage'" class="form-control">
                  <label class="label"
                    ><span class="label-text">Max Discount Amount</span></label
                  >
                  <CurrencyInput
                    v-model="formData.maxDiscountAmount"
                    placeholder="100000"
                    :input-class="errors.maxDiscountAmount ? 'input input-sm input-bordered w-full input-error' : 'input input-sm input-bordered w-full'"
                    :min="0"
                  />
                  <label v-if="errors.maxDiscountAmount" class="label"
                    ><span class="label-text-alt text-error">{{
                      errors.maxDiscountAmount
                    }}</span></label
                  >
                  <label v-else class="label"
                    ><span class="label-text-alt"
                      >Optional cap on discount amount</span
                    ></label
                  >
                </div>

                <div class="form-control">
                  <label class="label"
                    ><span class="label-text">Minimum Purchase</span></label
                  >
                  <CurrencyInput
                    v-model="formData.minPurchaseAmount"
                    placeholder="0"
                    :input-class="errors.minPurchaseAmount ? 'input input-sm input-bordered w-full input-error' : 'input input-sm input-bordered w-full'"
                    :min="0"
                  />
                  <label v-if="errors.minPurchaseAmount" class="label"
                    ><span class="label-text-alt text-error">{{
                      errors.minPurchaseAmount
                    }}</span></label
                  >
                  <label v-else class="label"
                    ><span class="label-text-alt"
                      >Minimum purchase amount required</span
                    ></label
                  >
                </div>
              </div>
            </div>

            <!-- Applicable Items -->
            <div>
              <h4 class="font-semibold text-base mb-3">Applicable Items</h4>
              <div class="form-control w-full">
                <div class="mb-4">
                  <span class="text-sm font-medium"
                    >Apply To <span class="text-error">*</span></span
                  >
                </div>
                <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <label
                    v-for="option in applicableToOptions"
                    :key="option.value"
                    class="cursor-pointer"
                  >
                    <input
                      type="radio"
                      v-model="formData.applicableTo"
                      :value="option.value"
                      class="hidden"
                    />
                    <div
                      :class="[
                        'h-full rounded-2xl border-2 transition-all',
                        formData.applicableTo === option.value
                          ? 'border-primary bg-primary/5'
                          : 'border-base-300 hover:border-base-content/20',
                      ]"
                    >
                      <div class="flex h-full items-start gap-3 p-4">
                          <input
                            type="radio"
                            :checked="formData.applicableTo === option.value"
                            class="radio radio-primary mt-0.5 shrink-0"
                          />
                          <div class="min-w-0">
                            <div class="font-medium leading-tight">{{ option.label }}</div>
                            <div class="mt-1 text-sm leading-snug text-base-content/60">
                              {{ option.description }}
                            </div>
                          </div>
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <!-- Validity Period -->
            <div>
              <h4 class="font-semibold text-base mb-3">Validity Period</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="form-control">
                  <label class="label"
                    ><span class="label-text">Start Date & Time *</span></label
                  >
                  <input
                    v-model="formData.startDate"
                    type="datetime-local"
                    class="input input-bordered w-full"
                    :class="{ 'input-error': errors.startDate }"
                  />
                  <label v-if="errors.startDate" class="label"
                    ><span class="label-text-alt text-error">{{
                      errors.startDate
                    }}</span></label
                  >
                </div>
                <div class="form-control">
                  <label class="label"
                    ><span class="label-text">End Date & Time *</span></label
                  >
                  <input
                    v-model="formData.endDate"
                    type="datetime-local"
                    class="input input-bordered w-full"
                    :class="{ 'input-error': errors.endDate }"
                  />
                  <label v-if="errors.endDate" class="label"
                    ><span class="label-text-alt text-error">{{
                      errors.endDate
                    }}</span></label
                  >
                </div>
              </div>
            </div>

            <!-- Usage Limits -->
            <div>
              <h4 class="font-semibold text-base mb-3">Usage Limits</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="form-control">
                  <label class="label"
                    ><span class="label-text">Total Usage Limit</span></label
                  >
                  <input
                    v-model.number="formData.usageLimit"
                    type="number"
                    placeholder="Leave empty for unlimited"
                    class="input input-bordered w-full"
                    :class="{ 'input-error': errors.usageLimit }"
                    min="0"
                  />
                  <label v-if="errors.usageLimit" class="label"
                    ><span class="label-text-alt text-error">{{
                      errors.usageLimit
                    }}</span></label
                  >
                  <label v-else class="label"
                    ><span class="label-text-alt"
                      >Maximum number of times this voucher can be used</span
                    ></label
                  >
                </div>
                <div class="form-control">
                  <label class="label"
                    ><span class="label-text">Per-User Usage Limit</span></label
                  >
                  <input
                    v-model.number="formData.userUsageLimit"
                    type="number"
                    placeholder="Leave empty for unlimited"
                    class="input input-bordered w-full"
                    :class="{ 'input-error': errors.userUsageLimit }"
                    min="0"
                  />
                  <label v-if="errors.userUsageLimit" class="label"
                    ><span class="label-text-alt text-error">{{
                      errors.userUsageLimit
                    }}</span></label
                  >
                  <label v-else class="label"
                    ><span class="label-text-alt"
                      >Maximum times each user can use this voucher</span
                    ></label
                  >
                </div>
              </div>
            </div>

            <!-- Settings -->
            <div>
              <h4 class="font-semibold text-base mb-3">Settings</h4>
              <div class="space-y-4">
                <div class="form-control w-full">
                  <label
                    class="label cursor-pointer justify-start gap-3 border border-base-300 rounded-lg px-4 py-3"
                  >
                    <input
                      v-model="formData.isActive"
                      type="checkbox"
                      class="toggle toggle-primary"
                    />
                    <div>
                      <span class="label-text font-medium">Active</span>
                      <p class="text-xs text-base-content/60 mt-1">
                        Voucher can be used when active
                      </p>
                    </div>
                  </label>
                </div>
                <div class="form-control w-full">
                  <label
                    class="label cursor-pointer justify-start gap-3 border border-base-300 rounded-lg px-4 py-3"
                  >
                    <input
                      v-model="formData.isPublic"
                      type="checkbox"
                      class="toggle toggle-primary"
                    />
                    <div>
                      <span class="label-text font-medium">Public</span>
                      <p class="text-xs text-base-content/60 mt-1">
                        {{
                          formData.isPublic
                            ? "Visible to all users"
                            : "Only accessible with direct code"
                        }}
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <!-- Modal Actions -->
          <div class="modal-action mt-6">
            <button
              type="button"
              class="btn btn-ghost"
              @click="closeModal"
              :disabled="loading"
            >
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" :disabled="loading">
              <span v-if="loading" class="loading loading-spinner"></span>
              {{ isEditMode ? "Update" : "Create" }} Voucher
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeModal">close</button>
      </form>
    </dialog>
</template>
