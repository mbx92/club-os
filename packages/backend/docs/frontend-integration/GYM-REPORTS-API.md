# Gym Module Reports & Dashboard API Documentation

## Overview

This document describes the reporting and dashboard endpoints for the Gym module. These endpoints provide comprehensive analytics for revenue tracking, profit & loss analysis, attendance monitoring, and service plan status management.

---

## Base URL

```
/api/v1/gym
```

All endpoints require:
- **Authentication**: JWT token via `Authorization: Bearer <token>` header
- **Feature Gate**: `gym` module must be enabled in subscription
- **CASL Authorization**: User must have appropriate read permissions

---

## Dashboard Endpoints

### 1. Get Dashboard Overview

Get comprehensive dashboard overview with revenue, members, attendance statistics.

**Endpoint**: `GET /gym/dashboard/overview`

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| locationId | UUID | No | Filter by specific location |

**Response**:
```json
{
  "success": true,
  "data": {
    "revenue": {
      "today": {
        "amount": 5500000,
        "change": 12.5,
        "transactions": 15
      },
      "thisMonth": {
        "amount": 85000000,
        "change": 8.3,
        "transactions": 245
      }
    },
    "members": {
      "active": 320,
      "newThisMonth": 45,
      "growth": 15.2
    },
    "attendance": {
      "today": 78,
      "uniqueToday": 65
    },
    "services": {
      "expiringSoon": 12,
      "breakdown": [
        {
          "type": "membership",
          "count": 250
        },
        {
          "type": "personal_training",
          "count": 45
        },
        {
          "type": "class",
          "count": 25
        }
      ]
    },
    "recentTransactions": [
      {
        "id": "uuid",
        "transactionNumber": "TRX-GYM-2025-001234",
        "amount": 350000,
        "status": "completed",
        "createdAt": "2025-12-22T10:30:00.000Z"
      }
    ]
  }
}
```

**Business Logic**:
- Today's revenue compared to yesterday (percentage change)
- This month's revenue compared to last month
- Active members (active membership services)
- Check-ins today (total and unique members)
- Services expiring in next 7 days
- Service breakdown by type (membership, PT, class)
- Last 5 transactions

---

### 2. Get Dashboard Stats (Simplified)

Get quick statistics for dashboard widgets.

**Endpoint**: `GET /gym/dashboard/stats`

**Response**:
```json
{
  "success": true,
  "data": {
    "totalMembers": 320,
    "activeServices": 315,
    "todayCheckIns": 78,
    "thisMonthRevenue": 85000000
  }
}
```

---

## Report Endpoints

### 3. Get Revenue Report

Comprehensive revenue report with breakdown by period and service type.

**Endpoint**: `GET /gym/reports/revenue`

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| startDate | Date (YYYY-MM-DD) | No | Start date for report |
| endDate | Date (YYYY-MM-DD) | No | End date for report |
| groupBy | String | No | Grouping: `daily`, `weekly`, `monthly`, `yearly` (default: `daily`) |
| serviceType | String | No | Filter by service type: `membership`, `personal_training`, `class` |
| locationId | UUID | No | Filter by location |

**Response**:
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalRevenue": 85000000,
      "subtotal": 77272727.27,
      "totalTax": 7727272.73,
      "totalDiscount": 500000,
      "totalTransactions": 245,
      "averageOrderValue": 346938.78
    },
    "revenueByPeriod": [
      {
        "period": "2025-12-01T00:00:00.000Z",
        "transactionCount": 80,
        "revenue": 28000000,
        "subtotal": 25454545.45,
        "tax": 2545454.55,
        "discount": 150000
      },
      {
        "period": "2025-12-02T00:00:00.000Z",
        "transactionCount": 75,
        "revenue": 26500000,
        "subtotal": 24090909.09,
        "tax": 2409090.91,
        "discount": 100000
      }
    ],
    "revenueByServiceType": [
      {
        "serviceType": "membership",
        "itemCount": 180,
        "revenue": 54000000
      },
      {
        "serviceType": "personal_training",
        "itemCount": 45,
        "revenue": 22500000
      },
      {
        "serviceType": "class",
        "itemCount": 20,
        "revenue": 8500000
      }
    ],
    "paymentBreakdown": [
      {
        "method": "cash",
        "count": 120,
        "total": 42000000
      },
      {
        "method": "transfer",
        "count": 80,
        "total": 28000000
      },
      {
        "method": "credit_card",
        "count": 45,
        "total": 15000000
      }
    ]
  },
  "filters": {
    "startDate": "2025-12-01",
    "endDate": "2025-12-31",
    "groupBy": "daily",
    "serviceType": null,
    "locationId": null
  }
}
```

**Use Cases**:
- Daily/weekly/monthly revenue tracking
- Service type performance analysis
- Payment method preferences
- Revenue trends over time

---

### 4. Get Profit & Loss Report

Profit and loss analysis with revenue, costs, and profit margins.

**Endpoint**: `GET /gym/reports/profit-loss`

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| startDate | Date (YYYY-MM-DD) | No | Start date for report |
| endDate | Date (YYYY-MM-DD) | No | End date for report |
| groupBy | String | No | Grouping: `daily`, `weekly`, `monthly`, `yearly` (default: `monthly`) |

**Response**:
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalRevenue": 255000000,
      "totalDiscount": 1500000,
      "totalGrossProfit": 253500000,
      "totalNetProfit": 253500000,
      "overallProfitMargin": "99.41"
    },
    "profitLoss": [
      {
        "period": "2025-10-01T00:00:00.000Z",
        "revenue": 75000000,
        "discount": 500000,
        "tax": 7500000,
        "grossProfit": 74500000,
        "netProfit": 74500000,
        "profitMargin": "99.33"
      },
      {
        "period": "2025-11-01T00:00:00.000Z",
        "revenue": 95000000,
        "discount": 600000,
        "tax": 9500000,
        "grossProfit": 94400000,
        "netProfit": 94400000,
        "profitMargin": "99.37"
      },
      {
        "period": "2025-12-01T00:00:00.000Z",
        "revenue": 85000000,
        "discount": 400000,
        "tax": 8500000,
        "grossProfit": 84600000,
        "netProfit": 84600000,
        "profitMargin": "99.53"
      }
    ]
  },
  "filters": {
    "startDate": "2025-10-01",
    "endDate": "2025-12-31",
    "groupBy": "monthly"
  }
}
```

**Calculation Logic**:
- **Gross Profit** = Revenue - Discounts
- **Net Profit** = Gross Profit (in simplified version, expand with operating expenses)
- **Profit Margin** = (Net Profit / Revenue) × 100%

**Notes**:
- Current implementation shows simplified P&L
- Can be expanded to include: trainer commissions, operating expenses, COGS

---

### 5. Get Attendance Report

Attendance tracking with check-in statistics and peak hours analysis.

**Endpoint**: `GET /gym/reports/attendance`

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| startDate | Date (YYYY-MM-DD) | No | Start date for report |
| endDate | Date (YYYY-MM-DD) | No | End date for report |
| groupBy | String | No | Grouping: `daily`, `weekly`, `monthly` (default: `daily`) |
| locationId | UUID | No | Filter by location |

**Response**:
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalCheckIns": 2340,
      "uniqueMembers": 285,
      "averageCheckInsPerDay": 78.0,
      "totalPeriods": 30
    },
    "checkInsByPeriod": [
      {
        "period": "2025-12-01T00:00:00.000Z",
        "totalCheckIns": 82,
        "uniqueMembers": 68
      },
      {
        "period": "2025-12-02T00:00:00.000Z",
        "totalCheckIns": 75,
        "uniqueMembers": 63
      }
    ],
    "checkInsByServiceType": [
      {
        "serviceType": "membership",
        "count": 1850,
        "uniqueMembers": 245
      },
      {
        "serviceType": "personal_training",
        "count": 320,
        "uniqueMembers": 85
      },
      {
        "serviceType": "class",
        "count": 170,
        "uniqueMembers": 45
      }
    ],
    "peakHours": [
      {
        "hour": 18,
        "count": 345
      },
      {
        "hour": 7,
        "count": 312
      },
      {
        "hour": 19,
        "count": 298
      },
      {
        "hour": 17,
        "count": 285
      },
      {
        "hour": 8,
        "count": 267
      }
    ]
  },
  "filters": {
    "startDate": "2025-12-01",
    "endDate": "2025-12-31",
    "groupBy": "daily",
    "locationId": null
  }
}
```

**Use Cases**:
- Track gym attendance trends
- Identify peak hours for staffing
- Monitor member engagement
- Service type popularity analysis

---

### 6. Get Service Status Report

Service plan status tracking with expiring services and low session alerts.

**Endpoint**: `GET /gym/reports/service-status`

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| status | String | No | Filter by status: `active`, `expired`, `suspended`, `depleted` |
| serviceType | String | No | Filter by service type: `membership`, `personal_training`, `class` |

**Response**:
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalServices": 320,
      "activeServices": 285,
      "expiredServices": 20,
      "suspendedServices": 10,
      "depletedServices": 5
    },
    "servicesByStatus": [
      {
        "status": "active",
        "count": 285,
        "totalSessions": 3420,
        "remainingSessions": 2156
      },
      {
        "status": "expired",
        "count": 20,
        "totalSessions": 240,
        "remainingSessions": 0
      }
    ],
    "servicesByType": [
      {
        "serviceType": "membership",
        "count": 250,
        "avgSessions": "0.00"
      },
      {
        "serviceType": "personal_training",
        "count": 50,
        "avgSessions": "12.00"
      },
      {
        "serviceType": "class",
        "count": 20,
        "avgSessions": "8.00"
      }
    ],
    "expiringSoon": [
      {
        "id": "uuid",
        "member": {
          "id": "uuid",
          "name": "John Doe",
          "email": "john@example.com",
          "phone": "08123456789"
        },
        "servicePlan": {
          "id": "uuid",
          "name": "Gold Membership",
          "serviceType": "membership"
        },
        "startDate": "2025-06-22",
        "endDate": "2025-12-22",
        "remainingSessions": null,
        "totalSessions": null,
        "status": "active"
      }
    ],
    "lowSessions": [
      {
        "id": "uuid",
        "member": {
          "id": "uuid",
          "name": "Jane Smith",
          "email": "jane@example.com",
          "phone": "08198765432"
        },
        "servicePlan": {
          "id": "uuid",
          "name": "Personal Training Package",
          "serviceType": "personal_training"
        },
        "remainingSessions": 2,
        "totalSessions": 12,
        "usagePercentage": "83.33"
      }
    ]
  },
  "filters": {
    "status": null,
    "serviceType": null
  }
}
```

**Business Logic**:
- **Expiring Soon**: Services expiring in next 7 days (max 20 results)
- **Low Sessions**: Services with < 20% sessions remaining (max 20 results)

**Use Cases**:
- Proactive member retention (contact expiring members)
- Session renewal alerts
- Service utilization tracking
- Renewal opportunity identification

---

## Authorization & Permissions

### Required Permissions (CASL)

| Endpoint | Resource | Action |
|----------|----------|--------|
| Dashboard Overview | Transaction | read |
| Dashboard Stats | Member | read |
| Revenue Report | Transaction | read |
| P&L Report | Transaction | read |
| Attendance Report | CheckIn | read |
| Service Status | ActiveService | read |

### Feature Gate

All endpoints require `gym` module to be enabled in the tenant's subscription plan.

### Multi-tenancy

- **Tenant Users**: Automatically filtered by `tenantId`
- **Super Admin**: Can access all tenants by omitting tenant filter

---

## Error Responses

### Common Error Codes

```json
{
  "success": false,
  "code": "UNAUTHORIZED",
  "message": "Authentication required"
}
```

```json
{
  "success": false,
  "code": "FORBIDDEN",
  "message": "Insufficient permissions"
}
```

```json
{
  "success": false,
  "code": "FEATURE_NOT_AVAILABLE",
  "message": "Gym module not available in your subscription plan"
}
```

---

## Implementation Notes

### Date Filtering
- All dates use ISO 8601 format (YYYY-MM-DD)
- Timezone: UTC
- Date ranges are inclusive (00:00:00 to 23:59:59.999)

### Grouping Options
- **daily**: Group by day (DATE_TRUNC 'day')
- **weekly**: Group by week (DATE_TRUNC 'week')
- **monthly**: Group by month (DATE_TRUNC 'month')
- **yearly**: Group by year (DATE_TRUNC 'year')

### Performance Considerations
- Large date ranges may impact performance
- Consider adding pagination for reports with many records
- Peak hours analysis limited to top 10 hours

### Logging
All report requests are logged with:
- Action type (e.g., GYM_REVENUE_REPORT)
- User ID and Tenant ID
- IP address and User Agent
- Request timestamp

---

## Example Use Cases

### 1. Monthly Revenue Dashboard
```
GET /gym/dashboard/overview
```
Use for: Main gym dashboard showing today's performance and trends

### 2. Quarterly Financial Report
```
GET /gym/reports/revenue?startDate=2025-10-01&endDate=2025-12-31&groupBy=monthly
GET /gym/reports/profit-loss?startDate=2025-10-01&endDate=2025-12-31&groupBy=monthly
```
Use for: Financial reporting and analysis

### 3. Member Retention Campaign
```
GET /gym/reports/service-status
```
Use for: Identify members with expiring services for renewal campaigns

### 4. Staffing Optimization
```
GET /gym/reports/attendance?startDate=2025-12-01&endDate=2025-12-31&groupBy=daily
```
Use for: Analyze peak hours to optimize staff scheduling

### 5. Service Performance Analysis
```
GET /gym/reports/revenue?serviceType=personal_training&groupBy=weekly
```
Use for: Track specific service type performance

---

## Future Enhancements

Potential additions to consider:
1. **Trainer Performance Report**: Revenue by trainer, commission tracking
2. **Member Retention Analysis**: Churn rate, lifetime value
3. **Product Performance**: Top-selling packages/services
4. **Comparative Analysis**: Year-over-year, location comparison
5. **Export Functionality**: PDF/Excel export for reports
6. **Scheduled Reports**: Email automated reports
7. **Real-time Metrics**: WebSocket for live dashboard updates

---

## Related Documentation

- [Transaction Architecture](./TRANSACTION-ARCHITECTURE.md)
- [CASL Authorization](../utils/casl.js)
- [Feature Registry](../utils/featureRegistry.js)
- [Active Service Model](../models/activeService.js)

---

**Last Updated**: December 22, 2025
**API Version**: v1
