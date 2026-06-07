<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRestaurantProducts } from '@/composables/restaurant/useRestaurantProducts'
import { IconPlus, IconEdit, IconTrash } from '@tabler/icons-vue'
import CurrencyInput from '@/components/shared/CurrencyInput.vue'

const props = defineProps({
  productId: {
    type: String,
    required: true
  }
})

const { getProductById, updateProduct, loading } = useRestaurantProducts()

const product = ref(null)
const variants = ref([])
const showModal = ref(false)
const isEditing = ref(false)
const editIndex = ref(-1)

const form = ref({
  name: '',
  sku: '',
  price: 0
})

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

onMounted(async () => {
  await loadProduct()
})

const loadProduct = async () => {
  const result = await getProductById(props.productId)
  if (result) {
    product.value = result
    variants.value = [...(result.productDetails?.variants || [])]
  }
}

const resetForm = () => {
  form.value = { name: '', sku: '', price: 0 }
  isEditing.value = false
  editIndex.value = -1
}

const openAddModal = () => {
  resetForm()
  // Auto-generate SKU prefix from product SKU
  if (product.value?.sku) {
    form.value.sku = `${product.value.sku}-`
  }
  showModal.value = true
}

const openEditModal = (variant, index) => {
  form.value = {
    name: variant.name || '',
    sku: variant.sku || '',
    price: parseFloat(variant.price) || 0
  }
  isEditing.value = true
  editIndex.value = index
  showModal.value = true
}

const saveVariants = async (updatedVariants) => {
  try {
    const productDetails = { ...(product.value.productDetails || {}) }
    productDetails.variants = updatedVariants
    productDetails.hasVariants = updatedVariants.length > 0

    await updateProduct(props.productId, { productDetails })
    variants.value = [...updatedVariants]
    
    // Update local product reference
    if (product.value) {
      product.value.productDetails = productDetails
    }
  } catch (err) {
    console.error('Failed to save variants:', err)
    throw err
  }
}

const handleSubmit = async () => {
  if (!form.value.name.trim()) return

  const variantData = {
    name: form.value.name.trim(),
    sku: form.value.sku.trim(),
    price: parseFloat(form.value.price) || 0
  }

  const updatedVariants = [...variants.value]

  if (isEditing.value && editIndex.value >= 0) {
    updatedVariants[editIndex.value] = variantData
  } else {
    updatedVariants.push(variantData)
  }

  await saveVariants(updatedVariants)
  showModal.value = false
  resetForm()
}

const handleDelete = async (index) => {
  if (!confirm(`Delete variant "${variants.value[index]?.name}"?`)) return

  const updatedVariants = variants.value.filter((_, i) => i !== index)
  await saveVariants(updatedVariants)
}

const isDefaultVariant = (variant) => {
  if (!product.value) return false
  return parseFloat(variant.price) === parseFloat(product.value.price)
}
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold">Product Variants</h3>
      <button class="btn btn-primary btn-sm" @click="openAddModal">
        <IconPlus class="w-4 h-4 mr-1" />
        Add Variant
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Variants Table -->
    <div v-else-if="variants.length > 0" class="overflow-x-auto">
      <table class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>SKU</th>
            <th>Price</th>
            <th class="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(variant, index) in variants" :key="index">
            <td>
              <div class="flex items-center gap-2">
                <span class="font-medium">{{ variant.name }}</span>
                <span v-if="isDefaultVariant(variant)" class="badge badge-sm badge-primary">Default</span>
              </div>
            </td>
            <td class="font-mono text-sm">{{ variant.sku || '-' }}</td>
            <td class="font-semibold">{{ formatCurrency(variant.price) }}</td>
            <td>
              <div class="flex justify-end gap-1">
                <button 
                  @click="openEditModal(variant, index)"
                  class="btn btn-xs btn-ghost"
                >
                  <IconEdit class="w-4 h-4" />
                </button>
                <button
                  @click="handleDelete(index)"
                  class="btn btn-xs btn-ghost text-error"
                >
                  <IconTrash class="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-12">
      <div class="text-base-content/60 mb-4">
        <p>No variants configured for this product.</p>
        <p class="text-sm mt-2">Variants allow you to offer different sizes or options with different prices.</p>
      </div>
      <button class="btn btn-primary btn-sm" @click="openAddModal">
        <IconPlus class="w-4 h-4 mr-1" />
        Add First Variant
      </button>
    </div>

    <!-- Add/Edit Variant Modal -->
    <Teleport to="body">
      <dialog :class="['modal', { 'modal-open': showModal }]">
        <div class="modal-box max-w-md">
          <h3 class="font-bold text-lg mb-4">
            {{ isEditing ? 'Edit Variant' : 'Add Variant' }}
          </h3>

          <form @submit.prevent="handleSubmit" class="space-y-4">
            <!-- Name -->
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Variant Name <span class="text-error">*</span></span>
              </label>
              <input
                v-model="form.name"
                type="text"
                class="input input-bordered w-full"
                placeholder="e.g. Regular, Large, Extra Large"
                required
              />
            </div>

            <!-- SKU -->
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">SKU</span>
              </label>
              <input
                v-model="form.sku"
                type="text"
                class="input input-bordered w-full"
                placeholder="e.g. PROD-REG"
              />
            </div>

            <!-- Price -->
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Price <span class="text-error">*</span></span>
              </label>
              <CurrencyInput
                v-model="form.price"
                :min="0"
                placeholder="0"
                input-class="input input-bordered w-full"
                required
              />
              <label class="label">
                <span class="label-text-alt text-base-content/50">
                  Current product base price: {{ product ? formatCurrency(product.price) : '-' }}
                </span>
              </label>
            </div>

            <!-- Actions -->
            <div class="modal-action">
              <button type="button" class="btn btn-ghost" @click="showModal = false; resetForm()">
                Cancel
              </button>
              <button 
                type="submit" 
                class="btn btn-primary"
                :disabled="!form.name.trim() || loading"
              >
                <span v-if="loading" class="loading loading-spinner loading-sm"></span>
                {{ isEditing ? 'Update' : 'Add' }} Variant
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" class="modal-backdrop">
          <button @click="showModal = false; resetForm()">close</button>
        </form>
      </dialog>
    </Teleport>
  </div>
</template>
