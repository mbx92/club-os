# Finance Module v2 - Postman Collection

Complete Postman collection for testing the Finance Module API endpoints including **Income Management**, **Cash Flow Analysis**, and **Expenses**.

## 🎯 What's New in v2

- ✅ **Income Management** (5 endpoints)
  - Create/Read/Update/Delete manual income entries
  - Track transactional income (auto-generated)
  
- ✅ **Income Categories** (4 endpoints)
  - Organize income sources
  - Track income statistics per category

- ✅ **Cash Flow Management** (3 endpoints)
  - Real-time cash flow summary with running balance
  - Category breakdown (inflows/outflows)
  - 3-month projections based on historical data

- ✅ **Enhanced Expense Management**
- ✅ **Comprehensive Financial Reports**

**Total:** 21 endpoints with production-ready examples

---

## 📦 Collection Files

### Main Collection (RECOMMENDED)
**Finance-Module-v2-Complete.postman_collection.json**

Contains all endpoints organized by feature:
1. Income Management
2. Income Categories
3. Cash Flow Management
4. Expenses
5. Expense Categories
6. Financial Reports

### Environment
**Finance-Module.postman_environment.json**

Pre-configured variables for testing.

---

## 🚀 Quick Start Guide

### 1. Import Collection

1. Open Postman
2. Click **Import** button
3. Select `Finance-Module-v2-Complete.postman_collection.json`
4. Click **Import**

### 2. Import Environment

1. Click **Import** again
2. Select `Finance-Module.postman_environment.json`
3. Click **Import**
4. Select "Finance Module" environment from dropdown (top-right)

### 3. Configure Environment Variables

| Variable | Description | How to Get |
|----------|-------------|------------|
| `baseUrl` | API base URL | `http://localhost:3000/api/v1` |
| `token` | JWT auth token | Run login endpoint |
| `locationId` | Location UUID | GET /gym/locations |
| `incomeCategoryId` | Income category | Create via POST /finance/income-categories |
| `incomeId` | Income entry | Create via POST /finance/incomes |
| `expenseCategoryId` | Expense category | Create via POST /finance/expense-categories |
| `expenseId` | Expense entry | Create via POST /finance/expenses |

### 4. Get Authentication Token

**Option A: Use existing login endpoint**
```bash
POST /auth/login
{
  "email": "your-email@example.com",
  "password": "your-password"
}
```

**Option B: Use Postman Pre-request Script**
Add to collection-level pre-request:
```javascript
pm.sendRequest({
    url: pm.environment.get('baseUrl').replace('/api/v1', '') + '/api/v1/auth/login',
    method: 'POST',
    header: {'Content-Type': 'application/json'},
    body: {
        mode: 'raw',
        raw: JSON.stringify({
            email: 'admin@gym.com',
            password: 'password123'
        })
    }
}, (err, res) => {
    if (!err) {
        pm.environment.set('token', res.json().data.token);
    }
});
```

---

## 📋 Testing Workflows

### Workflow 1: Income Management

#### Step 1: Create Income Category
```
POST /finance/income-categories

{
  "name": "Corporate Donations",
  "description": "Donations from corporate sponsors",
  "type": "donation",
  "color": "#4CAF50",
  "icon": "gift"
}

→ Save response.data.id as {{incomeCategoryId}}
```

#### Step 2: Create Manual Income
```
POST /finance/incomes

{
  "categoryId": "{{incomeCategoryId}}",
  "locationId": "{{locationId}}",
  "title": "Corporate Sponsorship Q1 2025",
  "description": "Quarterly sponsorship from PT ABC",
  "amount": 50000000,
  "taxAmount": 0,
  "incomeDate": "2025-01-15",
  "receivedDate": "2025-01-15",
  "paymentMethod": "transfer",
  "referenceNumber": "SPON-2025-001",
  "source": "PT ABC Corporation",
  "status": "received",
  "isRecurring": true,
  "recurringFrequency": "quarterly",
  "recurringEndDate": "2025-12-31"
}

→ Save response.data.id as {{incomeId}}
```

#### Step 3: List All Incomes
```
GET /finance/incomes?page=1&limit=20&type=manual&status=received
```

#### Step 4: Update Income
```
PUT /finance/incomes/{{incomeId}}

{
  "amount": 55000000,
  "notes": "Amount increased per contract amendment"
}
```

#### Step 5: Delete Income (if needed)
```
DELETE /finance/incomes/{{incomeId}}
```

---

### Workflow 2: Cash Flow Analysis

#### Step 1: Monthly Summary
```
GET /finance/cash-flow/summary
  ?startDate=2025-01-01
  &endDate=2025-12-31
  &groupBy=month

✅ Returns:
- Total inflow/outflow
- Net cash flow
- Running balance per period
- Trend analysis
```

#### Step 2: Category Breakdown
```
GET /finance/cash-flow/by-category
  ?startDate=2025-01-01
  &endDate=2025-01-31
  &type=outflow

✅ Returns:
- Expenses by category
- Percentage distribution
- Top spending categories
```

#### Step 3: 3-Month Projection
```
GET /finance/cash-flow/projection
  ?months=3

✅ Returns:
- Projected inflows/outflows
- Expected balance
- Confidence levels
- Recommendations
```

---

### Workflow 3: Expense Management

#### Step 1: Create Expense Category
```
POST /finance/expense-categories

{
  "name": "Office Rent",
  "description": "Monthly office rent payments",
  "type": "fixed",
  "color": "#FF5733",
  "icon": "building"
}

→ Save as {{expenseCategoryId}}
```

#### Step 2: Create Expense
```
POST /finance/expenses

{
  "categoryId": "{{expenseCategoryId}}",
  "locationId": "{{locationId}}",
  "title": "Monthly Office Rent",
  "description": "Rent payment for January 2025",
  "amount": 10000000,
  "taxAmount": 0,
  "expenseDate": "2025-01-01",
  "dueDate": "2025-01-05",
  "paymentMethod": "transfer",
  "vendor": "Building Management",
  "status": "approved",
  "isRecurring": true,
  "recurringFrequency": "monthly",
  "recurringEndDate": "2025-12-31"
}

→ Save as {{expenseId}}
```

#### Step 3: Approve Expense
```
POST /finance/expenses/{{expenseId}}/approve
```

#### Step 4: Mark as Paid
```
POST /finance/expenses/{{expenseId}}/pay

{
  "paymentMethod": "transfer",
  "paidDate": "2025-01-17"
}
```

---

### Workflow 4: Financial Reports

#### Profit & Loss Report
```
GET /finance/reports/profit-loss
  ?startDate=2025-01-01
  &endDate=2025-12-31
  &groupBy=month

✅ Shows:
- Total revenue (from Transactions + Manual Income)
- Total expenses
- Net profit/loss
- Profit margin %
```

#### Revenue Report
```
GET /finance/reports/revenue
  ?startDate=2025-01-01
  &endDate=2025-01-31
  &groupBy=day

✅ Shows:
- Daily/weekly/monthly revenue
- Revenue by source
- Growth trends
```

#### Expense Report
```
GET /finance/reports/expenses
  ?startDate=2025-01-01
  &endDate=2025-01-31
  &groupBy=week
  &categoryId={{expenseCategoryId}}

✅ Shows:
- Expenses by category
- Spending trends
- Budget vs actual
```

---

## 🔍 Query Parameters Reference

### Income Endpoints

**GET /finance/incomes**

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `page` | Number | No | Page number | `1` |
| `limit` | Number | No | Items per page (max: 100) | `20` |
| `type` | String | No | `manual` or `transactional` | `manual` |
| `status` | String | No | `pending`, `received`, `cancelled` | `received` |
| `categoryId` | UUID | No | Filter by category | `uuid` |
| `locationId` | UUID | No | Filter by location | `uuid` |
| `startDate` | Date | No | From date (YYYY-MM-DD) | `2025-01-01` |
| `endDate` | Date | No | To date (YYYY-MM-DD) | `2025-12-31` |
| `search` | String | No | Search in title/description | `sponsorship` |
| `sortBy` | String | No | Sort field | `incomeDate` |
| `sortOrder` | String | No | `ASC` or `DESC` | `DESC` |

### Cash Flow Endpoints

**GET /finance/cash-flow/summary**

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `startDate` | Date | ✅ **Yes** | Start date | `2025-01-01` |
| `endDate` | Date | ✅ **Yes** | End date | `2025-12-31` |
| `locationId` | UUID | No | Filter by location | `uuid` |
| `groupBy` | String | No | `day`, `week`, `month`, `year` | `month` |

**GET /finance/cash-flow/by-category**

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `startDate` | Date | ✅ **Yes** | Start date | `2025-01-01` |
| `endDate` | Date | ✅ **Yes** | End date | `2025-01-31` |
| `locationId` | UUID | No | Filter by location | `uuid` |
| `type` | String | No | `inflow` or `outflow` | `outflow` |

**GET /finance/cash-flow/projection**

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `months` | Number | No | Months to project (default: 3, max: 12) | `3` |
| `locationId` | UUID | No | Filter by location | `uuid` |

---

## 💡 Data Model Reference

### Income Types
- **transactional** - Auto-generated from Transaction system (READ-ONLY)
  - Membership payments
  - POS sales
  - Restaurant orders
  - Psychology session fees
- **manual** - User-created entries (EDITABLE)
  - Corporate donations
  - Investments
  - Grants
  - Other non-operational income

### Income Status
- **pending** - Expected but not yet received
- **received** - Payment received and confirmed
- **cancelled** - Income entry cancelled

### Cash Flow Data Sources

**Inflows:**
1. Completed Transactions (automatic)
2. Received Manual Income (when status = 'received')

**Outflows:**
1. Paid Expenses (when status = 'paid')

### Expense Status Workflow
```
draft → pending → approved → paid
              ↓
          cancelled
```

---

## ⚠️ Common Issues & Solutions

### 1. "Unauthorized" Error
**Error:** `401 Unauthorized`  
**Cause:** Missing or expired JWT token  
**Solution:**
- Run login endpoint
- Copy token from response
- Update `{{token}}` environment variable
- Verify token hasn't expired (check `expiresIn` from login response)

### 2. "Category not found"
**Error:** `404 Not Found - Category not found`  
**Cause:** Category doesn't exist or belongs to different tenant  
**Solution:**
- Create category first using POST /income-categories or /expense-categories
- Verify `categoryId` from GET categories endpoint
- Ensure you're using correct tenant

### 3. "Cannot update transactional income"
**Error:** `400 Bad Request - Cannot update transactional income`  
**Cause:** Attempting to modify auto-generated income  
**Solution:**
- Only `type: manual` incomes can be updated/deleted
- Transactional incomes are READ-ONLY
- To modify transactional income, edit the source Transaction

### 4. "Start date is required"
**Error:** `400 Bad Request - startDate is required`  
**Cause:** Missing required parameters for cash flow endpoints  
**Solution:**
- Always include `startDate` and `endDate` for cash flow queries
- Use YYYY-MM-DD format
- Ensure endDate >= startDate

### 5. "Version mismatch"
**Error:** `409 Conflict - Version mismatch`  
**Cause:** Concurrent update detected (optimistic locking)  
**Solution:**
- Fetch latest data using GET endpoint
- Use updated `version` field in PUT request
- Retry update operation

### 6. "Location not found"
**Error:** `404 Not Found - Location not found`  
**Cause:** Invalid locationId  
**Solution:**
- GET /gym/locations to fetch valid location IDs
- locationId is optional for most endpoints
- Omit locationId if not using multi-location tracking

---

## ✅ Testing Checklist

### Income Management
- [ ] Create income category (donation, investment, other)
- [ ] Create manual income entry with all fields
- [ ] Create recurring income
- [ ] List incomes with pagination
- [ ] Filter by type (manual vs transactional)
- [ ] Filter by status (pending, received, cancelled)
- [ ] Filter by date range
- [ ] Search by title/description
- [ ] View income details with associations
- [ ] Update manual income (change amount, status, etc.)
- [ ] Attempt to update transactional income (should fail)
- [ ] Delete manual income
- [ ] Verify soft delete (check deletedAt field)

### Income Categories
- [ ] Create category with all fields
- [ ] List categories with stats (totalIncomes, totalAmount)
- [ ] Filter active categories only
- [ ] Update category (name, description, color)
- [ ] Attempt to delete category with incomes (should fail)
- [ ] Delete unused category

### Cash Flow Analysis
- [ ] Get monthly summary for full year
- [ ] Get weekly summary for quarter
- [ ] Get daily summary for month
- [ ] Test with different groupBy options (day, week, month, year)
- [ ] Verify running balance calculation
- [ ] Get inflow category breakdown
- [ ] Get outflow category breakdown
- [ ] Get combined category breakdown
- [ ] Test with location filter
- [ ] Get 3-month projection
- [ ] Get 6-month projection
- [ ] Get 12-month projection
- [ ] Verify projection confidence levels
- [ ] Check projection recommendations

### Expense Management
- [ ] Create expense category
- [ ] Create expense (draft status)
- [ ] Create recurring expense
- [ ] Approve expense
- [ ] Mark expense as paid
- [ ] List expenses with filters
- [ ] Update expense
- [ ] Delete expense

### Financial Reports
- [ ] Generate P&L for year (grouped by month)
- [ ] Generate P&L for quarter (grouped by week)
- [ ] Generate revenue report by day
- [ ] Generate expense report by category
- [ ] Verify calculations (totals, percentages, growth)
- [ ] Test with location filter
- [ ] Test with date range variations

### Edge Cases
- [ ] Create income with future incomeDate
- [ ] Create income with past receivedDate
- [ ] Test invalid date ranges (endDate < startDate)
- [ ] Test pagination limits (over max limit)
- [ ] Test with non-existent IDs (404 errors)
- [ ] Test concurrent updates (version conflicts)
- [ ] Test with missing required fields
- [ ] Test with invalid enum values

---

## 🧪 Advanced Testing Scenarios

### Multi-Location Testing
```bash
# Create incomes for different locations
POST /incomes (locationId: location1)
POST /incomes (locationId: location2)
POST /incomes (locationId: null)  # Global income

# Query cash flow for specific location
GET /cash-flow/summary?locationId=location1

# Compare location-specific vs aggregated
GET /cash-flow/summary (all locations)
GET /cash-flow/summary?locationId=location1
```

### Recurring Income/Expense Testing
```bash
# Create yearly recurring income
POST /incomes
{
  "isRecurring": true,
  "recurringFrequency": "yearly",
  "recurringEndDate": "2030-01-15"
}

# Verify future entries created
GET /incomes?startDate=2026-01-01

# Test frequency options
- daily (for testing)
- weekly (subscriptions)
- monthly (rent, salaries)
- quarterly (sponsorships)
- yearly (annual fees)
```

### Cash Flow Projection Accuracy
```bash
# 1. Create 6 months of historical data
POST /incomes (Jan-Jun with varying amounts)
POST /expenses (Jan-Jun with varying amounts)

# 2. Request projection
GET /cash-flow/projection?months=3

# 3. Verify calculations
- Check if average matches historical data
- Verify running balance increments correctly
- Compare confidence levels (high → medium → low)

# 4. Test with growth pattern
POST more incomes (increasing trend)
GET /cash-flow/projection
→ Should reflect growth in projections
```

### Date Range Variations
```bash
# Same day
GET /cash-flow/summary?startDate=2025-01-15&endDate=2025-01-15

# One week
GET /cash-flow/summary?startDate=2025-01-01&endDate=2025-01-07&groupBy=day

# One month
GET /cash-flow/summary?startDate=2025-01-01&endDate=2025-01-31&groupBy=week

# One quarter
GET /cash-flow/summary?startDate=2025-01-01&endDate=2025-03-31&groupBy=month

# One year
GET /cash-flow/summary?startDate=2025-01-01&endDate=2025-12-31&groupBy=month

# Invalid (should fail)
GET /cash-flow/summary?startDate=2025-12-31&endDate=2025-01-01
```

---

## 📚 API Documentation

For comprehensive API documentation, see:

- **[FINANCE-MODULE.md](../FINANCE-MODULE.md)** - Complete module documentation
  - Data models
  - All endpoints
  - Request/response examples
  - Business rules
  - Error codes

- **[FEATURE-GATING-GUIDE.md](../frontend-integration/FEATURE-GATING-GUIDE.md)** - Subscription features
  - Feature availability by plan
  - Feature checking implementation
  - Trial mode behavior

- **[API-TESTING-EXAMPLES.md](../frontend-integration/API-TESTING-EXAMPLES.md)** - Additional examples
  - Authentication flows
  - Error handling
  - Best practices

---

## 🆘 Support

### Troubleshooting Steps

1. **Check Authentication**
   - Verify `{{token}}` is set in environment
   - Check token hasn't expired
   - Re-run login if needed

2. **Verify Environment Variables**
   - Ensure all required variables are set
   - Check UUIDs are valid
   - Confirm `baseUrl` is correct

3. **Review Request Body**
   - Check required fields are present
   - Verify data types match API spec
   - Ensure date format is YYYY-MM-DD

4. **Check Backend Logs**
   - Run `npm run dev` to see console output
   - Check `logs/` directory for detailed errors
   - Look for validation errors or database issues

5. **Review API Documentation**
   - Read endpoint description in FINANCE-MODULE.md
   - Check required vs optional parameters
   - Verify business rules and constraints

### Getting Help

If issues persist:
1. Check [FINANCE-MODULE.md](../FINANCE-MODULE.md) for detailed documentation
2. Review audit logs: `SELECT * FROM audit_logs WHERE action LIKE '%INCOME%' OR action LIKE '%CASHFLOW%'`
3. Check database state: `SELECT * FROM Incomes WHERE tenantId = 'your-tenant-id'`
4. Contact development team with:
   - Request details (method, URL, body)
   - Error message
   - Expected vs actual behavior
   - Environment (dev/staging/production)

---

## 📝 Version History

### v2.0.0 (January 2025) 🎉
- ✅ Added Income Management (5 endpoints)
- ✅ Added Income Categories (4 endpoints)
- ✅ Added Cash Flow Management (3 endpoints)
- ✅ Enhanced documentation
- ✅ Added advanced testing scenarios
- ✅ Improved error handling examples


# Finance Module Documentation

## Overview

The Finance Module provides comprehensive financial management capabilities for the gym management system, including **expense tracking**, **income management**, and **cash flow analysis**. This module integrates with the unified transaction system to provide complete financial visibility across all business operations.

## Table of Contents

1. [Architecture](#architecture)
2. [Data Models](#data-models)
   - [Expense Model](#expense-model)
   - [ExpenseCategory Model](#expensecategory-model)
   - [Income Model](#income-model)
   - [IncomeCategory Model](#incomecategory-model)
   - [CashFlow Model](#cashflow-model)
3. [Expense Management](#3-expense-management)
   - [API Endpoints](#31-api-endpoints)
   - [Expense Categories](#32-expense-categories)
4. [Expense Workflows](#4-expense-workflows)
5. [Income Management](#5-income-management)
   - [Data Models](#51-data-models)
   - [API Endpoints](#52-api-endpoints)
   - [Income Categories](#53-income-categories)
6. [Cash Flow Management](#6-cash-flow-management)
   - [Data Model](#61-data-model)
   - [API Endpoints](#62-api-endpoints)
   - [Best Practices](#63-cash-flow-best-practices)
7. [Financial Reports](#7-financial-reports)
8. [Integration Guide](#integration-guide)
9. [Security & Permissions](#security--permissions)
10. [Testing](#testing)
11. [Performance Considerations](#performance-considerations)
12. [Migration Guide](#migration-guide)

## Architecture

### Module Structure

```
src/
├── controllers/finance/
│   ├── index.js                     # Export aggregator
│   ├── expenseController.js         # Expense CRUD & workflows
│   ├── expenseCategoryController.js # Expense category management
│   ├── incomeController.js          # Income CRUD operations
│   ├── incomeCategoryController.js  # Income category management
│   ├── cashFlowController.js        # Cash flow analysis & projections
│   └── reportController.js          # Financial reports (P&L, Revenue, Expenses)
├── routes/finance/
│   ├── index.js                     # Export aggregator
│   ├── expense.routes.js            # Expense endpoints
│   ├── expenseCategory.routes.js   # Expense category endpoints
│   ├── income.routes.js             # Income endpoints
│   ├── incomeCategory.routes.js    # Income category endpoints
│   ├── cashFlow.routes.js          # Cash flow endpoints
│   └── report.routes.js            # Report endpoints
└── models/
    ├── expense.js                   # Expense model with optimistic locking
    ├── expensecategory.js           # Expense category model
    ├── income.js                    # Income model (transactional + manual)
    ├── incomecategory.js            # Income category model
    └── cashflow.js                  # Cash flow tracking model
```

### Key Features

- ✅ **Multi-tenant data isolation** - All operations scoped to tenant
- ✅ **Expense tracking** - Full CRUD with status workflow
- ✅ **Income management** - Transactional (auto) + Manual income entries
- ✅ **Cash flow analysis** - Real-time tracking and projections
- ✅ **Category management** - Organized expense/income categorization
- ✅ **Approval workflow** - Draft → Pending → Approved → Paid
- ✅ **Recurring transactions** - Support for scheduled recurring costs/income
- ✅ **Financial reports** - P&L, Revenue, Expense, Cash Flow analytics
- ✅ **Optimistic locking** - Version-based concurrency control
- ✅ **Audit logging** - Complete audit trail for all operations

## Data Models

### Expense Model

**Table:** `Expenses`

#### Key Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `tenantId` | UUID | Tenant identifier (FK) |
| `locationId` | UUID | Location (optional, FK) |
| `categoryId` | UUID | Expense category (FK) |
| `expenseNumber` | STRING | Auto-generated unique number (e.g., EXP-2025-001234) |
| `title` | STRING | Expense title/description |
| `description` | TEXT | Detailed description |
| `amount` | DECIMAL(15,2) | Base expense amount |
| `taxAmount` | DECIMAL(15,2) | Tax amount |
| `totalAmount` | DECIMAL(15,2) | Total (amount + tax, auto-calculated) |
| `expenseDate` | DATE | Date of expense occurrence |
| `dueDate` | DATE | Payment due date |
| `paidDate` | DATE | Actual payment date |
| `paymentMethod` | ENUM | `cash`, `transfer`, `credit_card`, `debit_card`, `check`, `other` |
| `referenceNumber` | STRING | Vendor invoice/reference number |
| `vendor` | STRING | Vendor/supplier name |
| `status` | ENUM | `draft`, `pending`, `approved`, `paid`, `cancelled` |
| `isRecurring` | BOOLEAN | Whether expense is recurring |
| `recurringFrequency` | ENUM | `daily`, `weekly`, `monthly`, `quarterly`, `yearly` |
| `recurringEndDate` | DATE | End date for recurring expense |
| `attachments` | JSONB | Array of file paths |
| `notes` | TEXT | Additional notes |
| `tags` | ARRAY(STRING) | Tags for categorization |
| `createdBy` | UUID | User who created the expense (FK) |
| `approvedBy` | UUID | User who approved the expense (FK) |
| `approvedAt` | DATE | Approval timestamp |
| `version` | INTEGER | Version number for optimistic locking |

#### Associations

```javascript
Expense.belongsTo(Tenant)
Expense.belongsTo(ExpenseCategory, { as: 'category' })
Expense.belongsTo(Location, { as: 'location' })
Expense.belongsTo(User, { as: 'creator', foreignKey: 'createdBy' })
Expense.belongsTo(User, { as: 'approver', foreignKey: 'approvedBy' })
```

#### Hooks

- **beforeValidate**: Auto-calculates `totalAmount` = `amount` + `taxAmount`
- **beforeUpdate**: Increments `version` for optimistic locking

#### Indexes

- `tenantId` - For tenant isolation
- `tenantId, expenseNumber` - Unique constraint
- `categoryId` - For category filtering
- `locationId` - For location filtering
- `status` - For status queries
- `expenseDate` - For date range queries
- `tenantId, expenseDate` - Composite for reporting
- `tenantId, status, expenseDate` - Composite for filtered reporting

---

### ExpenseCategory Model

**Table:** `ExpenseCategories`

#### Key Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `tenantId` | UUID | Tenant identifier (FK) |
| `name` | STRING | Category name (e.g., Salary, Utilities, Supplies) |
| `description` | TEXT | Category description |
| `type` | ENUM | `operational`, `fixed`, `variable`, `one_time` |
| `isActive` | BOOLEAN | Whether category is active |
| `color` | STRING(7) | Color code for UI (e.g., #FF5733) |
| `icon` | STRING | Icon identifier for UI |

#### Associations

```javascript
ExpenseCategory.belongsTo(Tenant)
ExpenseCategory.hasMany(Expense, { as: 'expenses' })
```

#### Indexes

- `tenantId` - For tenant isolation
- `tenantId, name` - Unique constraint (no duplicate names per tenant)
- `isActive` - For active category filtering

## API Endpoints

### Base URL
```
/api/v1/finance
```

All endpoints require authentication and CASL authorization.

---

## Expense Management Endpoints

### 1. Create Expense

**POST** `/finance/expenses`

Creates a new expense record.

#### Request Body

```json
{
  "categoryId": "uuid",
  "locationId": "uuid",          // Optional
  "title": "Office Supplies",
  "description": "Monthly stationery purchase",
  "amount": 150000,
  "taxAmount": 15000,            // Optional, defaults to 0
  "expenseDate": "2025-01-15",
  "dueDate": "2025-01-30",       // Optional
  "paymentMethod": "transfer",   // Optional
  "referenceNumber": "INV-2025-001",  // Optional
  "vendor": "PT Stationery Indonesia",
  "status": "draft",             // Optional: draft, pending
  "isRecurring": false,          // Optional
  "recurringFrequency": null,    // Required if isRecurring=true
  "recurringEndDate": null,      // Optional
  "notes": "Ordered from main supplier",
  "tags": ["office", "supplies"],
  "attachments": []              // Array of file paths
}
```

#### Response (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "tenantId": "uuid",
    "locationId": "uuid",
    "categoryId": "uuid",
    "expenseNumber": "EXP-2025-001234",
    "title": "Office Supplies",
    "description": "Monthly stationery purchase",
    "amount": "150000.00",
    "taxAmount": "15000.00",
    "totalAmount": "165000.00",
    "expenseDate": "2025-01-15T00:00:00.000Z",
    "dueDate": "2025-01-30T00:00:00.000Z",
    "paidDate": null,
    "paymentMethod": "transfer",
    "referenceNumber": "INV-2025-001",
    "vendor": "PT Stationery Indonesia",
    "status": "draft",
    "isRecurring": false,
    "recurringFrequency": null,
    "recurringEndDate": null,
    "attachments": [],
    "notes": "Ordered from main supplier",
    "tags": ["office", "supplies"],
    "createdBy": "uuid",
    "approvedBy": null,
    "approvedAt": null,
    "version": 0,
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z",
    "category": {
      "id": "uuid",
      "name": "Office Supplies",
      "type": "operational",
      "color": "#3498db"
    },
    "location": {
      "id": "uuid",
      "name": "Main Branch"
    },
    "creator": {
      "id": "uuid",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com"
    }
  }
}
```

#### Permissions
- **CASL:** `create` on `Expense`
- **Feature Gate:** None (core feature)

---

### 2. Get All Expenses

**GET** `/finance/expenses`

Retrieves paginated list of expenses with filtering.

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | Integer | Page number (default: 1) |
| `limit` | Integer | Items per page (default: 20) |
| `status` | String | Filter by status |
| `categoryId` | UUID | Filter by category |
| `locationId` | UUID | Filter by location |
| `startDate` | Date | Filter by expense date >= |
| `endDate` | Date | Filter by expense date <= |
| `search` | String | Search in title, description, vendor, expenseNumber |
| `sortBy` | String | Sort field (default: expenseDate) |
| `sortOrder` | String | ASC or DESC (default: DESC) |

#### Example Request

```
GET /finance/expenses?page=1&limit=20&status=pending&startDate=2025-01-01&endDate=2025-01-31&search=supplies
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "expenses": [
      {
        "id": "uuid",
        "expenseNumber": "EXP-2025-001234",
        "title": "Office Supplies",
        "amount": "150000.00",
        "totalAmount": "165000.00",
        "expenseDate": "2025-01-15T00:00:00.000Z",
        "status": "pending",
        "category": {
          "id": "uuid",
          "name": "Office Supplies",
          "type": "operational"
        },
        "creator": {
          "id": "uuid",
          "firstName": "John",
          "lastName": "Doe"
        }
      }
      // ... more expenses
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

#### Permissions
- **CASL:** `read` on `Expense`

---

### 3. Get Expense by ID

**GET** `/finance/expenses/:id`

Retrieves detailed information for a specific expense.

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "tenantId": "uuid",
    "expenseNumber": "EXP-2025-001234",
    "title": "Office Supplies",
    "description": "Monthly stationery purchase",
    "amount": "150000.00",
    "taxAmount": "15000.00",
    "totalAmount": "165000.00",
    "expenseDate": "2025-01-15T00:00:00.000Z",
    "dueDate": "2025-01-30T00:00:00.000Z",
    "status": "approved",
    "vendor": "PT Stationery Indonesia",
    "category": { /* ... */ },
    "location": { /* ... */ },
    "creator": { /* ... */ },
    "approver": {
      "id": "uuid",
      "firstName": "Manager",
      "lastName": "Name",
      "email": "manager@example.com"
    },
    "approvedAt": "2025-01-16T09:00:00.000Z"
  }
}
```

#### Permissions
- **CASL:** `read` on `Expense`

---

### 4. Update Expense

**PUT** `/finance/expenses/:id`

Updates an existing expense.

#### Request Body

```json
{
  "title": "Office Supplies - Updated",
  "amount": 175000,
  "taxAmount": 17500,
  "notes": "Increased quantity"
}
```

#### Business Rules

- Cannot modify `amount` or `taxAmount` if status is `paid`
- `totalAmount` is auto-calculated when `amount` or `taxAmount` changes
- Version field is auto-incremented (optimistic locking)

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Office Supplies - Updated",
    "amount": "175000.00",
    "taxAmount": "17500.00",
    "totalAmount": "192500.00",
    "version": 1,
    // ... full expense object
  }
}
```

#### Error Responses

**400 Bad Request** - Modifying paid expense:
```json
{
  "success": false,
  "code": "EXPENSE_ALREADY_PAID",
  "message": "Cannot modify amount of paid expense"
}
```

#### Permissions
- **CASL:** `update` on `Expense`

---

### 5. Delete Expense

**DELETE** `/finance/expenses/:id`

Soft deletes an expense (sets `deletedAt` timestamp).

#### Business Rules

- Cannot delete expenses with status `paid`
- Soft delete preserves audit trail

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Expense deleted successfully"
}
```

#### Error Responses

**400 Bad Request** - Deleting paid expense:
```json
{
  "success": false,
  "code": "EXPENSE_ALREADY_PAID",
  "message": "Cannot delete paid expense"
}
```

#### Permissions
- **CASL:** `delete` on `Expense`

---

### 6. Approve Expense

**POST** `/finance/expenses/:id/approve`

Approves a pending expense.

#### Business Rules

- Only `pending` expenses can be approved
- Sets `approvedBy` to current user
- Sets `approvedAt` to current timestamp
- Changes status from `pending` → `approved`

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "expenseNumber": "EXP-2025-001234",
    "status": "approved",
    "approvedBy": "uuid",
    "approvedAt": "2025-01-16T09:00:00.000Z",
    "approver": {
      "id": "uuid",
      "firstName": "Manager",
      "lastName": "Name"
    }
  }
}
```

#### Error Responses

**400 Bad Request** - Invalid status:
```json
{
  "success": false,
  "code": "INVALID_STATUS",
  "message": "Only pending expenses can be approved"
}
```

#### Permissions
- **CASL:** `update` on `Expense`

---

### 7. Mark Expense as Paid

**POST** `/finance/expenses/:id/pay`

Marks an expense as paid.

#### Request Body

```json
{
  "paymentMethod": "transfer",
  "paidDate": "2025-01-17"  // Optional, defaults to current date
}
```

#### Business Rules

- Cannot mark already paid expenses
- Sets status to `paid`
- Records payment method and date

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "expenseNumber": "EXP-2025-001234",
    "status": "paid",
    "paymentMethod": "transfer",
    "paidDate": "2025-01-17T00:00:00.000Z"
  }
}
```

#### Permissions
- **CASL:** `update` on `Expense`

---

## Expense Category Endpoints

### 1. Create Category

**POST** `/finance/expense-categories`

Creates a new expense category.

#### Request Body

```json
{
  "name": "Marketing",
  "description": "Marketing and advertising expenses",
  "type": "variable",
  "color": "#e74c3c",
  "icon": "bullhorn"
}
```

#### Response (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "tenantId": "uuid",
    "name": "Marketing",
    "description": "Marketing and advertising expenses",
    "type": "variable",
    "isActive": true,
    "color": "#e74c3c",
    "icon": "bullhorn",
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:00:00.000Z"
  }
}
```

#### Error Responses

**400 Bad Request** - Duplicate name:
```json
{
  "success": false,
  "code": "CATEGORY_EXISTS",
  "message": "Category with this name already exists"
}
```

#### Permissions
- **CASL:** `create` on `ExpenseCategory`

---

### 2. Get All Categories

**GET** `/finance/expense-categories`

Retrieves all expense categories for the tenant.

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `isActive` | Boolean | Filter by active status |
| `includeStats` | Boolean | Include expense statistics |

#### Example Request

```
GET /finance/expense-categories?includeStats=true
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Salaries",
      "type": "fixed",
      "color": "#3498db",
      "isActive": true,
      "stats": {
        "totalExpenses": "25000000.00",
        "expenseCount": 12,
        "avgExpenseAmount": "2083333.33"
      }
    },
    {
      "id": "uuid",
      "name": "Marketing",
      "type": "variable",
      "color": "#e74c3c",
      "isActive": true,
      "stats": {
        "totalExpenses": "5000000.00",
        "expenseCount": 8,
        "avgExpenseAmount": "625000.00"
      }
    }
  ]
}
```

#### Permissions
- **CASL:** `read` on `ExpenseCategory`

---

### 3. Update Category

**PUT** `/finance/expense-categories/:id`

Updates an existing expense category.

#### Request Body

```json
{
  "name": "Marketing & Advertising",
  "description": "Updated description",
  "isActive": true
}
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Marketing & Advertising",
    "description": "Updated description",
    "type": "variable",
    "isActive": true
  }
}
```

#### Permissions
- **CASL:** `update` on `ExpenseCategory`

---

### 4. Delete Category

**DELETE** `/finance/expense-categories/:id`

Soft deletes an expense category.

#### Business Rules

- Cannot delete category if it has associated expenses
- Soft delete preserves historical data

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Category deleted successfully"
}
```

#### Error Responses

**400 Bad Request** - Category has expenses:
```json
{
  "success": false,
  "code": "CATEGORY_IN_USE",
  "message": "Cannot delete category with existing expenses"
}
```

#### Permissions
- **CASL:** `delete` on `ExpenseCategory`

---

## Financial Reports Endpoints

### 1. Profit & Loss Report

**GET** `/finance/reports/profit-loss`

Generates comprehensive P&L report showing revenue vs expenses.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | Date | ✅ Yes | Report period start |
| `endDate` | Date | ✅ Yes | Report period end |
| `locationId` | UUID | No | Filter by location |
| `groupBy` | String | No | Grouping: `day`, `week`, `month`, `year` (default: month) |

#### Example Request

```
GET /finance/reports/profit-loss?startDate=2025-01-01&endDate=2025-12-31&groupBy=month
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalRevenue": 150000000.00,
      "totalExpenses": 85000000.00,
      "netProfit": 65000000.00,
      "profitMargin": 43.33,
      "period": {
        "startDate": "2025-01-01",
        "endDate": "2025-12-31",
        "groupBy": "month"
      }
    },
    "periodData": [
      {
        "period": "2025-01-01T00:00:00.000Z",
        "revenue": 12500000.00,
        "revenueByModule": {
          "membership": 8000000.00,
          "pos": 3000000.00,
          "restaurant": 1500000.00
        },
        "expenses": 7000000.00,
        "netProfit": 5500000.00,
        "profitMargin": 44.00
      },
      {
        "period": "2025-02-01T00:00:00.000Z",
        "revenue": 13000000.00,
        "revenueByModule": {
          "membership": 8500000.00,
          "pos": 3200000.00,
          "restaurant": 1300000.00
        },
        "expenses": 7200000.00,
        "netProfit": 5800000.00,
        "profitMargin": 44.62
      }
      // ... more periods
    ],
    "expensesByCategory": [
      {
        "categoryId": "uuid",
        "categoryName": "Salaries",
        "categoryType": "fixed",
        "color": "#3498db",
        "total": 45000000.00,
        "count": 120,
        "percentage": 52.94
      },
      {
        "categoryId": "uuid",
        "categoryName": "Utilities",
        "categoryType": "operational",
        "color": "#f39c12",
        "total": 18000000.00,
        "count": 144,
        "percentage": 21.18
      }
      // ... more categories
    ]
  }
}
```

#### Data Sources

- **Revenue**: From `Transactions` table (all modules: membership, POS, restaurant, psychology)
- **Expenses**: From `Expenses` table (status: `approved` or `paid`)

#### Permissions
- **CASL:** `read` on `FinancialReport` (or similar permission)

---

### 2. Revenue Report

**GET** `/finance/reports/revenue`

Detailed revenue breakdown by module, period, and payment method.

#### Query Parameters

Same as P&L report: `startDate`, `endDate`, `locationId`, `groupBy`

#### Example Request

```
GET /finance/reports/revenue?startDate=2025-01-01&endDate=2025-01-31&groupBy=day
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalRevenue": 12500000.00,
      "totalTransactions": 450,
      "avgTransactionValue": 27777.78,
      "period": {
        "startDate": "2025-01-01",
        "endDate": "2025-01-31",
        "groupBy": "day"
      }
    },
    "byPeriod": [
      {
        "period": "2025-01-01T00:00:00.000Z",
        "module": "membership",
        "subtotal": 350000.00,
        "tax": 35000.00,
        "discount": 0.00,
        "total": 385000.00,
        "transactionCount": 5
      },
      {
        "period": "2025-01-01T00:00:00.000Z",
        "module": "pos",
        "subtotal": 180000.00,
        "tax": 18000.00,
        "discount": 10000.00,
        "total": 188000.00,
        "transactionCount": 12
      }
      // ... more periods
    ],
    "byModule": [
      {
        "module": "membership",
        "total": 8000000.00,
        "transactionCount": 200,
        "percentage": 64.00
      },
      {
        "module": "pos",
        "total": 3000000.00,
        "transactionCount": 180,
        "percentage": 24.00
      },
      {
        "module": "restaurant",
        "total": 1500000.00,
        "transactionCount": 70,
        "percentage": 12.00
      }
    ],
    "paymentMethods": [
      {
        "method": "transfer",
        "total": 7500000.00,
        "transactionCount": 250,
        "percentage": 60.00
      },
      {
        "method": "cash",
        "total": 3000000.00,
        "transactionCount": 150,
        "percentage": 24.00
      },
      {
        "method": "credit_card",
        "total": 2000000.00,
        "transactionCount": 50,
        "percentage": 16.00
      }
    ]
  }
}
```

#### Permissions
- **CASL:** `read` on `FinancialReport`

---

### 3. Expense Report

**GET** `/finance/reports/expenses`

Detailed expense breakdown by category, period, and status.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | Date | ✅ Yes | Report period start |
| `endDate` | Date | ✅ Yes | Report period end |
| `locationId` | UUID | No | Filter by location |
| `categoryId` | UUID | No | Filter by category |
| `groupBy` | String | No | Grouping: `day`, `week`, `month`, `year` (default: month) |

#### Example Request

```
GET /finance/reports/expenses?startDate=2025-01-01&endDate=2025-01-31&groupBy=week
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalExpenses": 7000000.00,
      "totalCount": 85,
      "avgExpenseAmount": 82352.94,
      "period": {
        "startDate": "2025-01-01",
        "endDate": "2025-01-31",
        "groupBy": "week"
      }
    },
    "byPeriod": [
      {
        "period": "2025-01-01T00:00:00.000Z",
        "amount": 1600000.00,
        "tax": 160000.00,
        "total": 1760000.00,
        "count": 20
      },
      {
        "period": "2025-01-08T00:00:00.000Z",
        "amount": 1550000.00,
        "tax": 155000.00,
        "total": 1705000.00,
        "count": 18
      }
      // ... more periods
    ],
    "byCategory": [
      {
        "categoryId": "uuid",
        "categoryName": "Salaries",
        "categoryType": "fixed",
        "color": "#3498db",
        "total": 3500000.00,
        "count": 10,
        "percentage": 50.00
      },
      {
        "categoryId": "uuid",
        "categoryName": "Utilities",
        "categoryType": "operational",
        "color": "#f39c12",
        "total": 1500000.00,
        "count": 12,
        "percentage": 21.43
      },
      {
        "categoryId": "uuid",
        "categoryName": "Marketing",
        "categoryType": "variable",
        "color": "#e74c3c",
        "total": 1200000.00,
        "count": 8,
        "percentage": 17.14
      }
      // ... more categories
    ],
    "byStatus": [
      {
        "status": "paid",
        "total": 6000000.00,
        "count": 70
      },
      {
        "status": "approved",
        "total": 1000000.00,
        "count": 15
      }
    ]
  }
}
```

#### Permissions
- **CASL:** `read` on `FinancialReport`

---

## Workflows

### Expense Lifecycle

```
[Draft] ────→ [Pending] ────→ [Approved] ────→ [Paid]
   │              │                │
   └──────────────┴────────────────┴──────→ [Cancelled]
```

#### Status Transitions

1. **Draft** → **Pending**
   - User submits expense for approval
   - Manual status update via PUT endpoint

2. **Pending** → **Approved**
   - Manager/authorized user approves
   - POST `/expenses/:id/approve`
   - Sets `approvedBy` and `approvedAt`

3. **Approved** → **Paid**
   - Finance team marks as paid
   - POST `/expenses/:id/pay`
   - Sets `paidDate` and `paymentMethod`

4. **Any Status** → **Cancelled**
   - Manual status update via PUT endpoint
   - Cannot cancel `paid` expenses (must delete instead, if allowed)

### Recurring Expense Processing

When `isRecurring` is `true`:

1. **Manual Processing** (currently implemented):
   - Frontend/admin creates recurring expense template
   - Cron job or scheduled task duplicates expense at specified frequency
   - Each instance gets new `expenseNumber`

2. **Future Enhancement** (not yet implemented):
   - Automatic generation via background job
   - Links to parent recurring template
   - Stops at `recurringEndDate`

---

## Integration with Transaction System

The Finance module integrates with the unified transaction system for complete financial visibility:

### Revenue Sources (via Transactions)

All revenue is tracked through the `Transaction` model:

- **Membership payments** - `transactionType: 'membership'`
- **POS sales** - `transactionType: 'pos'`
- **Restaurant orders** - `transactionType: 'restaurant'`
- **Psychology assessments** - `transactionType: 'psychology'`

### P&L Calculation

```
Net Profit = Total Revenue - Total Expenses

Where:
  Total Revenue = SUM(Transaction.totalAmount) WHERE status='completed'
  Total Expenses = SUM(Expense.totalAmount) WHERE status IN ('approved', 'paid')
```

### Example Integration Query

```javascript
// Get all financial data for a period
const revenue = await Transaction.findAll({
  where: {
    tenantId,
    status: 'completed',
    createdAt: { [Op.between]: [startDate, endDate] }
  },
  attributes: [
    [fn('SUM', col('totalAmount')), 'totalRevenue']
  ]
});

const expenses = await Expense.findAll({
  where: {
    tenantId,
    status: { [Op.in]: ['approved', 'paid'] },
    expenseDate: { [Op.between]: [startDate, endDate] }
  },
  attributes: [
    [fn('SUM', col('totalAmount')), 'totalExpenses']
  ]
});

const netProfit = revenue.totalRevenue - expenses.totalExpenses;
```

---

## Security & Permissions

### Multi-Tenant Isolation

All queries automatically filter by `tenantId`:

```javascript
const where = {};
if (!isSuperAdmin) {
  where.tenantId = tenantId;
}
```

Super admins bypass tenant isolation for system-wide reporting.

### CASL Permissions

Required permissions:

| Action | Subject | Endpoints |
|--------|---------|-----------|
| `create` | `Expense` | POST /expenses |
| `read` | `Expense` | GET /expenses, GET /expenses/:id |
| `update` | `Expense` | PUT /expenses/:id, POST /expenses/:id/approve, POST /expenses/:id/pay |
| `delete` | `Expense` | DELETE /expenses/:id |
| `create` | `ExpenseCategory` | POST /expense-categories |
| `read` | `ExpenseCategory` | GET /expense-categories |
| `update` | `ExpenseCategory` | PUT /expense-categories/:id |
| `delete` | `ExpenseCategory` | DELETE /expense-categories/:id |
| `read` | `FinancialReport` | All /reports/* endpoints |

### Audit Logging

All critical operations are logged:

```javascript
logger.logInfo('Expense created', {
  action: 'CREATE_EXPENSE',
  userId,
  tenantId,
  expenseId,
  expenseNumber,
  amount,
  ip: getClientIp(req),
  userAgent: getUserAgent(req)
});
```

Audit actions:
- `CREATE_EXPENSE`
- `UPDATE_EXPENSE`
- `DELETE_EXPENSE`
- `APPROVE_EXPENSE`
- `PAY_EXPENSE`
- `CREATE_EXPENSE_CATEGORY`
- `PROFIT_LOSS_REPORT`
- `REVENUE_REPORT`
- `EXPENSE_REPORT`

---

## Concurrency Control

### Optimistic Locking

The `Expense` model uses optimistic locking via the `version` field:

```javascript
// Model hook
hooks: {
  beforeUpdate: (expense) => {
    expense.version += 1;
  }
}
```

#### Handling Version Conflicts

```javascript
const { withRetry } = require('../../utils/concurrency');

await withRetry(async () => {
  const expense = await Expense.findByPk(id);
  expense.amount = newAmount;
  await expense.save(); // Version automatically incremented
});
```

The `withRetry` utility automatically retries on version conflicts (up to 3 times).

### Sequence Generation

Expense numbers use `generateUniqueSequence` for guaranteed uniqueness:

```javascript
const expenseNumber = await generateUniqueSequence(
  'Expense',
  'expenseNumber',
  'EXP',
  tenantId
);
// Result: "EXP-2025-001234"
```

Format: `{PREFIX}-{YEAR}-{SEQUENCE}`

---

## Common Use Cases

### 1. Monthly Expense Tracking

**Scenario:** Track all operational expenses for January 2025

```bash
GET /finance/expenses?startDate=2025-01-01&endDate=2025-01-31&status=paid&sortBy=expenseDate&sortOrder=DESC
```

### 2. Approve Pending Expenses

**Scenario:** Manager reviews and approves pending expenses

```bash
# List pending expenses
GET /finance/expenses?status=pending

# Approve each expense
POST /finance/expenses/{id}/approve
```

### 3. Generate Quarterly P&L

**Scenario:** Generate Q1 2025 profit & loss report

```bash
GET /finance/reports/profit-loss?startDate=2025-01-01&endDate=2025-03-31&groupBy=month
```

### 4. Category-wise Expense Analysis

**Scenario:** Analyze marketing expenses for the year

```bash
GET /finance/reports/expenses?startDate=2025-01-01&endDate=2025-12-31&categoryId={marketing-category-id}&groupBy=month
```

### 5. Set Up Recurring Rent Expense

**Scenario:** Create monthly rent expense

```bash
POST /finance/expenses
{
  "categoryId": "{rent-category-id}",
  "title": "Monthly Rent",
  "amount": 10000000,
  "expenseDate": "2025-01-01",
  "isRecurring": true,
  "recurringFrequency": "monthly",
  "recurringEndDate": "2025-12-31",
  "status": "approved"
}
```

---

## Error Handling

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `CATEGORY_NOT_FOUND` | 404 | Expense category doesn't exist |
| `EXPENSE_NOT_FOUND` | 404 | Expense doesn't exist |
| `CATEGORY_EXISTS` | 400 | Duplicate category name |
| `EXPENSE_ALREADY_PAID` | 400 | Cannot modify/delete paid expense |
| `INVALID_STATUS` | 400 | Invalid status transition |
| `CATEGORY_IN_USE` | 400 | Cannot delete category with expenses |
| `MISSING_PARAMETERS` | 400 | Required query parameters missing |

### Example Error Response

```json
{
  "success": false,
  "code": "EXPENSE_ALREADY_PAID",
  "message": "Cannot modify amount of paid expense"
}
```

---

## Best Practices

### 1. Expense Approval Workflow

✅ **Do:**
- Set status to `draft` when creating expense
- Change to `pending` when ready for approval
- Use approve endpoint for formal approval
- Mark as `paid` only after actual payment

❌ **Don't:**
- Skip approval steps for accountability
- Create expenses directly as `paid` without approval trail
- Delete paid expenses (use `cancelled` status instead)

### 2. Category Management

✅ **Do:**
- Use descriptive category names
- Set appropriate `type` (operational, fixed, variable, one_time)
- Use colors for visual distinction in reports
- Deactivate instead of deleting categories

❌ **Don't:**
- Create duplicate categories
- Delete categories with associated expenses

### 3. Financial Reporting

✅ **Do:**
- Use appropriate `groupBy` for report clarity (day for short periods, month for yearly)
- Filter by `locationId` for multi-location analysis
- Include both approved and paid expenses in financial reports
- Cache report results for frequently accessed date ranges

❌ **Don't:**
- Query extremely large date ranges without pagination
- Include `draft` or `cancelled` expenses in financial calculations

### 4. Recurring Expenses

✅ **Do:**
- Set clear `recurringEndDate`
- Use appropriate `recurringFrequency`
- Document recurring expense purpose in `notes`
- Review and adjust recurring expenses quarterly

❌ **Don't:**
- Create indefinite recurring expenses without review
- Forget to stop recurring expenses when no longer needed

---

## Performance Optimization

### Database Indexes

The module leverages comprehensive indexes:

```sql
-- Composite indexes for common queries
CREATE INDEX idx_expenses_tenant_date ON "Expenses" ("tenantId", "expenseDate");
CREATE INDEX idx_expenses_tenant_status_date ON "Expenses" ("tenantId", "status", "expenseDate");

-- Single column indexes
CREATE INDEX idx_expenses_category ON "Expenses" ("categoryId");
CREATE INDEX idx_expenses_location ON "Expenses" ("locationId");
```

### Query Optimization

1. **Use date range filters** - Narrow queries to specific periods
2. **Limit result sets** - Use pagination for large datasets
3. **Avoid N+1 queries** - Endpoints include necessary associations
4. **Cache report results** - Financial reports can be cached (consider Redis)

### Example Optimized Query

```javascript
// Efficient: Uses composite index + includes associations in single query
const expenses = await Expense.findAll({
  where: {
    tenantId,
    status: 'paid',
    expenseDate: { [Op.between]: [startDate, endDate] }
  },
  include: [
    { model: ExpenseCategory, as: 'category' },
    { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName'] }
  ],
  order: [['expenseDate', 'DESC']],
  limit: 20
});
```

---

## Future Enhancements

### Planned Features

1. **Automatic Recurring Expense Generation**
   - Background job to create recurring expenses
   - Email notifications for upcoming recurring expenses

2. **Expense Attachments**
   - File upload support for receipts/invoices
   - Integration with cloud storage (S3, etc.)

3. **Budget Management**
   - Category-wise budget limits
   - Budget vs actual tracking
   - Alerts when approaching budget limits

4. **Advanced Analytics**
   - Trend analysis (YoY, MoM comparisons)
   - Expense forecasting
   - Category benchmarking

5. **Multi-currency Support**
   - Support for foreign currency expenses
   - Automatic exchange rate conversion
   - Currency-wise reporting

6. **Integration with Accounting Software**
   - Export to Xero, QuickBooks, etc.
   - Automated journal entry generation

---

## Testing

### Unit Tests

Located in `tests/controllers/finance/`:

```bash
npm test -- finance
```

### Test Coverage

Key test scenarios:
- ✅ Create expense with all fields
- ✅ Update expense amount recalculation
- ✅ Prevent modifying paid expenses
- ✅ Approve pending expenses
- ✅ Mark expense as paid
- ✅ Prevent deleting paid expenses
- ✅ Duplicate category prevention
- ✅ P&L report accuracy
- ✅ Revenue report by module
- ✅ Expense report by category

### Manual Testing

Use Postman collection: `docs/postman/Finance-Module.postman_collection.json`

---

## Troubleshooting

### Issue: Expense Number Not Generating

**Symptom:** `expenseNumber` is null or duplicate

**Solution:**
```javascript
// Ensure sequence generation is working
const expenseNumber = await generateUniqueSequence(
  'Expense',
  'expenseNumber',
  'EXP',
  tenantId
);
```

Check `sequenceService` logs for errors.

### Issue: Total Amount Incorrect

**Symptom:** `totalAmount` doesn't match `amount + taxAmount`

**Solution:** The model hook should auto-calculate, but verify:

```javascript
// Manual recalculation
expense.totalAmount = parseFloat(expense.amount) + parseFloat(expense.taxAmount);
```

### Issue: Cannot Delete Category

**Symptom:** "Category in use" error when deleting

**Solution:** Check for associated expenses:

```javascript
const expenseCount = await Expense.count({
  where: { categoryId }
});

if (expenseCount > 0) {
  // Either reassign expenses or soft-delete category
  await category.update({ isActive: false });
}
```

### Issue: P&L Report Shows No Data

**Symptom:** Empty `periodData` array

**Solution:** Verify:
1. Date range includes completed transactions
2. Expenses have status `approved` or `paid`
3. Tenant ID is correct (check `req.user.tenantId`)

```javascript
// Debug queries
console.log('Revenue count:', await Transaction.count({ where: { tenantId, status: 'completed' } }));
console.log('Expense count:', await Expense.count({ where: { tenantId, status: ['approved', 'paid'] } }));
```

---

## Related Documentation

- [Transaction Architecture](TRANSACTION-ARCHITECTURE.md) - Understanding the unified transaction system
- [Multi-Tenancy Guide](SAAS-APPLICATION-FLOW.md) - Tenant isolation patterns
- [CASL Authorization](../utils/casl.js) - Permission system details
- [Concurrency Control](RACE-CONDITION-PREVENTION.md) - Optimistic locking patterns
- [API Testing Examples](frontend-integration/API-TESTING-EXAMPLES.md) - Postman examples

---

## 5. Income Management

### Overview
Income Management handles both **transactional income** (auto-generated from gym operations) and **manual income** entries (donations, investments, other non-operational income). All transactional income is automatically tracked via the Transaction system and is read-only in this module.

### 5.1 Data Models

#### Income Model
```javascript
{
  id: UUID,
  tenantId: UUID (required),
  incomeNumber: STRING (auto: INC-YYYY-NNNNNN),
  categoryId: UUID (required),
  locationId: UUID (optional),
  transactionId: UUID (optional, for transactional income),
  type: ENUM ['transactional', 'manual'] (required),
  title: STRING (required),
  description: TEXT,
  amount: DECIMAL(15,2) (required),
  taxAmount: DECIMAL(15,2) (default: 0),
  totalAmount: DECIMAL(15,2) (auto-calculated),
  incomeDate: DATE (required),
  receivedDate: DATE,
  paymentMethod: ENUM ['cash', 'transfer', 'credit_card', 'debit_card', 'e_wallet', 'check', 'other'],
  referenceNumber: STRING,
  source: STRING,
  status: ENUM ['pending', 'received', 'cancelled'] (default: pending),
  isRecurring: BOOLEAN (default: false),
  recurringFrequency: ENUM ['daily', 'weekly', 'monthly', 'yearly'],
  recurringEndDate: DATE,
  notes: TEXT,
  tags: JSON,
  version: INTEGER (optimistic locking),
  createdBy: UUID,
  updatedBy: UUID,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
  deletedAt: TIMESTAMP (soft delete)
}
```

#### IncomeCategory Model
```javascript
{
  id: UUID,
  tenantId: UUID (required),
  name: STRING (required, unique per tenant),
  description: TEXT,
  type: ENUM ['operational', 'investment', 'donation', 'other'],
  isActive: BOOLEAN (default: true),
  color: STRING (#HEX),
  icon: STRING,
  createdBy: UUID,
  updatedBy: UUID,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
  deletedAt: TIMESTAMP
}
```

### 5.2 API Endpoints

#### 5.2.1 Create Manual Income
**POST** `/api/v1/finance/incomes`

**Description:** Create a manual income entry (non-transactional)

**Authorization:** `create:Income`

**Request Body:**
```json
{
  "categoryId": "uuid",
  "locationId": "uuid",
  "title": "Corporate Sponsorship Q1 2025",
  "description": "Quarterly sponsorship from PT ABC",
  "amount": 50000000,
  "taxAmount": 0,
  "incomeDate": "2025-01-15",
  "receivedDate": "2025-01-15",
  "paymentMethod": "transfer",
  "referenceNumber": "SPON-2025-001",
  "source": "PT ABC Corporation",
  "status": "received",
  "isRecurring": true,
  "recurringFrequency": "quarterly",
  "recurringEndDate": "2025-12-31",
  "notes": "Sponsorship agreement renewal",
  "tags": ["sponsorship", "corporate", "recurring"]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "tenantId": "uuid",
    "incomeNumber": "INC-2025-000001",
    "categoryId": "uuid",
    "locationId": "uuid",
    "type": "manual",
    "title": "Corporate Sponsorship Q1 2025",
    "amount": 50000000,
    "taxAmount": 0,
    "totalAmount": 50000000,
    "status": "received",
    "incomeDate": "2025-01-15",
    "receivedDate": "2025-01-15",
    "createdAt": "2025-01-17T10:00:00Z",
    "category": {
      "id": "uuid",
      "name": "Corporate Sponsorship",
      "type": "donation"
    }
  }
}
```

**Business Rules:**
- Only `type: manual` income can be created via API
- `incomeNumber` auto-generated using sequence service
- `totalAmount` = `amount` + `taxAmount` (auto-calculated)
- Transactional income is created automatically from Transaction system
- Recurring income generates future entries based on frequency
- Location is optional (useful for multi-location tracking)

**Validation:**
- `amount` must be > 0
- `categoryId` must exist and belong to tenant
- `locationId` must exist if provided
- `receivedDate` cannot be before `incomeDate`
- `recurringEndDate` required if `isRecurring` is true

**Error Responses:**
- `400 Bad Request` - Validation errors
- `401 Unauthorized` - Invalid/missing token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Category/Location not found
- `409 Conflict` - Duplicate reference number

#### 5.2.2 Get All Incomes
**GET** `/api/v1/finance/incomes`

**Description:** Retrieve paginated list of incomes with filtering

**Authorization:** `read:Income`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | Number | No | Page number (default: 1) |
| limit | Number | No | Items per page (default: 20, max: 100) |
| type | String | No | Filter: `manual` or `transactional` |
| status | String | No | Filter: `pending`, `received`, `cancelled` |
| categoryId | UUID | No | Filter by income category |
| locationId | UUID | No | Filter by location |
| startDate | Date | No | Filter from date (YYYY-MM-DD) |
| endDate | Date | No | Filter to date (YYYY-MM-DD) |
| search | String | No | Search in title, description, source |
| sortBy | String | No | Sort field (default: incomeDate) |
| sortOrder | String | No | `ASC` or `DESC` (default: DESC) |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "incomes": [
      {
        "id": "uuid",
        "incomeNumber": "INC-2025-000001",
        "type": "manual",
        "title": "Corporate Sponsorship Q1",
        "amount": 50000000,
        "totalAmount": 50000000,
        "status": "received",
        "incomeDate": "2025-01-15",
        "category": {
          "name": "Corporate Sponsorship",
          "type": "donation"
        },
        "location": {
          "name": "Head Office"
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 87,
      "itemsPerPage": 20,
      "hasNext": true,
      "hasPrev": false
    },
    "summary": {
      "totalAmount": 150000000,
      "receivedAmount": 120000000,
      "pendingAmount": 30000000
    }
  }
}
```

#### 5.2.3 Get Income by ID
**GET** `/api/v1/finance/incomes/:id`

**Description:** Retrieve detailed information for a specific income

**Authorization:** `read:Income`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "incomeNumber": "INC-2025-000001",
    "type": "manual",
    "title": "Corporate Sponsorship Q1 2025",
    "description": "Quarterly sponsorship from PT ABC",
    "amount": 50000000,
    "taxAmount": 0,
    "totalAmount": 50000000,
    "incomeDate": "2025-01-15",
    "receivedDate": "2025-01-15",
    "paymentMethod": "transfer",
    "referenceNumber": "SPON-2025-001",
    "source": "PT ABC Corporation",
    "status": "received",
    "isRecurring": true,
    "recurringFrequency": "quarterly",
    "recurringEndDate": "2025-12-31",
    "notes": "Sponsorship agreement renewal",
    "tags": ["sponsorship", "corporate", "recurring"],
    "category": {
      "id": "uuid",
      "name": "Corporate Sponsorship",
      "type": "donation",
      "color": "#4CAF50"
    },
    "location": {
      "id": "uuid",
      "name": "Head Office"
    },
    "createdBy": {
      "id": "uuid",
      "name": "Admin User",
      "email": "admin@gym.com"
    },
    "createdAt": "2025-01-17T10:00:00Z",
    "updatedAt": "2025-01-17T10:00:00Z"
  }
}
```

#### 5.2.4 Update Income
**PUT** `/api/v1/finance/incomes/:id`

**Description:** Update manual income entry (transactional income cannot be updated)

**Authorization:** `update:Income`

**Request Body:**
```json
{
  "title": "Updated Title",
  "amount": 55000000,
  "status": "received",
  "notes": "Amount adjusted per amendment"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "incomeNumber": "INC-2025-000001",
    "title": "Updated Title",
    "amount": 55000000,
    "totalAmount": 55000000,
    "status": "received",
    "updatedAt": "2025-01-17T11:30:00Z"
  }
}
```

**Business Rules:**
- **Cannot update transactional income** (type: transactional)
- Cannot change `type` or `incomeNumber`
- `version` field updated for optimistic locking
- Changing amount recalculates `totalAmount`

**Error Responses:**
- `400 Bad Request` - Attempting to update transactional income
- `404 Not Found` - Income not found
- `409 Conflict` - Version mismatch (concurrent update)

#### 5.2.5 Delete Income
**DELETE** `/api/v1/finance/incomes/:id`

**Description:** Soft delete manual income entry

**Authorization:** `delete:Income`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Income deleted successfully"
}
```

**Business Rules:**
- **Cannot delete transactional income**
- Soft delete (sets `deletedAt` timestamp)
- Affects cash flow calculations
- Audit log entry created

### 5.3 Income Categories

#### 5.3.1 Create Income Category
**POST** `/api/v1/finance/income-categories`

**Authorization:** `create:IncomeCategory`

**Request Body:**
```json
{
  "name": "Corporate Donations",
  "description": "Donations from corporate sponsors",
  "type": "donation",
  "color": "#4CAF50",
  "icon": "gift"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Corporate Donations",
    "type": "donation",
    "isActive": true,
    "color": "#4CAF50",
    "icon": "gift"
  }
}
```

**Validation:**
- Category name must be unique per tenant
- Color must be valid hex format
- Type must be one of: operational, investment, donation, other

#### 5.3.2 Get All Income Categories
**GET** `/api/v1/finance/income-categories`

**Query Parameters:**
- `includeStats=true` - Include income count and total amount
- `isActive=true` - Filter active categories only

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "uuid",
        "name": "Corporate Donations",
        "type": "donation",
        "isActive": true,
        "color": "#4CAF50",
        "stats": {
          "totalIncomes": 12,
          "totalAmount": 150000000
        }
      }
    ]
  }
}
```

#### 5.3.3 Update Income Category
**PUT** `/api/v1/finance/income-categories/:id`

**Authorization:** `update:IncomeCategory`

**Request Body:**
```json
{
  "name": "Updated Category Name",
  "isActive": false
}
```

#### 5.3.4 Delete Income Category
**DELETE** `/api/v1/finance/income-categories/:id`

**Authorization:** `delete:IncomeCategory`

**Business Rules:**
- Cannot delete if category has associated incomes
- Soft delete (sets `deletedAt`)

---

## 6. Cash Flow Management

### Overview
Cash Flow Management provides comprehensive tracking and analysis of cash inflows and outflows across the organization. It combines data from Transactions (membership, POS, restaurant, psychology), manual Income entries, and Expenses to provide real-time and projected cash flow insights.

### 6.1 Data Model

#### CashFlow Model
```javascript
{
  id: UUID,
  tenantId: UUID (required),
  locationId: UUID (optional),
  type: ENUM ['inflow', 'outflow'] (required),
  category: STRING (required),
  amount: DECIMAL(15,2) (required),
  date: DATE (required),
  description: TEXT,
  source: STRING,
  paymentMethod: ENUM ['cash', 'transfer', 'credit_card', 'debit_card', 'e_wallet', 'check', 'other'],
  referenceType: ENUM ['transaction', 'income', 'expense'],
  referenceId: UUID,
  isProjected: BOOLEAN (default: false),
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP
}
```

**Data Sources:**
- **Inflows:** 
  - Transactions (membership payments, POS sales, restaurant orders, psychology sessions)
  - Manual Income entries (donations, investments, other)
- **Outflows:**
  - Expenses (operational, capital, taxes, etc.)

### 6.2 API Endpoints

#### 6.2.1 Get Cash Flow Summary
**GET** `/api/v1/finance/cash-flow/summary`

**Description:** Get cash flow summary with inflows, outflows, net flow, and running balance

**Authorization:** `read:CashFlow`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| startDate | Date | Yes | Start date (YYYY-MM-DD) |
| endDate | Date | Yes | End date (YYYY-MM-DD) |
| locationId | UUID | No | Filter by location |
| groupBy | String | No | Group by: `day`, `week`, `month`, `year` (default: month) |

**Request Example:**
```
GET /api/v1/finance/cash-flow/summary?startDate=2025-01-01&endDate=2025-12-31&groupBy=month
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalInflow": 500000000,
      "totalOutflow": 350000000,
      "netFlow": 150000000,
      "openingBalance": 100000000,
      "closingBalance": 250000000
    },
    "periods": [
      {
        "period": "2025-01",
        "periodLabel": "January 2025",
        "inflow": 45000000,
        "outflow": 30000000,
        "netFlow": 15000000,
        "runningBalance": 115000000,
        "breakdown": {
          "inflows": {
            "transactions": 40000000,
            "manualIncome": 5000000
          },
          "outflows": {
            "expenses": 30000000
          }
        }
      },
      {
        "period": "2025-02",
        "periodLabel": "February 2025",
        "inflow": 50000000,
        "outflow": 28000000,
        "netFlow": 22000000,
        "runningBalance": 137000000
      }
    ],
    "trends": {
      "inflowGrowth": 5.2,
      "outflowGrowth": -2.1,
      "netFlowGrowth": 15.3,
      "averageMonthlyInflow": 41666667,
      "averageMonthlyOutflow": 29166667
    }
  }
}
```

**Features:**
- **Running Balance:** Tracks cumulative balance across periods
- **Breakdown:** Splits inflows/outflows by source type
- **Trends:** Growth percentages and averages
- **Grouping:** Flexible period grouping (daily, weekly, monthly, yearly)

#### 6.2.2 Get Cash Flow by Category
**GET** `/api/v1/finance/cash-flow/by-category`

**Description:** Get cash flow breakdown by inflow/outflow categories

**Authorization:** `read:CashFlow`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| startDate | Date | Yes | Start date (YYYY-MM-DD) |
| endDate | Date | Yes | End date (YYYY-MM-DD) |
| locationId | UUID | No | Filter by location |
| type | String | No | Filter: `inflow` or `outflow` |

**Request Example:**
```
GET /api/v1/finance/cash-flow/by-category?startDate=2025-01-01&endDate=2025-01-31&type=outflow
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "type": "outflow",
    "totalAmount": 30000000,
    "categories": [
      {
        "category": "Operational Expenses",
        "amount": 15000000,
        "percentage": 50.0,
        "count": 45,
        "subcategories": [
          {
            "name": "Utilities",
            "amount": 5000000,
            "count": 12
          },
          {
            "name": "Maintenance",
            "amount": 10000000,
            "count": 33
          }
        ]
      },
      {
        "category": "Salaries",
        "amount": 12000000,
        "percentage": 40.0,
        "count": 15
      },
      {
        "category": "Marketing",
        "amount": 3000000,
        "percentage": 10.0,
        "count": 8
      }
    ],
    "topCategories": [
      {
        "category": "Operational Expenses",
        "amount": 15000000,
        "percentage": 50.0
      }
    ]
  }
}
```

**Use Cases:**
- Identify major expense categories
- Analyze income source distribution
- Budget allocation insights
- Cost optimization opportunities

#### 6.2.3 Get Cash Flow Projection
**GET** `/api/v1/finance/cash-flow/projection`

**Description:** Get cash flow projections based on historical data (last 6 months)

**Authorization:** `read:CashFlow`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| months | Number | No | Months to project (default: 3, max: 12) |
| locationId | UUID | No | Filter by location |

**Request Example:**
```
GET /api/v1/finance/cash-flow/projection?months=3
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "currentBalance": 250000000,
    "projectionPeriod": 3,
    "methodology": "Based on 6-month historical average",
    "projections": [
      {
        "month": "2025-02",
        "monthLabel": "February 2025",
        "projectedInflow": 42000000,
        "projectedOutflow": 29000000,
        "projectedNetFlow": 13000000,
        "projectedBalance": 263000000,
        "confidence": "high"
      },
      {
        "month": "2025-03",
        "monthLabel": "March 2025",
        "projectedInflow": 42000000,
        "projectedOutflow": 29000000,
        "projectedNetFlow": 13000000,
        "projectedBalance": 276000000,
        "confidence": "medium"
      },
      {
        "month": "2025-04",
        "monthLabel": "April 2025",
        "projectedInflow": 42000000,
        "projectedOutflow": 29000000,
        "projectedNetFlow": 13000000,
        "projectedBalance": 289000000,
        "confidence": "low"
      }
    ],
    "historicalAverage": {
      "monthlyInflow": 42000000,
      "monthlyOutflow": 29000000,
      "monthlyNetFlow": 13000000
    },
    "assumptions": [
      "Inflow based on 6-month average transaction revenue",
      "Outflow based on 6-month average expenses",
      "Does not account for seasonal variations",
      "Does not include planned major expenses/income"
    ],
    "recommendations": [
      {
        "type": "warning",
        "message": "Consider building emergency fund (3-6 months operating costs)"
      },
      {
        "type": "info",
        "message": "Projected positive cash flow for next 3 months"
      }
    ]
  }
}
```

**Projection Algorithm:**
1. Analyze last 6 months of actual cash flow data
2. Calculate average monthly inflow/outflow
3. Apply trend adjustments if growth pattern detected
4. Project forward for requested months
5. Confidence decreases with projection distance

**Confidence Levels:**
- **High:** Next 1-2 months (based on strong recent data)
- **Medium:** 3-4 months ahead
- **Low:** 5+ months ahead

**Use Cases:**
- Financial planning and budgeting
- Identify potential cash shortages
- Investment opportunity assessment
- Loan repayment capacity analysis

### 6.3 Cash Flow Best Practices

#### Real-time Tracking
- Cash flow entries created automatically from Transactions and Expenses
- Manual Income entries immediately reflected in cash flow
- Location-based tracking for multi-site analysis

#### Historical Analysis
- Minimum 6 months of data recommended for projections
- Seasonal patterns identified automatically
- Trend analysis for growth forecasting

#### Integration Points
```javascript
// Transaction → Cash Flow (automatic)
When Transaction status = 'completed'
  → Create CashFlow entry (type: inflow)

// Income → Cash Flow (automatic)
When Income status = 'received'
  → Create CashFlow entry (type: inflow)

// Expense → Cash Flow (automatic)
When Expense status = 'paid'
  → Create CashFlow entry (type: outflow)
```

---

## Support

For questions or issues:
1. Check this documentation first
2. Review related documentation above
3. Check audit logs: `SELECT * FROM audit_logs WHERE action LIKE '%EXPENSE%' OR action LIKE '%INCOME%' OR action LIKE '%CASHFLOW%'`
4. Contact development team

---

**Last Updated:** January 2025  
**Module Version:** 2.0.0 (Added Income Management & Cash Flow)  
**API Version:** v1
