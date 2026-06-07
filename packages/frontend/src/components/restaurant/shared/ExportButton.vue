<script setup>
import { ref } from 'vue'

const props = defineProps({
  data: {
    type: Array,
    required: true
  },
  filename: {
    type: String,
    default: 'export'
  },
  columns: {
    type: Array,
    default: () => []
  },
  label: {
    type: String,
    default: 'Export'
  },
  showIcon: {
    type: Boolean,
    default: true
  },
  formats: {
    type: Array,
    default: () => ['csv', 'json'],
    validator: (value) => value.every(format => ['csv', 'json', 'pdf'].includes(format))
  }
})

const loading = ref(false)

// Export to CSV
const exportToCSV = () => {
  loading.value = true
  
  try {
    let csvContent = ''
    
    // Headers
    if (props.columns.length > 0) {
      csvContent += props.columns.map(col => `"${col.label || col.key}"`).join(',') + '\n'
    } else if (props.data.length > 0) {
      csvContent += Object.keys(props.data[0]).map(key => `"${key}"`).join(',') + '\n'
    }
    
    // Rows
    props.data.forEach(row => {
      if (props.columns.length > 0) {
        csvContent += props.columns.map(col => {
          const value = row[col.key] || ''
          return `"${String(value).replace(/"/g, '""')}"`
        }).join(',') + '\n'
      } else {
        csvContent += Object.values(row).map(value => {
          return `"${String(value).replace(/"/g, '""')}"`
        }).join(',') + '\n'
      }
    })
    
    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${props.filename}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (error) {
    console.error('Error exporting CSV:', error)
    alert('Failed to export CSV')
  } finally {
    loading.value = false
  }
}

// Export to JSON
const exportToJSON = () => {
  loading.value = true
  
  try {
    const jsonContent = JSON.stringify(props.data, null, 2)
    const blob = new Blob([jsonContent], { type: 'application/json' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${props.filename}.json`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (error) {
    console.error('Error exporting JSON:', error)
    alert('Failed to export JSON')
  } finally {
    loading.value = false
  }
}

// Export to PDF (placeholder - requires jsPDF library)
const exportToPDF = () => {
  loading.value = true
  
  try {
    alert('PDF export requires jsPDF library. Please install: npm install jspdf jspdf-autotable')
    // Implementation would go here with jsPDF
  } catch (error) {
    console.error('Error exporting PDF:', error)
    alert('Failed to export PDF')
  } finally {
    loading.value = false
  }
}

const handleExport = (format) => {
  if (props.data.length === 0) {
    alert('No data to export')
    return
  }
  
  switch (format) {
    case 'csv':
      exportToCSV()
      break
    case 'json':
      exportToJSON()
      break
    case 'pdf':
      exportToPDF()
      break
    default:
      console.warn('Unknown export format:', format)
  }
}
</script>

<template>
  <div class="dropdown dropdown-end">
    <label 
      tabindex="0" 
      class="btn btn-sm btn-outline"
      :class="{ 'loading': loading }"
    >
      <svg 
        v-if="showIcon && !loading" 
        xmlns="http://www.w3.org/2000/svg" 
        class="h-5 w-5 mr-1" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      {{ loading ? 'Exporting...' : label }}
    </label>
    
    <ul 
      v-if="!loading"
      tabindex="0" 
      class="dropdown-content z-[1] menu p-2 shadow-lg bg-base-100 rounded-box w-52 mt-1 border border-base-300"
    >
      <li v-if="formats.includes('csv')">
        <a @click="handleExport('csv')">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export as CSV
        </a>
      </li>
      
      <li v-if="formats.includes('json')">
        <a @click="handleExport('json')">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          Export as JSON
        </a>
      </li>
      
      <li v-if="formats.includes('pdf')">
        <a @click="handleExport('pdf')">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          Export as PDF
        </a>
      </li>
    </ul>
  </div>
</template>
