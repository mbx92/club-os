# Subscription Plan Payload Examples

Quick reference untuk POST/PUT request body pada subscription plans.

---

## 📝 Create Plan (POST /api/v1/billing/plans)

### Example 1: Basic Plan
```json
{
  "name": "Basic",
  "description": "Perfect for small gyms and fitness centers",
  "price": 99.99,
  "duration": 30,
  "sortOrder": 1,
  "features": {
    "modules": {
      "gym": true,
      "pos": false,
      "restaurant": false,
      "classes": false,
      "reports": true,
      "advancedReports": false
    },
    "limits": {
      "maxUsers": 3,
      "maxMembers": 50,
      "maxProducts": 0,
      "maxLocations": 1,
      "maxPrinters": 0,
      "maxTables": 0,
      "maxIntegrations": 0
    },
    "transactions": {
      "combinedBilling": false,
      "installments": false,
      "vouchers": false,
      "loyaltyPoints": false,
      "refunds": false
    },
    "payments": {
      "cash": true,
      "creditCard": false,
      "bankTransfer": false,
      "eWallet": false,
      "qris": false,
      "paymentGateway": false
    },
    "printing": {
      "thermalPrinter": false,
      "customTemplates": false,
      "autoPrint": false,
      "logo": false
    },
    "restaurant": {
      "tableManagement": false,
      "kitchenDisplay": false,
      "customTableLayout": false,
      "touchscreenMode": false
    },
    "integrations": {
      "sms": false,
      "whatsapp": false,
      "email": true,
      "paymentGateway": false,
      "accounting": false
    },
    "support": {
      "prioritySupport": false,
      "dedicatedAccount": false,
      "customization": false
    }
  }
}
```

---

### Example 2: Professional Plan
```json
{
  "name": "Professional",
  "description": "Great for growing fitness businesses",
  "price": 199.99,
  "duration": 30,
  "sortOrder": 2,
  "features": {
    "modules": {
      "gym": true,
      "pos": true,
      "restaurant": true,
      "classes": true,
      "reports": true,
      "advancedReports": false
    },
    "limits": {
      "maxUsers": 10,
      "maxMembers": 500,
      "maxProducts": 200,
      "maxLocations": 3,
      "maxPrinters": 3,
      "maxTables": 20,
      "maxIntegrations": 5
    },
    "transactions": {
      "combinedBilling": true,
      "installments": true,
      "vouchers": true,
      "loyaltyPoints": false,
      "refunds": true
    },
    "payments": {
      "cash": true,
      "creditCard": true,
      "bankTransfer": true,
      "eWallet": true,
      "qris": true,
      "paymentGateway": true
    },
    "printing": {
      "thermalPrinter": true,
      "customTemplates": false,
      "autoPrint": true,
      "logo": true
    },
    "restaurant": {
      "tableManagement": true,
      "kitchenDisplay": false,
      "customTableLayout": false,
      "touchscreenMode": true
    },
    "integrations": {
      "sms": true,
      "whatsapp": false,
      "email": true,
      "paymentGateway": true,
      "accounting": false
    },
    "support": {
      "prioritySupport": false,
      "dedicatedAccount": false,
      "customization": false
    }
  }
}
```

---

### Example 3: Enterprise Plan (Unlimited)
```json
{
  "name": "Enterprise",
  "description": "For large fitness enterprises with unlimited resources",
  "price": 799.99,
  "duration": 30,
  "sortOrder": 4,
  "features": {
    "modules": {
      "gym": true,
      "pos": true,
      "restaurant": true,
      "classes": true,
      "reports": true,
      "advancedReports": true
    },
    "limits": {
      "maxUsers": 0,
      "maxMembers": 0,
      "maxProducts": 0,
      "maxLocations": 0,
      "maxPrinters": 0,
      "maxTables": 0,
      "maxIntegrations": 0
    },
    "transactions": {
      "combinedBilling": true,
      "installments": true,
      "vouchers": true,
      "loyaltyPoints": true,
      "refunds": true
    },
    "payments": {
      "cash": true,
      "creditCard": true,
      "bankTransfer": true,
      "eWallet": true,
      "qris": true,
      "paymentGateway": true
    },
    "printing": {
      "thermalPrinter": true,
      "customTemplates": true,
      "autoPrint": true,
      "logo": true
    },
    "restaurant": {
      "tableManagement": true,
      "kitchenDisplay": true,
      "customTableLayout": true,
      "touchscreenMode": true
    },
    "integrations": {
      "sms": true,
      "whatsapp": true,
      "email": true,
      "paymentGateway": true,
      "accounting": true
    },
    "support": {
      "prioritySupport": true,
      "dedicatedAccount": true,
      "customization": true
    }
  }
}
```

---

## ✏️ Update Plan (PUT /api/v1/billing/plans/:id)

### Example 1: Update Price Only
```json
{
  "price": 249.99
}
```

### Example 2: Update Name and Description
```json
{
  "name": "Professional Plus",
  "description": "Professional plan with enhanced features"
}
```

### Example 3: Enable New Module
```json
{
  "features": {
    "modules": {
      "gym": true,
      "pos": true,
      "restaurant": true,
      "classes": true,
      "reports": true,
      "advancedReports": true
    }
  }
}
```

> **⚠️ Important:** Ketika update `features`, kirim **seluruh category** yang ingin diupdate. Partial update per feature tidak didukung.

### Example 4: Increase Limits
```json
{
  "features": {
    "limits": {
      "maxUsers": 20,
      "maxMembers": 1000,
      "maxProducts": 500,
      "maxLocations": 5,
      "maxPrinters": 5,
      "maxTables": 30,
      "maxIntegrations": 10
    }
  }
}
```

### Example 5: Deactivate Plan
```json
{
  "isActive": false
}
```

### Example 6: Full Update
```json
{
  "name": "Business Plus",
  "description": "Enhanced business plan",
  "price": 399.99,
  "duration": 30,
  "sortOrder": 3,
  "isActive": true,
  "features": {
    "modules": {
      "gym": true,
      "pos": true,
      "restaurant": true,
      "classes": true,
      "reports": true,
      "advancedReports": true
    },
    "limits": {
      "maxUsers": 25,
      "maxMembers": 2000,
      "maxProducts": 1000,
      "maxLocations": 10,
      "maxPrinters": 10,
      "maxTables": 50,
      "maxIntegrations": 15
    },
    "transactions": {
      "combinedBilling": true,
      "installments": true,
      "vouchers": true,
      "loyaltyPoints": true,
      "refunds": true
    },
    "payments": {
      "cash": true,
      "creditCard": true,
      "bankTransfer": true,
      "eWallet": true,
      "qris": true,
      "paymentGateway": true
    },
    "printing": {
      "thermalPrinter": true,
      "customTemplates": true,
      "autoPrint": true,
      "logo": true
    },
    "restaurant": {
      "tableManagement": true,
      "kitchenDisplay": true,
      "customTableLayout": true,
      "touchscreenMode": true
    },
    "integrations": {
      "sms": true,
      "whatsapp": true,
      "email": true,
      "paymentGateway": true,
      "accounting": true
    },
    "support": {
      "prioritySupport": true,
      "dedicatedAccount": true,
      "customization": false
    }
  }
}
```

---

## 🎯 Field Reference

### Required Fields (POST)
- `name` (string) - Plan name, must be unique
- `price` (number) - Monthly price in decimal

### Optional Fields
- `description` (string) - Plan description
- `duration` (number) - Duration in days (default: 30)
- `sortOrder` (number) - Display order (default: 0)
- `features` (object) - Feature configuration (see structure below)
- `isActive` (boolean) - Active status (default: true)

### Features Structure

**8 Categories:**

1. **modules** (boolean) - 6 features
2. **limits** (number, 0 = unlimited) - 7 features
3. **transactions** (boolean) - 5 features
4. **payments** (boolean) - 6 features
5. **printing** (boolean) - 4 features
6. **restaurant** (boolean) - 4 features
7. **integrations** (boolean) - 5 features
8. **support** (boolean) - 3 features

**Total: 40 configurable features**

---

## 💡 Tips

### Dynamic Form Building
Gunakan endpoint metadata untuk mendapatkan daftar features:
```javascript
const metadata = await fetch('/api/v1/admin/features/metadata');
// Returns array dengan label, description, icon untuk setiap feature
```

### Validation
- `name` harus unique per database
- `price` harus positive number
- `limits` dengan value 0 = unlimited
- `modules` boolean menentukan akses ke fitur utama

### Best Practices
1. Gunakan `sortOrder` untuk mengatur urutan display (1, 2, 3, 4)
2. Set `isActive: false` untuk hide plan tanpa delete
3. Test dengan `GET /api/v1/billing/plans/:id` setelah create/update
4. Gunakan `GET /api/v1/admin/features/preview/:planName` untuk preview sebelum create

---

## 📚 Related Documentation

- [BILLING-SUBSCRIPTION-FRONTEND.md](./BILLING-SUBSCRIPTION-FRONTEND.md) - Complete API documentation
- [FEATURE-SYNC-SYSTEM.md](./FEATURE-SYNC-SYSTEM.md) - Feature Registry & Sync system
- [FEATURE-SYNC-QUICKREF.md](./FEATURE-SYNC-QUICKREF.md) - Quick reference guide
- [TEST-ENDPOINTS.md](./TEST-ENDPOINTS.md) - Testing guide

---

**Last Updated:** November 22, 2025
