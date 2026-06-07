# PlanFormModal.vue - New Implementation Guide

## Overview
Complete redesign of the subscription plan form modal to support the new 8-category features structure.

## Key Changes

### 1. Form Data Structure
```javascript
formData.value = {
  name: '',
  description: '',
  price: null,
  duration: 30,
  sortOrder: 0,
  isActive: true,
  features: {
    modules: { /* 6 boolean features */ },
    limits: { /* 7 number features, 0=unlimited */ },
    transactions: { /* 5 boolean features */ },
    payments: { /* 6 boolean features */ },
    printing: { /* 4 boolean features */ },
    restaurant: { /* 4 boolean features */ },
    integrations: { /* 5 boolean features */ },
    support: { /* 3 boolean features */ }
  }
}
```

### 2. UI Structure
- **Accordion-based Categories**: Each of the 8 categories in collapsible sections
- **Visual Indicators**: Emojis and feature counts per category
- **Responsive Grid**: 2-column layout for feature checkboxes/inputs
- **Real-time Counts**: Shows enabled features count as user selects

### 3. Category Sections

#### Modules (Checkboxes)
- Gym Management
- Point of Sale (POS)
- Restaurant Management
- Class Scheduling
- Basic Reports
- Advanced Analytics

#### Limits (Number Inputs)
- Max Users (0 = unlimited)
- Max Members (0 = unlimited)
- Max Products (0 = unlimited)
- Max Locations (0 = unlimited)
- Max Printers (0 = unlimited)
- Max Tables (0 = unlimited)
- Max Integrations (0 = unlimited)

#### Transactions (Checkboxes)
- Combined Billing
- Installment Payments
- Voucher System
- Loyalty Points
- Refund Processing

#### Payments (Checkboxes)
- Cash
- Credit Card
- Bank Transfer
- E-Wallet
- QRIS
- Payment Gateway

#### Printing (Checkboxes)
- Thermal Printer Support
- Custom Templates
- Auto Print
- Custom Logo

#### Restaurant (Checkboxes)
- Table Management
- Kitchen Display
- Custom Table Layout
- Touchscreen Mode

#### Integrations (Checkboxes)
- SMS Notifications
- WhatsApp
- Email
- Payment Gateway
- Accounting Software

#### Support (Checkboxes)
- Priority Support
- Dedicated Account Manager
- Custom Development

### 4. Features

#### Real-time Feature Counter
```vue
<div class="badge badge-primary">{{ totalEnabledFeatures }} features enabled</div>
```

#### Category-specific Counters
```vue
<span>📦 Modules ({{ enabledCount.modules }}/6)</span>
```

#### Expandable Categories
```javascript
const expandedCategories = ref({
  modules: true,  // Default expanded
  limits: false,
  // ... others collapsed by default
})
```

### 5. Computed Properties

```javascript
// Count enabled features per category
const enabledCount = computed(() => {
  const counts = {}
  Object.keys(formData.value.features).forEach(category => {
    const features = formData.value.features[category]
    counts[category] = Object.values(features).filter(v => 
      v === true || (typeof v === 'number' && v > 0)
    ).length
  })
  return counts
})

// Total enabled features across all categories
const totalEnabledFeatures = computed(() => {
  return Object.values(enabledCount.value).reduce((sum, count) => sum + count, 0)
})
```

### 6. Backward Compatibility

The submit handler includes backward compatibility fields:

```javascript
const submitData = {
  name: formData.value.name,
  description: formData.value.description,
  price: formData.value.price,
  duration: formData.value.duration,
  sortOrder: formData.value.sortOrder,
  isActive: formData.value.isActive,
  features: formData.value.features,
  // Backward compatibility
  maxUsers: formData.value.features.limits.maxUsers || 0,
  maxMembers: formData.value.features.limits.maxMembers || 0
}
```

### 7. Validation

```javascript
const validateForm = () => {
  errors.value = {}
  
  if (!formData.value.name || formData.value.name.trim() === '') {
    errors.value.name = 'Plan name is required'
  }
  
  if (!formData.value.price || formData.value.price <= 0) {
    errors.value.price = 'Price must be greater than 0'
  }
  
  if (formData.value.duration && formData.value.duration <= 0) {
    errors.value.duration = 'Duration must be greater than 0'
  }
  
  return Object.keys(errors.value).length === 0
}
```

### 8. Data Initialization

When editing, the component intelligently merges existing data with defaults:

```javascript
watch(() => props.plan, (newPlan) => {
  if (newPlan) {
    formData.value = {
      name: newPlan.name || '',
      description: newPlan.description || '',
      price: parseFloat(newPlan.price) || null,
      duration: newPlan.duration || 30,
      sortOrder: newPlan.sortOrder || 0,
      isActive: newPlan.isActive ?? true,
      features: newPlan.features || getDefaultFeatures()
    }
    
    // Ensure all categories exist (merge with defaults)
    const defaultFeatures = getDefaultFeatures()
    Object.keys(defaultFeatures).forEach(category => {
      if (!formData.value.features[category]) {
        formData.value.features[category] = defaultFeatures[category]
      }
    })
  }
}, { immediate: true })
```

## Implementation Steps

1. **Backup old file**:
   ```bash
   cp PlanFormModal.vue PlanFormModal.vue.backup
   ```

2. **Replace with new implementation** (full code in separate file)

3. **Test scenarios**:
   - Create new plan with various feature combinations
   - Edit existing plan
   - Toggle categories
   - Verify submit payload structure
   - Check backward compatibility fields

## UI/UX Improvements

1. **Better Organization**: Features grouped logically
2. **Visual Feedback**: Real-time counters
3. **Reduced Clutter**: Collapsed categories by default
4. **Clearer Labels**: Descriptive feature names
5. **Hint Text**: "0 = unlimited" for limits
6. **Modal Size**: Larger modal (max-w-5xl) for better layout
7. **Scrollable Content**: Overflow handling for many features

## Next Steps

1. Update `plans.vue` to display categorized features
2. Add feature comparison table view
3. Implement feature metadata endpoint integration
4. Add tooltips with feature descriptions
5. Add preset buttons (Basic, Pro, Enterprise templates)

---

**Status**: Implementation ready, awaiting integration
**Date**: November 22, 2025
