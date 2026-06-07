# 🎨 Restaurant Module - UI/UX Flow Design

**Version:** 1.0  
**Last Updated:** December 1, 2025  
**Status:** 📐 Design Reference

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Design System](#design-system)
3. [User Flows](#user-flows)
4. [Page Layouts](#page-layouts)
5. [Component Patterns](#component-patterns)
6. [Mobile Responsive Design](#mobile-responsive-design)
7. [Accessibility Guidelines](#accessibility-guidelines)

---

## 🎯 Overview

This document provides comprehensive UI/UX design guidance for the Restaurant Module, including user flows, page layouts, component patterns, and DaisyUI styling conventions.

### Design Principles

1. **Consistency** - Use DaisyUI components uniformly across all pages
2. **Efficiency** - Optimize workflows for fast-paced restaurant operations
3. **Clarity** - Clear visual hierarchy and intuitive navigation
4. **Responsiveness** - Mobile-first design for tablet POS systems
5. **Accessibility** - WCAG 2.1 AA compliance

---

## 🎨 Design System

### Color Palette (DaisyUI Theme)

```css
/* Primary Actions */
primary: hsl(var(--p))        /* Main actions, CTA buttons */
secondary: hsl(var(--s))      /* Secondary actions */
accent: hsl(var(--a))         /* Highlights, badges */

/* Semantic Colors */
success: hsl(var(--su))       /* Success states, positive actions */
warning: hsl(var(--wa))       /* Warnings, pending states */
error: hsl(var(--er))         /* Errors, destructive actions */
info: hsl(var(--in))          /* Information, neutral states */

/* Base Colors */
base-100: hsl(var(--b1))      /* Background */
base-200: hsl(var(--b2))      /* Slightly darker background */
base-300: hsl(var(--b3))      /* Borders, dividers */
base-content: hsl(var(--bc))  /* Text color */
```

### Typography

```css
/* Headings */
h1: text-3xl font-bold        /* Page titles */
h2: text-2xl font-bold        /* Section titles */
h3: text-xl font-semibold     /* Subsection titles */
h4: text-lg font-semibold     /* Card titles */

/* Body Text */
body: text-base               /* Default text */
small: text-sm                /* Secondary text */
tiny: text-xs                 /* Hints, labels */

/* Font Weights */
normal: font-normal (400)
medium: font-medium (500)
semibold: font-semibold (600)
bold: font-bold (700)
```

### Spacing Scale (Tailwind)

```
0.5 = 0.125rem (2px)
1   = 0.25rem  (4px)
2   = 0.5rem   (8px)
3   = 0.75rem  (12px)
4   = 1rem     (16px)
6   = 1.5rem   (24px)
8   = 2rem     (32px)
12  = 3rem     (48px)
16  = 4rem     (64px)
```

### Icon Library

**Tabler Icons** - Consistent icon set across all pages

```vue
import { 
  IconShoppingCart, IconPlus, IconMinus, IconTrash,
  IconReceipt, IconPrinter, IconCash, IconCreditCard,
  IconCheck, IconX, IconEdit, IconSearch, IconFilter
} from '@tabler/icons-vue'
```

**Icon Sizes:**
- Small: `w-4 h-4` (16px)
- Medium: `w-5 h-5` (20px)
- Large: `w-6 h-6` (24px)
- XLarge: `w-8 h-8` (32px)

---

## 🔄 User Flows

### 1. POS Order Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        POS Order Flow                            │
└─────────────────────────────────────────────────────────────────┘

Start
  │
  ├─→ [Select Order Type]
  │     ├─→ Dine-in → [Select Table]
  │     ├─→ Takeaway → Skip table
  │     └─→ Delivery → [Enter Address]
  │
  ├─→ [Optional: Customer Info]
  │     ├─→ Search existing customer
  │     └─→ Enter new customer
  │
  ├─→ [Select Location/Branch]
  │
  ├─→ [Browse Products]
  │     ├─→ Filter by category
  │     ├─→ Search by name
  │     └─→ View product details
  │
  ├─→ [Add to Cart]
  │     ├─→ Specify quantity
  │     ├─→ Add notes
  │     └─→ Select variants
  │
  ├─→ [Review Cart]
  │     ├─→ Adjust quantities
  │     ├─→ Remove items
  │     └─→ Add more items
  │
  ├─→ [Apply Voucher] (Optional)
  │     ├─→ Enter code
  │     ├─→ Validate
  │     └─→ Apply discount
  │
  ├─→ [Select Payment Method(s)]
  │     ├─→ Cash
  │     ├─→ Card
  │     ├─→ E-wallet
  │     └─→ Split payment
  │
  ├─→ [Confirm Payment]
  │     ├─→ Calculate change
  │     └─→ Process transaction
  │
  └─→ [Complete Order]
        ├─→ Print receipt
        ├─→ Print kitchen ticket
        ├─→ Send to queue/kitchen
        └─→ Reset for next order

Success!
```

### 2. Kitchen Display Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Kitchen Display Flow                          │
└─────────────────────────────────────────────────────────────────┘

Start (Auto-refresh every 5s)
  │
  ├─→ [View Pending Orders]
  │     ├─→ Sorted by time (oldest first)
  │     ├─→ Color-coded by waiting time
  │     │     ├─→ Green: < 10 min
  │     │     ├─→ Yellow: 10-20 min
  │     │     └─→ Red: > 20 min
  │     └─→ Audio alert for new orders
  │
  ├─→ [Select Order to Prepare]
  │     └─→ View order details
  │           ├─→ Table/order number
  │           ├─→ Customer name
  │           ├─→ Items with quantities
  │           └─→ Special notes
  │
  ├─→ [Mark Items as Preparing]
  │     └─→ Status → "Preparing"
  │
  ├─→ [Complete Items]
  │     └─→ Mark items as "Ready"
  │
  ├─→ [Complete Order]
  │     ├─→ All items ready
  │     ├─→ Notify staff
  │     └─→ Remove from kitchen display
  │
  └─→ Loop back to pending orders

Continuous monitoring
```

### 3. Queue Management Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   Queue Management Flow                          │
└─────────────────────────────────────────────────────────────────┘

Customer Side (Public Display)
  │
  ├─→ [View Queue Status]
  │     ├─→ Current queue number
  │     ├─→ Estimated wait time
  │     └─→ Queue position
  │
  └─→ [Wait for Call]
        ├─→ Visual: Number highlighted
        ├─→ Audio: Alert sound
        └─→ Auto-refresh display

Staff Side (Management)
  │
  ├─→ [Add to Queue]
  │     ├─→ Enter customer name
  │     ├─→ Enter party size
  │     ├─→ Assign queue number
  │     └─→ Display on screen
  │
  ├─→ [Call Next]
  │     ├─→ Highlight on public display
  │     ├─→ Play audio alert
  │     └─→ Start service timer
  │
  ├─→ [Mark as Seated]
  │     ├─→ Assign table
  │     ├─→ Remove from queue
  │     └─→ Update availability
  │
  └─→ [Handle No-shows]
        ├─→ Skip to next
        ├─→ Mark as missed
        └─→ Update queue

Continuous cycle
```

### 4. Stock Management Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   Stock Management Flow                          │
└─────────────────────────────────────────────────────────────────┘

Daily Operations
  │
  ├─→ [Stock In]
  │     ├─→ Select product
  │     ├─→ Enter quantity
  │     ├─→ Enter unit cost
  │     ├─→ Select supplier
  │     └─→ Save transaction
  │
  ├─→ [Stock Out]
  │     ├─→ Select product
  │     ├─→ Enter quantity
  │     ├─→ Select reason
  │     │     ├─→ Wastage
  │     │     ├─→ Damage
  │     │     └─→ Other
  │     └─→ Save transaction
  │
  ├─→ [Stock Transfer]
  │     ├─→ Select from location
  │     ├─→ Select to location
  │     ├─→ Select products
  │     ├─→ Enter quantities
  │     ├─→ Add notes
  │     └─→ Submit transfer
  │
  ├─→ [Stock Adjustment]
  │     ├─→ Physical count
  │     ├─→ Compare with system
  │     ├─→ Enter actual quantity
  │     ├─→ System calculates difference
  │     └─→ Submit adjustment
  │
  └─→ [View Reports]
        ├─→ Current stock levels
        ├─→ Stock movements
        ├─→ Low stock alerts
        └─→ Product history

Regular monitoring
```

### 5. Combined Billing Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   Combined Billing Flow                          │
└─────────────────────────────────────────────────────────────────┘

Start
  │
  ├─→ [Check Feature Access]
  │     ├─→ If disabled → Show upgrade prompt
  │     └─→ If enabled → Continue
  │
  ├─→ [Select Customer]
  │     ├─→ Search member
  │     └─→ Or enter walk-in info
  │
  ├─→ [Select Membership] (Optional)
  │     ├─→ Choose membership type
  │     ├─→ Select duration
  │     ├─→ Set start date
  │     └─→ Add to cart
  │
  ├─→ [Select Restaurant Products] (Optional)
  │     ├─→ Browse products
  │     ├─→ Add to cart with quantity
  │     └─→ Add notes
  │
  ├─→ [Apply Voucher] (Optional)
  │     ├─→ Enter voucher code
  │     ├─→ Validate for combined total
  │     └─→ Apply discount
  │
  ├─→ [Select Payment Method(s)]
  │     ├─→ Single payment
  │     └─→ Split payment
  │
  ├─→ [Confirm Transaction]
  │     ├─→ Review all items
  │     ├─→ Verify total
  │     └─→ Process payment
  │
  └─→ [Complete Transaction]
        ├─→ Create membership record
        ├─→ Create order record
        ├─→ Link transaction
        ├─→ Print receipt
        └─→ Reset form

Success!
```

---

## 📐 Page Layouts

### 1. POS Page Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  [🏠] Point of Sale                    [🔔] [👤] [⚙️]          │ Header
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────┐ ┌───────────────────────────┐  │
│ │  Order Type: [Dine-in ▾]    │ │   🛒 Cart (3 items)      │  │
│ │  Table: [Table 5 ▾]         │ │                           │  │
│ │  Location: [Main Hall ▾]    │ │  [Product 1]  x2  50,000 │  │
│ ├─────────────────────────────┤ │  [Product 2]  x1  25,000 │  │
│ │  [Search products...]   🔍  │ │  [Product 3]  x1  30,000 │  │
│ ├─────────────────────────────┤ │                           │  │
│ │  Categories:                │ │  ─────────────────────── │  │
│ │  [All] [Food] [Beverage]    │ │  Subtotal:      105,000  │  │
│ │  [Snack] [Dessert]          │ │  Discount:      -10,000  │  │
│ ├─────────────────────────────┤ │  ─────────────────────── │  │
│ │                             │ │  Total:          95,000  │  │
│ │  ┌──────┐ ┌──────┐ ┌──────┐│ │                           │  │
│ │  │ 🍔   │ │ 🍕   │ │ ☕   ││ │  [Apply Voucher]          │  │
│ │  │Burger│ │Pizza │ │Coffee││ │                           │  │
│ │  │25,000│ │45,000│ │15,000││ │  Payment:                 │  │
│ │  └──────┘ └──────┘ └──────┘│ │  [💵 Cash] [💳 Card]     │  │
│ │                             │ │  [📱 E-wallet]            │  │
│ │  ┌──────┐ ┌──────┐ ┌──────┐│ │                           │  │
│ │  │ 🍰   │ │ 🥗   │ │ 🍗   ││ │  [Complete Order] ✓       │  │
│ │  │Cake  │ │Salad │ │Fried ││ │                           │  │
│ │  │30,000│ │35,000│ │40,000││ │                           │  │
│ │  └──────┘ └──────┘ └──────┘│ │                           │  │
│ │                             │ │                           │  │
│ │  [Load more...]             │ │                           │  │
│ └─────────────────────────────┘ └───────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
     70% width (Product Grid)         30% width (Cart)
```

**DaisyUI Components:**
- `card` - Product cards
- `badge` - Category pills, out of stock indicators
- `input` - Search box
- `select` - Dropdowns for table/location
- `btn` - Category filters, action buttons
- `divider` - Section separators

### 2. Kitchen Display Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  🍳 Kitchen Display                    🔄 Auto-refresh: 5s      │ Header
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐           │
│  │ 🟢 Order #12 │ │ 🟡 Order #10 │ │ 🔴 Order #08 │           │
│  │ Table 5      │ │ Table 3      │ │ Table 1      │           │
│  │ 08:45 AM     │ │ 08:30 AM     │ │ 08:15 AM     │           │
│  │ (5 min ago)  │ │ (15 min ago) │ │ (30 min ago) │           │
│  ├──────────────┤ ├──────────────┤ ├──────────────┤           │
│  │ ✓ Burger x2  │ │ ⏳ Pizza x1   │ │ ⏳ Steak x1   │           │
│  │ ⏳ Fries x2   │ │ ⏳ Salad x1   │ │ ⏳ Pasta x2   │           │
│  │ ⏳ Cola x2    │ │ ✓ Juice x2   │ │ ✓ Bread x1   │           │
│  ├──────────────┤ ├──────────────┤ ├──────────────┤           │
│  │ Notes:       │ │ Notes:       │ │ Notes:       │           │
│  │ No onions    │ │ Extra cheese │ │ Well done    │           │
│  ├──────────────┤ ├──────────────┤ ├──────────────┤           │
│  │ [Mark Ready] │ │ [Mark Ready] │ │ [Mark Ready] │           │
│  └──────────────┘ └──────────────┘ └──────────────┘           │
│                                                                 │
│  ┌──────────────┐ ┌──────────────┐                            │
│  │ 🟢 Order #11 │ │ 🟡 Order #09 │                            │
│  │ Takeaway     │ │ Table 7      │                            │
│  │ ...          │ │ ...          │                            │
└─────────────────────────────────────────────────────────────────┘
```

**Color Coding:**
- 🟢 Green: < 10 minutes waiting
- 🟡 Yellow: 10-20 minutes waiting
- 🔴 Red: > 20 minutes waiting (urgent!)

**DaisyUI Components:**
- `card` - Order cards
- `badge` - Status indicators, time badges
- `btn` - Action buttons
- `alert` - Urgent orders

### 3. Queue Display Layout (Public)

```
┌─────────────────────────────────────────────────────────────────┐
│                    🏢 Restaurant Queue                          │ Header
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                     NOW SERVING                                 │
│                                                                 │
│                    ┌─────────────┐                             │
│                    │             │                             │
│                    │     A12     │                             │
│                    │             │                             │
│                    └─────────────┘                             │
│                     (Font: 120px)                              │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  NEXT IN LINE:                                                  │
│                                                                 │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐          │
│  │   A13   │  │   A14   │  │   A15   │  │   A16   │          │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘          │
│   (60px)       (60px)       (60px)       (60px)               │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Estimated wait time: 15 minutes                               │
│  People in queue: 8                                            │
└─────────────────────────────────────────────────────────────────┘
```

**Features:**
- Large, readable fonts
- High contrast colors
- Auto-refresh every 2 seconds
- Audio alert when number changes

### 4. Reports Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  📊 Reports                           [📅 Date Range] [⬇️ Export]│ Header
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────────────┐ ┌────────────────────┐ ┌─────────────┐│
│  │ 💰 Today's Revenue │ │ 📦 Orders Today    │ │ 💵 Avg Order││
│  │                    │ │                    │ │             ││
│  │   Rp 2,450,000     │ │        48          │ │  Rp 51,042  ││
│  │   ↑ 12% vs yday    │ │   ↑ 5 vs yday      │ │ ↓ 2% vs yday││
│  └────────────────────┘ └────────────────────┘ └─────────────┘│
├─────────────────────────────────────────────────────────────────┤
│  Sales Trend                                                    │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                                                ___         │ │
│  │                                           ____/   \        │ │
│  │                                      ____/         \___    │ │
│  │                                 ____/                  \   │ │
│  │                            ____/                           │ │
│  │  ─────────────────────────────────────────────────────────│ │
│  │   Mon   Tue   Wed   Thu   Fri   Sat   Sun               │ │
│  └───────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────┐ ┌───────────────────────────┐  │
│  │ 🏆 Top Products           │ │ 📊 Payment Methods        │  │
│  │                           │ │                           │  │
│  │  1. Burger        48 sold │ │  💵 Cash        60%       │  │
│  │  2. Pizza         35 sold │ │  💳 Card        25%       │  │
│  │  3. Coffee        30 sold │ │  📱 E-wallet    15%       │  │
│  │  4. Fries         28 sold │ │                           │  │
│  │  5. Salad         20 sold │ │                           │  │
│  └───────────────────────────┘ └───────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**DaisyUI Components:**
- `stats` - Metric cards at top
- `card` - Chart containers
- `table` - Data tables
- `badge` - Trend indicators
- Charts: Use Chart.js or ApexCharts

---

## 🧩 Component Patterns

### 1. Modal Pattern

**Standard Modal Structure:**

```vue
<template>
  <!-- Modal trigger -->
  <button class="btn btn-primary" @click="showModal = true">
    Open Modal
  </button>

  <!-- Modal -->
  <dialog :class="['modal', { 'modal-open': showModal }]">
    <div class="modal-box">
      <!-- Header -->
      <h3 class="font-bold text-lg">Modal Title</h3>
      
      <!-- Content -->
      <div class="py-4">
        <!-- Form fields or content here -->
      </div>
      
      <!-- Actions -->
      <div class="modal-action">
        <button class="btn" @click="showModal = false">Cancel</button>
        <button class="btn btn-primary" @click="handleSubmit">
          <span v-if="loading" class="loading loading-spinner"></span>
          <span v-else>Submit</span>
        </button>
      </div>
    </div>
    
    <!-- Backdrop -->
    <form method="dialog" class="modal-backdrop">
      <button @click="showModal = false">close</button>
    </form>
  </dialog>
</template>
```

**Modal Sizes:**
- Default: `modal-box`
- Small: `modal-box max-w-sm`
- Large: `modal-box max-w-2xl`
- Full: `modal-box max-w-5xl`

### 2. Form Pattern

**Standard Form Structure:**

```vue
<template>
  <form @submit.prevent="handleSubmit" class="space-y-4">
    <!-- Input Field -->
    <div class="form-control w-full">
      <label class="label">
        <span class="label-text">Field Label *</span>
        <span class="label-text-alt">Helper text</span>
      </label>
      <input
        v-model="formData.field"
        type="text"
        class="input input-bordered w-full"
        :class="{ 'input-error': errors.field }"
        placeholder="Enter value"
      />
      <label v-if="errors.field" class="label">
        <span class="label-text-alt text-error">{{ errors.field }}</span>
      </label>
    </div>

    <!-- Select Field -->
    <div class="form-control w-full">
      <label class="label">
        <span class="label-text">Select Option</span>
      </label>
      <select v-model="formData.option" class="select select-bordered w-full">
        <option disabled selected value="">Choose one</option>
        <option value="1">Option 1</option>
        <option value="2">Option 2</option>
      </select>
    </div>

    <!-- Textarea -->
    <div class="form-control">
      <label class="label">
        <span class="label-text">Notes</span>
      </label>
      <textarea
        v-model="formData.notes"
        class="textarea textarea-bordered h-24"
        placeholder="Optional notes"
      ></textarea>
    </div>

    <!-- Submit -->
    <div class="flex justify-end gap-2">
      <button type="button" class="btn" @click="handleCancel">Cancel</button>
      <button type="submit" class="btn btn-primary" :disabled="loading">
        <span v-if="loading" class="loading loading-spinner"></span>
        <span v-else>Submit</span>
      </button>
    </div>
  </form>
</template>
```

### 3. Table Pattern

**Standard Table Structure:**

```vue
<template>
  <div class="overflow-x-auto">
    <table class="table table-zebra">
      <!-- Head -->
      <thead>
        <tr>
          <th>
            <label>
              <input type="checkbox" class="checkbox" />
            </label>
          </th>
          <th>Name</th>
          <th>Category</th>
          <th>Price</th>
          <th>Stock</th>
          <th class="text-right">Actions</th>
        </tr>
      </thead>
      
      <!-- Body -->
      <tbody>
        <tr v-for="item in items" :key="item.id">
          <th>
            <label>
              <input type="checkbox" class="checkbox" />
            </label>
          </th>
          <td>
            <div class="flex items-center gap-3">
              <div class="avatar">
                <div class="mask mask-squircle w-12 h-12">
                  <img :src="item.image" :alt="item.name" />
                </div>
              </div>
              <div>
                <div class="font-bold">{{ item.name }}</div>
                <div class="text-sm opacity-50">{{ item.code }}</div>
              </div>
            </div>
          </td>
          <td>
            <span class="badge badge-ghost">{{ item.category }}</span>
          </td>
          <td>{{ formatCurrency(item.price) }}</td>
          <td>
            <span
              class="badge"
              :class="{
                'badge-success': item.stock > 10,
                'badge-warning': item.stock > 0 && item.stock <= 10,
                'badge-error': item.stock === 0
              }"
            >
              {{ item.stock }}
            </span>
          </td>
          <td class="text-right">
            <div class="flex justify-end gap-2">
              <button class="btn btn-sm btn-ghost" @click="handleEdit(item)">
                <IconEdit class="w-4 h-4" />
              </button>
              <button class="btn btn-sm btn-ghost text-error" @click="handleDelete(item)">
                <IconTrash class="w-4 h-4" />
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Pagination -->
  <div class="flex justify-center mt-4">
    <div class="join">
      <button class="join-item btn" @click="prevPage">«</button>
      <button class="join-item btn">Page {{ currentPage }}</button>
      <button class="join-item btn" @click="nextPage">»</button>
    </div>
  </div>
</template>
```

### 4. Card Pattern

**Standard Card Structure:**

```vue
<template>
  <!-- Basic Card -->
  <div class="card bg-base-100 shadow-xl">
    <div class="card-body">
      <h2 class="card-title">Card Title</h2>
      <p>Card content goes here</p>
      <div class="card-actions justify-end">
        <button class="btn btn-primary">Action</button>
      </div>
    </div>
  </div>

  <!-- Card with Image -->
  <div class="card bg-base-100 shadow-xl">
    <figure>
      <img src="image.jpg" alt="Product" />
    </figure>
    <div class="card-body">
      <h2 class="card-title">
        Product Name
        <div class="badge badge-secondary">NEW</div>
      </h2>
      <p>Product description</p>
      <div class="card-actions justify-end">
        <div class="badge badge-outline">Category</div>
      </div>
    </div>
  </div>

  <!-- Stat Card -->
  <div class="stats shadow">
    <div class="stat">
      <div class="stat-figure text-primary">
        <IconShoppingCart class="w-8 h-8" />
      </div>
      <div class="stat-title">Total Orders</div>
      <div class="stat-value text-primary">25.6K</div>
      <div class="stat-desc">21% more than last month</div>
    </div>
  </div>
</template>
```

### 5. Alert Pattern

**Standard Alert Structure:**

```vue
<template>
  <!-- Info Alert -->
  <div class="alert alert-info">
    <IconInfoCircle class="w-6 h-6" />
    <span>Information message here</span>
  </div>

  <!-- Success Alert -->
  <div class="alert alert-success">
    <IconCheck class="w-6 h-6" />
    <span>Success! Operation completed.</span>
  </div>

  <!-- Warning Alert -->
  <div class="alert alert-warning">
    <IconAlertTriangle class="w-6 h-6" />
    <span>Warning! Please check this.</span>
  </div>

  <!-- Error Alert -->
  <div class="alert alert-error">
    <IconX class="w-6 h-6" />
    <span>Error! Something went wrong.</span>
  </div>

  <!-- Alert with Actions -->
  <div class="alert alert-warning">
    <IconAlertTriangle class="w-6 h-6" />
    <div>
      <h3 class="font-bold">Low Stock Alert</h3>
      <div class="text-xs">5 products are running low</div>
    </div>
    <button class="btn btn-sm">View</button>
  </div>
</template>
```

### 6. Badge Pattern

**Badge Variants:**

```vue
<template>
  <!-- Status Badges -->
  <span class="badge">Default</span>
  <span class="badge badge-primary">Primary</span>
  <span class="badge badge-secondary">Secondary</span>
  <span class="badge badge-accent">Accent</span>
  <span class="badge badge-success">Success</span>
  <span class="badge badge-warning">Warning</span>
  <span class="badge badge-error">Error</span>
  <span class="badge badge-info">Info</span>

  <!-- Outline Badges -->
  <span class="badge badge-outline">Outline</span>
  <span class="badge badge-outline badge-primary">Primary</span>

  <!-- Sizes -->
  <span class="badge badge-xs">Tiny</span>
  <span class="badge badge-sm">Small</span>
  <span class="badge badge-md">Medium</span>
  <span class="badge badge-lg">Large</span>

  <!-- With Icon -->
  <span class="badge badge-success gap-2">
    <IconCheck class="w-3 h-3" />
    Verified
  </span>
</template>
```

### 7. Loading States

**Loading Patterns:**

```vue
<template>
  <!-- Button Loading -->
  <button class="btn btn-primary" :disabled="loading">
    <span v-if="loading" class="loading loading-spinner"></span>
    <span v-else>Submit</span>
  </button>

  <!-- Spinner -->
  <span class="loading loading-spinner loading-xs"></span>
  <span class="loading loading-spinner loading-sm"></span>
  <span class="loading loading-spinner loading-md"></span>
  <span class="loading loading-spinner loading-lg"></span>

  <!-- Skeleton -->
  <div class="flex flex-col gap-4">
    <div class="skeleton h-32 w-full"></div>
    <div class="skeleton h-4 w-28"></div>
    <div class="skeleton h-4 w-full"></div>
    <div class="skeleton h-4 w-full"></div>
  </div>

  <!-- Full Page Loading -->
  <div v-if="loading" class="flex justify-center items-center h-screen">
    <span class="loading loading-spinner loading-lg"></span>
  </div>
</template>
```

---

## 📱 Mobile Responsive Design

### Breakpoints (Tailwind)

```css
sm:  640px  /* Small devices (phones landscape) */
md:  768px  /* Medium devices (tablets) */
lg:  1024px /* Large devices (laptops) */
xl:  1280px /* Extra large devices (desktops) */
2xl: 1536px /* 2X large devices (large desktops) */
```

### Mobile POS Layout

```
┌─────────────────────────┐
│  [☰] POS      [🛒 (3)] │ Mobile Header
├─────────────────────────┤
│  Order Type: [Dine-in▾]│
│  Table: [Table 5▾]      │
├─────────────────────────┤
│  [Search...]        🔍  │
├─────────────────────────┤
│  [All][Food][Bev][+]    │ Horizontal scroll
├─────────────────────────┤
│  ┌───────┐ ┌───────┐   │
│  │ 🍔    │ │ 🍕    │   │
│  │Burger │ │Pizza  │   │
│  │25,000 │ │45,000 │   │
│  └───────┘ └───────┘   │
│  ┌───────┐ ┌───────┐   │
│  │ ☕    │ │ 🍰    │   │
│  │Coffee │ │Cake   │   │
│  │15,000 │ │30,000 │   │
│  └───────┘ └───────┘   │
└─────────────────────────┘

<!-- Floating Cart Button -->
┌─────────────────────────┐
│                         │
│      [🛒 Cart (3)]      │ Fixed bottom
│       Rp 95,000         │
└─────────────────────────┘
```

**Mobile Responsive Classes:**

```vue
<!-- Stack on mobile, side-by-side on desktop -->
<div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
  <!-- Content -->
</div>

<!-- Hide on mobile -->
<div class="hidden md:block">
  <!-- Desktop only content -->
</div>

<!-- Show only on mobile -->
<div class="block md:hidden">
  <!-- Mobile only content -->
</div>

<!-- Responsive text sizes -->
<h1 class="text-2xl md:text-3xl lg:text-4xl">Title</h1>

<!-- Responsive padding -->
<div class="p-4 md:p-6 lg:p-8">
  <!-- Content -->
</div>
```

---

## ♿ Accessibility Guidelines

### WCAG 2.1 AA Compliance

1. **Color Contrast**
   - Text: Minimum 4.5:1 ratio
   - Large text: Minimum 3:1 ratio
   - Use DaisyUI semantic colors for consistency

2. **Keyboard Navigation**
   ```vue
   <!-- Focusable elements -->
   <button class="btn focus:ring-2 focus:ring-primary">
     Action
   </button>
   
   <!-- Tab order -->
   <input tabindex="1" />
   <input tabindex="2" />
   ```

3. **ARIA Labels**
   ```vue
   <!-- Screen reader text -->
   <button aria-label="Close modal">
     <IconX class="w-4 h-4" />
   </button>
   
   <!-- Form labels -->
   <label for="product-name">Product Name</label>
   <input id="product-name" type="text" />
   ```

4. **Semantic HTML**
   ```vue
   <!-- Use proper heading hierarchy -->
   <h1>Page Title</h1>
   <h2>Section Title</h2>
   <h3>Subsection Title</h3>
   
   <!-- Use semantic elements -->
   <nav>Navigation</nav>
   <main>Main content</main>
   <aside>Sidebar</aside>
   <footer>Footer</footer>
   ```

5. **Focus Management**
   ```vue
   <!-- Auto-focus modals -->
   <dialog ref="modal" @opened="focusFirstInput">
     <input ref="firstInput" />
   </dialog>
   
   <script setup>
   const modal = ref(null)
   const firstInput = ref(null)
   
   const focusFirstInput = () => {
     firstInput.value?.focus()
   }
   </script>
   ```

6. **Error Handling**
   ```vue
   <!-- Accessible error messages -->
   <div class="form-control">
     <input
       id="email"
       type="email"
       :aria-invalid="errors.email ? 'true' : 'false'"
       aria-describedby="email-error"
     />
     <span
       v-if="errors.email"
       id="email-error"
       class="text-error text-sm"
       role="alert"
     >
       {{ errors.email }}
     </span>
   </div>
   ```

---

## 🎨 Component Library Reference

### DaisyUI Components Used

| Component | Usage | Example |
|-----------|-------|---------|
| `btn` | Buttons | `<button class="btn btn-primary">Click</button>` |
| `card` | Container cards | `<div class="card bg-base-100 shadow-xl">` |
| `modal` | Dialogs | `<dialog class="modal modal-open">` |
| `table` | Data tables | `<table class="table table-zebra">` |
| `form-control` | Form fields | `<div class="form-control">` |
| `input` | Text inputs | `<input class="input input-bordered">` |
| `select` | Dropdowns | `<select class="select select-bordered">` |
| `textarea` | Multi-line input | `<textarea class="textarea textarea-bordered">` |
| `badge` | Labels/tags | `<span class="badge badge-primary">` |
| `alert` | Notifications | `<div class="alert alert-success">` |
| `stats` | Metric cards | `<div class="stats shadow">` |
| `divider` | Separators | `<div class="divider">` |
| `loading` | Spinners | `<span class="loading loading-spinner">` |
| `skeleton` | Placeholders | `<div class="skeleton h-4 w-full">` |
| `tabs` | Tab navigation | `<div class="tabs tabs-boxed">` |
| `join` | Grouped items | `<div class="join">` |

---

## 📚 Resources

- **DaisyUI Documentation:** https://daisyui.com/
- **Tailwind CSS:** https://tailwindcss.com/
- **Tabler Icons:** https://tabler-icons.io/
- **Vue 3 Documentation:** https://vuejs.org/
- **WCAG Guidelines:** https://www.w3.org/WAI/WCAG21/quickref/

---

**Next Document:** Review `RESTAURANT-COMPONENT-ARCHITECTURE.md` for detailed component structure and organization guidelines.

---

**Created:** December 1, 2025  
**Status:** 📐 Design Reference  
**Version:** 1.0
