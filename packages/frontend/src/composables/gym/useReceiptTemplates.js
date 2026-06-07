import { ref, computed } from 'vue'
import { api } from '@/plugins/api'

const templates = ref([])
const currentTemplate = ref(null)
const loading = ref(false)
const error = ref(null)
const previewData = ref(null)

export const useReceiptTemplates = () => {
  // Computed
  const activeTemplates = computed(() => 
    templates.value.filter(t => t.isActive)
  )

  const defaultTemplate = computed(() => 
    templates.value.find(t => t.isDefault)
  )

  const templatesByType = computed(() => (type) => 
    templates.value.filter(t => t.templateType === type)
  )

  /**
   * Get all receipt templates
   * @param {Object} params - Query parameters
   */
  const fetchTemplates = async (params = {}) => {
    loading.value = true
    error.value = null
    
    try {
      const queryParams = new URLSearchParams()
      if (params.templateType) queryParams.append('templateType', params.templateType)
      if (params.isActive !== undefined) queryParams.append('isActive', params.isActive)
      if (params.search) queryParams.append('search', params.search)

      const response = await api.get(`/system/receipt-templates?${queryParams.toString()}`)
      
      if (response.success) {
        templates.value = response.data || []
        return templates.value
      }
      
      throw new Error(response.message || 'Failed to fetch templates')
    } catch (err) {
      error.value = err.message
      console.error('Fetch templates error:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get single template by ID
   * @param {String} id - Template ID
   */
  const fetchTemplate = async (id) => {
    loading.value = true
    error.value = null
    
    try {
      const response = await api.get(`/system/receipt-templates/${id}`)
      
      if (response.success) {
        currentTemplate.value = response.data
        return response.data
      }
      
      throw new Error(response.message || 'Failed to fetch template')
    } catch (err) {
      error.value = err.message
      console.error('Fetch template error:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Create new template
   * @param {Object} data - Template data
   */
  const createTemplate = async (data) => {
    loading.value = true
    error.value = null
    
    try {
      const response = await api.post('/system/receipt-templates', data)
      
      if (response.success) {
        templates.value.push(response.data)
        return response.data
      }
      
      throw new Error(response.message || 'Failed to create template')
    } catch (err) {
      error.value = err.message
      console.error('Create template error:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Update template
   * @param {String} id - Template ID
   * @param {Object} data - Update data
   */
  const updateTemplate = async (id, data) => {
    loading.value = true
    error.value = null
    
    try {
      const response = await api.patch(`/system/receipt-templates/${id}`, data)
      
      if (response.success) {
        const index = templates.value.findIndex(t => t.id === id)
        if (index !== -1) {
          templates.value[index] = response.data
        }
        if (currentTemplate.value?.id === id) {
          currentTemplate.value = response.data
        }
        return response.data
      }
      
      throw new Error(response.message || 'Failed to update template')
    } catch (err) {
      error.value = err.message
      console.error('Update template error:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Delete template
   * @param {String} id - Template ID
   */
  const deleteTemplate = async (id) => {
    loading.value = true
    error.value = null
    
    try {
      const response = await api.delete(`/system/receipt-templates/${id}`)
      
      if (response.success) {
        templates.value = templates.value.filter(t => t.id !== id)
        if (currentTemplate.value?.id === id) {
          currentTemplate.value = null
        }
        return true
      }
      
      throw new Error(response.message || 'Failed to delete template')
    } catch (err) {
      error.value = err.message
      console.error('Delete template error:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Duplicate template
   * @param {String} id - Template ID
   * @param {String} newName - New template name
   */
  const duplicateTemplate = async (id, newName) => {
    loading.value = true
    error.value = null
    
    try {
      const response = await api.post(`/system/receipt-templates/${id}/duplicate`, {
        name: newName
      })
      
      if (response.success) {
        templates.value.push(response.data)
        return response.data
      }
      
      throw new Error(response.message || 'Failed to duplicate template')
    } catch (err) {
      error.value = err.message
      console.error('Duplicate template error:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Preview template with sample data
   * @param {String} id - Template ID
   * @param {Object} sampleData - Sample data (optional)
   */
  const previewTemplate = async (id, sampleData = null) => {
    loading.value = true
    error.value = null
    
    try {
      const response = await api.post(`/system/receipt-templates/${id}/preview`, {
        data: sampleData
      })
      
      if (response.success) {
        previewData.value = response.data
        return response.data
      }
      
      throw new Error(response.message || 'Failed to preview template')
    } catch (err) {
      error.value = err.message
      console.error('Preview template error:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

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
  }
}
