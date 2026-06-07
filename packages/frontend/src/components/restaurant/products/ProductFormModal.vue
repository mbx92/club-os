<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { IconX } from '@tabler/icons-vue'
import { useRestaurantCategories } from '@/composables/restaurant/useRestaurantCategories'
import CurrencyInput from '@/components/shared/CurrencyInput.vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  product: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  },
  locations: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue', 'submit'])

const isEdit = computed(() => !!props.product)

const formData = ref({
  name: '',
  sku: '',
  description: '',
  categoryId: '',
  productType: 'food',
  price: 0,
  cost: 0,
  locationId: '',
  stockQuantity: 0,
  unit: 'pcs',
  minStockLevel: 10,
  maxStockLevel: 1000,
  trackInventory: true,
  isAvailable: true,
  barcode: '',
  imageUrl: '',
  tags: [],
  preparationTime: 0,
  calories: 0,
  allergens: []
})

const tagInput = ref('')
const allergenInput = ref('')
const fileInput = ref(null)
const imagePreview = ref(null)
const selectedFile = ref(null)

// Fetch categories from API
const { categories, fetchCategories, loading: categoriesLoading } = useRestaurantCategories()

// Load categories on mount
onMounted(async () => {
  try {
    await fetchCategories({ isActive: true })
  } catch (error) {
    console.error('Failed to load categories:', error)
  }
})

// Unit options
const unitOptions = ['pcs', 'kg', 'g', 'L', 'ml', 'portion']

// Common allergens
const commonAllergens = [
  'Peanuts', 'Tree Nuts', 'Milk', 'Eggs', 'Fish', 
  'Shellfish', 'Soy', 'Wheat', 'Sesame'
]

const resetForm = () => {
  if (props.product) {
    formData.value = {
      name: props.product.name || '',
      sku: props.product.sku || '',
      description: props.product.description || '',
      categoryId: props.product.categoryId || '',
      productType: props.product.productType || 'food',
      price: props.product.price || 0,
      cost: props.product.cost || 0,
      locationId: props.product.locationId || '',
      stockQuantity: props.product.stockQuantity || 0,
      unit: props.product.unit || 'pcs',
      minStockLevel: props.product.minStockLevel || 10,
      maxStockLevel: props.product.maxStockLevel || 1000,
      trackInventory: props.product.trackInventory ?? true,
      isAvailable: props.product.isAvailable ?? true,
      barcode: props.product.barcode || '',
      imageUrl: props.product.imageUrl || '',
      tags: props.product.tags || [],
      preparationTime: props.product.preparationTime || 0,
      calories: props.product.calories || 0,
      allergens: props.product.allergens || []
    }
  } else {
    formData.value = {
      name: '',
      sku: '',
      description: '',
      categoryId: '',
      productType: 'food',
      price: 0,
      cost: 0,
      locationId: '',
      stockQuantity: 0,
      unit: 'pcs',
      minStockLevel: 10,
      maxStockLevel: 1000,
      trackInventory: true,
      isAvailable: true,
      barcode: '',
      imageUrl: '',
      tags: [],
      preparationTime: 0,
      calories: 0,
      allergens: []
    }
  }
  tagInput.value = ''
  allergenInput.value = ''
  selectedFile.value = null
  imagePreview.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const handleFileChange = (event) => {
  const file = event.target.files[0]
  if (file) {
    selectedFile.value = file
  } else {
    selectedFile.value = null
    imagePreview.value = null
    return
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  // Note: jfif often has MIME type image/jpeg, but we check just in case
  const extension = file.name.split('.').pop().toLowerCase()
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'jfif']
  
  if (!allowedExtensions.includes(extension)) {
    alert('Invalid file type. Allowed types: JPG, JPEG, PNG, GIF, WEBP, JFIF')
    selectedFile.value = null
    imagePreview.value = null
    event.target.value = ''
    return
  }

  // Create preview
  const reader = new FileReader()
  reader.onload = (e) => {
    imagePreview.value = e.target.result
  }
  reader.readAsDataURL(file)
}

const addTag = () => {
  if (tagInput.value.trim() && !formData.value.tags.includes(tagInput.value.trim())) {
    formData.value.tags.push(tagInput.value.trim())
    tagInput.value = ''
  }
}

const removeTag = (index) => {
  formData.value.tags.splice(index, 1)
}

const addAllergen = () => {
  if (allergenInput.value.trim() && !formData.value.allergens.includes(allergenInput.value.trim())) {
    formData.value.allergens.push(allergenInput.value.trim())
    allergenInput.value = ''
  }
}

const removeAllergen = (index) => {
  formData.value.allergens.splice(index, 1)
}

const profitMargin = computed(() => {
  if (formData.value.price > 0 && formData.value.cost > 0) {
    return ((formData.value.price - formData.value.cost) / formData.value.price * 100).toFixed(2)
  }
  return 0
})

const handleSubmit = () => {
  // Validate required fields
  if (!formData.value.name || !formData.value.price || !formData.value.locationId) {
    alert('Please fill all required fields')
    return
  }

  emit('submit', { ...formData.value, imageFile: selectedFile.value })
}

const closeModal = () => {
  emit('update:modelValue', false)
  setTimeout(resetForm, 300)
}

watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    resetForm()
  }
})
</script>

<template>
  <Teleport to="body">
    <div class="modal" :class="{ 'modal-open': modelValue }">
      <div class="modal-box max-w-4xl max-h-[90vh] overflow-y-auto">
      <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" @click="closeModal">
        <IconX class="w-5 h-5" />
      </button>
      
      <h3 class="font-bold text-lg mb-4">{{ isEdit ? 'Edit Product' : 'Create New Product' }}</h3>
      
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <!-- Basic Information -->
        <div class="space-y-3">
          <h4 class="font-semibold text-base">Basic Information</h4>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div class="form-control">
              <label class="label">
                <span class="label-text">Product Name <span class="text-error">*</span></span>
              </label>
              <input 
                v-model="formData.name" 
                type="text" 
                placeholder="e.g., Nasi Goreng Special" 
                class="input input-bordered w-full"
                required
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">SKU</span>
              </label>
              <input 
                v-model="formData.sku" 
                type="text" 
                placeholder="e.g., FOOD-001" 
                class="input input-bordered w-full"
              />
            </div>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Description</span>
            </label>
            <textarea 
              v-model="formData.description" 
              class="textarea textarea-bordered h-20 w-full" 
              placeholder="Product description..."
            ></textarea>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div class="form-control">
              <label class="label">
                <span class="label-text">Category</span>
              </label>
              <select v-model="formData.categoryId" class="select select-bordered w-full" :disabled="categoriesLoading">
                <option value="">{{ categoriesLoading ? 'Loading...' : 'Select category' }}</option>
                <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
              </select>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Product Type</span>
              </label>
              <select v-model="formData.productType" class="select select-bordered w-full">
                <option value="food">Food</option>
                <option value="beverage">Beverage</option>
              </select>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Location <span class="text-error">*</span></span>
              </label>
              <select v-model="formData.locationId" class="select select-bordered w-full" required>
                <option value="">Select location</option>
                <option v-for="location in locations" :key="location.id" :value="location.id">
                  {{ location.name }}
                </option>
              </select>
            </div>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Image URL</span>
            </label>
            <input 
              v-model="formData.imageUrl" 
              type="url" 
              placeholder="https://..." 
              class="input input-bordered w-full"
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Or Upload Image</span>
            </label>
            <input 
              ref="fileInput"
              type="file" 
              accept=".jpg,.jpeg,.png,.gif,.webp,.jfif"
              class="file-input file-input-bordered w-full" 
              @change="handleFileChange"
            />
            <label class="label">
              <span class="label-text-alt text-base-content/60">Allowed: JPG, JPEG, PNG, GIF, WEBP, JFIF</span>
            </label>
            <div v-if="imagePreview" class="mt-2">
              <img :src="imagePreview" alt="Preview" class="h-32 w-32 object-cover rounded-lg shadow" />
            </div>
            <div v-else-if="formData.imageUrl" class="mt-2">
              <img :src="formData.imageUrl" alt="Current Image" class="h-32 w-32 object-cover rounded-lg shadow" />
            </div>
          </div>
        </div>

        <!-- Pricing -->
        <div class="space-y-3">
          <h4 class="font-semibold text-base">Pricing</h4>
          
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div class="form-control">
              <label class="label">
                <span class="label-text">Price <span class="text-error">*</span></span>
              </label>
              <CurrencyInput
                v-model="formData.price"
                :min="0"
                placeholder="0"
                input-class="input input-bordered w-full"
                required
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Cost</span>
              </label>
              <CurrencyInput
                v-model="formData.cost"
                :min="0"
                placeholder="0"
                input-class="input input-bordered w-full"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Profit Margin</span>
              </label>
              <input 
                :value="`${profitMargin}%`" 
                type="text" 
                class="input input-bordered w-full" 
                disabled
              />
            </div>
          </div>
        </div>

        <!-- Stock Management -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h4 class="font-semibold text-base">Stock Management</h4>
            <div class="form-control">
              <label class="label cursor-pointer gap-2">
                <span class="label-text">Track Stock</span>
                <input v-model="formData.trackInventory" type="checkbox" class="toggle toggle-primary" />
              </label>
            </div>
          </div>
          
          <div v-if="formData.trackInventory" class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div class="form-control">
              <label class="label">
                <span class="label-text">Current Stock Quantity</span>
              </label>
              <input 
                v-model.number="formData.stockQuantity" 
                type="number" 
                min="0"
                placeholder="0" 
                class="input input-bordered w-full"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Unit</span>
              </label>
              <select v-model="formData.unit" class="select select-bordered w-full">
                <option v-for="unit in unitOptions" :key="unit" :value="unit">{{ unit }}</option>
              </select>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Min Stock Level</span>
              </label>
              <input 
                v-model.number="formData.minStockLevel" 
                type="number" 
                min="0"
                placeholder="10" 
                class="input input-bordered w-full"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Max Stock Level</span>
              </label>
              <input 
                v-model.number="formData.maxStockLevel" 
                type="number" 
                min="0"
                placeholder="1000" 
                class="input input-bordered w-full"
              />
            </div>
          </div>
        </div>

        <!-- Additional Information -->
        <div class="space-y-3">
          <h4 class="font-semibold text-base">Additional Information</h4>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div class="form-control">
              <label class="label">
                <span class="label-text">Barcode</span>
              </label>
              <input 
                v-model="formData.barcode" 
                type="text" 
                placeholder="123456789" 
                class="input input-bordered w-full"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Preparation Time (minutes)</span>
              </label>
              <input 
                v-model.number="formData.preparationTime" 
                type="number" 
                min="0"
                placeholder="15" 
                class="input input-bordered w-full"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Calories</span>
              </label>
              <input 
                v-model.number="formData.calories" 
                type="number" 
                min="0"
                placeholder="0" 
                class="input input-bordered w-full"
              />
            </div>

            <div class="form-control">
              <label class="label cursor-pointer gap-2">
                <span class="label-text">Available for Sale</span>
                <input v-model="formData.isAvailable" type="checkbox" class="toggle toggle-success" />
              </label>
            </div>
          </div>

          <!-- Tags -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Tags</span>
            </label>
            <div class="flex gap-2 mb-2">
              <input 
                v-model="tagInput" 
                type="text" 
                placeholder="Add tag and press Enter" 
                class="input input-bordered w-full"
                @keypress.enter.prevent="addTag"
              />
              <button type="button" class="btn btn-secondary" @click="addTag">Add</button>
            </div>
            <div class="flex flex-wrap gap-2">
              <div v-for="(tag, index) in formData.tags" :key="index" class="badge badge-lg gap-2">
                {{ tag }}
                <button type="button" @click="removeTag(index)">
                  <IconX class="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          <!-- Allergens -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Allergens</span>
            </label>
            <div class="flex gap-2 mb-2">
              <select v-model="allergenInput" class="select select-bordered w-full">
                <option value="">Select allergen</option>
                <option v-for="allergen in commonAllergens" :key="allergen" :value="allergen">
                  {{ allergen }}
                </option>
              </select>
              <button type="button" class="btn btn-secondary" @click="addAllergen">Add</button>
            </div>
            <div class="flex flex-wrap gap-2">
              <div v-for="(allergen, index) in formData.allergens" :key="index" class="badge badge-error badge-lg gap-2">
                {{ allergen }}
                <button type="button" @click="removeAllergen(index)">
                  <IconX class="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="modal-action">
          <button type="button" class="btn btn-ghost" @click="closeModal" :disabled="loading">
            Cancel
          </button>
          <button type="submit" class="btn btn-primary" :disabled="loading">
            <span v-if="loading" class="loading loading-spinner"></span>
            {{ isEdit ? 'Update Product' : 'Create Product' }}
          </button>
        </div>
      </form>
    </div>
    <div class="modal-backdrop" @click="closeModal"></div>
    </div>
  </Teleport>
</template>
