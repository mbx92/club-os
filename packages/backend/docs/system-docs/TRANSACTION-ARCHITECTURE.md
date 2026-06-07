# Arsitektur Data untuk Transaksi Gabungan (Membership + POS)

## Pendahuluan

Dokumen ini menjelaskan desain arsitektur data untuk mengakomodasi transaksi gabungan antara pembayaran membership dan penjualan POS cafe dalam sistem gym management.

## Masalah

Saat ini kita memiliki dua jenis pembayaran terpisah:
1. **Payment**: Untuk pembayaran subscription sistem (berlangganan aplikasi)
2. **MembershipPayment**: Untuk pembayaran transaksi gym (membership)

Namun, dengan rencana pengembangan sistem POS untuk cafe, kita perlu mendukung:
1. Transaksi pembelian membership saja
2. Transaksi penjualan POS cafe saja
3. Transaksi gabungan (membership + POS cafe)

## Solusi yang Diusulkan

### 1. Arsitektur Data

Kita akan mengadopsi arsitektur dengan tiga level:

#### Level 1: Transaction (Transaksi Utama)
- Menyimpan informasi transaksi secara umum
- Setiap transaksi bisa mencakup multiple item (membership dan/atau produk POS)
- Memiliki satu pembayaran untuk seluruh transaksi

#### Level 2: TransactionItem (Item Transaksi)
- Menyimpan detail setiap item dalam transaksi
- Bisa berupa membership atau produk POS
- Menghitung subtotal untuk setiap item

#### Level 3: Payment (Pembayaran)
- Menyimpan informasi pembayaran untuk transaksi
- Terhubung ke Transaction utama
- Satu transaksi bisa memiliki multiple pembayaran (misal: cicilan)

### 2. Model Database

#### Model Transaction
```javascript
{
  id: UUID (primary key),
  tenantId: UUID (foreign key),
  transactionNumber: String (unique, auto-generated),
  transactionDate: DateTime,
  customerId: UUID (foreign key, optional - could be member or non-member),
  customerType: Enum('member', 'non-member'),
  subtotal: Decimal,
  tax: Decimal,
  discount: Decimal,
  totalAmount: Decimal,
  status: Enum('pending', 'completed', 'cancelled', 'refunded'),
  notes: Text,
  createdBy: UUID (foreign key),
  createdAt: DateTime,
  updatedAt: DateTime,
  deletedAt: DateTime (soft delete)
}
```

#### Model TransactionItem
```javascript
{
  id: UUID (primary key),
  transactionId: UUID (foreign key),
  itemType: Enum('membership', 'product'),
  itemId: UUID (foreign key - references membership or product),
  itemName: String,
  quantity: Integer,
  unitPrice: Decimal,
  subtotal: Decimal,
  discount: Decimal,
  tax: Decimal,
  total: Decimal,
  notes: Text,
  createdAt: DateTime,
  updatedAt: DateTime
}
```

#### Model Product (untuk POS)
```javascript
{
  id: UUID (primary key),
  tenantId: UUID (foreign key),
  name: String,
  description: Text,
  sku: String (unique per tenant),
  barcode: String (optional),
  category: String,
  price: Decimal,
  cost: Decimal,
  taxRate: Decimal,
  stock: Integer,
  minStock: Integer,
  isActive: Boolean (default true),
  image: String (URL),
  createdAt: DateTime,
  updatedAt: DateTime,
  deletedAt: DateTime (soft delete)
}
```

#### Model TransactionPayment
```javascript
{
  id: UUID (primary key),
  transactionId: UUID (foreign key),
  paymentMethod: Enum('cash', 'credit_card', 'debit_card', 'bank_transfer', 'e_wallet', 'other'),
  amount: Decimal,
  currency: String (default 'IDR'),
  paymentDate: DateTime,
  status: Enum('pending', 'completed', 'failed', 'refunded'),
  transactionId: String (from payment gateway),
  receiptNumber: String (auto-generated),
  notes: Text,
  paymentDetails: JSON,
  createdAt: DateTime,
  updatedAt: DateTime
}
```

### 3. Relasi Antar Model

- `Tenant` has many `Transaction`
- `Transaction` belongs to `Tenant`
- `Transaction` has many `TransactionItem`
- `TransactionItem` belongs to `Transaction`
- `Transaction` has many `TransactionPayment`
- `TransactionPayment` belongs to `Transaction`
- `TransactionItem` can reference `Membership` or `Product`
- `Product` belongs to `Tenant`

### 4. Alur Transaksi

#### Transaksi Membership Saja
1. Create new `Transaction`
2. Add `TransactionItem` with itemType='membership' and itemId=membershipId
3. Calculate totals
4. Add `TransactionPayment`
5. Update membership status if payment completed

#### Transaksi POS Saja
1. Create new `Transaction`
2. Add one or more `TransactionItem` with itemType='product' and itemId=productId
3. Calculate totals
4. Add `TransactionPayment`
5. Update product stock if payment completed

#### Transaksi Gabungan (Membership + POS)
1. Create new `Transaction`
2. Add `TransactionItem` with itemType='membership' and itemId=membershipId
3. Add one or more `TransactionItem` with itemType='product' and itemId=productId
4. Calculate totals
5. Add `TransactionPayment`
6. Update membership status and product stock if payment completed

### 5. Integrasi dengan Model Existing

#### MembershipPayment
Model `MembershipPayment` yang sudah ada akan tetap digunakan untuk:
1. Kompatibilitas dengan data existing
2. Reporting khusus untuk pembayaran membership
3. Integrasi dengan sistem membership

Namun, setiap pembayaran membership baru juga akan membuat `Transaction` dan `TransactionItem` untuk konsistensi data.

#### Payment
Model `Payment` untuk subscription tetap terpisah karena ini adalah pembayaran untuk sistem itu sendiri, bukan transaksi dalam gym.

### 6. Implementasi Bertahap

#### Tahap 1: Membuat Model Baru
- Membuat model `Transaction`, `TransactionItem`, `Product`, dan `TransactionPayment`
- Membuat migrasi untuk model-model tersebut
- Membuat controller dan rute untuk model-model tersebut

#### Tahap 2: Integrasi dengan Membership
- Memperbarui `MembershipPayment` untuk juga membuat `Transaction` dan `TransactionItem`
- Memastikan konsistensi data antara `MembershipPayment` dan `Transaction`

#### Tahap 3: Implementasi POS
- Membuat fitur POS untuk produk
- Mengintegrasikan dengan sistem transaksi gabungan

#### Tahap 4: Fitur Lanjutan
- Reporting untuk transaksi gabungan
- Analisis penjualan
- Manajemen stok produk
- Diskon dan promosi

### 7. Keuntungan Arsitektur Ini

1. **Fleksibilitas**: Dapat mengakomodasi berbagai jenis transaksi
2. **Konsistensi Data**: Satu sumber kebenaran untuk semua transaksi
3. **Skalabilitas**: Mudah menambah jenis item baru di masa depan
4. **Reporting**: Mudah membuat laporan komprehensif
5. **Audit Trail**: Setiap perubahan tercatat dengan jelas

### 8. Contoh Use Case

#### Use Case 1: Member Membeli Membership dan Produk Cafe
1. Kasir mencari member di sistem
2. Kasir memilih jenis membership yang akan dibeli
3. Kasir menambahkan produk cafe (misal: protein shake, snack)
4. Sistem menghitung total pembayaran
5. Kasir memilih metode pembayaran
6. Sistem membuat:
   - `Transaction` dengan customerType='member'
   - `TransactionItem` untuk membership
   - `TransactionItem` untuk setiap produk
   - `TransactionPayment` untuk pembayaran
   - `MembershipPayment` untuk pembayaran membership
7. Sistem mengupdate status membership dan mengurangi stok produk

#### Use Case 2: Non-Member Membeli Produk Cafe
1. Kasir memilih mode transaksi non-member
2. Kasir menambahkan produk cafe
3. Sistem menghitung total pembayaran
4. Kasir memilih metode pembayaran
5. Sistem membuat:
   - `Transaction` dengan customerType='non-member'
   - `TransactionItem` untuk setiap produk
   - `TransactionPayment` untuk pembayaran
6. Sistem mengurangi stok produk

## Kesimpulan

Arsitektur ini dirancang untuk fleksibel dan dapat mengakomodasi berbagai skenario transaksi dalam sistem gym management, termasuk transaksi gabungan antara membership dan POS cafe. Dengan pendekatan bertahap, kita dapat mengimplementasikan fitur-fitur baru tanpa mengganggu sistem yang sudah berjalan.