<route lang="yaml">
meta:
  title: Aturan Harga
  layout: default
  requiresModule: psychology
</route>

<template>
  <div>
    <!-- Page Header -->
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
      <div>
        <h1 class="text-3xl font-bold">Aturan Harga</h1>
        <p class="text-base-content/60 mt-1">Kelola promo dan diskon untuk paket psikologi</p>
      </div>
      <button class="btn btn-primary" @click="openFormModal()">
        <IconPlus class="w-5 h-5" />
        Tambah Aturan
      </button>
    </div>

    <!-- Active Promos -->
    <div class="card bg-gradient-to-r from-primary/10 to-secondary/10 shadow-xl mb-6">
      <div class="card-body">
        <h2 class="card-title mb-4">
          <IconDiscount class="w-6 h-6" />
          Promo Aktif
        </h2>
        <div v-if="activePromos?.length > 0" class="flex flex-wrap gap-3">
          <div 
            v-for="promo in activePromos" 
            :key="promo.id"
            class="badge badge-lg badge-primary gap-2"
          >
            {{ promo.name }} - {{ promo.discountType === 'percentage' ? promo.discountValue + '%' : formatPrice(promo.discountValue) }}
          </div>
        </div>
        <p v-else class="text-base-content/60">Tidak ada promo aktif saat ini</p>
      </div>
    </div>

    <!-- Price Rules Table -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <!-- Loading -->
        <div v-if="loading" class="flex justify-center py-8">
          <span class="loading loading-spinner loading-lg"></span>
        </div>

        <!-- Rules List -->
        <div v-else-if="priceRules?.length > 0">
          <div class="overflow-x-auto">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Tipe</th>
                  <th>Diskon</th>
                  <th>Periode</th>
                  <th>Kode Promo</th>
                  <th>Status</th>
                  <th class="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="rule in priceRules" :key="rule.id">
                  <td>
                    <div class="font-medium">{{ rule.name }}</div>
                    <div class="text-sm text-base-content/60">{{ rule.description }}</div>
                  </td>
                  <td>
                    <div class="badge" :class="getRuleTypeClass(rule.ruleType)">
                      {{ getRuleTypeLabel(rule.ruleType) }}
                    </div>
                  </td>
                  <td>
                    <span class="font-bold text-success">
                      {{ rule.discountType === 'percentage' 
                        ? rule.discountValue + '%' 
                        : formatPrice(rule.discountValue) 
                      }}
                    </span>
                  </td>
                  <td>
                    <div class="text-sm">
                      <div>{{ formatDate(rule.startDate) }}</div>
                      <div class="text-base-content/60">s/d {{ formatDate(rule.endDate) }}</div>
                    </div>
                  </td>
                  <td>
                    <code v-if="rule.promoCode" class="bg-base-200 px-2 py-1 rounded">
                      {{ rule.promoCode }}
                    </code>
                    <span v-else class="text-base-content/60">-</span>
                  </td>
                  <td>
                    <div class="badge" :class="rule.isActive ? 'badge-success' : 'badge-ghost'">
                      {{ rule.isActive ? 'Aktif' : 'Non-aktif' }}
                    </div>
                  </td>
                  <td class="text-right">
                    <div class="flex items-center justify-end gap-2">
                      <button 
                        class="btn btn-ghost btn-sm"
                        @click="openFormModal(rule)"
                      >
                        <IconEdit class="w-4 h-4" />
                      </button>
                      <button 
                        class="btn btn-ghost btn-sm text-error"
                        @click="confirmDelete(rule)"
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
          <div class="flex justify-between items-center mt-6">
            <div class="text-sm text-base-content/60">
              Menampilkan {{ priceRules.length }} dari {{ pagination.total }} aturan
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
          <IconDiscount class="w-16 h-16 mx-auto text-base-content/30 mb-4" />
          <h3 class="text-lg font-semibold mb-2">Tidak ada aturan harga</h3>
          <p class="text-base-content/60 mb-4">Buat aturan harga baru untuk mengatur diskon</p>
          <button class="btn btn-primary" @click="openFormModal()">
            <IconPlus class="w-5 h-5" />
            Tambah Aturan
          </button>
        </div>
      </div>
    </div>

    <!-- Form Modal -->
    <dialog ref="formModal" class="modal">
      <div class="modal-box max-w-2xl">
        <h3 class="font-bold text-lg mb-4">
          {{ selectedRule ? 'Edit Aturan Harga' : 'Tambah Aturan Harga' }}
        </h3>
        
        <form @submit.prevent="saveRule">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="form-control col-span-full">
              <label class="label">
                <span class="label-text font-medium">Nama <span class="text-error">*</span></span>
              </label>
              <input 
                type="text" 
                v-model="form.name" 
                class="input input-bordered"
                required
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Tipe Aturan <span class="text-error">*</span></span>
              </label>
              <select v-model="form.ruleType" class="select select-bordered" required>
                <option value="promo">Promo</option>
                <option value="bulk">Bulk Discount</option>
                <option value="early_bird">Early Bird</option>
                <option value="seasonal">Musiman</option>
              </select>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Kode Promo</span>
              </label>
              <input 
                type="text" 
                v-model="form.promoCode" 
                class="input input-bordered"
                placeholder="Contoh: PROMO2024"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Tipe Diskon <span class="text-error">*</span></span>
              </label>
              <select v-model="form.discountType" class="select select-bordered" required>
                <option value="percentage">Persentase (%)</option>
                <option value="fixed">Nominal Tetap</option>
              </select>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Nilai Diskon <span class="text-error">*</span></span>
              </label>
              <input 
                type="number" 
                v-model.number="form.discountValue" 
                class="input input-bordered"
                min="0"
                :max="form.discountType === 'percentage' ? 100 : undefined"
                required
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Tanggal Mulai <span class="text-error">*</span></span>
              </label>
              <input 
                type="date" 
                v-model="form.startDate" 
                class="input input-bordered"
                required
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Tanggal Berakhir <span class="text-error">*</span></span>
              </label>
              <input 
                type="date" 
                v-model="form.endDate" 
                class="input input-bordered"
                required
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Minimum Pembelian</span>
              </label>
              <CurrencyInput
                v-model="form.minPurchase"
                placeholder="0"
                input-class="input input-bordered"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Maksimum Penggunaan</span>
              </label>
              <input 
                type="number" 
                v-model.number="form.maxUsage" 
                class="input input-bordered"
                min="0"
                placeholder="Kosongkan untuk unlimited"
              />
            </div>

            <div class="form-control col-span-full">
              <label class="label">
                <span class="label-text font-medium">Deskripsi</span>
              </label>
              <textarea 
                v-model="form.description" 
                class="textarea textarea-bordered h-20"
              ></textarea>
            </div>

            <div class="form-control">
              <label class="label cursor-pointer justify-start gap-4">
                <input 
                  type="checkbox" 
                  v-model="form.isActive" 
                  class="checkbox checkbox-primary" 
                />
                <span class="label-text">Aktif</span>
              </label>
            </div>
          </div>

          <div class="modal-action">
            <button type="button" class="btn btn-ghost" @click="closeFormModal">Batal</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              <span v-if="saving" class="loading loading-spinner loading-sm"></span>
              {{ selectedRule ? 'Simpan' : 'Tambah' }}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import CurrencyInput from '@/components/shared/CurrencyInput.vue'
import {
  IconPlus,
  IconDiscount,
  IconEdit,
  IconTrash,
  IconChevronLeft,
  IconChevronRight
} from '@tabler/icons-vue'
import { usePriceRules } from '@/composables/psychology'
import { useDialog } from '@/composables/core/useApi'

const dialog = useDialog()

const {
  priceRules,
  loading,
  pagination,
  getPriceRules,
  createPriceRule,
  updatePriceRule,
  deletePriceRule,
  formatPrice,
  formatDate
} = usePriceRules()

const formModal = ref(null)
const selectedRule = ref(null)
const saving = ref(false)

const initialForm = {
  name: '',
  description: '',
  ruleType: 'promo',
  promoCode: '',
  discountType: 'percentage',
  discountValue: 0,
  startDate: '',
  endDate: '',
  minPurchase: 0,
  maxUsage: null,
  isActive: true
}

const form = reactive({ ...initialForm })

const activePromos = computed(() => {
  return priceRules.value?.filter(r => r.isActive && new Date(r.endDate) > new Date()) || []
})

const resetForm = () => {
  Object.assign(form, initialForm)
}

const loadPriceRules = async () => {
  const params = {
    page: pagination.value.page,
    limit: 10
  }
  await getPriceRules(params)
}

const changePage = async (page) => {
  pagination.value.page = page
  await loadPriceRules()
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

const getRuleTypeClass = (type) => {
  const classes = {
    'promo': 'badge-primary',
    'bulk': 'badge-secondary',
    'early_bird': 'badge-accent',
    'seasonal': 'badge-info'
  }
  return classes[type] || 'badge-ghost'
}

const getRuleTypeLabel = (type) => {
  const labels = {
    'promo': 'Promo',
    'bulk': 'Bulk Discount',
    'early_bird': 'Early Bird',
    'seasonal': 'Musiman'
  }
  return labels[type] || type
}

const openFormModal = (rule = null) => {
  selectedRule.value = rule
  if (rule) {
    Object.assign(form, {
      name: rule.name,
      description: rule.description || '',
      ruleType: rule.ruleType,
      promoCode: rule.promoCode || '',
      discountType: rule.discountType,
      discountValue: rule.discountValue,
      startDate: rule.startDate?.split('T')[0] || '',
      endDate: rule.endDate?.split('T')[0] || '',
      minPurchase: rule.minPurchase || 0,
      maxUsage: rule.maxUsage || null,
      isActive: rule.isActive
    })
  } else {
    resetForm()
  }
  formModal.value?.showModal()
}

const closeFormModal = () => {
  formModal.value?.close()
  resetForm()
  selectedRule.value = null
}

const saveRule = async () => {
  saving.value = true
  try {
    if (selectedRule.value) {
      await updatePriceRule(selectedRule.value.id, form)
    } else {
      await createPriceRule(form)
    }
    closeFormModal()
    await loadPriceRules()
  } catch (error) {
    console.error('Error saving price rule:', error)
  } finally {
    saving.value = false
  }
}

const confirmDelete = async (rule) => {
  const confirmed = await dialog.confirm({
    title: 'Hapus Aturan Harga',
    message: `Apakah Anda yakin ingin menghapus aturan "${rule.name}"?`,
    type: 'warning',
    confirmText: 'Hapus',
    cancelText: 'Batal'
  })

  if (confirmed) {
    try {
      await deletePriceRule(rule.id)
      await loadPriceRules()
    } catch (error) {
      console.error('Error deleting price rule:', error)
    }
  }
}

onMounted(() => {
  loadPriceRules()
})
</script>
