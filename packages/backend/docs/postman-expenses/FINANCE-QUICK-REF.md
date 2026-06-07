# Finance Module - API Quick Reference

Quick reference untuk Finance Module endpoints. Untuk dokumentasi lengkap, lihat [README-FINANCE.md](README-FINANCE.md).

---

## 🔐 Authentication

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@test.com",
  "password": "password123",
  "tenantId": 1
}

→ Response: { token: "..." }
→ Use: Authorization: Bearer {token}
```

---

## 💰 Expense Management

### Create Expense
```http
POST /api/v1/finance/expenses
Authorization: Bearer {token}

{
  "categoryId": "uuid",
  "title": "Monthly Office Rent",
  "amount": 15000000,
  "taxAmount": 1500000,
  "expenseDate": "2025-12-22",
  "dueDate": "2025-12-31",
  "paymentMethod": "transfer",
  "vendor": "PT Property",
  "status": "pending",
  "notes": "Payment notes",
  "tags": ["rent", "fixed"]
}
```

### Get All Expenses
```http
GET /api/v1/finance/expenses?page=1&limit=20&status=pending&sortBy=expenseDate&sortOrder=DESC
```

**Filters:**
- `status`: draft|pending|approved|paid|cancelled
- `categoryId`: UUID
- `startDate` & `endDate`: YYYY-MM-DD
- `vendor`: Vendor name
- `search`: Search in title/description

### Get Expense by ID
```http
GET /api/v1/finance/expenses/{id}
```

### Update Expense
```http
PUT /api/v1/finance/expenses/{id}

{
  "title": "Updated title",
  "amount": 16000000,
  "notes": "Updated notes"
}
```

### Approve Expense
```http
POST /api/v1/finance/expenses/{id}/approve

{
  "notes": "Approved for payment"
}

→ Status: pending → approved
```

### Mark as Paid
```http
POST /api/v1/finance/expenses/{id}/pay

{
  "paidDate": "2025-12-22",
  "paymentMethod": "transfer",
  "referenceNumber": "TRF-001234",
  "notes": "Paid via bank transfer"
}

→ Status: approved → paid
```

### Delete Expense
```http
DELETE /api/v1/finance/expenses/{id}
```

---

## 📁 Expense Categories

### Create Category
```http
POST /api/v1/finance/expense-categories

{
  "name": "Office Rent",
  "description": "Monthly rental costs",
  "type": "fixed",
  "color": "#FF5733",
  "icon": "🏢"
}
```

**Types:**
- `operational`: Regular ops (utilities, supplies)
- `fixed`: Fixed monthly (rent, salaries)
- `variable`: Variable costs (marketing)
- `one_time`: One-time expenses (equipment)

### Get All Categories
```http
GET /api/v1/finance/expense-categories?type=fixed&isActive=true
```

### Update Category
```http
PUT /api/v1/finance/expense-categories/{id}

{
  "name": "Updated name",
  "color": "#3498DB"
}
```

### Delete Category
```http
DELETE /api/v1/finance/expense-categories/{id}
```

---

## 📊 Financial Reports

### Profit & Loss Report
```http
GET /api/v1/finance/reports/profit-loss?startDate=2025-12-01&endDate=2025-12-31&groupBy=month
```

**Response:**
```json
{
  "totalRevenue": 150000000,
  "totalExpenses": 80000000,
  "netProfit": 70000000,
  "profitMargin": 46.67,
  "revenue": {
    "membership": 100000000,
    "pos": 30000000,
    "restaurant": 20000000
  },
  "expenses": {
    "byCategory": {...},
    "byType": {...}
  }
}
```

### Revenue Report
```http
GET /api/v1/finance/reports/revenue?startDate=2025-12-01&endDate=2025-12-31&moduleType=all
```

**Module types:** all|membership|pos|restaurant|class

### Expense Report
```http
GET /api/v1/finance/reports/expenses?startDate=2025-12-01&endDate=2025-12-31&status=paid
```

**Group by:** category|type|month|vendor

---

## 🎯 Quick Workflows

### Complete Expense Workflow
```bash
# 1. Create category
POST /expense-categories → Get categoryId

# 2. Create expense
POST /expenses (status: "pending") → Get expenseId

# 3. Approve
POST /expenses/{id}/approve → Status: approved

# 4. Pay
POST /expenses/{id}/pay → Status: paid

# 5. Verify in report
GET /reports/expenses
```

### Monthly Reporting
```bash
# Get all financial data for the month
GET /reports/profit-loss?startDate=2025-12-01&endDate=2025-12-31
GET /reports/revenue?startDate=2025-12-01&endDate=2025-12-31
GET /reports/expenses?startDate=2025-12-01&endDate=2025-12-31
```

---

## 🔑 Common Query Parameters

### Pagination
```
?page=1&limit=20
```

### Date Range
```
?startDate=2025-12-01&endDate=2025-12-31
```

### Sorting
```
?sortBy=expenseDate&sortOrder=DESC
```

### Filtering
```
?status=pending&categoryId=uuid&vendor=PT%20Property
```

---

## 📋 Status Flow

```
draft → pending → approved → paid
         ↓          ↓
     cancelled  cancelled
```

**Rules:**
- Only `draft` can be deleted
- Only `pending` can be approved
- Only `approved` can be paid

---

## 💡 Tips

### Date Format
Always use: `YYYY-MM-DD`
Example: `2025-12-22`

### Amounts
Accept decimal numbers:
- `15000000` or `15000000.00`

### Payment Methods
- `cash`
- `transfer`
- `credit_card`
- `debit_card`
- `check`
- `other`

### Auto-generated Fields
- `expenseNumber`: EXP-2025-001234
- `totalAmount`: amount + taxAmount

---

## 🐛 Common Errors

### 401 Unauthorized
```json
{ "message": "Unauthorized" }
```
→ Login again to get new token

### 403 Forbidden
```json
{ "message": "Insufficient permissions" }
```
→ Check user role & CASL permissions

### 400 Validation Error
```json
{
  "message": "Validation failed",
  "errors": [
    "categoryId is required",
    "amount must be a number"
  ]
}
```
→ Check required fields

### 404 Not Found
```json
{ "message": "Expense not found" }
```
→ Verify ID is correct

---

## 📞 More Info

- **Full Documentation**: [README-FINANCE.md](README-FINANCE.md)
- **Postman Collection**: Import `Finance-Module-Complete.postman_collection.json`
- **API Docs**: `../docs/FINANCE-MODULE.md`

---

**Last Updated:** December 22, 2025
