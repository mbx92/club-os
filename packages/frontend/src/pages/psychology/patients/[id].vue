<route lang="yaml">
meta:
  title: Detail Pasien
  layout: default
  requiresModule: psychology
</route>

<template>
  <div>
    <!-- Loading -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Patient Details -->
    <div v-else-if="patient">
      <!-- Header -->
      <div class="flex items-center gap-4 mb-6">
        <button class="btn btn-ghost btn-circle" @click="goBack">
          <IconArrowLeft class="w-5 h-5" />
        </button>
        <div class="flex-1">
          <h1 class="text-3xl font-bold">{{ patient.fullName || patient.name }}</h1>
          <p class="text-base-content/60 mt-1">Detail pasien</p>
        </div>
        <div class="flex gap-2">
          <button class="btn btn-outline" @click="openEditModal">
            <IconEdit class="w-4 h-4 mr-2" />
            Edit
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Left Column - Personal Info -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Personal Information -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title mb-4">Informasi Pribadi</h2>
              
              <div class="flex items-start gap-4 mb-6 pb-6 border-b border-base-300">
                <div class="w-20 h-20 rounded-full bg-primary text-primary-content flex items-center justify-center shrink-0">
                  <span class="text-3xl font-bold leading-none">{{ (patient.fullName || patient.name)?.charAt(0).toUpperCase() }}</span>
                </div>
                <div>
                  <h3 class="text-xl font-bold uppercase">{{ patient.fullName || patient.name }}</h3>
                  <p class="text-base-content/60 text-sm mt-1">{{ patient.personalData?.occupation || patient.occupation || '-' }}</p>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div v-if="patient.email">
                  <div class="text-sm text-base-content/60">Email</div>
                  <div class="font-medium flex items-center gap-2 mt-1">
                    <IconMail class="w-4 h-4" />
                    {{ patient.email }}
                  </div>
                </div>

                <div v-if="patient.phone">
                  <div class="text-sm text-base-content/60">Telepon</div>
                  <div class="font-medium flex items-center gap-2 mt-1">
                    <IconPhone class="w-4 h-4" />
                    {{ patient.phone }}
                  </div>
                </div>

                <div v-if="patient.birthDate">
                  <div class="text-sm text-base-content/60">Tanggal Lahir</div>
                  <div class="font-medium mt-1">
                    {{ formatBirthDate(patient.birthDate) }}
                    <span class="text-base-content/60">({{ calculateAge(patient.birthDate) }} tahun)</span>
                  </div>
                </div>

                <div v-if="patient.sex">
                  <div class="text-sm text-base-content/60">Jenis Kelamin</div>
                  <div class="font-medium mt-1">{{ getSexLabel(patient.sex) }}</div>
                </div>

                <div v-if="patient.personalData?.education || patient.education">
                  <div class="text-sm text-base-content/60">Pendidikan</div>
                  <div class="font-medium mt-1">{{ patient.personalData?.education || patient.education }}</div>
                </div>

                <div v-if="patient.personalData?.occupation || patient.occupation">
                  <div class="text-sm text-base-content/60">Pekerjaan</div>
                  <div class="font-medium mt-1">{{ patient.personalData?.occupation || patient.occupation }}</div>
                </div>

                <div v-if="patient.personalData?.corporate || patient.corporate">
                  <div class="text-sm text-base-content/60">Perusahaan/Instansi</div>
                  <div class="font-medium mt-1">{{ patient.personalData?.corporate || patient.corporate }}</div>
                </div>

                <div v-if="patient.address" class="md:col-span-2">
                  <div class="text-sm text-base-content/60">Alamat</div>
                  <div class="font-medium mt-1">{{ patient.address }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Test History -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title mb-4">Riwayat Tes</h2>
              
              <div v-if="history && history.length > 0" class="overflow-x-auto">
                <table class="table table-zebra">
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      <th>Paket</th>
                      <th>Jenis Tes</th>
                      <th>Status</th>
                      <th class="text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in history" :key="item.order?.id">
                      <td class="text-sm">{{ formatDate(item.order?.createdAt) }}</td>
                      <td>{{ item.package?.name || '-' }}</td>
                      <td>
                        <div class="flex flex-wrap gap-1">
                          <span 
                            v-for="session in item.sessions" 
                            :key="session.id"
                            class="badge badge-sm"
                            :class="session.status === 'completed' ? 'badge-success' : 'badge-outline'"
                          >
                            {{ session.testType?.code }}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div class="badge badge-sm" :class="getStatusClass(item.order?.status)">
                          {{ getStatusLabel(item.order?.status) }}
                        </div>
                      </td>
                      <td class="text-center">
                        <router-link 
                          :to="`/psychology/orders/${item.order?.id}`"
                          class="btn btn-xs btn-ghost"
                        >
                          <IconEye class="w-4 h-4" />
                        </router-link>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-else class="text-center py-8 text-base-content/60">
                <IconClipboardOff class="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>Belum ada riwayat tes</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column - Quick Info -->
        <div class="space-y-6">
          <!-- Stats -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title mb-4">Statistik</h2>
              <div class="space-y-4">
                <div>
                  <div class="text-sm text-base-content/60">Total Order</div>
                  <div class="text-2xl font-bold">{{ stats?.totalOrders || history?.length || 0 }}</div>
                </div>
                <div>
                  <div class="text-sm text-base-content/60">Tes Selesai</div>
                  <div class="text-2xl font-bold text-success">
                    {{ completedTests }}
                  </div>
                </div>
                <div>
                  <div class="text-sm text-base-content/60">Terdaftar Sejak</div>
                  <div class="font-medium">{{ formatDate(patient.createdAt) }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title mb-4">Aksi Cepat</h2>
              <div class="space-y-2">
                <router-link 
                  :to="`/psychology/orders?patientId=${patient.id}`"
                  class="btn btn-block btn-outline justify-start"
                >
                  <IconShoppingCart class="w-4 h-4" />
                  Buat Pesanan
                </router-link>
                <button class="btn btn-block btn-outline justify-start" @click="openEditModal">
                  <IconEdit class="w-4 h-4" />
                  Edit Pasien
                </button>
              </div>
            </div>
          </div>

          <!-- Notes -->
          <div v-if="patient.personalData?.notes || patient.notes" class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title mb-4">Catatan</h2>
              <p class="text-base-content/80 whitespace-pre-line">{{ patient.personalData?.notes || patient.notes }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Patient Form Modal -->
      <PatientFormModal
        ref="patientFormModal"
        :patient="patient"
        :loading="modalLoading"
        @submit="handleUpdate"
        @close="handleModalClose"
      />
    </div>

    <!-- Not Found -->
    <div v-else class="card bg-base-100 shadow-xl">
      <div class="card-body text-center py-12">
        <IconUserOff class="w-16 h-16 mx-auto text-error mb-4" />
        <h3 class="text-xl font-semibold mb-2">Pasien Tidak Ditemukan</h3>
        <p class="text-base-content/60 mb-4">Pasien yang Anda cari tidak ada atau telah dihapus.</p>
        <button class="btn btn-primary" @click="goBack">
          <IconArrowLeft class="w-4 h-4 mr-2" />
          Kembali
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  IconArrowLeft,
  IconEdit,
  IconMail,
  IconPhone,
  IconEye,
  IconShoppingCart,
  IconUserOff,
  IconClipboardOff
} from '@tabler/icons-vue'
import { usePatients, useOrders } from '@/composables/psychology'
import PatientFormModal from '@/components/psychology/PatientFormModal.vue'

const route = useRoute()
const router = useRouter()

const {
  patient,
  loading: patientLoading,
  getPatientById,
  getPatientHistory,
  updatePatient,
  formatBirthDate,
  calculateAge,
  getSexLabel
} = usePatients()

const { getPaymentStatusClass: getStatusClass, getPaymentStatusLabel: getStatusLabel, formatDate } = useOrders()

const history = ref([])
const stats = ref(null)
const historyLoading = ref(false)
const modalLoading = ref(false)
const patientFormModal = ref(null)

// Combined loading state
const loading = computed(() => patientLoading.value || historyLoading.value)

const completedTests = computed(() => {
  // Use stats from API if available
  if (stats.value?.completedSessions !== undefined) {
    return stats.value.completedSessions
  }
  // Fallback: count completed sessions manually
  if (!history.value || !Array.isArray(history.value)) return 0
  return history.value.reduce((count, item) => {
    const completedSessions = item.sessions?.filter(s => s.status === 'completed')?.length || 0
    return count + completedSessions
  }, 0)
})

const loadPatient = async () => {
  const patientId = route.params.id
  try {
    await getPatientById(patientId)
    
    // Load history separately
    historyLoading.value = true
    try {
      const response = await getPatientHistory(patientId)
      // API returns { patient, history, stats, pagination }
      history.value = response?.history || response || []
      stats.value = response?.stats || null
    } catch (err) {
      console.error('Error loading patient history:', err)
      history.value = []
      stats.value = null
    } finally {
      historyLoading.value = false
    }
  } catch (error) {
    console.error('Error loading patient:', error)
  }
}

const goBack = () => {
  router.push('/psychology/patients')
}

const openEditModal = () => {
  patientFormModal.value?.openModal()
}

const handleModalClose = () => {
  // Optional refresh
}

const handleUpdate = async (patientData) => {
  modalLoading.value = true
  try {
    await updatePatient(patient.value.id, patientData)
    patientFormModal.value?.closeModal()
    await loadPatient()
  } catch (error) {
    console.error('Error updating patient:', error)
  } finally {
    modalLoading.value = false
  }
}

onMounted(() => {
  loadPatient()
})
</script>
