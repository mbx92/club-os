# 🧩 Restaurant Module - Component Architecture

**Version:** 1.0
**Created:** December 1, 2025
**Status:** Draft

---

## 🎯 Purpose

This document defines the component architecture and organization for the Restaurant Module. It standardizes naming, folder structure, component responsibilities, prop/emit conventions, state handling, and guidelines for reusability and testing.

## 📁 Folder Structure

Recommended folder structure under `src/components` and `src/pages`:

```
src/
├── components/
│   └── restaurant/
│       ├── atomic/             # smallest, single-purpose UI elements (Button, Icon, Badge)
│       ├── molecules/          # composed elements (SearchBar, ProductCard, CartItem)
│       ├── organisms/          # complex components (POSProductGrid, CartPanel)
│       ├── pages/              # page-specific components (POSHeader, POSFooter)
│       └── reports/            # reports related components
└── pages/
    └── restaurant/
        ├── pos/
        ├── kitchen/
        ├── queue/
        └── reports/
```

Notes:
- Keep `src/components/restaurant` scoped to restaurant-specific components to avoid cross-module leakage.
- Shared generic components (used by multiple modules) should live under `src/components/shared`.

---

## 🧭 Component Types & Responsibilities

- Atomic (UI primitives)
  - No external side effects
  - No network calls
  - Purely presentational
  - Examples: `Icon`, `Button`, `Badge`, `Input`, `Select`

- Molecules
  - Compose atomic components
  - Minimal internal state
  - Examples: `ProductCard`, `CategoryPill`, `MemberSearchField`

- Organisms
  - Compose molecules and may contain business logic
  - Accept composable hooks or emit events for actions
  - Examples: `POSProductGrid`, `CartPanel`, `KitchenOrderCard`

- Pages
  - Compose organisms and orchestrate data flow
  - Use composables for network/state
  - Examples: `src/pages/restaurant/pos/index.vue`, `reports/sales.vue`

---

## 🧩 Naming Conventions

- Component filenames and names should use PascalCase: `ProductCard.vue`, `POSProductGrid.vue`.
- For directory names use kebab-case: `src/components/restaurant/product-list/`.
- Emit events should be kebab-case: `@add-to-cart`, `@voucher-applied`.
- Props should be camelCase in code and kebab-case in templates: `:initialQuantity="3"`.

---

## 🔁 Props / Emits / Events Guidelines

- Props are the "read" side
  - Keep them descriptive and typed (use `defineProps` with JSDoc or `props` with types)
  - Prefer `modelValue` only for form-style components

- Emits are the "write" side
  - Always declare emitted events with `defineEmits` for TypeScript inference
  - Emit minimal payloads (id or small object) and let parent resolve heavier logic

- Example:
```vue
<script setup>
const props = defineProps({ product: Object })
const emit = defineEmits(['add-to-cart'])

const onAdd = () => emit('add-to-cart', { id: props.product.id, qty: 1 })
</script>
```

---

## 🧰 State Management Patterns

- Local UI state: component-local via `ref`/`reactive`.
- Shared UI state (drawer, modals): `pinia` store `uiStore` or provide/inject for localized state.
- Domain data (products, orders, reports): composables in `src/composables/restaurant` (e.g., `useRestaurantOrders`) should be the single source of truth for network calls.
- Pages should call composables and pass results down to components as props.

---

## ♻️ Reusability & Composition

- Prefer small reusable components. If a component grows beyond 300 lines, consider splitting.
- Extract common logic into composables (e.g., pagination, date-range-picker, export-to-csv).
- Use slots for customization points in reusable containers (cards, lists).

Example: `CardList` component with slot for items.

---

## ⚙️ Lazy Loading & Performance

- Lazy-load large, seldom-used components using dynamic imports and defineAsyncComponent.
- Use `v-memo` or `key` where needed to avoid unnecessary re-renders.
- Defer heavy chart rendering until the component is visible (intersection observer or show on demand).

Example:
```js
const SalesChart = defineAsyncComponent(() => import('@/components/restaurant/reports/SalesChart.vue'))
```

---

## 🔗 Communication Patterns

- Parent-driven: Parent fetches data and passes to children via props; children emit user actions.
- Event bus: Avoid global event bus; prefer store or composables.
- Global notifications: `useNotification` composable for toast/error handling.

---

## 🧪 Testing Guidelines

- Unit tests for atomic and molecule components using `vitest` + `@vue/test-utils`.
- Snapshot tests for critical components (POS product card, Cart panel).
- E2E tests for main flows (order creation, kitchen acceptance) using Playwright.

Examples of test targets:
- `POSProductGrid.vue` loads and displays items correctly
- `CombinedBillingForm.vue` validations and submit payload
- `useRestaurantOrders` composable: handles success/error states

---

## 📚 Documentation & Storybook

- Add Storybook stories for key components: `ProductCard`, `CartPanel`, `SalesChart`.
- Stories help QA and designers validate components in isolation.

---

## ✅ Conventions Checklist

- [ ] Component follows PascalCase filename
- [ ] Props typed and documented
- [ ] Emits declared via `defineEmits`
- [ ] No direct API calls inside components (use composables)
- [ ] CSS scoped when component-specific styles are used
- [ ] Accessibility attributes present (aria-labels, roles)

---

## 📌 Example Component: `POSProductGrid.vue` (Recommended Shape)

```vue
<script setup>
import { ref } from 'vue'
const props = defineProps({ products: Array })
const emit = defineEmits(['add-to-cart'])

const addToCart = (product) => emit('add-to-cart', { id: product.id, qty: 1 })
</script>

<template>
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
    <ProductCard v-for="p in products" :key="p.id" :product="p" @add-to-cart="addToCart" />
  </div>
</template>
```

---

## 📎 Appendix

- Keep this document updated as components evolve.
- Pair with `RESTAURANT-UI-UX-FLOW-DESIGN.md` for design tokens and patterns.

---

**Next:** Generate component stubs and Storybook stories for high-impact components (POS grid, Cart panel, Kitchen card).