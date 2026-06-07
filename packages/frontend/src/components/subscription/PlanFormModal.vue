<template>
  <dialog ref="modal" class="modal">
    <div class="modal-box w-11/12 max-w-5xl max-h-[90vh]">
      <form method="dialog">
        <button
          class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
          @click="closeModal"
        >
          ✕
        </button>
      </form>

      <h3 class="font-bold text-lg mb-4">
        {{
          isEditMode ? "Edit Subscription Plan" : "Create New Subscription Plan"
        }}
      </h3>

      <form @submit.prevent="handleSubmit">
        <div class="space-y-6 overflow-y-auto max-h-[calc(90vh-180px)] pr-2">
          <!-- Basic Information Section -->
          <div>
            <h4 class="font-semibold text-base mb-3">Basic Information</h4>
            <div class="space-y-4">
              <!-- Plan Name -->
              <div class="form-control w-full">
                <label class="label">
                  <span class="label-text font-medium"
                    >Plan Name <span class="text-error">*</span></span
                  >
                </label>
                <input
                  v-model="formData.name"
                  type="text"
                  placeholder="e.g., Basic, Professional, Enterprise"
                  class="input input-bordered w-full"
                  :class="{ 'input-error': errors.name }"
                  required
                />
                <label v-if="errors.name" class="label">
                  <span class="label-text-alt text-error">{{
                    errors.name
                  }}</span>
                </label>
              </div>

              <!-- Description -->
              <div class="form-control w-full">
                <label class="label">
                  <span class="label-text font-medium">Description</span>
                </label>
                <textarea
                  v-model="formData.description"
                  placeholder="Describe the plan features and benefits"
                  class="textarea textarea-bordered h-20 w-full resize-none"
                />
              </div>
            </div>
          </div>

          <!-- Pricing Section -->
          <div>
            <h4 class="font-semibold text-base mb-3">Pricing</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Price -->
              <div class="form-control w-full">
                <label class="label">
                  <span class="label-text font-medium"
                    >{{ getCurrencyLabel('Price') }} <span class="text-error">*</span></span
                  >
                </label>
                <CurrencyInput
                  v-model="formData.price"
                  :min="0"
                  placeholder="0"
                  :input-class="errors.price ? 'input input-bordered w-full input-error' : 'input input-bordered w-full'"
                  required
                />
                <label v-if="errors.price" class="label">
                  <span class="label-text-alt text-error">{{
                    errors.price
                  }}</span>
                </label>
              </div>

              <!-- Duration -->
              <div class="form-control w-full">
                <label class="label">
                  <span class="label-text font-medium"
                    >Duration (Days) <span class="text-error">*</span></span
                  >
                </label>
                <input
                  v-model.number="formData.duration"
                  type="number"
                  min="1"
                  placeholder="30"
                  class="input input-bordered w-full"
                  :class="{ 'input-error': errors.duration }"
                  required
                />
                <label v-if="errors.duration" class="label">
                  <span class="label-text-alt text-error">{{
                    errors.duration
                  }}</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Settings Section -->
          <div>
            <h4 class="font-semibold text-base mb-3">Settings</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Sort Order -->
              <div class="form-control w-full">
                <label class="label">
                  <span class="label-text font-medium">Sort Order</span>
                </label>
                <input
                  v-model.number="formData.sortOrder"
                  type="number"
                  min="0"
                  placeholder="0"
                  class="input input-bordered w-full"
                />
                <label class="label">
                  <span class="label-text-alt text-base-content/60"
                    >Lower numbers appear first</span
                  >
                </label>
              </div>

              <!-- Active Status -->
              <div class="form-control w-full" v-if="isEditMode">
                <label class="label">
                  <span class="label-text font-medium">Status</span>
                </label>
                <label
                  class="label cursor-pointer justify-start gap-3 border border-base-300 rounded-lg px-4 py-3 w-full"
                >
                  <input
                    v-model="formData.isActive"
                    type="checkbox"
                    class="toggle toggle-primary"
                  />
                  <span class="label-text">{{
                    formData.isActive ? "Active" : "Inactive"
                  }}</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Features Section -->
          <div class="card bg-base-200">
            <div class="card-body">
              <div class="flex items-center justify-between mb-3">
                <h4 class="font-semibold text-base">Plan Features</h4>
                <div class="badge badge-primary">
                  {{ totalEnabledFeatures }} features enabled
                </div>
              </div>

              <!-- Features Tabs/Accordion - Dynamic from Metadata -->
              <div class="space-y-3">
                <template v-if="categoriesData.length > 0">
                  <!-- Dynamic categories from metadata -->
                  <div 
                    v-for="category in categoriesData" 
                    :key="category.name"
                    class="collapse collapse-arrow bg-base-100" 
                    :class="{ 
                      'collapse-open': expandedCategories[category.name], 
                      'collapse-close': !expandedCategories[category.name] 
                    }"
                  >
                    <div
                      class="collapse-title font-medium flex items-center justify-between"
                      @click="expandedCategories[category.name] = !expandedCategories[category.name]"
                    >
                      <span class="flex items-center gap-2">
                        <component :is="getIconComponent(category.icon)" :size="20" :stroke-width="1.5" />
                        {{ category.label }} 
                        ({{ enabledCount[category.name] || 0 }}/{{ getCategoryTotalComputed(category) }})
                      </span>
                    </div>
                    <div class="collapse-content">
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
                        <!-- Boolean/checkbox features -->
                        <template v-for="feature in category.features" :key="feature.key">
                          <!-- Boolean Feature -->
                          <label
                            v-if="feature.type === 'boolean'"
                            class="label cursor-pointer justify-start gap-3 border border-base-300 rounded-lg px-4 py-2"
                            :title="feature.description"
                          >
                            <input
                              type="checkbox"
                              v-model="formData.features[category.name][feature.key]"
                              class="checkbox checkbox-sm"
                            />
                            <span class="label-text">{{ feature.label }}</span>
                          </label>

                          <!-- Number/limit Feature -->
                          <div v-else-if="feature.type === 'number'" class="form-control">
                            <label class="label">
                              <span class="label-text" :title="feature.description">
                                {{ feature.label }}
                              </span>
                              <span class="label-text-alt text-xs">0 = unlimited</span>
                            </label>
                            <input
                              type="number"
                              v-model.number="formData.features[category.name][feature.key]"
                              min="0"
                              class="input input-bordered input-sm"
                            />
                          </div>
                        </template>
                      </div>
                    </div>
                  </div>
                </template>

                <!-- Fallback: Static categories if metadata not loaded -->
                <template v-else>
                  <div class="alert alert-info">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <span>Loading feature metadata... Using default structure.</span>
                  </div>
                  
                  <!-- Static fallback for each category -->
                  <div 
                    v-for="categoryName in Object.keys(formData.features)" 
                    :key="categoryName"
                    class="collapse collapse-arrow bg-base-100" 
                    :class="{ 
                      'collapse-open': expandedCategories[categoryName], 
                      'collapse-close': !expandedCategories[categoryName] 
                    }"
                  >
                    <div
                      class="collapse-title font-medium flex items-center justify-between"
                      @click="expandedCategories[categoryName] = !expandedCategories[categoryName]"
                    >
                      <span>
                        {{ formatFeatureKey(categoryName) }} 
                        ({{ enabledCount[categoryName] || 0 }}/{{ getCategoryTotal(categoryName) }})
                      </span>
                    </div>
                    <div class="collapse-content">
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
                        <template v-for="(value, key) in formData.features[categoryName]" :key="key">
                          <!-- Boolean Feature -->
                          <label
                            v-if="typeof value === 'boolean'"
                            class="label cursor-pointer justify-start gap-3 border border-base-300 rounded-lg px-4 py-2"
                          >
                            <input
                              type="checkbox"
                              v-model="formData.features[categoryName][key]"
                              class="checkbox checkbox-sm"
                            />
                            <span class="label-text">{{ formatFeatureKey(key) }}</span>
                          </label>

                          <!-- Number Feature -->
                          <div v-else-if="typeof value === 'number'" class="form-control">
                            <label class="label">
                              <span class="label-text">{{ formatFeatureKey(key) }}</span>
                              <span class="label-text-alt text-xs">0 = unlimited</span>
                            </label>
                            <input
                              type="number"
                              v-model.number="formData.features[categoryName][key]"
                              min="0"
                              class="input input-bordered input-sm"
                            />
                          </div>
                        </template>
                      </div>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>

        <!-- Modal Actions -->
        <div class="modal-action">
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
            {{ isEditMode ? "Update Plan" : "Create Plan" }}
          </button>
        </div>
      </form>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button @click="closeModal">close</button>
    </form>
  </dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { useSubscriptionPlans } from "@/composables/subscription/useSubscriptionPlans";
import { useCurrency } from "@/composables/subscription/useCurrency";
import * as TablerIcons from '@tabler/icons-vue';
import CurrencyInput from '@/components/shared/CurrencyInput.vue';

const props = defineProps({
  plan: {
    type: Object,
    default: null,
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["submit", "close"]);

const modal = ref(null);
const errors = ref({});

// Feature metadata management
const {
  featureMetadata,
  metadataLoading,
  fetchFeatureMetadata,
  getDefaultFeatures,
  formatFeatureKey,
  getCategoryMetadata,
  getCategoryFeatures,
  isSuperAdmin
} = useSubscriptionPlans();

const categoriesData = ref([]);

// Currency formatting
const { getCurrencyLabel } = useCurrency();

// Form data - initialized dynamically
const formData = ref({
  name: "",
  description: "",
  price: null,
  duration: 30,
  sortOrder: 0,
  isActive: true,
  features: getDefaultFeatures()
});

// Features management

const isEditMode = computed(() => !!props.plan);

// Get Tabler icon component by name
const getIconComponent = (iconName) => {
  if (!iconName) return TablerIcons.IconList
  const pascalCase = 'Icon' + iconName.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join('')
  return TablerIcons[pascalCase] || TablerIcons.IconList
}

// Computed properties for feature counts
const enabledCount = computed(() => {
  const counts = {};
  Object.keys(formData.value.features).forEach((category) => {
    const features = formData.value.features[category];
    counts[category] = Object.values(features).filter(
      (v) => v === true || (typeof v === "number" && v > 0)
    ).length;
  });
  return counts;
});

const totalEnabledFeatures = computed(() => {
  return Object.values(enabledCount.value).reduce(
    (sum, count) => sum + count,
    0
  );
});

// Get category total (for display)
const getCategoryTotalComputed = (category) => {
  if (category && category.features) {
    return category.features.length;
  }
  return 0;
};

// Expanded categories state - dynamically initialized
const expandedCategories = ref({});

// Initialize expanded state from metadata
const initializeExpandedCategories = () => {
  const expanded = {};
  if (featureMetadata.value && featureMetadata.value.length > 0) {
    featureMetadata.value.forEach((category, index) => {
      expanded[category.name] = index === 0; // First category expanded
    });
  } else {
    // Fallback to static categories
    expanded.modules = true;
    expanded.limits = false;
    expanded.transactions = false;
    expanded.payments = false;
    expanded.printing = false;
    expanded.restaurant = false;
    expanded.integrations = false;
    expanded.support = false;
  }
  expandedCategories.value = expanded;
};

// Initialize form with plan data if editing
watch(
  () => props.plan,
  (newPlan) => {
    if (newPlan) {
      // Get default features structure
      const defaultFeatures = getDefaultFeatures();
      
      // Merge plan features with defaults to ensure all categories/features exist
      const mergedFeatures = { ...defaultFeatures };
      
      if (newPlan.features) {
        Object.keys(newPlan.features).forEach(category => {
          if (!mergedFeatures[category]) {
            mergedFeatures[category] = {};
          }
          
          // Merge features within category
          Object.keys(newPlan.features[category]).forEach(featureKey => {
            mergedFeatures[category][featureKey] = newPlan.features[category][featureKey];
          });
        });
      }
      
      formData.value = {
        name: newPlan.name || "",
        description: newPlan.description || "",
        price: parseFloat(newPlan.price) || null,
        duration: newPlan.duration || 30,
        sortOrder: newPlan.sortOrder || 0,
        isActive: newPlan.isActive ?? true,
        features: mergedFeatures
      };
    }
  },
  { immediate: true }
);

// Validate form
const validateForm = () => {
  errors.value = {};

  if (!formData.value.name || formData.value.name.trim() === "") {
    errors.value.name = "Plan name is required";
  }

  if (!formData.value.price || formData.value.price <= 0) {
    errors.value.price = "Price must be greater than 0";
  }

  if (formData.value.duration && formData.value.duration <= 0) {
    errors.value.duration = "Duration must be greater than 0";
  }

  if (formData.value.maxUsers && formData.value.maxUsers <= 0) {
    errors.value.maxUsers = "Max users must be greater than 0";
  }

  return Object.keys(errors.value).length === 0;
};

// Handle form submission
const handleSubmit = () => {
  if (!validateForm()) {
    return
  }
  
  const submitData = {
    name: formData.value.name,
    description: formData.value.description,
    price: formData.value.price,
    duration: formData.value.duration,
    sortOrder: formData.value.sortOrder,
    isActive: formData.value.isActive,
    features: formData.value.features,
    // Backward compatibility
    maxUsers: formData.value.features.limits.maxUsers || 0,
    maxMembers: formData.value.features.limits.maxMembers || 0
  }
  
  emit('submit', submitData)
}

// Open modal
const openModal = async () => {
  errors.value = {};
  await loadMetadata();
  modal.value?.showModal();
};

// Close modal
const closeModal = () => {
  modal.value?.close();
  emit("close");
};

// Reset form
const resetForm = () => {
  formData.value = {
    name: '',
    description: '',
    price: null,
    duration: 30,
    sortOrder: 0,
    isActive: true,
    features: getDefaultFeatures()
  }
  errors.value = {}
  initializeExpandedCategories();
}

// Load metadata and prepare categories
const loadMetadata = async () => {
  if (isSuperAdmin()) {
    try {
      await fetchFeatureMetadata();
      if (featureMetadata.value && featureMetadata.value.length > 0) {
        categoriesData.value = featureMetadata.value;
        if (import.meta.env.DEV) {
          console.log('[PlanFormModal] Loaded metadata:', categoriesData.value);
        }
      } else {
        if (import.meta.env.DEV) {
          console.log('[PlanFormModal] Metadata empty or not available, using dynamic features from formData');
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.log('[PlanFormModal] Could not load feature metadata:', error.message);
      }
    }
  }
  initializeExpandedCategories();
}

// Get total features count for a category
const getCategoryTotal = (categoryName) => {
  const categoryData = categoriesData.value.find(c => c.name === categoryName);
  if (categoryData) {
    return categoryData.features.length;
  }
  
  // Fallback: count from formData features
  if (formData.value.features[categoryName]) {
    return Object.keys(formData.value.features[categoryName]).length;
  }
  
  return 0;
}

// Load metadata on mount
onMounted(() => {
  loadMetadata();
});

// Expose methods to parent
defineExpose({
  openModal,
  closeModal,
  resetForm,
});
</script>
