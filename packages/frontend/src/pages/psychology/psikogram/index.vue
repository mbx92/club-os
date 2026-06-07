<route lang="yaml">
meta:
  title: Psikogram
  layout: default
  requiresModule: psychology
</route>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold">Psikogram</h1>
        <p class="text-base-content/60 mt-1">Buat dan cetak hasil pemeriksaan psikologi</p>
      </div>
      <router-link to="/psychology/psikogram/create" class="btn btn-primary">
        <IconPlus class="w-5 h-5" />
        Buat Psikogram Baru
      </router-link>
    </div>

    <!-- Filter Card -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body py-4">
        <div class="flex flex-col lg:flex-row items-start lg:items-center gap-4">
          <!-- Search -->
          <div class="form-control flex-1 w-full lg:w-auto">
            <div class="join w-full">
              <div class="join-item flex items-center justify-center w-10 bg-base-200 border border-r-0 border-base-300 rounded-l-lg">
                <IconSearch class="w-4 h-4 text-base-content/50" />
              </div>
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Cari nama peserta atau perusahaan..."
                class="input input-bordered join-item flex-1"
              />
            </div>
          </div>
          
          <!-- Filter Status -->
          <div class="flex items-center gap-2">
            <span class="text-sm text-base-content/60 hidden sm:inline">Status:</span>
            <div class="join">
              <button 
                class="btn btn-sm join-item"
                :class="statusFilter === '' ? 'btn-active' : 'btn-ghost'"
                @click="statusFilter = ''"
              >
                Semua
              </button>
              <button 
                class="btn btn-sm join-item"
                :class="statusFilter === 'draft' ? 'btn-active btn-warning' : 'btn-ghost'"
                @click="statusFilter = 'draft'"
              >
                <IconFileText class="w-3 h-3" />
                Draft
              </button>
              <button 
                class="btn btn-sm join-item"
                :class="statusFilter === 'final' ? 'btn-active btn-success' : 'btn-ghost'"
                @click="statusFilter = 'final'"
              >
                <IconCheck class="w-3 h-3" />
                Final
              </button>
            </div>
          </div>
          
          <!-- Refresh Button -->
          <button class="btn btn-ghost btn-sm" @click="refresh" :disabled="loading">
            <IconRefresh class="w-4 h-4" :class="{ 'animate-spin': loading }" />
            Refresh
          </button>
        </div>
      </div>
    </div>

    <!-- List Psikogram -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <h2 class="card-title mb-4">Daftar Psikogram</h2>

        <!-- Loading -->
        <div v-if="loading" class="flex justify-center py-8">
          <span class="loading loading-spinner loading-lg"></span>
        </div>

        <!-- Empty State -->
        <div v-else-if="!psikograms.length" class="text-center py-12">
          <IconFileOff class="w-16 h-16 mx-auto text-base-content/30 mb-4" />
          <p class="text-base-content/60 mb-2">Belum ada psikogram</p>
          <p class="text-sm text-base-content/40 mb-4">Buat psikogram baru untuk peserta yang sudah menyelesaikan tes</p>
          <router-link to="/psychology/psikogram/create" class="btn btn-primary btn-sm">
            <IconPlus class="w-4 h-4" />
            Buat Psikogram Pertama
          </router-link>
        </div>

        <!-- Table -->
        <div v-else class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>No</th>
                <th>Nama Peserta</th>
                <th>Tanggal Pemeriksaan</th>
                <th>Pemeriksa</th>
                <th>Rekomendasi</th>
                <th>Status</th>
                <th class="text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in filteredPsikograms" :key="item.id">
                <td>{{ (pagination.page - 1) * pagination.limit + index + 1 }}</td>
                <td>
                  <div class="font-medium uppercase">{{ item.participant?.name }}</div>
                  <div class="text-sm text-base-content/60">{{ item.participant?.corporate || '-' }}</div>
                </td>
                <td>{{ formatDate(item.examDate) }}</td>
                <td>{{ item.examiner?.name || '-' }}</td>
                <td>
                  <span 
                    v-if="item.recommendation"
                    class="badge badge-sm"
                    :class="item.recommendation === 'recommended' ? 'badge-success' : 'badge-error'"
                  >
                    {{ item.recommendation === 'recommended' ? 'Disarankan' : 'Tidak Disarankan' }}
                  </span>
                  <span v-else class="text-base-content/40">-</span>
                </td>
                <td>
                  <span 
                    class="badge badge-sm"
                    :class="item.status === 'final' ? 'badge-success' : 'badge-warning'"
                  >
                    {{ item.status === 'final' ? 'Final' : 'Draft' }}
                  </span>
                </td>
                <td>
                  <div class="flex items-center gap-1">
                    <div class="tooltip" data-tip="Lihat">
                      <router-link 
                        :to="`/psychology/psikogram/${item.id}`"
                        class="btn btn-ghost btn-xs btn-square"
                      >
                        <IconEye class="w-4 h-4" />
                      </router-link>
                    </div>
                    <div class="tooltip" data-tip="Edit">
                      <router-link 
                        :to="`/psychology/psikogram/${item.id}/edit`"
                        class="btn btn-ghost btn-xs btn-square"
                      >
                        <IconEdit class="w-4 h-4" />
                      </router-link>
                    </div>
                    <div class="tooltip" data-tip="Cetak">
                      <router-link 
                        :to="`/psychology/psikogram/${item.id}/print`"
                        class="btn btn-ghost btn-xs btn-square text-primary"
                      >
                        <IconPrinter class="w-4 h-4" />
                      </router-link>
                    </div>
                    <div class="tooltip" data-tip="Bagikan">
                      <button 
                        class="btn btn-ghost btn-xs btn-square text-info"
                        @click="handleShare(item)"
                      >
                        <IconShare class="w-4 h-4" />
                      </button>
                    </div>
                    <div v-if="item.status === 'draft'" class="tooltip" data-tip="Hapus">
                      <button 
                        class="btn btn-ghost btn-xs btn-square text-error"
                        @click="handleDelete(item)"
                      >
                        <IconTrash class="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          
          <!-- Pagination -->
          <div v-if="pagination.totalPages > 1" class="flex justify-center mt-4">
            <div class="join">
              <button 
                class="join-item btn btn-sm"
                :disabled="pagination.page <= 1"
                @click="goToPage(pagination.page - 1)"
              >
                «
              </button>
              <button class="join-item btn btn-sm">
                Halaman {{ pagination.page }} dari {{ pagination.totalPages }}
              </button>
              <button 
                class="join-item btn btn-sm"
                :disabled="pagination.page >= pagination.totalPages"
                @click="goToPage(pagination.page + 1)"
              >
                »
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Share Modal -->
    <Teleport to="body">
      <dialog ref="shareModal" class="modal">
        <div class="modal-box">
          <h3 class="font-bold text-lg mb-4">Bagikan Psikogram</h3>
          <p class="text-sm text-base-content/60 mb-4">
            Link ini dapat dibagikan kepada <strong>{{ selectedPsikogram?.participant?.name }}</strong> untuk mengakses hasil psikogram secara mandiri.
          </p>
          
          <div v-if="generatingLink" class="flex justify-center py-8">
            <span class="loading loading-spinner loading-lg"></span>
          </div>
          
          <div v-else class="space-y-4">
            <div class="form-control">
              <label class="label">
                <span class="label-text">Link Publik</span>
              </label>
              <div class="join w-full">
                <input 
                  :value="shareLink"
                  type="text" 
                  class="input input-bordered join-item flex-1" 
                  readonly
                />
                <button 
                  class="btn btn-primary join-item"
                  @click="copyShareLink"
                >
                  <IconShare class="w-4 h-4" />
                  Salin
                </button>
              </div>
            </div>
            
            <!-- WhatsApp Button -->
            <button 
              v-if="selectedPsikogram?.participant?.phone"
              class="btn btn-success w-full gap-2"
              @click="shareViaWhatsApp"
            >
              <IconBrandWhatsapp class="w-5 h-5" />
              Bagikan via WhatsApp ke {{ selectedPsikogram?.participant?.name }}
            </button>
            
            <div class="alert alert-info">
              <IconCheck class="w-5 h-5" />
              <div class="text-sm">
                <p class="font-semibold">Link ini bersifat publik</p>
                <p>Siapa saja yang memiliki link ini dapat melihat dan mendownload hasil psikogram.</p>
              </div>
            </div>
          </div>
          
          <div class="modal-action">
            <button class="btn" @click="shareModal?.close()">Tutup</button>
          </div>
        </div>
        <form method="dialog" class="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import {
  IconPlus,
  IconFileOff,
  IconFileText,
  IconEye,
  IconEdit,
  IconPrinter,
  IconCheck,
  IconTrash,
  IconRefresh,
  IconSearch,
  IconShare,
  IconBrandWhatsapp
} from '@tabler/icons-vue'
import { usePsikogram } from '@/composables/psychology'
import { useNotification } from '@/composables/core/useNotification'
import { useApi } from '@/composables/core/useApi'

const api = useApi()

const { 
  psikograms, 
  loading, 
  pagination,
  fetchPsikograms, 
  deletePsikogram,
  getStatusClass,
  getStatusLabel 
} = usePsikogram()

const { showConfirm, showSuccess } = useNotification()

const searchQuery = ref('')
const statusFilter = ref('')
const searchTimeout = ref(null)
const shareModal = ref(null)
const shareLink = ref('')
const generatingLink = ref(false)
const selectedPsikogram = ref(null)

// Watch filter changes to reload data
watch([statusFilter], () => {
  pagination.value.page = 1
  loadPsikograms()
})

// Debounced search
watch(searchQuery, (newVal) => {
  if (searchTimeout.value) clearTimeout(searchTimeout.value)
  searchTimeout.value = setTimeout(() => {
    pagination.value.page = 1
    loadPsikograms()
  }, 300)
})

const filteredPsikograms = computed(() => {
  return psikograms.value
})

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

// Load psikograms from API
const loadPsikograms = async () => {
  try {
    const params = {
      page: pagination.value.page,
      limit: pagination.value.limit
    }
    
    if (statusFilter.value) {
      params.status = statusFilter.value
    }
    
    if (searchQuery.value) {
      params.search = searchQuery.value
    }
    
    await fetchPsikograms(params)
  } catch (error) {
    console.error('Error loading psikograms:', error)
  }
}

// Go to specific page
const goToPage = (page) => {
  if (page >= 1 && page <= pagination.value.totalPages) {
    pagination.value.page = page
    loadPsikograms()
  }
}

// Delete psikogram
const handleDelete = async (item) => {
  if (item.status === 'final') {
    return // Cannot delete final psikogram
  }
  
  const confirmed = await showConfirm({
    title: 'Hapus Psikogram',
    message: `Apakah Anda yakin ingin menghapus psikogram untuk "${item.participant?.name}"?`,
    confirmText: 'Hapus',
    cancelText: 'Batal',
    type: 'warning'
  })
  
  if (confirmed) {
    try {
      await deletePsikogram(item.id)
      await loadPsikograms()
    } catch (error) {
      console.error('Error deleting psikogram:', error)
    }
  }
}

// Share psikogram
const handleShare = async (item) => {
  selectedPsikogram.value = item
  generatingLink.value = true
  shareLink.value = ''
  shareModal.value?.showModal()
  
  try {
    // Generate public share link
    const response = await api.post(`/psychology/psikograms/${item.id}/share`)
    
    console.log('Share API Response:', response)
    
    // Try different response structures
    let token = null
    if (response.data) {
      token = response.data.token || 
              response.data.shareToken || 
              response.data.data?.token || 
              response.data.data?.shareToken
    } else if (response.token || response.shareToken) {
      token = response.token || response.shareToken
    }
    
    console.log('Extracted token:', token)
    
    if (!token) {
      throw new Error('Token tidak ditemukan dalam response')
    }
    
    // Build public URL
    const baseUrl = window.location.origin
    shareLink.value = `${baseUrl}/public/psikogram/${token}`
    console.log('Share link generated:', shareLink.value)
  } catch (error) {
    console.error('Error generating share link:', error)
    shareLink.value = `Error: ${error.message || 'Gagal generate link'}`
    showError(error.message || 'Gagal generate link')
  } finally {
    generatingLink.value = false
  }
}

const copyShareLink = async () => {
  try {
    await navigator.clipboard.writeText(shareLink.value)
    showSuccess('Link berhasil disalin ke clipboard')
  } catch (error) {
    console.error('Error copying to clipboard:', error)
  }
}

const shareViaWhatsApp = () => {
  const phone = selectedPsikogram.value?.participant?.phone
  if (!phone) {
    alert('Nomor WhatsApp peserta tidak tersedia')
    return
  }
  
  // Clean phone number (remove non-digits)
  const cleanPhone = phone.replace(/\D/g, '')
  
  // Add country code if not present
  const phoneWithCode = cleanPhone.startsWith('62') ? cleanPhone : '62' + cleanPhone.replace(/^0/, '')
  
  // Prepare message with clickable link
  const participantName = selectedPsikogram.value?.participant?.name || 'Peserta'
  const message = encodeURIComponent(
    `Halo ${participantName},\n\n` +
    `Berikut adalah link untuk mengakses hasil psikogram Anda:\n\n` +
    `🔗 ${shareLink.value}\n\n` +
    `Silakan klik link di atas untuk melihat dan mendownload hasil psikogram Anda.\n\n` +
    `Terima kasih.`
  )
  
  // Open WhatsApp
  const waUrl = `https://wa.me/${phoneWithCode}?text=${message}`
  window.open(waUrl, '_blank')
}

// Refresh data
const refresh = () => {
  loadPsikograms()
}

onMounted(() => {
  loadPsikograms()
})
</script>
