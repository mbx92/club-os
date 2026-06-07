# Vanilla JavaScript Integration - Printer Monitoring

## 📋 Simple Implementation (No Framework)

### 1. HTML Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Printer Monitoring Dashboard</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
  <style>
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    .status-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      display: inline-block;
      margin-right: 8px;
    }
    .bg-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
  </style>
</head>
<body class="bg-gray-100">
  <div class="max-w-7xl mx-auto p-6">
    <h1 class="text-3xl font-bold mb-6">Printer Monitoring</h1>

    <!-- Printer Selector -->
    <div class="mb-6">
      <label class="block text-sm font-medium mb-2">Select Printer</label>
      <select id="printerSelect" class="border rounded px-4 py-2 w-full max-w-md bg-white">
        <!-- Options will be populated by JS -->
      </select>
    </div>

    <!-- Monitoring Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
      <!-- Connection Status -->
      <div class="bg-white rounded-lg shadow p-4">
        <h3 class="text-lg font-semibold mb-4">Connection Status</h3>
        <div id="connectionStatus">
          <div class="text-gray-500">Loading...</div>
        </div>
      </div>

      <!-- Health Status -->
      <div class="lg:col-span-2 bg-white rounded-lg shadow p-4">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold">Printer Health</h3>
          <span id="healthBadge" class="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
            UNKNOWN
          </span>
        </div>
        <div id="healthStatus">
          <div class="text-gray-500">Loading...</div>
        </div>
      </div>
    </div>

    <!-- Job List -->
    <div class="bg-white rounded-lg shadow p-4">
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-lg font-semibold">Print Jobs</h3>
        <select id="jobFilter" class="border rounded px-3 py-1">
          <option value="all">All Jobs</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="printing">Printing</option>
          <option value="failed">Failed</option>
        </select>
      </div>
      <div id="jobList">
        <div class="text-center py-8 text-gray-500">Loading jobs...</div>
      </div>
    </div>
  </div>

  <!-- Toast Container -->
  <div id="toastContainer" class="fixed top-4 right-4 z-50 space-y-2"></div>

  <script src="printer-monitor.js"></script>
</body>
</html>
```

### 2. JavaScript Implementation

```javascript
// printer-monitor.js

class PrinterMonitor {
  constructor() {
    this.apiBase = '/api/v1/system/printers';
    this.authToken = localStorage.getItem('authToken');
    this.selectedPrinterId = null;
    this.connectionSource = null;
    this.healthSource = null;
    this.previousHealthStatus = null;

    this.init();
  }

  init() {
    this.loadPrinters();
    this.setupEventListeners();
  }

  // API Methods
  async apiCall(endpoint, method = 'GET', data = null) {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`
      }
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`${this.apiBase}${endpoint}`, options);
    return response.json();
  }

  // Load all printers
  async loadPrinters() {
    try {
      const result = await this.apiCall('/');
      const printers = result.data.printers;
      
      const select = document.getElementById('printerSelect');
      select.innerHTML = printers.map(p => 
        `<option value="${p.id}">${p.name} (${p.printerType})</option>`
      ).join('');

      if (printers.length > 0) {
        this.selectedPrinterId = printers[0].id;
        this.startMonitoring();
      }
    } catch (error) {
      console.error('Failed to load printers:', error);
      this.showToast('Failed to load printers', 'error');
    }
  }

  // Setup event listeners
  setupEventListeners() {
    document.getElementById('printerSelect').addEventListener('change', (e) => {
      this.selectedPrinterId = e.target.value;
      this.startMonitoring();
    });

    document.getElementById('jobFilter').addEventListener('change', () => {
      this.loadJobs();
    });
  }

  // Start monitoring
  startMonitoring() {
    this.stopMonitoring();
    this.startConnectionStream();
    this.startHealthStream();
    this.loadJobs();
  }

  // Stop monitoring
  stopMonitoring() {
    if (this.connectionSource) {
      this.connectionSource.close();
      this.connectionSource = null;
    }
    if (this.healthSource) {
      this.healthSource.close();
      this.healthSource = null;
    }
  }

  // Connection Stream
  startConnectionStream() {
    const url = `${this.apiBase}/${this.selectedPrinterId}/stream/connection`;
    this.connectionSource = new EventSource(url, {
      headers: { 'Authorization': `Bearer ${this.authToken}` }
    });

    this.connectionSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'status') {
        this.updateConnectionStatus(data);
      }
    };

    this.connectionSource.onerror = () => {
      this.updateConnectionStatus({ status: 'disconnected' });
      this.connectionSource.close();
      setTimeout(() => this.startConnectionStream(), 5000);
    };
  }

  // Update connection status UI
  updateConnectionStatus(data) {
    const container = document.getElementById('connectionStatus');
    const isOnline = data.status === 'online';
    const color = isOnline ? 'green' : 'red';

    container.innerHTML = `
      <div class="flex items-center">
        <span class="status-dot bg-${color}-500"></span>
        <span class="font-medium">${isOnline ? 'Online' : 'Offline'}</span>
      </div>
      ${isOnline && data.latency ? `
        <div class="text-sm text-gray-600 mt-2">Latency: ${data.latency}ms</div>
      ` : ''}
      ${data.error ? `
        <div class="text-sm text-red-600 mt-2">${data.error}</div>
      ` : ''}
      <div class="text-xs text-gray-500 mt-2">
        Last check: ${new Date(data.timestamp).toLocaleTimeString()}
      </div>
    `;
  }

  // Health Stream
  startHealthStream() {
    const url = `${this.apiBase}/${this.selectedPrinterId}/stream/health`;
    this.healthSource = new EventSource(url, {
      headers: { 'Authorization': `Bearer ${this.authToken}` }
    });

    this.healthSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'health') {
        this.updateHealthStatus(data);
      }
    };

    this.healthSource.onerror = () => {
      this.healthSource.close();
      setTimeout(() => this.startHealthStream(), 5000);
    };
  }

  // Update health status UI
  updateHealthStatus(data) {
    // Update badge
    const badge = document.getElementById('healthBadge');
    const badgeColors = {
      healthy: 'bg-green-100 text-green-800',
      degraded: 'bg-yellow-100 text-yellow-800',
      unhealthy: 'bg-red-100 text-red-800',
      unknown: 'bg-gray-100 text-gray-800'
    };
    const icons = {
      healthy: '✓',
      degraded: '⚠',
      unhealthy: '✕',
      unknown: '?'
    };
    badge.className = `px-3 py-1 rounded-full text-sm font-medium ${badgeColors[data.healthStatus]}`;
    badge.textContent = `${icons[data.healthStatus]} ${data.healthStatus.toUpperCase()}`;

    // Update status content
    const container = document.getElementById('healthStatus');
    container.innerHTML = `
      <div class="mb-4">
        <p class="text-gray-700">${data.healthMessage}</p>
        <div class="flex items-center mt-2 text-sm">
          <span class="w-2 h-2 rounded-full mr-2 bg-${data.isConnected ? 'green' : 'red'}-500"></span>
          <span>${data.isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>

      ${data.stuckJobsCount > 0 ? `
        <div class="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
          <h4 class="font-medium text-yellow-800 mb-2">
            ⚠ ${data.stuckJobsCount} Stuck Job${data.stuckJobsCount > 1 ? 's' : ''}
          </h4>
          <ul class="space-y-1 text-sm">
            ${data.stuckJobs.map(job => `
              <li class="text-yellow-700">
                ${job.jobType} - ${job.status} (${job.ageMinutes} min ago)
              </li>
            `).join('')}
          </ul>
        </div>
      ` : ''}

      ${data.statistics ? `
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-gray-50 rounded p-3">
            <div class="text-2xl font-bold text-gray-900">${data.statistics.successRate}%</div>
            <div class="text-xs text-gray-600">Success Rate</div>
          </div>
          <div class="bg-gray-50 rounded p-3">
            <div class="text-2xl font-bold text-gray-900">${data.statistics.total}</div>
            <div class="text-xs text-gray-600">Total Jobs</div>
          </div>
          <div class="bg-gray-50 rounded p-3">
            <div class="text-2xl font-bold text-green-600">${data.statistics.completed}</div>
            <div class="text-xs text-gray-600">Completed</div>
          </div>
          <div class="bg-gray-50 rounded p-3">
            <div class="text-2xl font-bold text-red-600">${data.statistics.failed}</div>
            <div class="text-xs text-gray-600">Failed</div>
          </div>
          ${data.statistics.avgDuration ? `
            <div class="bg-gray-50 rounded p-3 col-span-2">
              <div class="text-2xl font-bold text-gray-900">${data.statistics.avgDuration}ms</div>
              <div class="text-xs text-gray-600">Avg Duration</div>
            </div>
          ` : ''}
        </div>
      ` : ''}
    `;

    // Show toast on status change
    if (this.previousHealthStatus && this.previousHealthStatus !== data.healthStatus) {
      if (data.healthStatus === 'unhealthy') {
        this.showToast(`Printer unhealthy: ${data.healthMessage}`, 'error');
      } else if (data.healthStatus === 'degraded') {
        this.showToast(`Printer degraded: ${data.healthMessage}`, 'warning');
      } else if (data.healthStatus === 'healthy' && this.previousHealthStatus !== 'healthy') {
        this.showToast('Printer is now healthy', 'success');
      }
    }

    this.previousHealthStatus = data.healthStatus;
  }

  // Load jobs
  async loadJobs() {
    try {
      const filter = document.getElementById('jobFilter').value;
      const params = new URLSearchParams({
        limit: 20,
        offset: 0,
        includeStuck: true
      });

      if (filter !== 'all') {
        params.append('status', filter);
      }

      const result = await this.apiCall(
        `/${this.selectedPrinterId}/jobs?${params.toString()}`
      );

      this.renderJobList(result.data.jobs);
    } catch (error) {
      console.error('Failed to load jobs:', error);
      document.getElementById('jobList').innerHTML = `
        <div class="text-center py-8 text-red-600">Failed to load jobs</div>
      `;
    }
  }

  // Render job list
  renderJobList(jobs) {
    const container = document.getElementById('jobList');

    if (jobs.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8 text-gray-500">No jobs found</div>
      `;
      return;
    }

    const statusColors = {
      completed: 'bg-green-100 text-green-800',
      pending: 'bg-blue-100 text-blue-800',
      printing: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };

    container.innerHTML = `
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attempts</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scheduled</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            ${jobs.map(job => `
              <tr class="hover:bg-gray-50">
                <td class="px-4 py-3 text-sm">${job.jobType}</td>
                <td class="px-4 py-3">
                  <span class="px-2 py-1 text-xs rounded ${statusColors[job.status] || statusColors.pending}">
                    ${job.status.toUpperCase()}
                  </span>
                </td>
                <td class="px-4 py-3 text-sm">${job.attempts} / ${job.maxRetries}</td>
                <td class="px-4 py-3 text-sm">${this.formatDuration(job.printDuration)}</td>
                <td class="px-4 py-3 text-sm text-gray-500">
                  ${new Date(job.scheduledAt).toLocaleString()}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // Helper: Format duration
  formatDuration(ms) {
    if (!ms) return '-';
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;
  }

  // Show toast notification
  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const colors = {
      success: 'bg-green-500',
      error: 'bg-red-500',
      warning: 'bg-yellow-500',
      info: 'bg-blue-500'
    };

    const toast = document.createElement('div');
    toast.className = `${colors[type]} text-white px-6 py-4 rounded-lg shadow-lg max-w-sm transform transition-all duration-300`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.printerMonitor = new PrinterMonitor();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (window.printerMonitor) {
    window.printerMonitor.stopMonitoring();
  }
});
```

## Usage

1. **Include the files:**
```html
<script src="printer-monitor.js"></script>
```

2. **Set auth token:**
```javascript
localStorage.setItem('authToken', 'YOUR_JWT_TOKEN');
```

3. **Access the monitor:**
```javascript
// Access globally
window.printerMonitor.loadJobs();
```

## Features

✅ No build process required  
✅ Pure JavaScript (ES6+)  
✅ Real-time SSE streams  
✅ Auto-reconnect on disconnect  
✅ Toast notifications  
✅ Responsive design (Tailwind CSS)
