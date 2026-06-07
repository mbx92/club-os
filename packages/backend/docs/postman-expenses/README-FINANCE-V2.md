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

### v1.1.0
- ✅ Added Financial Reports
- ✅ Enhanced Expense Management
- ✅ Added recurring expenses

### v1.0.0
- ✅ Initial release
- ✅ Basic Expense Management
- ✅ Expense Categories

---

**Collection Maintained By:** Finance Module Development Team  
**Last Updated:** January 17, 2025  
**Total Endpoints:** 21  
**Test Coverage:** Comprehensive
