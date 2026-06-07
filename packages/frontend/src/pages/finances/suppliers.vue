<route lang="yaml">
meta:
  title: Kelola Supplier
  layout: default
</route>

<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div class="flex items-center gap-3">
        <button class="btn btn-ghost btn-sm" @click="router.back()">
          <IconArrowLeft class="w-4 h-4" />
          Kembali
        </button>
        <div>
          <h1 class="text-3xl font-bold">Kelola Supplier</h1>
          <p class="text-base-content/60 mt-1">Kelola data master supplier / vendor</p>
        </div>
      </div>
      <button class="btn btn-primary" @click="openCreateModal">
        <IconPlus class="w-4 h-4 mr-2" />
        Tambah Supplier
      </button>
    </div>

    <!-- Filters -->
    <div class="card bg-base-100 shadow-xl mb-6">
      <div class="card-body">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Search -->
          <div class="form-control lg:col-span-2">
            <label class="label">
              <span class="label-text font-medium">Pencarian</span>
            </label>
            <label class="input input-bordered flex items-center gap-2">
              <IconSearch class="w-4 h-4 opacity-60 shrink-0" />
              <input
                v-model="filters.search"
                type="text"
                placeholder="Nama, kode, kontak, email, telepon..."
                class="grow"
                @input="debouncedSearch"
              />
              <button v-if="filters.search" @click="filters.search = ''; handleSearch()" class="btn btn-ghost btn-xs btn-circle">
                <IconX class="w-3 h-3" />
              </button>
            </label>
          </div>

          <!-- Status -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Status</span>
            </label>
            <select v-model="filters.isActive" class="select select-bordered w-full" @change="handleSearch">
              <option value="">Semua Status</option>
              <option value="true">Aktif</option>
              <option value="false">Nonaktif</option>
            </select>
          </div>

          <!-- Category -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Kategori</span>
            </label>
            <select v-model="filters.category" class="select select-bordered w-full" @change="handleSearch">
              <option value="">Semua Kategori</option>
              <option v-for="cat in categoryOptions" :key="cat" :value="cat">{{ cat }}</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Stats Summary -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="stat bg-base-100 shadow rounded-box">
        <div class="stat-title text-xs">Total Supplier</div>
        <div class="stat-value text-2xl">{{ pagination.total || suppliers.length }}</div>
      </div>
      <div class="stat bg-base-100 shadow rounded-box">
        <div class="stat-title text-xs">Aktif</div>
        <div class="stat-value text-2xl text-success">{{ suppliers.filter(s => s.isActive).length }}</div>
      </div>
      <div class="stat bg-base-100 shadow rounded-box">
        <div class="stat-title text-xs">Nonaktif</div>
        <div class="stat-value text-2xl text-error">{{ suppliers.filter(s => !s.isActive).length }}</div>
      </div>
      <div class="stat bg-base-100 shadow rounded-box">
        <div class="stat-title text-xs">Kategori</div>
        <div class="stat-value text-2xl">{{ uniqueCategories.length }}</div>
      </div>
    </div>

    <!-- Table -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body p-0">
        <!-- Loading -->
        <div v-if="loading" class="flex justify-center items-center py-16">
          <span class="loading loading-spinner loading-lg text-primary"></span>
        </div>

        <!-- Empty State -->
        <div v-else-if="!suppliers.length" class="flex flex-col items-center justify-center py-16 gap-4 text-base-content/50">
          <IconTruck class="w-16 h-16" />
          <p class="text-lg font-medium">Belum ada supplier</p>
          <p class="text-sm">Tambahkan supplier pertama Anda</p>
          <button class="btn btn-primary btn-sm" @click="openCreateModal">
            <IconPlus class="w-4 h-4 mr-1" />
            Tambah Supplier
          </button>
        </div>

        <!-- Data Table -->
        <div v-else class="overflow-x-auto">
          <table class="table table-zebra w-full">
            <thead>
              <tr>
                <th>Supplier</th>
                <th>Kontak</th>
                <th>Kategori</th>
                <th>Bank</th>
                <th>Status</th>
                <th class="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in suppliers" :key="s.id" class="hover">
                <!-- Nama + kode -->
                <td>
                  <div class="font-semibold">{{ s.name }}</div>
                  <div v-if="s.code" class="text-xs text-base-content/50 font-mono">{{ s.code }}</div>
                  <div v-if="s.city" class="text-xs text-base-content/50">{{ s.city }}<span v-if="s.province">, {{ s.province }}</span></div>
                </td>
                <!-- Kontak -->
                <td>
                  <div v-if="s.contactPerson" class="text-sm font-medium">{{ s.contactPerson }}</div>
                  <div v-if="s.email" class="text-xs text-base-content/60">{{ s.email }}</div>
                  <div v-if="s.phone" class="text-xs text-base-content/60">{{ s.phone }}</div>
                  <div v-if="!s.contactPerson && !s.email && !s.phone" class="text-xs text-base-content/30">—</div>
                </td>
                <!-- Kategori -->
                <td>
                  <span v-if="s.category" class="badge badge-outline badge-sm capitalize">{{ s.category }}</span>
                  <span v-else class="text-xs text-base-content/30">—</span>
                </td>
                <!-- Bank -->
                <td>
                  <div v-if="s.bankName" class="text-sm">{{ s.bankName }}</div>
                  <div v-if="s.bankAccountNumber" class="text-xs text-base-content/60 font-mono">{{ s.bankAccountNumber }}</div>
                  <div v-if="s.bankAccountHolder" class="text-xs text-base-content/60">{{ s.bankAccountHolder }}</div>
                  <div v-if="!s.bankName" class="text-xs text-base-content/30">—</div>
                </td>
                <!-- Status -->
                <td>
                  <label class="label cursor-pointer gap-2 justify-start p-0">
                    <input
                      type="checkbox"
                      :checked="s.isActive"
                      class="toggle toggle-sm toggle-success"
                      @change="handleToggleStatus(s)"
                    />
                    <span class="label-text text-sm">{{ s.isActive ? 'Aktif' : 'Nonaktif' }}</span>
                  </label>
                </td>
                <!-- Aksi -->
                <td class="text-right">
                  <div class="flex items-center justify-end gap-1">
                    <button class="btn btn-ghost btn-xs" @click="openDetailModal(s)" title="Detail">
                      <IconEye class="w-4 h-4" />
                    </button>
                    <button class="btn btn-ghost btn-xs" @click="openEditModal(s)" title="Edit">
                      <IconEdit class="w-4 h-4" />
                    </button>
                    <button class="btn btn-ghost btn-xs text-error" @click="handleDelete(s)" title="Hapus">
                      <IconTrash class="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="pagination.totalPages > 1" class="flex justify-between items-center p-4 border-t border-base-200">
          <span class="text-sm text-base-content/60">
            Menampilkan {{ ((filters.page - 1) * filters.limit) + 1 }}–{{ Math.min(filters.page * filters.limit, pagination.total) }} dari {{ pagination.total }} supplier
          </span>
          <div class="join">
            <button class="join-item btn btn-sm" :disabled="filters.page <= 1" @click="changePage(filters.page - 1)">«</button>
            <button
              v-for="p in visiblePages"
              :key="p"
              class="join-item btn btn-sm"
              :class="{ 'btn-active': p === filters.page, 'btn-disabled pointer-events-none': p === '...' }"
              @click="p !== '...' && changePage(p)"
            >{{ p }}</button>
            <button class="join-item btn btn-sm" :disabled="filters.page >= pagination.totalPages" @click="changePage(filters.page + 1)">»</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ─── Form Modal (Create / Edit) ─── -->
    <Teleport to="body">
      <dialog :class="['modal', { 'modal-open': showFormModal }]">
        <div class="modal-box w-11/12 max-w-3xl max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-xl font-bold">{{ selectedSupplier ? 'Edit Supplier' : 'Tambah Supplier' }}</h3>
            <button class="btn btn-ghost btn-sm btn-circle" @click="closeFormModal">
              <IconX class="w-4 h-4" />
            </button>
          </div>

          <form @submit.prevent="handleSubmit" class="space-y-4">
            <!-- Section: Informasi Utama -->
            <div class="divider divider-start text-sm font-semibold text-base-content/60">Informasi Utama</div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="form-control md:col-span-2">
                <label class="label"><span class="label-text font-medium">Nama Supplier <span class="text-error">*</span></span></label>
                <input v-model="form.name" type="text" class="input input-bordered w-full" placeholder="PT Supplier ABC" required />
              </div>
              <div class="form-control">
                <label class="label"><span class="label-text font-medium">Kode Supplier</span></label>
                <input v-model="form.code" type="text" class="input input-bordered w-full" placeholder="SUP-001" />
              </div>
              <div class="form-control">
                <label class="label"><span class="label-text font-medium">Kategori</span></label>
                <input v-model="form.category" type="text" class="input input-bordered w-full" placeholder="food, equipment, cleaning, supplement..." />
              </div>
            </div>

            <!-- Section: Kontak -->
            <div class="divider divider-start text-sm font-semibold text-base-content/60">Kontak</div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="form-control">
                <label class="label"><span class="label-text font-medium">Nama Kontak Person</span></label>
                <input v-model="form.contactPerson" type="text" class="input input-bordered w-full" placeholder="Budi Santoso" />
              </div>
              <div class="form-control">
                <label class="label"><span class="label-text font-medium">Nomor Telepon</span></label>
                <input v-model="form.phone" type="tel" class="input input-bordered w-full" placeholder="08123456789" />
              </div>
              <div class="form-control md:col-span-2">
                <label class="label"><span class="label-text font-medium">Email</span></label>
                <input v-model="form.email" type="email" class="input input-bordered w-full" placeholder="kontak@supplier.com" />
              </div>
            </div>

            <!-- Section: Alamat -->
            <div class="divider divider-start text-sm font-semibold text-base-content/60">Alamat</div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="form-control md:col-span-2">
                <label class="label"><span class="label-text font-medium">Alamat Lengkap</span></label>
                <textarea v-model="form.address" class="textarea textarea-bordered w-full" rows="2" placeholder="Jl. Merdeka No. 1..."></textarea>
              </div>
              <div class="form-control">
                <label class="label"><span class="label-text font-medium">Kota</span></label>
                <input v-model="form.city" type="text" class="input input-bordered w-full" placeholder="Jakarta" />
              </div>
              <div class="form-control">
                <label class="label"><span class="label-text font-medium">Provinsi</span></label>
                <input v-model="form.province" type="text" class="input input-bordered w-full" placeholder="DKI Jakarta" />
              </div>
              <div class="form-control">
                <label class="label"><span class="label-text font-medium">Kode Pos</span></label>
                <input v-model="form.postalCode" type="text" class="input input-bordered w-full" placeholder="10110" />
              </div>
              <div class="form-control">
                <label class="label"><span class="label-text font-medium">NPWP</span></label>
                <input v-model="form.taxId" type="text" class="input input-bordered w-full" placeholder="01.234.567.8-901.000" />
              </div>
            </div>

            <!-- Section: Rekening Bank -->
            <div class="divider divider-start text-sm font-semibold text-base-content/60">Rekening Bank</div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="form-control">
                <label class="label"><span class="label-text font-medium">Nama Bank</span></label>
                <input v-model="form.bankName" type="text" class="input input-bordered w-full" placeholder="BCA, Mandiri, BRI..." />
              </div>
              <div class="form-control">
                <label class="label"><span class="label-text font-medium">Nomor Rekening</span></label>
                <input v-model="form.bankAccountNumber" type="text" class="input input-bordered w-full font-mono" placeholder="1234567890" />
              </div>
              <div class="form-control">
                <label class="label"><span class="label-text font-medium">Atas Nama</span></label>
                <input v-model="form.bankAccountHolder" type="text" class="input input-bordered w-full" placeholder="PT Supplier ABC" />
              </div>
            </div>

            <!-- Section: Lainnya -->
            <div class="divider divider-start text-sm font-semibold text-base-content/60">Lainnya</div>
            <div class="grid grid-cols-1 gap-4">
              <div class="form-control">
                <label class="label"><span class="label-text font-medium">Catatan</span></label>
                <textarea v-model="form.notes" class="textarea textarea-bordered w-full" rows="2" placeholder="Catatan tambahan tentang supplier..."></textarea>
              </div>
              <div class="form-control">
                <label class="label cursor-pointer justify-start gap-3">
                  <input v-model="form.isActive" type="checkbox" class="checkbox checkbox-primary" />
                  <span class="label-text font-medium">Supplier Aktif</span>
                </label>
              </div>
            </div>

            <!-- Actions -->
            <div class="modal-action mt-6">
              <button type="button" class="btn btn-ghost" @click="closeFormModal">Batal</button>
              <button type="submit" class="btn btn-primary" :disabled="actionLoading">
                <span v-if="actionLoading" class="loading loading-spinner loading-xs mr-2"></span>
                {{ selectedSupplier ? 'Simpan Perubahan' : 'Tambah Supplier' }}
              </button>
            </div>
          </form>
        </div>
        <div class="modal-backdrop" @click="closeFormModal"></div>
      </dialog>
    </Teleport>

    <!-- ─── Detail Modal ─── -->
    <Teleport to="body">
      <dialog :class="['modal', { 'modal-open': showDetailModal }]">
        <div class="modal-box w-11/12 max-w-2xl max-h-[90vh] overflow-y-auto" v-if="viewSupplier">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-xl font-bold">{{ viewSupplier.name }}</h3>
              <div class="flex items-center gap-2 mt-1">
                <span v-if="viewSupplier.code" class="badge badge-outline badge-sm font-mono">{{ viewSupplier.code }}</span>
                <span class="badge badge-sm" :class="viewSupplier.isActive ? 'badge-success' : 'badge-error'">
                  {{ viewSupplier.isActive ? 'Aktif' : 'Nonaktif' }}
                </span>
                <span v-if="viewSupplier.category" class="badge badge-outline badge-sm capitalize">{{ viewSupplier.category }}</span>
              </div>
            </div>
            <button class="btn btn-ghost btn-sm btn-circle" @click="showDetailModal = false">
              <IconX class="w-4 h-4" />
            </button>
          </div>

          <div class="space-y-4">
            <!-- Kontak -->
            <div v-if="viewSupplier.contactPerson || viewSupplier.email || viewSupplier.phone" class="card bg-base-200">
              <div class="card-body p-4">
                <h4 class="font-semibold text-sm text-base-content/60 mb-2">Kontak</h4>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                  <div v-if="viewSupplier.contactPerson">
                    <p class="text-xs text-base-content/50">Kontak Person</p>
                    <p class="font-medium">{{ viewSupplier.contactPerson }}</p>
                  </div>
                  <div v-if="viewSupplier.email">
                    <p class="text-xs text-base-content/50">Email</p>
                    <p><a :href="`mailto:${viewSupplier.email}`" class="link link-primary">{{ viewSupplier.email }}</a></p>
                  </div>
                  <div v-if="viewSupplier.phone">
                    <p class="text-xs text-base-content/50">Telepon</p>
                    <p><a :href="`tel:${viewSupplier.phone}`" class="link">{{ viewSupplier.phone }}</a></p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Alamat -->
            <div v-if="viewSupplier.address || viewSupplier.city" class="card bg-base-200">
              <div class="card-body p-4">
                <h4 class="font-semibold text-sm text-base-content/60 mb-2">Alamat</h4>
                <div class="text-sm space-y-1">
                  <p v-if="viewSupplier.address">{{ viewSupplier.address }}</p>
                  <p v-if="viewSupplier.city">
                    {{ viewSupplier.city }}<span v-if="viewSupplier.province">, {{ viewSupplier.province }}</span>
                    <span v-if="viewSupplier.postalCode"> {{ viewSupplier.postalCode }}</span>
                  </p>
                  <p v-if="viewSupplier.taxId" class="text-base-content/60">NPWP: {{ viewSupplier.taxId }}</p>
                </div>
              </div>
            </div>

            <!-- Rekening Bank -->
            <div v-if="viewSupplier.bankName" class="card bg-base-200">
              <div class="card-body p-4">
                <h4 class="font-semibold text-sm text-base-content/60 mb-2">Rekening Bank</h4>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                  <div>
                    <p class="text-xs text-base-content/50">Bank</p>
                    <p class="font-medium">{{ viewSupplier.bankName }}</p>
                  </div>
                  <div v-if="viewSupplier.bankAccountNumber">
                    <p class="text-xs text-base-content/50">No. Rekening</p>
                    <p class="font-mono font-medium">{{ viewSupplier.bankAccountNumber }}</p>
                  </div>
                  <div v-if="viewSupplier.bankAccountHolder">
                    <p class="text-xs text-base-content/50">Atas Nama</p>
                    <p class="font-medium">{{ viewSupplier.bankAccountHolder }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Catatan -->
            <div v-if="viewSupplier.notes" class="alert">
              <IconNote class="w-4 h-4 shrink-0" />
              <span class="text-sm">{{ viewSupplier.notes }}</span>
            </div>
          </div>

          <div class="modal-action mt-4">
            <button class="btn btn-ghost btn-sm" @click="showDetailModal = false">Tutup</button>
            <button class="btn btn-primary btn-sm" @click="showDetailModal = false; openEditModal(viewSupplier)">
              <IconEdit class="w-4 h-4 mr-1" />
              Edit
            </button>
          </div>
        </div>
        <div class="modal-backdrop" @click="showDetailModal = false"></div>
      </dialog>
    </Teleport>

    <!-- Confirm Dialog -->
    <DialogConfirm ref="confirmDialog" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDebounceFn } from '@vueuse/core'
import { useSuppliers } from '@/composables/finances'
import DialogConfirm from '@/components/shared/DialogConfirm.vue'
import {
  IconArrowLeft,
  IconPlus,
  IconSearch,
  IconX,
  IconEdit,
  IconTrash,
  IconEye,
  IconTruck,
  IconNote,
} from '@tabler/icons-vue'

const router = useRouter()

const {
  suppliers,
  loading,
  actionLoading,
  pagination,
  fetchSuppliers,
  createSupplier,
  updateSupplier,
  toggleSupplierStatus,
  deleteSupplier,
} = useSuppliers()

// ── Refs ──────────────────────────────────────────────────────────────
const confirmDialog    = ref(null)
const showFormModal    = ref(false)
const showDetailModal  = ref(false)
const selectedSupplier = ref(null)
const viewSupplier     = ref(null)

const filters = ref({
  search: '',
  isActive: '',
  category: '',
  page: 1,
  limit: 20,
  sortBy: 'name',
  sortOrder: 'ASC',
})

// ── Form model ────────────────────────────────────────────────────────
const emptyForm = () => ({
  name: '',
  code: '',
  contactPerson: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  province: '',
  postalCode: '',
  taxId: '',
  bankName: '',
  bankAccountNumber: '',
  bankAccountHolder: '',
  category: '',
  notes: '',
  isActive: true,
})

const form = ref(emptyForm())

// ── Computed ──────────────────────────────────────────────────────────
const uniqueCategories = computed(() => {
  const cats = suppliers.value.map(s => s.category).filter(Boolean)
  return [...new Set(cats)].sort()
})

const categoryOptions = computed(() => {
  const base = ['food', 'equipment', 'cleaning', 'supplement', 'office', 'service', 'other']
  return [...new Set([...base, ...uniqueCategories.value])].sort()
})

const visiblePages = computed(() => {
  const total = pagination.value.totalPages
  const current = filters.value.page
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = [1]
  if (current > 3) pages.push('...')
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i)
  if (current < total - 2) pages.push('...')
  pages.push(total)
  return pages
})

// ── Helpers ───────────────────────────────────────────────────────────
const loadSuppliers = async () => {
  const f = filters.value
  await fetchSuppliers({
    page: f.page,
    limit: f.limit,
    sortBy: f.sortBy,
    sortOrder: f.sortOrder,
    search: f.search || undefined,
    isActive: f.isActive !== '' ? f.isActive : undefined,
    category: f.category || undefined,
  })
}

const handleSearch = () => {
  filters.value.page = 1
  loadSuppliers()
}

const debouncedSearch = useDebounceFn(() => handleSearch(), 400)

const changePage = (page) => {
  filters.value.page = page
  loadSuppliers()
}

// ── Modal helpers ─────────────────────────────────────────────────────
const openCreateModal = () => {
  selectedSupplier.value = null
  form.value = emptyForm()
  showFormModal.value = true
}

const openEditModal = (s) => {
  selectedSupplier.value = s
  form.value = {
    name: s.name || '',
    code: s.code || '',
    contactPerson: s.contactPerson || '',
    email: s.email || '',
    phone: s.phone || '',
    address: s.address || '',
    city: s.city || '',
    province: s.province || '',
    postalCode: s.postalCode || '',
    taxId: s.taxId || '',
    bankName: s.bankName || '',
    bankAccountNumber: s.bankAccountNumber || '',
    bankAccountHolder: s.bankAccountHolder || '',
    category: s.category || '',
    notes: s.notes || '',
    isActive: s.isActive !== false,
  }
  showFormModal.value = true
}

const openDetailModal = (s) => {
  viewSupplier.value = s
  showDetailModal.value = true
}

const closeFormModal = () => {
  showFormModal.value = false
  selectedSupplier.value = null
}

// ── CRUD ──────────────────────────────────────────────────────────────
const handleSubmit = async () => {
  try {
    if (selectedSupplier.value) {
      await updateSupplier(selectedSupplier.value.id, form.value)
    } else {
      await createSupplier(form.value)
    }
    closeFormModal()
    await loadSuppliers()
  } catch {
    // error handled in composable
  }
}

const handleToggleStatus = async (s) => {
  const action = s.isActive ? 'nonaktifkan' : 'aktifkan'
  const confirmed = await confirmDialog.value?.open({
    title: `${s.isActive ? 'Nonaktifkan' : 'Aktifkan'} Supplier`,
    message: `${action.charAt(0).toUpperCase() + action.slice(1)} supplier "${s.name}"?`,
    confirmText: s.isActive ? 'Nonaktifkan' : 'Aktifkan',
    type: s.isActive ? 'warning' : 'info',
  })
  if (confirmed) {
    try {
      await toggleSupplierStatus(s.id)
      await loadSuppliers()
    } catch {
      // handled
    }
  }
}

const handleDelete = async (s) => {
  const confirmed = await confirmDialog.value?.open({
    title: 'Hapus Supplier',
    message: `Hapus supplier "${s.name}"? Jika masih terhubung ke pengeluaran, nonaktifkan saja.`,
    confirmText: 'Hapus',
    type: 'danger',
  })
  if (confirmed) {
    try {
      await deleteSupplier(s.id)
      await loadSuppliers()
    } catch {
      // handled — error "SUPPLIER_IN_USE" will show via notification
    }
  }
}

// ── Lifecycle ─────────────────────────────────────────────────────────
onMounted(() => {
  loadSuppliers()
})
</script>
