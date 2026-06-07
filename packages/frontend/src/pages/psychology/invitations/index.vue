<route lang="yaml">
meta:
  title: Manajemen Undangan
  layout: default
  requiresModule: psychology
</route>

<template>
  <div>
    <!-- Page Header -->
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
      <div>
        <h1 class="text-3xl font-bold">Undangan</h1>
        <p class="text-base-content/60 mt-1">Kelola undangan tes psikologi</p>
      </div>
      <button class="btn btn-primary" @click="openFormModal()">
        <IconPlus class="w-5 h-5" />
        Buat Undangan
      </button>
    </div>

    <!-- Filters -->
    <div class="card bg-base-100 shadow-xl mb-6">
      <div class="card-body">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
          <!-- Search Input -->
          <div class="form-control lg:col-span-5">
            <label class="label">
              <span class="label-text font-medium">Pencarian</span>
            </label>
            <input
              v-model="filters.search"
              type="text"
              placeholder="Cari nama, email, atau telepon..."
              class="input input-bordered w-full"
              @input="debouncedSearch"
            />
          </div>

          <!-- Status Filter -->
          <div class="form-control lg:col-span-3">
            <label class="label">
              <span class="label-text font-medium">Status</span>
            </label>
            <select v-model="filters.status" class="select select-bordered w-full" @change="handleSearch">
              <option value="">Semua Status</option>
              <option value="pending">Menunggu</option>
              <option value="opened">Dibuka</option>
              <option value="registered">Terdaftar</option>
              <option value="expired">Kadaluarsa</option>
            </select>
          </div>

          <!-- Type Filter -->
          <div class="form-control lg:col-span-3">
            <label class="label">
              <span class="label-text font-medium">Tipe</span>
            </label>
            <select v-model="filters.invitationType" class="select select-bordered w-full" @change="handleSearch">
              <option value="">Semua Tipe</option>
              <option value="open_registration">Registrasi Terbuka</option>
              <option value="single_patient">Pasien Tunggal</option>
            </select>
          </div>

          <!-- Limit -->
          <div class="form-control lg:col-span-1">
            <label class="label">
              <span class="label-text font-medium">Tampil</span>
            </label>
            <select v-model="filters.limit" class="select select-bordered w-full" @change="handleSearch">
              <option :value="10">10</option>
              <option :value="25">25</option>
              <option :value="50">50</option>
            </select>
          </div>
        </div>

        <!-- Active Filters Info -->
        <div v-if="hasActiveFilters" class="flex items-center gap-2 mt-4 pt-4 border-t border-base-300">
          <span class="text-sm text-base-content/60">Filter aktif:</span>
          <div class="flex flex-wrap gap-2">
            <div v-if="filters.search" class="badge badge-primary badge-outline gap-1">
              Cari: "{{ filters.search }}"
              <button class="btn btn-ghost btn-xs btn-circle" @click="clearFilter('search')">✕</button>
            </div>
            <div v-if="filters.status" class="badge badge-primary badge-outline gap-1">
              Status: {{ getStatusLabel(filters.status) }}
              <button class="btn btn-ghost btn-xs btn-circle" @click="clearFilter('status')">✕</button>
            </div>
            <div v-if="filters.invitationType" class="badge badge-primary badge-outline gap-1">
              Tipe: {{ getInvitationTypeLabel(filters.invitationType) }}
              <button class="btn btn-ghost btn-xs btn-circle" @click="clearFilter('invitationType')">✕</button>
            </div>
            <button class="btn btn-xs btn-ghost" @click="clearAllFilters">Hapus Semua</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Invitations Table -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <!-- Loading -->
        <div v-if="loading" class="flex justify-center py-8">
          <span class="loading loading-spinner loading-lg"></span>
        </div>

        <!-- Invitations List -->
        <div v-else-if="invitations?.length > 0">
          <div class="overflow-x-auto">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th>Tipe</th>
                  <th>Target</th>
                  <th>Tes/Paket</th>
                  <th>Status</th>
                  <th>Penggunaan</th>
                  <th>Berlaku Hingga</th>
                  <th class="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="invitation in invitations" :key="invitation.id">
                  <td>
                    <div class="badge" :class="getInvitationTypeBadgeClass(invitation.invitationType)">
                      {{ getInvitationTypeLabel(invitation.invitationType) }}
                    </div>
                  </td>
                  <td>
                    <template v-if="invitation.invitationType === 'single_patient'">
                      <div class="font-medium">{{ invitation.patient?.fullName ? invitation.patient.fullName.toUpperCase() : '-' }}</div>
                      <div class="text-sm text-base-content/60">{{ invitation.patient?.email }}</div>
                    </template>
                    <template v-else>
                      <span class="text-base-content/60">Publik</span>
                    </template>
                  </td>
                  <td>
                    <template v-if="invitation.package">
                      <div class="font-medium">{{ invitation.package.name }}</div>
                      <div class="text-sm text-base-content/60">{{ invitation.package.packageType }}</div>
                    </template>
                    <template v-else-if="invitation.testType">
                      <div class="font-medium">{{ invitation.testType.name }}</div>
                      <div class="text-sm text-base-content/60">{{ invitation.testType.code }}</div>
                    </template>
                    <template v-else>
                      <span class="text-base-content/60">-</span>
                    </template>
                  </td>
                  <td>
                    <div class="badge" :class="getStatusClass(getInvitationStatus(invitation))">
                      {{ getStatusLabel(getInvitationStatus(invitation)) }}
                    </div>
                  </td>
                  <td>
                    <div class="text-sm">
                      {{ invitation.usedCount || 0 }} / {{ invitation.maxUses || '∞' }}
                    </div>
                  </td>
                  <td>
                    <span :class="{ 'text-error': isExpired(invitation.expiresAt) }">
                      {{ formatDate(invitation.expiresAt) }}
                    </span>
                  </td>
                  <td class="text-right">
                    <div class="flex items-center justify-end gap-2">
                      <button 
                        class="btn btn-ghost btn-sm"
                        @click="copyInvitationLink(invitation)"
                        title="Salin Link"
                      >
                        <IconCopy class="w-4 h-4" />
                      </button>
                      <button 
                        class="btn btn-ghost btn-sm"
                        @click="showQRCode(invitation)"
                        title="QR Code"
                      >
                        <IconQrcode class="w-4 h-4" />
                      </button>
                      <button 
                        class="btn btn-ghost btn-sm"
                        @click="openFormModal(invitation)"
                        title="Edit"
                      >
                        <IconEdit class="w-4 h-4" />
                      </button>
                      <button 
                        v-if="getInvitationStatus(invitation) === 'active'"
                        class="btn btn-ghost btn-sm text-error"
                        @click="confirmDelete(invitation)"
                        title="Hapus"
                      >
                        <IconTrash class="w-4 h-4" />
                      </button>
                      <button 
                        v-if="invitation.invitationType === 'single_patient' && getInvitationStatus(invitation) === 'active'"
                        class="btn btn-outline btn-primary btn-sm"
                        @click="resendInvitation(invitation)"
                        title="Kirim Ulang"
                      >
                        <IconSend class="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div class="flex justify-between items-center mt-6">
            <div class="text-sm text-base-content/60">
              Menampilkan {{ invitations.length }} dari {{ pagination.total }} undangan
            </div>
            <div class="join">
              <button 
                class="join-item btn btn-sm" 
                :disabled="pagination.page <= 1"
                @click="changePage(pagination.page - 1)"
              >
                <IconChevronLeft class="w-4 h-4" />
              </button>
              <button 
                v-for="page in visiblePages" 
                :key="page"
                class="join-item btn btn-sm"
                :class="{ 'btn-active': page === pagination.page }"
                @click="changePage(page)"
              >
                {{ page }}
              </button>
              <button 
                class="join-item btn btn-sm" 
                :disabled="pagination.page >= pagination.totalPages"
                @click="changePage(pagination.page + 1)"
              >
                <IconChevronRight class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="text-center py-12">
          <IconMailOff class="w-16 h-16 mx-auto text-base-content/30 mb-4" />
          <h3 class="text-lg font-semibold mb-2">Tidak ada undangan</h3>
          <p class="text-base-content/60 mb-4">Buat undangan baru untuk mengundang pasien</p>
          <button class="btn btn-primary" @click="openFormModal()">
            <IconPlus class="w-5 h-5" />
            Buat Undangan
          </button>
        </div>
      </div>
    </div>

    <!-- Form Modal -->
    <InvitationFormModal
      ref="formModal"
      :invitation="selectedInvitation"
      :loading="submitting"
      @submit="handleFormSubmit"
      @close="onModalClose"
    />

    <!-- QR Code Modal -->
    <dialog ref="qrModal" class="modal">
      <div class="modal-box max-w-md">
        <h3 class="font-bold text-lg mb-4">QR Code Undangan</h3>
        
        <div v-if="selectedInvitationForQR" class="space-y-4">
          <!-- QR Code -->
          <div class="flex justify-center p-6 bg-white rounded-lg">
            <div ref="qrCodeContainer"></div>
          </div>

          <!-- Invitation Info -->
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-base-content/60">Tipe:</span>
              <span class="font-medium">{{ getInvitationTypeLabel(selectedInvitationForQR.invitationType) }}</span>
            </div>
            <div v-if="selectedInvitationForQR.package" class="flex justify-between">
              <span class="text-base-content/60">Paket:</span>
              <span class="font-medium">{{ selectedInvitationForQR.package.name }}</span>
            </div>
            <div v-if="selectedInvitationForQR.testType" class="flex justify-between">
              <span class="text-base-content/60">Tes:</span>
              <span class="font-medium">{{ selectedInvitationForQR.testType.name }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-base-content/60">Berlaku:</span>
              <span class="font-medium">{{ formatDate(selectedInvitationForQR.expiresAt) }}</span>
            </div>
          </div>

          <!-- Link -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Link Undangan</span>
            </label>
            <div class="flex gap-2">
              <input 
                :value="getInvitationLink(selectedInvitationForQR.code)" 
                type="text" 
                class="input input-bordered flex-1 text-sm" 
                readonly
              />
              <button 
                class="btn btn-square btn-outline"
                @click="copyInvitationLink(selectedInvitationForQR)"
              >
                <IconCopy class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-2 justify-end pt-4">
            <button class="btn btn-ghost" @click="closeQRModal">Tutup</button>
            <button class="btn btn-primary" @click="downloadQRCode">
              <IconDownload class="w-4 h-4" />
              Download QR Code
            </button>
          </div>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeQRModal">close</button>
      </form>
    </dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import {
  IconPlus,
  IconSearch,
  IconCopy,
  IconEdit,
  IconTrash,
  IconSend,
  IconChevronLeft,
  IconChevronRight,
  IconMailOff,
  IconQrcode,
  IconDownload
} from '@tabler/icons-vue'
import { useInvitations, usePackages } from '@/composables/psychology'
import InvitationFormModal from '@/components/psychology/InvitationFormModal.vue'
import { useDialog } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'
import { useDebounceFn } from '@vueuse/core'
import QRCode from 'qrcode'

const dialog = useDialog()
const { showSuccess, showError } = useNotification()

const {
  invitations,
  loading,
  pagination,
  fetchInvitations,
  createInvitation,
  updateInvitation,
  deleteInvitation,
  resendInvitation: resend,
  getStatusClass,
  getStatusLabel,
  getInvitationStatus,
  formatDate,
  isExpired,
  getInvitationLink
} = useInvitations()

const { formatPrice } = usePackages()

const formModal = ref(null)
const selectedInvitation = ref(null)
const submitting = ref(false)

// QR Code
const qrModal = ref(null)
const qrCodeContainer = ref(null)
const selectedInvitationForQR = ref(null)
const qrCodeDataUrl = ref(null)

const filters = ref({
  search: '',
  status: '',
  invitationType: '',
  limit: 10
})

const hasActiveFilters = computed(() => {
  return filters.value.search || filters.value.status || filters.value.invitationType
})

// Invitation type helpers
const getInvitationTypeLabel = (type) => {
  const labels = {
    open_registration: 'Registrasi Terbuka',
    single_patient: 'Pasien Tunggal'
  }
  return labels[type] || type || 'Registrasi Terbuka'
}

const getInvitationTypeBadgeClass = (type) => {
  const classes = {
    open_registration: 'badge-primary',
    single_patient: 'badge-accent'
  }
  return classes[type] || 'badge-primary'
}

const loadInvitations = async () => {
  const params = {
    page: pagination.value.page,
    limit: filters.value.limit,
    ...filters.value
  }
  await fetchInvitations(params)
}

const handleSearch = () => {
  pagination.value.page = 1
  loadInvitations()
}

const debouncedSearch = useDebounceFn(() => {
  handleSearch()
}, 300)

const clearFilter = (filterName) => {
  filters.value[filterName] = ''
  handleSearch()
}

const clearAllFilters = () => {
  filters.value.search = ''
  filters.value.status = ''
  filters.value.invitationType = ''
  handleSearch()
}

const changePage = async (page) => {
  pagination.value.page = page
  await loadInvitations()
}

const visiblePages = computed(() => {
  const pages = []
  const total = pagination.value.totalPages
  const current = pagination.value.page
  
  let start = Math.max(1, current - 2)
  let end = Math.min(total, current + 2)
  
  if (end - start < 4) {
    if (start === 1) {
      end = Math.min(total, 5)
    } else if (end === total) {
      start = Math.max(1, total - 4)
    }
  }
  
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  
  return pages
})

const openFormModal = (invitation = null) => {
  selectedInvitation.value = invitation
  formModal.value?.openModal()
}

const copyInvitationLink = async (invitation) => {
  const link = getInvitationLink(invitation.code)
  
  try {
    // Try modern clipboard API first
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(link)
      showSuccess('Link undangan berhasil disalin ke clipboard!')
    } else {
      // Fallback for non-secure contexts (HTTP)
      const textArea = document.createElement('textarea')
      textArea.value = link
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      
      try {
        const successful = document.execCommand('copy')
        textArea.remove()
        
        if (successful) {
          showSuccess('Link undangan berhasil disalin ke clipboard!')
        } else {
          throw new Error('Copy command failed')
        }
      } catch (err) {
        textArea.remove()
        throw err
      }
    }
  } catch (err) {
    console.error('Failed to copy:', err)
    // Show the link in a prompt as last resort
    prompt('Gagal menyalin otomatis. Silakan copy link berikut:', link)
  }
}

const showQRCode = async (invitation) => {
  selectedInvitationForQR.value = invitation
  qrModal.value?.showModal()
  
  await nextTick()
  
  const link = getInvitationLink(invitation.code)
  
  try {
    // Clear previous QR code
    if (qrCodeContainer.value) {
      qrCodeContainer.value.innerHTML = ''
    }
    
    // Generate QR code as canvas
    const canvas = document.createElement('canvas')
    await QRCode.toCanvas(canvas, link, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })
    
    qrCodeContainer.value?.appendChild(canvas)
    
    // Store data URL for download
    qrCodeDataUrl.value = canvas.toDataURL('image/png')
  } catch (error) {
    console.error('Error generating QR code:', error)
    showError('Gagal membuat QR code')
  }
}

const closeQRModal = () => {
  qrModal.value?.close()
  selectedInvitationForQR.value = null
  qrCodeDataUrl.value = null
  if (qrCodeContainer.value) {
    qrCodeContainer.value.innerHTML = ''
  }
}

const downloadQRCode = () => {
  if (!qrCodeDataUrl.value || !selectedInvitationForQR.value) return
  
  const link = document.createElement('a')
  const fileName = `qr-invitation-${selectedInvitationForQR.value.code}.png`
  link.download = fileName
  link.href = qrCodeDataUrl.value
  link.click()
  
  showSuccess('QR Code berhasil diunduh!')
}

const handleFormSubmit = async (data) => {
  submitting.value = true
  try {
    if (selectedInvitation.value) {
      await updateInvitation(selectedInvitation.value.id, data)
    } else {
      await createInvitation(data)
    }
    formModal.value?.closeModal()
    await fetchInvitations()
  } catch (error) {
    console.error('Error saving invitation:', error)
  } finally {
    submitting.value = false
  }
}

const onModalClose = () => {
  selectedInvitation.value = null
}

const resendInvitation = async (invitation) => {
  try {
    await resend(invitation.id)
    showSuccess('Undangan berhasil dikirim ulang!')
  } catch (error) {
    console.error('Error resending invitation:', error)
  }
}

const confirmDelete = async (invitation) => {
  const targetName = invitation.invitationType === 'single_patient' 
    ? invitation.patient?.name 
    : (invitation.package?.name || invitation.testType?.name || 'undangan ini')
  
  const confirmed = await dialog.confirm({
    title: 'Hapus Undangan',
    message: `Apakah Anda yakin ingin menghapus undangan untuk ${targetName}?`,
    type: 'warning',
    confirmText: 'Hapus',
    cancelText: 'Batal'
  })

  if (confirmed) {
    try {
      await deleteInvitation(invitation.id)
      await fetchInvitations()
    } catch (error) {
      console.error('Error deleting invitation:', error)
    }
  }
}

onMounted(() => {
  fetchInvitations()
})
</script>
