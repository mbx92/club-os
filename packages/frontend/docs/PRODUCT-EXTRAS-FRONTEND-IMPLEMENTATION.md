# Product Extras - Frontend Implementation

## 📋 Overview

Implementasi fitur Product Extras untuk Restaurant Module telah selesai. Fitur ini memungkinkan admin menambahkan customization options untuk produk (contoh: Nasi Goreng dengan extra telur, sambal, dll).

## ✅ Fitur yang Sudah Diimplementasikan

### 1. **Composable: useProductExtras**
Lokasi: `src/composables/restaurant/useProductExtras.js`

**Functions:**
- `fetchExtras(productId, grouped)` - Fetch extras dari API
- `createExtra(productId, extraData)` - Buat single extra
- `bulkCreateExtras(productId, extrasArray)` - Buat multiple extras sekaligus
- `updateExtra(productId, extraId, extraData)` - Update extra
- `deleteExtra(productId, extraId)` - Delete extra (soft delete)
- `calculateTotalPrice(basePrice, selectedExtras, allExtras)` - Hitung total price
- `validateRequiredExtras(groupedExtras, selectedExtras)` - Validasi required groups
- `formatExtrasForOrder(selectedExtras)` - Format untuk order submission

### 2. **Component: ProductExtrasModal**
Lokasi: `src/components/restaurant/products/ProductExtrasModal.vue`

Modal untuk customer memilih extras saat add to cart di POS.

**Features:**
- Grouping extras by groupName
- Support radio (single selection) dan checkbox (multiple selection)
- Required/optional groups validation
- Quantity controls untuk extras
- Real-time price calculation
- Display base price vs extras price

### 3. **Component: ProductExtrasManager**
Lokasi: `src/components/restaurant/products/ProductExtrasManager.vue`

Interface untuk admin mengelola extras dari product detail page.

**Features:**
- List extras grouped by groupName
- Add single extra via form
- Bulk add extras dengan text input format
- Edit existing extras
- Delete extras (dengan confirm)
- Toggle active/inactive status

**Bulk Add Format:**
```
GroupName | ExtraName | Price | Type | Required
Toppings | Extra Telur | 5000 | checkbox | no
Size | Large | 10000 | radio | yes
```

### 4. **Updates pada Product Pages**

#### ProductCard.vue
- Menampilkan badge "Customizable" untuk produk yang punya extras (`isCustomized: true`)

#### Product Detail Page (`[id].vue`)
- Tab baru "Product Extras"
- Integrated ProductExtrasManager component
- Admin bisa manage extras langsung dari detail page

### 5. **Updates pada POS System**

#### POSProductGrid.vue
- Badge "Customizable" pada product card

#### POS Index Page
- Auto-detect produk dengan extras (`isCustomized`)
- Show ProductExtrasModal untuk product yang customizable
- Direct add to cart untuk product biasa

#### POSCart.vue
- Display extras info di cart items
- Show individual extra dengan price
- Calculate total dengan extras price
- Support `unitPrice` yang sudah include extras

#### POSPaymentModal.vue
- Display extras detail di order summary
- Send extras data ke backend saat create order
- Format: `extras: [{ id, quantity }]`

## 🎯 Cara Penggunaan

### Admin Side: Mengelola Extras

1. **Buka Product Detail**
   - Navigate ke Products → Pilih product → Klik "View Details"

2. **Tambah Extras**
   - Klik tab "Product Extras"
   - Klik "Add Extra" untuk single, atau "Bulk Add" untuk multiple
   - Isi form:
     - Group Name: Kategori extras (contoh: "Toppings", "Size", "Spice Level")
     - Extra Name: Nama option (contoh: "Extra Telur", "Large")
     - Price: Harga tambahan (0 untuk free option)
     - Type: Radio (single selection) atau Checkbox (multiple)
     - Required: Centang jika customer harus pilih

3. **Edit/Delete Extras**
   - Klik icon edit/trash di setiap extra
   - Soft delete: extras tetap ada di database dengan flag `deletedAt`

### Staff/Cashier Side: POS dengan Extras

1. **Product dengan Badge "Customizable"**
   - Saat klik product yang customizable, modal akan muncul

2. **Pilih Extras**
   - Required groups (dengan badge merah) harus dipilih
   - Optional groups bisa skip
   - Checkbox: bisa pilih multiple, ada quantity control
   - Radio: pilih salah satu saja

3. **Price Update**
   - Total price auto-update sesuai extras yang dipilih
   - Display breakdown: base price + extras

4. **Add to Cart**
   - Setiap kombinasi extras = item terpisah di cart
   - Product sama tapi beda extras = 2 items berbeda
   - Product tanpa extras: quantity bisa ditambah di cart

5. **Checkout**
   - Order summary menampilkan detail extras
   - Backend akan terima format: `extras: [{ id, quantity }]`

## 📊 Data Flow

### Add Product with Extras to Cart:
```javascript
1. User clicks customizable product
2. Frontend fetch extras: GET /api/v1/restaurant/products/:id/extras?grouped=true
3. Show ProductExtrasModal with grouped extras
4. User selects extras
5. Calculate total price (base + extras)
6. Add to cart with extras data:
   {
     product,
     quantity: 1,
     extras: [{ id, quantity, name, price }],
     extrasTotal: 7000,
     unitPrice: 32000 // base (25k) + extras (7k)
   }
```

### Submit Order:
```javascript
POST /api/v1/restaurant/orders
{
  items: [
    {
      productId: "uuid",
      quantity: 2,
      price: 25000, // base price
      extras: [
        { id: "uuid-extra-telur", quantity: 1 },
        { id: "uuid-extra-sambal", quantity: 1 }
      ]
    }
  ]
}
```

### Backend Response (Transaction Item):
```javascript
{
  itemName: "Nasi Goreng",
  quantity: 2,
  unitPrice: 32000,
  subtotal: 64000,
  itemDetails: {
    basePrice: 25000,
    extras: [
      { id, name: "Extra Telur", price: 5000, quantity: 1 },
      { id, name: "Extra Sambal", price: 2000, quantity: 1 }
    ],
    extrasTotal: 7000
  }
}
```

## 🔑 Key Points

1. **Auto-detect Customizable Products**
   - Backend set `isCustomized: true` saat ada extras
   - Frontend check flag ini untuk show modal

2. **Required Validation**
   - Modal prevent checkout jika required groups belum dipilih
   - Error message shown untuk missing groups

3. **Separate Cart Items**
   - Product dengan extras = separate item
   - Tidak bisa merge dengan product yang sama tapi beda extras
   - Memudahkan tracking order detail

4. **Price Transparency**
   - Selalu tampilkan base price dan extras price separately
   - Customer tahu berapa yang dibayar untuk extras

5. **Flexible Input Types**
   - Radio: untuk single choice (Size, Spice Level)
   - Checkbox: untuk multiple toppings/add-ons
   - Quantity control untuk setiap checkbox extra

## 🐛 Testing Checklist

- [ ] Create extras untuk product baru
- [ ] Bulk create multiple extras
- [ ] Edit existing extra
- [ ] Delete extra
- [ ] POS: select product dengan extras
- [ ] POS: validate required extras
- [ ] POS: add to cart dengan multiple extras
- [ ] POS: checkout dan verify order data
- [ ] Cart display extras info correctly
- [ ] Payment modal shows extras in summary
- [ ] Backend receives correct extras format

## 📝 Notes

- Backend API sudah ready sesuai dokumentasi
- Frontend fully integrated dengan semua endpoints
- Validation untuk required extras ada di client-side
- Backend akan handle validation lagi untuk security
- Soft delete: extras tidak benar-benar dihapus
- Product `isCustomized` flag auto-update dari backend

## 🚀 Future Enhancements (Optional)

- [ ] Max/min selection per group
- [ ] Conditional extras (show B only if A selected)
- [ ] Extra inventory tracking
- [ ] Extra images
- [ ] Templates untuk common combinations
- [ ] Analytics untuk popular extras
- [ ] Pricing rules based on combination
