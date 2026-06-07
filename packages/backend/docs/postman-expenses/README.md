# Postman Collections - Gym Management Backend

Kumpulan Postman collections untuk testing API endpoints di Gym Management System.

---

## 📦 Available Collections

### 1. **Finance Module** ⭐ NEW
**Files:**
- `Finance-Module.postman_collection.json` - Full collection (20+ endpoints)
- `Finance-Module-Complete.postman_collection.json` - With auth included
- `Finance-Module.postman_environment.json` - Environment variables
- `README-FINANCE.md` - Detailed documentation

**Features:**
- ✅ Expense Management (CRUD + Approval workflow)
- ✅ Expense Categories
- ✅ Financial Reports (P&L, Revenue, Expense)
- ✅ Dashboard Integration
- ✅ Automated tests
- ✅ Sample data

**Quick Start:**
1. Import `Finance-Module-Complete.postman_collection.json`
2. Import `Finance-Module.postman_environment.json`
3. Run "Login" request
4. Test endpoints!

📖 **[Read Full Documentation](README-FINANCE.md)**

---

### 2. **Psychology Utils**
**File:** `Psychology-Utils.postman_collection.json`

**Features:**
- Recalculate scores for psychology tests
- CFIT, PAPI, EPPS utilities
- Score debugging tools

---

## 🚀 How to Use

### Import Collections

**Method 1: Drag & Drop**
1. Open Postman
2. Click **Import** button (top left)
3. Drag `.json` files or click **Upload Files**
4. Select collection and environment files
5. Click **Import**

**Method 2: Import from Folder**
1. In Postman, click **Import**
2. Click **Folder** tab
3. Select `postman/` folder
4. Select files to import
5. Click **Import**

### Setup Environment

1. Click environment dropdown (top right)
2. Select **Finance Module - Development**
3. Edit variables if needed:
   - `baseUrl`: API base URL (default: `http://localhost:5000/api/v1`)
   - `tenantId`: Your tenant ID (default: `1`)
   - `email`: Login email
   - `password`: Login password

### Authentication

**For Finance Module:**
1. Open collection
2. Run request: `🔐 Authentication > Login`
3. Token auto-saved to `{{authToken}}`
4. All subsequent requests authenticated automatically

---

## 📁 File Structure

```
postman/
├── Finance-Module.postman_collection.json           # Main finance collection
├── Finance-Module-Complete.postman_collection.json  # With auth included
├── Finance-Module.postman_environment.json          # Environment variables
├── README-FINANCE.md                                # Finance documentation
├── Psychology-Utils.postman_collection.json         # Psychology utilities
└── README.md                                        # This file
```

---

## 🧪 Testing Workflow

### Finance Module Testing

**Step 1: Setup Categories**
```
POST /finance/expense-categories
→ Create categories: Rent, Salaries, Utilities, etc.
→ Save categoryId
```

**Step 2: Create Expense**
```
POST /finance/expenses
→ Status: "pending"
→ Save expenseId
```

**Step 3: Approval Workflow**
```
POST /finance/expenses/{id}/approve
→ Status: pending → approved

POST /finance/expenses/{id}/pay
→ Status: approved → paid
```

**Step 4: Generate Reports**
```
GET /finance/reports/profit-loss
→ View P&L statement

GET /finance/reports/expenses
→ Expense breakdown
```

---

## 🔧 Environment Variables

### Finance Module Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `baseUrl` | API base URL | `http://localhost:5000/api/v1` |
| `authToken` | JWT token | Auto-saved on login |
| `tenantId` | Tenant ID | `1` |
| `userId` | Current user ID | Auto-saved on login |
| `expenseId` | Last created expense | Auto-saved |
| `categoryId` | Last created category | Auto-saved |

### Auto-saved Variables

Collection tests automatically save IDs to environment:
- Login → Saves `authToken`, `userId`, `tenantId`
- Create Expense → Saves `expenseId`
- Create Category → Saves `categoryId`

---

## 📊 Collection Features

### Automated Tests

All collections include automated tests:

**Example - Create Expense Test:**
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

### Pre-request Scripts

- Auto-add `X-Tenant-ID` header
- Token validation
- Request logging

### Response Validation

- Status code checks
- Response time monitoring
- Schema validation
- Data integrity checks

---

## 🐛 Troubleshooting

### Common Issues

**401 Unauthorized**
- **Cause:** Token expired or missing
- **Fix:** Run Login request again

**403 Forbidden**
- **Cause:** Insufficient permissions
- **Fix:** Check user role & permissions

**404 Not Found**
- **Cause:** Invalid ID or resource deleted
- **Fix:** Verify `{{expenseId}}` or other ID variables

**400 Bad Request**
- **Cause:** Validation error
- **Fix:** Check request body format & required fields

### Debug Tips

1. **Enable Postman Console:**
   - View → Show Postman Console
   - See detailed request/response logs

2. **Check Environment Variables:**
   - Click eye icon (👁️) next to environment selector
   - Verify all required variables are set

3. **Validate Request Body:**
   - Check JSON syntax
   - Verify date formats (YYYY-MM-DD)
   - Ensure required fields present

4. **Backend Logs:**
   - Check backend console for errors
   - Review `logs/` folder for detailed logs

---

## 📖 Additional Resources

### Finance Module
- Full documentation: [README-FINANCE.md](README-FINANCE.md)
- API docs: [../docs/FINANCE-MODULE.md](../docs/FINANCE-MODULE.md)
- Backend code: `src/controllers/finance/`

### Psychology Module
- Backend code: `src/controllers/psychology/`
- Test definitions: `public/psychology/`

---

## 🔄 Updates & Versions

### Finance Module v1.0.0 (December 22, 2025)
- ✅ Initial release
- ✅ 20+ endpoints
- ✅ Complete CRUD operations
- ✅ Approval workflow
- ✅ Financial reports
- ✅ Automated tests
- ✅ Sample data

### Psychology Utils v1.0.0
- ✅ Score recalculation utilities
- ✅ CFIT, PAPI, EPPS support

---

## 📞 Support

Need help?
1. Check collection documentation (README-*.md files)
2. Review API documentation in `docs/` folder
3. Check Postman Console for detailed errors
4. Contact development team

---

## 🎯 Best Practices

### 1. Use Environments
- Create separate environments for dev/staging/production
- Never commit real credentials to git

### 2. Organize Collections
- Group related requests in folders
- Use descriptive names
- Add descriptions to requests

### 3. Write Tests
- Validate response status
- Check response schema
- Save important IDs

### 4. Use Variables
- Store base URL in variables
- Save auth tokens
- Reuse IDs across requests

### 5. Document Requests
- Add descriptions
- Include example responses
- Note any special requirements

---

**Happy Testing! 🚀**

For questions or issues, check documentation or contact the development team.
