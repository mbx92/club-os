# Billing & Subscription Management - Frontend Integration Guide

## Overview
Dokumentasi ini menjelaskan cara mengintegrasikan frontend dengan API Billing & Subscription Management. API ini mengelola subscription plans, subscriptions, invoices, dan payments untuk sistem multi-tenancy.

## ⚡ Recent Updates (Nov 22, 2025)

**Features Payload Structure Updated:**
- ✅ Payload `features` sekarang menggunakan struktur 8 categories yang lebih terorganisir
- ✅ Tersedia 30+ features dalam categories: `modules`, `limits`, `transactions`, `payments`, `printing`, `restaurant`, `integrations`, `support`
- ✅ Endpoint baru: `GET /api/v1/admin/features/metadata` untuk dynamic form building
- ✅ Feature Registry system untuk management tanpa migration
- 📖 Lihat [Section 3 & 6](#3-create-subscription-plan) untuk detail lengkap

**Backward Compatibility:**
- Fields lama (`maxUsers`, `maxMembers`) masih tersedia di root level untuk kompatibilitas
- Features baru ada dalam nested structure `features.limits.maxUsers`, etc.

## Base URL
```
/api/v1/billing
```

## Authentication
Semua endpoint (kecuali GET plans) memerlukan JWT token dalam header:
```
Authorization: Bearer <token>
```

---

## Table of Contents
1. [Subscription Plans](#subscription-plans)
   - [Get All Plans](#1-get-all-subscription-plans)
   - [Get Plan by ID](#2-get-subscription-plan-by-id)
   - [Create Plan (Admin)](#3-create-subscription-plan)
   - [Update Plan (Admin)](#4-update-subscription-plan)
   - [Delete Plan (Admin)](#5-delete-subscription-plan)
   - [Get Feature Metadata (Dynamic Form)](#6-get-feature-metadata)
2. [Subscriptions](#subscriptions)
3. [Invoices](#invoices)
4. [Payments](#payments)
5. [Error Handling](#error-handling)
6. [React Components Examples](#react-components-examples)

---

## Subscription Plans

> **⚠️ Important:** Endpoints untuk **Create, Update, dan Delete** subscription plans hanya dapat diakses oleh **Super Admin** (`isSuperAdmin: true`). Endpoint GET (view plans) bersifat public dan dapat diakses tanpa authentication.

> **💡 New Feature:** Gunakan endpoint `/api/v1/admin/features/metadata` untuk mendapatkan struktur features secara dinamis dan membangun form UI otomatis. Lihat [section 6](#6-get-feature-metadata).

### 1. Get All Subscription Plans
Mengambil daftar subscription plans dengan pagination, sorting, dan search.

**Endpoint:**
```
GET /api/v1/billing/plans
```

**Query Parameters:**
- `page` (optional): Halaman yang ingin diambil (default: 1)
- `limit` (optional): Jumlah data per halaman (default: 10)
- `sortBy` (optional): Field untuk sorting - `sortOrder`, `price`, `name`, `duration`, `createdAt`, `updatedAt` (default: sortOrder)
- `sortOrder` (optional): Urutan sort - `ASC` atau `DESC` (default: ASC)
- `search` (optional): Keyword untuk search di name dan description
- `isActive` (optional): Filter by status - `true`, `false`, atau `all` (default: true)

**Example Requests:**
```
GET /api/v1/billing/plans
GET /api/v1/billing/plans?page=1&limit=5
GET /api/v1/billing/plans?sortBy=price&sortOrder=DESC
GET /api/v1/billing/plans?search=basic
GET /api/v1/billing/plans?isActive=all
GET /api/v1/billing/plans?page=2&limit=5&sortBy=name&sortOrder=ASC&search=pro
```

**Authorization:** Public (tidak perlu token)

**Response Success (200):**
```json
{
  "data": [
    {
      "id": "uuid-1",
      "name": "Basic",
      "description": "Basic plan for small gyms",
      "price": "99.00",
      "duration": 30,
      "maxUsers": 5,
      "maxMembers": 100,
      "features": {
        "memberManagement": true,
        "checkIn": true,
        "reports": false,
        "api": false
      },
      "isActive": true,
      "sortOrder": 1,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    },
    {
      "id": "uuid-2",
      "name": "Professional",
      "description": "Professional plan with advanced features",
      "price": "199.00",
      "duration": 30,
      "maxUsers": 20,
      "maxMembers": 500,
      "features": {
        "memberManagement": true,
        "checkIn": true,
        "reports": true,
        "api": true,
        "customBranding": true
      },
      "isActive": true,
      "sortOrder": 2,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 2,
    "totalRecords": 4,
    "limit": 2,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "filters": {
    "search": "",
    "isActive": "true",
    "sortBy": "sortOrder",
    "sortOrder": "ASC"
  }
}
```

**Frontend Implementation:**
```javascript
async function getSubscriptionPlans(options = {}) {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = 'sortOrder',
      sortOrder = 'ASC',
      search = '',
      isActive = 'true'
    } = options;

    // Build query parameters
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sortBy,
      sortOrder,
      isActive
    });

    if (search) {
      params.append('search', search);
    }

    const response = await fetch(`/api/v1/billing/plans?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) throw new Error('Failed to fetch subscription plans');
    
    const result = await response.json();
    return result; // { data, pagination, filters }
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    throw error;
  }
}

// Usage examples:
// Get first page with default settings
const result1 = await getSubscriptionPlans();

// Get page 2 with 5 items per page
const result2 = await getSubscriptionPlans({ page: 2, limit: 5 });

// Search for "basic" plans
const result3 = await getSubscriptionPlans({ search: 'basic' });

// Sort by price descending
const result4 = await getSubscriptionPlans({ sortBy: 'price', sortOrder: 'DESC' });

// Get all plans including inactive
const result5 = await getSubscriptionPlans({ isActive: 'all' });

// Combine multiple filters
const result6 = await getSubscriptionPlans({ 
  page: 1, 
  limit: 20, 
  sortBy: 'name', 
  sortOrder: 'ASC',
  search: 'pro',
  isActive: 'true'
});
```

---

### 2. Get Subscription Plan by ID
Mengambil detail subscription plan berdasarkan ID.

**Endpoint:**
```
GET /api/v1/billing/plans/:id
```

**Parameters:**
- `id` (path parameter): Subscription Plan ID

**Authorization:** Public (tidak perlu token)

**Response Success (200):**
```json
{
  "id": "uuid-1",
  "name": "Basic",
  "description": "Basic plan for small gyms",
  "price": "99.00",
  "duration": 30,
  "maxUsers": 5,
  "maxMembers": 100,
  "features": {
    "memberManagement": true,
    "checkIn": true,
    "reports": false,
    "api": false
  },
  "isActive": true,
  "sortOrder": 1,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

**Response Error (404):**
```json
{
  "message": "Subscription plan not found"
}
```

**Frontend Implementation:**
```javascript
async function getSubscriptionPlanById(planId) {
  try {
    const response = await fetch(`/api/v1/billing/plans/${planId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 404) {
      throw new Error('Subscription plan not found');
    }
    
    if (!response.ok) throw new Error('Failed to fetch subscription plan');
    
    const plan = await response.json();
    return plan;
  } catch (error) {
    console.error('Error fetching subscription plan:', error);
    throw error;
  }
}
```

---

### 3. Create Subscription Plan
Membuat subscription plan baru (Super Admin only).

**Endpoint:**
```
POST /api/v1/billing/plans
```

**Authorization:** Required (Super Admin only - `isSuperAdmin: true`)

**Request Body:**
```json
{
  "name": "Enterprise",
  "description": "Enterprise plan with unlimited features",
  "price": 499.00,
  "duration": 30,
  "maxUsers": 100,
  "maxMembers": null,
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
  },
  "sortOrder": 3
}
```

**Field Descriptions:**
- `name` (required): Nama plan (harus unique)
- `description` (optional): Deskripsi plan
- `price` (required): Harga per bulan (dalam desimal)
- `duration` (optional): Durasi dalam hari (default: 30)
- `maxUsers` (optional): Maksimal users (default: 1, digunakan untuk backward compatibility)
- `maxMembers` (optional): Maksimal members (digunakan untuk backward compatibility)
- `features` (optional): Object berisi 8 categories fitur plan (lihat struktur lengkap di bawah)
- `sortOrder` (optional): Urutan tampilan (default: 0)

**Features Structure (8 Categories):**

1. **modules** (boolean) - Module access:
   - `gym`: Gym membership management
   - `pos`: Point of Sale system
   - `restaurant`: Restaurant management
   - `classes`: Class scheduling
   - `reports`: Basic reports
   - `advancedReports`: Advanced analytics

2. **limits** (number) - Resource limits (0 = unlimited):
   - `maxUsers`: Maximum staff users
   - `maxMembers`: Maximum gym members
   - `maxProducts`: Maximum products (POS/Restaurant)
   - `maxLocations`: Maximum branch locations
   - `maxPrinters`: Maximum printers
   - `maxTables`: Maximum restaurant tables
   - `maxIntegrations`: Maximum third-party integrations

3. **transactions** (boolean) - Transaction features:
   - `combinedBilling`: Combined billing (gym + POS + restaurant)
   - `installments`: Installment payments
   - `vouchers`: Voucher/discount system
   - `loyaltyPoints`: Loyalty points program
   - `refunds`: Refund processing

4. **payments** (boolean) - Payment methods:
   - `cash`: Cash payments
   - `creditCard`: Credit/debit card
   - `bankTransfer`: Bank transfer
   - `eWallet`: E-wallet (GoPay, OVO, etc)
   - `qris`: QRIS payments
   - `paymentGateway`: Payment gateway integration

5. **printing** (boolean) - Printing features:
   - `thermalPrinter`: Thermal printer support
   - `customTemplates`: Custom receipt templates
   - `autoPrint`: Auto-print receipts
   - `logo`: Custom logo on receipts

6. **restaurant** (boolean) - Restaurant-specific:
   - `tableManagement`: Table management
   - `kitchenDisplay`: Kitchen display system
   - `customTableLayout`: Custom table layout
   - `touchscreenMode`: Touchscreen POS mode

7. **integrations** (boolean) - Third-party integrations:
   - `sms`: SMS notifications
   - `whatsapp`: WhatsApp notifications
   - `email`: Email notifications
   - `paymentGateway`: Payment gateway APIs
   - `accounting`: Accounting software integration

8. **support** (boolean) - Support levels:
   - `prioritySupport`: Priority customer support
   - `dedicatedAccount`: Dedicated account manager
   - `customization`: Custom feature development

> **💡 Tip:** Gunakan endpoint `GET /api/v1/admin/features/metadata` untuk mendapatkan daftar lengkap features dengan descriptions dan icons untuk membangun UI form dinamis.

**Response Success (201):**
```json
{
  "id": "44444444-4444-4444-4444-444444444444",
  "name": "Enterprise",
  "description": "Enterprise plan with unlimited features",
  "price": "499.00",
  "duration": 30,
  "maxUsers": 100,
  "maxMembers": null,
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
  },
  "isActive": true,
  "sortOrder": 3,
  "createdAt": "2025-01-15T00:00:00.000Z",
  "updatedAt": "2025-01-15T00:00:00.000Z"
}
```

**Response Error (400):**
```json
{
  "message": "Subscription plan with this name already exists"
}
```

**Frontend Implementation:**
```javascript
async function createSubscriptionPlan(planData) {
  try {
    const response = await fetch('/api/v1/billing/plans', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(planData)
    });
    
    if (response.status === 400) {
      const error = await response.json();
      throw new Error(error.message);
    }
    
    if (!response.ok) throw new Error('Failed to create subscription plan');
    
    const plan = await response.json();
    return plan;
  } catch (error) {
    console.error('Error creating subscription plan:', error);
    throw error;
  }
}
```

---

### 4. Update Subscription Plan
Mengupdate subscription plan yang sudah ada (Super Admin only).

**Endpoint:**
```
PUT /api/v1/billing/plans/:id
```

**Parameters:**
- `id` (path parameter): Subscription Plan ID

**Authorization:** Required (Super Admin only - `isSuperAdmin: true`)

**Request Body (Example - Partial Update):**
```json
{
  "name": "Professional Plus",
  "description": "Updated description with more features",
  "price": 249.00,
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
      "maxUsers": 20,
      "maxMembers": 1000,
      "maxProducts": 500,
      "maxLocations": 5,
      "maxPrinters": 5,
      "maxTables": 30,
      "maxIntegrations": 10
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
      "customTableLayout": false,
      "touchscreenMode": true
    },
    "integrations": {
      "sms": true,
      "whatsapp": true,
      "email": true,
      "paymentGateway": true,
      "accounting": false
    },
    "support": {
      "prioritySupport": true,
      "dedicatedAccount": false,
      "customization": false
    }
  },
  "isActive": true
}
```

**Field Descriptions:**
- Semua field optional
- Hanya field yang dikirim akan diupdate
- `isActive`: untuk mengaktifkan/menonaktifkan plan
- `features`: dapat update seluruh object atau hanya category tertentu

> **⚠️ Note:** Ketika mengupdate `features`, pastikan mengirim struktur lengkap untuk category yang diupdate. Partial update per feature tidak disupport - harus update seluruh category.

**Response Success (200):**
```json
{
  "id": "22222222-2222-2222-2222-222222222222",
  "name": "Professional Plus",
  "description": "Updated description with more features",
  "price": "249.00",
  "duration": 30,
  "maxUsers": 30,
  "maxMembers": 1000,
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
      "maxUsers": 20,
      "maxMembers": 1000,
      "maxProducts": 500,
      "maxLocations": 5,
      "maxPrinters": 5,
      "maxTables": 30,
      "maxIntegrations": 10
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
      "customTableLayout": false,
      "touchscreenMode": true
    },
    "integrations": {
      "sms": true,
      "whatsapp": true,
      "email": true,
      "paymentGateway": true,
      "accounting": false
    },
    "support": {
      "prioritySupport": true,
      "dedicatedAccount": false,
      "customization": false
    }
  },
  "isActive": true,
  "sortOrder": 2,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-11-22T10:30:00.000Z"
}
```

**Response Error (404):**
```json
{
  "message": "Subscription plan not found"
}
```

**Response Error (400):**
```json
{
  "message": "Subscription plan with this name already exists"
}
```

**Frontend Implementation:**
```javascript
async function updateSubscriptionPlan(planId, updateData) {
  try {
    const response = await fetch(`/api/v1/billing/plans/${planId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });
    
    if (response.status === 404) {
      throw new Error('Subscription plan not found');
    }
    
    if (response.status === 400) {
      const error = await response.json();
      throw new Error(error.message);
    }
    
    if (!response.ok) throw new Error('Failed to update subscription plan');
    
    const plan = await response.json();
    return plan;
  } catch (error) {
    console.error('Error updating subscription plan:', error);
    throw error;
  }
}
```

---

### 5. Delete Subscription Plan
Menonaktifkan subscription plan (soft delete).

**Endpoint:**
```
DELETE /api/v1/billing/plans/:id
```

**Parameters:**
- `id` (path parameter): Subscription Plan ID

**Authorization:** Required (Super Admin only - `isSuperAdmin: true`)

**Response Success (200):**
```json
{
  "message": "Subscription plan deactivated successfully"
}
```

**Response Error (404):**
```json
{
  "message": "Subscription plan not found"
}
```

**Response Error (400):**
```json
{
  "message": "Cannot delete plan with active subscriptions. Please deactivate instead.",
  "activeSubscriptions": 5
}
```

**Frontend Implementation:**
```javascript
async function deleteSubscriptionPlan(planId) {
  try {
    const response = await fetch(`/api/v1/billing/plans/${planId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 404) {
      throw new Error('Subscription plan not found');
    }
    
    if (response.status === 400) {
      const error = await response.json();
      throw new Error(error.message);
    }
    
    if (!response.ok) throw new Error('Failed to delete subscription plan');
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error deleting subscription plan:', error);
    throw error;
  }
}
```

---

### 6. Get Feature Metadata
Mendapatkan metadata lengkap dari semua features untuk membangun form UI dinamis (Super Admin only).

**Endpoint:**
```
GET /api/v1/admin/features/metadata
```

**Authorization:** Required (Super Admin only - `isSuperAdmin: true`)

**Response Success (200):**
```json
{
  "success": true,
  "data": [
    {
      "category": "modules",
      "name": "gym",
      "type": "boolean",
      "label": "Gym Management",
      "description": "Core gym membership management",
      "icon": "💪",
      "availableIn": ["Basic", "Professional", "Business", "Enterprise"]
    },
    {
      "category": "modules",
      "name": "pos",
      "type": "boolean",
      "label": "Point of Sale",
      "description": "POS system untuk retail & merchandise",
      "icon": "🏪",
      "availableIn": ["Professional", "Business", "Enterprise"]
    },
    {
      "category": "limits",
      "name": "maxUsers",
      "type": "number",
      "label": "Maximum Users",
      "description": "Maximum number of staff users (0 = unlimited)",
      "icon": "👥",
      "plans": {
        "Basic": 3,
        "Professional": 10,
        "Business": 25,
        "Enterprise": 0
      }
    },
    {
      "category": "transactions",
      "name": "combinedBilling",
      "type": "boolean",
      "label": "Combined Billing",
      "description": "Combine membership + POS + restaurant in one invoice",
      "icon": "📝",
      "availableIn": ["Professional", "Business", "Enterprise"]
    }
    // ... 30+ features total
  ]
}
```

**Frontend Implementation:**
```javascript
async function getFeatureMetadata() {
  try {
    const response = await fetch('/api/v1/admin/features/metadata', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) throw new Error('Failed to fetch feature metadata');
    
    const result = await response.json();
    return result.data; // Array of features with metadata
  } catch (error) {
    console.error('Error fetching feature metadata:', error);
    throw error;
  }
}
```

**Use Case: Dynamic Form Builder**

Gunakan metadata ini untuk membuat form pembuatan/edit plan secara dinamis:

```javascript
// React Component Example
function PlanFormBuilder() {
  const [metadata, setMetadata] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    features: {}
  });

  useEffect(() => {
    // Load metadata on component mount
    getFeatureMetadata().then(data => {
      setMetadata(data);
      
      // Initialize features structure
      const initialFeatures = {};
      data.forEach(feature => {
        if (!initialFeatures[feature.category]) {
          initialFeatures[feature.category] = {};
        }
        initialFeatures[feature.category][feature.name] = 
          feature.type === 'boolean' ? false : 0;
      });
      
      setFormData(prev => ({ ...prev, features: initialFeatures }));
    });
  }, []);

  // Group features by category
  const featuresByCategory = metadata.reduce((acc, feature) => {
    if (!acc[feature.category]) acc[feature.category] = [];
    acc[feature.category].push(feature);
    return acc;
  }, {});

  const handleFeatureChange = (category, featureName, value) => {
    setFormData(prev => ({
      ...prev,
      features: {
        ...prev.features,
        [category]: {
          ...prev.features[category],
          [featureName]: value
        }
      }
    }));
  };

  return (
    <form>
      <input 
        type="text" 
        placeholder="Plan Name"
        value={formData.name}
        onChange={e => setFormData({...formData, name: e.target.value})}
      />
      
      <input 
        type="number" 
        placeholder="Price"
        value={formData.price}
        onChange={e => setFormData({...formData, price: e.target.value})}
      />

      {Object.entries(featuresByCategory).map(([category, features]) => (
        <div key={category} className="feature-category">
          <h3>{category.toUpperCase()}</h3>
          
          {features.map(feature => (
            <div key={feature.name} className="feature-item">
              <label>
                <span>{feature.icon} {feature.label}</span>
                <small>{feature.description}</small>
                
                {feature.type === 'boolean' ? (
                  <input
                    type="checkbox"
                    checked={formData.features[category]?.[feature.name] || false}
                    onChange={e => handleFeatureChange(
                      category, 
                      feature.name, 
                      e.target.checked
                    )}
                  />
                ) : (
                  <input
                    type="number"
                    placeholder="0 = unlimited"
                    value={formData.features[category]?.[feature.name] || 0}
                    onChange={e => handleFeatureChange(
                      category, 
                      feature.name, 
                      parseInt(e.target.value) || 0
                    )}
                  />
                )}
              </label>
              
              {feature.availableIn && (
                <small>Available in: {feature.availableIn.join(', ')}</small>
              )}
            </div>
          ))}
        </div>
      ))}

      <button onClick={() => createSubscriptionPlan(formData)}>
        Create Plan
      </button>
    </form>
  );
}
```

**Benefits:**
- ✅ No hardcoded feature lists in frontend
- ✅ Automatically updates when new features added to registry
- ✅ Consistent UI with icons and descriptions
- ✅ Type-safe (boolean vs number inputs)
- ✅ Shows which plans support each feature

**Related Endpoints:**
- `GET /api/v1/admin/features/preview/:planName` - Preview features for specific plan
- `POST /api/v1/admin/features/sync` - Sync features from registry to database
- `GET /api/v1/admin/features/health` - Check if plans are in sync with registry

See [Feature Sync System Documentation](./FEATURE-SYNC-SYSTEM.md) for more details.

---

## Subscriptions

### 7. Create Subscription
Membuat subscription baru untuk tenant.

**Endpoint:**
```
POST /api/v1/billing/subscriptions
```

**Authorization:** Required (create:Subscription permission)

**Request Body:**
```json
{
  "tenantId": "uuid-tenant",
  "planId": "uuid-plan",
  "paymentMethod": "credit_card"
}
```

**Field Descriptions:**
- `tenantId` (required): ID tenant yang akan berlangganan
- `planId` (required): ID subscription plan yang dipilih
- `paymentMethod` (required): Metode pembayaran (credit_card, bank_transfer, cash, etc.)

**Response Success (201):**
```json
{
  "subscription": {
    "id": "uuid-subscription",
    "tenantId": "uuid-tenant",
    "planId": "uuid-plan",
    "startDate": "2025-01-15T00:00:00.000Z",
    "endDate": "2025-02-14T00:00:00.000Z",
    "status": "pending",
    "price": "99.00"
  }
}
```

**Response Error (404):**
```json
{
  "message": "Subscription plan not found"
}
```

**Frontend Implementation:**
```javascript
async function createSubscription(subscriptionData) {
  try {
    const response = await fetch('/api/v1/billing/subscriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tenantId: subscriptionData.tenantId,
        planId: subscriptionData.planId,
        paymentMethod: subscriptionData.paymentMethod
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create subscription');
    }
    
    const result = await response.json();
    return result.subscription;
  } catch (error) {
    console.error('Error creating subscription:', error);
    throw error;
  }
}
```

---

### 7. Get Tenant Subscription
Mengambil subscription aktif untuk tenant tertentu.

**Endpoint:**
```
GET /api/v1/billing/subscriptions/tenant/:tenantId
```

**Parameters:**
- `tenantId` (path parameter): Tenant ID

**Authorization:** Required (read:Subscription permission)

**Response Success (200):**
```json
{
  "id": "uuid-subscription",
  "tenantId": "uuid-tenant",
  "planId": "uuid-plan",
  "startDate": "2025-01-15T00:00:00.000Z",
  "endDate": "2025-02-14T00:00:00.000Z",
  "status": "active",
  "autoRenew": true,
  "price": "99.00",
  "paymentMethod": "credit_card",
  "notes": null,
  "createdAt": "2025-01-15T00:00:00.000Z",
  "updatedAt": "2025-01-15T00:00:00.000Z",
  "plan": {
    "id": "uuid-plan",
    "name": "Basic",
    "description": "Basic plan for small gyms",
    "price": "99.00",
    "duration": 30,
    "maxUsers": 5,
    "maxMembers": 100,
    "features": {...}
  }
}
```

**Response Error (404):**
```json
{
  "message": "Subscription not found"
}
```

**Frontend Implementation:**
```javascript
async function getTenantSubscription(tenantId) {
  try {
    const response = await fetch(`/api/v1/billing/subscriptions/tenant/${tenantId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 404) {
      throw new Error('Subscription not found');
    }
    
    if (!response.ok) throw new Error('Failed to fetch subscription');
    
    const subscription = await response.json();
    return subscription;
  } catch (error) {
    console.error('Error fetching subscription:', error);
    throw error;
  }
}
```

---

### 8. Update Subscription
Mengupdate status atau auto-renew subscription.

**Endpoint:**
```
PUT /api/v1/billing/subscriptions/:id
```

**Parameters:**
- `id` (path parameter): Subscription ID

**Authorization:** Required (update:Subscription permission)

**Request Body:**
```json
{
  "status": "active",
  "autoRenew": true
}
```

**Field Descriptions:**
- `status` (optional): Status subscription (active, expired, cancelled, pending)
- `autoRenew` (optional): Apakah subscription akan auto-renew

**Response Success (200):**
```json
{
  "id": "uuid-subscription",
  "status": "active",
  "autoRenew": true
}
```

**Response Error (404):**
```json
{
  "message": "Subscription not found"
}
```

**Frontend Implementation:**
```javascript
async function updateSubscription(subscriptionId, updateData) {
  try {
    const response = await fetch(`/api/v1/billing/subscriptions/${subscriptionId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: updateData.status,
        autoRenew: updateData.autoRenew
      })
    });
    
    if (response.status === 404) {
      throw new Error('Subscription not found');
    }
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update subscription');
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }
}
```

---

### 9. Cancel Subscription
Membatalkan subscription.

**Endpoint:**
```
DELETE /api/v1/billing/subscriptions/:id
```

**Parameters:**
- `id` (path parameter): Subscription ID

**Authorization:** Required (delete:Subscription permission)

**Response Success (200):**
```json
{
  "message": "Subscription cancelled successfully"
}
```

**Response Error (404):**
```json
{
  "message": "Subscription not found"
}
```

**Frontend Implementation:**
```javascript
async function cancelSubscription(subscriptionId) {
  try {
    const response = await fetch(`/api/v1/billing/subscriptions/${subscriptionId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 404) {
      throw new Error('Subscription not found');
    }
    
    if (!response.ok) throw new Error('Failed to cancel subscription');
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    throw error;
  }
}
```

---

### 10. Renew Subscription
Memperpanjang subscription yang sudah ada.

**Endpoint:**
```
POST /api/v1/billing/subscriptions/:id/renew
```

**Parameters:**
- `id` (path parameter): Subscription ID yang akan diperpanjang

**Authorization:** Required (update:Subscription permission)

**Request Body:**
```json
{
  "paymentMethod": "credit_card"
}
```

**Field Descriptions:**
- `paymentMethod` (required): Metode pembayaran untuk perpanjangan

**Response Success (201):**
```json
{
  "subscription": {
    "id": "uuid-new-subscription",
    "tenantId": "uuid-tenant",
    "planId": "uuid-plan",
    "startDate": "2025-02-14T00:00:00.000Z",
    "endDate": "2025-03-16T00:00:00.000Z",
    "status": "pending",
    "price": "99.00"
  }
}
```

**Response Error (404):**
```json
{
  "message": "Subscription not found"
}
```

**Frontend Implementation:**
```javascript
async function renewSubscription(subscriptionId, paymentMethod) {
  try {
    const response = await fetch(`/api/v1/billing/subscriptions/${subscriptionId}/renew`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        paymentMethod: paymentMethod
      })
    });
    
    if (response.status === 404) {
      throw new Error('Subscription not found');
    }
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to renew subscription');
    }
    
    const result = await response.json();
    return result.subscription;
  } catch (error) {
    console.error('Error renewing subscription:', error);
    throw error;
  }
}
```

---

## Invoices

### 11. Create Invoice
Membuat invoice baru untuk subscription.

**Endpoint:**
```
POST /api/v1/billing/invoices
```

**Authorization:** Required (create:Invoice permission)

**Request Body:**
```json
{
  "tenantId": "uuid-tenant",
  "subscriptionId": "uuid-subscription",
  "amount": 99.00,
  "tax": 9.90,
  "dueDate": "2025-02-01T00:00:00.000Z",
  "items": [
    {
      "description": "Monthly Subscription - Basic Plan",
      "quantity": 1,
      "unitPrice": 99.00,
      "total": 99.00
    }
  ],
  "notes": "Payment due within 7 days"
}
```

**Field Descriptions:**
- `tenantId` (required): ID tenant
- `subscriptionId` (required): ID subscription terkait
- `amount` (required): Jumlah sebelum pajak
- `tax` (optional): Jumlah pajak
- `dueDate` (required): Tanggal jatuh tempo
- `items` (optional): Array item invoice
- `notes` (optional): Catatan tambahan

**Response Success (201):**
```json
{
  "invoice": {
    "id": "uuid-invoice",
    "invoiceNumber": "INV-202501-1234",
    "tenantId": "uuid-tenant",
    "subscriptionId": "uuid-subscription",
    "amount": "99.00",
    "tax": "9.90",
    "total": "108.90",
    "dueDate": "2025-02-01T00:00:00.000Z",
    "status": "draft"
  }
}
```

**Frontend Implementation:**
```javascript
async function createInvoice(invoiceData) {
  try {
    const response = await fetch('/api/v1/billing/invoices', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(invoiceData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create invoice');
    }
    
    const result = await response.json();
    return result.invoice;
  } catch (error) {
    console.error('Error creating invoice:', error);
    throw error;
  }
}
```

---

### 12. Get All Invoices
Mengambil daftar invoices, dengan filter optional.

**Endpoint:**
```
GET /api/v1/billing/invoices?tenantId=uuid-tenant
```

**Query Parameters:**
- `tenantId` (optional): Filter by tenant ID

**Authorization:** Required (read:Invoice permission)

**Response Success (200):**
```json
[
  {
    "id": "uuid-invoice",
    "invoiceNumber": "INV-202501-1234",
    "tenantId": "uuid-tenant",
    "subscriptionId": "uuid-subscription",
    "issueDate": "2025-01-15T00:00:00.000Z",
    "dueDate": "2025-02-01T00:00:00.000Z",
    "amount": "99.00",
    "tax": "9.90",
    "total": "108.90",
    "status": "issued",
    "items": [...],
    "notes": "Payment due within 7 days",
    "createdAt": "2025-01-15T00:00:00.000Z",
    "updatedAt": "2025-01-15T00:00:00.000Z",
    "subscription": {
      "id": "uuid-subscription",
      "planId": "uuid-plan",
      "status": "active"
    },
    "tenant": {
      "id": "uuid-tenant",
      "name": "Gym ABC"
    }
  }
]
```

**Frontend Implementation:**
```javascript
async function getInvoices(tenantId = null) {
  try {
    const url = tenantId 
      ? `/api/v1/billing/invoices?tenantId=${tenantId}`
      : '/api/v1/billing/invoices';
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) throw new Error('Failed to fetch invoices');
    
    const invoices = await response.json();
    return invoices;
  } catch (error) {
    console.error('Error fetching invoices:', error);
    throw error;
  }
}
```

---

### 13. Get Invoice by ID
Mengambil detail invoice berdasarkan ID.

**Endpoint:**
```
GET /api/v1/billing/invoices/:id
```

**Parameters:**
- `id` (path parameter): Invoice ID

**Authorization:** Required (read:Invoice permission)

**Response Success (200):**
```json
{
  "id": "uuid-invoice",
  "invoiceNumber": "INV-202501-1234",
  "tenantId": "uuid-tenant",
  "subscriptionId": "uuid-subscription",
  "issueDate": "2025-01-15T00:00:00.000Z",
  "dueDate": "2025-02-01T00:00:00.000Z",
  "amount": "99.00",
  "tax": "9.90",
  "total": "108.90",
  "status": "paid",
  "items": [
    {
      "description": "Monthly Subscription - Basic Plan",
      "quantity": 1,
      "unitPrice": 99.00,
      "total": 99.00
    }
  ],
  "notes": "Payment due within 7 days",
  "createdAt": "2025-01-15T00:00:00.000Z",
  "updatedAt": "2025-01-16T00:00:00.000Z",
  "subscription": {
    "id": "uuid-subscription",
    "planId": "uuid-plan",
    "status": "active",
    "tenant": {
      "id": "uuid-tenant",
      "name": "Gym ABC"
    }
  },
  "payments": [
    {
      "id": "uuid-payment",
      "amount": "108.90",
      "paymentMethod": "credit_card",
      "status": "completed",
      "paymentDate": "2025-01-16T00:00:00.000Z"
    }
  ]
}
```

**Response Error (404):**
```json
{
  "message": "Invoice not found"
}
```

**Frontend Implementation:**
```javascript
async function getInvoiceById(invoiceId) {
  try {
    const response = await fetch(`/api/v1/billing/invoices/${invoiceId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 404) {
      throw new Error('Invoice not found');
    }
    
    if (!response.ok) throw new Error('Failed to fetch invoice');
    
    const invoice = await response.json();
    return invoice;
  } catch (error) {
    console.error('Error fetching invoice:', error);
    throw error;
  }
}
```

---

### 14. Update Invoice Status
Mengupdate status invoice.

**Endpoint:**
```
PUT /api/v1/billing/invoices/:id/status
```

**Parameters:**
- `id` (path parameter): Invoice ID

**Authorization:** Required (update:Invoice permission)

**Request Body:**
```json
{
  "status": "paid"
}
```

**Field Descriptions:**
- `status` (required): Status invoice (draft, issued, paid, overdue, cancelled)

**Response Success (200):**
```json
{
  "id": "uuid-invoice",
  "status": "paid"
}
```

**Response Error (404):**
```json
{
  "message": "Invoice not found"
}
```

**Frontend Implementation:**
```javascript
async function updateInvoiceStatus(invoiceId, status) {
  try {
    const response = await fetch(`/api/v1/billing/invoices/${invoiceId}/status`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status })
    });
    
    if (response.status === 404) {
      throw new Error('Invoice not found');
    }
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update invoice status');
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error updating invoice status:', error);
    throw error;
  }
}
```

---

## Payments

### 15. Process Payment
Memproses pembayaran untuk invoice atau subscription.

**Endpoint:**
```
POST /api/v1/billing/payments
```

**Authorization:** Required (create:Payment permission)

**Request Body:**
```json
{
  "tenantId": "uuid-tenant",
  "invoiceId": "uuid-invoice",
  "subscriptionId": "uuid-subscription",
  "membershipId": null,
  "amount": 108.90,
  "paymentMethod": "credit_card",
  "transactionId": "TXN-123456789",
  "paymentType": "subscription",
  "processedBy": "uuid-user"
}
```

**Field Descriptions:**
- `tenantId` (required): ID tenant
- `invoiceId` (optional): ID invoice (untuk payment invoice)
- `subscriptionId` (optional): ID subscription (untuk payment subscription)
- `membershipId` (optional): ID membership (untuk payment membership)
- `amount` (required): Jumlah pembayaran
- `paymentMethod` (required): Metode pembayaran
- `transactionId` (optional): ID transaksi dari payment gateway
- `paymentType` (optional): Tipe pembayaran (membership, subscription, etc.)
- `processedBy` (optional): ID user yang memproses

**Response Success (201):**
```json
{
  "payment": {
    "id": "uuid-payment",
    "tenantId": "uuid-tenant",
    "amount": "108.90",
    "paymentMethod": "credit_card",
    "status": "completed",
    "paymentDate": "2025-01-16T10:30:00.000Z"
  }
}
```

**Frontend Implementation:**
```javascript
async function processPayment(paymentData) {
  try {
    const response = await fetch('/api/v1/billing/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to process payment');
    }
    
    const result = await response.json();
    return result.payment;
  } catch (error) {
    console.error('Error processing payment:', error);
    throw error;
  }
}
```

---

### 16. Get All Payments
Mengambil daftar payments dengan filter optional.

**Endpoint:**
```
GET /api/v1/billing/payments?tenantId=uuid&paymentType=subscription&status=completed
```

**Query Parameters:**
- `tenantId` (optional): Filter by tenant ID
- `paymentType` (optional): Filter by payment type (membership, subscription, etc.)
- `status` (optional): Filter by status (completed, pending, failed, refunded)

**Authorization:** Required (read:Payment permission)

**Response Success (200):**
```json
[
  {
    "id": "uuid-payment",
    "tenantId": "uuid-tenant",
    "invoiceId": "uuid-invoice",
    "subscriptionId": "uuid-subscription",
    "membershipId": null,
    "amount": "108.90",
    "paymentMethod": "credit_card",
    "paymentType": "subscription",
    "transactionId": "TXN-123456789",
    "status": "completed",
    "paymentDate": "2025-01-16T10:30:00.000Z",
    "processedBy": "uuid-user",
    "notes": null,
    "createdAt": "2025-01-16T10:30:00.000Z",
    "updatedAt": "2025-01-16T10:30:00.000Z",
    "tenant": {
      "id": "uuid-tenant",
      "name": "Gym ABC"
    },
    "invoice": {
      "id": "uuid-invoice",
      "invoiceNumber": "INV-202501-1234"
    },
    "subscription": {
      "id": "uuid-subscription",
      "status": "active"
    },
    "processor": {
      "id": "uuid-user",
      "email": "admin@gym.com"
    }
  }
]
```

**Frontend Implementation:**
```javascript
async function getPayments(filters = {}) {
  try {
    const params = new URLSearchParams();
    if (filters.tenantId) params.append('tenantId', filters.tenantId);
    if (filters.paymentType) params.append('paymentType', filters.paymentType);
    if (filters.status) params.append('status', filters.status);
    
    const url = `/api/v1/billing/payments${params.toString() ? '?' + params.toString() : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) throw new Error('Failed to fetch payments');
    
    const payments = await response.json();
    return payments;
  } catch (error) {
    console.error('Error fetching payments:', error);
    throw error;
  }
}
```

---

### 17. Get Payment by ID
Mengambil detail payment berdasarkan ID.

**Endpoint:**
```
GET /api/v1/billing/payments/:id
```

**Parameters:**
- `id` (path parameter): Payment ID

**Authorization:** Required (read:Payment permission)

**Response Success (200):**
```json
{
  "id": "uuid-payment",
  "tenantId": "uuid-tenant",
  "invoiceId": "uuid-invoice",
  "subscriptionId": "uuid-subscription",
  "membershipId": null,
  "amount": "108.90",
  "paymentMethod": "credit_card",
  "paymentType": "subscription",
  "transactionId": "TXN-123456789",
  "status": "completed",
  "paymentDate": "2025-01-16T10:30:00.000Z",
  "processedBy": "uuid-user",
  "notes": null,
  "createdAt": "2025-01-16T10:30:00.000Z",
  "updatedAt": "2025-01-16T10:30:00.000Z",
  "tenant": {...},
  "invoice": {...},
  "subscription": {...},
  "membership": null,
  "processor": {...}
}
```

**Response Error (404):**
```json
{
  "message": "Payment not found"
}
```

**Frontend Implementation:**
```javascript
async function getPaymentById(paymentId) {
  try {
    const response = await fetch(`/api/v1/billing/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 404) {
      throw new Error('Payment not found');
    }
    
    if (!response.ok) throw new Error('Failed to fetch payment');
    
    const payment = await response.json();
    return payment;
  } catch (error) {
    console.error('Error fetching payment:', error);
    throw error;
  }
}
```

---

### 18. Refund Payment
Melakukan refund untuk payment yang sudah diproses.

**Endpoint:**
```
POST /api/v1/billing/payments/:id/refund
```

**Parameters:**
- `id` (path parameter): Payment ID

**Authorization:** Required (update:Payment permission)

**Request Body:**
```json
{
  "notes": "Customer requested refund"
}
```

**Field Descriptions:**
- `notes` (optional): Catatan untuk refund

**Response Success (200):**
```json
{
  "id": "uuid-payment",
  "status": "refunded",
  "message": "Payment refunded successfully"
}
```

**Response Error (404):**
```json
{
  "message": "Payment not found"
}
```

**Frontend Implementation:**
```javascript
async function refundPayment(paymentId, notes = '') {
  try {
    const response = await fetch(`/api/v1/billing/payments/${paymentId}/refund`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ notes })
    });
    
    if (response.status === 404) {
      throw new Error('Payment not found');
    }
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to refund payment');
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error refunding payment:', error);
    throw error;
  }
}
```

---

## React Components Examples

### Plan Management Component (Admin)
```jsx
import React, { useState, useEffect } from 'react';

function PlanManagement({ currentUser }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingPlan, setEditingPlan] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Check if user is Super Admin
  const isSuperAdmin = currentUser?.isSuperAdmin === true;

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/billing/plans', {
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) throw new Error('Failed to fetch plans');
      
      const data = await response.json();
      setPlans(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (planId, planName) => {
    if (!isSuperAdmin) {
      alert('Only Super Admins can delete plans');
      return;
    }

    if (!window.confirm(`Are you sure you want to deactivate "${planName}"?`)) return;
    
    try {
      const response = await fetch(`/api/v1/billing/plans/${planId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 403) {
        alert('Forbidden: Super Admin access required');
        return;
      }

      if (response.status === 400) {
        const error = await response.json();
        alert(error.message);
        return;
      }
      
      if (!response.ok) throw new Error('Failed to delete plan');
      
      alert('Plan deactivated successfully!');
      fetchPlans();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleToggleActive = async (plan) => {
    if (!isSuperAdmin) {
      alert('Only Super Admins can update plans');
      return;
    }

    try {
      const response = await fetch(`/api/v1/billing/plans/${plan.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: !plan.isActive })
      });
      
      if (response.status === 403) {
        alert('Forbidden: Super Admin access required');
        return;
      }

      if (!response.ok) throw new Error('Failed to update plan');
      
      fetchPlans();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  if (loading) return <div>Loading plans...</div>;
  if (error) return <div>Error: {error}</div>;

  // If not Super Admin, show read-only view
  if (!isSuperAdmin) {
    return (
      <div className="plan-management">
        <h2>Subscription Plans</h2>
        <p className="warning">⚠️ You do not have permission to manage plans. Super Admin access required.</p>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Price</th>
              <th>Duration (days)</th>
              <th>Max Users</th>
              <th>Max Members</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {plans.map(plan => (
              <tr key={plan.id}>
                <td>{plan.name}</td>
                <td>${plan.price}</td>
                <td>{plan.duration}</td>
                <td>{plan.maxUsers}</td>
                <td>{plan.maxMembers || 'Unlimited'}</td>
                <td>
                  <span className={`status ${plan.isActive ? 'active' : 'inactive'}`}>
                    {plan.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="plan-management">
      <div className="header">
        <h2>Subscription Plan Management</h2>
        <button onClick={() => setShowCreateForm(true)}>
          Create New Plan
        </button>
      </div>

      {showCreateForm && (
        <PlanForm
          onSuccess={() => {
            setShowCreateForm(false);
            fetchPlans();
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {editingPlan && (
        <PlanForm
          plan={editingPlan}
          onSuccess={() => {
            setEditingPlan(null);
            fetchPlans();
          }}
          onCancel={() => setEditingPlan(null)}
        />
      )}

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Price</th>
            <th>Duration (days)</th>
            <th>Max Users</th>
            <th>Max Members</th>
            <th>Status</th>
            <th>Sort Order</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {plans.map(plan => (
            <tr key={plan.id} className={!plan.isActive ? 'inactive' : ''}>
              <td>{plan.name}</td>
              <td>${plan.price}</td>
              <td>{plan.duration}</td>
              <td>{plan.maxUsers}</td>
              <td>{plan.maxMembers || 'Unlimited'}</td>
              <td>
                <span className={`status ${plan.isActive ? 'active' : 'inactive'}`}>
                  {plan.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td>{plan.sortOrder}</td>
              <td>
                <button onClick={() => setEditingPlan(plan)}>Edit</button>
                <button onClick={() => handleToggleActive(plan)}>
                  {plan.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button onClick={() => handleDelete(plan.id, plan.name)} className="danger">
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PlanForm({ plan, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    name: plan?.name || '',
    description: plan?.description || '',
    price: plan?.price || '',
    duration: plan?.duration || 30,
    maxUsers: plan?.maxUsers || 1,
    maxMembers: plan?.maxMembers || '',
    sortOrder: plan?.sortOrder || 0,
    features: plan?.features || {}
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = plan 
        ? `/api/v1/billing/plans/${plan.id}`
        : '/api/v1/billing/plans';
      
      const method = plan ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          maxMembers: formData.maxMembers || null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to ${plan ? 'update' : 'create'} plan`);
      }

      alert(`Plan ${plan ? 'updated' : 'created'} successfully!`);
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="plan-form-modal">
      <div className="plan-form">
        <h3>{plan ? 'Edit Plan' : 'Create New Plan'}</h3>
        
        {error && <div className="error">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name:</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Description:</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows="3"
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Price:</label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Duration (days):</label>
              <input
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                required
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Max Users:</label>
              <input
                type="number"
                value={formData.maxUsers}
                onChange={(e) => setFormData({ ...formData, maxUsers: e.target.value })}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Max Members (empty = unlimited):</label>
              <input
                type="number"
                value={formData.maxMembers}
                onChange={(e) => setFormData({ ...formData, maxMembers: e.target.value })}
              />
            </div>
          </div>
          
          <div className="form-group">
            <label>Sort Order:</label>
            <input
              type="number"
              value={formData.sortOrder}
              onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })}
            />
          </div>
          
          <div className="form-actions">
            <button type="submit" disabled={loading}>
              {loading ? 'Saving...' : (plan ? 'Update Plan' : 'Create Plan')}
            </button>
            <button type="button" onClick={onCancel}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PlanManagement;
```

---

### Subscription Plans Component
```jsx
import React, { useState, useEffect } from 'react';

function SubscriptionPlans({ onSelectPlan }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    limit: 10
  });
  const [filters, setFilters] = useState({
    search: '',
    sortBy: 'sortOrder',
    sortOrder: 'ASC',
    isActive: 'true'
  });

  useEffect(() => {
    fetchPlans();
  }, [pagination.currentPage, filters]);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: pagination.currentPage.toString(),
        limit: pagination.limit.toString(),
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        isActive: filters.isActive
      });

      if (filters.search) {
        params.append('search', filters.search);
      }

      const response = await fetch(`/api/v1/billing/plans?${params.toString()}`, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) throw new Error('Failed to fetch plans');
      
      const result = await response.json();
      setPlans(result.data);
      setPagination(prev => ({
        ...prev,
        totalPages: result.pagination.totalPages,
        totalRecords: result.pagination.totalRecords,
        hasNextPage: result.pagination.hasNextPage,
        hasPrevPage: result.pagination.hasPrevPage
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (searchTerm) => {
    setFilters(prev => ({ ...prev, search: searchTerm }));
    setPagination(prev => ({ ...prev, currentPage: 1 })); // Reset to page 1
  };

  const handleSort = (field) => {
    setFilters(prev => ({
      ...prev,
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === 'ASC' ? 'DESC' : 'ASC'
    }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, currentPage: newPage }));
  };

  if (loading) return <div>Loading plans...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="subscription-plans">
      <h2>Choose Your Plan</h2>
      
      {/* Search Bar */}
      <div className="filters">
        <input
          type="text"
          placeholder="Search plans..."
          value={filters.search}
          onChange={(e) => handleSearch(e.target.value)}
          className="search-input"
        />
        <select
          value={filters.isActive}
          onChange={(e) => setFilters(prev => ({ ...prev, isActive: e.target.value }))}
        >
          <option value="true">Active Only</option>
          <option value="false">Inactive Only</option>
          <option value="all">All Plans</option>
        </select>
      </div>

      {/* Sort Options */}
      <div className="sort-options">
        <button onClick={() => handleSort('price')}>
          Sort by Price {filters.sortBy === 'price' && (filters.sortOrder === 'ASC' ? '↑' : '↓')}
        </button>
        <button onClick={() => handleSort('name')}>
          Sort by Name {filters.sortBy === 'name' && (filters.sortOrder === 'ASC' ? '↑' : '↓')}
        </button>
        <button onClick={() => handleSort('sortOrder')}>
          Sort by Order {filters.sortBy === 'sortOrder' && (filters.sortOrder === 'ASC' ? '↑' : '↓')}
        </button>
      </div>

      {/* Plans Grid */}
      <div className="plans-grid">
        {plans.map(plan => (
          <div key={plan.id} className="plan-card">
            <h3>{plan.name}</h3>
            <p className="price">${plan.price}/month</p>
            <p className="description">{plan.description}</p>
            <ul className="features">
              <li>Max Users: {plan.maxUsers === -1 ? 'Unlimited' : plan.maxUsers}</li>
              <li>Max Members: {plan.maxMembers === -1 ? 'Unlimited' : plan.maxMembers || 'Unlimited'}</li>
              {Object.entries(plan.features || {}).map(([key, value]) => (
                value && <li key={key}>{key}: ✓</li>
              ))}
            </ul>
            <button onClick={() => onSelectPlan(plan)}>
              Select Plan
            </button>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="pagination">
        <div className="pagination-info">
          Showing {plans.length} of {pagination.totalRecords} plans
        </div>
        <div className="pagination-controls">
          <button 
            onClick={() => handlePageChange(pagination.currentPage - 1)}
            disabled={!pagination.hasPrevPage}
          >
            Previous
          </button>
          <span>Page {pagination.currentPage} of {pagination.totalPages}</span>
          <button 
            onClick={() => handlePageChange(pagination.currentPage + 1)}
            disabled={!pagination.hasNextPage}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

export default SubscriptionPlans;
```

---

### Subscription Details Component
```jsx
import React, { useState, useEffect } from 'react';

function SubscriptionDetails({ tenantId }) {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSubscription();
  }, [tenantId]);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/billing/subscriptions/tenant/${tenantId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch subscription');
      
      const data = await response.json();
      setSubscription(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRenew = async () => {
    if (!window.confirm('Are you sure you want to renew this subscription?')) return;
    
    try {
      const response = await fetch(`/api/v1/billing/subscriptions/${subscription.id}/renew`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ paymentMethod: 'credit_card' })
      });
      
      if (!response.ok) throw new Error('Failed to renew subscription');
      
      alert('Subscription renewed successfully!');
      fetchSubscription();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this subscription?')) return;
    
    try {
      const response = await fetch(`/api/v1/billing/subscriptions/${subscription.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to cancel subscription');
      
      alert('Subscription cancelled successfully!');
      fetchSubscription();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!subscription) return <div>No active subscription</div>;

  return (
    <div className="subscription-details">
      <h2>Your Subscription</h2>
      <div className="details">
        <p><strong>Plan:</strong> {subscription.plan?.name}</p>
        <p><strong>Status:</strong> <span className={`status-${subscription.status}`}>{subscription.status}</span></p>
        <p><strong>Price:</strong> ${subscription.price}/month</p>
        <p><strong>Start Date:</strong> {new Date(subscription.startDate).toLocaleDateString()}</p>
        <p><strong>End Date:</strong> {new Date(subscription.endDate).toLocaleDateString()}</p>
        <p><strong>Auto Renew:</strong> {subscription.autoRenew ? 'Yes' : 'No'}</p>
      </div>
      <div className="actions">
        <button onClick={handleRenew} disabled={subscription.status === 'cancelled'}>
          Renew Subscription
        </button>
        <button onClick={handleCancel} className="danger" disabled={subscription.status === 'cancelled'}>
          Cancel Subscription
        </button>
      </div>
    </div>
  );
}

export default SubscriptionDetails;
```

---

### Invoice List Component
```jsx
import React, { useState, useEffect } from 'react';

function InvoiceList({ tenantId }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchInvoices();
  }, [tenantId]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const url = tenantId 
        ? `/api/v1/billing/invoices?tenantId=${tenantId}`
        : '/api/v1/billing/invoices';
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch invoices');
      
      const data = await response.json();
      setInvoices(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusClass = (status) => {
    const classes = {
      'paid': 'status-success',
      'issued': 'status-info',
      'overdue': 'status-danger',
      'cancelled': 'status-muted',
      'draft': 'status-warning'
    };
    return classes[status] || '';
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="invoice-list">
      <h2>Invoices</h2>
      <table>
        <thead>
          <tr>
            <th>Invoice #</th>
            <th>Issue Date</th>
            <th>Due Date</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map(invoice => (
            <tr key={invoice.id}>
              <td>{invoice.invoiceNumber}</td>
              <td>{new Date(invoice.issueDate).toLocaleDateString()}</td>
              <td>{new Date(invoice.dueDate).toLocaleDateString()}</td>
              <td>${invoice.total}</td>
              <td>
                <span className={getStatusClass(invoice.status)}>
                  {invoice.status}
                </span>
              </td>
              <td>
                <button onClick={() => window.open(`/invoices/${invoice.id}`, '_blank')}>
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default InvoiceList;
```

---

### Payment Form Component
```jsx
import React, { useState } from 'react';

function PaymentForm({ invoiceId, subscriptionId, amount, onSuccess }) {
  const [formData, setFormData] = useState({
    paymentMethod: 'credit_card',
    transactionId: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/billing/payments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          invoiceId,
          subscriptionId,
          amount,
          paymentMethod: formData.paymentMethod,
          transactionId: formData.transactionId,
          paymentType: subscriptionId ? 'subscription' : 'membership'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to process payment');
      }

      const result = await response.json();
      
      // Reset form
      setFormData({ paymentMethod: 'credit_card', transactionId: '' });
      
      // Call success callback
      if (onSuccess) onSuccess(result.payment);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="payment-form">
      <h3>Process Payment</h3>
      
      {error && <div className="error">{error}</div>}
      
      <div className="form-group">
        <label>Amount:</label>
        <input type="text" value={`$${amount}`} disabled />
      </div>
      
      <div className="form-group">
        <label>Payment Method:</label>
        <select
          value={formData.paymentMethod}
          onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
          required
        >
          <option value="credit_card">Credit Card</option>
          <option value="debit_card">Debit Card</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="cash">Cash</option>
          <option value="check">Check</option>
        </select>
      </div>
      
      <div className="form-group">
        <label>Transaction ID (Optional):</label>
        <input
          type="text"
          value={formData.transactionId}
          onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
          placeholder="TXN-123456789"
        />
      </div>
      
      <button type="submit" disabled={loading}>
        {loading ? 'Processing...' : 'Process Payment'}
      </button>
    </form>
  );
}

export default PaymentForm;
```

---

## Error Handling

### Common Error Responses

**401 Unauthorized:**
```json
{
  "message": "Unauthorized"
}
```
Token tidak valid atau sudah expired.

**403 Forbidden:**
```json
{
  "message": "Forbidden"
}
```
User tidak memiliki permission untuk mengakses resource.

**404 Not Found:**
```json
{
  "message": "Subscription not found"
}
```
Resource dengan ID tersebut tidak ditemukan.

**500 Internal Server Error:**
```json
{
  "message": "Failed to process payment"
}
```
Terjadi error di server.

---

## Data Models Reference

### Subscription Plan
```typescript
{
  id: string (UUID)
  name: string
  description: string
  price: decimal(10,2)
  duration: number // days
  maxUsers: number
  maxMembers: number
  features: object
  isActive: boolean
  sortOrder: number
  createdAt: datetime
  updatedAt: datetime
}
```

### Subscription
```typescript
{
  id: string (UUID)
  tenantId: string (UUID)
  planId: string (UUID)
  startDate: datetime
  endDate: datetime
  status: 'active' | 'expired' | 'cancelled' | 'pending'
  autoRenew: boolean
  price: decimal(10,2)
  paymentMethod: string
  notes: string
  createdAt: datetime
  updatedAt: datetime
}
```

### Invoice
```typescript
{
  id: string (UUID)
  tenantId: string (UUID)
  subscriptionId: string (UUID)
  invoiceNumber: string
  issueDate: datetime
  dueDate: datetime
  amount: decimal(10,2)
  tax: decimal(10,2)
  total: decimal(10,2)
  status: 'draft' | 'issued' | 'paid' | 'overdue' | 'cancelled'
  items: array
  notes: string
  createdAt: datetime
  updatedAt: datetime
}
```

### Payment
```typescript
{
  id: string (UUID)
  tenantId: string (UUID)
  invoiceId: string (UUID)
  subscriptionId: string (UUID)
  membershipId: string (UUID)
  amount: decimal(10,2)
  paymentMethod: string
  paymentType: string
  transactionId: string
  status: 'completed' | 'pending' | 'failed' | 'refunded'
  paymentDate: datetime
  processedBy: string (UUID)
  notes: string
  createdAt: datetime
  updatedAt: datetime
}
```

---

## Best Practices

### 1. Handle Subscription Expiry
```javascript
function isSubscriptionExpired(subscription) {
  const endDate = new Date(subscription.endDate);
  const now = new Date();
  return now > endDate;
}

function getDaysUntilExpiry(subscription) {
  const endDate = new Date(subscription.endDate);
  const now = new Date();
  const diffTime = endDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}
```

### 2. Format Currency
```javascript
function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
}
```

### 3. Payment Status Handling
```javascript
function getPaymentStatusColor(status) {
  const colors = {
    'completed': 'green',
    'pending': 'orange',
    'failed': 'red',
    'refunded': 'gray'
  };
  return colors[status] || 'gray';
}
```

### 4. Invoice Status Automation
```javascript
function checkInvoiceOverdue(invoice) {
  const dueDate = new Date(invoice.dueDate);
  const now = new Date();
  
  if (invoice.status === 'issued' && now > dueDate) {
    // Update invoice status to overdue
    updateInvoiceStatus(invoice.id, 'overdue');
  }
}
```

---

## Recommendations for Backend Improvements

### ✅ Already Implemented
1. **Subscription Plan Management (CRUD)** - Complete endpoints untuk manage plans

### 🔄 Additional Improvements Needed

### 1. **Get All Subscriptions Endpoint**
```javascript
// GET /api/v1/billing/subscriptions
// Untuk admin melihat semua subscriptions dengan filter
// Query params: tenantId, status, planId
```

### 2. **Webhook untuk Payment Gateway Integration**
```javascript
// POST /api/v1/billing/webhooks/payment
// Untuk menerima callback dari payment gateway (Stripe, PayPal, etc.)
```

### 3. **Subscription Usage Tracking**
```javascript
// GET /api/v1/billing/subscriptions/:id/usage
// Untuk tracking penggunaan (jumlah users aktif, members, dll)
```

### 4. **Proration untuk Upgrade/Downgrade Plan**
```javascript
// POST /api/v1/billing/subscriptions/:id/change-plan
// Untuk ganti plan dengan perhitungan proration
```

### 5. **Trial Period Support**
Tambah field di SubscriptionPlan:
- `trialDays`: number
- `trialPrice`: decimal

### 6. **Discount/Coupon System**
```javascript
// POST /api/v1/billing/subscriptions
// Body: { ..., couponCode: "DISCOUNT20" }
```

### 7. **Automated Invoice Generation**
Background job yang otomatis generate invoice saat subscription created/renewed.

### 8. **Payment Receipt/Email**
Kirim email receipt setelah payment berhasil.

### 9. **Subscription Analytics**
```javascript
// GET /api/v1/billing/analytics/revenue
// GET /api/v1/billing/analytics/subscriptions
```

### 10. **Export Invoices to PDF**
```javascript
// GET /api/v1/billing/invoices/:id/pdf
```

---

## Security Considerations

### Super Admin Access Control

**Subscription Plan Management** requires Super Admin privileges:
- Only users with `isSuperAdmin: true` can create, update, or delete subscription plans
- Uses `requireSuperAdmin` middleware for strict access control
- Returns `403 Forbidden` if non-super-admin attempts to access
- All plan management operations are audit logged with user information

```javascript
// Example: Check if user is Super Admin in frontend
function isSuperAdmin(user) {
  return user && user.isSuperAdmin === true;
}

// Conditionally render admin-only features
{isSuperAdmin(currentUser) && (
  <PlanManagementButton />
)}
```

### General Security

1. **PCI Compliance**: Jangan simpan credit card information di database
2. **Payment Gateway**: Gunakan tokenization untuk payment details
3. **Audit Logging**: Semua payment transactions harus ter-log
4. **Encryption**: Sensitive data harus di-encrypt
5. **Rate Limiting**: Implement rate limiting untuk payment endpoints
6. **HTTPS Only**: Semua payment endpoints harus HTTPS
7. **Idempotency**: Implement idempotency untuk prevent duplicate payments

---

## Related Documentation
- [User Management](./USER-MANAGEMENT-FRONTEND.md)
- [Authentication Endpoints](./AUTHENTICATION-ENDPOINTS.md)
- [Role & Permission Management](./ROLE-PERMISSION-MANAGEMENT.md)
- [Transaction Architecture](./TRANSACTION-ARCHITECTURE.md)
