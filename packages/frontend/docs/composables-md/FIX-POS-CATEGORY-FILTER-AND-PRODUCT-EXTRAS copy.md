# Fix Product Category Filter & Product Extras in POS / Combined Billing

## Ringkasan Masalah

| #   | Issue                                          | Root Cause                                                                                                                                                      |
| --- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Category filter di POS tidak bekerja           | FE mengekstrak kategori dari `product.category` (text field), bukan dari API `ProductCategory`. Filter harus pakai `categoryId` (UUID).                         |
| 2   | Product extras dari import tidak muncul di POS | FE hanya baca dari `product.productDetails?.extras` (JSONB inline). Extras yang dibuat via import/manual disimpan di tabel `ProductExtras` dan diakses via API. |
| 3   | Manual input extras tidak muncul di POS dialog | Sama seperti #2 — FE tidak pernah call API `/products/:id/extras`.                                                                                              |

---

## API Endpoints yang Diperlukan

### 1. Categories — `GET /api/v1/restaurant/categories`

Gunakan endpoint ini untuk mendapatkan list kategori. **Jangan** ekstrak dari field `product.category`.

**Request:**

```http
GET /api/v1/restaurant/categories
Authorization: Bearer {token}
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-category-1",
      "name": "Coffee & Tea",
      "description": null,
      "parentId": null,
      "color": "#8B4513",
      "icon": "☕",
      "sortOrder": 0,
      "isActive": true,
      "createdAt": "2026-02-17T06:01:51.094Z",
      "updatedAt": "2026-02-17T06:01:51.094Z"
    },
    {
      "id": "uuid-category-2",
      "name": "Main Course",
      "description": null,
      "parentId": null,
      "color": null,
      "icon": null,
      "sortOrder": 3,
      "isActive": true
    }
  ],
  "count": 10
}
```

**Query Parameters (optional):**

| Param          | Type                 | Description                         |
| -------------- | -------------------- | ----------------------------------- |
| `tree`         | `"true"`             | Return hierarchical tree structure  |
| `parentId`     | UUID / `"null"`      | Filter by parent category           |
| `isActive`     | `"true"` / `"false"` | Filter by active status             |
| `includeCount` | `"true"`             | Include `productCount` per category |

> [!IMPORTANT]
> Gunakan `category.id` (UUID) untuk filtering, **bukan** `category.name` (text).

---

### 2. Products — `GET /api/v1/restaurant/products`

Setiap product sudah include `productCategory` object dan `categoryId`.

**Response per Product:**

```json
{
  "id": "uuid-product",
  "name": "Cappuccino",
  "sku": "DYN-xxx-3",
  "price": "35000.00",
  "description": "",
  "category": "Coffee & Tea",
  "categoryId": "uuid-category-1",
  "isActive": true,
  "isCustomized": true,
  "productDetails": { ... },
  "productCategory": {
    "id": "uuid-category-1",
    "name": "Coffee & Tea",
    "color": "#8B4513"
  },
  "location": null
}
```

**Filter by Category:**

```http
GET /api/v1/restaurant/products?categoryId=uuid-category-1
```

> [!NOTE]
> Field `category` (string) adalah legacy field. Selalu gunakan `categoryId` (UUID) dan object `productCategory` untuk filtering dan display.

---

### 3. Product Extras — `GET /api/v1/restaurant/products/:productId/extras`

**Ini adalah endpoint kunci yang belum digunakan FE di POS.**

Extras di-manage di tabel `ProductExtras` (bukan di JSONB `productDetails`). Setiap product yang punya extras di tabel ini akan memiliki `isCustomized: true`.

#### 3a. Flat List

```http
GET /api/v1/restaurant/products/{productId}/extras
```

**Response:**

```json
{
  "success": true,
  "data": {
    "productId": "uuid-product",
    "productName": "Aglio E Olio",
    "isCustomized": true,
    "extras": [
      {
        "id": "uuid-extra-1",
        "tenantId": "uuid-tenant",
        "productId": "uuid-product",
        "name": "Add Chicken",
        "price": "25000.00",
        "inputType": "checkbox",
        "groupName": "Protein",
        "isRequired": false,
        "isMultiple": true,
        "sortOrder": 0,
        "isActive": true
      },
      {
        "id": "uuid-extra-2",
        "name": "Add Prawn",
        "price": "35000.00",
        "inputType": "checkbox",
        "groupName": "Protein",
        "isRequired": false,
        "isMultiple": true,
        "sortOrder": 1,
        "isActive": true
      }
    ]
  }
}
```

#### 3b. Grouped by Group Name (Recommended untuk POS UI)

```http
GET /api/v1/restaurant/products/{productId}/extras?grouped=true
```

**Response:**

```json
{
  "success": true,
  "data": {
    "productId": "uuid-product",
    "productName": "Aglio E Olio",
    "isCustomized": true,
    "extras": {
      "Protein": [
        {
          "id": "uuid-extra-1",
          "name": "Add Chicken",
          "price": 25000,
          "priceFormatted": "+25,000",
          "inputType": "checkbox",
          "groupName": "Protein",
          "isRequired": false,
          "isMultiple": true,
          "sortOrder": 0,
          "isActive": true
        },
        {
          "id": "uuid-extra-2",
          "name": "Add Prawn",
          "price": 35000,
          "priceFormatted": "+35,000",
          "inputType": "checkbox",
          "groupName": "Protein",
          "isRequired": false,
          "isMultiple": true,
          "sortOrder": 1,
          "isActive": true
        }
      ],
      "Spice Level": [
        {
          "id": "uuid-extra-3",
          "name": "Mild",
          "price": 0,
          "priceFormatted": "+0",
          "inputType": "radio",
          "groupName": "Spice Level",
          "isRequired": true,
          "isMultiple": false,
          "sortOrder": 0,
          "isActive": true
        }
      ]
    }
  }
}
```

#### 3c. Dedicated Groups Endpoint

```http
GET /api/v1/restaurant/products/{productId}/extras/groups
```

**Response:**

```json
{
  "success": true,
  "data": {
    "productId": "uuid-product",
    "productName": "Aglio E Olio",
    "isCustomized": true,
    "groups": {
      "Protein": [ ... ],
      "Spice Level": [ ... ]
    }
  }
}
```

> [!TIP]
> Perhatikan perbedaan response key: `?grouped=true` → `data.extras` (object grouped), sedangkan `/groups` → `data.groups`.

---

### 4. Product Extra Field Reference

```typescript
interface ProductExtra {
  id: string; // UUID
  name: string; // "Add Chicken", "Extra Cheese", etc
  price: number; // Harga tambahan (e.g., 25000)
  priceFormatted: string; // "+25,000" (hanya di grouped response)
  inputType: "radio" | "checkbox" | "select";
  groupName: string | null; // Nama grup (e.g., "Protein", "Spice Level")
  isRequired: boolean; // Apakah wajib dipilih
  isMultiple: boolean; // Apakah bisa pilih lebih dari satu dalam grup
  sortOrder: number; // Urutan tampilan
  isActive: boolean;
}
```

**UI Behavior berdasarkan `inputType`:**

| `inputType` | UI Component       | Behavior                                    |
| ----------- | ------------------ | ------------------------------------------- |
| `radio`     | Radio button group | Pilih satu dalam grup (`isMultiple: false`) |
| `checkbox`  | Checkbox list      | Pilih banyak (`isMultiple: true`)           |
| `select`    | Dropdown           | Pilih satu dari dropdown                    |

**`isRequired: true`** → User **harus** pilih minimal satu option dari grup tersebut sebelum add to cart.

---

## Perubahan yang Diperlukan di Frontend

### A. POS Restaurant Page (`pos/index.vue`)

#### 1. Fetch Categories dari API

```javascript
// ❌ SEBELUMNYA (dari product text field)
const categories = computed(() => {
  const cats = products.value.map((p) => p.category).filter(Boolean);
  return ["All", ...new Set(cats)];
});

// ✅ SEHARUSNYA (dari API)
const categories = ref([]);

async function fetchCategories() {
  const { data } = await api.get("/restaurant/categories");
  categories.value = data.data; // Array of { id, name, color, icon, ... }
}

onMounted(() => {
  fetchCategories();
  fetchProducts();
});
```

#### 2. Filter Products by Category ID

```javascript
// ❌ SEBELUMNYA (text matching)
const filteredProducts = computed(() => {
  if (selectedCategory.value === "All") return products.value;
  return products.value.filter((p) => p.category === selectedCategory.value);
});

// ✅ SEHARUSNYA (by categoryId UUID)
const selectedCategoryId = ref(null); // null = All

const filteredProducts = computed(() => {
  if (!selectedCategoryId.value) return products.value;
  return products.value.filter(
    (p) => p.categoryId === selectedCategoryId.value,
  );
});
```

#### 3. Category Tabs Template

```vue
<!-- ✅ Category tabs dari API data -->
<div class="category-tabs">
  <button
    :class="{ active: !selectedCategoryId }"
    @click="selectedCategoryId = null"
  >
    All
  </button>
  <button
    v-for="cat in categories"
    :key="cat.id"
    :class="{ active: selectedCategoryId === cat.id }"
    @click="selectedCategoryId = cat.id"
  >
    {{ cat.icon }} {{ cat.name }}
  </button>
</div>
```

#### 4. Fetch Extras saat Klik Product (untuk POS)

```javascript
async function addToCart(product) {
  // Cek apakah product punya extras (dari DB table)
  if (product.isCustomized) {
    // Fetch extras dari API
    const { data } = await api.get(
      `/restaurant/products/${product.id}/extras?grouped=true`,
    );
    const groupedExtras = data.data.extras; // Object: { "GroupName": [...extras] }

    if (Object.keys(groupedExtras).length > 0) {
      // Tampilkan ProductExtrasModal
      showExtrasModal(product, groupedExtras);
      return;
    }
  }

  // Jika juga punya inline variants (dari productDetails JSONB)
  if (product.productDetails?.hasVariants) {
    showVariantSelector(product);
    return;
  }

  // Product tanpa extras/variants → langsung add ke cart
  directAddToCart(product);
}
```

> [!IMPORTANT]
> **Dual source untuk extras:**
>
> - `product.isCustomized === true` → extras ada di tabel `ProductExtras`, fetch via API
> - `product.productDetails?.hasExtras === true` → extras ada inline di JSONB `productDetails.extras[]`
>
> Di POS, prioritaskan **cek DB table dulu** (`isCustomized`), lalu fallback ke JSONB.

#### 5. Handle Extras Confirmation → Add to Cart

```javascript
function onExtrasConfirmed(product, selectedExtras) {
  // selectedExtras = array of ProductExtra objects yang user pilih
  const extrasTotal = selectedExtras.reduce(
    (sum, extra) => sum + parseFloat(extra.price),
    0,
  );

  const cartItem = {
    product,
    quantity: 1,
    basePrice: parseFloat(product.price),
    extras: selectedExtras.map((e) => ({
      id: e.id,
      name: e.name,
      price: parseFloat(e.price),
    })),
    extrasTotal,
    totalPrice: parseFloat(product.price) + extrasTotal,
  };

  cart.value.push(cartItem);
}
```

#### 6. Cart Item Display (menampilkan extras)

```vue
<div v-for="(item, index) in cart" :key="index" class="cart-item">
  <div class="item-name">{{ item.product.name }}</div>

  <!-- Tampilkan extras yang dipilih -->
  <div v-if="item.extras?.length" class="item-extras">
    <span v-for="extra in item.extras" :key="extra.id" class="extra-tag">
      + {{ extra.name }} (+Rp {{ extra.price.toLocaleString('id-ID') }})
    </span>
  </div>

  <div class="item-price">
    Rp {{ item.totalPrice.toLocaleString('id-ID') }}
  </div>
</div>
```

---

### B. POSProductGrid.vue

#### Update Category Props

```javascript
// ❌ SEBELUMNYA: categories prop = string[]
defineProps({
  categories: Array, // ['All', 'Coffee & Tea', 'Main Course']
});

// ✅ SEHARUSNYA: categories prop = object[]
defineProps({
  categories: Array, // [{ id, name, color, icon }]
});
```

```vue
<!-- Template update -->
<button
  v-for="cat in categories"
  :key="cat.id"
  :class="{ active: selectedCategory === cat.id }"
  @click="$emit('select-category', cat.id)"
>
  {{ cat.name }}
</button>
```

---

### C. Combined Billing (`CombinedBillingForm.vue`)

#### 1. Fetch Extras sebelum Add to Cart

```javascript
async function handleProductClick(product) {
  if (product.isCustomized) {
    const { data } = await api.get(
      `/restaurant/products/${product.id}/extras?grouped=true`,
    );

    if (Object.keys(data.data.extras).length > 0) {
      // Show extras modal
      extrasModalProduct.value = product;
      extrasModalData.value = data.data.extras;
      showExtrasModal.value = true;
      return;
    }
  }
  // Direct add
  addProductToCart(product, []);
}
```

#### 2. Cart Item dengan Extras

```javascript
function addProductToCart(product, selectedExtras = []) {
  const extrasTotal = selectedExtras.reduce(
    (sum, e) => sum + parseFloat(e.price),
    0,
  );

  cartItems.value.push({
    productId: product.id,
    productName: product.name,
    price: parseFloat(product.price),
    quantity: 1,
    extras: selectedExtras,
    extrasTotal,
    subtotal: parseFloat(product.price) + extrasTotal,
  });
}
```

#### 3. Submit Data ke Backend (include extras)

```javascript
const submitData = {
  items: cartItems.value.map((item) => ({
    productId: item.productId,
    productName: item.productName,
    quantity: item.quantity,
    unitPrice: item.price,
    extras: item.extras.map((e) => ({
      id: e.id,
      name: e.name,
      price: parseFloat(e.price),
    })),
    extrasTotal: item.extrasTotal,
    subtotal: item.subtotal * item.quantity,
  })),
};
```

---

## Flowchart: Product Click di POS

```
User clicks product
       │
       ▼
┌──────────────────────┐
│ product.isCustomized │
│     === true?        │
└──────┬───────────────┘
       │ YES                    NO
       ▼                        │
┌──────────────────────┐        │
│ Fetch extras via API │        │
│ GET /products/:id/   │        │
│   extras?grouped=true│        │
└──────┬───────────────┘        │
       │                        │
       ▼                        │
┌──────────────────────┐        │
│ Has DB extras?       │        │
│ (Object.keys > 0)    │        │
└──┬───────────────┬───┘        │
   │ YES           │ NO         │
   ▼               ▼            │
┌─────────┐  ┌──────────────┐   │
│ Show    │  │ Check JSONB  │◄──┘
│ Extras  │  │ hasVariants / │
│ Modal   │  │ hasExtras?   │
└────┬────┘  └──┬───────┬───┘
     │          │ YES   │ NO
     ▼          ▼       ▼
 Confirm  ┌─────────┐ Direct
   ↓      │Variant/ │ Add to
 Add to   │Customize│ Cart
 Cart     │Modal    │
 (with    └────┬────┘
 extras)       │
               ▼
          Add to Cart
```

---

## Verification Checklist

### Category Filter

- [ ] Categories di POS berasal dari API (`GET /restaurant/categories`)
- [ ] Category tabs menampilkan nama kategori dari database
- [ ] Klik kategori memfilter product berdasarkan `categoryId` (UUID)
- [ ] Tab "All" menampilkan semua produk
- [ ] Category color & icon ditampilkan (jika tersedia)

### Product Extras (POS)

- [ ] Klik product dengan `isCustomized: true` → fetch extras dari API
- [ ] Extras modal muncul dengan extras grouped by `groupName`
- [ ] `inputType: "radio"` → render sebagai radio buttons
- [ ] `inputType: "checkbox"` → render sebagai checkboxes
- [ ] `isRequired: true` → validasi sebelum add to cart
- [ ] Extras price ditambahkan ke total
- [ ] Cart menampilkan extras yang dipilih
- [ ] Product tanpa extras → langsung add to cart tanpa modal

### Product Extras (Combined Billing)

- [ ] Sama seperti POS — fetch extras via API sebelum add
- [ ] Extras ditampilkan di cart summary
- [ ] Submit data ke backend include extras detail

### Manually Added Extras

- [ ] Extras yang ditambahkan via Product Extra Manager muncul di POS
- [ ] Creating extra via manager sets `product.isCustomized = true` otomatis (BE sudah handle)
- [ ] Deleting semua extras sets `product.isCustomized = false` otomatis (BE sudah handle)

---

## Panduan Khusus: Menambah Data (Write Operations)

Penting untuk dipahami bahwa **Variants** dan **Extras** memiliki mekanisme penyimpanan yang berbeda.

### 1. Menambah/Update Variants (JSONB)

Variants disimpan langsung di dalam kolom `productDetails` pada tabel `Products`.
Untuk menambah variant, update produk tersebut dengan payload JSONB baru.

**Endpoint:** `PUT /api/v1/restaurant/products/:id`

**Payload:**

```json
{
  "productDetails": {
    "hasVariants": true,
    "variants": [
      {
        "name": "Regular",
        "price": 15000,
        "sku": "PROD-REG"
      },
      {
        "name": "Jumbo",
        "price": 25000,
        "sku": "PROD-JMB"
      }
    ],
    // Jangan sentuh field 'extras' di sini jika system sudah migrasi ke tabel ProductExtras
    "extras": [],
    "hasExtras": false
  }
}
```

### 2. Menambah/Update Extras (Dedicated Table)

**JANGAN** update `productDetails.extras`. Gunakan API endpoint khusus untuk extras. Backend akan otomatis mengelola flag `isCustomized`.

**API Endpoint:** `POST /api/v1/restaurant/products/:id/extras`

**Payload:**

```json
{
  "name": "Extra Mozzarella",
  "price": 5000,
  "groupName": "Risoles Add-ons",
  "inputType": "checkbox", // "checkbox", "radio", "select"
  "isRequired": false,
  "isMultiple": true
}
```

> [!CAUTION]
> **Jangan mencampur keduanya.**
>
> - Update Variants → `PUT /products/:id` (edit JSONB)
> - Update Extras → `POST/PUT /products/:id/extras` (edit Table)
