# Vue.js Integration - Receipt Template System

Complete guide untuk mengintegrasikan Receipt Template System dengan Vue.js 3 (Composition API & Options API).

## Table of Contents
- [Setup](#setup)
- [API Service](#api-service)
- [Composables](#composables)
- [Components](#components)
- [Pages](#pages)
- [Usage Examples](#usage-examples)

---

## Setup

### Install Dependencies

```bash
npm install axios
```

### Environment Variables

```env
# .env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

---

## API Service

### `src/services/receiptTemplateService.js`

```javascript
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

// Create axios instance with auth interceptor
const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const receiptTemplateService = {
  /**
   * Get all templates
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getAllTemplates(params = {}) {
    return apiClient.get('/system/receipt-templates', { params });
  },

  /**
   * Get single template
   * @param {string} id - Template ID
   * @returns {Promise}
   */
  getTemplate(id) {
    return apiClient.get(`/system/receipt-templates/${id}`);
  },

  /**
   * Create new template
   * @param {Object} data - Template data
   * @returns {Promise}
   */
  createTemplate(data) {
    return apiClient.post('/system/receipt-templates', data);
  },

  /**
   * Update template
   * @param {string} id - Template ID
   * @param {Object} data - Update data
   * @returns {Promise}
   */
  updateTemplate(id, data) {
    return apiClient.patch(`/system/receipt-templates/${id}`, data);
  },

  /**
   * Delete template
   * @param {string} id - Template ID
   * @returns {Promise}
   */
  deleteTemplate(id) {
    return apiClient.delete(`/system/receipt-templates/${id}`);
  },

  /**
   * Duplicate template
   * @param {string} id - Template ID
   * @param {string} newName - New template name
   * @returns {Promise}
   */
  duplicateTemplate(id, newName) {
    return apiClient.post(`/system/receipt-templates/${id}/duplicate`, {
      name: newName
    });
  },

  /**
   * Preview template with sample data
   * @param {string} id - Template ID
   * @param {Object} data - Sample data (optional)
   * @returns {Promise}
   */
  previewTemplate(id, data = null) {
    return apiClient.post(`/system/receipt-templates/${id}/preview`, {
      data
    });
  }
};
```

---

## Composables

### `src/composables/useReceiptTemplates.js`

```javascript
import { ref, computed } from 'vue';
import { receiptTemplateService } from '@/services/receiptTemplateService';

export function useReceiptTemplates() {
  const templates = ref([]);
  const currentTemplate = ref(null);
  const loading = ref(false);
  const error = ref(null);
  const previewData = ref(null);

  // Computed
  const activeTemplates = computed(() => 
    templates.value.filter(t => t.isActive)
  );

  const defaultTemplate = computed(() => 
    templates.value.find(t => t.isDefault)
  );

  const templatesByType = computed(() => (type) => 
    templates.value.filter(t => t.templateType === type)
  );

  // Methods
  const fetchTemplates = async (params = {}) => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await receiptTemplateService.getAllTemplates(params);
      templates.value = response.data.data;
      return response.data;
    } catch (err) {
      error.value = err.response?.data?.message || err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchTemplate = async (id) => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await receiptTemplateService.getTemplate(id);
      currentTemplate.value = response.data.data;
      return response.data.data;
    } catch (err) {
      error.value = err.response?.data?.message || err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const createTemplate = async (data) => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await receiptTemplateService.createTemplate(data);
      templates.value.push(response.data.data);
      return response.data.data;
    } catch (err) {
      error.value = err.response?.data?.message || err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateTemplate = async (id, data) => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await receiptTemplateService.updateTemplate(id, data);
      const index = templates.value.findIndex(t => t.id === id);
      if (index !== -1) {
        templates.value[index] = response.data.data;
      }
      if (currentTemplate.value?.id === id) {
        currentTemplate.value = response.data.data;
      }
      return response.data.data;
    } catch (err) {
      error.value = err.response?.data?.message || err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteTemplate = async (id) => {
    loading.value = true;
    error.value = null;
    
    try {
      await receiptTemplateService.deleteTemplate(id);
      templates.value = templates.value.filter(t => t.id !== id);
      if (currentTemplate.value?.id === id) {
        currentTemplate.value = null;
      }
    } catch (err) {
      error.value = err.response?.data?.message || err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const duplicateTemplate = async (id, newName) => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await receiptTemplateService.duplicateTemplate(id, newName);
      templates.value.push(response.data.data);
      return response.data.data;
    } catch (err) {
      error.value = err.response?.data?.message || err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const previewTemplate = async (id, data = null) => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await receiptTemplateService.previewTemplate(id, data);
      previewData.value = response.data.data;
      return response.data.data;
    } catch (err) {
      error.value = err.response?.data?.message || err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    // State
    templates,
    currentTemplate,
    loading,
    error,
    previewData,
    
    // Computed
    activeTemplates,
    defaultTemplate,
    templatesByType,
    
    // Methods
    fetchTemplates,
    fetchTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    previewTemplate
  };
}
```

---

## Components

### 1. Template List Component

**`src/components/ReceiptTemplates/TemplateList.vue`**

```vue
<template>
  <div class="template-list">
    <!-- Header -->
    <div class="header">
      <h2>Receipt Templates</h2>
      <button @click="$emit('create')" class="btn-primary">
        <i class="icon-plus"></i>
        Create Template
      </button>
    </div>

    <!-- Filters -->
    <div class="filters">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search templates..."
        class="search-input"
      />
      
      <select v-model="filterType" class="filter-select">
        <option value="">All Types</option>
        <option value="receipt">Receipt</option>
        <option value="kitchen">Kitchen</option>
        <option value="label">Label</option>
        <option value="invoice">Invoice</option>
      </select>

      <select v-model="filterActive" class="filter-select">
        <option value="">All Status</option>
        <option value="true">Active</option>
        <option value="false">Inactive</option>
      </select>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Loading templates...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="error-message">
      {{ error }}
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredTemplates.length === 0" class="empty-state">
      <i class="icon-empty"></i>
      <p>No templates found</p>
      <button @click="$emit('create')" class="btn-secondary">
        Create Your First Template
      </button>
    </div>

    <!-- Template Grid -->
    <div v-else class="template-grid">
      <div
        v-for="template in filteredTemplates"
        :key="template.id"
        class="template-card"
        :class="{ 'default': template.isDefault }"
      >
        <!-- Header -->
        <div class="card-header">
          <h3>{{ template.name }}</h3>
          <div class="badges">
            <span v-if="template.isDefault" class="badge badge-primary">
              Default
            </span>
            <span 
              class="badge" 
              :class="template.isActive ? 'badge-success' : 'badge-secondary'"
            >
              {{ template.isActive ? 'Active' : 'Inactive' }}
            </span>
          </div>
        </div>

        <!-- Info -->
        <div class="card-body">
          <div class="info-row">
            <span class="label">Type:</span>
            <span class="value">{{ formatType(template.templateType) }}</span>
          </div>
          <div class="info-row">
            <span class="label">Paper Width:</span>
            <span class="value">{{ template.paperWidth }} chars</span>
          </div>
          <div class="info-row">
            <span class="label">Updated:</span>
            <span class="value">{{ formatDate(template.updatedAt) }}</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="card-actions">
          <button
            @click="$emit('preview', template.id)"
            class="btn-icon"
            title="Preview"
          >
            <i class="icon-eye"></i>
          </button>
          <button
            @click="$emit('edit', template.id)"
            class="btn-icon"
            title="Edit"
          >
            <i class="icon-edit"></i>
          </button>
          <button
            @click="$emit('duplicate', template.id)"
            class="btn-icon"
            title="Duplicate"
          >
            <i class="icon-copy"></i>
          </button>
          <button
            @click="$emit('delete', template.id)"
            class="btn-icon btn-danger"
            title="Delete"
          >
            <i class="icon-trash"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  templates: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: null
  }
});

defineEmits(['create', 'edit', 'preview', 'duplicate', 'delete']);

const searchQuery = ref('');
const filterType = ref('');
const filterActive = ref('');

const filteredTemplates = computed(() => {
  return props.templates.filter(template => {
    const matchesSearch = template.name
      .toLowerCase()
      .includes(searchQuery.value.toLowerCase());
    
    const matchesType = !filterType.value || 
      template.templateType === filterType.value;
    
    const matchesActive = !filterActive.value || 
      template.isActive.toString() === filterActive.value;
    
    return matchesSearch && matchesType && matchesActive;
  });
});

const formatType = (type) => {
  return type.charAt(0).toUpperCase() + type.slice(1);
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};
</script>

<style scoped>
.template-list {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.filters {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.search-input,
.filter-select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
}

.search-input {
  flex: 1;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.template-card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  transition: box-shadow 0.2s;
}

.template-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.template-card.default {
  border-color: #4caf50;
  background: #f1f8f4;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 12px;
}

.badges {
  display: flex;
  gap: 6px;
}

.badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.badge-primary {
  background: #4caf50;
  color: white;
}

.badge-success {
  background: #2196f3;
  color: white;
}

.badge-secondary {
  background: #9e9e9e;
  color: white;
}

.card-body {
  margin-bottom: 16px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
}

.info-row .label {
  color: #666;
}

.card-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.btn-icon {
  padding: 8px;
  border: none;
  background: #f5f5f5;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-icon:hover {
  background: #e0e0e0;
}

.btn-icon.btn-danger:hover {
  background: #ffebee;
  color: #f44336;
}

.loading,
.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #2196f3;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-message {
  padding: 16px;
  background: #ffebee;
  color: #c62828;
  border-radius: 6px;
  margin-bottom: 20px;
}
</style>
```

### 2. Template Form Component

**`src/components/ReceiptTemplates/TemplateForm.vue`**

```vue
<template>
  <div class="template-form">
    <form @submit.prevent="handleSubmit">
      <!-- Basic Info -->
      <section class="form-section">
        <h3>Basic Information</h3>
        
        <div class="form-group">
          <label>Template Name *</label>
          <input
            v-model="form.name"
            type="text"
            placeholder="e.g., Main Cashier Receipt"
            required
          />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Template Type *</label>
            <select v-model="form.templateType" required>
              <option value="receipt">Receipt</option>
              <option value="kitchen">Kitchen Order</option>
              <option value="label">Label</option>
              <option value="invoice">Invoice</option>
              <option value="report">Report</option>
            </select>
          </div>

          <div class="form-group">
            <label>Paper Width (chars) *</label>
            <input
              v-model.number="form.paperWidth"
              type="number"
              min="32"
              max="80"
              required
            />
            <small>Standard 80mm = 48 chars, 58mm = 32 chars</small>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group checkbox">
            <label>
              <input v-model="form.isActive" type="checkbox" />
              Active
            </label>
          </div>

          <div class="form-group checkbox">
            <label>
              <input v-model="form.isDefault" type="checkbox" />
              Set as Default
            </label>
          </div>
        </div>
      </section>

      <!-- Header Section -->
      <section class="form-section">
        <h3>Header</h3>

        <div class="form-group checkbox">
          <label>
            <input v-model="form.header.showLogo" type="checkbox" />
            Show Logo
          </label>
        </div>

        <div class="form-group checkbox">
          <label>
            <input v-model="form.header.showBusinessName" type="checkbox" />
            Show Business Name
          </label>
        </div>

        <div class="form-group checkbox">
          <label>
            <input v-model="form.header.showBusinessInfo" type="checkbox" />
            Show Business Info (Address & Phone)
          </label>
        </div>

        <div class="form-group">
          <label>Custom Header Text</label>
          <textarea
            v-model="form.header.customText"
            rows="2"
            placeholder="e.g., WELCOME TO OUR STORE"
          ></textarea>
        </div>
      </section>

      <!-- Body Section -->
      <section class="form-section">
        <h3>Body</h3>

        <div class="checkbox-grid">
          <div class="form-group checkbox">
            <label>
              <input v-model="form.body.showItems" type="checkbox" />
              Show Items
            </label>
          </div>

          <div class="form-group checkbox">
            <label>
              <input v-model="form.body.showItemDetails" type="checkbox" />
              Show Item Details
            </label>
          </div>

          <div class="form-group checkbox">
            <label>
              <input v-model="form.body.showPrices" type="checkbox" />
              Show Prices
            </label>
          </div>

          <div class="form-group checkbox">
            <label>
              <input v-model="form.body.showSubtotal" type="checkbox" />
              Show Subtotal
            </label>
          </div>

          <div class="form-group checkbox">
            <label>
              <input v-model="form.body.showTax" type="checkbox" />
              Show Tax
            </label>
          </div>

          <div class="form-group checkbox">
            <label>
              <input v-model="form.body.showDiscount" type="checkbox" />
              Show Discount
            </label>
          </div>
        </div>
      </section>

      <!-- Footer Section -->
      <section class="form-section">
        <h3>Footer</h3>

        <div class="form-group checkbox">
          <label>
            <input v-model="form.footer.showThankYou" type="checkbox" />
            Show Thank You Message
          </label>
        </div>

        <div class="form-group checkbox">
          <label>
            <input v-model="form.footer.showDateTime" type="checkbox" />
            Show Date & Time
          </label>
        </div>

        <div class="form-group checkbox">
          <label>
            <input v-model="form.footer.showQRCode" type="checkbox" />
            Show QR Code
          </label>
        </div>

        <div class="form-group">
          <label>Custom Footer Text</label>
          <textarea
            v-model="form.footer.customText"
            rows="2"
            placeholder="e.g., Items purchased cannot be returned"
          ></textarea>
        </div>
      </section>

      <!-- Actions -->
      <div class="form-actions">
        <button type="button" @click="$emit('cancel')" class="btn-secondary">
          Cancel
        </button>
        <button type="submit" class="btn-primary" :disabled="loading">
          {{ loading ? 'Saving...' : 'Save Template' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  template: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['submit', 'cancel']);

const form = ref({
  name: '',
  templateType: 'receipt',
  paperWidth: 48,
  isActive: true,
  isDefault: false,
  header: {
    showLogo: false,
    showBusinessName: true,
    showBusinessInfo: true,
    customText: ''
  },
  body: {
    showItems: true,
    showItemDetails: true,
    showPrices: true,
    showSubtotal: true,
    showTax: true,
    showDiscount: true,
    customSections: []
  },
  footer: {
    showThankYou: true,
    showDateTime: true,
    showQRCode: false,
    customText: ''
  }
});

// Load template data if editing
watch(() => props.template, (newTemplate) => {
  if (newTemplate) {
    form.value = { ...newTemplate };
  }
}, { immediate: true });

const handleSubmit = () => {
  emit('submit', form.value);
};
</script>

<style scoped>
.template-form {
  max-width: 800px;
  margin: 0 auto;
}

.form-section {
  background: white;
  padding: 24px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.form-section h3 {
  margin-bottom: 20px;
  color: #333;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #555;
}

.form-group input[type="text"],
.form-group input[type="number"],
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.form-group small {
  display: block;
  margin-top: 4px;
  color: #666;
  font-size: 12px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group.checkbox label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.form-group.checkbox input[type="checkbox"] {
  width: auto;
}

.checkbox-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

.btn-primary,
.btn-secondary {
  padding: 10px 24px;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary {
  background: #2196f3;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #1976d2;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f5f5f5;
  color: #333;
}

.btn-secondary:hover {
  background: #e0e0e0;
}
</style>
```

### 3. Preview Modal Component

**`src/components/ReceiptTemplates/PreviewModal.vue`**

```vue
<template>
  <teleport to="body">
    <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Template Preview</h2>
          <button @click="$emit('close')" class="btn-close">×</button>
        </div>

        <div class="modal-body">
          <div v-if="loading" class="loading">
            <div class="spinner"></div>
            <p>Generating preview...</p>
          </div>

          <div v-else-if="error" class="error-message">
            {{ error }}
          </div>

          <div v-else-if="preview" class="preview-container">
            <!-- Receipt Preview -->
            <div class="receipt-preview">
              <pre>{{ preview.preview }}</pre>
            </div>

            <!-- Info -->
            <div class="preview-info">
              <p>
                <strong>Raw ESC/POS Size:</strong> {{ preview.raw.length }} bytes
              </p>
              <p>
                <strong>Variables Used:</strong> businessName, items, total, etc.
              </p>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button @click="$emit('close')" class="btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup>
defineProps({
  show: Boolean,
  preview: Object,
  loading: Boolean,
  error: String
});

defineEmits(['close']);
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
}

.btn-close {
  background: none;
  border: none;
  font-size: 32px;
  cursor: pointer;
  color: #666;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.receipt-preview {
  background: #f5f5f5;
  padding: 20px;
  border-radius: 6px;
  overflow-x: auto;
  margin-bottom: 16px;
}

.receipt-preview pre {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.4;
  margin: 0;
  white-space: pre;
}

.preview-info {
  padding: 12px;
  background: #e3f2fd;
  border-radius: 6px;
  font-size: 14px;
}

.preview-info p {
  margin: 4px 0;
}

.modal-actions {
  padding: 20px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  justify-content: flex-end;
}

.loading {
  text-align: center;
  padding: 40px 20px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #2196f3;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-message {
  padding: 16px;
  background: #ffebee;
  color: #c62828;
  border-radius: 6px;
}
</style>
```

---

## Pages

### Main Template Management Page

**`src/pages/ReceiptTemplates.vue`**

```vue
<template>
  <div class="page-container">
    <div class="page-header">
      <h1>Receipt Templates</h1>
      <p>Manage your thermal printer receipt templates</p>
    </div>

    <!-- List View -->
    <template-list
      v-if="!showForm"
      :templates="templates"
      :loading="loading"
      :error="error"
      @create="handleCreate"
      @edit="handleEdit"
      @preview="handlePreview"
      @duplicate="handleDuplicate"
      @delete="handleDelete"
    />

    <!-- Form View -->
    <template-form
      v-else
      :template="currentTemplate"
      :loading="loading"
      @submit="handleSubmit"
      @cancel="handleCancel"
    />

    <!-- Preview Modal -->
    <preview-modal
      :show="showPreview"
      :preview="previewData"
      :loading="loading"
      :error="error"
      @close="showPreview = false"
    />

    <!-- Delete Confirmation -->
    <confirm-dialog
      v-if="deleteId"
      title="Delete Template"
      message="Are you sure you want to delete this template? This action cannot be undone."
      @confirm="confirmDelete"
      @cancel="deleteId = null"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useReceiptTemplates } from '@/composables/useReceiptTemplates';
import TemplateList from '@/components/ReceiptTemplates/TemplateList.vue';
import TemplateForm from '@/components/ReceiptTemplates/TemplateForm.vue';
import PreviewModal from '@/components/ReceiptTemplates/PreviewModal.vue';
import ConfirmDialog from '@/components/Common/ConfirmDialog.vue';

const {
  templates,
  currentTemplate,
  loading,
  error,
  previewData,
  fetchTemplates,
  fetchTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  previewTemplate
} = useReceiptTemplates();

const showForm = ref(false);
const showPreview = ref(false);
const deleteId = ref(null);

onMounted(() => {
  fetchTemplates();
});

const handleCreate = () => {
  currentTemplate.value = null;
  showForm.value = true;
};

const handleEdit = async (id) => {
  await fetchTemplate(id);
  showForm.value = true;
};

const handleSubmit = async (data) => {
  try {
    if (currentTemplate.value?.id) {
      await updateTemplate(currentTemplate.value.id, data);
    } else {
      await createTemplate(data);
    }
    showForm.value = false;
    fetchTemplates();
  } catch (err) {
    console.error('Failed to save template:', err);
  }
};

const handleCancel = () => {
  showForm.value = false;
  currentTemplate.value = null;
};

const handlePreview = async (id) => {
  showPreview.value = true;
  await previewTemplate(id);
};

const handleDuplicate = async (id) => {
  const template = templates.value.find(t => t.id === id);
  if (!template) return;
  
  const newName = prompt('Enter name for duplicated template:', `${template.name} (Copy)`);
  if (!newName) return;
  
  try {
    await duplicateTemplate(id, newName);
  } catch (err) {
    console.error('Failed to duplicate template:', err);
  }
};

const handleDelete = (id) => {
  deleteId.value = id;
};

const confirmDelete = async () => {
  try {
    await deleteTemplate(deleteId.value);
    deleteId.value = null;
  } catch (err) {
    console.error('Failed to delete template:', err);
  }
};
</script>

<style scoped>
.page-container {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 32px;
}

.page-header h1 {
  font-size: 28px;
  margin-bottom: 8px;
}

.page-header p {
  color: #666;
  font-size: 16px;
}
</style>
```

---

## Usage Examples

### 1. Basic Usage in Vue Router

```javascript
// router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import ReceiptTemplates from '@/pages/ReceiptTemplates.vue';

const routes = [
  {
    path: '/settings/receipt-templates',
    name: 'ReceiptTemplates',
    component: ReceiptTemplates,
    meta: { requiresAuth: true }
  }
];

export default createRouter({
  history: createWebHistory(),
  routes
});
```

### 2. Use Composable Directly

```vue
<script setup>
import { onMounted } from 'vue';
import { useReceiptTemplates } from '@/composables/useReceiptTemplates';

const { templates, loading, fetchTemplates, createTemplate } = useReceiptTemplates();

onMounted(async () => {
  await fetchTemplates();
});

const handleCreate = async () => {
  const newTemplate = {
    name: 'My Template',
    templateType: 'receipt',
    paperWidth: 48,
    isActive: true,
    header: {
      showBusinessName: true,
      showBusinessInfo: true
    },
    body: {
      showItems: true,
      showPrices: true
    },
    footer: {
      showThankYou: true
    }
  };
  
  await createTemplate(newTemplate);
};
</script>
```

### 3. Filter Templates by Type

```vue
<script setup>
import { computed } from 'vue';
import { useReceiptTemplates } from '@/composables/useReceiptTemplates';

const { templates, fetchTemplates } = useReceiptTemplates();

const receiptTemplates = computed(() => 
  templates.value.filter(t => t.templateType === 'receipt')
);

const kitchenTemplates = computed(() => 
  templates.value.filter(t => t.templateType === 'kitchen')
);
</script>
```

### 4. Preview with Custom Data

```vue
<script setup>
import { useReceiptTemplates } from '@/composables/useReceiptTemplates';

const { previewTemplate } = useReceiptTemplates();

const customPreview = async (templateId) => {
  const customData = {
    businessName: 'My Gym',
    transactionNumber: 'TRX-001',
    items: [
      { name: 'Membership', quantity: 1, price: 500000 }
    ],
    total: 500000
  };
  
  const preview = await previewTemplate(templateId, customData);
  console.log(preview.preview); // Human-readable format
  console.log(preview.raw);     // ESC/POS commands
};
</script>
```

---

## Options API Version

For Vue 2 or Options API users:

```vue
<script>
import { receiptTemplateService } from '@/services/receiptTemplateService';

export default {
  data() {
    return {
      templates: [],
      loading: false,
      error: null
    };
  },
  
  mounted() {
    this.fetchTemplates();
  },
  
  methods: {
    async fetchTemplates() {
      this.loading = true;
      try {
        const response = await receiptTemplateService.getAllTemplates();
        this.templates = response.data.data;
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },
    
    async createTemplate(data) {
      try {
        await receiptTemplateService.createTemplate(data);
        this.fetchTemplates();
      } catch (err) {
        this.error = err.message;
      }
    }
  }
};
</script>
```

---

## TypeScript Support

### Type Definitions

```typescript
// types/receiptTemplate.ts
export interface ReceiptTemplate {
  id: string;
  name: string;
  templateType: 'receipt' | 'kitchen' | 'label' | 'invoice' | 'report';
  paperWidth: number;
  header: {
    showLogo: boolean;
    showBusinessName: boolean;
    showBusinessInfo: boolean;
    customText: string | null;
  };
  body: {
    showItems: boolean;
    showItemDetails: boolean;
    showPrices: boolean;
    showSubtotal: boolean;
    showTax: boolean;
    showDiscount: boolean;
    customSections: any[];
  };
  footer: {
    showThankYou: boolean;
    showDateTime: boolean;
    showQRCode: boolean;
    customText: string | null;
  };
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PreviewData {
  preview: string;
  raw: string;
}
```

---

## Best Practices

### 1. **Error Handling**
```vue
<script setup>
import { ref } from 'vue';
import { useReceiptTemplates } from '@/composables/useReceiptTemplates';

const { createTemplate } = useReceiptTemplates();
const errorMessage = ref('');

const handleSubmit = async (data) => {
  try {
    await createTemplate(data);
    // Success notification
  } catch (err) {
    errorMessage.value = err.response?.data?.message || 'Failed to create template';
  }
};
</script>
```

### 2. **Loading States**
```vue
<template>
  <button :disabled="loading" @click="save">
    {{ loading ? 'Saving...' : 'Save' }}
  </button>
</template>
```

### 3. **Optimistic Updates**
```javascript
const updateTemplate = async (id, data) => {
  // Update UI immediately
  const index = templates.value.findIndex(t => t.id === id);
  const original = templates.value[index];
  templates.value[index] = { ...original, ...data };
  
  try {
    await receiptTemplateService.updateTemplate(id, data);
  } catch (err) {
    // Revert on error
    templates.value[index] = original;
    throw err;
  }
};
```

---

## Additional Resources

- [Vue 3 Documentation](https://vuejs.org/)
- [Composition API Guide](https://vuejs.org/guide/extras/composition-api-faq.html)
- [Axios Documentation](https://axios-http.com/)
- [ESC/POS Commands Reference](https://reference.epson-biz.com/modules/ref_escpos/index.php)

---

## Support

For issues or questions:
1. Check API documentation in `docs/ROUTES-METADATA-GENERATOR.md`
2. Review backend logs for errors
3. Test endpoints with Postman collection in `docs/postman/`
