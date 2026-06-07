<route lang="yaml">
meta:
  title: Pasien
  layout: default
  requiresModule: psychology
</route>

<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-3xl font-bold">Pasien</h1>
        <p class="text-base-content/60 mt-1">Kelola data pasien tes psikologi</p>
      </div>
      <button class="btn btn-primary" @click="openCreateModal">
        <IconPlus class="w-4 h-4 mr-2" />
        Tambah Pasien
      </button>
    </div>

    <!-- Filters -->
    <div class="card bg-base-100 shadow-xl mb-6">
      <div class="card-body">
        <div class="flex flex-col md:flex-row gap-4">
          <div class="form-control flex-1">
            <input
              v-model="filters.search"
              type="text"
              placeholder="Cari nama, email, atau telepon..."
              class="input input-bordered w-full"
              @input="debouncedSearch"
            />
          </div>
          <select v-model="filters.limit" class="select select-bordered w-full md:w-24" @change="handleSearch">
            <option :value="10">10</option>
            <option :value="25">25</option>
            <option :value="50">50</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Patients Table -->
    <div v-else-if="patients.length > 0" class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <div class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>Pasien</th>
                <th>Kontak</th>
                <th>Jenis Kelamin</th>
                <th>Tanggal Lahir</th>
                <th class="text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="patient in patients" :key="patient.id">
                <td>
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-primary text-primary-content flex items-center justify-center shrink-0">
                      <span class="text-lg font-bold leading-none">{{ (patient.fullName || patient.name)?.charAt(0).toUpperCase() }}</span>
                    </div>
                    <div>
                      <div class="font-bold uppercase">{{ patient.fullName || patient.name }}</div>
                      <div class="text-sm text-base-content/60">{{ patient.personalData?.occupation || patient.occupation || '-' }}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div class="space-y-1">
                    <div v-if="patient.email" class="text-sm flex items-center gap-1">
                      <IconMail class="w-4 h-4 text-base-content/60" />
                      {{ patient.email }}
                    </div>
                    <div v-if="patient.phone" class="text-sm flex items-center gap-1">
                      <IconPhone class="w-4 h-4 text-base-content/60" />
                      {{ patient.phone }}
                    </div>
                  </div>
                </td>
                <td>
                  <div class="badge badge-ghost badge-sm">
                    {{ getSexLabel(patient.sex) }}
                  </div>
                </td>
                <td>
                  <div class="text-sm">{{ formatBirthDate(patient.birthDate) }}</div>
                  <div v-if="patient.birthDate" class="text-xs text-base-content/60">
                    {{ calculateAge(patient.birthDate) }} tahun
                  </div>
                </td>
                <td class="text-center">
                  <div class="flex items-center justify-center gap-1">
                    <button
                      class="btn btn-xs btn-ghost tooltip"
                      data-tip="Detail"
                      @click="viewPatient(patient)"
                    >
                      <IconEye class="w-4 h-4" />
                    </button>
                    <button
                      class="btn btn-xs btn-ghost tooltip"
                      data-tip="Edit"
                      @click="openEditModal(patient)"
                    >
                      <IconEdit class="w-4 h-4" />
                    </button>
                    <button
                      class="btn btn-xs btn-ghost text-error tooltip"
                      data-tip="Hapus"
                      @click="confirmDelete(patient)"
                    >
                      <IconTrash class="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-base-300">
          <div class="text-sm text-base-content/60">
            Menampilkan {{ paginationInfo }}
          </div>
          <div class="join">
            <button
              class="join-item btn btn-sm"
              :disabled="pagination.page === 1"
              @click="changePage(pagination.page - 1)"
            >
              «
            </button>
            <button class="join-item btn btn-sm btn-active">
              {{ pagination.page }}
            </button>
            <button
              class="join-item btn btn-sm"
              :disabled="pagination.page >= pagination.totalPages"
              @click="changePage(pagination.page + 1)"
            >
              »
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="card bg-base-100 shadow-xl">
      <div class="card-body text-center py-12">
        <IconUserOff class="w-16 h-16 mx-auto text-base-content/30 mb-4" />
        <h3 class="text-xl font-semibold mb-2">Belum Ada Pasien</h3>
        <p class="text-base-content/60 mb-4">Mulai dengan menambahkan pasien pertama</p>
        <button class="btn btn-primary" @click="openCreateModal">
          <IconPlus class="w-4 h-4 mr-2" />
          Tambah Pasien
        </button>
      </div>
    </div>

    <!-- Patient Form Modal -->
    <PatientFormModal
      ref="patientFormModal"
      :patient="editingPatient"
      :loading="modalLoading"
      @submit="handleSubmit"
      @close="handleModalClose"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconEye,
  IconMail,
  IconPhone,
  IconUserOff
} from '@tabler/icons-vue'
import { usePatients } from '@/composables/psychology'
import { useDialog } from '@/composables/core/useApi'
import PatientFormModal from '@/components/psychology/PatientFormModal.vue'

const router = useRouter()
const dialog = useDialog()

const {
  patients,
  loading,
  pagination,
  fetchPatients,
  createPatient,
  updatePatient,
  deletePatient,
  formatBirthDate,
  calculateAge,
  getSexLabel
} = usePatients()

const filters = ref({
  search: '',
  page: 1,
  limit: 10
})

const editingPatient = ref(null)
const modalLoading = ref(false)
const patientFormModal = ref(null)
let searchTimeout = null

const paginationInfo = computed(() => {
  const start = (pagination.value.page - 1) * filters.value.limit + 1
  const end = Math.min(pagination.value.page * filters.value.limit, pagination.value.total)
  return `${start}-${end} dari ${pagination.value.total} pasien`
})

const handleSearch = () => {
  filters.value.page = 1
  loadPatients()
}

const debouncedSearch = () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(handleSearch, 500)
}

const loadPatients = async () => {
  await fetchPatients(filters.value)
}

const changePage = (page) => {
  filters.value.page = page
  loadPatients()
}

const openCreateModal = () => {
  editingPatient.value = null
  patientFormModal.value?.resetForm()
  patientFormModal.value?.openModal()
}

const openEditModal = (patient) => {
  editingPatient.value = patient
  patientFormModal.value?.openModal()
}

const handleModalClose = () => {
  editingPatient.value = null
}

const handleSubmit = async (patientData) => {
  modalLoading.value = true
  try {
    if (editingPatient.value) {
      await updatePatient(editingPatient.value.id, patientData)
    } else {
      await createPatient(patientData)
    }
    patientFormModal.value?.closeModal()
    editingPatient.value = null
    await loadPatients()
  } catch (error) {
    console.error('Error saving patient:', error)
  } finally {
    modalLoading.value = false
  }
}

const viewPatient = (patient) => {
  router.push(`/psychology/patients/${patient.id}`)
}

const confirmDelete = async (patient) => {
  const confirmed = await dialog.confirm({
    title: 'Hapus Pasien',
    message: `Apakah Anda yakin ingin menghapus "${patient.name}"? Tindakan ini tidak dapat dibatalkan.`,
    type: 'danger',
    confirmText: 'Hapus',
    cancelText: 'Batal'
  })

  if (confirmed) {
    try {
      await deletePatient(patient.id)
      await loadPatients()
    } catch (error) {
      console.error('Error deleting patient:', error)
    }
  }
}

onMounted(() => {
  loadPatients()
})
</script>
