# 🔗 Restaurant Module - API Endpoint Mapping

**Version:** 1.0
**Created:** December 1, 2025
**Status:** Draft

---

## 📋 Purpose

Map the Postman collection (72 endpoints) to the codebase: composable methods, components/pages that call them, and current implementation status. This document helps track coverage and guide implementation work.

---

## 📊 Summary by Module

- Products: 7 endpoints — **Implemented (7/7)**
- Categories: 7 endpoints — **Not implemented (0/7)**
- Tables: 11 endpoints — **Partially implemented (8/11)**
- Locations: 9 endpoints — **Partially implemented (5/9)**
- Stock: 10 endpoints — **Partially implemented (3/10)**
- Orders: 17 endpoints — **Partially implemented (6/17)**
- Queue: 3 endpoints — **Not implemented (0/3)**
- Billing: 3 endpoints — **Not implemented (0/3)**
- Reports: 5 endpoints — **Not implemented (0/5)**

Total endpoints: 72

---

## 🧾 Mapping Template (Per Endpoint)

Use this template to add each endpoint row. Fill the columns with specifics.

| Endpoint (Method URL) | Module | Composable Method | Called By (components/pages) | Implementation Status | Notes |
|---|---:|---|---|---|---|
| `GET /restaurant/products` | Products | `useRestaurantProducts().getProducts` | `POSProductGrid`, `ProductListPage` | Implemented | Paginated, supports category filter |

---

## ✅ Completed Mappings (Examples)

### Products (Completed)

| Endpoint | Composable Method | Called By | Status | Notes |
|---|---|---:|---:|---|
| GET `/restaurant/products` | `useRestaurantProducts().getProducts` | `POSProductGrid.vue`, `ProductList.vue` | Implemented | Supports pagination, category filter, search |
| GET `/restaurant/products/:id` | `useRestaurantProducts().getProductById` | `ProductDetail.vue`, `POSProductModal.vue` | Implemented | Returns full product details and variants |
| POST `/restaurant/products` | `useRestaurantProducts().createProduct` | Admin Product form | Implemented | Requires auth + admin role |
| PUT `/restaurant/products/:id` | `useRestaurantProducts().updateProduct` | Admin Product form | Implemented | Partial updates supported |
| DELETE `/restaurant/products/:id` | `useRestaurantProducts().deleteProduct` | Admin Product list | Implemented | Soft-delete behavior |
| GET `/restaurant/products/:id/stock` | `useRestaurantProducts().getProductStock` | `ProductStockModal` | Implemented | Returns per-location stock levels |
| POST `/restaurant/products/bulk` | `useRestaurantProducts().bulkCreate` | Import tool | Implemented | CSV import support |


### Tables (Partial)

| Endpoint | Composable Method | Called By | Status | Notes |
|---|---|---:|---:|---|
| GET `/restaurant/tables` | `useRestaurantTables().getTables` | `TablesPage`, `PosTableSelector` | Implemented | Returns availability per location |
| GET `/restaurant/tables/:id` | `useRestaurantTables().getTable` | `TableDetail` | Implemented |  |
| POST `/restaurant/tables` | `useRestaurantTables().createTable` | Admin Tables form | Implemented |  |
| PUT `/restaurant/tables/:id` | `useRestaurantTables().updateTable` | Admin Tables form | Implemented |  |
| DELETE `/restaurant/tables/:id` | `useRestaurantTables().deleteTable` | Admin Tables list | Not Implemented | 2 endpoints remaining |
| POST `/restaurant/tables/:id/assign` | `useRestaurantTables().assignTable` | Queue management, POS | Not Implemented | Assign customer to table |
| POST `/restaurant/tables/:id/free` | `useRestaurantTables().freeTable` | POS | Implemented |  |
| GET `/restaurant/tables/:id/history` | `useRestaurantTables().getTableHistory` | Reports page | Not Implemented |  |
| ... | ... | ... | ... | ... |


---

## 🛠 How to Fill the Full Mapping Quickly

If you have the Postman collection JSON, you can extract endpoints to CSV and add them here programmatically.

Example Node script (quick extractor):

```js
// node scripts/extract-postman-endpoints.js
const fs = require('fs')
const collection = JSON.parse(fs.readFileSync('./gym-api.postman_collection.json', 'utf8'))
const items = []

function walk(itemsArr, parent) {
  for (const it of itemsArr) {
    if (it.request) {
      const method = it.request.method
      const url = (it.request.url.raw || it.request.url?.toString()) || ''
      items.push({ name: it.name, method, url, folder: parent })
    }
    if (it.item) walk(it.item, it.name || parent)
  }
}

walk(collection.item, '')
fs.writeFileSync('./postman_endpoints.csv', 'name,method,url,folder\n' + items.map(i => `${i.name},${i.method},"${i.url}",${i.folder}`).join('\n'))
console.log('Extracted', items.length)
```

Run this script from project root (after placing `gym-api.postman_collection.json` from `/docs` or repository root).

---

## 🔎 Partial Status & Next Actions

- Products: fully implemented — mapping complete.
- Categories: missing — implement `useRestaurantCategories` with 7 methods; map endpoints to `CategoryTree`, `CategoryFormModal`.
- Tables & Locations: finish remaining endpoints (delete, assign, history).
- Stock: extend `useRestaurantStock` and map `stock-report` endpoints.
- Orders: implement missing endpoints for split/merge/print; map to `useRestaurantOrders` updates already in Phase 3.
- Queue, Billing, Reports: implement composables and UI per Phase 2, 5, 6 respectively.

---

## ✍️ Recommended Workflow to Complete Mapping

1. Extract endpoints from Postman using the script above.
2. Paste CSV into a spreadsheet (Excel/Google Sheets).
3. Add columns: `Composable Method`, `Component/Page`, `Status`, `Owner`, `Notes`.
4. Assign owners and fill statuses during implementation.
5. Commit updated `RESTAURANT-API-ENDPOINT-MAPPING.md` with final table or link to generated CSV in `docs/`.

---

## 🔚 Appendix: Helpful Links

- Postman collection: `docs/gym-api.postman_collection.json` (or `docs/restaurant` path if available)
- Implementation guidelines: `RESTAURANT-IMPLEMENTATION-MASTER-PLAN.md`
- Component architecture: `RESTAURANT-COMPONENT-ARCHITECTURE.md`

---

**Next:** I can auto-generate the full endpoint table if you provide the Postman collection JSON path (I can parse it and populate the mapping).