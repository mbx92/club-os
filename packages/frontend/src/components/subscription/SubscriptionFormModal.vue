<template>
  <dialog ref="modal" class="modal">
    <div class="modal-box max-w-2xl">
      <form method="dialog">
        <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
      </form>

      <h3 class="font-bold text-lg mb-4">
        <IconPackage class="w-6 h-6 inline-block mr-2" />
        {{ isRenewal ? 'Renew Subscription' : 'Assign Subscription' }}
      </h3>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <!-- Tenant Selection (only for new subscription) -->
        <div v-if="!tenant && !isRenewal" class="form-control">
          <label class="label">
            <span class="label-text font-semibold">Select Tenant</span>
            <span class="label-text-alt text-error">*</span>
          </label>
          <select 
            v-model="formData.tenantId" 
            class="select select-bordered w-full"
            required
            :disabled="loadingTenants"
          >
            <option value="">-- Select Tenant --</option>
            <option 
              v-for="t in availableTenants" 
              :key="t.id" 
              :value="t.id"
            >
              {{ t.name }} ({{ t.domain }})
            </option>
          </select>
          <label class="label">
            <span class="label-text-alt">Choose which tenant to assign this subscription</span>
          </label>
        </div>

        <!-- Tenant Info (if tenant is pre-selected) -->
        <div v-else-if="tenant" class="alert alert-info">
          <IconInfoCircle class="w-5 h-5" />
          <div>
            <div class="font-semibold">{{ tenant.name }}</div>
            <div class="text-sm">{{ tenant.domain }}</div>
          </div>
        </div>

        <!-- Plan Selection -->
        <div class="form-control">
          <label class="label">
            <span class="label-text font-semibold">Select Plan</span>
            <span class="label-text-alt text-error">*</span>
          </label>
          <select 
            v-model="formData.planId" 
            class="select select-bordered w-full"
            required
            :disabled="loadingPlans"
            @change="handlePlanChange"
          >
            <option value="">-- Select Plan --</option>
            <option 
              v-for="plan in activePlans" 
              :key="plan.id" 
              :value="plan.id"
            >
              {{ plan.name }} - {{ formatCurrency(plan.price) }}/{{ plan.duration }} days
            </option>
          </select>
        </div>

        <!-- Selected Plan Preview -->
        <div v-if="selectedPlan" class="card bg-base-200">
          <div class="card-body p-4">
            <h4 class="font-semibold text-lg">{{ selectedPlan.name }}</h4>
            <p class="text-sm text-base-content/70 mb-2">{{ selectedPlan.description }}</p>
            
            <div class="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span class="text-base-content/60">Price:</span>
                <span class="font-bold ml-2">{{ formatCurrency(selectedPlan.price) }}</span>
              </div>
              <div>
                <span class="text-base-content/60">Duration:</span>
                <span class="font-bold ml-2">{{ selectedPlan.duration }} days</span>
              </div>
              <div>
                <span class="text-base-content/60">Max Users:</span>
                <span class="font-bold ml-2">{{ selectedPlan.maxUsers || '∞' }}</span>
              </div>
              <div>
                <span class="text-base-content/60">Max Members:</span>
                <span class="font-bold ml-2">{{ selectedPlan.maxMembers || '∞' }}</span>
              </div>
            </div>

            <!-- Features Summary -->
            <div v-if="selectedPlan.features" class="mt-3 pt-3 border-t border-base-300">
              <div class="text-xs font-semibold text-base-content/60 mb-2">FEATURES INCLUDED</div>
              <div class="flex flex-wrap gap-2">
                <div 
                  v-for="(count, category) in getFeaturesSummary(selectedPlan.features)" 
                  :key="category"
                  class="badge badge-sm badge-outline"
                >
                  {{ category }}: {{ count }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Payment Method -->
        <div class="form-control">
          <label class="label">
            <span class="label-text font-semibold">Payment Method</span>
            <span class="label-text-alt text-error">*</span>
          </label>
          <select 
            v-model="formData.paymentMethod" 
            class="select select-bordered w-full"
            required
          >
            <option value="">-- Select Payment Method --</option>
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="credit_card">Kartu</option>
            <option value="e_wallet">E-Wallet</option>
          </select>
        </div>

        <!-- Notes (optional) -->
        <div class="form-control">
          <label class="label">
            <span class="label-text font-semibold">Notes</span>
            <span class="label-text-alt">(Optional)</span>
          </label>
          <textarea
            v-model="formData.notes"
            class="textarea textarea-bordered h-20 w-full resize-none"
            placeholder="Add any additional notes..."
          ></textarea>
        </div>

        <!-- Actions -->
        <div class="modal-action">
          <button 
            type="button" 
            class="btn btn-ghost" 
            @click="closeModal"
            :disabled="loading"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            class="btn btn-primary"
            :class="{ 'loading': loading }"
            :disabled="loading || !isFormValid"
          >
            <IconCheck v-if="!loading" class="w-5 h-5 mr-1" />
            {{ isRenewal ? 'Renew Subscription' : 'Assign Subscription' }}
          </button>
        </div>
      </form>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button>close</button>
    </form>
  </dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { 
  IconPackage, 
  IconCheck, 
  IconInfoCircle 
} from '@tabler/icons-vue'
import { useSubscriptionPlans } from '@/composables/subscription/useSubscriptionPlans'
import { useTenants } from '@/composables/admin/useTenants'

const props = defineProps({
  tenant: {
    type: Object,
    default: null
  },
  subscription: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['submit', 'close'])

// Composables
const { 
  plans, 
  fetchPlans,
  formatCurrency,
  getEnabledFeaturesCount
} = useSubscriptionPlans()

const {
  tenants,
  fetchTenants
} = useTenants()

// Local state
const modal = ref(null)
const formData = ref({
  tenantId: '',
  planId: '',
  paymentMethod: '',
  notes: '',
  isRenewal: false
})

const isRenewal = ref(false)
const loadingPlans = ref(false)
const loadingTenants = ref(false)

// Computed
const activePlans = computed(() => {
  return plans.value?.filter(plan => plan.isActive) || []
})

const availableTenants = computed(() => {
  return tenants.value || []
})

const selectedPlan = computed(() => {
  if (!formData.value.planId) return null
  return activePlans.value.find(plan => plan.id === formData.value.planId)
})

const isFormValid = computed(() => {
  const hasRequiredFields = formData.value.planId && formData.value.paymentMethod
  
  if (isRenewal.value) {
    return hasRequiredFields
  }
  
  return hasRequiredFields && (props.tenant || formData.value.tenantId)
})

// Methods
const openModal = (options = {}) => {
  isRenewal.value = options.isRenewal || false
  formData.value.isRenewal = isRenewal.value
  
  if (props.tenant) {
    formData.value.tenantId = props.tenant.id
  }
  
  if (props.subscription) {
    formData.value.planId = props.subscription.planId
  }
  
  modal.value?.showModal()
}

const closeModal = () => {
  modal.value?.close()
  emit('close')
}

const resetForm = () => {
  formData.value = {
    tenantId: props.tenant?.id || '',
    planId: props.subscription?.planId || '',
    paymentMethod: '',
    notes: '',
    isRenewal: false
  }
  isRenewal.value = false
}

const handlePlanChange = () => {
  // Could add logic here to auto-calculate or show more details
}

const handleSubmit = () => {
  if (!isFormValid.value) return
  
  const submitData = {
    ...formData.value,
    tenantId: props.tenant?.id || formData.value.tenantId
  }
  
  emit('submit', submitData)
}

const getFeaturesSummary = (features) => {
  if (!features || typeof features !== 'object') return {}
  
  const summary = {}
  
  Object.entries(features).forEach(([category, categoryFeatures]) => {
    if (typeof categoryFeatures === 'object') {
      const count = getEnabledFeaturesCount({ [category]: categoryFeatures })
      if (count > 0) {
        summary[category] = count
      }
    }
  })
  
  return summary
}

// Load data on mount
onMounted(async () => {
  loadingPlans.value = true
  loadingTenants.value = true
  
  try {
    await Promise.all([
      fetchPlans({ isActive: 'true' }),
      fetchTenants()
    ])
  } catch (error) {
    console.error('Error loading data:', error)
  } finally {
    loadingPlans.value = false
    loadingTenants.value = false
  }
})

// Watch for prop changes
watch(() => props.tenant, (newTenant) => {
  if (newTenant) {
    formData.value.tenantId = newTenant.id
  }
})

watch(() => props.subscription, (newSubscription) => {
  if (newSubscription) {
    formData.value.planId = newSubscription.planId
  }
})

// Expose methods
defineExpose({
  openModal,
  closeModal,
  resetForm
})
</script>
