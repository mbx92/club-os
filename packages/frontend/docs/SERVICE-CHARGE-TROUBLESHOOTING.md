# Service Charge Troubleshooting Guide

## Problem: Service charge tidak muncul di Restaurant POS

### Quick Checklist:

1. **Pastikan Service Charge sudah diaktifkan di Settings**
   - Buka: **Settings** → Tab **"Transactions Settings"**
   - Scroll ke **"Service Charge Settings"**
   - Pastikan toggle **"Enable Service Charge"** dalam keadaan ON (hijau)
   - Masukkan rate (contoh: 5 untuk 5%)
   - Klik **"Save Changes"**
   - **PENTING**: Setelah save, halaman akan otomatis refresh tenant data

2. **Refresh Halaman POS**
   - Setelah save settings, buka tab POS
   - Tekan **F5** atau **Ctrl+R** untuk refresh halaman
   - Atau tutup dan buka kembali tab POS

3. **Cek Console Browser untuk Debug**
   - Tekan **F12** untuk membuka Developer Tools
   - Buka tab **Console**
   - Cari pesan debug berikut:
     ```
     [useTransactionSettings] Service Charge Config: {...}
     [POSCart] Service charge calculated: {...}
     ```
   - Jika muncul warning "No transaction settings found", berarti tenant data belum ter-load

4. **Verifikasi Data di Console**
   Ketik di console:
   ```javascript
   // Cek tenant settings
   JSON.parse(localStorage.getItem('auth'))?.user?.tenant?.settings?.transaction
   ```
   
   Pastikan output menampilkan:
   ```javascript
   {
     serviceChargeEnable: true,
     serviceChargePercentage: 5,  // atau nilai yang Anda set
     serviceChargeType: "percentage",
     taxEnable: true,
     taxPercentage: 11,
     ...
   }
   ```

5. **Jika masih tidak muncul: Logout & Login**
   - Logout dari aplikasi
   - Login kembali
   - Buka POS dan coba lagi

## Expected Behavior

Ketika service charge sudah enabled (contoh: 5%):

**Di Cart (POSCart):**
```
Subtotal:        Rp 49.000
Service Charge:  Rp  2.450  (5%)
Tax:            Rp  5.660  (11% dari Rp 51.450)
----------------------------
Total:          Rp 57.110
```

**Di Payment Modal:**
```
Subtotal:        Rp 49.000
Voucher Discount: Rp      0
Service Charge:  Rp  2.450  (5%)
Tax:            Rp  5.660  (11%)
----------------------------
Total:          Rp 57.110
```

## Debug Steps

### Step 1: Cek Backend API
Buka browser console dan test API:

```javascript
fetch('http://your-api-url/api/v1/transaction-settings/service-charge', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token')
  }
})
.then(r => r.json())
.then(console.log)
```

Expected response:
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

### Step 2: Cek Component State
Di halaman POS, buka console dan ketik:

```javascript
// Get Vue component instance (jika menggunakan Vue DevTools)
$vm0.serviceChargeConfig
$vm0.isServiceChargeEnabled
```

### Step 3: Test Calculation Manually
```javascript
const subtotal = 49000
const serviceChargeRate = 5
const serviceCharge = Math.round((subtotal * serviceChargeRate) / 100)
console.log('Service Charge:', serviceCharge) // Expected: 2450

const taxBase = subtotal + serviceCharge
const taxRate = 11
const tax = Math.round((taxBase * taxRate) / 100)
console.log('Tax:', tax) // Expected: 5660

const total = subtotal + serviceCharge + tax
console.log('Total:', total) // Expected: 57110
```

## Common Issues

### Issue 1: Settings tersimpan tapi tidak muncul di POS
**Solution**: Refresh tenant data di auth store
- Component sudah di-update untuk auto-refresh setelah save
- Jika masih tidak muncul, logout dan login lagi

### Issue 2: Console menampilkan "No transaction settings found"
**Solution**: 
- Pastikan user sudah login
- Pastikan tenant memiliki settings
- Cek localStorage: `localStorage.getItem('auth')`

### Issue 3: Service charge = 0 meskipun enabled
**Solution**: 
- Pastikan rate tidak 0
- Pastikan type adalah "percentage" atau "fixed"
- Cek console untuk error messages

### Issue 4: Tax tidak include service charge
**Solution**: 
- Tax base seharusnya: subtotal - discount + serviceCharge
- Sudah di-implement dengan benar di composable

## Formula Perhitungan

### Restaurant Orders (dengan service charge):
```
1. Subtotal = sum(item prices × quantities)
2. Voucher Discount = discount amount
3. Subtotal After Discount = subtotal - voucherDiscount
4. Service Charge = subtotalAfterDiscount × serviceChargeRate%
5. Tax Base = subtotalAfterDiscount + serviceCharge
6. Tax = taxBase × taxRate%
7. Total = subtotalAfterDiscount + serviceCharge + tax
```

### POS Gym (tanpa service charge):
```
1. Subtotal = sum(item prices × quantities)
2. Voucher Discount = discount amount
3. Subtotal After Discount = subtotal - voucherDiscount  
4. Tax = subtotalAfterDiscount × taxRate%
5. Total = subtotalAfterDiscount + tax
```

## Files Modified

- `src/components/settings/TransactionTab.vue` - Settings UI
- `src/composables/shared/useTransactionSettings.js` - Composable logic
- `src/components/restaurant/pos/POSCart.vue` - Cart display
- `src/components/restaurant/pos/POSPaymentModal.vue` - Checkout modal

## Contact Support

Jika masalah masih berlanjut, sertakan informasi berikut:
1. Screenshot dari Settings → Transaction tab
2. Screenshot dari Console (F12)
3. Response dari API endpoint `/transaction-settings/service-charge`
4. Browser dan versi yang digunakan
