# Vue.js Integration - Printer Monitoring

## 📋 Components

### 1. Printer Connection Monitor (Composition API)

```vue
<!-- components/PrinterConnectionMonitor.vue -->
<template>
  <div class="printer-connection-monitor">
    <div class="status-indicator">
      <span 
        :class="['status-dot', `bg-${statusColor}`]"
        :style="{ width: '12px', height: '12px', borderRadius: '50%', display: 'inline-block', marginRight: '8px' }"
      />
      <span class="font-medium">{{ statusText }}</span>
    </div>

    <div v-if="status.online && status.latency" class="text-sm text-gray-600 mt-1">
      Latency: {{ status.latency }}ms
    </div>

    <div v-if="status.error" class="text-sm text-red-600 mt-1">
      {{ status.error }}
    </div>

    <div v-if="status.lastUpdate" class="text-xs text-gray-500 mt-1">
      Last check: {{ formatTime(status.lastUpdate) }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { printerApi } from '@/api/printerApi';

const props = defineProps({
  printerId: {
    type: String,
    required: true
  }
});

const status = ref({
  connected: false,
  online: false,
  latency: null,
  error: null,
  lastUpdate: null
});

let eventSource = null;
let reconnectTimeout = null;

const statusColor = computed(() => {
  if (!status.value.connected) return 'gray-500';
  return status.value.online ? 'green-500' : 'red-500';
});

const statusText = computed(() => {
  if (!status.value.connected) return 'Disconnected';
  return status.value.online ? 'Online' : 'Offline';
});

const formatTime = (date) => {
  return new Date(date).toLocaleTimeString();
};

const connect = () => {
  try {
    eventSource = printerApi.streamConnection(props.printerId);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'connected') {
        status.value.connected = true;
      }
      
      if (data.type === 'status') {
        status.value = {
          connected: true,
          online: data.status === 'online',
          latency: data.latency || null,
          error: data.error || null,
          lastUpdate: new Date(data.timestamp)
        };
      }
    };

    eventSource.onerror = () => {
      status.value.connected = false;
      if (eventSource) eventSource.close();
      
      // Auto-reconnect after 5 seconds
      reconnectTimeout = setTimeout(connect, 5000);
    };
  } catch (error) {
    console.error('Failed to connect to printer stream:', error);
  }
};

onMounted(() => {
  connect();
});

onUnmounted(() => {
  if (eventSource) eventSource.close();
  if (reconnectTimeout) clearTimeout(reconnectTimeout);
});

// Watch for printerId changes
watch(() => props.printerId, () => {
  if (eventSource) eventSource.close();
  if (reconnectTimeout) clearTimeout(reconnectTimeout);
  connect();
});
</script>

<style scoped>
.printer-connection-monitor {
  padding: 1rem;
}
</style>
```

### 2. Printer Health Monitor

```vue
<!-- components/PrinterHealthMonitor.vue -->
<template>
  <div class="printer-health-monitor bg-white rounded-lg shadow p-4">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold">Printer Health</h3>
      <span :class="['px-3 py-1 rounded-full text-sm font-medium', healthBadgeClass]">
        {{ healthIcon }} {{ health.status?.toUpperCase() }}
      </span>
    </div>

    <div v-if="!loading" class="mb-4">
      <p class="text-gray-700">{{ health.message }}</p>
      <div class="flex items-center mt-2 text-sm">
        <span :class="['w-2 h-2 rounded-full mr-2', health.isConnected ? 'bg-green-500' : 'bg-red-500']" />
        <span>{{ health.isConnected ? 'Connected' : 'Disconnected' }}</span>
      </div>
    </div>

    <div v-else class="animate-pulse">Loading health status...</div>

    <!-- Stuck Jobs Warning -->
    <div v-if="health.stuckJobsCount > 0" class="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
      <h4 class="font-medium text-yellow-800 mb-2">
        ⚠ {{ health.stuckJobsCount }} Stuck Job{{ health.stuckJobsCount > 1 ? 's' : '' }}
      </h4>
      <ul class="space-y-1 text-sm">
        <li v-for="job in health.stuckJobs" :key="job.id" class="text-yellow-700">
          {{ job.jobType }} - {{ job.status }} ({{ job.ageMinutes }} min ago)
        </li>
      </ul>
    </div>

    <!-- Statistics -->
    <div v-if="health.statistics" class="grid grid-cols-2 gap-4">
      <div class="bg-gray-50 rounded p-3">
        <div class="text-2xl font-bold text-gray-900">
          {{ health.statistics.successRate }}%
        </div>
        <div class="text-xs text-gray-600">Success Rate</div>
      </div>

      <div class="bg-gray-50 rounded p-3">
        <div class="text-2xl font-bold text-gray-900">
          {{ health.statistics.total }}
        </div>
        <div class="text-xs text-gray-600">Total Jobs</div>
      </div>

      <div class="bg-gray-50 rounded p-3">
        <div class="text-2xl font-bold text-green-600">
          {{ health.statistics.completed }}
        </div>
        <div class="text-xs text-gray-600">Completed</div>
      </div>

      <div class="bg-gray-50 rounded p-3">
        <div class="text-2xl font-bold text-red-600">
          {{ health.statistics.failed }}
        </div>
        <div class="text-xs text-gray-600">Failed</div>
      </div>

      <div v-if="health.statistics.avgDuration" class="bg-gray-50 rounded p-3 col-span-2">
        <div class="text-2xl font-bold text-gray-900">
          {{ health.statistics.avgDuration }}ms
        </div>
        <div class="text-xs text-gray-600">Avg Duration</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useToast } from 'vue-toastification';
import { printerApi } from '@/api/printerApi';

const props = defineProps({
  printerId: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['healthChange']);

const toast = useToast();
const loading = ref(true);
const health = ref({
  status: 'unknown',
  message: '',
  isConnected: false,
  stuckJobsCount: 0,
  stuckJobs: [],
  statistics: null
});

let eventSource = null;
let previousStatus = null;

const healthBadgeClass = computed(() => {
  const colors = {
    healthy: 'bg-green-100 text-green-800',
    degraded: 'bg-yellow-100 text-yellow-800',
    unhealthy: 'bg-red-100 text-red-800',
    unknown: 'bg-gray-100 text-gray-800'
  };
  return colors[health.value.status] || colors.unknown;
});

const healthIcon = computed(() => {
  const icons = {
    healthy: '✓',
    degraded: '⚠',
    unhealthy: '✕',
    unknown: '?'
  };
  return icons[health.value.status] || icons.unknown;
});

const connect = () => {
  eventSource = printerApi.streamHealth(props.printerId);

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    if (data.type === 'health') {
      health.value = {
        status: data.healthStatus,
        message: data.healthMessage,
        isConnected: data.isConnected,
        stuckJobsCount: data.stuckJobsCount,
        stuckJobs: data.stuckJobs || [],
        statistics: data.statistics
      };

      loading.value = false;
      emit('healthChange', health.value);

      // Show toast on status change
      if (previousStatus && previousStatus !== data.healthStatus) {
        if (data.healthStatus === 'unhealthy') {
          toast.error(`Printer unhealthy: ${data.healthMessage}`);
        } else if (data.healthStatus === 'degraded') {
          toast.warning(`Printer degraded: ${data.healthMessage}`);
        } else if (data.healthStatus === 'healthy' && previousStatus !== 'healthy') {
          toast.success('Printer is now healthy');
        }
      }

      previousStatus = data.healthStatus;
    }
  };

  eventSource.onerror = () => {
    loading.value = false;
    if (eventSource) eventSource.close();
    setTimeout(connect, 5000);
  };
};

onMounted(() => {
  connect();
});

onUnmounted(() => {
  if (eventSource) eventSource.close();
});

watch(() => props.printerId, () => {
  if (eventSource) eventSource.close();
  loading.value = true;
  connect();
});
</script>
```

### 3. Printer Job List

```vue
<!-- components/PrinterJobList.vue -->
<template>
  <div class="printer-job-list">
    <div class="mb-4 flex items-center justify-between">
      <h3 class="text-lg font-semibold">Print Jobs</h3>
      
      <select
        v-model="filter"
        @change="loadJobs"
        class="border rounded px-3 py-1"
      >
        <option value="all">All Jobs</option>
        <option value="completed">Completed</option>
        <option value="pending">Pending</option>
        <option value="printing">Printing</option>
        <option value="failed">Failed</option>
        <option value="cancelled">Cancelled</option>
      </select>
    </div>

    <div v-if="loading" class="text-center py-8">Loading jobs...</div>

    <div v-else class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attempts</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scheduled</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="job in jobs" :key="job.id" class="hover:bg-gray-50">
            <td class="px-4 py-3 text-sm">{{ job.jobType }}</td>
            <td class="px-4 py-3">
              <span :class="getStatusBadgeClass(job.status)">
                {{ job.status.toUpperCase() }}
              </span>
            </td>
            <td class="px-4 py-3 text-sm">{{ job.attempts }} / {{ job.maxRetries }}</td>
            <td class="px-4 py-3 text-sm">{{ formatDuration(job.printDuration) }}</td>
            <td class="px-4 py-3 text-sm text-gray-500">
              {{ formatDateTime(job.scheduledAt) }}
            </td>
            <td class="px-4 py-3 text-sm">
              {{ job.creator ? `${job.creator.firstName} ${job.creator.lastName}` : '-' }}
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="jobs.length === 0" class="text-center py-8 text-gray-500">
        No jobs found
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="pagination.total > pagination.limit" class="mt-4 flex items-center justify-between">
      <div class="text-sm text-gray-700">
        Showing {{ pagination.offset + 1 }} to {{ Math.min(pagination.offset + pagination.limit, pagination.total) }} of {{ pagination.total }}
      </div>
      
      <div class="space-x-2">
        <button
          @click="prevPage"
          :disabled="pagination.offset === 0"
          class="px-3 py-1 border rounded disabled:opacity-50"
        >
          Previous
        </button>
        <button
          @click="nextPage"
          :disabled="pagination.offset + pagination.limit >= pagination.total"
          class="px-3 py-1 border rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { printerApi } from '@/api/printerApi';

const props = defineProps({
  printerId: {
    type: String,
    required: true
  }
});

const loading = ref(true);
const jobs = ref([]);
const filter = ref('all');
const pagination = ref({
  limit: 20,
  offset: 0,
  total: 0
});

const loadJobs = async (offset = 0) => {
  try {
    loading.value = true;
    const response = await printerApi.getJobs(props.printerId, {
      status: filter.value === 'all' ? null : filter.value,
      limit: pagination.value.limit,
      offset,
      includeStuck: true
    });

    jobs.value = response.data.jobs;
    pagination.value = {
      ...pagination.value,
      offset,
      total: response.data.total
    };
  } catch (error) {
    console.error('Failed to load jobs:', error);
  } finally {
    loading.value = false;
  }
};

const prevPage = () => {
  const newOffset = Math.max(0, pagination.value.offset - pagination.value.limit);
  loadJobs(newOffset);
};

const nextPage = () => {
  const newOffset = pagination.value.offset + pagination.value.limit;
  loadJobs(newOffset);
};

const getStatusBadgeClass = (status) => {
  const colors = {
    completed: 'px-2 py-1 text-xs rounded bg-green-100 text-green-800',
    pending: 'px-2 py-1 text-xs rounded bg-blue-100 text-blue-800',
    printing: 'px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800',
    failed: 'px-2 py-1 text-xs rounded bg-red-100 text-red-800',
    cancelled: 'px-2 py-1 text-xs rounded bg-gray-100 text-gray-800'
  };
  return colors[status] || colors.pending;
};

const formatDuration = (ms) => {
  if (!ms) return '-';
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;
};

const formatDateTime = (dateString) => {
  return new Date(dateString).toLocaleString();
};

onMounted(() => {
  loadJobs();
});

watch(() => props.printerId, () => {
  loadJobs(0);
});

watch(filter, () => {
  loadJobs(0);
});
</script>
```

### 4. Printer Dashboard Page

```vue
<!-- pages/PrinterDashboard.vue -->
<template>
  <div class="printer-dashboard max-w-7xl mx-auto p-6">
    <h1 class="text-3xl font-bold mb-6">Printer Monitoring</h1>

    <!-- Printer Selector -->
    <div class="mb-6">
      <label class="block text-sm font-medium mb-2">Select Printer</label>
      <select
        v-model="selectedPrinterId"
        class="border rounded px-4 py-2 w-full max-w-md"
      >
        <option v-for="printer in printers" :key="printer.id" :value="printer.id">
          {{ printer.name }} ({{ printer.printerType }})
        </option>
      </select>
    </div>

    <!-- Printer Info -->
    <div v-if="currentPrinter" class="bg-white rounded-lg shadow p-4 mb-6">
      <h2 class="text-xl font-semibold mb-2">{{ currentPrinter.name }}</h2>
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span class="text-gray-600">Type:</span> {{ currentPrinter.printerType }}
        </div>
        <div>
          <span class="text-gray-600">Connection:</span> {{ currentPrinter.connectionType }}
        </div>
        <div v-if="currentPrinter.ipAddress">
          <span class="text-gray-600">IP:</span> {{ currentPrinter.ipAddress }}:{{ currentPrinter.port || 9100 }}
        </div>
        <div>
          <span class="text-gray-600">Model:</span> {{ currentPrinter.model || '-' }}
        </div>
      </div>
    </div>

    <!-- Monitoring Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
      <!-- Connection Status -->
      <div class="bg-white rounded-lg shadow p-4">
        <h3 class="text-lg font-semibold mb-4">Connection</h3>
        <PrinterConnectionMonitor :printer-id="selectedPrinterId" />
      </div>

      <!-- Health Status -->
      <div class="lg:col-span-2">
        <PrinterHealthMonitor 
          :printer-id="selectedPrinterId"
          @health-change="handleHealthChange"
        />
      </div>
    </div>

    <!-- Job List -->
    <div class="bg-white rounded-lg shadow p-4">
      <PrinterJobList :printer-id="selectedPrinterId" />
    </div>

    <!-- Health Alert -->
    <Teleport to="body">
      <div 
        v-if="healthData && healthData.status === 'unhealthy'"
        class="fixed bottom-4 right-4 bg-red-500 text-white px-6 py-4 rounded-lg shadow-lg max-w-sm z-50"
      >
        <h4 class="font-bold mb-1">⚠ Printer Alert</h4>
        <p class="text-sm">{{ healthData.message }}</p>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import PrinterConnectionMonitor from '@/components/PrinterConnectionMonitor.vue';
import PrinterHealthMonitor from '@/components/PrinterHealthMonitor.vue';
import PrinterJobList from '@/components/PrinterJobList.vue';

const props = defineProps({
  printers: {
    type: Array,
    required: true
  }
});

const selectedPrinterId = ref(props.printers[0]?.id);
const healthData = ref(null);

const currentPrinter = computed(() => {
  return props.printers.find(p => p.id === selectedPrinterId.value);
});

const handleHealthChange = (data) => {
  healthData.value = data;
};
</script>
```

## Installation

```bash
# Install dependencies
npm install vue axios vue-toastification

# Or with pnpm
pnpm add vue axios vue-toastification
```

## Setup

```javascript
// main.js
import { createApp } from 'vue';
import Toast from 'vue-toastification';
import 'vue-toastification/dist/index.css';
import App from './App.vue';

const app = createApp(App);

app.use(Toast, {
  position: 'top-right',
  timeout: 3000,
  closeOnClick: true,
  pauseOnHover: true
});

app.mount('#app');
```

## API Client

```javascript
// api/printerApi.js
import axios from 'axios';

const API_BASE = '/api/v1/system/printers';

class PrinterAPI {
  constructor() {
    this.axios = axios.create({
      baseURL: API_BASE
    });

    this.axios.interceptors.request.use((config) => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  streamConnection(printerId) {
    const token = localStorage.getItem('authToken');
    return new EventSource(
      `${API_BASE}/${printerId}/stream/connection`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
  }

  streamHealth(printerId) {
    const token = localStorage.getItem('authToken');
    return new EventSource(
      `${API_BASE}/${printerId}/stream/health`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
  }

  async getJobs(printerId, params = {}) {
    const response = await this.axios.get(`/${printerId}/jobs`, { params });
    return response.data;
  }
}

export const printerApi = new PrinterAPI();
```
