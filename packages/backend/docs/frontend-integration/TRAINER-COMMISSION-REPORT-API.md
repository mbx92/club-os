# Trainer Commission Report API - Frontend Integration Guide

## Overview

API untuk mendapatkan laporan komisi trainer secara agregat (semua trainer) dengan berbagai filter dan grouping options. Mendukung analisis komisi per trainer, time series, dan status pembayaran.

## 🔄 How Trainer Commission Works

### Commission Creation Flow

Trainer commission **dibuat otomatis** pada saat:

1. **Booking Class dengan Trainer**
   ```
   User books class → System checks trainer → Create TrainerCommission record
   - baseAmount: Class price
   - commissionType & Rate: From trainer profile
   - status: 'pending'
   ```

2. **Personal Training Session**
   ```
   PT transaction completes → System creates commission for assigned trainer
   - baseAmount: Session price or package price
   - Commission calculated automatically (via model hook)
   ```

### Commission Types

**Trainer Profile:**
- `commissionType`: `'percentage'` or `'fixed'`
- `commissionValue`: Amount or percentage

**Examples:**
- **Percentage**: Class Rp 150,000 × 20% = **Rp 30,000** commission
- **Fixed**: Every class = **Rp 50,000** flat (regardless of class price)

### Commission Auto-Calculation

Commission amount is auto-calculated in `TrainerCommission` model hooks:
```javascript
beforeCreate: (commission) => {
  if (commission.commissionType === 'percentage') {
    commission.commissionAmount = 
      (baseAmount × commissionRate) / 100;
  } else {
    commission.commissionAmount = commissionRate; // Fixed amount
  }
}
```

### Commission Status Lifecycle

```
pending → paid (when commission is paid to trainer)
        → cancelled (if transaction is refunded/cancelled)
```

### ⚠️ Implementation Note

**Current Status:**
- ✅ Database schema & models complete
- ✅ Report endpoints ready
- ✅ Pay commission endpoint ready
- ✅ **Auto-create commission IMPLEMENTED** (Feb 18, 2026)

**Auto-commission triggers**:
1. ✅ When service plan purchased with `assignedTrainerId`
2. ✅ When trainer assigned to existing active service
3. ✅ When trainer reassigned (cancels old, creates new)
4. ⚠️ Class booking (pending - class module not yet implemented)

**Implementation Details**: See `docs/implementation-progress/TRAINER-COMMISSION-AUTO-CREATE.md`

The commission system automatically creates records at:
- Service purchase controller (`activeServiceController.purchaseServicePlans`)
- Trainer assignment endpoint (`activeServiceController.assignTrainer`)
- Future: Class booking controller (when implemented)

---

## Endpoints

### 1. Get Individual Trainer Commissions

Mendapatkan komisi untuk **satu trainer tertentu**.

```http
GET /api/v1/gym/trainers/:trainerId/commissions
```

**Query Parameters:**
- `page` (number, default: 1) - Pagination page number
- `limit` (number, default: 10) - Items per page
- `status` (string, optional) - Filter by status: `pending`, `paid`, `cancelled`
- `startDate` (string, optional) - Format: YYYY-MM-DD
- `endDate` (string, optional) - Format: YYYY-MM-DD

**Response:**
```json
{
  "success": true,
  "data": {
    "commissions": [
      {
        "id": "uuid",
        "trainerId": "uuid",
        "transactionId": "uuid",
        "commissionAmount": 150000,
        "status": "pending",
        "notes": "Commission for PT session",
        "paidAt": null,
        "createdAt": "2026-02-15T10:00:00.000Z",
        "transaction": {
          "id": "uuid",
          "transactionNumber": "TRX-20260215-001",
          "totalAmount": 500000,
          "createdAt": "2026-02-15T09:00:00.000Z"
        }
      }
    ],
    "summary": {
      "totalCommissions": 25,
      "totalAmount": 5000000,
      "paidAmount": 3000000,
      "pendingAmount": 2000000
    },
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalRecords": 25,
      "limit": 10,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

---

### 2. Get Trainer Commission Report (All Trainers)

⭐ **NEW ENDPOINT** - Mendapatkan laporan komisi agregat untuk **semua trainer**.

```http
GET /api/v1/gym/reports/trainer-commissions
```

**Query Parameters:**
- `startDate` (string, optional) - Start date filter: YYYY-MM-DD
- `endDate` (string, optional) - End date filter: YYYY-MM-DD
- `status` (string, optional) - Filter by: `pending`, `paid`, `cancelled`
- `trainerId` (string, optional) - Filter by specific trainer ID
- `groupBy` (string, optional) - Group time series by: `daily`, `weekly`, `monthly`, `yearly`
- `sortBy` (string, default: "date") - Sort by: `trainer`, `amount`, `date`
- `sortOrder` (string, default: "desc") - Sort order: `asc`, `desc`

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalTrainers": 8,
      "totalCommissions": 156,
      "totalAmount": 45000000,
      "paidAmount": 30000000,
      "pendingAmount": 15000000,
      "cancelledAmount": 0,
      "paidCount": 104,
      "pendingCount": 52,
      "cancelledCount": 0
    },
    "byTrainer": [
      {
        "trainer": {
          "id": "uuid",
          "name": "John Doe",
          "email": "john@example.com",
          "phone": "08123456789",
          "commissionType": "percentage",
          "commissionValue": 20
        },
        "totalAmount": 8500000,
        "paidAmount": 6000000,
        "pendingAmount": 2500000,
        "cancelledAmount": 0,
        "commissionCount": 32,
        "paidCount": 22,
        "pendingCount": 10,
        "cancelledCount": 0
      },
      {
        "trainer": {
          "id": "uuid",
          "name": "Jane Smith",
          "email": "jane@example.com",
          "phone": "08198765432",
          "commissionType": "fixed",
          "commissionValue": 50000
        },
        "totalAmount": 6200000,
        "paidAmount": 4500000,
        "pendingAmount": 1700000,
        "cancelledAmount": 0,
        "commissionCount": 28,
        "paidCount": 20,
        "pendingCount": 8,
        "cancelledCount": 0
      }
    ],
    "timeSeries": [
      {
        "period": "2026-02-01T00:00:00.000Z",
        "count": 45,
        "totalAmount": 12000000,
        "paidAmount": 8000000,
        "pendingAmount": 4000000
      },
      {
        "period": "2026-02-08T00:00:00.000Z",
        "count": 38,
        "totalAmount": 10500000,
        "paidAmount": 7500000,
        "pendingAmount": 3000000
      }
    ],
    "recentCommissions": [
      {
        "id": "uuid",
        "trainer": {
          "id": "uuid",
          "name": "John Doe"
        },
        "transaction": {
          "id": "uuid",
          "transactionNumber": "TRX-20260218-045",
          "totalAmount": 800000
        },
        "commissionAmount": 160000,
        "status": "pending",
        "notes": "PT Session - 5 pack",
        "paidAt": null,
        "createdAt": "2026-02-18T14:30:00.000Z"
      }
    ]
  },
  "filters": {
    "startDate": "2026-02-01",
    "endDate": "2026-02-28",
    "status": null,
    "trainerId": null,
    "groupBy": "weekly",
    "sortBy": "amount",
    "sortOrder": "desc"
  },
  "meta": {
    "totalCommissionsCount": 156,
    "displayedCommissionsCount": 100,
    "note": "Recent commissions limited to 100 items"
  }
}
```

---

## Frontend Implementation Examples

### Vue 3 / React - Commission Report Dashboard

```javascript
// API Service
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api/v1';

export const trainerCommissionAPI = {
  // Get individual trainer commissions
  getTrainerCommissions(trainerId, params = {}) {
    return axios.get(`${API_BASE_URL}/gym/trainers/${trainerId}/commissions`, {
      params,
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
  },

  // Get commission report (all trainers)
  getCommissionReport(filters = {}) {
    return axios.get(`${API_BASE_URL}/gym/reports/trainer-commissions`, {
      params: filters,
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
  },

  // Pay commission
  payCommission(trainerId, commissionId) {
    return axios.post(
      `${API_BASE_URL}/gym/trainers/${trainerId}/commissions/${commissionId}/pay`,
      {},
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      }
    );
  }
};
```

### Vue 3 Composition API - Commission Report Component

```vue
<template>
  <div class="commission-report">
    <!-- Filters -->
    <div class="filters">
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        range-separator="to"
        start-placeholder="Start date"
        end-placeholder="End date"
        @change="fetchReport"
      />
      
      <el-select v-model="filters.status" placeholder="Status" @change="fetchReport">
        <el-option label="All Status" value="" />
        <el-option label="Pending" value="pending" />
        <el-option label="Paid" value="paid" />
        <el-option label="Cancelled" value="cancelled" />
      </el-select>

      <el-select v-model="filters.groupBy" placeholder="Group By" @change="fetchReport">
        <el-option label="No Grouping" value="" />
        <el-option label="Daily" value="daily" />
        <el-option label="Weekly" value="weekly" />
        <el-option label="Monthly" value="monthly" />
      </el-select>

      <el-select v-model="filters.sortBy" @change="fetchReport">
        <el-option label="Sort by Date" value="date" />
        <el-option label="Sort by Trainer" value="trainer" />
        <el-option label="Sort by Amount" value="amount" />
      </el-select>

      <el-button type="primary" @click="fetchReport">Apply Filters</el-button>
    </div>

    <!-- Summary Cards -->
    <div class="summary-cards" v-if="reportData.summary">
      <el-card class="summary-card">
        <div class="stat-title">Total Trainers</div>
        <div class="stat-value">{{ reportData.summary.totalTrainers }}</div>
      </el-card>
      
      <el-card class="summary-card">
        <div class="stat-title">Total Commissions</div>
        <div class="stat-value">{{ reportData.summary.totalCommissions }}</div>
      </el-card>
      
      <el-card class="summary-card total-amount">
        <div class="stat-title">Total Amount</div>
        <div class="stat-value">{{ formatCurrency(reportData.summary.totalAmount) }}</div>
      </el-card>
      
      <el-card class="summary-card paid">
        <div class="stat-title">Paid</div>
        <div class="stat-value">{{ formatCurrency(reportData.summary.paidAmount) }}</div>
        <div class="stat-subtitle">{{ reportData.summary.paidCount }} commissions</div>
      </el-card>
      
      <el-card class="summary-card pending">
        <div class="stat-title">Pending</div>
        <div class="stat-value">{{ formatCurrency(reportData.summary.pendingAmount) }}</div>
        <div class="stat-subtitle">{{ reportData.summary.pendingCount }} commissions</div>
      </el-card>
    </div>

    <!-- Time Series Chart (if grouped) -->
    <el-card v-if="reportData.timeSeries && reportData.timeSeries.length > 0" class="chart-card">
      <h3>Commission Trend</h3>
      <div ref="chartContainer" style="height: 300px;"></div>
    </el-card>

    <!-- By Trainer Table -->
    <el-card class="trainer-table">
      <h3>Commission by Trainer</h3>
      <el-table :data="reportData.byTrainer" style="width: 100%">
        <el-table-column prop="trainer.name" label="Trainer" sortable />
        <el-table-column prop="trainer.email" label="Email" />
        <el-table-column label="Commission Type">
          <template #default="{ row }">
            <el-tag v-if="row.trainer.commissionType === 'percentage'" type="success">
              {{ row.trainer.commissionValue }}%
            </el-tag>
            <el-tag v-else type="info">
              Fixed: {{ formatCurrency(row.trainer.commissionValue) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Total Amount" sortable>
          <template #default="{ row }">
            {{ formatCurrency(row.totalAmount) }}
          </template>
        </el-table-column>
        <el-table-column label="Paid" sortable>
          <template #default="{ row }">
            <span class="paid-amount">{{ formatCurrency(row.paidAmount) }}</span>
            <div class="count-subtitle">{{ row.paidCount }} items</div>
          </template>
        </el-table-column>
        <el-table-column label="Pending" sortable>
          <template #default="{ row }">
            <span class="pending-amount">{{ formatCurrency(row.pendingAmount) }}</span>
            <div class="count-subtitle">{{ row.pendingCount }} items</div>
          </template>
        </el-table-column>
        <el-table-column label="Actions" width="150">
          <template #default="{ row }">
            <el-button 
              size="small" 
              @click="viewTrainerCommissions(row.trainer.id)"
            >
              View Details
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- Recent Commissions -->
    <el-card class="recent-commissions">
      <h3>Recent Commissions</h3>
      <el-table :data="reportData.recentCommissions" style="width: 100%">
        <el-table-column prop="createdAt" label="Date" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column prop="trainer.name" label="Trainer" />
        <el-table-column prop="transaction.transactionNumber" label="Transaction" />
        <el-table-column label="Amount">
          <template #default="{ row }">
            {{ formatCurrency(row.commissionAmount) }}
          </template>
        </el-table-column>
        <el-table-column label="Status" width="100">
          <template #default="{ row }">
            <el-tag 
              :type="row.status === 'paid' ? 'success' : row.status === 'pending' ? 'warning' : 'info'"
            >
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch, computed } from 'vue';
import { trainerCommissionAPI } from '@/api/trainer';
import { ElMessage } from 'element-plus';

// State
const loading = ref(false);
const dateRange = ref([]);
const filters = reactive({
  status: '',
  trainerId: '',
  groupBy: '',
  sortBy: 'date',
  sortOrder: 'desc'
});

const reportData = reactive({
  summary: null,
  byTrainer: [],
  timeSeries: null,
  recentCommissions: []
});

// Computed
const filterParams = computed(() => {
  const params = { ...filters };
  
  if (dateRange.value && dateRange.value.length === 2) {
    params.startDate = formatDateForAPI(dateRange.value[0]);
    params.endDate = formatDateForAPI(dateRange.value[1]);
  }
  
  // Remove empty filters
  Object.keys(params).forEach(key => {
    if (params[key] === '' || params[key] === null) {
      delete params[key];
    }
  });
  
  return params;
});

// Methods
async function fetchReport() {
  loading.value = true;
  try {
    const response = await trainerCommissionAPI.getCommissionReport(filterParams.value);
    
    if (response.data.success) {
      reportData.summary = response.data.data.summary;
      reportData.byTrainer = response.data.data.byTrainer;
      reportData.timeSeries = response.data.data.timeSeries;
      reportData.recentCommissions = response.data.data.recentCommissions;

      // Render chart if time series data exists
      if (reportData.timeSeries && reportData.timeSeries.length > 0) {
        renderChart();
      }
    }
  } catch (error) {
    ElMessage.error(error.response?.data?.message || 'Failed to fetch report');
  } finally {
    loading.value = false;
  }
}

function viewTrainerCommissions(trainerId) {
  // Navigate to trainer-specific commission page
  router.push(`/gym/trainers/${trainerId}/commissions`);
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount);
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatDateForAPI(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function renderChart() {
  // Use Chart.js, ECharts, or any charting library
  // Example with ECharts:
  // const myChart = echarts.init(chartContainer.value);
  // myChart.setOption({...});
}

// Lifecycle
onMounted(() => {
  // Set default date range (last 30 days)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  dateRange.value = [startDate, endDate];
  
  fetchReport();
});
</script>

<style scoped>
.commission-report {
  padding: 20px;
}

.filters {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.summary-card {
  text-align: center;
}

.stat-title {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #333;
}

.stat-subtitle {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.summary-card.total-amount .stat-value {
  color: #409EFF;
}

.summary-card.paid .stat-value {
  color: #67C23A;
}

.summary-card.pending .stat-value {
  color: #E6A23C;
}

.chart-card,
.trainer-table,
.recent-commissions {
  margin-bottom: 20px;
}

.paid-amount {
  color: #67C23A;
  font-weight: 600;
}

.pending-amount {
  color: #E6A23C;
  font-weight: 600;
}

.count-subtitle {
  font-size: 12px;
  color: #999;
}
</style>
```

---

## React Example

```jsx
import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Table, DatePicker, Select, Button, Tag } from 'antd';
import { trainerCommissionAPI } from './api/trainer';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

export default function TrainerCommissionReport() {
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(30, 'days'),
    dayjs()
  ]);
  const [filters, setFilters] = useState({
    status: '',
    groupBy: '',
    sortBy: 'date',
    sortOrder: 'desc'
  });
  const [reportData, setReportData] = useState({
    summary: null,
    byTrainer: [],
    timeSeries: null,
    recentCommissions: []
  });

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = {
        ...filters,
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD')
      };

      const response = await trainerCommissionAPI.getCommissionReport(params);
      
      if (response.data.success) {
        setReportData(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch report', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const columns = [
    {
      title: 'Trainer',
      dataIndex: ['trainer', 'name'],
      key: 'name'
    },
    {
      title: 'Email',
      dataIndex: ['trainer', 'email'],
      key: 'email'
    },
    {
      title: 'Total Amount',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (amount) => formatCurrency(amount),
      sorter: (a, b) => a.totalAmount - b.totalAmount
    },
    {
      title: 'Paid',
      dataIndex: 'paidAmount',
      key: 'paidAmount',
      render: (amount, record) => (
        <div>
          <div style={{ color: '#52c41a', fontWeight: 600 }}>
            {formatCurrency(amount)}
          </div>
          <div style={{ fontSize: 12, color: '#999' }}>
            {record.paidCount} items
          </div>
        </div>
      )
    },
    {
      title: 'Pending',
      dataIndex: 'pendingAmount',
      key: 'pendingAmount',
      render: (amount, record) => (
        <div>
          <div style={{ color: '#faad14', fontWeight: 600 }}>
            {formatCurrency(amount)}
          </div>
          <div style={{ fontSize: 12, color: '#999' }}>
            {record.pendingCount} items
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="commission-report">
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col>
          <RangePicker 
            value={dateRange}
            onChange={setDateRange}
          />
        </Col>
        <Col>
          <Select
            style={{ width: 150 }}
            placeholder="Status"
            value={filters.status}
            onChange={(value) => setFilters({ ...filters, status: value })}
          >
            <Option value="">All Status</Option>
            <Option value="pending">Pending</Option>
            <Option value="paid">Paid</Option>
          </Select>
        </Col>
        <Col>
          <Select
            style={{ width: 150 }}
            placeholder="Group By"
            value={filters.groupBy}
            onChange={(value) => setFilters({ ...filters, groupBy: value })}
          >
            <Option value="">No Grouping</Option>
            <Option value="daily">Daily</Option>
            <Option value="weekly">Weekly</Option>
            <Option value="monthly">Monthly</Option>
          </Select>
        </Col>
        <Col>
          <Button type="primary" onClick={fetchReport}>
            Apply Filters
          </Button>
        </Col>
      </Row>

      {reportData.summary && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#666', marginBottom: 8 }}>Total Trainers</div>
                <div style={{ fontSize: 28, fontWeight: 'bold' }}>
                  {reportData.summary.totalTrainers}
                </div>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#666', marginBottom: 8 }}>Total Amount</div>
                <div style={{ fontSize: 28, fontWeight: 'bold', color: '#1890ff' }}>
                  {formatCurrency(reportData.summary.totalAmount)}
                </div>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#666', marginBottom: 8 }}>Paid</div>
                <div style={{ fontSize: 28, fontWeight: 'bold', color: '#52c41a' }}>
                  {formatCurrency(reportData.summary.paidAmount)}
                </div>
                <div style={{ fontSize: 12, color: '#999' }}>
                  {reportData.summary.paidCount} commissions
                </div>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#666', marginBottom: 8 }}>Pending</div>
                <div style={{ fontSize: 28, fontWeight: 'bold', color: '#faad14' }}>
                  {formatCurrency(reportData.summary.pendingAmount)}
                </div>
                <div style={{ fontSize: 12, color: '#999' }}>
                  {reportData.summary.pendingCount} commissions
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      )}

      <Card title="Commission by Trainer" style={{ marginBottom: 16 }}>
        <Table
          loading={loading}
          dataSource={reportData.byTrainer}
          columns={columns}
          rowKey={(record) => record.trainer.id}
        />
      </Card>
    </div>
  );
}
```

---

## Permission Requirements

Untuk mengakses endpoint ini, user memerlukan:

1. **Authentication**: Valid JWT token
2. **Module Access**: `gym` module enabled in subscription
3. **CASL Permission**: `read` permission on `TrainerCommission` resource
4. **Feature**: `trainerCommission` feature enabled (Professional/Enterprise plan)

---

## Error Handling

```javascript
try {
  const response = await trainerCommissionAPI.getCommissionReport(filters);
  // Handle success
} catch (error) {
  if (error.response) {
    switch (error.response.status) {
      case 401:
        // Unauthorized - redirect to login
        break;
      case 403:
        // Forbidden - upgrade subscription or check permissions
        ElMessage.error('You need Professional or Enterprise plan to access commission reports');
        break;
      case 404:
        // Not found
        ElMessage.error('Report not found');
        break;
      default:
        ElMessage.error(error.response.data.message || 'Failed to fetch report');
    }
  } else {
    ElMessage.error('Network error');
  }
}
```

---

## Best Practices

1. **Caching**: Cache report data for 5-10 minutes untuk mengurangi load
2. **Date Range**: Set default date range (e.g., last 30 days) untuk better UX
3. **Pagination**: Jika perlu menampilkan semua commissions, gunakan endpoint individual trainer dengan pagination
4. **Export**: Implementasikan export to Excel/PDF untuk detailed reports
5. **Real-time Updates**: Consider implementing WebSocket untuk real-time commission updates
6. **Performance**: Use `groupBy` untuk large datasets daripada load semua raw data

---

## Testing Examples

```bash
# Get all trainer commissions (last 30 days)
curl -X GET "http://localhost:5000/api/v1/gym/reports/trainer-commissions?startDate=2026-01-18&endDate=2026-02-18" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get pending commissions only, grouped by week
curl -X GET "http://localhost:5000/api/v1/gym/reports/trainer-commissions?status=pending&groupBy=weekly" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get commissions for specific trainer, sorted by amount
curl -X GET "http://localhost:5000/api/v1/gym/reports/trainer-commissions?trainerId=uuid-here&sortBy=amount&sortOrder=desc" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Notes

- `recentCommissions` limited to 100 items untuk performance
- Untuk detailed list semua commissions, gunakan endpoint individual trainer dengan pagination
- `timeSeries` hanya muncul jika `groupBy` parameter diset
- All amounts dalam IDR (Indonesian Rupiah)
- Timestamps dalam ISO 8601 format (UTC)

---

**Endpoint Summary:**
- Individual trainer: `GET /api/v1/gym/trainers/:id/commissions`
- All trainers report: `GET /api/v1/gym/reports/trainer-commissions` ⭐ **NEW**
- Pay commission: `POST /api/v1/gym/trainers/:id/commissions/:commissionId/pay`
