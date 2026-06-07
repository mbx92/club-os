<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold">Receipt Templates</h2>
        <p class="text-base-content/60 mt-1">Manage thermal printer receipt templates</p>
      </div>
      <button class="btn btn-primary btn-sm" @click="openTemplateModal()">
        <IconPlus class="w-4 h-4 mr-2" />
        Create Template
      </button>
    </div>

    <!-- Filters -->
    <div class="card bg-base-100 shadow">
      <div class="card-body py-4">
        <div class="flex flex-wrap gap-2">
          <select v-model="filters.templateType" class="select select-bordered select-sm" @change="loadTemplates">
            <option value="">All Types</option>
            <option value="receipt">Receipt</option>
            <option value="kitchen">Kitchen Order</option>
            <option value="label">Label</option>
            <option value="invoice">Invoice</option>
            <option value="report">Report</option>
          </select>
          <select v-model="filters.isActive" class="select select-bordered select-sm" @change="loadTemplates">
            <option value="">All Status</option>
            <option value="true">Active Only</option>
            <option value="false">Inactive Only</option>
          </select>
          <input
            v-model="filters.search"
            type="text"
            placeholder="Search templates..."
            class="input input-bordered input-sm flex-1 min-w-[200px]"
            @input="debouncedSearch"
          />
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Templates List -->
    <div v-else-if="templates.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="template in templates"
        :key="template.id"
        class="card bg-base-100 shadow hover:shadow-lg transition-shadow"
        :class="{ 'border-2 border-primary': template.isDefault }"
      >
        <div class="card-body">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-2">
                <h3 class="card-title text-lg">{{ template.name }}</h3>
                <div v-if="template.isDefault" class="badge badge-sm badge-primary">
                  Default
                </div>
                <div class="badge badge-sm" :class="template.isActive ? 'badge-success' : 'badge-ghost'">
                  {{ template.isActive ? 'Active' : 'Inactive' }}
                </div>
              </div>
              
              <div class="space-y-1 text-sm">
                <div class="flex items-center gap-2">
                  <IconFileText class="w-4 h-4 text-base-content/60" />
                  <span class="text-base-content/60">Type:</span>
                  <span class="font-semibold capitalize">{{ template.templateType }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <IconRuler class="w-4 h-4 text-base-content/60" />
                  <span class="text-base-content/60">Paper Width:</span>
                  <span>{{ template.paperWidth }} chars</span>
                </div>
                <div class="flex items-center gap-2">
                  <IconClock class="w-4 h-4 text-base-content/60" />
                  <span class="text-base-content/60">Updated:</span>
                  <span>{{ formatRelativeTime(template.updatedAt) }}</span>
                </div>
              </div>

              <!-- Template Sections Info -->
              <div class="mt-3 pt-3 border-t border-base-300">
                <div class="flex flex-wrap gap-1 text-xs">
                  <span v-if="template.header?.showLogo" class="badge badge-xs">Logo</span>
                  <span v-if="template.header?.showBusinessName" class="badge badge-xs">Business Name</span>
                  <span v-if="template.body?.showItems" class="badge badge-xs">Items</span>
                  <span v-if="template.body?.showPrices" class="badge badge-xs">Prices</span>
                  <span v-if="template.footer?.showQRCode" class="badge badge-xs">QR Code</span>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="dropdown dropdown-end">
              <button tabindex="0" class="btn btn-ghost btn-sm btn-circle">
                <IconDotsVertical class="w-5 h-5" />
              </button>
              <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
                <li>
                  <a @click="openPreviewModal(template.id)">
                    <IconEye class="w-4 h-4" />
                    Preview
                  </a>
                </li>
                <li>
                  <a @click="openTemplateModal(template)">
                    <IconEdit class="w-4 h-4" />
                    Edit
                  </a>
                </li>
                <li>
                  <a @click="handleDuplicate(template)">
                    <IconCopy class="w-4 h-4" />
                    Duplicate
                  </a>
                </li>
                <li v-if="!template.isDefault && template.isActive">
                  <a @click="setAsDefault(template)">
                    <IconStar class="w-4 h-4" />
                    Set as Default
                  </a>
                </li>
                <li class="border-t border-base-300 mt-1 pt-1">
                  <a @click="handleDelete(template)" class="text-error">
                    <IconTrash class="w-4 h-4" />
                    Delete
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="card bg-base-100 shadow">
      <div class="card-body text-center py-12">
        <IconFileOff class="w-16 h-16 mx-auto text-base-content/30 mb-4" />
        <h3 class="text-xl font-semibold mb-2">No Templates Found</h3>
        <p class="text-base-content/60 mb-4">
          Create your first receipt template to get started
        </p>
        <button class="btn btn-primary btn-sm" @click="openTemplateModal()">
          <IconPlus class="w-4 h-4 mr-2" />
          Create Template
        </button>
      </div>
    </div>

    <!-- Template Form Modal -->
    <ReceiptTemplateFormModal
      v-if="showTemplateModal"
      :template="selectedTemplate"
      @close="closeTemplateModal"
      @saved="handleTemplateSaved"
    />

    <!-- Preview Modal -->
    <ReceiptTemplatePreviewModal
      v-if="showPreviewModal"
      :template-id="previewTemplateId"
      @close="closePreviewModal"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useReceiptTemplates } from '@/composables/gym/useReceiptTemplates'
import { useNotification } from '@/composables/core/useNotification'
import { useDialog } from '@/composables/core/useApi'
import ReceiptTemplateFormModal from '@/components/settings/ReceiptTemplateFormModal.vue'
import ReceiptTemplatePreviewModal from '@/components/settings/ReceiptTemplatePreviewModal.vue'
import {
  IconPlus,
  IconFileText,
  IconFileOff,
  IconRuler,
  IconClock,
  IconDotsVertical,
  IconEye,
  IconEdit,
  IconCopy,
  IconTrash,
  IconStar
} from '@tabler/icons-vue'

const {
  templates,
  loading,
  fetchTemplates,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate
} = useReceiptTemplates()

const { showSuccess, showError } = useNotification()
const dialog = useDialog()

const filters = ref({
  templateType: '',
  isActive: '',
  search: ''
})

const showTemplateModal = ref(false)
const showPreviewModal = ref(false)
const selectedTemplate = ref(null)
const previewTemplateId = ref(null)
let searchTimeout = null

onMounted(() => {
  loadTemplates()
})

const loadTemplates = async () => {
  try {
    // Don't pass empty string values to backend
    const params = {}
    if (filters.value.templateType) params.templateType = filters.value.templateType
    if (filters.value.isActive) params.isActive = filters.value.isActive
    if (filters.value.search) params.search = filters.value.search
    
    await fetchTemplates(params)
  } catch (error) {
    showError('Failed to load templates')
  }
}

const debouncedSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    loadTemplates()
  }, 500)
}

const openTemplateModal = (template = null) => {
  selectedTemplate.value = template
  showTemplateModal.value = true
}

const closeTemplateModal = () => {
  showTemplateModal.value = false
  selectedTemplate.value = null
}

const handleTemplateSaved = () => {
  closeTemplateModal()
  loadTemplates()
}

const openPreviewModal = (templateId) => {
  previewTemplateId.value = templateId
  showPreviewModal.value = true
}

const closePreviewModal = () => {
  showPreviewModal.value = false
  previewTemplateId.value = null
}

const setAsDefault = async (template) => {
  try {
    await updateTemplate(template.id, { isDefault: true })
    showSuccess(`${template.name} set as default template`)
    loadTemplates()
  } catch (error) {
    showError('Failed to set default template')
  }
}

const handleDuplicate = async (template) => {
  const newName = prompt('Enter name for duplicated template:', `${template.name} (Copy)`)
  if (!newName) return
  
  try {
    await duplicateTemplate(template.id, newName)
    showSuccess('Template duplicated successfully')
    loadTemplates()
  } catch (error) {
    showError('Failed to duplicate template')
  }
}

const handleDelete = async (template) => {
  const confirmed = await dialog.confirm({
    title: 'Delete Template',
    message: `Are you sure you want to delete "${template.name}"?`,
    description: 'This action cannot be undone.',
    type: 'danger'
  })
  
  if (confirmed) {
    try {
      await deleteTemplate(template.id)
      showSuccess('Template deleted successfully')
      loadTemplates()
    } catch (error) {
      showError('Failed to delete template')
    }
  }
}

const formatRelativeTime = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}
</script>
