# Log Management - Frontend Integration Guide

## Overview

Log Management system menyediakan comprehensive logging dengan database storage, filtering, statistics, dan auto-cleanup. Sistem ini dirancang untuk monitoring aktivitas user, tracking errors, dan audit trail.

## Base URL

```
http://localhost:8000/api/v1/logs
```

## Authentication

Semua endpoint memerlukan JWT authentication:

```javascript
headers: {
  'Authorization': `Bearer ${token}`
}
```

## Permissions

- **Admin/Owner**: Akses logs tenant mereka sendiri
- **Super Admin**: Akses logs semua tenant + filtering by tenant

---

## 1. Get All Logs (List & Filter)

### Endpoint
```
GET /api/v1/logs
```

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 50 | Records per page (max 100) |
| `level` | string | all | Filter: `info`, `warn`, `error`, `security`, `audit`, `debug`, `all` |
| `action` | string | - | Filter by action (e.g., LOGIN, CREATE_USER) |
| `userId` | UUID | - | Filter by user ID |
| `search` | string | - | Search in message and action |
| `startDate` | date | - | Start date (YYYY-MM-DD) |
| `endDate` | date | - | End date (YYYY-MM-DD) |
| `filterTenantId` | UUID | - | Filter by tenant (Super Admin only) |
| `sortBy` | string | createdAt | Sort field: `createdAt`, `level`, `action`, `statusCode` |
| `sortOrder` | string | DESC | `ASC` or `DESC` |

### Response

```typescript
interface LogsResponse {
  data: Log[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

interface Log {
  id: string;
  level: 'info' | 'warn' | 'error' | 'security' | 'audit' | 'debug';
  action: string | null;
  message: string;
  tenantId: string | null;
  userId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  method: string | null;
  path: string | null;
  statusCode: number | null;
  duration: number | null;
  errorStack: string | null;
  metadata: object;
  createdAt: string;
  tenant: {
    id: string;
    name: string;
  } | null;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
}
```

### Example Request (React/Axios)

```javascript
import axios from 'axios';

const fetchLogs = async (filters = {}) => {
  try {
    const params = new URLSearchParams({
      page: filters.page || 1,
      limit: filters.limit || 50,
      level: filters.level || 'all',
      sortBy: filters.sortBy || 'createdAt',
      sortOrder: filters.sortOrder || 'DESC',
      ...(filters.action && { action: filters.action }),
      ...(filters.userId && { userId: filters.userId }),
      ...(filters.search && { search: filters.search }),
      ...(filters.startDate && { startDate: filters.startDate }),
      ...(filters.endDate && { endDate: filters.endDate }),
      ...(filters.filterTenantId && { filterTenantId: filters.filterTenantId })
    });

    const response = await axios.get(`/api/v1/logs?${params}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching logs:', error);
    throw error;
  }
};

// Usage
const result = await fetchLogs({
  page: 1,
  limit: 50,
  level: 'error',
  startDate: '2025-11-20',
  endDate: '2025-11-24'
});
```

### UI Implementation Tips

**Level Badge Colors:**
```javascript
const levelColors = {
  info: 'blue',
  warn: 'yellow',
  error: 'red',
  security: 'purple',
  audit: 'green',
  debug: 'gray'
};
```

**Date Picker Component:**
```jsx
import DatePicker from 'react-datepicker';

const [dateRange, setDateRange] = useState({ startDate: null, endDate: null });

<DatePicker
  selectsRange
  startDate={dateRange.startDate}
  endDate={dateRange.endDate}
  onChange={(dates) => {
    const [start, end] = dates;
    setDateRange({ startDate: start, endDate: end });
  }}
/>
```

---

## 2. Get Single Log

### Endpoint
```
GET /api/v1/logs/:id
```

### Response

```typescript
interface LogDetailResponse {
  data: Log; // Same as Log interface above
}
```

### Example Request

```javascript
const fetchLogDetail = async (logId) => {
  try {
    const response = await axios.get(`/api/v1/logs/${logId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    return response.data.data;
  } catch (error) {
    if (error.response?.status === 404) {
      console.error('Log not found');
    }
    throw error;
  }
};
```

### UI Modal Example

```jsx
const LogDetailModal = ({ logId, onClose }) => {
  const [log, setLog] = useState(null);

  useEffect(() => {
    fetchLogDetail(logId).then(setLog);
  }, [logId]);

  if (!log) return <Spinner />;

  return (
    <Modal onClose={onClose}>
      <h2>Log Detail</h2>
      <div>
        <strong>Level:</strong> <Badge color={levelColors[log.level]}>{log.level}</Badge>
      </div>
      <div><strong>Action:</strong> {log.action}</div>
      <div><strong>Message:</strong> {log.message}</div>
      <div><strong>User:</strong> {log.user?.email}</div>
      <div><strong>IP Address:</strong> {log.ipAddress}</div>
      <div><strong>Status Code:</strong> {log.statusCode}</div>
      <div><strong>Duration:</strong> {log.duration}ms</div>
      <div><strong>Time:</strong> {new Date(log.createdAt).toLocaleString()}</div>
      
      {log.errorStack && (
        <div>
          <strong>Error Stack:</strong>
          <pre style={{ background: '#f5f5f5', padding: '10px', overflow: 'auto' }}>
            {log.errorStack}
          </pre>
        </div>
      )}
      
      {log.metadata && Object.keys(log.metadata).length > 0 && (
        <div>
          <strong>Metadata:</strong>
          <pre style={{ background: '#f5f5f5', padding: '10px', overflow: 'auto' }}>
            {JSON.stringify(log.metadata, null, 2)}
          </pre>
        </div>
      )}
    </Modal>
  );
};
```

---

## 3. Get Log Statistics (Dashboard)

### Endpoint
```
GET /api/v1/logs/stats
```

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `startDate` | date | Start date (YYYY-MM-DD) |
| `endDate` | date | End date (YYYY-MM-DD) |
| `filterTenantId` | UUID | Tenant filter (Super Admin only) |

### Response

```typescript
interface LogStatsResponse {
  data: {
    totalLogs: number;
    logsByLevel: Array<{
      level: string;
      count: number;
    }>;
    logsByDate: Array<{
      date: string; // YYYY-MM-DD
      count: number;
    }>;
    topUsers: Array<{
      userId: string;
      user: {
        email: string;
        firstName: string | null;
        lastName: string | null;
      };
      count: number;
    }>;
    topActions: Array<{
      action: string;
      count: number;
    }>;
  };
}
```

### Example Request

```javascript
const fetchLogStats = async (dateRange = {}) => {
  try {
    const params = new URLSearchParams({
      ...(dateRange.startDate && { startDate: dateRange.startDate }),
      ...(dateRange.endDate && { endDate: dateRange.endDate })
    });

    const response = await axios.get(`/api/v1/logs/stats?${params}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    return response.data.data;
  } catch (error) {
    console.error('Error fetching stats:', error);
    throw error;
  }
};
```

### Dashboard Charts

**1. Pie Chart - Logs by Level**
```jsx
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const LogsByLevelChart = ({ data }) => {
  const colors = {
    info: '#3b82f6',
    warn: '#f59e0b',
    error: '#ef4444',
    security: '#8b5cf6',
    audit: '#10b981',
    debug: '#6b7280'
  };

  const chartData = data.logsByLevel.map(item => ({
    name: item.level,
    value: item.count,
    color: colors[item.level]
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};
```

**2. Line Chart - Logs by Date**
```jsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const LogsByDateChart = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data.logsByDate}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="date" 
          tickFormatter={(date) => new Date(date).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}
        />
        <YAxis />
        <Tooltip 
          labelFormatter={(date) => new Date(date).toLocaleDateString('id-ID', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        />
        <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
};
```

**3. Bar Chart - Top Actions**
```jsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const TopActionsChart = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data.topActions}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="action" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="count" fill="#10b981" />
      </BarChart>
    </ResponsiveContainer>
  );
};
```

**4. Top Users Table**
```jsx
const TopUsersTable = ({ data }) => {
  return (
    <table className="min-w-full">
      <thead>
        <tr>
          <th>User</th>
          <th>Email</th>
          <th>Activity Count</th>
        </tr>
      </thead>
      <tbody>
        {data.topUsers.map((item) => (
          <tr key={item.userId}>
            <td>{item.user?.firstName} {item.user?.lastName}</td>
            <td>{item.user?.email}</td>
            <td>{item.count}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
```

---

## 4. Export Logs

### Endpoint
```
GET /api/v1/logs/export
```

### Query Parameters
Same as Get All Logs (filtering applies, max 10,000 records)

### Response
JSON file download with filename: `logs-export-{timestamp}.json`

### Example Implementation

```javascript
const exportLogs = async (filters = {}) => {
  try {
    const params = new URLSearchParams({
      ...(filters.level && { level: filters.level }),
      ...(filters.action && { action: filters.action }),
      ...(filters.startDate && { startDate: filters.startDate }),
      ...(filters.endDate && { endDate: filters.endDate })
    });

    const response = await axios.get(`/api/v1/logs/export?${params}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      responseType: 'blob' // Important for file download
    });

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `logs-export-${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    console.error('Error exporting logs:', error);
    throw error;
  }
};
```

### UI Button Component

```jsx
import { Download } from 'lucide-react';

const ExportButton = ({ filters }) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportLogs(filters);
      toast.success('Logs exported successfully');
    } catch (error) {
      toast.error('Failed to export logs');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className="btn btn-primary"
    >
      <Download size={16} />
      {isExporting ? 'Exporting...' : 'Export Logs'}
    </button>
  );
};
```

---

## 5. Manual Cleanup

### Endpoint
```
POST /api/v1/logs/cleanup
```

### Request Body

```typescript
interface CleanupRequest {
  days: number; // Delete logs older than X days (default: 7)
  filterTenantId?: string; // Super Admin: specific tenant or all if omitted
}
```

### Response

```typescript
interface CleanupResponse {
  message: string;
  deletedCount: number;
}
```

### Example Request

```javascript
const cleanupLogs = async (days = 7, tenantId = null) => {
  try {
    const response = await axios.post('/api/v1/logs/cleanup', {
      days,
      ...(tenantId && { filterTenantId: tenantId })
    }, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error cleaning up logs:', error);
    throw error;
  }
};
```

### UI Component

```jsx
import { Trash2 } from 'lucide-react';

const CleanupModal = ({ onClose }) => {
  const [days, setDays] = useState(7);
  const [isLoading, setIsLoading] = useState(false);

  const handleCleanup = async () => {
    if (!confirm(`Delete all logs older than ${days} days?`)) return;

    setIsLoading(true);
    try {
      const result = await cleanupLogs(days);
      toast.success(`${result.deletedCount} logs deleted successfully`);
      onClose();
    } catch (error) {
      toast.error('Failed to cleanup logs');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <h2>Cleanup Old Logs</h2>
      <p>Delete logs older than specified days. Auto-cleanup runs daily at 2:00 AM.</p>
      
      <div className="form-group">
        <label>Days to Keep:</label>
        <input
          type="number"
          value={days}
          onChange={(e) => setDays(parseInt(e.target.value))}
          min={1}
          max={365}
        />
      </div>

      <div className="flex gap-2">
        <button onClick={onClose} className="btn btn-secondary">
          Cancel
        </button>
        <button 
          onClick={handleCleanup} 
          disabled={isLoading}
          className="btn btn-danger"
        >
          <Trash2 size={16} />
          {isLoading ? 'Deleting...' : `Delete Logs (${days}+ days old)`}
        </button>
      </div>
    </Modal>
  );
};
```

---

## 6. Delete Specific Logs

### Endpoint
```
DELETE /api/v1/logs
```

### Request Body

```typescript
interface DeleteLogsRequest {
  logIds: string[]; // Array of log UUIDs
}
```

### Response

```typescript
interface DeleteLogsResponse {
  message: string;
  deletedCount: number;
}
```

### Example Request

```javascript
const deleteSpecificLogs = async (logIds) => {
  try {
    const response = await axios.delete('/api/v1/logs', {
      data: { logIds },
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error deleting logs:', error);
    throw error;
  }
};
```

### UI Multi-Select Implementation

```jsx
const LogsTable = () => {
  const [logs, setLogs] = useState([]);
  const [selectedLogs, setSelectedLogs] = useState([]);

  const handleSelectLog = (logId) => {
    setSelectedLogs(prev => 
      prev.includes(logId) 
        ? prev.filter(id => id !== logId)
        : [...prev, logId]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedLogs.length === 0) {
      toast.warning('No logs selected');
      return;
    }

    if (!confirm(`Delete ${selectedLogs.length} selected log(s)?`)) return;

    try {
      const result = await deleteSpecificLogs(selectedLogs);
      toast.success(`${result.deletedCount} logs deleted`);
      setSelectedLogs([]);
      // Refresh logs list
      fetchLogs();
    } catch (error) {
      toast.error('Failed to delete logs');
    }
  };

  return (
    <div>
      <div className="flex justify-between mb-4">
        <div>
          {selectedLogs.length > 0 && (
            <span>{selectedLogs.length} logs selected</span>
          )}
        </div>
        <button
          onClick={handleDeleteSelected}
          disabled={selectedLogs.length === 0}
          className="btn btn-danger"
        >
          Delete Selected
        </button>
      </div>

      <table>
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                checked={selectedLogs.length === logs.length}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedLogs(logs.map(log => log.id));
                  } else {
                    setSelectedLogs([]);
                  }
                }}
              />
            </th>
            <th>Level</th>
            <th>Action</th>
            <th>Message</th>
            <th>User</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <tr key={log.id}>
              <td>
                <input
                  type="checkbox"
                  checked={selectedLogs.includes(log.id)}
                  onChange={() => handleSelectLog(log.id)}
                />
              </td>
              <td><Badge color={levelColors[log.level]}>{log.level}</Badge></td>
              <td>{log.action}</td>
              <td>{log.message}</td>
              <td>{log.user?.email}</td>
              <td>{new Date(log.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

---

## Complete Example: Log Management Page

```jsx
import React, { useState, useEffect } from 'react';
import { Filter, Download, Trash2, RefreshCw } from 'lucide-react';

const LogManagementPage = () => {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({
    page: 1,
    limit: 50,
    level: 'all',
    search: '',
    startDate: '',
    endDate: '',
    sortBy: 'createdAt',
    sortOrder: 'DESC'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLogs, setSelectedLogs] = useState([]);

  // Fetch logs
  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const result = await fetchLogs(filters);
      setLogs(result.data);
      setPagination(result.pagination);
    } catch (error) {
      toast.error('Failed to load logs');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch stats
  const loadStats = async () => {
    try {
      const result = await fetchLogStats({
        startDate: filters.startDate,
        endDate: filters.endDate
      });
      setStats(result);
    } catch (error) {
      console.error('Failed to load stats');
    }
  };

  useEffect(() => {
    loadLogs();
    loadStats();
  }, [filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleExport = async () => {
    try {
      await exportLogs(filters);
      toast.success('Logs exported successfully');
    } catch (error) {
      toast.error('Failed to export logs');
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedLogs.length === 0) return;
    
    if (!confirm(`Delete ${selectedLogs.length} log(s)?`)) return;

    try {
      await deleteSpecificLogs(selectedLogs);
      toast.success('Logs deleted successfully');
      setSelectedLogs([]);
      loadLogs();
    } catch (error) {
      toast.error('Failed to delete logs');
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Log Management</h1>

      {/* Statistics Dashboard */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="card">
            <h3>Total Logs</h3>
            <p className="text-3xl font-bold">{stats.totalLogs}</p>
          </div>
          <LogsByLevelChart data={stats} />
          <LogsByDateChart data={stats} />
          <TopActionsChart data={stats} />
        </div>
      )}

      {/* Filters */}
      <div className="card mb-6">
        <div className="grid grid-cols-4 gap-4">
          <select 
            value={filters.level}
            onChange={(e) => handleFilterChange('level', e.target.value)}
          >
            <option value="all">All Levels</option>
            <option value="info">Info</option>
            <option value="warn">Warning</option>
            <option value="error">Error</option>
            <option value="security">Security</option>
            <option value="audit">Audit</option>
            <option value="debug">Debug</option>
          </select>

          <input
            type="text"
            placeholder="Search..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />

          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
          />

          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
          />
        </div>

        <div className="flex gap-2 mt-4">
          <button onClick={loadLogs} className="btn btn-secondary">
            <RefreshCw size={16} /> Refresh
          </button>
          <button onClick={handleExport} className="btn btn-primary">
            <Download size={16} /> Export
          </button>
          <button 
            onClick={handleDeleteSelected}
            disabled={selectedLogs.length === 0}
            className="btn btn-danger"
          >
            <Trash2 size={16} /> Delete Selected ({selectedLogs.length})
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="card">
        {isLoading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <>
            <LogsTable 
              logs={logs}
              selectedLogs={selectedLogs}
              onSelectLog={(id) => {
                setSelectedLogs(prev =>
                  prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
                );
              }}
              onSelectAll={(checked) => {
                setSelectedLogs(checked ? logs.map(l => l.id) : []);
              }}
            />

            {/* Pagination */}
            <div className="flex justify-between items-center mt-4">
              <div>
                Showing {(pagination.currentPage - 1) * pagination.limit + 1} to{' '}
                {Math.min(pagination.currentPage * pagination.limit, pagination.totalRecords)} of{' '}
                {pagination.totalRecords} logs
              </div>
              <div className="flex gap-2">
                <button
                  disabled={!pagination.hasPrevPage}
                  onClick={() => handleFilterChange('page', filters.page - 1)}
                  className="btn"
                >
                  Previous
                </button>
                <span className="px-4 py-2">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </span>
                <button
                  disabled={!pagination.hasNextPage}
                  onClick={() => handleFilterChange('page', filters.page + 1)}
                  className="btn"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LogManagementPage;
```

---

## Error Handling

```javascript
// Global error handler for log API calls
const handleLogApiError = (error) => {
  if (error.response) {
    switch (error.response.status) {
      case 401:
        toast.error('Unauthorized. Please login again.');
        // Redirect to login
        break;
      case 403:
        toast.error('You do not have permission to access logs.');
        break;
      case 404:
        toast.error('Log not found.');
        break;
      case 500:
        toast.error('Server error. Please try again later.');
        break;
      default:
        toast.error(error.response.data?.message || 'An error occurred');
    }
  } else {
    toast.error('Network error. Please check your connection.');
  }
};
```

---

## Real-time Updates (Optional)

Untuk real-time log updates, bisa gunakan polling atau WebSocket:

```javascript
// Polling every 30 seconds
useEffect(() => {
  const interval = setInterval(() => {
    loadLogs();
  }, 30000);

  return () => clearInterval(interval);
}, [filters]);
```

---

## Notes

1. **Auto Cleanup**: Logs otomatis dihapus setiap hari jam 2 pagi (retention 7 hari)
2. **Export Limit**: Maximum 10,000 records per export
3. **Pagination**: Default 50 records per page, max 100
4. **Date Format**: Use ISO format (YYYY-MM-DD) untuk date filters
5. **Tenant Isolation**: Admin/Owner hanya bisa akses logs tenant mereka
6. **Performance**: Gunakan indexes yang sudah disediakan untuk query cepat

---

## Postman Collection

Import Postman collection dari:
```
docs/postman/LOG-MANAGEMENT-API.postman_collection.json
```

Set environment variables:
- `base_url`: http://localhost:8000/api/v1
- `access_token`: JWT token dari login
