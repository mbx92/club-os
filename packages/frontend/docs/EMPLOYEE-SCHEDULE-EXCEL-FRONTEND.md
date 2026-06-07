# Frontend Integration Guide: Employee Schedule Excel Export

This document explains how to call the new endpoint to download the Employee Schedule as an Excel file from a frontend web or mobile application.

## API Endpoint

**Endpoint:** `GET /gym/employee-schedules/export`

**Purpose:** Downloads the employee schedule records as an Excel file (`.xlsx`).

**Query Parameters:**
This endpoint supports the exact same query parameters as the `GET /gym/employee-schedules` listing endpoint, allowing you to export whatever the user has currently filtered on the frontend.
- `startDate` (string, optional) - e.g., "2026-03-01"
- `endDate` (string, optional) - e.g., "2026-03-31"
- `periodId` (string/number, optional) - Filter by a specific schedule period
- `employeeId` (string, optional) - Employee number (from `DeviceEmployee.employeeNo`)
- `userId` (string/number, optional) - Internal system user ID (legacy)
- `isOff` (boolean, optional) - "true" to export only off days, "false" to export only working days

*Note: Pagination parameters (`page` and `limit`) are ignored because the export downloads all matching records.*

## Frontend Implementation Example (Vue 3 / Axios)

When downloading a file via an AJAX request (like Axios or Fetch), you **must** specify the `responseType` as `'blob'` so that the browser treats the response as a binary file instead of text.

### Example Function

```javascript
import axios from 'axios';

/**
 * Downloads the Employee Schedule as an Excel file.
 * 
 * @param {Object} filters - Search filters currently applied in the UI
 */
export async function downloadScheduleExcel(filters) {
  try {
    const response = await axios.get('/gym/employee-schedules/export', {
      params: filters,
      responseType: 'blob', // IMPORTANT: Required for handling binary files
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}` // Ensure auth header is present
      }
    });

    // 1. Create a Blob from the response data
    const blob = new Blob([response.data], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    // 2. Extract filename from Content-Disposition header if possible, 
    // or provide a fallback default name.
    let filename = 'jadwal-karyawan.xlsx';
    const contentDisposition = response.headers['content-disposition'];
    if (contentDisposition && contentDisposition.includes('filename=')) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) {
        filename = match[1];
      }
    }

    // 3. Create a temporary download link and trigger the download
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    
    // 4. Cleanup
    link.remove();
    window.URL.revokeObjectURL(url);
    
  } catch (error) {
    console.error('Failed to download Excel file:', error);
    // Handle error (e.g., show notification to user)
    // Note: If the backend returns an error JSON while responseType is 'blob',
    // you need to read the blob to get the error message:
    // const errorText = await error.response.data.text();
    // const errJson = JSON.parse(errorText);
  }
}
```

### Usage in Vue Component

```vue
<template>
  <div>
    <!-- Your filter inputs here -->
    
    <button @click="handleExport" :disabled="isExporting">
      {{ isExporting ? 'Mendownload...' : 'Download Excel' }}
    </button>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { downloadScheduleExcel } from '@/services/scheduleApi';

const isExporting = ref(false);
const filters = reactive({
  startDate: '2026-03-01',
  endDate: '2026-03-31',
  periodId: 1
});

const handleExport = async () => {
  isExporting.value = true;
  try {
    await downloadScheduleExcel(filters);
  } catch (error) {
    // Show error toast
  } finally {
    isExporting.value = false;
  }
};
</script>
```

## Using a Direct Link (Alternative Approach)

If your app uses cookie-based authentication or if you pass the auth token as a query parameter (not recommended for security), you can use a simple HTML link or `window.open()`:

```javascript
// NOT RECOMMENDED if using Bearer token in headers
function downloadDirect() {
  const token = localStorage.getItem('token');
  window.open(`/gym/employee-schedules/export?startDate=2026-03-01&endDate=2026-03-31&token=${token}`, '_blank');
}
```
*Note: The Axios/Blob approach is strongly recommended for standard API setups using Bearer Tokens in headers.*
