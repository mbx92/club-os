<route lang="yaml">
meta:
  title: Paket Tes
  layout: default
  requiresModule: psychology
</route>

<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-3xl font-bold">Paket Tes</h1>
        <p class="text-base-content/60 mt-1">Kelola paket tes psikologi</p>
      </div>
      <button class="btn btn-primary" @click="openCreateModal">
        <IconPlus class="w-4 h-4 mr-2" />
        Tambah Paket
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Packages Grid -->
    <div v-else-if="packages.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div 
        v-for="pkg in packages" 
        :key="pkg.id"
        class="card bg-base-100 shadow-xl"
        :class="{ 'opacity-60': !pkg.isActive }"
      >
        <div class="card-body">
          <!-- Package Header -->
          <div class="flex items-start justify-between mb-2">
            <div>
              <h2 class="card-title text-lg">{{ pkg.name }}</h2>
              <p class="text-sm text-base-content/60">{{ pkg.code }}</p>
              <div class="badge badge-sm mt-1" :class="getPackageTypeClass(pkg.packageType)">
                {{ getPackageTypeLabel(pkg.packageType) }}
              </div>
            </div>
            <div class="dropdown dropdown-end">
              <label tabindex="0" class="btn btn-ghost btn-sm btn-circle">
                <IconDotsVertical class="w-4 h-4" />
              </label>
              <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow-lg bg-base-100 rounded-box w-52">
                <li><a @click="openEditModal(pkg)"><IconEdit class="w-4 h-4" /> Edit</a></li>
                <li><a @click="openMetadataModal(pkg)"><IconSettings class="w-4 h-4" /> Config Metadata</a></li>
                <li><a @click="confirmDelete(pkg)" class="text-error"><IconTrash class="w-4 h-4" /> Hapus</a></li>
              </ul>
            </div>
          </div>

          <!-- Description -->
          <p class="text-sm text-base-content/60 mb-4">
            {{ pkg.description || 'Tidak ada deskripsi' }}
          </p>

          <!-- Test Types from items -->
          <div class="mb-4">
            <p class="text-xs text-base-content/60 mb-2">Termasuk ({{ pkg.testCount }} tes):</p>
            <div class="flex flex-wrap gap-2">
              <span 
                v-for="item in pkg.items" 
                :key="item.id"
                class="badge badge-outline badge-sm"
              >
                {{ item.testType?.name || item.testType?.code }}
              </span>
              <span v-if="!pkg.items?.length" class="text-sm text-base-content/40 italic">
                Tidak ada tes
              </span>
            </div>
          </div>

          <!-- Pricing -->
          <div class="bg-base-200 rounded-lg p-3 mb-4">
            <div v-if="pkg.discountType !== 'none' && parseFloat(pkg.discountValue) > 0" class="space-y-1">
              <div class="flex justify-between text-sm">
                <span class="text-base-content/60 line-through">{{ formatPrice(pkg.basePrice) }}</span>
                <span class="badge badge-success badge-sm">
                  <template v-if="pkg.discountType === 'percentage'">
                    Diskon {{ pkg.discountValue }}%
                  </template>
                  <template v-else>
                    Diskon {{ formatPrice(pkg.discountValue) }}
                  </template>
                </span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-lg font-bold text-primary">{{ formatPrice(pkg.finalPrice) }}</span>
              </div>
            </div>
            <div v-else class="flex justify-between items-center">
              <span class="text-lg font-bold">{{ formatPrice(pkg.finalPrice) }}</span>
            </div>
          </div>

          <!-- Info Row -->
          <div class="flex items-center gap-4 text-sm text-base-content/60 mb-4">
            <div class="flex items-center gap-1">
              <IconClock class="w-4 h-4" />
              <span>{{ pkg.estimatedDuration }} menit</span>
            </div>
            <div class="flex items-center gap-1">
              <IconCalendar class="w-4 h-4" />
              <span>Berlaku {{ pkg.validityDays }} hari</span>
            </div>
          </div>

          <!-- Status Toggle -->
          <div class="card-actions justify-between items-center pt-4 border-t border-base-300">
            <label class="label cursor-pointer gap-2">
              <input
                type="checkbox"
                :checked="pkg.isActive"
                class="toggle toggle-sm toggle-success"
                @change="togglePackage(pkg)"
              />
              <span class="label-text text-sm">{{ pkg.isActive ? 'Aktif' : 'Nonaktif' }}</span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="card bg-base-100 shadow-xl">
      <div class="card-body text-center py-12">
        <IconPackageOff class="w-16 h-16 mx-auto text-base-content/30 mb-4" />
        <h3 class="text-xl font-semibold mb-2">Belum Ada Paket</h3>
        <p class="text-base-content/60 mb-4">Buat paket tes pertama Anda</p>
        <button class="btn btn-primary" @click="openCreateModal">
          <IconPlus class="w-4 h-4 mr-2" />
          Tambah Paket
        </button>
      </div>
    </div>

    <!-- Package Form Modal -->
    <PackageFormModal
      ref="packageFormModal"
      :package-data="editingPackage"
      :test-types="testTypes"
      :loading="modalLoading"
      @submit="handleSubmit"
      @close="handleModalClose"
    />

    <!-- Package Metadata Modal -->
    <PackageMetadataModal
      ref="packageMetadataModal"
      :package-data="metadataPackage"
      :loading="metadataLoading"
      @submit="handleMetadataSubmit"
      @close="handleMetadataModalClose"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconDotsVertical,
  IconClock,
  IconCalendar,
  IconPackageOff,
  IconSettings
} from '@tabler/icons-vue'
import { usePackages, useTestTypes } from '@/composables/psychology'
import { useDialog } from '@/composables/core/useApi'
import PackageFormModal from '@/components/psychology/PackageFormModal.vue'
import PackageMetadataModal from '@/components/psychology/PackageMetadataModal.vue'

const dialog = useDialog()

const {
  packages,
  loading,
  fetchPackages,
  getPackageById,
  createPackage,
  updatePackage,
  deletePackage,
  getPackageTypeClass,
  getPackageTypeLabel,
  formatPrice,
  calculateDiscountPercent
} = usePackages()

const { testTypes, fetchTestTypes } = useTestTypes()

const editingPackage = ref(null)
const modalLoading = ref(false)
const packageFormModal = ref(null)

// Metadata modal refs
const metadataPackage = ref(null)
const metadataLoading = ref(false)
const packageMetadataModal = ref(null)

const loadData = async () => {
  await Promise.all([
    fetchPackages(),
    fetchTestTypes()
  ])
}

const openCreateModal = () => {
  editingPackage.value = null
  packageFormModal.value?.resetForm()
  packageFormModal.value?.openModal()
}

const openEditModal = (pkg) => {
  editingPackage.value = pkg
  packageFormModal.value?.openModal()
}

const handleModalClose = () => {
  editingPackage.value = null
}

const openMetadataModal = async (pkg) => {
  metadataLoading.value = true
  packageMetadataModal.value?.openModal()
  
  try {
    // Fetch full package detail to get testType.config
    const fullPackage = await getPackageById(pkg.id)
    metadataPackage.value = fullPackage
  } catch (error) {
    console.error('Error fetching package details:', error)
    metadataPackage.value = pkg // fallback to basic data
  } finally {
    metadataLoading.value = false
  }
}

const handleMetadataModalClose = () => {
  metadataPackage.value = null
}

const handleMetadataSubmit = async ({ packageId, metadata }) => {
  metadataLoading.value = true
  try {
    await updatePackage(packageId, { metadata })
    packageMetadataModal.value?.closeModal()
    metadataPackage.value = null
    await fetchPackages()
  } catch (error) {
    console.error('Error saving metadata:', error)
  } finally {
    metadataLoading.value = false
  }
}

const handleSubmit = async (packageData) => {
  modalLoading.value = true
  try {
    if (editingPackage.value) {
      await updatePackage(editingPackage.value.id, packageData)
    } else {
      await createPackage(packageData)
    }
    packageFormModal.value?.closeModal()
    editingPackage.value = null
    await fetchPackages()
  } catch (error) {
    console.error('Error saving package:', error)
  } finally {
    modalLoading.value = false
  }
}

const togglePackage = async (pkg) => {
  try {
    await updatePackage(pkg.id, { isActive: !pkg.isActive })
    await fetchPackages()
  } catch (error) {
    console.error('Error toggling package:', error)
  }
}

const confirmDelete = async (pkg) => {
  const confirmed = await dialog.confirm({
    title: 'Hapus Paket',
    message: `Apakah Anda yakin ingin menghapus paket "${pkg.name}"?`,
    type: 'danger',
    confirmText: 'Hapus',
    cancelText: 'Batal'
  })

  if (confirmed) {
    try {
      await deletePackage(pkg.id)
    } catch (error) {
      console.error('Error deleting package:', error)
    }
  }
}

onMounted(() => {
  loadData()
})
</script>
