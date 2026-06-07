# Frontend Integration - Printer Monitoring

## 📋 Overview

Complete frontend integration examples untuk printer monitoring system dengan React, Vue, dan Vanilla JS.

## 🎯 Features

- ✅ Real-time connection monitoring via SSE
- ✅ Real-time health monitoring via SSE  
- ✅ Printer job list dengan pagination
- ✅ Auto-reconnect on disconnect
- ✅ Visual status indicators
- ✅ Toast notifications

---

## 📚 Table of Contents

1. [React Components](#react-components)
2. [Vue Components](#vue-components)
3. [Vanilla JavaScript](#vanilla-javascript)
4. [API Client](#api-client)
5. [State Management](#state-management)

---

## React Components

### 1. Printer Connection Monitor

```jsx
// components/PrinterConnectionMonitor.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { printerApi } from '../api/printerApi';

export function PrinterConnectionMonitor({ printerId }) {
  const [status, setStatus] = useState({
    connected: false,
    online: false,
    latency: null,
    error: null,
    lastUpdate: null
  });

  useEffect(() => {
    let eventSource = null;
    let reconnectTimeout = null;

    const connect = () => {
      try {
        eventSource = printerApi.streamConnection(printerId);

        eventSource.onmessage = (event) => {
          const data = JSON.parse(event.data);
          
          if (data.type === 'connected') {
            setStatus(prev => ({ ...prev, connected: true }));
          }
          
          if (data.type === 'status') {
            setStatus({
              connected: true,
              online: data.status === 'online',
              latency: data.latency || null,
              error: data.error || null,
              lastUpdate: new Date(data.timestamp)
            });
          }
        };

        eventSource.onerror = () => {
          setStatus(prev => ({ ...prev, connected: false }));
          eventSource.close();
          
          // Auto-reconnect after 5 seconds
          reconnectTimeout = setTimeout(connect, 5000);
        };

      } catch (error) {
        console.error('Failed to connect to printer stream:', error);
      }
    };

    connect();

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [printerId]);

  const getStatusColor = () => {
    if (!status.connected) return 'gray';
    return status.online ? 'green' : 'red';
  };

  const getStatusText = () => {
    if (!status.connected) return 'Disconnected';
    return status.online ? 'Online' : 'Offline';
  };

  return (
    <div className="printer-connection-monitor">
      <div className="status-indicator">
        <span 
          className={`status-dot bg-${getStatusColor()}-500`}
          style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            display: 'inline-block',
            marginRight: '8px'
          }}
        />
        <span className="font-medium">{getStatusText()}</span>
      </div>

      {status.online && status.latency && (
        <div className="text-sm text-gray-600 mt-1">
          Latency: {status.latency}ms
        </div>
      )}

      {status.error && (
        <div className="text-sm text-red-600 mt-1">
          {status.error}
        </div>
      )}

      {status.lastUpdate && (
        <div className="text-xs text-gray-500 mt-1">
          Last check: {status.lastUpdate.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}
```

### 2. Printer Health Monitor

```jsx
// components/PrinterHealthMonitor.jsx
import React, { useEffect, useState } from 'react';
import { printerApi } from '../api/printerApi';
import { toast } from 'react-hot-toast';

export function PrinterHealthMonitor({ printerId, onHealthChange }) {
  const [health, setHealth] = useState({
    status: 'unknown',
    message: '',
    isConnected: false,
    stuckJobsCount: 0,
    stuckJobs: [],
    statistics: null,
    loading: true
  });

  useEffect(() => {
    let eventSource = null;
    let previousStatus = null;

    const connect = () => {
      eventSource = printerApi.streamHealth(printerId);

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'health') {
          const newHealth = {
            status: data.healthStatus,
            message: data.healthMessage,
            isConnected: data.isConnected,
            stuckJobsCount: data.stuckJobsCount,
            stuckJobs: data.stuckJobs || [],
            statistics: data.statistics,
            loading: false
          };

          setHealth(newHealth);

          // Notify parent component
          if (onHealthChange) {
            onHealthChange(newHealth);
          }

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
        setHealth(prev => ({ ...prev, loading: false }));
        eventSource.close();
        setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      if (eventSource) eventSource.close();
    };
  }, [printerId, onHealthChange]);

  const getHealthBadge = () => {
    const colors = {
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

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[health.status]}`}>
        {icons[health.status]} {health.status.toUpperCase()}
      </span>
    );
  };

  if (health.loading) {
    return <div className="animate-pulse">Loading health status...</div>;
  }

  return (
    <div className="printer-health-monitor bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Printer Health</h3>
        {getHealthBadge()}
      </div>

      <div className="mb-4">
        <p className="text-gray-700">{health.message}</p>
        <div className="flex items-center mt-2 text-sm">
          <span className={`w-2 h-2 rounded-full mr-2 ${health.isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span>{health.isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>

      {health.stuckJobsCount > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
          <h4 className="font-medium text-yellow-800 mb-2">
            ⚠ {health.stuckJobsCount} Stuck Job{health.stuckJobsCount > 1 ? 's' : ''}
          </h4>
          <ul className="space-y-1 text-sm">
            {health.stuckJobs.map((job) => (
              <li key={job.id} className="text-yellow-700">
                {job.jobType} - {job.status} ({job.ageMinutes} min ago)
              </li>
            ))}
          </ul>
        </div>
      )}

      {health.statistics && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded p-3">
            <div className="text-2xl font-bold text-gray-900">
              {health.statistics.successRate}%
            </div>
            <div className="text-xs text-gray-600">Success Rate</div>
          </div>

          <div className="bg-gray-50 rounded p-3">
            <div className="text-2xl font-bold text-gray-900">
              {health.statistics.total}
            </div>
            <div className="text-xs text-gray-600">Total Jobs</div>
          </div>

          <div className="bg-gray-50 rounded p-3">
            <div className="text-2xl font-bold text-green-600">
              {health.statistics.completed}
            </div>
            <div className="text-xs text-gray-600">Completed</div>
          </div>

          <div className="bg-gray-50 rounded p-3">
            <div className="text-2xl font-bold text-red-600">
              {health.statistics.failed}
            </div>
            <div className="text-xs text-gray-600">Failed</div>
          </div>

          {health.statistics.avgDuration && (
            <div className="bg-gray-50 rounded p-3 col-span-2">
              <div className="text-2xl font-bold text-gray-900">
                {health.statistics.avgDuration}ms
              </div>
              <div className="text-xs text-gray-600">Avg Duration</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

### 3. Printer Job List

```jsx
// components/PrinterJobList.jsx
import React, { useEffect, useState } from 'react';
import { printerApi } from '../api/printerApi';

export function PrinterJobList({ printerId }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [pagination, setPagination] = useState({
    limit: 20,
    offset: 0,
    total: 0
  });

  const loadJobs = async (status = null, offset = 0) => {
    try {
      setLoading(true);
      const response = await printerApi.getJobs(printerId, {
        status: status === 'all' ? null : status,
        limit: pagination.limit,
        offset,
        includeStuck: true
      });

      setJobs(response.data.jobs);
      setPagination(prev => ({
        ...prev,
        offset,
        total: response.data.total
      }));
    } catch (error) {
      console.error('Failed to load jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs(filter, 0);
  }, [printerId, filter]);

  const getStatusBadge = (status) => {
    const colors = {
      completed: 'bg-green-100 text-green-800',
      pending: 'bg-blue-100 text-blue-800',
      printing: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };

    return (
      <span className={`px-2 py-1 text-xs rounded ${colors[status] || colors.pending}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  const formatDuration = (ms) => {
    if (!ms) return '-';
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;
  };

  if (loading) {
    return <div className="text-center py-8">Loading jobs...</div>;
  }

  return (
    <div className="printer-job-list">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Print Jobs</h3>
        
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border rounded px-3 py-1"
        >
          <option value="all">All Jobs</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="printing">Printing</option>
          <option value="failed">Failed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Attempts
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Duration
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Scheduled
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                User
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {jobs.map((job) => (
              <tr key={job.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm">
                  {job.jobType}
                </td>
                <td className="px-4 py-3">
                  {getStatusBadge(job.status)}
                </td>
                <td className="px-4 py-3 text-sm">
                  {job.attempts} / {job.maxRetries}
                </td>
                <td className="px-4 py-3 text-sm">
                  {formatDuration(job.printDuration)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {new Date(job.scheduledAt).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-sm">
                  {job.creator ? `${job.creator.firstName} ${job.creator.lastName}` : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {jobs.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No jobs found
        </div>
      )}

      {pagination.total > pagination.limit && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {pagination.offset + 1} to {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total}
          </div>
          
          <div className="space-x-2">
            <button
              onClick={() => loadJobs(filter, Math.max(0, pagination.offset - pagination.limit))}
              disabled={pagination.offset === 0}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => loadJobs(filter, pagination.offset + pagination.limit)}
              disabled={pagination.offset + pagination.limit >= pagination.total}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

### 4. Complete Printer Dashboard

```jsx
// pages/PrinterDashboard.jsx
import React, { useState } from 'react';
import { PrinterConnectionMonitor } from '../components/PrinterConnectionMonitor';
import { PrinterHealthMonitor } from '../components/PrinterHealthMonitor';
import { PrinterJobList } from '../components/PrinterJobList';

export function PrinterDashboard({ printers }) {
  const [selectedPrinter, setSelectedPrinter] = useState(printers[0]?.id);
  const [healthData, setHealthData] = useState(null);

  const currentPrinter = printers.find(p => p.id === selectedPrinter);

  return (
    <div className="printer-dashboard max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Printer Monitoring</h1>

      {/* Printer Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Select Printer</label>
        <select
          value={selectedPrinter}
          onChange={(e) => setSelectedPrinter(e.target.value)}
          className="border rounded px-4 py-2 w-full max-w-md"
        >
          {printers.map((printer) => (
            <option key={printer.id} value={printer.id}>
              {printer.name} ({printer.printerType})
            </option>
          ))}
        </select>
      </div>

      {/* Printer Info */}
      {currentPrinter && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h2 className="text-xl font-semibold mb-2">{currentPrinter.name}</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Type:</span> {currentPrinter.printerType}
            </div>
            <div>
              <span className="text-gray-600">Connection:</span> {currentPrinter.connectionType}
            </div>
            {currentPrinter.ipAddress && (
              <div>
                <span className="text-gray-600">IP:</span> {currentPrinter.ipAddress}:{currentPrinter.port || 9100}
              </div>
            )}
            <div>
              <span className="text-gray-600">Model:</span> {currentPrinter.model || '-'}
            </div>
          </div>
        </div>
      )}

      {/* Monitoring Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Connection Status */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-4">Connection</h3>
          <PrinterConnectionMonitor printerId={selectedPrinter} />
        </div>

        {/* Health Status */}
        <div className="lg:col-span-2">
          <PrinterHealthMonitor 
            printerId={selectedPrinter}
            onHealthChange={setHealthData}
          />
        </div>
      </div>

      {/* Job List */}
      <div className="bg-white rounded-lg shadow p-4">
        <PrinterJobList printerId={selectedPrinter} />
      </div>

      {/* Health Alert */}
      {healthData && healthData.status === 'unhealthy' && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-6 py-4 rounded-lg shadow-lg max-w-sm">
          <h4 className="font-bold mb-1">⚠ Printer Alert</h4>
          <p className="text-sm">{healthData.message}</p>
        </div>
      )}
    </div>
  );
}
```

---

## API Client

```javascript
// api/printerApi.js
import axios from 'axios';

const API_BASE = '/api/v1/system/printers';

class PrinterAPI {
  constructor() {
    this.axios = axios.create({
      baseURL: API_BASE,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Add auth token interceptor
    this.axios.interceptors.request.use((config) => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  // Get all printers
  async getAllPrinters(filters = {}) {
    const response = await this.axios.get('/', { params: filters });
    return response.data;
  }

  // Get single printer
  async getPrinter(printerId) {
    const response = await this.axios.get(`/${printerId}`);
    return response.data;
  }

  // Stream connection status (SSE)
  streamConnection(printerId) {
    const token = localStorage.getItem('authToken');
    const url = `${API_BASE}/${printerId}/stream/connection`;
    
    const eventSource = new EventSource(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    return eventSource;
  }

  // Stream health status (SSE)
  streamHealth(printerId) {
    const token = localStorage.getItem('authToken');
    const url = `${API_BASE}/${printerId}/stream/health`;
    
    const eventSource = new EventSource(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    return eventSource;
  }

  // Get printer jobs
  async getJobs(printerId, params = {}) {
    const response = await this.axios.get(`/${printerId}/jobs`, { params });
    return response.data;
  }

  // Test printer connection
  async testConnection(printerId) {
    const response = await this.axios.post(`/${printerId}/test`);
    return response.data;
  }

  // Create printer
  async createPrinter(data) {
    const response = await this.axios.post('/', data);
    return response.data;
  }

  // Update printer
  async updatePrinter(printerId, data) {
    const response = await this.axios.put(`/${printerId}`, data);
    return response.data;
  }

  // Delete printer
  async deletePrinter(printerId) {
    const response = await this.axios.delete(`/${printerId}`);
    return response.data;
  }
}

export const printerApi = new PrinterAPI();
```

---

## Custom Hooks

```javascript
// hooks/usePrinterConnection.js
import { useEffect, useState } from 'react';
import { printerApi } from '../api/printerApi';

export function usePrinterConnection(printerId) {
  const [status, setStatus] = useState({
    connected: false,
    online: false,
    latency: null,
    error: null
  });

  useEffect(() => {
    if (!printerId) return;

    const eventSource = printerApi.streamConnection(printerId);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'status') {
        setStatus({
          connected: true,
          online: data.status === 'online',
          latency: data.latency,
          error: data.error
        });
      }
    };

    eventSource.onerror = () => {
      setStatus(prev => ({ ...prev, connected: false }));
    };

    return () => eventSource.close();
  }, [printerId]);

  return status;
}

// hooks/usePrinterHealth.js
export function usePrinterHealth(printerId) {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!printerId) return;

    const eventSource = printerApi.streamHealth(printerId);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'health') {
        setHealth(data);
        setLoading(false);
      }
    };

    eventSource.onerror = () => {
      setLoading(false);
    };

    return () => eventSource.close();
  }, [printerId]);

  return { health, loading };
}
```

---

## TypeScript Types

```typescript
// types/printer.ts
export interface Printer {
  id: string;
  name: string;
  printerType: 'receipt' | 'kitchen' | 'label' | 'invoice' | 'report';
  connectionType: 'network' | 'usb' | 'bluetooth' | 'serial';
  ipAddress?: string;
  port?: number;
  model?: string;
  manufacturer?: string;
  isActive: boolean;
  isDefault: boolean;
  healthStatus?: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  lastHealthCheck?: string;
}

export interface PrintJob {
  id: string;
  jobType: string;
  referenceType?: string;
  referenceId?: string;
  status: 'pending' | 'printing' | 'completed' | 'failed' | 'cancelled';
  attempts: number;
  maxRetries: number;
  printDuration?: number;
  scheduledAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  creator?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface HealthData {
  healthStatus: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  healthMessage: string;
  isConnected: boolean;
  stuckJobsCount: number;
  oldestStuckJobAge: number;
  consecutiveFailures: number;
  lastSuccessfulPrint?: string;
  stuckJobs: StuckJob[];
  statistics: PrintStatistics;
}

export interface PrintStatistics {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  cancelled: number;
  successRate: string;
  avgDuration?: number;
}

export interface StuckJob {
  id: string;
  jobType: string;
  status: string;
  attempts: number;
  scheduledAt: string;
  startedAt?: string;
  ageMinutes: number;
}
```

---

## Installation

```bash
# React dependencies
npm install react react-hot-toast axios

# Or with yarn
yarn add react react-hot-toast axios
```

## Usage Example

```jsx
// App.jsx
import React from 'react';
import { Toaster } from 'react-hot-toast';
import { PrinterDashboard } from './pages/PrinterDashboard';

function App() {
  const printers = [
    {
      id: 'printer-1',
      name: 'Receipt Printer 1',
      printerType: 'receipt',
      connectionType: 'network',
      ipAddress: '192.168.1.100',
      port: 9100,
      isActive: true
    }
  ];

  return (
    <div className="App">
      <Toaster position="top-right" />
      <PrinterDashboard printers={printers} />
    </div>
  );
}

export default App;
```
