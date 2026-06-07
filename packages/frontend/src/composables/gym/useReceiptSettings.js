import { ref } from 'vue'
import { api } from '@/plugins/api'

export function useReceiptSettings() {
  const settings = ref({})
  const loading = ref(false)
  const previewData = ref(null)
  const previewLoading = ref(false)

  // Sample data untuk preview
  const sampleData = {
    businessName: 'Gym & Fitness Center',
    businessAddress: 'Jl. Contoh No. 123, Jakarta',
    businessPhone: '021-12345678',
    date: new Date().toLocaleDateString('id-ID', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    }),
    time: new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }),
    transactionNumber: 'TRX-2024-001',
    customerName: 'John Doe',
    items: [
      {
        name: 'Membership Gold (3 Bulan)',
        quantity: 1,
        price: 1500000,
        subtotal: 1500000
      },
      {
        name: 'PT Session (12 Sesi)',
        quantity: 1,
        price: 2400000,
        subtotal: 2400000
      }
    ],
    subtotal: '3.900.000',
    tax: '390.000',
    discount: '0',
    total: '4.290.000'
  }

  // Get all templates or specific type
  const fetchSettings = async (type = null) => {
    loading.value = true
    try {
      const url = type 
        ? `/system/receipt-settings?type=${type}` 
        : '/system/receipt-settings'
      
      const response = await api.get(url)
      
      if (response.success) {
        settings.value = response.data
        return response.data
      }
    } catch (error) {
      console.error('Failed to fetch receipt settings:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // Create new template
  const createTemplate = async (type, name, templateSettings) => {
    loading.value = true
    try {
      const response = await api.post('/system/receipt-settings', {
        type,
        name,
        settings: templateSettings
      })

      if (response.success) {
        // Update local settings
        if (!settings.value[type]) {
          settings.value[type] = response.data
        }
        return response.data
      }
    } catch (error) {
      console.error('Failed to create template:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // Update template
  const updateTemplate = async (type, templateSettings) => {
    loading.value = true
    try {
      const response = await api.put('/system/receipt-settings', {
        type,
        settings: templateSettings
      })

      if (response.success) {
        // Update local settings
        settings.value[type] = response.data
        return response.data
      }
    } catch (error) {
      console.error('Failed to update template:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // Reset template to default
  const resetTemplate = async (type = null) => {
    loading.value = true
    try {
      const url = type 
        ? `/system/receipt-settings/reset?type=${type}`
        : '/system/receipt-settings/reset'
      
      const response = await api.post(url)

      if (response.success) {
        if (type) {
          settings.value[type] = response.data
        } else {
          settings.value = response.data
        }
        return response.data
      }
    } catch (error) {
      console.error('Failed to reset template:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // Generate preview
  const generatePreview = (templateContent, type = 'receipt') => {
    previewLoading.value = true
    
    try {
      let preview = templateContent || ''
      
      // Replace all template variables with sample data
      preview = preview.replace(/\{\{\s*businessName\s*\}\}/g, sampleData.businessName)
      preview = preview.replace(/\{\{\s*businessAddress\s*\}\}/g, sampleData.businessAddress)
      preview = preview.replace(/\{\{\s*businessPhone\s*\}\}/g, sampleData.businessPhone)
      preview = preview.replace(/\{\{\s*date\s*\}\}/g, sampleData.date)
      preview = preview.replace(/\{\{\s*time\s*\}\}/g, sampleData.time)
      preview = preview.replace(/\{\{\s*transactionNumber\s*\}\}/g, sampleData.transactionNumber)
      preview = preview.replace(/\{\{\s*customerName\s*\}\}/g, sampleData.customerName)
      preview = preview.replace(/\{\{\s*subtotal\s*\}\}/g, sampleData.subtotal)
      preview = preview.replace(/\{\{\s*tax\s*\}\}/g, sampleData.tax)
      preview = preview.replace(/\{\{\s*discount\s*\}\}/g, sampleData.discount)
      preview = preview.replace(/\{\{\s*total\s*\}\}/g, sampleData.total)
      
      // Replace items variable with formatted item list
      if (preview.includes('{{ items }}')) {
        const itemsText = sampleData.items.map((item, index) => 
          `${index + 1}. ${item.name}\n  ${item.quantity}x Rp ${item.price.toLocaleString('id-ID')}${' '.repeat(50)}Rp ${item.subtotal.toLocaleString('id-ID')}`
        ).join('\n\n')
        preview = preview.replace(/\{\{\s*items\s*\}\}/g, itemsText)
      }
      
      previewData.value = preview
      return preview
    } finally {
      previewLoading.value = false
    }
  }

  // Quick language switch
  const setLanguage = async (type, lang) => {
    const labels = {
      id: {
        orderLabel: 'Order',
        dateLabel: 'Tanggal',
        typeLabel: 'Tipe',
        tableLabel: 'Meja',
        customerLabel: 'Pelanggan',
        cashierLabel: 'Kasir',
        subtotalLabel: 'Subtotal',
        discountLabel: 'Diskon',
        taxLabel: 'Pajak',
        totalLabel: 'TOTAL',
        paymentLabel: 'Pembayaran',
        paidLabel: 'Dibayar',
        changeLabel: 'Kembalian',
        thankYouMessage: 'Terima kasih atas kunjungan Anda!'
      },
      en: {
        orderLabel: 'Order',
        dateLabel: 'Date',
        typeLabel: 'Type',
        tableLabel: 'Table',
        customerLabel: 'Customer',
        cashierLabel: 'Cashier',
        subtotalLabel: 'Subtotal',
        discountLabel: 'Discount',
        taxLabel: 'Tax',
        totalLabel: 'TOTAL',
        paymentLabel: 'Payment',
        paidLabel: 'Paid',
        changeLabel: 'Change',
        thankYouMessage: 'Thank you for your visit!'
      }
    }

    return await updateTemplate(type, {
      body: labels[lang],
      footer: { thankYouMessage: labels[lang].thankYouMessage }
    })
  }

  // Test print template
  const testPrint = async (type, printerId, templateSettings, customSampleData = null) => {
    loading.value = true
    try {
      const response = await api.post('/system/receipt-settings/test-print', {
        type,
        printerId,
        settings: templateSettings,
        sampleData: customSampleData || sampleData
      })

      if (response.success) {
        return response.data
      }
    } catch (error) {
      console.error('Failed to test print:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // Test print dengan settings yang sudah tersimpan (simple)
  const testPrintActual = async (type, printerId, customSampleData = null) => {
    loading.value = true
    try {
      const payload = {
        type,
        printerId
      }
      
      // Tambahkan sampleData jika ada
      if (customSampleData) {
        payload.sampleData = customSampleData
      }

      const response = await api.post('/system/receipt-settings/test-print-actual', payload)

      if (response.success) {
        return response.data
      }
    } catch (error) {
      console.error('Failed to test print:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  return {
    settings,
    loading,
    previewData,
    previewLoading,
    sampleData,
    fetchSettings,
    createTemplate,
    updateTemplate,
    resetTemplate,
    generatePreview,
    setLanguage,
    testPrint,
    testPrintActual
  }
}
