# Finance Module - Postman Collection

Postman collection lengkap untuk testing Finance Module di Gym Management Backend.

---

## 📦 Files

- **Finance-Module.postman_collection.json** - Collection dengan semua endpoints
- **Finance-Module.postman_environment.json** - Environment variables

---

## 🚀 Quick Start

### 1. Import Collection & Environment

**Di Postman:**
1. Klik **Import** button
2. Drag & drop kedua file JSON atau browse files:
   - `Finance-Module.postman_collection.json`
   - `Finance-Module.postman_environment.json`
3. Klik **Import**

### 2. Setup Environment

1. Select environment: **Finance Module - Development**
2. Edit environment variables jika perlu:
   - `baseUrl`: Default `http://localhost:5000/api/v1`
   - `tenantId`: Your tenant ID (default: `1`)
   - `email`: Login email (default: `admin@test.com`)
   - `password`: Login password

### 3. Login to Get Auth Token

**Run request:** `Auth > Login` (jika ada di collection lain), atau manual:

```http
POST {{baseUrl}}/auth/login
Content-Type: application/json

{
  "email": "{{email}}",
  "password": "{{password}}",
  "tenantId": {{tenantId}}
}
```

**Response akan menyimpan token otomatis ke `{{authToken}}`**

### 4. Test Endpoints

Semua request sudah include authentication header otomatis.

---

## 📚 Collection Structure

### 1. Expense Management (8 endpoints)
- ✅ Create Expense
- ✅ Get All Expenses (with filters)
- ✅ Get Expense by ID
- ✅ Update Expense
- ✅ Approve Expense
- ✅ Mark Expense as Paid
- ✅ Delete Expense
- ✅ Create Recurring Expense

### 2. Expense Categories (5 endpoints)
- ✅ Create Expense Category
- ✅ Get All Categories
- ✅ Update Category
- ✅ Delete Category
- ✅ Bulk Create Categories

### 3. Financial Reports (4 endpoints)
- ✅ Profit & Loss Report
- ✅ Revenue Report
- ✅ Expense Report
- ✅ Cash Flow Report

### 4. Dashboard Integration (3 endpoints)
- ✅ Finance Dashboard Summary
- ✅ Pending Approvals
- ✅ Overdue Expenses

**Total: 20+ endpoints**

---

## 🎯 Typical Workflow

### Scenario 1: Create & Process Expense

```
1. Create Expense Category
   → POST /finance/expense-categories
   → Save categoryId

2. Create Expense
   → POST /finance/expenses
   → Status: "pending"
   → Save expenseId

3. Approve Expense
   → POST /finance/expenses/{id}/approve
   → Status changes to "approved"

4. Mark as Paid
   → POST /finance/expenses/{id}/pay
   → Status changes to "paid"

5. Verify in Report
   → GET /finance/reports/expenses
```

### Scenario 2: Generate P&L Report

```
1. Get Profit & Loss Report
   → GET /finance/reports/profit-loss?startDate=2025-12-01&endDate=2025-12-31

2. Check Revenue Details
   → GET /finance/reports/revenue?startDate=2025-12-01&endDate=2025-12-31

3. Check Expense Breakdown
   → GET /finance/reports/expenses?startDate=2025-12-01&endDate=2025-12-31
```

### Scenario 3: Setup Categories First Time

```
1. Bulk Create Categories
   → POST /finance/expense-categories/bulk
   → Creates: Salaries, Rent, Utilities, Marketing, etc.

2. Verify Categories
   → GET /finance/expense-categories

3. Start Creating Expenses
   → Use categoryId from step 1
```

---

## 🧪 Testing Features

### Automated Tests
Collection includes automated tests untuk setiap request:

- ✅ Response status code validation
- ✅ Response time check (< 2000ms)
- ✅ Response schema validation
- ✅ Auto-save IDs to environment variables
- ✅ Error logging

### Pre-request Scripts
- Auto-add `X-Tenant-ID` header
- Token validation

### Test Scripts Examples

**Create Expense:**
```javascript
if (pm.response.code === 201) {
    const response = pm.response.json();
    pm.environment.set('expenseId', response.data.id);
    pm.test('Expense created successfully', () => {
        pm.expect(response.success).to.be.true;
        pm.expect(response.data).to.have.property('expenseNumber');
    });
}
```

---

## 📊 Query Parameters Guide

### Get All Expenses

```
GET /finance/expenses

Query Parameters:
- page=1                           // Pagination
- limit=20                         // Items per page
- status=pending                   // Filter: draft|pending|approved|paid|cancelled
- categoryId={uuid}                // Filter by category
- startDate=2025-12-01             // Date range start
- endDate=2025-12-31               // Date range end
- vendor=PT%20Property             // Filter by vendor
- search=rent                      // Search in title/description
- sortBy=expenseDate               // Sort field
- sortOrder=DESC                   // ASC or DESC
- overdue=true                     // Only overdue expenses
```

### Profit & Loss Report

```
GET /finance/reports/profit-loss

Query Parameters:
- startDate=2025-12-01  (required) // Report start date
- endDate=2025-12-31    (required) // Report end date
- groupBy=month                    // day|week|month|year
- locationId=1                     // Filter by location
```

---

## 💡 Tips & Best Practices

### 1. Environment Variables
Variables otomatis di-save saat testing:
- `{{expenseId}}` - Set saat create expense
- `{{categoryId}}` - Set saat create category
- `{{authToken}}` - Set saat login

### 2. Testing Workflow
**Recommended order:**
1. Create categories first
2. Create expenses with different statuses
3. Test approval workflow
4. Test payment marking
5. Generate reports

### 3. Date Formats
Semua date fields menggunakan format: `YYYY-MM-DD`
- Example: `2025-12-22`

### 4. Decimal Numbers
Amount fields accept decimal:
- `15000000` atau `15000000.00`
- System akan handle precision otomatis

### 5. Status Workflow
```
draft → pending → approved → paid
         ↓          ↓
     cancelled  cancelled
```

**Rules:**
- Only `draft` can be deleted
- Only `pending` can be approved
- Only `approved` can be paid
- Can cancel at any stage (except `paid`)

---

## 🔒 Authentication

Collection menggunakan **Bearer Token** authentication.

**Setup:**
1. Login via auth endpoint
2. Token auto-saved ke `{{authToken}}`
3. All requests include header:
   ```
   Authorization: Bearer {{authToken}}
   ```

**Tenant Isolation:**
Header `X-Tenant-ID` otomatis ditambahkan dari `{{tenantId}}` variable.

---

## 📝 Sample Data

### Create Expense Category
```json
{
  "name": "Office Rent",
  "description": "Monthly office space rental costs",
  "type": "fixed",
  "color": "#FF5733",
  "icon": "🏢"
}
```

### Create Expense
```json
{
  "categoryId": "uuid-here",
  "title": "Monthly Office Rent",
  "description": "Office space rental for December 2025",
  "amount": 15000000,
  "taxAmount": 1500000,
  "expenseDate": "2025-12-22",
  "dueDate": "2025-12-31",
  "paymentMethod": "transfer",
  "vendor": "PT Property Management",
  "status": "pending",
  "notes": "Payment due end of month",
  "tags": ["rent", "fixed-cost"]
}
```

### Create Recurring Expense
```json
{
  "categoryId": "uuid-here",
  "title": "Monthly Employee Salary",
  "amount": 50000000,
  "expenseDate": "2025-12-22",
  "isRecurring": true,
  "recurringFrequency": "monthly",
  "recurringEndDate": "2026-12-31"
}
```

---

## 🐛 Troubleshooting

### 401 Unauthorized
- Token expired → Login again
- Invalid token → Check `{{authToken}}` value

### 403 Forbidden
- Insufficient permissions → Check user role & CASL permissions
- Wrong tenant → Verify `{{tenantId}}` matches your data

### 404 Not Found
- Invalid ID → Check `{{expenseId}}` or `{{categoryId}}`
- Resource deleted → Verify resource exists in database

### 400 Bad Request
- Validation error → Check request body format
- Missing required fields → Review API documentation
- Invalid date format → Use `YYYY-MM-DD`

### Response Time > 2000ms
- Database query slow → Check filters & indexes
- Large dataset → Use pagination (limit parameter)

---

## 📖 Additional Resources

- **API Documentation**: `docs/FINANCE-MODULE.md`
- **Backend Code**: `src/controllers/finance/`
- **Database Models**: `src/models/Expense.js`, `src/models/ExpenseCategory.js`
- **Routes**: `src/routes/finance/`

---

## 🔄 Updates

**Version 1.0.0** - December 22, 2025
- ✅ Initial release
- ✅ 20+ endpoints
- ✅ Automated tests
- ✅ Sample data
- ✅ Complete documentation

---

## 📞 Support

Jika ada pertanyaan atau issue:
1. Check API documentation
2. Review error messages in Postman Console
3. Check backend logs
4. Contact development team

---

**Happy Testing! 🚀**
