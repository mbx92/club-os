<route lang="yaml">
meta:
  title: Pemegang Saham
  layout: default
</route>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useShareholders } from '@/composables/finances/useShareholders'
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconUsers,
  IconAlertTriangle,
  IconCheck,
  IconChevronUp,
  IconChevronDown,
  IconToggleLeft,
  IconToggleRight,
} from '@tabler/icons-vue'

const {
  shareholders,
  meta,
  loading,
  fetchShareholders,
  createShareholder,
  updateShareholder,
  deleteShareholder,
  reorderShareholders,
} = useShareholders()

// ────────────────────────── modal state ──────────────────────────
const showModal = ref(false)
const modalMode = ref('create') // 'create' | 'edit'
const selectedItem = ref(null)
const formLoading = ref(false)

const emptyForm = () => ({
  name: '',
  percentage: '',
  notes: '',
  sortOrder: '',
})
const form = ref(emptyForm())

const openCreate = () => {
  modalMode.value = 'create'
  selectedItem.value = null
  form.value = emptyForm()
  showModal.value = true
}

const openEdit = (item) => {
  modalMode.value = 'edit'
  selectedItem.value = item
  form.value = {
    name: item.name,
    percentage: item.percentage,
    notes: item.notes ?? '',
    sortOrder: item.sortOrder ?? '',
  }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
}

const handleSubmit = async () => {
  if (!form.value.name || !form.value.percentage) return
  formLoading.value = true
  try {
    const payload = {
      name: form.value.name,
      percentage: parseFloat(form.value.percentage),
      notes: form.value.notes || undefined,
      sortOrder: form.value.sortOrder !== '' ? parseInt(form.value.sortOrder) : undefined,
    }
    if (modalMode.value === 'create') {
      await createShareholder(payload)
    } else {
      await updateShareholder(selectedItem.value.id, payload)
    }
    closeModal()
  } catch {
    // error handled inside composable
  } finally {
    formLoading.value = false
  }
}

// ────────────────────────── delete confirm ──────────────────────────
const confirmDelete = async (item) => {
  if (!confirm(`Hapus shareholder "${item.name}"? Tindakan ini tidak bisa dibatalkan.`)) return
  await deleteShareholder(item.id)
}

// ────────────────────────── toggle active ──────────────────────────
const toggleActive = async (item) => {
  await updateShareholder(item.id, { isActive: !item.isActive })
}

// ────────────────────────── reorder ──────────────────────────
const moveUp = async (index) => {
  if (index === 0) return
  const list = [...shareholders.value]
  ;[list[index - 1], list[index]] = [list[index], list[index - 1]]
  const reorderPayload = list.map((item, i) => ({ id: item.id, sortOrder: i + 1 }))
  await reorderShareholders(reorderPayload)
}

const moveDown = async (index) => {
  if (index === shareholders.value.length - 1) return
  const list = [...shareholders.value]
  ;[list[index], list[index + 1]] = [list[index + 1], list[index]]
  const reorderPayload = list.map((item, i) => ({ id: item.id, sortOrder: i + 1 }))
  await reorderShareholders(reorderPayload)
}

// ────────────────────────── helpers ──────────────────────────
const formatPercentage = (val) => `${parseFloat(val || 0).toFixed(2)}%`

const activeTotal = computed(() => parseFloat(meta.value?.activeTotal || 0))
const isValid = computed(() => meta.value?.isValid ?? false)

const totalProgress = computed(() => Math.min(100, activeTotal.value))

onMounted(() => {
  fetchShareholders()
})
</script>

<template>
  <div>
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold">Pemegang Saham</h1>
        <p class="text-base-content/60 mt-1">Kelola data pemegang saham dan persentase kepemilikan</p>
      </div>
      <button class="btn btn-primary" @click="openCreate">
        <IconPlus class="w-4 h-4" />
        Tambah Shareholder
      </button>
    </div>

    <!-- Validity Warning / Info -->
    <div class="mb-4">
      <div v-if="!isValid && shareholders.length > 0" class="alert alert-warning mb-3">
        <IconAlertTriangle class="w-5 h-5 shrink-0" />
        <span>
          Total persentase shareholder aktif belum mencapai 100%.
          Saat ini: <strong>{{ formatPercentage(activeTotal) }}</strong>. Distribusi profit tidak dapat dihitung dengan benar.
        </span>
      </div>
      <div v-else-if="isValid" class="alert alert-success mb-3">
        <IconCheck class="w-5 h-5 shrink-0" />
        <span>
          Distribusi valid — total persentase aktif tepat 100%.
        </span>
      </div>
    </div>

    <!-- Active Total Progress -->
    <div v-if="shareholders.length > 0" class="card bg-base-100 shadow-sm mb-6">
      <div class="card-body py-4">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium">Total Persentase Aktif</span>
          <span class="text-sm font-bold" :class="isValid ? 'text-success' : 'text-warning'">
            {{ formatPercentage(activeTotal) }} / 100%
          </span>
        </div>
        <progress
          class="progress w-full"
          :class="isValid ? 'progress-success' : 'progress-warning'"
          :value="totalProgress"
          max="100"
        ></progress>
        <div class="flex justify-between text-xs text-base-content/50 mt-1">
          <span>{{ meta.total }} total · {{ meta.activeTotal ? meta.total - Math.round(meta.total * (100 - activeTotal) / 100) : 0 }} aktif</span>
          <span>{{ meta.activeTotal }} pemegang saham aktif</span>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <div class="flex items-center gap-2 mb-4">
          <IconUsers class="w-5 h-5 text-primary" />
          <h2 class="card-title text-lg">Daftar Pemegang Saham</h2>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="flex justify-center py-10">
          <span class="loading loading-spinner loading-lg"></span>
        </div>

        <!-- Empty -->
        <div v-else-if="!shareholders.length" class="text-center py-10 text-base-content/50">
          <IconUsers class="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>Belum ada data pemegang saham</p>
          <button class="btn btn-primary btn-sm mt-3" @click="openCreate">
            <IconPlus class="w-4 h-4" /> Tambah Sekarang
          </button>
        </div>

        <!-- Table -->
        <div v-else class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th class="w-16">Urutan</th>
                <th>Nama</th>
                <th class="text-right">Persentase</th>
                <th>Catatan</th>
                <th class="text-center">Status</th>
                <th class="text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, index) in shareholders"
                :key="item.id"
                :class="{ 'opacity-50': !item.isActive }"
              >
                <td>
                  <div class="flex items-center gap-1">
                    <button
                      class="btn btn-ghost btn-xs"
                      :disabled="index === 0 || loading"
                      @click="moveUp(index)"
                      title="Geser ke atas"
                    >
                      <IconChevronUp class="w-4 h-4" />
                    </button>
                    <span class="text-xs font-mono text-base-content/60">{{ item.sortOrder ?? index + 1 }}</span>
                    <button
                      class="btn btn-ghost btn-xs"
                      :disabled="index === shareholders.length - 1 || loading"
                      @click="moveDown(index)"
                      title="Geser ke bawah"
                    >
                      <IconChevronDown class="w-4 h-4" />
                    </button>
                  </div>
                </td>
                <td>
                  <span class="font-semibold">{{ item.name }}</span>
                </td>
                <td class="text-right">
                  <span class="badge badge-lg" :class="item.isActive ? 'badge-primary' : 'badge-ghost'">
                    {{ formatPercentage(item.percentage) }}
                  </span>
                </td>
                <td class="text-sm text-base-content/70 max-w-xs truncate">
                  {{ item.notes || '-' }}
                </td>
                <td class="text-center">
                  <button
                    class="btn btn-ghost btn-sm"
                    :title="item.isActive ? 'Nonaktifkan' : 'Aktifkan'"
                    :disabled="loading"
                    @click="toggleActive(item)"
                  >
                    <IconToggleRight v-if="item.isActive" class="w-5 h-5 text-success" />
                    <IconToggleLeft v-else class="w-5 h-5 text-base-content/40" />
                  </button>
                </td>
                <td>
                  <div class="flex items-center justify-center gap-2">
                    <button class="btn btn-ghost btn-sm" @click="openEdit(item)" title="Edit">
                      <IconEdit class="w-4 h-4 text-info" />
                    </button>
                    <button class="btn btn-ghost btn-sm" @click="confirmDelete(item)" title="Hapus">
                      <IconTrash class="w-4 h-4 text-error" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Create / Edit Modal -->
    <div v-if="showModal" class="modal modal-open">
      <div class="modal-box w-full max-w-md">
        <h3 class="font-bold text-lg mb-4">
          {{ modalMode === 'create' ? 'Tambah Pemegang Saham' : 'Edit Pemegang Saham' }}
        </h3>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <!-- Name -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Nama <span class="text-error">*</span></span>
            </label>
            <input
              v-model="form.name"
              type="text"
              placeholder="Nama pemegang saham"
              class="input input-bordered w-full"
              required
            />
          </div>

          <!-- Percentage -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Persentase (%) <span class="text-error">*</span></span>
            </label>
            <input
              v-model="form.percentage"
              type="number"
              placeholder="0.00"
              step="0.01"
              min="0.01"
              max="100"
              class="input input-bordered w-full"
              required
            />
          </div>

          <!-- Sort Order -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Urutan</span>
              <span class="label-text-alt text-base-content/50">Opsional</span>
            </label>
            <input
              v-model="form.sortOrder"
              type="number"
              placeholder="Urutan tampilan"
              min="1"
              class="input input-bordered w-full"
            />
          </div>

          <!-- Notes -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Catatan</span>
              <span class="label-text-alt text-base-content/50">Opsional</span>
            </label>
            <textarea
              v-model="form.notes"
              placeholder="Catatan tambahan..."
              class="textarea textarea-bordered w-full"
              rows="3"
            ></textarea>
          </div>

          <!-- Actions -->
          <div class="modal-action mt-6">
            <button type="button" class="btn btn-ghost" @click="closeModal" :disabled="formLoading">
              Batal
            </button>
            <button
              type="submit"
              class="btn btn-primary"
              :disabled="formLoading || !form.name || !form.percentage"
            >
              <span v-if="formLoading" class="loading loading-spinner loading-sm"></span>
              {{ modalMode === 'create' ? 'Simpan' : 'Perbarui' }}
            </button>
          </div>
        </form>
      </div>
      <div class="modal-backdrop" @click="closeModal"></div>
    </div>
  </div>
</template>
