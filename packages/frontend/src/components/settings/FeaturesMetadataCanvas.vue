<template>
  <!-- Canvas Overlay -->
  <Teleport to="body">
    <Transition name="canvas">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 overflow-hidden"
        @click.self="closeCanvas"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="closeCanvas"></div>
        
        <!-- Canvas Panel -->
        <div class="absolute inset-y-0 right-0 max-w-full flex">
          <div class="w-screen max-w-4xl">
            <div class="h-full flex flex-col bg-base-100 shadow-xl">
              
              <!-- Header -->
              <div class="px-6 py-4 bg-base-200 border-b border-base-300">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <IconZoomQuestion class="w-8 h-8 text-primary" />
                    <div>
                      <h2 class="text-xl font-bold">Feature Management</h2>
                      <p class="text-sm text-base-content/70">
                        Metadata, health status, and plan comparison
                      </p>
                    </div>
                  </div>
                  
                  <button
                    class="btn btn-sm btn-ghost btn-circle"
                    @click="closeCanvas"
                  >
                    <IconX class="w-5 h-5" />
                  </button>
                </div>
                
                <!-- Tabs -->
                <div class="mt-4">
                  <div role="tablist" class="tabs tabs-boxed">
                    <a
                      role="tab"
                      class="tab"
                      :class="{ 'tab-active': activeTab === 'metadata' }"
                      @click="activeTab = 'metadata'"
                    >
                      <IconList class="w-4 h-4 mr-2" />
                      Metadata
                    </a>
                    <a
                      role="tab"
                      class="tab"
                      :class="{ 'tab-active': activeTab === 'health' }"
                      @click="changeTab('health')"
                    >
                      <IconHeartbeat class="w-4 h-4 mr-2" />
                      Health
                    </a>
                    <a
                      role="tab"
                      class="tab"
                      :class="{ 'tab-active': activeTab === 'compare' }"
                      @click="changeTab('compare')"
                    >
                      <IconScale class="w-4 h-4 mr-2" />
                      Compare
                    </a>
                    <a
                      role="tab"
                      class="tab"
                      :class="{ 'tab-active': activeTab === 'preview' }"
                      @click="changeTab('preview')"
                    >
                      <IconEye class="w-4 h-4 mr-2" />
                      Preview
                    </a>
                  </div>
                </div>
                
                <!-- Search (only for metadata tab) -->
                <div v-if="activeTab === 'metadata'" class="mt-4">
                  <div class="form-control">
                    <div class="relative">
                      <span class="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50 z-10 pointer-events-none">
                        <IconSearch class="w-5 h-5" />
                      </span>
                      <input
                        v-model="searchQuery"
                        type="text"
                        placeholder="Search features..."
                        class="input input-bordered w-full pl-10 pr-10"
                      />
                      <button
                        v-if="searchQuery"
                        class="absolute right-2 top-1/2 -translate-y-1/2 btn btn-sm btn-ghost btn-circle z-10"
                        @click="searchQuery = ''"
                      >
                        <IconX class="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
                
                <!-- Plan Selector (only for preview tab) -->
                <div v-if="activeTab === 'preview'" class="mt-4">
                  <div class="form-control">
                    <select v-model="selectedPlan" class="select select-bordered w-full" @change="onPlanChange">
                      <option value="">Select a plan to preview...</option>
                      <option value="Basic">Basic</option>
                      <option value="Professional">Professional</option>
                      <option value="Business">Business</option>
                      <option value="Enterprise">Enterprise</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <!-- Content -->
              <div class="flex-1 overflow-y-auto px-6 py-4">
                <!-- Metadata Tab -->
                <div v-if="activeTab === 'metadata'">
                  <!-- Loading -->
                  <div v-if="loading" class="flex items-center justify-center py-12">
                    <span class="loading loading-spinner loading-lg"></span>
                  </div>
                  
                  <!-- Error -->
                  <div v-else-if="error" class="alert alert-error">
                    <IconAlertTriangle class="w-5 h-5" />
                    <span>{{ error }}</span>
                    <button class="btn btn-sm btn-ghost" @click="loadMetadata">
                      Retry
                    </button>
                  </div>
                  
                  <!-- No Results -->
                  <div v-else-if="filteredCategories.length === 0" class="text-center py-12">
                    <IconFileOff class="w-16 h-16 mx-auto text-base-content/30 mb-4" />
                    <p class="text-base-content/70">No features found</p>
                  </div>
                  
                  <!-- Metadata Content -->
                  <div v-else class="space-y-6">
                  <!-- Category Sections -->
                  <div
                    v-for="category in filteredCategories"
                    :key="category"
                    class="card bg-base-200 shadow-sm"
                  >
                    <div class="card-body">
                      <!-- Category Header -->
                      <div class="flex items-center gap-2 mb-3">
                        <component :is="getCategoryIconComponent(category)" class="w-6 h-6 text-primary" />
                        <h3 class="text-lg font-bold">
                          {{ getCategoryLabel(category) }}
                        </h3>
                        <div class="badge badge-neutral">
                          {{ getFeaturesByCategory(category).length }}
                        </div>
                      </div>
                      
                      <!-- Features List -->
                      <div class="space-y-3">
                        <div
                          v-for="feature in getFilteredFeatures(category)"
                          :key="feature.name"
                          class="card bg-base-100 shadow-sm hover:shadow-md transition-shadow"
                        >
                          <div class="card-body p-4">
                            <div class="flex items-start justify-between gap-4">
                              <div class="flex-1">
                                <!-- Feature Header -->
                                <div class="flex items-center gap-2 mb-2">
                                  <h4 class="font-semibold">{{ feature.label }}</h4>
                                  <div class="badge badge-sm" :class="getTypeBadgeColor(feature.type)">
                                    {{ feature.type }}
                                  </div>
                                </div>
                                
                                <!-- Description -->
                                <p class="text-sm text-base-content/70 mb-2">
                                  {{ feature.description }}
                                </p>
                                
                                <!-- Feature Details -->
                                <div class="flex flex-wrap gap-2 text-xs">
                                  <!-- Name -->
                                  <div class="badge badge-ghost badge-sm">
                                    <code>{{ feature.name }}</code>
                                  </div>
                                  
                                  <!-- Default -->
                                  <div v-if="feature.default !== undefined" class="badge badge-outline badge-sm">
                                    Default: <strong class="ml-1">{{ formatDefault(feature) }}</strong>
                                  </div>
                                  
                                  <!-- Unit -->
                                  <div v-if="feature.unit" class="badge badge-outline badge-sm">
                                    Unit: {{ feature.unit }}
                                  </div>
                                </div>
                                
                                <!-- Availability -->
                                <div class="mt-3">
                                  <div v-if="feature.availableIn" class="flex flex-wrap gap-1">
                                    <span class="text-xs text-base-content/60">Available in:</span>
                                    <div
                                      v-for="plan in feature.availableIn"
                                      :key="plan"
                                      class="badge badge-xs"
                                      :class="getPlanBadgeColor(plan)"
                                    >
                                      {{ plan }}
                                    </div>
                                  </div>
                                  
                                  <div v-else-if="feature.plans" class="space-y-1">
                                    <span class="text-xs text-base-content/60">Plan Limits:</span>
                                    <div class="flex flex-wrap gap-2">
                                      <div
                                        v-for="(value, plan) in feature.plans"
                                        :key="plan"
                                        class="badge badge-sm"
                                        :class="getPlanBadgeColor(plan)"
                                      >
                                        {{ plan }}: 
                                        <strong class="ml-1">
                                          {{ value === 0 ? '∞' : value }}
                                          {{ feature.unit ? ' ' + feature.unit : '' }}
                                        </strong>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Health Tab -->
              <div v-if="activeTab === 'health'">
                <!-- Loading -->
                <div v-if="healthLoading" class="flex items-center justify-center py-12">
                  <span class="loading loading-spinner loading-lg"></span>
                </div>
                
                <!-- Error -->
                <div v-else-if="healthError" class="alert alert-error">
                  <IconAlertTriangle class="w-5 h-5" />
                  <span>{{ healthError }}</span>
                  <button class="btn btn-sm btn-ghost" @click="loadHealth">
                    Retry
                  </button>
                </div>
                
                <!-- Health Content -->
                <div v-else-if="healthData" class="space-y-4">
                  <!-- Actions -->
                  <div class="flex gap-2">
                    <button
                      class="btn btn-primary btn-sm"
                      :class="{ 'loading': syncLoading }"
                      :disabled="syncLoading"
                      @click="handleSyncAll"
                    >
                      <IconRefresh class="w-4 h-4 mr-2" />
                      Sync All Plans
                    </button>
                    <button
                      class="btn btn-secondary btn-sm"
                      :class="{ 'loading': syncLoading }"
                      :disabled="syncLoading"
                      @click="handleCreateMissing"
                    >
                      <IconPlus class="w-4 h-4 mr-2" />
                      Create Missing Plans
                    </button>
                  </div>
                  
                  <!-- Status Card -->
                  <div class="card bg-base-200">
                    <div class="card-body">
                      <div class="flex items-center gap-3">
                        <div class="flex-1">
                          <h3 class="text-lg font-bold mb-2">System Health</h3>
                          <div class="grid grid-cols-2 gap-4">
                            <div class="stat bg-base-100 rounded-lg p-4">
                              <div class="stat-title text-xs">Status</div>
                              <div class="stat-value text-2xl">
                                <div class="badge" :class="healthData.healthy ? 'badge-success' : 'badge-error'">
                                  {{ healthData.healthy ? 'Healthy' : 'Unhealthy' }}
                                </div>
                              </div>
                            </div>
                            <div class="stat bg-base-100 rounded-lg p-4">
                              <div class="stat-title text-xs">Total Plans</div>
                              <div class="stat-value text-2xl">{{ healthData.totalPlans }}</div>
                            </div>
                            <div class="stat bg-base-100 rounded-lg p-4">
                              <div class="stat-title text-xs">In Sync</div>
                              <div class="stat-value text-2xl text-success">{{ healthData.inSync }}</div>
                            </div>
                            <div class="stat bg-base-100 rounded-lg p-4">
                              <div class="stat-title text-xs">Out of Sync</div>
                              <div class="stat-value text-2xl" :class="healthData.outOfSync > 0 ? 'text-error' : 'text-base-content'">
                                {{ healthData.outOfSync }}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Details -->
                  <div v-if="healthData.details && healthData.details.length > 0" class="card bg-base-200">
                    <div class="card-body">
                      <h3 class="text-lg font-bold mb-2">Details</h3>
                      <div class="space-y-2">
                        <div v-for="(detail, index) in healthData.details" :key="index" class="alert">
                          <IconInfoCircle class="w-5 h-5" />
                          <span>{{ detail }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Compare Tab -->
              <div v-if="activeTab === 'compare'">
                <!-- Loading -->
                <div v-if="compareLoading" class="flex items-center justify-center py-12">
                  <span class="loading loading-spinner loading-lg"></span>
                </div>
                
                <!-- Error -->
                <div v-else-if="compareError" class="alert alert-error">
                  <IconAlertTriangle class="w-5 h-5" />
                  <span>{{ compareError }}</span>
                  <button class="btn btn-sm btn-ghost" @click="loadCompare">
                    Retry
                  </button>
                </div>
                
                <!-- Compare Content -->
                <div v-else-if="compareData.length > 0" class="space-y-4">
                  <!-- Actions -->
                  <div class="flex justify-end">
                    <button
                      class="btn btn-primary btn-sm"
                      :class="{ 'loading': syncLoading }"
                      :disabled="syncLoading"
                      @click="handleSyncAll"
                    >
                      <IconRefresh class="w-4 h-4 mr-2" />
                      Sync All Plans
                    </button>
                  </div>
                  
                  <div
                    v-for="plan in compareData"
                    :key="plan.planId"
                    class="card bg-base-200"
                  >
                    <div class="card-body">
                      <div class="flex items-center justify-between mb-3">
                        <h3 class="text-lg font-bold">{{ plan.planName }}</h3>
                        <div class="flex items-center gap-2">
                          <div class="badge" :class="plan.inSync ? 'badge-success' : 'badge-error'">
                            {{ plan.inSync ? 'In Sync' : 'Out of Sync' }}
                          </div>
                          <button
                            v-if="!plan.inSync"
                            class="btn btn-xs btn-primary"
                            :class="{ 'loading': syncLoading }"
                            :disabled="syncLoading"
                            @click="handleSyncPlan(plan.planId)"
                          >
                            <IconRefresh class="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      
                      <!-- Differences -->
                      <div v-if="plan.differences && plan.differences.length > 0" class="space-y-2">
                        <p class="text-sm font-medium">Differences:</p>
                        <div
                          v-for="(diff, index) in plan.differences"
                          :key="index"
                          class="alert alert-warning"
                        >
                          <IconAlertTriangle class="w-4 h-4" />
                          <span class="text-sm">{{ diff }}</span>
                        </div>
                      </div>
                      
                      <div v-else class="flex items-center gap-2 text-success">
                        <IconCircleCheck class="w-4 h-4" />
                        <span class="text-sm">No differences found</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Preview Tab -->
              <div v-if="activeTab === 'preview'">
                <!-- Loading -->
                <div v-if="previewLoading" class="flex items-center justify-center py-12">
                  <span class="loading loading-spinner loading-lg"></span>
                </div>
                
                <!-- Error -->
                <div v-else-if="previewError" class="alert alert-error">
                  <IconAlertTriangle class="w-5 h-5" />
                  <span>{{ previewError }}</span>
                </div>
                
                <!-- No Plan Selected -->
                <div v-else-if="!previewData" class="text-center py-12">
                  <IconEye class="w-16 h-16 mx-auto text-base-content/30 mb-4" />
                  <p class="text-base-content/70">Select a plan to preview features</p>
                </div>
                
                <!-- Preview Content -->
                <div v-else class="space-y-4">
                  <div class="card bg-base-200">
                    <div class="card-body">
                      <h3 class="text-lg font-bold mb-4">{{ previewData.planName }} Plan Features</h3>
                      
                      <!-- Feature Categories -->
                      <div
                        v-for="(features, category) in previewData.features"
                        :key="category"
                        class="mb-4"
                      >
                        <div class="flex items-center gap-2 mb-2">
                          <component :is="getCategoryIconComponent(category)" class="w-5 h-5 text-primary" />
                          <h4 class="font-semibold">{{ getCategoryLabel(category) }}</h4>
                        </div>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-2 ml-7">
                          <div
                            v-for="(value, key) in features"
                            :key="key"
                            class="flex items-center justify-between p-2 bg-base-100 rounded"
                          >
                            <span class="text-sm">{{ formatFeatureName(key) }}</span>
                            <div v-if="typeof value === 'boolean'" class="badge badge-sm" :class="value ? 'badge-success' : 'badge-ghost'">
                              {{ value ? 'Enabled' : 'Disabled' }}
                            </div>
                            <div v-else class="badge badge-sm badge-info">
                              {{ value === 0 ? '∞' : value }}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
              
              <!-- Footer -->
              <div class="px-6 py-4 bg-base-200 border-t border-base-300">
                <div class="flex items-center justify-between">
                  <div class="text-sm text-base-content/70">
                    <span v-if="activeTab === 'metadata'">
                      Total: <strong>{{ metadata.length }}</strong> features
                      <span v-if="searchQuery">
                        ({{ filteredFeaturesCount }} filtered)
                      </span>
                    </span>
                    <span v-else-if="activeTab === 'health' && healthData">
                      Status: <strong :class="healthData.healthy ? 'text-success' : 'text-error'">
                        {{ healthData.healthy ? 'Healthy' : 'Unhealthy' }}
                      </strong>
                    </span>
                    <span v-else-if="activeTab === 'compare'">
                      Plans: <strong>{{ compareData.length }}</strong>
                    </span>
                    <span v-else-if="activeTab === 'preview' && previewData">
                      Plan: <strong>{{ previewData.planName }}</strong>
                    </span>
                  </div>
                  
                  <button class="btn btn-sm btn-ghost" @click="closeCanvas">
                    Close
                  </button>
                </div>
              </div>
              
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useFeatureMetadata } from '@/composables/subscription/useFeatureMetadata'
import { useNotification } from '@/composables/core/useNotification'
import {
  IconX,
  IconSearch,
  IconAlertTriangle,
  IconFileOff,
  IconZoomQuestion,
  IconPackage,
  IconRuler,
  IconBarbell,
  IconTarget,
  IconCash,
  IconCreditCard,
  IconPrinter,
  IconToolsKitchen,
  IconPlug,
  IconLifebuoy,
  IconSettings,
  IconList,
  IconHeartbeat,
  IconScale,
  IconEye,
  IconInfoCircle,
  IconCircleCheck,
  IconRefresh,
  IconPlus
} from '@tabler/icons-vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'close'])

// Notification composable
const { showSuccess, showError: showErrorNotification } = useNotification()

// Feature metadata composable
const {
  metadata,
  groupedMetadata,
  loading,
  error,
  healthData,
  healthLoading,
  healthError,
  compareData,
  compareLoading,
  compareError,
  previewData,
  previewLoading,
  previewError,
  syncData,
  syncLoading,
  syncError,
  fetchMetadata,
  fetchHealth,
  fetchCompare,
  fetchPreview,
  syncAllPlans,
  syncPlan,
  createMissingPlans,
  getCategoryLabel,
  getCategoryIcon,
  getTypeBadgeColor,
  getCategories,
  getFeaturesByCategory
} = useFeatureMetadata()

// Local state
const searchQuery = ref('')
const activeTab = ref('metadata')
const selectedPlan = ref('')
const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// Watch for open state
watch(isOpen, async (newValue) => {
  if (newValue && metadata.value.length === 0) {
    await loadMetadata()
  }
})

// Load metadata
const loadMetadata = async () => {
  await fetchMetadata()
}

// Load health
const loadHealth = async () => {
  await fetchHealth()
}

// Load compare
const loadCompare = async () => {
  await fetchCompare()
}

// Change tab
const changeTab = async (tab) => {
  activeTab.value = tab
  
  if (tab === 'health' && !healthData.value) {
    await loadHealth()
  } else if (tab === 'compare' && compareData.value.length === 0) {
    await loadCompare()
  } else if (tab === 'preview') {
    // Preview loads on plan selection
  }
}

// Handle plan change
const onPlanChange = async () => {
  if (selectedPlan.value) {
    await fetchPreview(selectedPlan.value)
  }
}

// Handle sync all plans
const handleSyncAll = async () => {
  try {
    const response = await syncAllPlans()
    if (response && response.success) {
      showSuccess(response.message || 'All plans synced successfully')
      
      // Show sync details if available
      if (response.data && response.data.synced) {
        const changedCount = response.data.synced.filter(p => p.changed).length
        if (changedCount > 0) {
          showSuccess(`${changedCount} plan(s) updated`)
        }
      }
    }
  } catch (err) {
    // Error already handled in composable
  }
}

// Handle sync single plan
const handleSyncPlan = async (planId) => {
  try {
    const response = await syncPlan(planId)
    if (response && response.success) {
      showSuccess(response.message || 'Plan synced successfully')
    }
  } catch (err) {
    // Error already handled in composable
  }
}

// Handle create missing plans
const handleCreateMissing = async () => {
  try {
    const response = await createMissingPlans()
    if (response && response.success) {
      showSuccess(response.message || 'Missing plans created successfully')
      
      if (response.data && response.data.length > 0) {
        showSuccess(`Created ${response.data.length} plan(s)`)
      }
    }
  } catch (err) {
    // Error already handled in composable
  }
}

// Close canvas
const closeCanvas = () => {
  isOpen.value = false
}

// Filter features by search query
const getFilteredFeatures = (category) => {
  const features = getFeaturesByCategory(category)
  
  if (!searchQuery.value || searchQuery.value.trim() === '') {
    return features
  }
  
  const query = searchQuery.value.toLowerCase()
  
  return features.filter(feature => {
    return (
      feature.name.toLowerCase().includes(query) ||
      feature.label.toLowerCase().includes(query) ||
      (feature.description && feature.description.toLowerCase().includes(query))
    )
  })
}

// Get filtered categories
const filteredCategories = computed(() => {
  const categories = getCategories()
  
  if (!searchQuery.value || searchQuery.value.trim() === '') {
    return categories
  }
  
  return categories.filter(category => {
    return getFilteredFeatures(category).length > 0
  })
})

// Count filtered features
const filteredFeaturesCount = computed(() => {
  return filteredCategories.value.reduce((total, category) => {
    return total + getFilteredFeatures(category).length
  }, 0)
})

// Format default value
const formatDefault = (feature) => {
  if (feature.type === 'boolean') {
    return feature.default ? 'Yes' : 'No'
  }
  
  if (feature.type === 'number') {
    return feature.default === 0 ? '∞' : feature.default
  }
  
  return feature.default
}

// Get plan badge color
const getPlanBadgeColor = (plan) => {
  const colors = {
    'Basic': 'badge-info',
    'Professional': 'badge-success',
    'Enterprise': 'badge-warning'
  }
  
  return colors[plan] || 'badge-neutral'
}

// Get category icon component
const getCategoryIconComponent = (category) => {
  const iconMap = {
    modules: IconPackage,
    limits: IconRuler,
    gym: IconBarbell,
    services: IconTarget,
    transactions: IconCash,
    payments: IconCreditCard,
    printing: IconPrinter,
    restaurant: IconToolsKitchen,
    integrations: IconPlug,
    support: IconLifebuoy,
    other: IconSettings
  }
  
  return iconMap[category] || IconSettings
}

// Format feature name (camelCase to Title Case)
const formatFeatureName = (name) => {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim()
}

// Keyboard shortcuts
const handleKeyDown = (event) => {
  if (event.key === 'Escape' && isOpen.value) {
    closeCanvas()
  }
}

// Mount/unmount keyboard listener
watch(isOpen, (newValue) => {
  if (newValue) {
    window.addEventListener('keydown', handleKeyDown)
  } else {
    window.removeEventListener('keydown', handleKeyDown)
  }
})
</script>

<style scoped>
/* Canvas transitions */
.canvas-enter-active,
.canvas-leave-active {
  transition: opacity 0.3s ease;
}

.canvas-enter-from,
.canvas-leave-to {
  opacity: 0;
}

.canvas-enter-active > div > div,
.canvas-leave-active > div > div {
  transition: transform 0.3s ease;
}

.canvas-enter-from > div > div,
.canvas-leave-to > div > div {
  transform: translateX(100%);
}

/* Scrollbar styling */
.overflow-y-auto::-webkit-scrollbar {
  width: 8px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: hsl(var(--bc) / 0.2);
  border-radius: 4px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--bc) / 0.3);
}
</style>
