<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useProductExtras } from '@/composables/restaurant/useProductExtras'
import { IconPlus, IconEdit, IconTrash, IconGripVertical } from '@tabler/icons-vue'
import { useNotification } from '@/composables/core/useNotification'
import CurrencyInput from '@/components/shared/CurrencyInput.vue'

const props = defineProps({
  productId: {
    type: String,
    required: true
  },
  product: {
    type: Object,
    default: null
  }
})

const { 
  groupedExtras, 
  loading, 
  fetchExtras, 
  createExtra, 
  updateExtra, 
  deleteExtra,
  bulkCreateExtras
} = useProductExtras()

const { showSuccess, handleError } = useNotification()

// UI State
const showAddModal = ref(false)
const showEditModal = ref(false)
const showBulkModal = ref(false)
const showDeleteModal = ref(false)
const deletingExtra = ref(null)
const editingExtra = ref(null)
const isCreatingNewGroup = ref(false)

// Form state
const extraForm = ref({
  name: '',
  price: 0,
  inputType: 'checkbox',
  groupName: '',
  isRequired: false,
  isMultiple: true,
  sortOrder: 0,
  isActive: true
})

const bulkExtrasText = ref('')

const inputTypes = [
  { value: 'checkbox', label: 'Checkbox (Multiple Selection)' },
  { value: 'radio', label: 'Radio (Single Selection)' },
]

// Load extras on mount
onMounted(() => {
  loadExtras()
})

// Fallback: extras from productDetails when API returns nothing
const hasFallbackExtras = computed(() => {
  const extras = props.product?.productDetails?.extras
  return Array.isArray(extras) && extras.length > 0
})

const effectiveGroupedExtras = computed(() => {
  if (Object.keys(groupedExtras.value).length > 0) {
    return groupedExtras.value
  }
  // Fallback: group productDetails.extras under "Additional Options"
  if (hasFallbackExtras.value) {
    return {
      'Additional Options': props.product.productDetails.extras.map((e, i) => ({
        id: `fallback-${i}`,
        name: e.name,
        price: e.price,
        inputType: 'checkbox',
        isRequired: false,
        isActive: true,
        isFallback: true
      }))
    }
  }
  return {}
})

const loadExtras = async () => {
  try {
    await fetchExtras(props.productId, true, true)
  } catch (error) {
    // Silently fall back to productDetails.extras if available
    console.warn('Extras endpoint unavailable, using productDetails.extras as fallback')
  }
}

const resetForm = () => {
  extraForm.value = {
    name: '',
    price: 0,
    inputType: 'checkbox',
    groupName: '',
    isRequired: false,
    isMultiple: true,
    sortOrder: 0,
    isActive: true
  }
  editingExtra.value = null
  isCreatingNewGroup.value = false
}

const openAddModal = (groupName = '') => {
  resetForm()
  if (groupName) {
    // Add Extras to existing group
    isCreatingNewGroup.value = false
    extraForm.value.groupName = groupName
    // Auto-fill type and required from existing group
    if (groupedExtras.value[groupName] && groupedExtras.value[groupName][0]) {
      const firstExtra = groupedExtras.value[groupName][0]
      extraForm.value.inputType = firstExtra.inputType
      extraForm.value.isRequired = firstExtra.isRequired
    }
  } else {
    // Add Group (new group with first extra)
    isCreatingNewGroup.value = true
  }
  showAddModal.value = true
}

const openEditModal = (extra, groupName) => {
  editingExtra.value = extra
  extraForm.value = {
    name: extra.name,
    price: extra.price,
    inputType: extra.inputType,
    groupName: groupName,
    isRequired: extra.isRequired,
    isMultiple: extra.isMultiple,
    sortOrder: extra.sortOrder,
    isActive: extra.isActive
  }
  showEditModal.value = true
}

const handleSubmit = async () => {
  try {
    if (editingExtra.value) {
      await updateExtra(props.productId, editingExtra.value.id, extraForm.value)
      showEditModal.value = false
    } else {
      await createExtra(props.productId, extraForm.value)
      showAddModal.value = false
    }
    await loadExtras()
    resetForm()
  } catch (error) {
    console.error('Error saving extra:', error)
  }
}

const handleDelete = (extra, groupName) => {
  deletingExtra.value = extra
  showDeleteModal.value = true
}

const confirmDelete = async () => {
  if (!deletingExtra.value) return
  try {
    await deleteExtra(props.productId, deletingExtra.value.id)
    showSuccess(`"${deletingExtra.value.name}" berhasil dihapus`)
    showDeleteModal.value = false
    deletingExtra.value = null
    await loadExtras()
  } catch (error) {
    handleError(error, 'Gagal menghapus extra')
  }
}

const cancelDelete = () => {
  showDeleteModal.value = false
  deletingExtra.value = null
}

const openBulkModal = () => {
  bulkExtrasText.value = ''
  showBulkModal.value = true
}

const handleBulkCreate = async () => {
  try {
    // Parse bulk input
    // Expected format: GroupName | ExtraName | Price | Type (checkbox/radio) | Required (yes/no)
    const lines = bulkExtrasText.value.split('\n').filter(l => l.trim())
    const extrasArray = []

    for (const line of lines) {
      const parts = line.split('|').map(p => p.trim())
      if (parts.length >= 2) {
        extrasArray.push({
          groupName: parts[0] || 'Default',
          name: parts[1],
          price: parseFloat(parts[2]) || 0,
          inputType: parts[3] === 'radio' ? 'radio' : 'checkbox',
          isRequired: parts[4]?.toLowerCase() === 'yes',
          isMultiple: parts[3] !== 'radio',
          isActive: true
        })
      }
    }

    if (extrasArray.length > 0) {
      await bulkCreateExtras(props.productId, extrasArray)
      showBulkModal.value = false
      await loadExtras()
    }
  } catch (error) {
    console.error('Error bulk creating extras:', error)
  }
}

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

// Get unique groups
const existingGroups = ref([])
watch(groupedExtras, (newVal) => {
  existingGroups.value = Object.keys(newVal || {})
})
</script>

<template>
  <div class="space-y-4">
    <!-- Header Actions -->
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold">Product Extras</h3>
      <div class="flex gap-2">
        <button @click="openBulkModal" class="btn btn-sm btn-ghost">
          <IconPlus class="w-4 h-4" />
          Bulk Add
        </button>
        <button @click="openAddModal()" class="btn btn-sm btn-primary">
          <IconPlus class="w-4 h-4" />
          Add Group
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Extras List -->
    <div v-else-if="Object.keys(effectiveGroupedExtras).length > 0" class="space-y-4">
      <div 
        v-for="([groupName, extras], index) in Object.entries(effectiveGroupedExtras)" 
        :key="index"
        class="card bg-base-100 border"
      >
        <div class="card-body p-4">
          <!-- Group Header -->
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <h4 class="font-semibold">{{ groupName }}</h4>
              <span class="badge badge-sm badge-ghost">{{ extras.length }} items</span>
              <span v-if="extras[0]?.isFallback" class="badge badge-sm badge-info">from product data</span>
            </div>
            <button 
              v-if="!extras[0]?.isFallback"
              @click="openAddModal(groupName)" 
              class="btn btn-xs btn-ghost"
            >
              <IconPlus class="w-3 h-3" />
              Add Extras
            </button>
          </div>

          <!-- Extras Table -->
          <div class="overflow-x-auto">
            <table class="table table-sm">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Price</th>
                  <th>Type</th>
                  <th>Required</th>
                  <th>Status</th>
                  <th class="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="extra in extras" :key="extra.id">
                  <td>
                    <div class="font-medium">{{ extra.name }}</div>
                  </td>
                  <td>
                    <span :class="extra.price > 0 ? 'text-primary font-semibold' : 'text-base-content/60'">
                      {{ extra.price > 0 ? `+${formatCurrency(extra.price)}` : 'Free' }}
                    </span>
                  </td>
                  <td>
                    <span class="badge badge-sm">
                      {{ extra.inputType }}
                    </span>
                  </td>
                  <td>
                    <span 
                      :class="['badge badge-sm', extra.isRequired ? 'badge-error' : 'badge-ghost']"
                    >
                      {{ extra.isRequired ? 'Yes' : 'No' }}
                    </span>
                  </td>
                  <td>
                    <span 
                      :class="['badge badge-sm', extra.isActive ? 'badge-success' : 'badge-ghost']"
                    >
                      {{ extra.isActive ? 'Active' : 'Inactive' }}
                    </span>
                  </td>
                  <td>
                    <div class="flex justify-end gap-1">
                      <template v-if="!extra.isFallback">
                        <button 
                          @click="openEditModal(extra, groupName)"
                          class="btn btn-xs btn-ghost"
                        >
                          <IconEdit class="w-4 h-4" />
                        </button>
                        <button 
                          @click="handleDelete(extra, groupName)"
                          class="btn btn-xs btn-ghost text-error"
                        >
                          <IconTrash class="w-4 h-4" />
                        </button>
                      </template>
                      <span v-else class="text-xs text-base-content/40">read-only</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-12 border border-dashed rounded-lg">
      <p class="text-base-content/60 mb-4">No extras configured for this product</p>
      <button @click="openAddModal()" class="btn btn-sm btn-primary">
        <IconPlus class="w-4 h-4" />
        Add First Group
      </button>
    </div>

    <!-- Add/Edit Modal -->
    <teleport to="body">
      <dialog :class="['modal', { 'modal-open': showAddModal || showEditModal }]">
        <div class="modal-box max-w-lg">
          <h3 class="font-bold text-lg mb-6">
            {{ editingExtra ? 'Edit Extra' : (isCreatingNewGroup ? 'Add Group' : 'Add Extras') }}
          </h3>

          <form @submit.prevent="handleSubmit" class="space-y-5">
            <!-- Group Name -->
            <div class="form-control w-full">
              <label class="label">
                <span class="label-text font-medium">Group Name</span>
                <span class="label-text-alt text-error">*</span>
              </label>
              <input 
                v-model="extraForm.groupName"
                type="text"
                placeholder="e.g., Toppings, Size, Spice Level"
                class="input input-bordered w-full"
                :readonly="!isCreatingNewGroup && !editingExtra"
                :class="{ 'input-disabled': !isCreatingNewGroup && !editingExtra }"
                required
              />
              <label class="label">
                <span class="label-text-alt text-base-content/60">
                  {{ isCreatingNewGroup ? 'Group related options together (e.g., all sizes, all toppings)' : 'Adding to existing group' }}
                </span>
              </label>
            </div>

            <!-- Extra Name -->
            <div class="form-control w-full">
              <label class="label">
                <span class="label-text font-medium">Extra Name</span>
                <span class="label-text-alt text-error">*</span>
              </label>
              <input 
                v-model="extraForm.name"
                type="text"
                placeholder="e.g., Extra Telur, Large Size"
                class="input input-bordered w-full"
                required
              />
            </div>

            <!-- Price -->
            <div class="form-control w-full">
              <label class="label">
                <span class="label-text font-medium">Additional Price</span>
              </label>
              <CurrencyInput
                v-model="extraForm.price"
                :min="0"
                placeholder="0"
                input-class="input input-bordered w-full"
              />
              <label class="label">
                <span class="label-text-alt text-base-content/60">
                  Leave 0 for free options
                </span>
              </label>
            </div>

            <!-- Selection Type (only when creating new group) -->
            <div v-if="isCreatingNewGroup" class="form-control w-full">
              <label class="label">
                <span class="label-text font-medium">Selection Type</span>
                <span class="label-text-alt text-base-content/60">(applies to entire group)</span>
              </label>
              <select v-model="extraForm.inputType" class="select select-bordered w-full">
                <option v-for="type in inputTypes" :key="type.value" :value="type.value">
                  {{ type.label }}
                </option>
              </select>
              <label class="label">
                <span class="label-text-alt text-base-content/60">
                  All extras in this group will use the same selection type
                </span>
              </label>
            </div>

            <!-- Show current type when adding to existing group -->
            <div v-else-if="!editingExtra" class="alert alert-info">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <div class="text-sm">
                <div class="font-medium">Selection Type: {{ inputTypes.find(t => t.value === extraForm.inputType)?.label }}</div>
                <div class="text-xs opacity-80 mt-0.5">
                  All extras in "{{ extraForm.groupName }}" use this selection type
                </div>
              </div>
            </div>

            <!-- Options -->
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Options</span>
              </label>
              <div class="space-y-3">
                <!-- Required option (only when creating new group) -->
                <div v-if="isCreatingNewGroup" class="form-control">
                  <label class="label cursor-pointer justify-start gap-3 py-2">
                    <input 
                      v-model="extraForm.isRequired"
                      type="checkbox"
                      class="checkbox checkbox-primary"
                    />
                    <div class="flex-1">
                      <span class="label-text font-medium">Required</span>
                      <p class="text-xs text-base-content/60 mt-0.5">Customer must select from this group</p>
                    </div>
                  </label>
                </div>

                <div class="form-control">
                  <label class="label cursor-pointer justify-start gap-3 py-2">
                    <input 
                      v-model="extraForm.isActive"
                      type="checkbox"
                      class="checkbox checkbox-primary"
                    />
                    <div class="flex-1">
                      <span class="label-text font-medium">Active</span>
                      <p class="text-xs text-base-content/60 mt-0.5">Show this option to customers</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="modal-action mt-6">
              <button 
                type="button" 
                @click="showAddModal = false; showEditModal = false; resetForm()"
                class="btn btn-ghost"
              >
                Cancel
              </button>
              <button type="submit" class="btn btn-primary">
                {{ editingExtra ? 'Update' : 'Create' }}
              </button>
            </div>
          </form>
      </div>
      <form method="dialog" class="modal-backdrop bg-black/50">
        <button 
          type="button" 
          @click="showAddModal = false; showEditModal = false; resetForm()"
        >close</button>
      </form>
    </dialog>
  </teleport>

    <!-- Delete Confirmation Modal -->
    <teleport to="body">
      <dialog :class="['modal', { 'modal-open': showDeleteModal }]">
        <div class="modal-box max-w-sm">
          <h3 class="font-bold text-lg mb-2">Hapus Extra</h3>
          <p class="text-base-content/70 mb-1">
            Apakah kamu yakin ingin menghapus
            <span class="font-semibold text-base-content">"{{ deletingExtra?.name }}"</span>?
          </p>
          <p class="text-sm text-error">Tindakan ini tidak dapat dibatalkan.</p>
          <div class="modal-action">
            <button type="button" class="btn btn-ghost" @click="cancelDelete">Batal</button>
            <button type="button" class="btn btn-error" @click="confirmDelete" :disabled="loading">
              <span v-if="loading" class="loading loading-spinner loading-sm"></span>
              Hapus
            </button>
          </div>
        </div>
        <form method="dialog" class="modal-backdrop bg-black/50">
          <button type="button" @click="cancelDelete">close</button>
        </form>
      </dialog>
    </teleport>

    <!-- Bulk Add Modal -->
    <teleport to="body">
      <dialog :class="['modal', { 'modal-open': showBulkModal }]">
        <div class="modal-box max-w-2xl">
          <h3 class="font-bold text-lg mb-4">Bulk Add Extras</h3>

        <div class="space-y-4">
          <div class="alert alert-info">
            <div class="text-sm">
              <p class="font-semibold mb-2">Format (one per line):</p>
              <code class="text-xs">GroupName | ExtraName | Price | Type | Required</code>
              <p class="mt-2 text-xs opacity-80">
                Example:<br>
                Toppings | Extra Telur | 5000 | checkbox | no<br>
                Size | Large | 10000 | radio | yes
              </p>
            </div>
          </div>

          <div class="form-control">
            <textarea 
              v-model="bulkExtrasText"
              class="textarea textarea-bordered h-48 font-mono text-sm"
              placeholder="Toppings | Extra Telur | 5000 | checkbox | no&#10;Toppings | Extra Sambal | 2000 | checkbox | no&#10;Size | Small | 0 | radio | yes&#10;Size | Medium | 5000 | radio | yes"
            ></textarea>
          </div>

          <div class="modal-action">
            <button 
              type="button" 
              @click="showBulkModal = false"
              class="btn btn-ghost"
            >
              Cancel
            </button>
            <button 
              @click="handleBulkCreate"
              class="btn btn-primary"
              :disabled="!bulkExtrasText.trim()"
            >
              Create Extras
            </button>
          </div>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop bg-black/50">
        <button 
          type="button" 
          @click="showBulkModal = false"
        >close</button>
      </form>
    </dialog>
  </teleport>
  </div>
</template>
