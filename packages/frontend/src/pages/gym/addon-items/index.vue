<route lang="yaml">
meta:
  title: Add-on Items
  layout: default
</route>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-3xl font-bold">Add-on Items</h1>
        <p class="text-base-content/60 mt-1">Kelola item berbayar saat check-in seperti sewa handuk, loker, dll.</p>
      </div>
      <button class="btn btn-primary" @click="openCreateModal">
        <IconPlus class="w-4 h-4 mr-2" />
        Tambah Item
      </button>
    </div>

    <!-- Info Alert -->
    <div class="alert alert-info mb-6">
      <IconInfoCircle class="w-5 h-5 flex-shrink-0" />
      <div>
        <strong>Item add-on</strong> adalah layanan berbayar yang bisa ditambahkan saat kasir melakukan check-in member.
        Contoh: Sewa Handuk, Sewa Loker, Sewa Gym Outfit. Item ini menggunakan <code>serviceType: custom</code>.
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center items-center py-16">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Items Grid -->
    <div v-else-if="items.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      <div
        v-for="item in items"
        :key="item.id"
        class="card bg-base-100 shadow-md border border-base-200"
        :class="{ 'opacity-60': !item.isActive }"
      >
        <div class="card-body p-4">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <IconShoppingBag class="w-5 h-5 text-primary flex-shrink-0" />
                <h3 class="font-bold text-lg leading-tight">{{ item.name }}</h3>
              </div>
              <p v-if="item.description" class="text-sm text-base-content/60 mt-1">{{ item.description }}</p>
            </div>
            <input
              type="checkbox"
              class="toggle toggle-success toggle-sm ml-2"
              :checked="item.isActive"
              :disabled="actionLoading"
              @change="handleToggle(item)"
            />
          </div>

          <div class="flex flex-wrap gap-2 mt-3">
            <div class="badge badge-primary badge-lg font-bold">
              {{ formatCurrency(item.price) }}
            </div>
            <div class="badge badge-ghost badge-sm">
              {{ item.durationType === 'session_based' ? `${item.sessions || 1} sesi` : `${item.validityDays || 1} hari` }}
            </div>
            <div v-if="item.allowWalkIn" class="badge badge-outline badge-sm badge-info">Walk-in OK</div>
          </div>

          <div class="card-actions justify-end mt-3 pt-2 border-t border-base-200">
            <button class="btn btn-xs btn-ghost" @click="openEditModal(item)" :disabled="actionLoading">
              <IconEdit class="w-3.5 h-3.5 mr-1" /> Edit
            </button>
            <button class="btn btn-xs btn-ghost text-error" @click="confirmDelete(item)" :disabled="actionLoading">
              <IconTrash class="w-3.5 h-3.5 mr-1" /> Hapus
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="card bg-base-100 shadow-xl">
      <div class="card-body items-center text-center py-16">
        <IconShoppingBag class="w-16 h-16 text-base-content/20 mb-4" />
        <h3 class="text-xl font-semibold mb-2">Belum ada item add-on</h3>
        <p class="text-base-content/60 mb-6 max-w-sm">
          Buat item pertama seperti "Sewa Handuk" agar kasir bisa menambahkannya saat check-in.
        </p>
        <button class="btn btn-primary" @click="openCreateModal">
          <IconPlus class="w-4 h-4 mr-2" />
          Tambah Item Pertama
        </button>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <dialog ref="formModal" class="modal">
      <div class="modal-box w-11/12 max-w-md">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-xl font-bold">{{ editingItem ? 'Edit Item' : 'Tambah Item Baru' }}</h3>
          <button type="button" class="btn btn-sm btn-circle btn-ghost" @click="closeModal">✕</button>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <!-- Name -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-semibold">Nama Item <span class="text-error">*</span></span>
            </label>
            <input
              v-model="form.name"
              type="text"
              placeholder="cth: Sewa Handuk"
              class="input input-bordered w-full"
              :class="{ 'input-error': formErrors.name }"
              autofocus
            />
            <label v-if="formErrors.name" class="label">
              <span class="label-text-alt text-error">{{ formErrors.name }}</span>
            </label>
          </div>

          <!-- Price -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-semibold">Harga (Rp) <span class="text-error">*</span></span>
            </label>
            <CurrencyInput
              v-model="form.price"
              placeholder="5000"
              :input-class="formErrors.price ? 'input input-bordered w-full input-error' : 'input input-bordered w-full'"
            />
            <label v-if="formErrors.price" class="label">
              <span class="label-text-alt text-error">{{ formErrors.price }}</span>
            </label>
          </div>

          <!-- Duration Type -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-semibold">Tipe Durasi</span>
            </label>
            <select v-model="form.durationType" class="select select-bordered w-full">
              <option value="session_based">Per Sesi (session_based)</option>
              <option value="time_based">Per Hari (time_based)</option>
            </select>
          </div>

          <!-- Sessions / ValidityDays -->
          <div class="grid grid-cols-2 gap-3">
            <div class="form-control">
              <label class="label">
                <span class="label-text font-semibold">Jumlah Sesi</span>
              </label>
              <input
                v-model.number="form.sessions"
                type="number"
                min="1"
                class="input input-bordered w-full"
              />
            </div>
            <div class="form-control">
              <label class="label">
                <span class="label-text font-semibold">Hari Berlaku</span>
              </label>
              <input
                v-model.number="form.validityDays"
                type="number"
                min="1"
                class="input input-bordered w-full"
              />
            </div>
          </div>

          <!-- Description -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-semibold">Deskripsi</span>
            </label>
            <textarea
              v-model="form.description"
              rows="2"
              placeholder="Opsional..."
              class="textarea textarea-bordered w-full"
            ></textarea>
          </div>

          <!-- Flags -->
          <div class="flex flex-wrap gap-4">
            <label class="label cursor-pointer gap-2">
              <input type="checkbox" v-model="form.allowWalkIn" class="checkbox checkbox-primary checkbox-sm" />
              <span class="label-text">Tersedia untuk Walk-in</span>
            </label>
            <label class="label cursor-pointer gap-2">
              <input type="checkbox" v-model="form.isActive" class="checkbox checkbox-success checkbox-sm" />
              <span class="label-text">Aktif</span>
            </label>
          </div>

          <div class="modal-action mt-4">
            <button type="button" class="btn btn-ghost" @click="closeModal">Batal</button>
            <button type="submit" class="btn btn-primary" :disabled="submitLoading">
              <span v-if="submitLoading" class="loading loading-spinner loading-sm"></span>
              <span v-else>{{ editingItem ? 'Simpan' : 'Tambah' }}</span>
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeModal">close</button>
      </form>
    </dialog>

    <!-- Delete Confirmation -->
    <dialog ref="deleteModal" class="modal">
      <div class="modal-box max-w-sm">
        <h3 class="font-bold text-lg mb-2">Hapus Item</h3>
        <p class="py-3">
          Yakin ingin menghapus <span class="font-semibold">{{ deletingItem?.name }}</span>?
          Tindakan ini tidak dapat dibatalkan.
        </p>
        <div class="modal-action">
          <button class="btn btn-ghost" @click="deleteModal?.close()">Batal</button>
          <button class="btn btn-error" :disabled="actionLoading" @click="handleDelete">
            <span v-if="actionLoading" class="loading loading-spinner loading-sm"></span>
            <span v-else>Hapus</span>
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useServicePlans } from '@/composables/gym/service-management/useServicePlans.js'
import { useCurrency } from '@/composables/core/useCurrency'
import CurrencyInput from '@/components/shared/CurrencyInput.vue'
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconShoppingBag,
  IconInfoCircle
} from '@tabler/icons-vue'

const { plans, loading, fetchPlans, createPlan, updatePlan, deletePlan, togglePlanActive } = useServicePlans()
const { formatCurrency } = useCurrency()

const items = ref([])
const formModal = ref(null)
const deleteModal = ref(null)
const editingItem = ref(null)
const deletingItem = ref(null)
const actionLoading = ref(false)
const submitLoading = ref(false)

const defaultForm = () => ({
  name: '',
  price: 0,
  durationType: 'session_based',
  sessions: 1,
  validityDays: 1,
  description: '',
  allowWalkIn: true,
  isActive: true
})

const form = ref(defaultForm())
const formErrors = ref({})

const loadItems = async () => {
  try {
    const result = await fetchPlans({ serviceType: 'custom', limit: 100, sortBy: 'displayOrder', sortOrder: 'ASC' })
    items.value = result?.data || []
  } catch {
    items.value = []
  }
}

const validateForm = () => {
  formErrors.value = {}
  if (!form.value.name?.trim()) formErrors.value.name = 'Nama item wajib diisi'
  if (!form.value.price && form.value.price !== 0) formErrors.value.price = 'Harga wajib diisi'
  if (form.value.price < 0) formErrors.value.price = 'Harga tidak boleh negatif'
  return Object.keys(formErrors.value).length === 0
}

const openCreateModal = () => {
  editingItem.value = null
  form.value = defaultForm()
  formErrors.value = {}
  formModal.value?.showModal()
}

const openEditModal = (item) => {
  editingItem.value = item
  form.value = {
    name: item.name,
    price: item.price,
    durationType: item.durationType || 'session_based',
    sessions: item.sessions || 1,
    validityDays: item.validityDays || 1,
    description: item.description || '',
    allowWalkIn: item.allowWalkIn ?? true,
    isActive: item.isActive ?? true
  }
  formErrors.value = {}
  formModal.value?.showModal()
}

const closeModal = () => {
  formModal.value?.close()
  editingItem.value = null
  form.value = defaultForm()
  formErrors.value = {}
}

const handleSubmit = async () => {
  if (!validateForm()) return
  submitLoading.value = true
  try {
    const payload = {
      ...form.value,
      serviceType: 'custom',
      currency: 'IDR'
    }
    if (editingItem.value) {
      await updatePlan(editingItem.value.id, payload)
    } else {
      await createPlan(payload)
    }
    await loadItems()
    closeModal()
  } catch {
    // error handled by composable
  } finally {
    submitLoading.value = false
  }
}

const handleToggle = async (item) => {
  actionLoading.value = true
  try {
    await togglePlanActive(item.id, !item.isActive)
    await loadItems()
  } catch {
    // error handled by composable
  } finally {
    actionLoading.value = false
  }
}

const confirmDelete = (item) => {
  deletingItem.value = item
  deleteModal.value?.showModal()
}

const handleDelete = async () => {
  if (!deletingItem.value) return
  actionLoading.value = true
  try {
    await deletePlan(deletingItem.value.id)
    await loadItems()
    deleteModal.value?.close()
    deletingItem.value = null
  } catch {
    // error handled by composable
  } finally {
    actionLoading.value = false
  }
}

onMounted(() => loadItems())
</script>
