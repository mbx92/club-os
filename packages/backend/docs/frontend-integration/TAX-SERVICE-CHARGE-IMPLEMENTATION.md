# Tax & Service Charge Implementation Guide - Frontend

> **Last Updated**: February 17, 2026  
> **Version**: 1.0  
> **Backend Commit**: Tax & service charge auto-calculation

## Overview

Backend sekarang **otomatis menghitung** tax dan service charge berdasarkan tenant settings. Frontend **tidak perlu** menghitung tax/service charge manual lagi - cukup kirim subtotal dan voucher, backend akan handle sisanya.

### Key Changes

✅ **Auto-calculate tax** di semua transaksi (Restaurant, POS, Gym Services)  
✅ **Auto-calculate service charge** di Restaurant orders saja  
✅ **Service charge** di Combined Billing hanya untuk restaurant items  
✅ Frontend hanya kirim items, payment methods, dan voucher code (optional)

---

## 1. Transaction Settings API

### 1.1 Get Tax Configuration

**Endpoint**: `GET /api/v1/transaction-settings/tax`

**Response**:
```json
{
  "success": true,
  "data": {
    "taxEnable": true,
    "taxPercentage": 11,
    "taxType": "percentage"
  }
}
```

### 1.2 Update Tax Configuration

**Endpoint**: `PUT /api/v1/transaction-settings/tax`

**Request Body**:
```json
{
  "enabled": true,
  "rate": 11,
  "type": "percentage"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Tax configuration updated successfully",
  "data": {
    "taxEnable": true,
    "taxPercentage": 11,
    "taxType": "percentage"
  }
}
```

**Validation**:
- `rate`: 0-100 (untuk percentage), any positive number (untuk fixed)
- `type`: `"percentage"` atau `"fixed"`

### 1.3 Get Service Charge Configuration

**Endpoint**: `GET /api/v1/transaction-settings/service-charge`

**Response**:
```json
{
  "success": true,
  "data": {
    "serviceChargeEnable": true,
    "serviceChargePercentage": 5,
    "serviceChargeType": "percentage"
  }
}
```

### 1.4 Update Service Charge Configuration

**Endpoint**: `PUT /api/v1/transaction-settings/service-charge`

**Request Body**:
```json
{
  "enabled": true,
  "rate": 5,
  "type": "percentage"
}
```

---

## 2. Calculation Formula

### Formula Umum (Restaurant)

```
1. subtotal = sum(item prices × quantities)
2. voucherDiscount = discount from voucher
3. subtotalAfterDiscount = subtotal - voucherDiscount
4. serviceCharge = subtotalAfterDiscount × serviceChargeRate% (if enabled)
5. tax = subtotalAfterDiscount × taxRate% (if enabled)
6. totalAmount = subtotalAfterDiscount + serviceCharge + tax
```

**⚠️ IMPORTANT**: Tax dan service charge dihitung PARALEL/INDEPENDEN dari subtotalAfterDiscount, BUKAN berurutan.

### Formula POS/Gym

```
1. subtotal = sum(item prices × quantities)
2. voucherDiscount = discount from voucher
3. subtotalAfterDiscount = subtotal - voucherDiscount
4. serviceCharge = 0 (no service charge for gym/POS)
5. tax = subtotalAfterDiscount × taxRate% (if enabled)
6. totalAmount = subtotalAfterDiscount + tax
```

---

## 3. Restaurant Orders

### 3.1 Create Order (Dine-in/Takeaway/Delivery)

**Endpoint**: `POST /api/v1/restaurant/orders`

**Request Body**:
```json
{
  "orderType": "dine-in",
  "tableId": "uuid-table-id",
  "locationId": "uuid-location-id",
  "customerName": "John Doe",
  "customerPhone": "08123456789",
  "items": [
    {
      "productId": "uuid-product-1",
      "quantity": 2,
      "notes": "Extra spicy"
    },
    {
      "productId": "uuid-product-2",
      "quantity": 1
    }
  ],
  "voucherCode": "WEEKEND10",
  "payments": [
    {
      "method": "cash",
      "amount": 150000
    }
  ],
  "notes": "Customer allergic to peanuts"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "id": "uuid-order-id",
    "transactionNumber": "ORD-20260217-001",
    "orderType": "dine-in",
    "subtotal": 120000,
    "voucherDiscount": 12000,
    "serviceCharge": 5400,
    "tax": 13794,
    "totalAmount": 127194,
    "paidAmount": 150000,
    "changeAmount": 22806,
    "status": "preparing",
    "items": [...],
    "payments": [...]
  }
}
```

**Frontend Calculation (Preview Only)**:

Untuk menampilkan preview total sebelum submit:

```javascript
// Get tenant settings first
const taxConfig = await fetch('/api/v1/transaction-settings/tax');
const serviceChargeConfig = await fetch('/api/v1/transaction-settings/service-charge');

function calculateOrderTotal(items, voucherDiscount = 0) {
  // 1. Calculate subtotal
  const subtotal = items.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);

  // 2. Apply voucher discount
  const subtotalAfterDiscount = subtotal - voucherDiscount;

  // 3. Calculate service charge from subtotalAfterDiscount
  let serviceCharge = 0;
  if (serviceChargeConfig.serviceChargeEnable) {
    if (serviceChargeConfig.serviceChargeType === 'percentage') {
      serviceCharge = (subtotalAfterDiscount * serviceChargeConfig.serviceChargePercentage) / 100;
    } else {
      serviceCharge = serviceChargeConfig.serviceChargePercentage;
    }
  }

  // 4. Calculate tax from subtotalAfterDiscount (NOT including service charge)
  let tax = 0;
  if (taxConfig.taxEnable) {
    if (taxConfig.taxType === 'percentage') {
      tax = (subtotalAfterDiscount * taxConfig.taxPercentage) / 100;
    } else {
      tax = taxConfig.taxPercentage;
    }
  }

  // 5. Calculate total
  const totalAmount = Math.round(subtotalAfterDiscount + serviceCharge + tax);

  return {
    subtotal,
    voucherDiscount,
    subtotalAfterDiscount,
    serviceCharge: Math.round(serviceCharge),
    tax: Math.round(tax),
    totalAmount
  };
}
```

**⚠️ Important**: 
- Preview calculation di frontend hanya untuk UX
- Backend akan recalculate semua nilai
- Gunakan nilai dari response backend untuk display final

### 3.2 Complete Order (Checkout)

**Endpoint**: `PUT /api/v1/restaurant/orders/:orderId/complete`

**Request Body**:
```json
{
  "payments": [
    {
      "method": "cash",
      "amount": 100000
    },
    {
      "method": "debit_card",
      "amount": 50000
    }
  ],
  "voucherCode": "DISCOUNT10",
  "notes": "Paid in full"
}
```

**Response**: Same structure as create order, with `status: "completed"`.

---

## 4. POS Transaction

### 4.1 Create POS Transaction

**Endpoint**: `POST /api/v1/gym/transactions`

**Request Body**:
```json
{
  "customerId": "uuid-member-id",
  "customerType": "member",
  "items": [
    {
      "itemType": "product",
      "itemId": "uuid-product-1",
      "quantity": 2
    }
  ],
  "payments": [
    {
      "method": "cash",
      "amount": 100000
    }
  ],
  "voucherCode": "MEMBER10",
  "notes": "POS sale"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid-transaction-id",
    "transactionNumber": "TRX-20260217-001",
    "subtotal": 80000,
    "voucherDiscount": 8000,
    "serviceCharge": 0,
    "tax": 7920,
    "totalAmount": 79920,
    "status": "completed"
  }
}
```

**Frontend Calculation** (POS - No Service Charge):

```javascript
function calculatePOSTotal(items, voucherDiscount = 0) {
  // 1. Calculate subtotal
  const subtotal = items.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);

  // 2. Apply voucher discount
  const subtotalAfterDiscount = subtotal - voucherDiscount;

  // 3. NO service charge for POS
  const serviceCharge = 0;

  // 4. Calculate tax
  let tax = 0;
  if (taxConfig.taxEnable) {
    if (taxConfig.taxType === 'percentage') {
      tax = (subtotalAfterDiscount * taxConfig.taxPercentage) / 100;
    } else {
      tax = taxConfig.taxPercentage;
    }
  }

  // 5. Calculate total
  const totalAmount = Math.round(subtotalAfterDiscount + tax);

  return {
    subtotal,
    voucherDiscount,
    subtotalAfterDiscount,
    serviceCharge: 0,
    tax: Math.round(tax),
    totalAmount
  };
}
```

---

## 5. Gym Services (Membership/PT/Classes)

### 5.1 Purchase Service

**Endpoint**: `POST /api/v1/gym/active-services/purchase`

**Request Body**:
```json
{
  "memberId": "uuid-member-id",
  "servicePlans": [
    {
      "servicePlanId": "uuid-service-plan-1",
      "startDate": "2026-02-17",
      "assignedTrainerId": "uuid-trainer-id",
      "autoRenew": false
    }
  ],
  "paymentMethods": [
    {
      "method": "transfer",
      "amount": 1110000
    }
  ],
  "voucherCode": "GYM2026",
  "notes": "1 month membership"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Services purchased successfully",
  "data": {
    "transaction": {
      "id": "uuid-transaction-id",
      "transactionNumber": "TRX-20260217-002",
      "subtotal": 1000000,
      "voucherDiscount": 0,
      "tax": 110000,
      "totalAmount": 1110000,
      "status": "completed"
    },
    "activeServices": [...]
  }
}
```

**Note**: Gym services **tidak ada service charge**, hanya tax.

---

## 6. Combined Billing

### 6.1 Create Combined Transaction

**Endpoint**: `POST /api/v1/restaurant/combined-billing`

**Request Body**:
```json
{
  "customerId": "uuid-member-id",
  "customerType": "member",
  "items": [
    {
      "type": "product",
      "productId": "uuid-product-1",
      "quantity": 2
    },
    {
      "type": "service_plan",
      "servicePlanId": "uuid-service-plan-1"
    }
  ],
  "payments": [
    {
      "method": "cash",
      "amount": 1500000
    }
  ],
  "voucherCode": "COMBO20",
  "notes": "Combined purchase"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid-transaction-id",
    "transactionNumber": "TRX-20260217-003",
    "subtotal": 1200000,
    "voucherDiscount": 120000,
    "serviceCharge": 2700,
    "tax": 119097,
    "totalAmount": 1201797,
    "status": "completed"
  }
}
```

**Special Logic**: Service charge **hanya untuk restaurant items**, bukan untuk gym services.

**Frontend Calculation** (Combined Billing):

```javascript
function calculateCombinedTotal(items, voucherDiscount = 0) {
  // 1. Separate restaurant and gym items
  let restaurantSubtotal = 0;
  let gymSubtotal = 0;

  items.forEach(item => {
    const itemTotal = item.price * (item.quantity || 1);
    if (item.type === 'product') {
      restaurantSubtotal += itemTotal;
    } else {
      gymSubtotal += itemTotal;
    }
  });

  const subtotal = restaurantSubtotal + gymSubtotal;

  // 2. Apply voucher discount proportionally
  const voucherRatio = voucherDiscount / subtotal;
  const restaurantDiscount = restaurantSubtotal * voucherRatio;
  const restaurantAfterDiscount = restaurantSubtotal - restaurantDiscount;

  const subtotalAfterDiscount = subtotal - voucherDiscount;

  // 3. Service charge ONLY for restaurant items (calculated from restaurant subtotal)
  let serviceCharge = 0;
  if (serviceChargeConfig.serviceChargeEnable && restaurantAfterDiscount > 0) {
    if (serviceChargeConfig.serviceChargeType === 'percentage') {
      serviceCharge = (restaurantAfterDiscount * serviceChargeConfig.serviceChargePercentage) / 100;
    } else {
      serviceCharge = serviceChargeConfig.serviceChargePercentage;
    }
  }

  // 4. Tax for all items (from subtotalAfterDiscount, NOT including service charge)
  let tax = 0;
  if (taxConfig.taxEnable) {
    if (taxConfig.taxType === 'percentage') {
      tax = (subtotalAfterDiscount * taxConfig.taxPercentage) / 100;
    } else {
      tax = taxConfig.taxPercentage;
    }
  }

  // 5. Total
  const totalAmount = Math.round(subtotalAfterDiscount + serviceCharge + tax);

  return {
    subtotal,
    restaurantSubtotal,
    gymSubtotal,
    voucherDiscount,
    subtotalAfterDiscount,
    serviceCharge: Math.round(serviceCharge),
    tax: Math.round(tax),
    totalAmount
  };
}
```

---

## 7. Voucher Validation

### 7.1 Validate Voucher Before Apply

**Endpoint**: `POST /api/v1/restaurant/orders/validate-voucher`

**Request Body**:
```json
{
  "voucherCode": "WEEKEND10",
  "subtotal": 100000
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "voucher": {
      "code": "WEEKEND10",
      "type": "percentage",
      "value": 10,
      "minPurchaseAmount": 50000,
      "maxDiscountAmount": 20000
    },
    "discount": 10000,
    "valid": true
  }
}
```

---

## 8. UI Components Examples

### 8.1 Order Summary Component (React)

```jsx
import React, { useEffect, useState } from 'react';

function OrderSummary({ items, voucherDiscount = 0 }) {
  const [settings, setSettings] = useState({
    taxConfig: null,
    serviceChargeConfig: null
  });

  useEffect(() => {
    // Load tenant settings
    Promise.all([
      fetch('/api/v1/transaction-settings/tax').then(r => r.json()),
      fetch('/api/v1/transaction-settings/service-charge').then(r => r.json())
    ]).then(([tax, service]) => {
      setSettings({
        taxConfig: tax.data,
        serviceChargeConfig: service.data
      });
    });
  }, []);

  const calculateTotal = () => {
    if (!settings.taxConfig || !settings.serviceChargeConfig) {
      return { subtotal: 0, tax: 0, serviceCharge: 0, total: 0 };
    }

    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const subtotalAfterDiscount = subtotal - voucherDiscount;

    // Service charge (calculated from subtotalAfterDiscount)
    let serviceCharge = 0;
    if (settings.serviceChargeConfig.serviceChargeEnable) {
      if (settings.serviceChargeConfig.serviceChargeType === 'percentage') {
        serviceCharge = (subtotalAfterDiscount * settings.serviceChargeConfig.serviceChargePercentage) / 100;
      } else {
        serviceCharge = settings.serviceChargeConfig.serviceChargePercentage;
      }
    }

    // Tax (from subtotalAfterDiscount, NOT including service charge)
    let tax = 0;
    if (settings.taxConfig.taxEnable) {
      if (settings.taxConfig.taxType === 'percentage') {
        tax = (subtotalAfterDiscount * settings.taxConfig.taxPercentage) / 100;
      } else {
        tax = settings.taxConfig.taxPercentage;
      }
    }

    return {
      subtotal,
      voucherDiscount,
      subtotalAfterDiscount,
      serviceCharge: Math.round(serviceCharge),
      tax: Math.round(tax),
      total: Math.round(subtotalAfterDiscount + serviceCharge + tax)
    };
  };

  const totals = calculateTotal();

  return (
    <div className="order-summary">
      <div className="summary-row">
        <span>Subtotal</span>
        <span>Rp {totals.subtotal.toLocaleString()}</span>
      </div>
      
      {voucherDiscount > 0 && (
        <div className="summary-row discount">
          <span>Discount (Voucher)</span>
          <span>- Rp {voucherDiscount.toLocaleString()}</span>
        </div>
      )}

      {totals.serviceCharge > 0 && (
        <div className="summary-row">
          <span>Service Charge ({settings.serviceChargeConfig.serviceChargePercentage}%)</span>
          <span>Rp {totals.serviceCharge.toLocaleString()}</span>
        </div>
      )}

      {totals.tax > 0 && (
        <div className="summary-row">
          <span>Tax ({settings.taxConfig.taxPercentage}%)</span>
          <span>Rp {totals.tax.toLocaleString()}</span>
        </div>
      )}

      <div className="summary-row total">
        <span><strong>Total</strong></span>
        <span><strong>Rp {totals.total.toLocaleString()}</strong></span>
      </div>
    </div>
  );
}
```

### 8.2 Settings Page Component (Vue 3)

```vue
<template>
  <div class="tax-settings">
    <h3>Tax Configuration</h3>
    
    <div class="form-group">
      <label>
        <input type="checkbox" v-model="taxConfig.enabled" />
        Enable Tax
      </label>
    </div>

    <div class="form-group" v-if="taxConfig.enabled">
      <label>Tax Rate (%)</label>
      <input 
        type="number" 
        v-model.number="taxConfig.rate" 
        min="0" 
        max="100"
        step="0.01"
      />
    </div>

    <div class="form-group" v-if="taxConfig.enabled">
      <label>Tax Type</label>
      <select v-model="taxConfig.type">
        <option value="percentage">Percentage</option>
        <option value="fixed">Fixed Amount</option>
      </select>
    </div>

    <h3>Service Charge Configuration</h3>
    
    <div class="form-group">
      <label>
        <input type="checkbox" v-model="serviceChargeConfig.enabled" />
        Enable Service Charge (Restaurant Only)
      </label>
    </div>

    <div class="form-group" v-if="serviceChargeConfig.enabled">
      <label>Service Charge Rate (%)</label>
      <input 
        type="number" 
        v-model.number="serviceChargeConfig.rate" 
        min="0" 
        max="100"
        step="0.01"
      />
    </div>

    <button @click="saveSettings" class="btn-primary">
      Save Settings
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const taxConfig = ref({
  enabled: false,
  rate: 11,
  type: 'percentage'
});

const serviceChargeConfig = ref({
  enabled: false,
  rate: 5,
  type: 'percentage'
});

onMounted(async () => {
  // Load current settings
  const [taxRes, serviceRes] = await Promise.all([
    axios.get('/api/v1/transaction-settings/tax'),
    axios.get('/api/v1/transaction-settings/service-charge')
  ]);

  taxConfig.value = {
    enabled: taxRes.data.data.taxEnable,
    rate: taxRes.data.data.taxPercentage,
    type: taxRes.data.data.taxType
  };

  serviceChargeConfig.value = {
    enabled: serviceRes.data.data.serviceChargeEnable,
    rate: serviceRes.data.data.serviceChargePercentage,
    type: serviceRes.data.data.serviceChargeType
  };
});

async function saveSettings() {
  try {
    await Promise.all([
      axios.put('/api/v1/transaction-settings/tax', {
        enabled: taxConfig.value.enabled,
        rate: taxConfig.value.rate,
        type: taxConfig.value.type
      }),
      axios.put('/api/v1/transaction-settings/service-charge', {
        enabled: serviceChargeConfig.value.enabled,
        rate: serviceChargeConfig.value.rate,
        type: serviceChargeConfig.value.type
      })
    ]);

    alert('Settings saved successfully!');
  } catch (error) {
    alert('Failed to save settings: ' + error.message);
  }
}
</script>
```

---

## 9. Testing Checklist

### 9.1 Restaurant Module

- [ ] Create dine-in order without voucher
- [ ] Create dine-in order with voucher
- [ ] Create takeaway order with payment
- [ ] Complete order with split payment
- [ ] Verify tax calculation
- [ ] Verify service charge calculation
- [ ] Test with tax disabled
- [ ] Test with service charge disabled

### 9.2 POS Module

- [ ] Create transaction without voucher
- [ ] Create transaction with voucher
- [ ] Verify tax calculation
- [ ] Verify service charge = 0
- [ ] Test with tax disabled

### 9.3 Gym Services

- [ ] Purchase single service plan
- [ ] Purchase multiple service plans
- [ ] Purchase with voucher
- [ ] Verify tax calculation
- [ ] Verify service charge = 0

### 9.4 Combined Billing

- [ ] Purchase restaurant + gym items
- [ ] Verify service charge only on restaurant items
- [ ] Verify tax on all items
- [ ] Test with voucher
- [ ] Test restaurant-only items
- [ ] Test gym-only items

### 9.5 Settings

- [ ] Get current tax settings
- [ ] Update tax rate
- [ ] Enable/disable tax
- [ ] Get current service charge settings
- [ ] Update service charge rate
- [ ] Enable/disable service charge

---

## 10. Common Issues & Solutions

### Issue 1: Frontend calculation doesn't match backend

**Solution**: Backend always recalculates. Use backend response values for final display. Frontend calculation is only for preview.

### Issue 2: Service charge applied to gym items in combined billing

**Solution**: Check backend implementation. Service charge should only apply to restaurant items (`type: 'product'`).

### Issue 3: Rounding differences

**Solution**: Always use `Math.round()` after each calculation step. Backend uses same rounding method.

### Issue 4: Tax calculated from wrong base

**Solution**: Tax dan service charge harus dihitung INDEPENDEN/PARALEL dari subtotalAfterDiscount, bukan berurutan.

**Correct Formula**:
```javascript
const subtotalAfterDiscount = subtotal - voucherDiscount;
const serviceCharge = subtotalAfterDiscount * serviceChargeRate / 100;  // dari subtotal saja
const tax = subtotalAfterDiscount * taxRate / 100;                      // dari subtotal saja (bukan dari subtotal + service)
const total = subtotalAfterDiscount + serviceCharge + tax;
```

**Wrong Formula**:
```javascript
// ❌ WRONG - tax from (subtotal + service)
const tax = (subtotalAfterDiscount + serviceCharge) * taxRate / 100;
```

---

## 11. Migration Notes

### From Manual Calculation to Auto-Calculation

**Before** (Frontend sends tax/service charge):
```json
{
  "items": [...],
  "subtotal": 100000,
  "tax": 11000,
  "serviceCharge": 5000,
  "totalAmount": 116000
}
```

**After** (Backend calculates everything):
```json
{
  "items": [...],
  "voucherCode": "DISCOUNT10"
}
```

**What to Remove**:
- ❌ Manual tax calculation in frontend
- ❌ Manual service charge calculation
- ❌ Sending `tax` field in request
- ❌ Sending `serviceCharge` field in request
- ❌ Sending `totalAmount` (calculated by backend)

**What to Keep**:
- ✅ Preview calculation for UX (before submit)
- ✅ Getting tax/service charge settings
- ✅ Displaying breakdown in UI

---

## 12. Support

For backend issues or questions:
- Check backend logs: `logs/error.log`
- API documentation: `docs/frontend-integration/`
- Backend developer: [Your contact]

For frontend implementation help:
- React examples: See section 8.1
- Vue 3 examples: See section 8.2
- Calculation logic: See section 2

---

**End of Documentation**
