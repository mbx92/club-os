# Receipt Settings API Documentation

API untuk mengelola pengaturan template receipt/struk thermal printer dengan 50+ opsi kustomisasi dan support untuk **multiple template types**.

## Table of Contents

- [Overview](#overview)
- [Template Types](#template-types)
- [Endpoints](#endpoints)
- [Payload Structure](#payload-structure)
- [All Available Variables](#all-available-variables)
- [Usage Examples](#usage-examples)
- [Integration Guide](#integration-guide)

---

## Overview

Receipt Settings API memungkinkan kustomisasi template struk thermal printer tanpa mengubah kode. Pengaturan disimpan di `tenant.settings.receiptTemplates` dan otomatis diterapkan saat print.

**Fitur Utama:**
- ✅ **8 template types** (receipt, kitchen, label, invoice, report, membership, class, personalTraining)
- ✅ 50+ variabel kustomisasi per template
- ✅ Multi-bahasa support (ID/EN/etc)
- ✅ Show/hide sections
- ✅ Custom labels & text
- ✅ Social media integration
- ✅ Partial update (merge otomatis)
- ✅ Reset to default per template atau all templates
- ✅ Test print dengan mock data

**Base URL:** `/api/v1/system/receipt-settings`

---

## Template Types

### 1. **receipt** - Restaurant Order Receipt (Customer Receipt)
Receipt lengkap untuk order restaurant dengan payment details, tax, discount.

**Use Case:** Dine-in, takeaway, delivery orders

**Features:**
- Full business info (name, address, phone, NPWP)
- Order details (number, date, type, table, customer)
- Item list with prices
- Subtotal, discount, tax calculation
- Payment breakdown by method
- Change calculation
- Thank you message & social media

---

### 2. **kitchen** - Kitchen Order Ticket
Tiket dapur untuk persiapan makanan (tanpa harga).

**Use Case:** Print ke dapur untuk chef

**Features:**
- Minimal header (no business details)
- Order number & time
- Table number & customer name
- Item list with quantity
- Modifiers & special notes
- **No prices** (kitchen tidak perlu tahu harga)
- Urgent message footer

---

### 3. **label** - Package Label
Label minimal untuk packaging takeaway/delivery.

**Use Case:** Sticker on package

**Features:**
- Compact size (32 chars)
- Order number
- Customer name
- Order type (takeaway/delivery)
- Item summary (no prices)
- No footer message

---

### 4. **invoice** - Detailed Invoice
Invoice formal dengan NPWP untuk billing.

**Use Case:** B2B billing, wholesale orders

**Features:**
- Business info with NPWP
- Invoice number & due date
- Customer address
- Detailed item list with codes
- Tax calculation
- Bank transfer info
- Payment terms

---

### 5. **report** - Report/Summary Receipt
Receipt untuk laporan dan statistik.

**Use Case:** Daily reports, sales summary, inventory reports

**Features:**
- Report header with type
- Date range/period
- Summary statistics
- Total calculations
- Printed by info
- Minimal footer (no thank you message)

---

### 6. **membership** - Membership Receipt (Time-based Service)
Receipt untuk pembelian membership dengan periode waktu.

**Use Case:** Gym membership, club membership, annual subscriptions

**Features:**
- Member info (name, ID)
- Package details
- **Time-based**: Start date, end date, validity period
- Full payment breakdown (price, discount, tax)
- Payment method details
- Motivational footer message

---

### 7. **class** - Class Receipt (Hybrid: Time OR Session-based)
Receipt untuk pembelian class dengan support dual mode.

**Use Case:** Yoga class, aerobic class, group training

**Features:**
- Member & instructor info
- Package details
- **Hybrid support**: Duration (time) OR Session count
- Session info (total, remaining, price per session)
- Validity period for time-based
- Reservation instructions in footer

---

### 8. **personalTraining** - Personal Training Receipt (Session-based)
Receipt untuk pembelian personal training dengan session count.

**Use Case:** 1-on-1 training, personal coaching

**Features:**
- Member & trainer info
- Package details
- **Session-based**: Total sessions, session duration, remaining
- Price per session breakdown
- Valid until date (session expiry)
- Contact trainer instructions

---

## Endpoints

### 1. Get Template Settings

Mengambil pengaturan receipt template (semua atau spesifik type).

```http
GET /api/v1/system/receipt-settings
GET /api/v1/system/receipt-settings?type=receipt
GET /api/v1/system/receipt-settings?type=kitchen
GET /api/v1/system/receipt-settings?type=membership
GET /api/v1/system/receipt-settings?type=class
GET /api/v1/system/receipt-settings?type=personalTraining
```

**Query Parameters:**
- `type` (optional): Template type - `receipt`, `kitchen`, `label`, `invoice`, `report`, `membership`, `class`, `personalTraining`
- Jika tidak ada `type`, return semua templates

**Authorization:** `read:SystemSettings`

**Response (specific type):**
```json
{
  "success": true,
  "data": {
    "paperWidth": 48,
    "header": { ... },
    "body": { ... },
    "footer": { ... }
  }
}
```

**Response (all templates):**
```json
{
  "success": true,
  "data": {
    "receipt": { "paperWidth": 48, "header": {...}, "body": {...}, "footer": {...} },
    "kitchen": { ... },
    "label": { ... },
    "invoice": { ... },
    "report": { ... },
    "membership": { ... },
    "class": { ... },
    "personalTraining": { ... }
  }
}
```

---

### 2. Create New Template

Membuat template baru dengan type tertentu.

```http
POST /api/v1/system/receipt-settings
```

**Authorization:** `create:SystemSettings`

**Request Body:**
```json
{
  "type": "receipt",
  "name": "Custom Receipt Template",
  "settings": {
    "paperWidth": 48,
    "header": {
      "showBusinessName": true,
      "separatorChar": "="
    },
    "body": {
      "orderLabel": "Order",
      "totalLabel": "TOTAL"
    },
    "footer": {
      "thankYouMessage": "Thank you!"
    }
  }
}
```

**Supported Types:**
- `receipt`
- `kitchen`
- `label`
- `invoice`
- `report`
- `membership`
- `class`
- `personalTraining`

**Response:**
```json
{
  "success": true,
  "message": "Receipt template created successfully: receipt",
  "data": {
    "name": "Custom Receipt Template",
    "paperWidth": 48,
    "header": { ... },
    "body": { ... },
    "footer": { ... },
    "createdAt": "2025-12-08T10:30:00.000Z"
  }
}
```

**Error (409 Conflict):**
```json
{
  "success": false,
  "error": "Template type 'receipt' already exists. Use PUT to update."
}
```

---

### 3. Update Template Settings

Update pengaturan receipt template untuk spesifik type.

```http
PUT /api/v1/system/receipt-settings
```

**Authorization:** `update:SystemSettings`

**Request Body:**
```json
{
  "type": "receipt",
  "settings": {
    "body": {
      "orderLabel": "Order",
      "totalLabel": "TOTAL"
    },
    "footer": {
      "thankYouMessage": "Thank you for your visit!"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Receipt template settings updated successfully: receipt",
  "data": {
    "paperWidth": 48,
    "header": { ... },
    "body": { ... },
    "footer": { ... }
  }
}
```

---

### 4. Reset to Default

Reset template ke default settings (spesifik type atau semua).

```http
POST /api/v1/system/receipt-settings/reset
POST /api/v1/system/receipt-settings/reset?type=receipt
POST /api/v1/system/receipt-settings/reset?type=kitchen
```

**Query Parameters:**
- `type` (optional): Template type to reset
- Jika tidak ada `type`, reset semua templates

**Authorization:** `update:SystemSettings`

**Response:**
```json
{
  "success": true,
  "message": "Receipt template settings reset to default: receipt",
  "data": {
    "paperWidth": 48,
    "header": { ... },
    "body": { ... },
    "footer": { ... }
  }
}
```

---

### 5. Test Print Template

Test print template dengan mock data untuk preview hasil print.

```http
POST /api/v1/system/receipt-settings/test-print
```

**Authorization:** `read:SystemSettings`

**Request Body:**
```json
{
  "type": "receipt"
}
```

**Request Body (dengan custom mock data):**
```json
{
  "type": "membership",
  "mockData": {
    "member": "John Doe",
    "memberId": "MBR-12345",
    "packageName": "Gold Membership - 6 Bulan",
    "startDate": "08/12/2025",
    "endDate": "08/06/2026",
    "validityPeriod": "6 Bulan",
    "price": 2500000,
    "discount": 250000,
    "tax": 225000,
    "total": 2475000
  }
}
```

**Supported Types:**
- `receipt` - Restaurant order receipt dengan items, payment, change
- `kitchen` - Kitchen ticket dengan modifiers
- `label` - Package label
- `invoice` - Invoice dengan customer details
- `report` - Report summary
- `membership` - Membership dengan time-based fields
- `class` - Class dengan session/time hybrid
- `personalTraining` - PT dengan session-based fields

**Response:**
```json
{
  "success": true,
  "message": "Test preview generated for membership template",
  "data": {
    "type": "membership",
    "template": {
      "paperWidth": 48,
      "header": { ... },
      "body": { ... },
      "footer": { ... }
    },
    "mockData": {
      "businessName": "Nama Bisnis",
      "transactionNumber": "TRX-MBR-2025-001",
      "member": "John Doe",
      "memberId": "MBR-12345",
      "packageName": "Gold Membership - 6 Bulan",
      "startDate": "08/12/2025",
      "endDate": "08/06/2026",
      "validityPeriod": "6 Bulan",
      "price": 2500000,
      "discount": 250000,
      "tax": 225000,
      "total": 2475000,
      "payments": [
        { "method": "credit", "amount": 2475000 }
      ]
    },
    "preview": "================================================\n           Nama Bisnis           \n       Alamat Bisnis       \n           Kota           \n        081234567890        \n================================================\n\n  BUKTI PEMBELIAN MEMBERSHIP  \n------------------------------------------------\nNo. Transaksi          TRX-MBR-2025-001\nTanggal                08/12/2025 10:30:00\n------------------------------------------------\nMember                 John Doe\nID Member              MBR-12345\n------------------------------------------------\nPaket: Gold Membership - 6 Bulan\nBerlaku Dari           08/12/2025\nBerlaku Sampai         08/06/2026\nMasa Aktif             6 Bulan\n------------------------------------------------\nHarga                  2.500.000\nDiskon                 -250.000\nPajak                  225.000\n------------------------------------------------\nTOTAL BAYAR            2.475.000\n------------------------------------------------\nKredit                 2.475.000\n================================================\n Selamat bergabung! Nikmati fasilitas kami. \nSimpan struk ini sebagai bukti pembelian.\nTunjukkan saat check-in.\n================================================\n\n[AUTO CUT]\n",
    "note": "This is a preview. Actual print may vary based on printer settings."
  }
}
```

**Mock Data by Type:**

**receipt:**
- Order details (number, type, table, customer)
- Items with prices (Nasi Goreng, Es Teh, Ayam Bakar)
- Payment & change calculation

**kitchen:**
- Order number, table
- Items with modifiers & notes
- No prices shown

**label:**
- Minimal info
- Order number, customer
- Item summary

**invoice:**
- Invoice number, due date
- Customer with NPWP
- Bank transfer info

**report:**
- Report type, period
- Summary statistics
- Total calculations

**membership:**
- Member info & package
- Time-based: start/end dates, validity period
- Payment breakdown

**class:**
- Member & instructor
- Hybrid: sessions + validity period
- Price per session

**personalTraining:**
- Member & trainer
- Session-based: total, duration, remaining
- Valid until date

**Note:** Jika `mockData` tidak disediakan, sistem akan generate mock data default untuk testing.

---

### 6. Test Print to Actual Printer

Test print template ke thermal printer fisik dengan mock data.

```http
POST /api/v1/system/receipt-settings/test-print
```

**Authorization:** `read:SystemSettings`

**Request Body:**
```json
{
  "type": "membership",
  "printerId": "550e8400-e29b-41d4-a716-446655440000",
  "settings": {
    "paperWidth": 48,
    "header": { "showBusinessName": true },
    "body": { "totalLabel": "TOTAL" },
    "footer": { "thankYouMessage": "Terima kasih!" }
  }
}
```

**Request Body (dengan custom sample data):**
```json
{
  "type": "class",
  "printerId": "550e8400-e29b-41d4-a716-446655440000",
  "settings": {
    "paperWidth": 48,
    "header": { "showBusinessName": true },
    "body": { "totalLabel": "TOTAL" },
    "footer": { "thankYouMessage": "Terima kasih!" }
  },
  "sampleData": {
    "member": "Jane Smith",
    "instructor": "Sarah Yoga",
    "packageName": "Yoga Class - 10 Sesi",
    "totalSessions": 10,
    "pricePerSession": 150000
  }
}
```

**Required Fields:**
- `type` - Template type (receipt, kitchen, label, invoice, report, membership, class, personalTraining)
- `printerId` - UUID printer yang akan digunakan (harus aktif dan terdaftar di tenant)
- `settings` - Template settings object (current configuration yang akan di-test)

**Optional Fields:**
- `sampleData` - Custom mock data untuk preview (jika tidak ada, pakai default)

**Response:**
```json
{
  "success": true,
  "message": "Test print sent successfully",
  "data": {
    "printerId": "550e8400-e29b-41d4-a716-446655440000",
    "printerName": "Receipt Printer - Kasir 1",
    "printerIp": "192.168.1.100",
    "type": "membership",
    "timestamp": "2025-12-08T10:30:00.000Z"
  }
}
```

**Error Responses:**

**404 - Printer Not Found:**
```json
{
  "success": false,
  "error": "Printer not found"
}
```

**400 - Printer Not Active:**
```json
{
  "success": false,
  "error": "Printer is not active"
}
```

**500 - Printer Error:**
```json
{
  "success": false,
  "error": "Failed to print: Connection timeout"
}
```

**Workflow:**
1. Validasi `type`, `printerId`, dan `settings`
2. Cek printer exists, belongs to tenant, dan isActive
3. Merge request `settings` dengan default template settings
4. Generate sample data (custom atau default)
5. Build receipt text dengan merged settings
6. Send ke thermal printer via network (TCP/IP port 9100)
7. Return print job status

**Use Case:**
- Test template settings sebelum save (preview before commit)
- Verify printer connection
- Preview actual print output dengan kertas
- Training staff dengan sample prints
- A/B testing different configurations

**Note:** 
- Endpoint ini akan **benar-benar print** ke thermal printer fisik
- Settings yang dikirim **tidak disimpan** - hanya untuk test
- Pastikan printer sudah dikonfigurasi di `/system/printers` dan status aktif
- Gunakan endpoint `POST /test-print` (endpoint 5) untuk preview JSON tanpa print fisik

---

### 7. Test Print with Saved Settings (Quick Test)

Test print menggunakan settings yang sudah tersimpan di database tanpa perlu kirim settings object. Endpoint ini lebih simple untuk quick testing.

```http
POST /api/v1/system/receipt-settings/test-print-actual
```

**Authorization:** `read:SystemSettings`

**Request Body:**
```json
{
  "type": "membership",
  "printerId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Request Body (dengan custom sample data):**
```json
{
  "type": "receipt",
  "printerId": "550e8400-e29b-41d4-a716-446655440000",
  "sampleData": {
    "orderNumber": "ORD-12345",
    "customerName": "John Doe",
    "items": [
      { "name": "Nasi Goreng", "qty": 2, "price": 25000 }
    ],
    "total": 50000
  }
}
```

**Required Fields:**
- `type` - Template type (receipt, kitchen, label, invoice, report, membership, class, personalTraining)
- `printerId` - UUID printer yang akan digunakan

**Optional Fields:**
- `sampleData` - Custom sample data (jika tidak ada, gunakan default)

**Response:**
```json
{
  "success": true,
  "message": "Test print sent to printer: Receipt Printer - Kasir 1",
  "data": {
    "printerId": "550e8400-e29b-41d4-a716-446655440000",
    "printerName": "Receipt Printer - Kasir 1",
    "printerIp": "192.168.1.100",
    "type": "membership",
    "timestamp": "2025-12-08T10:30:00.000Z"
  }
}
```

**Error Responses:**

**404 - Template Not Found:**
```json
{
  "success": false,
  "error": "Receipt template not found for type: membership"
}
```

**404 - Printer Not Found:**
```json
{
  "success": false,
  "error": "Printer not found"
}
```

**400 - Printer Not Active:**
```json
{
  "success": false,
  "error": "Printer is not active"
}
```

**Workflow:**
1. Validasi `type` dan `printerId`
2. Load template settings dari database (`tenant.settings.receiptTemplates[type]`)
3. Jika template belum ada, gunakan default template
4. Cek printer exists, belongs to tenant, dan isActive
5. Generate sample data (custom atau default)
6. Build receipt text dengan template settings dari DB
7. Send ke thermal printer via network
8. Return print job status

**Perbedaan dengan Endpoint 6:**

| Feature | `/test-print` (Endpoint 6) | `/test-print-actual` (Endpoint 7) |
|---------|----------------------------|-----------------------------------|
| Settings | **Required** - kirim manual | **Auto-load** dari database |
| Use Case | Test before save | Test after save |
| Typical Usage | Preview new configuration | Quick test saved settings |
| Settings Modified | Yes (test mode) | No (use saved) |

**Use Case:**
- Quick test template yang sudah disimpan
- Verify settings yang baru saja di-save
- Daily printer testing (untuk maintenance)
- Simple test tanpa perlu load settings manual

**Note:** 
- Endpoint ini menggunakan settings yang **sudah tersimpan** di database
- Jika template belum pernah dibuat, akan gunakan default settings
- Tidak perlu kirim `settings` object - lebih simple dan cepat
- Cocok untuk tombol "Test Print" di UI setelah save

---

## Payload Structure

### Complete Structure

```javascript
{
  "paperWidth": 48,  // Lebar kertas dalam karakter (32/48/80)
  
  "header": {
    "showBusinessName": true,
    "businessNameOverride": null,      // Override nama bisnis
    "showAddress": true,
    "addressOverride": null,           // Override alamat
    "showCity": true,
    "showPhone": true,
    "phoneOverride": null,             // Override nomor telepon
    "showTaxNumber": false,
    "taxNumber": null,                 // NPWP: "01.234.567.8-901.000"
    "customHeaderText": null,          // Teks tambahan (e.g., "Cabang Pusat")
    "separatorChar": "="               // Karakter pemisah: = - * ~
  },
  
  "body": {
    // ========== LABELS (Customizable Text) ==========
    "orderLabel": "Order",
    "dateLabel": "Tanggal",
    "typeLabel": "Tipe",
    "dineInLabel": "Dine In",
    "takeawayLabel": "Take Away",
    "deliveryLabel": "Delivery",
    "tableLabel": "Meja",
    "customerLabel": "Pelanggan",
    "cashierLabel": "Kasir",
    "subtotalLabel": "Subtotal",
    "discountLabel": "Diskon",
    "taxLabel": "Pajak",
    "totalLabel": "TOTAL",
    "paymentLabel": "Pembayaran",
    "paidLabel": "Dibayar",
    "changeLabel": "Kembalian",
    
    // ========== SHOW/HIDE FLAGS ==========
    "showOrderType": true,
    "showTable": true,
    "showCustomer": true,
    "showCashier": true,
    "showItemCode": false,             // Show SKU/code di item
    "showDiscount": true,
    "showTax": true,
    "showPayment": true,
    "showPaymentBreakdown": true,      // Detail metode pembayaran
    "showPaidAmount": true,
    "showChange": true,
    
    // ========== SPECIAL OPTIONS ==========
    "totalDoubleSize": true,           // Font 2x untuk total
    "paymentMethodLabels": {
      "cash": "Tunai",
      "debit": "Debit",
      "credit": "Kredit",
      "qris": "QRIS",
      "transfer": "Transfer"
    },
    "separatorChar": "-"
  },
  
  "footer": {
    "showThankYou": true,
    "thankYouMessage": "Terima kasih atas kunjungan Anda!",
    "customFooterText": null,          // Teks tambahan (e.g., "Buka 08:00-22:00")
    
    // ========== SOCIAL MEDIA ==========
    "showSocialMedia": false,
    "socialMedia": {
      "instagram": "@username",
      "facebook": "facebook.com/page",
      "whatsapp": "08123456789"
    },
    "instagramLabel": "IG",
    "facebookLabel": "FB",
    "whatsappLabel": "WA",
    
    // ========== WEBSITE ==========
    "showWebsite": false,
    "website": null,                   // "www.example.com"
    
    "separatorChar": "=",
    "autoCut": true                    // Auto-cut kertas setelah print
  }
}
```

---

## All Available Variables

### 📋 Header Section (11 variables)

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `paperWidth` | number | `48` | Lebar kertas (32/48/80 characters) |
| `showBusinessName` | boolean | `true` | Tampilkan nama bisnis |
| `businessNameOverride` | string\|null | `null` | Override nama bisnis (jika null, pakai dari tenant) |
| `showAddress` | boolean | `true` | Tampilkan alamat |
| `addressOverride` | string\|null | `null` | Override alamat |
| `showCity` | boolean | `true` | Tampilkan kota |
| `showPhone` | boolean | `true` | Tampilkan telepon |
| `phoneOverride` | string\|null | `null` | Override nomor telepon |
| `showTaxNumber` | boolean | `false` | Tampilkan NPWP |
| `taxNumber` | string\|null | `null` | Nomor NPWP |
| `customHeaderText` | string\|null | `null` | Teks tambahan di header |
| `separatorChar` | string | `"="` | Karakter pemisah |

---

### 📝 Body Section (29 variables)

#### Labels (16 variables)

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `orderLabel` | string | `"Order"` | Label nomor order |
| `dateLabel` | string | `"Tanggal"` | Label tanggal |
| `typeLabel` | string | `"Tipe"` | Label tipe order |
| `dineInLabel` | string | `"Dine In"` | Label dine-in |
| `takeawayLabel` | string | `"Take Away"` | Label takeaway |
| `deliveryLabel` | string | `"Delivery"` | Label delivery |
| `tableLabel` | string | `"Meja"` | Label nomor meja |
| `customerLabel` | string | `"Pelanggan"` | Label nama pelanggan |
| `cashierLabel` | string | `"Kasir"` | Label nama kasir |
| `subtotalLabel` | string | `"Subtotal"` | Label subtotal |
| `discountLabel` | string | `"Diskon"` | Label diskon |
| `taxLabel` | string | `"Pajak"` | Label pajak |
| `totalLabel` | string | `"TOTAL"` | Label total |
| `paymentLabel` | string | `"Pembayaran"` | Label pembayaran |
| `paidLabel` | string | `"Dibayar"` | Label jumlah dibayar |
| `changeLabel` | string | `"Kembalian"` | Label kembalian |

#### Show/Hide Flags (11 variables)

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `showOrderType` | boolean | `true` | Tampilkan tipe order |
| `showTable` | boolean | `true` | Tampilkan nomor meja |
| `showCustomer` | boolean | `true` | Tampilkan nama pelanggan |
| `showCashier` | boolean | `true` | Tampilkan nama kasir |
| `showItemCode` | boolean | `false` | Tampilkan kode item/SKU |
| `showDiscount` | boolean | `true` | Tampilkan baris diskon |
| `showTax` | boolean | `true` | Tampilkan baris pajak |
| `showPayment` | boolean | `true` | Tampilkan section pembayaran |
| `showPaymentBreakdown` | boolean | `true` | Tampilkan detail metode pembayaran |
| `showPaidAmount` | boolean | `true` | Tampilkan jumlah dibayar |
| `showChange` | boolean | `true` | Tampilkan kembalian |

#### Special Options (2 variables)

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `totalDoubleSize` | boolean | `true` | Font 2x untuk total |
| `separatorChar` | string | `"-"` | Karakter pemisah body |

#### Payment Method Labels (5 variables)

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `paymentMethodLabels.cash` | string | `"Tunai"` | Label cash |
| `paymentMethodLabels.debit` | string | `"Debit"` | Label debit card |
| `paymentMethodLabels.credit` | string | `"Kredit"` | Label credit card |
| `paymentMethodLabels.qris` | string | `"QRIS"` | Label QRIS |
| `paymentMethodLabels.transfer` | string | `"Transfer"` | Label bank transfer |

---

### 🎨 Footer Section (11 variables)

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `showThankYou` | boolean | `true` | Tampilkan pesan terima kasih |
| `thankYouMessage` | string | `"Terima kasih..."` | Pesan terima kasih |
| `customFooterText` | string\|null | `null` | Teks tambahan footer |
| `showSocialMedia` | boolean | `false` | Tampilkan social media |
| `socialMedia.instagram` | string\|null | `null` | Username Instagram |
| `socialMedia.facebook` | string\|null | `null` | Facebook page |
| `socialMedia.whatsapp` | string\|null | `null` | Nomor WhatsApp |
| `instagramLabel` | string | `"IG"` | Label Instagram |
| `facebookLabel` | string | `"FB"` | Label Facebook |
| `whatsappLabel` | string | `"WA"` | Label WhatsApp |
| `showWebsite` | boolean | `false` | Tampilkan website |
| `website` | string\|null | `null` | URL website |
| `separatorChar` | string | `"="` | Karakter pemisah footer |
| `autoCut` | boolean | `true` | Auto-cut kertas |

---

## Usage Examples

### Example 1: Create New Receipt Template

```javascript
// Using ofetch custom wrapper
const response = await api.post('/system/receipt-settings', {
  type: 'receipt',
  name: 'English Receipt',
  settings: {
    body: {
      orderLabel: 'Order',
      dateLabel: 'Date',
      typeLabel: 'Type',
      dineInLabel: 'Dine In',
      takeawayLabel: 'Takeaway',
      deliveryLabel: 'Delivery',
      tableLabel: 'Table',
      customerLabel: 'Customer',
      cashierLabel: 'Cashier',
      subtotalLabel: 'Subtotal',
      discountLabel: 'Discount',
      taxLabel: 'Tax',
      totalLabel: 'TOTAL',
      paymentLabel: 'Payment',
      paidLabel: 'Paid',
      changeLabel: 'Change',
      paymentMethodLabels: {
        cash: 'Cash',
        debit: 'Debit Card',
        credit: 'Credit Card',
        qris: 'QRIS',
        transfer: 'Bank Transfer'
      }
    },
    footer: {
      thankYouMessage: 'Thank you for your visit!'
    }
  }
});

console.log(response.message); // "Receipt template created successfully: receipt"
```

---

### Example 2: Update Existing Template

```javascript
// Update receipt template to English
await api.put('/system/receipt-settings', {
  type: 'receipt',
  settings: {
    body: {
      orderLabel: 'Order',
      dateLabel: 'Date',
      totalLabel: 'TOTAL'
    },
    footer: {
      thankYouMessage: 'Thank you for your visit!'
    }
  }
});
```

---

### Example 3: Customize Kitchen Ticket

```javascript
await api.put('/system/receipt-settings', {
  type: 'kitchen',
  settings: {
    header: {
      customHeaderText: '=== KITCHEN ORDER ===',
    },
    body: {
      orderLabel: 'Order No',
      typeLabel: 'Type',
      tableLabel: 'Table',
      customerLabel: 'For',
      notesLabel: 'Special Request',
      showModifiers: true,
      showNotes: true
    },
    footer: {
      customFooterText: 'PREPARE IMMEDIATELY!'
    }
  }
});
```

**Kitchen Ticket Result:**
```
================================
    === KITCHEN ORDER ===
================================

Order No: #20250001
Type    : Dine In
Table   : 5
For     : John Doe

--------------------------------
2x Nasi Goreng
   + Extra pedas
   + Tanpa bawang

1x Teh Manis
   Special Request: Dingin, gula dikit
--------------------------------

PREPARE IMMEDIATELY!
```

---

### Example 4: Create Report Template

```javascript
await api.post('/system/receipt-settings', {
  type: 'report',
  name: 'Daily Sales Report',
  settings: {
    header: {
      customHeaderText: '=== LAPORAN PENJUALAN HARIAN ===',
      showBusinessName: true,
      showAddress: false,
      showPhone: false
    },
    body: {
      reportLabel: 'Laporan',
      reportTypeLabel: 'Jenis',
      periodLabel: 'Periode',
      dateLabel: 'Tanggal',
      printedByLabel: 'Dicetak oleh',
      showSummary: true,
      summaryLabel: 'Ringkasan',
      totalLabel: 'Total Penjualan'
    },
    footer: {
      customFooterText: 'Dokumen ini dicetak otomatis oleh sistem',
      autoCut: true
    }
  }
});
```

**Report Result:**
```
================================
=== LAPORAN PENJUALAN HARIAN ===
       RESTO ABC
================================

Laporan : Sales Summary
Jenis   : Daily Report
Periode : 08 Dec 2025
Tanggal : 08 Dec 2025 23:59
Dicetak oleh: Admin

--------------------------------
Ringkasan:
Total Order     : 150
Total Penjualan : Rp 15.000.000
Tunai           : Rp 8.000.000
Non-Tunai       : Rp 7.000.000
--------------------------------

Dokumen ini dicetak otomatis oleh sistem
================================
```

---

### Example 5: Get All Templates

```javascript
const response = await api.get('/system/receipt-settings');

console.log(response.data);
// {
//   receipt: { ... },
//   kitchen: { ... },
//   label: { ... },
//   invoice: { ... },
//   report: { ... }
// }
```

---

### Example 6: Get Specific Template

```javascript
const receiptTemplate = await api.get('/system/receipt-settings?type=receipt');
console.log(receiptTemplate.data.body.orderLabel); // "Order"

const kitchenTemplate = await api.get('/system/receipt-settings?type=kitchen');
console.log(kitchenTemplate.data.body.showPrices); // false
```

---

### Example 7: Reset Specific Template

```javascript
// Reset only kitchen template to default
const response = await api.post('/system/receipt-settings/reset?type=kitchen');

console.log(response.message); 
// "Receipt template settings reset to default: kitchen"
```

---

### Example 8: Reset All Templates

```javascript
// Reset all templates to default
const response = await api.post('/system/receipt-settings/reset');

console.log(response.data);
// {
//   receipt: { ... default ... },
//   kitchen: { ... default ... },
//   label: { ... default ... },
//   invoice: { ... default ... },
//   report: { ... default ... }
// }
```

---

### Example 2: Add Tax Number & Social Media

```javascript
PUT /api/v1/system/receipt-settings

{
  "header": {
    "showTaxNumber": true,
    "taxNumber": "01.234.567.8-901.000",
    "customHeaderText": "Cabang Pusat - Jakarta"
  },
  "footer": {
    "showSocialMedia": true,
    "socialMedia": {
      "instagram": "@restoabc_id",
      "facebook": "RestoABC Indonesia",
      "whatsapp": "081234567890"
    },
    "showWebsite": true,
    "website": "www.restoabc.id"
  }
}
```

**Result:**
```
================================
       RESTO ABC
   Jl. Sudirman No. 123
      Jakarta Pusat
     Tel: 021-1234567
  NPWP: 01.234.567.8-901.000
  Cabang Pusat - Jakarta
================================
... [order details] ...
================================
Terima kasih atas kunjungan Anda!

IG: @restoabc_id
FB: RestoABC Indonesia
WA: 081234567890
www.restoabc.id
================================
```

---

### Example 3: Hide Customer & Payment Breakdown

```javascript
PUT /api/v1/system/receipt-settings

{
  "body": {
    "showCustomer": false,
    "showPaymentBreakdown": false
  }
}
```

**Result:**
```
================================
       RESTO ABC
================================

Order   : #20250001
Tanggal : 08 Dec 2025 14:30
Tipe    : Take Away
Meja    : 5
Kasir   : Admin

--------------------------------
Nasi Goreng          Rp 25.000
Teh Manis            Rp 5.000
--------------------------------
Subtotal             Rp 30.000
Pajak (10%)          Rp 3.000
--------------------------------
TOTAL                Rp 33.000

Pembayaran           Rp 33.000
================================
Terima kasih atas kunjungan Anda!
================================
```

---

### Example 4: Custom Business Info

```javascript
PUT /api/v1/system/receipt-settings

{
  "header": {
    "businessNameOverride": "GYM KU - Cabang Sudirman",
    "addressOverride": "Jl. Jendral Sudirman No. 456",
    "phoneOverride": "021-87654321",
    "customHeaderText": "Buka Setiap Hari: 06:00 - 23:00"
  },
  "footer": {
    "customFooterText": "Nikmati promo member baru!"
  }
}
```

**Result:**
```
================================
  GYM KU - Cabang Sudirman
 Jl. Jendral Sudirman No. 456
       Jakarta Pusat
    Tel: 021-87654321
Buka Setiap Hari: 06:00 - 23:00
================================
... [order details] ...
================================
Terima kasih atas kunjungan Anda!
Nikmati promo member baru!
================================
```

---

### Example 5: Minimal Receipt (Hide Everything)

```javascript
PUT /api/v1/system/receipt-settings

{
  "header": {
    "showAddress": false,
    "showCity": false,
    "showPhone": false
  },
  "body": {
    "showOrderType": false,
    "showTable": false,
    "showCustomer": false,
    "showCashier": false,
    "showDiscount": false,
    "showTax": false,
    "showPaymentBreakdown": false,
    "showPaidAmount": false,
    "showChange": false
  },
  "footer": {
    "showThankYou": false
  }
}
```

**Result:**
```
================================
       RESTO ABC
================================

Order   : #20250001
Tanggal : 08 Dec 2025 14:30

--------------------------------
Nasi Goreng          Rp 25.000
Teh Manis            Rp 5.000
--------------------------------
TOTAL                Rp 33.000

Pembayaran           Rp 33.000
================================
```

---

### Example 6: Bilingual Labels

```javascript
PUT /api/v1/system/receipt-settings

{
  "body": {
    "orderLabel": "Order / Pesanan",
    "dateLabel": "Date / Tanggal",
    "totalLabel": "TOTAL / JUMLAH",
    "paymentLabel": "Payment / Pembayaran"
  },
  "footer": {
    "thankYouMessage": "Thank you! / Terima kasih!"
  }
}
```

---

### Example 7: Change Separator Characters

```javascript
PUT /api/v1/system/receipt-settings

{
  "header": {
    "separatorChar": "*"
  },
  "body": {
    "separatorChar": "~"
  },
  "footer": {
    "separatorChar": "-"
  }
}
```

**Result:**
```
********************************
       RESTO ABC
********************************
Order   : #20250001
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Nasi Goreng          Rp 25.000
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
TOTAL                Rp 33.000
--------------------------------
Terima kasih atas kunjungan Anda!
--------------------------------
```

---

### Example 8: Disable Auto-Cut

```javascript
PUT /api/v1/system/receipt-settings

{
  "footer": {
    "autoCut": false
  }
}
```

> Berguna jika ingin manual cut atau printer tidak support auto-cut.

---

### Example 9: Test Print Before Saving

Test template settings sebelum commit ke database.

```javascript
// 1. Get current settings
const currentSettings = await api.get('/system/receipt-settings?type=receipt');

// 2. Modify locally (not saved yet)
const testSettings = {
  ...currentSettings.data,
  body: {
    ...currentSettings.data.body,
    orderLabel: 'Invoice',
    totalLabel: 'GRAND TOTAL'
  },
  footer: {
    ...currentSettings.data.footer,
    thankYouMessage: 'Thank you for your business!'
  }
};

// 3. Test print dengan settings baru (no save)
const printerList = await api.get('/system/printers');
const printer = printerList.data.find(p => p.isActive && p.printerType === 'receipt');

await api.post('/system/receipt-settings/test-print', {
  type: 'receipt',
  printerId: printer.id,
  settings: testSettings
});

// 4. Check hasil print fisik di printer

// 5. Jika OK, save settings ke database
await api.put('/system/receipt-settings', {
  type: 'receipt',
  settings: testSettings
});

console.log('Settings saved after successful test!');
```

**Custom Sample Data untuk Test:**
```javascript
await api.post('/system/receipt-settings/test-print', {
  type: 'membership',
  printerId: printer.id,
  settings: {
    paperWidth: 48,
    header: { showBusinessName: true },
    body: { totalLabel: 'TOTAL PEMBAYARAN' },
    footer: { thankYouMessage: 'Selamat bergabung!' }
  },
  sampleData: {
    businessName: 'Fitness Center Pro',
    member: 'John Doe',
    memberId: 'MBR-00123',
    packageName: 'Platinum Membership - 12 Bulan',
    startDate: '01/01/2025',
    endDate: '31/12/2025',
    validityPeriod: '12 Bulan',
    price: 5000000,
    discount: 500000,
    tax: 450000,
    total: 4950000
  }
});
```

**Workflow:**
1. **Get** current settings
2. **Modify** locally (in memory)
3. **Test print** dengan settings baru (tidak save)
4. **Verify** hasil print fisik
5. **Save** jika OK, atau adjust lagi jika perlu

---

### Example 10: Quick Test Print (Saved Settings)

Test print menggunakan settings yang sudah tersimpan - paling simple.

```javascript
// 1. Save settings terlebih dahulu
await api.put('/system/receipt-settings', {
  type: 'membership',
  settings: {
    paperWidth: 48,
    header: {
      showBusinessName: true,
      customHeaderText: 'Fitness Center Pro'
    },
    body: {
      totalLabel: 'TOTAL PEMBAYARAN'
    },
    footer: {
      thankYouMessage: 'Selamat bergabung! Nikmati fasilitas kami.'
    }
  }
});

// 2. Quick test print - no need to send settings!
const printerList = await api.get('/system/printers');
const printer = printerList.data.find(p => p.isActive && p.printerType === 'receipt');

await api.post('/system/receipt-settings/test-print-actual', {
  type: 'membership',
  printerId: printer.id
});

console.log('Test print sent using saved settings!');
```

**Dengan Custom Sample Data:**
```javascript
// Test dengan data custom
await api.post('/system/receipt-settings/test-print-actual', {
  type: 'membership',
  printerId: printer.id,
  sampleData: {
    businessName: 'Fitness Center Pro',
    member: 'Jane Smith',
    memberId: 'MBR-99999',
    packageName: 'Diamond Membership - 12 Bulan',
    startDate: '01/01/2025',
    endDate: '31/12/2025',
    validityPeriod: '12 Bulan',
    price: 10000000,
    total: 10000000
  }
});
```

**Frontend Component (Vue.js):**
```vue
<template>
  <button @click="handleQuickTest" :disabled="testing">
    {{ testing ? 'Printing...' : 'Test Print' }}
  </button>
</template>

<script setup>
import { ref } from 'vue'
import { useReceiptSettings } from '@/composables/gym/useReceiptSettings'

const { testPrintActual } = useReceiptSettings()
const testing = ref(false)

const handleQuickTest = async () => {
  testing.value = true
  try {
    const result = await testPrintActual('membership', activePrinterId.value)
    showSuccess(`Sent to ${result.printerName}`)
  } catch (error) {
    showError('Print failed: ' + error.message)
  } finally {
    testing.value = false
  }
}
</script>
```

**Keuntungan:**
- ✅ Paling simple - tidak perlu kirim settings
- ✅ Langsung pakai settings yang sudah di-save
- ✅ Cocok untuk tombol "Test Print" di UI
- ✅ Quick verification setelah save

**Use Case:**
- Test setelah save settings baru
- Daily printer testing
- Verify printer masih berfungsi
- Training dengan settings production

---

## Integration Guide

### Backend Usage (Auto-Applied)

Settings **otomatis diterapkan** saat print. Template di-load dari `tenant.settings.receiptTemplates` dengan **fallback ke hardcode default**:

```javascript
// src/services/receiptPrinterService.js

async function printOrderReceipt(order, tenant, options = {}) {
  // Auto-load from tenant.settings.receiptTemplates
  // If not found, fallback to hardcode default
  const templates = tenant.settings?.receiptTemplates || {};
  const template = templates.receipt || getDefaultOrderReceiptTemplate();
  
  // Build receipt with custom settings
  const receiptContent = buildOrderReceipt(order, tenant, template);
  
  // Print to thermal printer
  await sendToPrinter(printer, receiptContent);
}

async function printKitchenTicket(order, items, tenant) {
  // Auto-load kitchen template
  // If not found, fallback to hardcode default
  const templates = tenant.settings?.receiptTemplates || {};
  const template = templates.kitchen || getDefaultKitchenTicketTemplate();
  
  // Build kitchen ticket (no prices)
  const ticketContent = buildKitchenTicket(order, items, tenant, template);
  
  // Print to kitchen printer
  await sendToPrinter(kitchenPrinter, ticketContent);
}
```

**Tidak perlu ubah kode controller!** Template otomatis diambil dari tenant settings atau fallback ke default hardcode.

**Flow:**
1. Load `tenant.settings.receiptTemplates.receipt`
2. Jika tidak ada → gunakan `getDefaultOrderReceiptTemplate()` (hardcode)
3. Build receipt dengan template
4. Print ke printer

---

### Creating Custom Print Function

Example: Print gym membership receipt

```javascript
// src/services/membershipPrinterService.js

const { sendToPrinter, COMMANDS } = require('./receiptPrinterService');

async function printMembershipReceipt(membership, payment, tenant) {
  // Load membership receipt template
  const templates = tenant.settings?.receiptTemplates || {};
  const template = templates.membershipReceipt || getDefaultMembershipTemplate();
  
  // Build receipt
  const content = buildMembershipReceipt(membership, payment, tenant, template);
  
  // Get printer
  const printer = tenant.settings?.printers?.find(p => 
    p.printerType === 'receipt' && p.isDefault && p.isActive
  );
  
  if (!printer) {
    throw new Error('No printer configured');
  }
  
  // Print
  await sendToPrinter(printer.ipAddress, printer.port || 9100, content);
}

function buildMembershipReceipt(membership, payment, tenant, template = {}) {
  const { header, body, footer } = template;
  const paperWidth = template.paperWidth || 48;
  let content = '';
  
  // Initialize
  content += COMMANDS.INIT;
  content += COMMANDS.ALIGN_CENTER;
  
  // Header
  if (header.showBusinessName !== false) {
    content += COMMANDS.DOUBLE_SIZE_ON;
    content += (header.businessNameOverride || tenant.name) + COMMANDS.LINE_FEED;
    content += COMMANDS.NORMAL_SIZE;
  }
  
  if (header.showAddress !== false && tenant.address) {
    content += tenant.address + COMMANDS.LINE_FEED;
    if (tenant.city && header.showCity !== false) {
      content += tenant.city + COMMANDS.LINE_FEED;
    }
  }
  
  if (header.showPhone !== false && tenant.phone) {
    content += `Tel: ${tenant.phone}` + COMMANDS.LINE_FEED;
  }
  
  if (header.showTaxNumber && header.taxNumber) {
    content += `NPWP: ${header.taxNumber}` + COMMANDS.LINE_FEED;
  }
  
  content += COMMANDS.LINE_FEED;
  content += '='.repeat(paperWidth) + COMMANDS.LINE_FEED;
  
  // Title
  content += COMMANDS.BOLD_ON;
  content += (body.receiptLabel || 'BUKTI PEMBAYARAN MEMBER') + COMMANDS.LINE_FEED;
  content += COMMANDS.BOLD_OFF;
  content += COMMANDS.LINE_FEED;
  
  // Body
  content += COMMANDS.ALIGN_LEFT;
  content += `${body.receiptNumberLabel || 'No'}: ${payment.receiptNumber}` + COMMANDS.LINE_FEED;
  content += `${body.dateLabel || 'Tanggal'}: ${formatDate(payment.createdAt)}` + COMMANDS.LINE_FEED;
  content += COMMANDS.LINE_FEED;
  
  content += `${body.memberLabel || 'Nama Member'}: ${membership.user.name}` + COMMANDS.LINE_FEED;
  content += `${body.memberIdLabel || 'No Member'}: ${membership.memberNumber}` + COMMANDS.LINE_FEED;
  content += COMMANDS.LINE_FEED;
  
  content += '-'.repeat(paperWidth) + COMMANDS.LINE_FEED;
  content += `${body.planLabel || 'Paket'}: ${membership.plan.name}` + COMMANDS.LINE_FEED;
  content += `${body.durationLabel || 'Durasi'}: ${membership.duration} Bulan` + COMMANDS.LINE_FEED;
  content += `${body.startDateLabel || 'Mulai'}: ${formatDate(membership.startDate)}` + COMMANDS.LINE_FEED;
  content += `${body.endDateLabel || 'Berakhir'}: ${formatDate(membership.endDate)}` + COMMANDS.LINE_FEED;
  content += '-'.repeat(paperWidth) + COMMANDS.LINE_FEED;
  
  // Total
  content += COMMANDS.BOLD_ON;
  if (body.totalDoubleSize !== false) {
    content += COMMANDS.DOUBLE_HEIGHT_ON;
  }
  content += padLine(body.totalLabel || 'TOTAL', formatCurrency(payment.amount), paperWidth) + COMMANDS.LINE_FEED;
  content += COMMANDS.NORMAL_SIZE;
  content += COMMANDS.BOLD_OFF;
  content += COMMANDS.LINE_FEED;
  
  // Payment method
  content += `${body.paymentMethodLabel || 'Metode'}` + COMMANDS.LINE_FEED;
  const methodLabel = body.paymentMethodLabels?.[payment.method] || payment.method;
  content += padLine(`- ${methodLabel}`, formatCurrency(payment.amount), paperWidth) + COMMANDS.LINE_FEED;
  
  content += '='.repeat(paperWidth) + COMMANDS.LINE_FEED;
  
  // Footer
  content += COMMANDS.ALIGN_CENTER;
  if (footer.showThankYou !== false) {
    content += COMMANDS.LINE_FEED;
    content += (footer.thankYouMessage || 'Selamat berolahraga!') + COMMANDS.LINE_FEED;
  }
  
  if (footer.customFooterText) {
    content += COMMANDS.LINE_FEED;
    // Split multi-line text
    const lines = footer.customFooterText.split('\\n');
    lines.forEach(line => {
      content += line + COMMANDS.LINE_FEED;
    });
  }
  
  if (footer.showSocialMedia && footer.socialMedia) {
    content += COMMANDS.LINE_FEED;
    if (footer.socialMedia.instagram) {
      content += `${footer.instagramLabel || 'IG'}: ${footer.socialMedia.instagram}` + COMMANDS.LINE_FEED;
    }
    if (footer.socialMedia.whatsapp) {
      content += `${footer.whatsappLabel || 'WA'}: ${footer.socialMedia.whatsapp}` + COMMANDS.LINE_FEED;
    }
  }
  
  content += '='.repeat(paperWidth) + COMMANDS.LINE_FEED;
  
  // Auto cut
  if (footer.autoCut !== false) {
    content += COMMANDS.FEED_AND_CUT;
  }
  
  return content;
}

function getDefaultMembershipTemplate() {
  return {
    paperWidth: 48,
    header: {
      showBusinessName: true,
      showAddress: true,
      showCity: true,
      showPhone: true,
      showTaxNumber: false,
      separatorChar: '='
    },
    body: {
      receiptLabel: 'BUKTI PEMBAYARAN MEMBER',
      receiptNumberLabel: 'No',
      dateLabel: 'Tanggal',
      memberLabel: 'Nama Member',
      memberIdLabel: 'No Member',
      planLabel: 'Paket',
      durationLabel: 'Durasi',
      startDateLabel: 'Mulai',
      endDateLabel: 'Berakhir',
      totalLabel: 'TOTAL',
      totalDoubleSize: true,
      paymentMethodLabel: 'Metode',
      paymentMethodLabels: {
        cash: 'Tunai',
        debit: 'Debit',
        credit: 'Kredit',
        qris: 'QRIS',
        transfer: 'Transfer'
      }
    },
    footer: {
      showThankYou: true,
      thankYouMessage: 'Selamat berolahraga!',
      customFooterText: 'Simpan struk ini sebagai bukti pembayaran',
      separatorChar: '=',
      autoCut: true
    }
  };
}

module.exports = {
  printMembershipReceipt,
  buildMembershipReceipt
};
```

**Usage in controller:**
```javascript
// src/controllers/gym/membershipController.js

const { printMembershipReceipt } = require('../../services/membershipPrinterService');

async function createMembership(req, res, next) {
  try {
    // ... create membership and payment ...
    
    // Auto-print receipt
    const tenant = await Tenant.findByPk(req.user.tenantId);
    await printMembershipReceipt(membership, payment, tenant);
    
    res.json({ success: true, data: membership });
  } catch (error) {
    next(error);
  }
}
```

---

---

### Frontend Integration (Vue.js)

**Setup ofetch custom wrapper:**
```javascript
// composables/useApi.js
import { ofetch } from 'ofetch';

const api = ofetch.create({
  baseURL: '/api/v1',
  headers: {
    Authorization: `Bearer ${localStorage.getItem('token')}`
  }
});

export const useApi = () => ({
  get: (url, options) => api(url, { method: 'GET', ...options }),
  post: (url, body, options) => api(url, { method: 'POST', body, ...options }),
  put: (url, body, options) => api(url, { method: 'PUT', body, ...options }),
  patch: (url, body, options) => api(url, { method: 'PATCH', body, ...options }),
  delete: (url, options) => api(url, { method: 'DELETE', ...options })
});
```

**Component:**
```vue
<template>
  <div class="receipt-settings">
    <h2>Receipt Template Settings</h2>
    
    <!-- Template Type Selector -->
    <div class="template-selector">
      <button 
        v-for="type in templateTypes" 
        :key="type.value"
        :class="{ active: selectedType === type.value }"
        @click="selectTemplate(type.value)"
      >
        {{ type.label }}
      </button>
    </div>
    
    <!-- Template Editor -->
    <div v-if="settings[selectedType]" class="template-editor">
      
      <!-- Language Quick Switch -->
      <div class="language-selector">
        <button @click="setLanguage('id')">Bahasa Indonesia</button>
        <button @click="setLanguage('en')">English</button>
      </div>
      
      <!-- Business Info (Header) -->
      <fieldset v-if="selectedType !== 'kitchen' && selectedType !== 'label'">
        <legend>Business Information</legend>
        <label>
          <input type="checkbox" v-model="settings[selectedType].header.showBusinessName" />
          Show Business Name
        </label>
        <label v-if="settings[selectedType].header.showBusinessName">
          Business Name Override:
          <input v-model="settings[selectedType].header.businessNameOverride" 
                 placeholder="Leave empty to use default" />
        </label>
        
        <label>
          <input type="checkbox" v-model="settings[selectedType].header.showTaxNumber" />
          Show Tax Number (NPWP)
        </label>
        <label v-if="settings[selectedType].header.showTaxNumber">
          Tax Number:
          <input v-model="settings[selectedType].header.taxNumber" 
                 placeholder="01.234.567.8-901.000" />
        </label>
      </fieldset>
      
      <!-- Display Options (Body) -->
      <fieldset v-if="selectedType === 'receipt'">
        <legend>Display Options</legend>
        <label>
          <input type="checkbox" v-model="settings[selectedType].body.showCustomer" />
          Show Customer Name
        </label>
        <label>
          <input type="checkbox" v-model="settings[selectedType].body.showPaymentBreakdown" />
          Show Payment Method Breakdown
        </label>
      </fieldset>
      
      <!-- Kitchen Ticket Options -->
      <fieldset v-if="selectedType === 'kitchen'">
        <legend>Kitchen Display Options</legend>
        <label>
          <input type="checkbox" v-model="settings[selectedType].body.showModifiers" />
          Show Item Modifiers
        </label>
        <label>
          <input type="checkbox" v-model="settings[selectedType].body.showNotes" />
          Show Special Notes
        </label>
      </fieldset>
      
      <!-- Report Options -->
      <fieldset v-if="selectedType === 'report'">
        <legend>Report Options</legend>
        <label>
          Header Text:
          <input v-model="settings[selectedType].header.customHeaderText" 
                 placeholder="=== LAPORAN ===" />
        </label>
        <label>
          <input type="checkbox" v-model="settings[selectedType].body.showSummary" />
          Show Summary Section
        </label>
      </fieldset>
      
      <!-- Social Media (Footer) -->
      <fieldset v-if="selectedType !== 'kitchen' && selectedType !== 'label'">
        <legend>Social Media</legend>
        <label>
          <input type="checkbox" v-model="settings[selectedType].footer.showSocialMedia" />
          Enable Social Media
        </label>
        <div v-if="settings[selectedType].footer.showSocialMedia">
          <label>
            Instagram: @
            <input v-model="settings[selectedType].footer.socialMedia.instagram" />
          </label>
          <label>
            WhatsApp:
            <input v-model="settings[selectedType].footer.socialMedia.whatsapp" />
          </label>
        </div>
      </fieldset>
      
      <!-- Actions -->
      <div class="actions">
        <button @click="saveSettings" class="btn-primary">
          Save {{ templateTypes.find(t => t.value === selectedType)?.label }}
        </button>
        <button @click="resetSettings" class="btn-secondary">
          Reset to Default
        </button>
        <button @click="previewReceipt" class="btn-info">
          Preview
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useApi } from '@/composables/useApi';

const api = useApi();

const templateTypes = [
  { value: 'receipt', label: 'Receipt' },
  { value: 'kitchen', label: 'Kitchen Order' },
  { value: 'label', label: 'Label' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'report', label: 'Report' }
];

const selectedType = ref('receipt');
const settings = ref({});

// Load all templates
onMounted(async () => {
  const response = await api.get('/system/receipt-settings');
  settings.value = response.data;
});

// Switch template
const selectTemplate = async (type) => {
  selectedType.value = type;
  
  // Load if not yet loaded
  if (!settings.value[type]) {
    const response = await api.get(`/system/receipt-settings?type=${type}`);
    settings.value[type] = response.data;
  }
};

// Save specific template
const saveSettings = async () => {
  await api.put('/system/receipt-settings', {
    type: selectedType.value,
    settings: settings.value[selectedType.value]
  });
  alert(`${templateTypes.find(t => t.value === selectedType.value)?.label} saved successfully!`);
};

// Reset specific template
const resetSettings = async () => {
  if (!confirm('Reset this template to default?')) return;
  
  const response = await api.post(`/system/receipt-settings/reset?type=${selectedType.value}`);
  settings.value[selectedType.value] = response.data;
  alert('Template reset to default!');
};

// Quick language switch
const setLanguage = async (lang) => {
  const labels = {
    id: {
      orderLabel: 'Order',
      dateLabel: 'Tanggal',
      totalLabel: 'TOTAL',
      paymentLabel: 'Pembayaran',
      thankYouMessage: 'Terima kasih atas kunjungan Anda!'
    },
    en: {
      orderLabel: 'Order',
      dateLabel: 'Date',
      totalLabel: 'TOTAL',
      paymentLabel: 'Payment',
      thankYouMessage: 'Thank you for your visit!'
    }
  };
  
  await api.put('/system/receipt-settings', {
    type: selectedType.value,
    settings: {
      body: labels[lang],
      footer: { thankYouMessage: labels[lang].thankYouMessage }
    }
  });
  
  // Reload
  await selectTemplate(selectedType.value);
  alert(`Language changed to ${lang === 'id' ? 'Indonesian' : 'English'}`);
};

// Preview (call test print endpoint)
const previewReceipt = async () => {
  try {
    // Get active printer
    const printersResponse = await api.get('/system/printers');
    const activePrinter = printersResponse.data.find(p => 
      p.isActive && p.printerType === 'receipt'
    );
    
    if (!activePrinter) {
      alert('No active receipt printer found. Please configure a printer first.');
      return;
    }
    
    // Test print with current settings (not saved)
    await api.post('/system/receipt-settings/test-print', {
      type: selectedType.value,
      printerId: activePrinter.id,
      settings: settings.value[selectedType.value]
    });
    
    alert(`Test print sent to ${activePrinter.name}!`);
  } catch (error) {
    alert('Failed to send test print: ' + error.message);
  }
};
</script>

<style scoped>
.template-selector {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.template-selector button {
  padding: 10px 20px;
  border: 1px solid #ddd;
  background: white;
  cursor: pointer;
}

.template-selector button.active {
  background: #007bff;
  color: white;
}

fieldset {
  margin-bottom: 20px;
  padding: 15px;
  border: 1px solid #ddd;
}

label {
  display: block;
  margin-bottom: 10px;
}

input[type="text"],
input[type="number"],
textarea {
  width: 100%;
  padding: 8px;
  margin-top: 5px;
}

.actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.btn-primary {
  background: #007bff;
  color: white;
  padding: 10px 20px;
  border: none;
  cursor: pointer;
}

.btn-secondary {
  background: #6c757d;
  color: white;
  padding: 10px 20px;
  border: none;
  cursor: pointer;
}

.btn-info {
  background: #17a2b8;
  color: white;
  padding: 10px 20px;
  border: none;
  cursor: pointer;
}
</style>
```

---

### Backend Usage (Auto-Applied)

Settings otomatis diterapkan saat print receipt:

```javascript
// src/services/receiptPrinterService.js

async function printOrderReceipt(order, tenant, printer) {
  // Load template settings from tenant
  const template = tenant.settings?.receiptTemplate || getDefaultTemplate();
  
  // Build receipt with custom settings
  const receiptContent = buildOrderReceipt(order, tenant, template);
  
  // Print to thermal printer
  await sendToPrinter(printer, receiptContent);
}
```

**Tidak perlu ubah kode!** Semua kustomisasi otomatis diterapkan.

---

## Best Practices

### 1. **Use Correct Template Type**
Pilih template type sesuai use case:
```javascript
// ✅ Good - Specific template for specific purpose
await api.put('/system/receipt-settings', {
  type: 'kitchen',
  settings: {...}  // For kitchen
});

await api.post('/system/receipt-settings', {
  type: 'report',
  settings: {...}  // For reports
});

await api.put('/system/receipt-settings', {
  type: 'receipt',
  settings: {...}  // For customer receipt
});

// ❌ Avoid - Using wrong template
await api.put('/system/receipt-settings', {
  type: 'receipt',
  settings: { showPrices: false }  // Use 'kitchen' template instead
});
```

### 2. **Create Before Update**
Template harus dibuat dulu sebelum bisa di-update:
```javascript
// ✅ Good - Create first
try {
  await api.post('/system/receipt-settings', {
    type: 'receipt',
    name: 'Custom Receipt',
    settings: {...}
  });
} catch (error) {
  if (error.statusCode === 409) {
    // Already exists, update instead
    await api.put('/system/receipt-settings', {
      type: 'receipt',
      settings: {...}
    });
  }
}

// OR check first
const templates = await api.get('/system/receipt-settings');
if (!templates.data.receipt) {
  // Create new
  await api.post('/system/receipt-settings', { type: 'receipt', settings: {...} });
} else {
  // Update existing
  await api.put('/system/receipt-settings', { type: 'receipt', settings: {...} });
}
```

### 3. **Template-Specific Features**
Setiap template punya field berbeda:
```javascript
// Kitchen Template - No prices, has modifiers
await api.put('/system/receipt-settings', {
  type: 'kitchen',
  settings: {
    body: {
      showPrices: false,      // Kitchen doesn't need prices
      showModifiers: true,    // Show cooking instructions
      showNotes: true         // Show special requests
    }
  }
});

// Report Template - Has summary section
await api.put('/system/receipt-settings', {
  type: 'report',
  settings: {
    body: {
      showSummary: true,
      reportLabel: 'Laporan',
      periodLabel: 'Periode'
    }
  }
});
```

### 4. **Partial Updates**
Kirim hanya field yang diubah:
```javascript
// ✅ Good
await api.put('/system/receipt-settings', {
  type: 'receipt',
  settings: {
    footer: { thankYouMessage: 'New message' }
  }
});

// ❌ Avoid (unnecessary)
await api.put('/system/receipt-settings', {
  type: 'receipt',
  settings: {
    header: {...},  // Full object
    body: {...},
    footer: {...}
  }
});
```

### 5. **Get Before Update**
Load existing settings sebelum update:
```javascript
// 1. Get current settings
const response = await api.get('/system/receipt-settings?type=receipt');
const currentSettings = response.data;

// 2. Modify only what you need
const updatedSettings = {
  ...currentSettings,
  footer: {
    ...currentSettings.footer,
    thankYouMessage: 'New message'
  }
};

// 3. Update
await api.put('/system/receipt-settings', {
  type: 'receipt',
  settings: updatedSettings
});
```

### 6. **Backup Before Reset**
Simpan settings sebelum reset:
```javascript
// Backup specific template
const backup = await api.get('/system/receipt-settings?type=kitchen');
localStorage.setItem('kitchen-backup', JSON.stringify(backup.data));

// Reset
await api.post('/system/receipt-settings/reset?type=kitchen');

// Restore if needed
await api.put('/system/receipt-settings', {
  type: 'kitchen',
  settings: JSON.parse(localStorage.getItem('kitchen-backup'))
});
```

### 7. **Paper Width by Template**
Sesuaikan paper width dengan template type:
```javascript
{
  receipt: { paperWidth: 48 },      // 80mm standard receipt
  kitchen: { paperWidth: 48 },      // 80mm for visibility
  invoice: { paperWidth: 48 },      // 80mm formal invoice
  report: { paperWidth: 48 },       // 80mm formal report
  label: { paperWidth: 32 }         // 58mm compact label
}
```

---

## Troubleshooting

### Problem: Settings tidak diterapkan saat print

**Solution:**
1. Cek apakah settings sudah tersimpan:
   ```javascript
   GET /api/v1/system/receipt-settings
   ```

2. Pastikan `tenant.settings.receiptTemplate` ada di database

3. Restart server jika perlu (auto-reload settings)

---

### Problem: Character encoding issues (special chars)

**Solution:**
Hindari special characters di separatorChar:
```javascript
// ✅ Safe characters
"separatorChar": "=" | "-" | "*" | "~"

// ❌ Avoid
"separatorChar": "═" | "─" | "•"  // May not render on thermal printer
```

---

### Problem: Receipt terpotong (cut-off text)

**Solution:**
Kurangi `paperWidth`:
```javascript
// If text is cut-off, reduce width
PUT /api/v1/system/receipt-settings
{ "paperWidth": 42 }  // Try 42 instead of 48
```

---

## Related Documentation

- [Receipt Template Controller](./RECEIPT-TEMPLATE-CONTROLLER.md) - Original Handlebars template system
- [Vue.js Receipt Integration](../frontend-integration/VUEJS-RECEIPT-TEMPLATE.md) - Complete frontend guide
- [ESC/POS Commands](./ESCPOS-COMMANDS.md) - Thermal printer commands reference
- [Restaurant Order API](./RESTAURANT-ORDER-ENDPOINTS.md) - Auto-print integration

---

## Changelog

### Version 2.0.0 (2025-12-08)
- ✅ **[BREAKING]** Multi-template system: `receiptTemplate` → `receiptTemplates`
- ✅ Added 5 template types: orderReceipt, kitchenTicket, membershipReceipt, invoiceReceipt, labelReceipt
- ✅ Template-specific fields (kitchen: showModifiers, membership: validity period, invoice: bank info)
- ✅ Query parameter `?type=` for GET and reset endpoints
- ✅ Request body `{ type, settings }` for PUT endpoint
- ✅ Reset per template or all templates

### Version 1.0.0 (2025-12-08)
- ✅ Initial release with 50+ customization variables
- ✅ Multi-language support
- ✅ Partial update with auto-merge
- ✅ Reset to default functionality
- ✅ CASL authorization integration

---

## Migration Guide (v1 to v2)

### Breaking Changes

**Old structure (v1):**
```json
{
  "settings": {
    "receiptTemplate": {
      "paperWidth": 48,
      "header": {...},
      "body": {...},
      "footer": {...}
    }
  }
}
```

**New structure (v2):**
```json
{
  "settings": {
    "receiptTemplates": {
      "orderReceipt": {
        "paperWidth": 48,
        "header": {...},
        "body": {...},
        "footer": {...}
      },
      "kitchenTicket": {...},
      "membershipReceipt": {...}
    }
  }
}
```

### API Changes

| Operation | Old (v1) | New (v2) |
|-----------|----------|----------|
| Get all | `GET /receipt-settings` | `GET /receipt-settings` (returns all types) |
| Get specific | N/A | `GET /receipt-settings?type=orderReceipt` |
| Update | `PUT /receipt-settings` with settings | `PUT /receipt-settings` with `{type, settings}` |
| Reset all | `POST /receipt-settings/reset` | `POST /receipt-settings/reset` |
| Reset specific | N/A | `POST /receipt-settings/reset?type=orderReceipt` |

### Code Migration

**Before (v1):**
```javascript
// Update
await axios.put('/api/v1/system/receipt-settings', {
  body: { orderLabel: "Order" }
});

// Get
const response = await axios.get('/api/v1/system/receipt-settings');
const settings = response.data.data;
```

**After (v2):**
```javascript
// Update - Must specify type
await axios.put('/api/v1/system/receipt-settings', {
  type: 'orderReceipt',
  settings: {
    body: { orderLabel: "Order" }
  }
});

// Get specific type
const response = await axios.get('/api/v1/system/receipt-settings?type=orderReceipt');
const settings = response.data.data;

// Get all types
const allTemplates = await axios.get('/api/v1/system/receipt-settings');
const orderSettings = allTemplates.data.data.orderReceipt;
```

### Backend Service Changes

**Before (v1):**
```javascript
const template = tenant.settings?.receiptTemplate || getDefaultTemplate();
const receipt = buildOrderReceipt(order, tenant, template);
```

**After (v2):**
```javascript
const templates = tenant.settings?.receiptTemplates || {};
const orderTemplate = templates.orderReceipt || getDefaultTemplate('orderReceipt');
const kitchenTemplate = templates.kitchenTicket || getDefaultTemplate('kitchenTicket');

const receipt = buildOrderReceipt(order, tenant, orderTemplate);
const ticket = buildKitchenTicket(order, tenant, kitchenTemplate);
```

---

## Support

Untuk pertanyaan atau issues, hubungi:
- **Technical Support:** dev@example.com
- **Documentation:** docs.example.com

---

**Last Updated:** December 8, 2025  
**Version:** 1.0.0  
**Author:** Backend Team
