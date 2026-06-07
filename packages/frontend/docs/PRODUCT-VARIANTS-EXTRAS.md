# Product Variants & Extras - Frontend Integration Guide

## Overview

Products sekarang mendukung **variants** (ukuran berbeda dengan harga berbeda) dan **extras** (tambahan opsional dengan biaya tambahan).

Data disimpan dalam field `productDetails` (JSONB) pada tabel `Products`.

## API Endpoint

### Get All Products
```http
GET /api/v1/restaurant/products
Authorization: Bearer {token}
```

### Response Structure
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Cappuccino",
      "sku": "DYN-xxx-3",
      "price": "35000.00",
      "description": "",
      "isActive": true,
      "isCustomized": false,
      "categoryId": "uuid",
      "productCategory": {
        "id": "uuid",
        "name": "Coffee & Tea",
        "color": null
      },
      "productDetails": {
        "variants": [
          {
            "name": "Regular",
            "price": 35000,
            "sku": "DYN-xxx-3-REG"
          },
          {
            "name": "Large",
            "price": 50000,
            "sku": "DYN-xxx-3-LAR"
          }
        ],
        "extras": [],
        "hasVariants": true,
        "hasExtras": false
      },
      "createdAt": "2026-02-17T06:01:51.145Z",
      "updatedAt": "2026-02-17T06:19:54.098Z"
    }
  ],
  "pagination": {
    "total": 65,
    "page": 1,
    "limit": 50,
    "totalPages": 2
  }
}
```

## Real Examples from Database

### Example 1: Product with VARIANTS (Cappuccino)
```json
{
  "id": "3853920a-2b6e-4fdc-b815-ed372409589d",
  "name": "Cappuccino",
  "price": "35000.00",
  "productDetails": {
    "variants": [
      {
        "name": "Regular",
        "price": 35000,
        "sku": "DYN-1771309194094-3-REG"
      },
      {
        "name": "Large",
        "price": 50000,
        "sku": "DYN-1771309194094-3-LAR"
      }
    ],
    "extras": [],
    "hasVariants": true,
    "hasExtras": false
  }
}
```

**UI Implementation:**
- Display product name: "Cappuccino"
- Show size selector: Radio buttons or dropdown
  - ○ Regular - Rp 35.000
  - ○ Large - Rp 50.000
- Base price uses Regular variant (35K)
- Selected variant price updates total

### Example 2: Product with EXTRAS (Aglio E Olio)
```json
{
  "id": "265e29cd-a2ee-42de-97fd-65fd2314341e",
  "name": "Aglio E Olio",
  "price": "55000.00",
  "isCustomized": true,
  "productDetails": {
    "variants": [
      {
        "name": "Regular",
        "price": 55000,
        "sku": "DYN-1771309194533-57-REG"
      }
    ],
    "extras": [
      {
        "name": "Add Chicken",
        "price": 25000
      },
      {
        "name": "Add Prawn",
        "price": 35000
      }
    ],
    "hasVariants": false,
    "hasExtras": true
  }
}
```

**UI Implementation:**
- Display product name: "Aglio E Olio"
- Base price: Rp 55.000
- Show extras as checkboxes:
  - ☐ Add Chicken (+Rp 25.000)
  - ☐ Add Prawn (+Rp 35.000)
- Total = Base price + Sum of selected extras

### Example 3: Product with BOTH (Hypothetical)
```json
{
  "name": "Special Burger",
  "price": "75000.00",
  "isCustomized": true,
  "productDetails": {
    "variants": [
      {
        "name": "Regular",
        "price": 75000,
        "sku": "..."
      },
      {
        "name": "Large",
        "price": 95000,
        "sku": "..."
      }
    ],
    "extras": [
      {
        "name": "Extra Cheese",
        "price": 10000
      },
      {
        "name": "Extra Patty",
        "price": 25000
      }
    ],
    "hasVariants": true,
    "hasExtras": true
  }
}
```

**UI Implementation:**
- Size selector (required): Regular (75K) or Large (95K)
- Extras checkboxes (optional): Extra Cheese (+10K), Extra Patty (+25K)
- Total = Selected variant price + Sum of selected extras

## Frontend Implementation

### 1. Check if Product Has Variants
```javascript
function hasVariants(product) {
  return product.productDetails?.hasVariants === true;
}

// Usage
if (hasVariants(product)) {
  // Show variant selector (Radio buttons or Dropdown)
  product.productDetails.variants.forEach(variant => {
    console.log(`${variant.name}: Rp ${variant.price.toLocaleString('id-ID')}`);
  });
}
```

### 2. Check if Product Has Extras
```javascript
function hasExtras(product) {
  return product.productDetails?.hasExtras === true;
}

// Usage
if (hasExtras(product)) {
  // Show extras as checkboxes
  product.productDetails.extras.forEach(extra => {
    console.log(`${extra.name}: +Rp ${extra.price.toLocaleString('id-ID')}`);
  });
}
```

### 3. Calculate Total Price
```javascript
function calculateProductTotal(product, selectedVariant, selectedExtras = []) {
  // Base price from selected variant (or default to first variant)
  let total = selectedVariant 
    ? selectedVariant.price 
    : (product.productDetails?.variants?.[0]?.price || parseFloat(product.price));
  
  // Add extras
  selectedExtras.forEach(extra => {
    total += extra.price;
  });
  
  return total;
}

// Example usage
const cappuccino = {
  name: "Cappuccino",
  price: "35000.00",
  productDetails: {
    variants: [
      { name: "Regular", price: 35000 },
      { name: "Large", price: 50000 }
    ],
    extras: []
  }
};

const largeVariant = cappuccino.productDetails.variants[1]; // Large
const total = calculateProductTotal(cappuccino, largeVariant, []);
console.log(total); // 50000
```

### 4. Complete React Component Example
```jsx
function ProductCard({ product }) {
  const [selectedVariant, setSelectedVariant] = useState(
    product.productDetails?.variants?.[0] // Default to first variant
  );
  const [selectedExtras, setSelectedExtras] = useState([]);

  const hasVariants = product.productDetails?.hasVariants;
  const hasExtras = product.productDetails?.hasExtras;

  const total = calculateTotal();

  function calculateTotal() {
    let price = selectedVariant?.price || parseFloat(product.price);
    selectedExtras.forEach(extra => {
      price += extra.price;
    });
    return price;
  }

  function toggleExtra(extra) {
    if (selectedExtras.some(e => e.name === extra.name)) {
      setSelectedExtras(selectedExtras.filter(e => e.name !== extra.name));
    } else {
      setSelectedExtras([...selectedExtras, extra]);
    }
  }

  return (
    <div className="product-card">
      <h3>{product.name}</h3>
      
      {/* Variants Selector */}
      {hasVariants && (
        <div className="variants">
          <label>Size:</label>
          {product.productDetails.variants.map(variant => (
            <label key={variant.sku}>
              <input
                type="radio"
                name={`variant-${product.id}`}
                checked={selectedVariant?.name === variant.name}
                onChange={() => setSelectedVariant(variant)}
              />
              {variant.name} - Rp {variant.price.toLocaleString('id-ID')}
            </label>
          ))}
        </div>
      )}

      {/* Extras Checkboxes */}
      {hasExtras && (
        <div className="extras">
          <label>Extras:</label>
          {product.productDetails.extras.map(extra => (
            <label key={extra.name}>
              <input
                type="checkbox"
                checked={selectedExtras.some(e => e.name === extra.name)}
                onChange={() => toggleExtra(extra)}
              />
              {extra.name} (+Rp {extra.price.toLocaleString('id-ID')})
            </label>
          ))}
        </div>
      )}

      {/* Total Price */}
      <div className="total">
        <strong>Total: Rp {total.toLocaleString('id-ID')}</strong>
      </div>

      <button onClick={() => addToCart(product, selectedVariant, selectedExtras)}>
        Add to Cart
      </button>
    </div>
  );
}
```

### 5. Vue 3 Composition API Example
```vue
<template>
  <div class="product-card">
    <h3>{{ product.name }}</h3>
    
    <!-- Variants -->
    <div v-if="hasVariants" class="variants">
      <label>Size:</label>
      <label v-for="variant in product.productDetails.variants" :key="variant.sku">
        <input
          type="radio"
          v-model="selectedVariant"
          :value="variant"
        />
        {{ variant.name }} - Rp {{ variant.price.toLocaleString('id-ID') }}
      </label>
    </div>

    <!-- Extras -->
    <div v-if="hasExtras" class="extras">
      <label>Extras:</label>
      <label v-for="extra in product.productDetails.extras" :key="extra.name">
        <input
          type="checkbox"
          v-model="selectedExtras"
          :value="extra"
        />
        {{ extra.name }} (+Rp {{ extra.price.toLocaleString('id-ID') }})
      </label>
    </div>

    <!-- Total -->
    <div class="total">
      <strong>Total: Rp {{ total.toLocaleString('id-ID') }}</strong>
    </div>

    <button @click="addToCart">Add to Cart</button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  product: Object
});

const hasVariants = computed(() => props.product.productDetails?.hasVariants);
const hasExtras = computed(() => props.product.productDetails?.hasExtras);

const selectedVariant = ref(props.product.productDetails?.variants?.[0]);
const selectedExtras = ref([]);

const total = computed(() => {
  let price = selectedVariant.value?.price || parseFloat(props.product.price);
  selectedExtras.value.forEach(extra => {
    price += extra.price;
  });
  return price;
});

function addToCart() {
  // Implement add to cart logic
  console.log({
    product: props.product,
    variant: selectedVariant.value,
    extras: selectedExtras.value,
    total: total.value
  });
}
</script>
```

## Data Structure Reference

### productDetails Field (JSONB)
```typescript
interface ProductDetails {
  variants: Variant[];
  extras: Extra[];
  hasVariants: boolean;
  hasExtras: boolean;
}

interface Variant {
  name: string;        // "Regular", "Large", "Cup", "Pot"
  price: number;       // Price in IDR
  sku: string;         // Unique SKU for this variant
}

interface Extra {
  name: string;        // "Add Chicken", "Add Nutella", etc.
  price: number;       // Additional price in IDR
}
```

## Important Notes

1. **Base Price**: Field `product.price` selalu berisi harga variant "Regular" (atau variant pertama jika tidak ada Regular)

2. **isCustomized Flag**: 
   - `true` jika product memiliki extras
   - Berguna untuk quick filter di UI

3. **Variants Always Present**: 
   - Setiap product minimal punya 1 variant
   - Cek `hasVariants: true` untuk menampilkan selector hanya jika ada 2+ variants

4. **Empty Arrays**: 
   - `extras: []` jika tidak ada extras
   - `hasExtras: false` untuk quick check

5. **Backward Compatibility**: 
   - Product lama tanpa productDetails akan memiliki `productDetails: null` atau `{}`
   - Always check dengan optional chaining: `product.productDetails?.variants`

## Testing

Gunakan script untuk cek data:
```bash
node scripts/checkProductDetails.js
node scripts/showAPIResponse.js
```

## Current Data (Dynasty Menu)

Import berhasil dengan:
- ✅ 65 produk
- ✅ 10 kategori
- ✅ Products dengan variants: Cappuccino, Latte, Bali Coffee, dll
- ✅ Products dengan extras: Eggs Benedict, Strawberry Banana Crepe, Aglio E Olio

Data sudah tersedia di tenant: **Dinasty Gym** (3151f7b8-b34c-4abc-8cf2-db4e9a5202e7)
