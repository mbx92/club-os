# Race Condition Prevention Implementation

## Overview

Dokumentasi ini menjelaskan implementasi pencegahan race condition pada sistem gym membership backend. Race condition dapat terjadi ketika beberapa proses mencoba mengakses dan memodifikasi data yang sama secara bersamaan, yang dapat menyebabkan inkonsistensi data.

## Strategi yang Diimplementasikan

### 1. Optimistic Locking

Optimistic locking adalah strategi yang mengasumsikan bahwa konflik jarang terjadi, dan hanya memeriksa konflik saat menyimpan perubahan.

#### Implementasi:
- Menambahkan field `version` pada model-model kunci (Transaction, Voucher, Product, MembershipPayment)
- Hook `beforeUpdate` untuk memeriksa version dan menambahkannya saat update
- Error handling untuk optimistic locking errors

#### Model yang menggunakan Optimistic Locking:
- `Transaction` ([src/models/transaction.js](../src/models/transaction.js))
- `Voucher` ([src/models/voucher.js](../src/models/voucher.js))
- `Product` ([src/models/product.js](../src/models/product.js))
- `MembershipPayment` ([src/models/membershipPayment.js](../src/models/membershipPayment.js))

### 2. Pessimistic Locking

Pessimistic locking adalah strategi yang mengunci record saat dibaca untuk mencegah proses lain memodifikasinya.

#### Implementasi:
- Menggunakan `lock: transaction.LOCK.UPDATE` saat membaca record
- Menerapkan pada operasi kritis seperti increment voucher usage count

#### Penggunaan:
- Pada `VoucherUsage` saat increment voucher usage count ([src/models/voucherUsage.js](../src/models/voucherUsage.js))
- Pada `validateVoucher` di controller untuk mencegah race condition saat validasi voucher ([src/controllers/voucherController.js](../src/controllers/voucherController.js))

#### ⚠️ Limitasi dengan Outer Joins:
PostgreSQL tidak mengizinkan `FOR UPDATE` (pessimistic locking) pada query dengan `LEFT OUTER JOIN` ke asosiasi nullable. Jika menggunakan `include` dengan asosiasi optional/nullable, **JANGAN gunakan `lock: t.LOCK.UPDATE`**.

**Solusi:**
1. Hapus `lock` parameter dari query dengan `include` nullable associations
2. Atau pisahkan: lock record utama dulu, kemudian load associations terpisah
3. Transaction isolation level sudah menyediakan konsistensi yang cukup

**Contoh Error:**
```javascript
// ❌ SALAH - Akan error "FOR UPDATE cannot be applied to the nullable side of an outer join"
const service = await ActiveService.findOne({
  where: { id },
  include: [
    { model: Trainer, as: 'assignedTrainer' } // Nullable association
  ],
  transaction: t,
  lock: t.LOCK.UPDATE // ERROR!
});

// ✅ BENAR - Hapus lock parameter
const service = await ActiveService.findOne({
  where: { id },
  include: [
    { model: Trainer, as: 'assignedTrainer' }
  ],
  transaction: t
  // Transaction isolation sudah cukup
});
```

**Referensi:** Fixed di `src/controllers/gym/checkIn/checkInController.js` (line 63)

### 3. Atomic Operations

Atomic operations memastikan bahwa operasi tertentu dieksekusi sebagai satu unit yang tidak dapat dipisahkan.

#### Implementasi:
- Membuat helper function `generateUniqueSequence` untuk pembuatan nomor unik
- Membuat helper function `atomicIncrement` dan `atomicDecrement` untuk operasi counter
- Menggunakan database transaction dengan isolation level yang tepat

#### Penggunaan:
- Pembuatan nomor unik (transactionNumber, voucher.code, receiptNumber, product.sku)
- Update stok produk
- Increment voucher usage count

### 4. Transaction Management

Menggunakan database transaction dengan isolation level yang tepat untuk mencegah phantom reads dan dirty reads.

#### Implementasi:
- Membuat helper function `withTransaction` di ConcurrencyUtils
- Menggunakan isolation level `REPEATABLE READ` untuk operasi kritis
- Error handling yang tepat untuk rollback transaction

## Komponen Utama

### 1. ConcurrencyUtils ([src/utils/concurrency.js](../src/utils/concurrency.js))

Utility class yang berisi fungsi-fungsi untuk menangani concurrency:

- `addOptimisticLocking()`: Menambahkan optimistic locking ke model
- `generateUniqueSequence()`: Membuat sequence number unik dengan atomic operation
- `withRetry()`: Menjalankan fungsi dengan retry logic untuk optimistic locking errors
- `withTransaction()`: Membuat transaction dengan isolation level yang tepat
- `atomicIncrement()` dan `atomicDecrement()`: Operasi atomic untuk counter

### 2. Race Condition Logger ([src/middlewares/raceConditionLogger.js](../src/middlewares/raceConditionLogger.js))

Middleware untuk logging race condition:

- `raceConditionLogger()`: Middleware untuk logging race condition errors
- `logRetryAttempt()`: Logging retry attempts
- `logRetrySuccess()`: Logging successful retries
- `logRetryFailure()`: Logging failed retries

### 3. Model Updates

Model-modeli kunci telah diupdate untuk mendukung race condition prevention:

#### Transaction Model
- Menambahkan field `version`
- Hook `beforeUpdate` untuk optimistic locking
- Menggunakan `generateUniqueSequence` untuk pembuatan transactionNumber

#### Voucher Model
- Menambahkan field `version`
- Hook `beforeUpdate` untuk optimistic locking
- Menggunakan `generateUniqueSequence` untuk pembuatan voucher code

#### Product Model
- Menambahkan field `version`
- Hook `beforeUpdate` untuk optimistic locking
- Menggunakan `generateUniqueSequence` untuk pembuatan SKU
- Hook `beforeUpdate` untuk pengecekan stok minimum

#### MembershipPayment Model
- Menambahkan field `version`
- Hook `beforeUpdate` untuk optimistic locking
- Menggunakan `generateUniqueSequence` untuk pembuatan receipt number

#### VoucherUsage Model
- Hook `afterCreate` untuk atomic increment voucher usage count
- Menggunakan pessimistic locking saat mengambil voucher

### 4. Controller Updates

Controller-controller telah diupdate untuk menggunakan locking mechanisms:

#### TransactionController ([src/controllers/transactionController.js](../src/controllers/transactionController.js))
- Menggunakan `withTransaction` untuk pembuatan transaction
- Menggunakan `atomicDecrement` untuk update stok produk
- Menggunakan `atomicIncrement` untuk increment voucher usage count
- Menggunakan `withRetry` untuk update transaction status
- Error handling untuk optimistic locking errors

#### VoucherController ([src/controllers/voucherController.js](../src/controllers/voucherController.js))
- Menggunakan `withTransaction` untuk pembuatan dan update voucher
- Menggunakan `withRetry` untuk validasi voucher
- Menggunakan pessimistic locking saat validasi voucher
- Error handling untuk optimistic locking errors

## Cara Penggunaan

### 1. Optimistic Locking pada Controller

```javascript
// Update dengan optimistic locking
try {
  return await ConcurrencyUtils.withRetry(async () => {
    const record = await Model.findByPk(id);
    await record.update({ field: value }, { version });
    return record;
  }, 3, 100, 'Update record');
} catch (error) {
  if (error.message.includes('Optimistic locking error')) {
    return res.status(409).json({
      success: false,
      message: 'Conflict: Record was modified by another transaction'
    });
  }
  // Handle other errors
}
```

### 2. Atomic Operations

```javascript
// Atomic increment
await ConcurrencyUtils.atomicIncrement(instance, 'counter', 1, { transaction });

// Atomic decrement
await ConcurrencyUtils.atomicDecrement(instance, 'stock', quantity, 0, { transaction });
```

### 3. Transaction dengan Isolation Level

```javascript
// Transaction dengan isolation level REPEATABLE READ
return await ConcurrencyUtils.withTransaction(sequelize, async (transaction) => {
  // Operasi-operasi dalam transaction
}, {
  isolationLevel: sequelize.Transaction.ISOLATION_LEVELS.REPEATABLE_READ
});
```

### 4. Pembuatan Nomor Unik

```javascript
// Generate sequence number unik
const sequence = await ConcurrencyUtils.generateUniqueSequence(
  Model,
  { field: { [Op.like]: 'PREFIX%' } },
  'PREFIX',
  transaction
);
```

## Error Handling

### 1. Optimistic Locking Errors

Ketika terjadi optimistic locking error, sistem akan:
1. Log error dengan detail yang relevan
2. Return HTTP 409 (Conflict) dengan pesan yang jelas
3. Client dapat melakukan retry dengan data yang terbaru

### 2. Stock Errors

Ketika terjadi error terkait stok:
1. Log error dengan detail produk dan stok
2. Return HTTP 400 dengan pesan yang jelas
3. Client dapat mengecek stok terbaru dan mencoba lagi

### 3. Voucher Usage Limit Errors

Ketika voucher mencapai batas penggunaan:
1. Log error dengan detail voucher
2. Return HTTP 400 dengan pesan yang jelas
3. Client dapat menggunakan voucher lain atau melanjutkan tanpa voucher

## Monitoring dan Logging

### 1. Race Condition Logging

Middleware `raceConditionLogger` akan log:
- Optimistic locking errors (HTTP 409)
- Stock errors (HTTP 400 dengan pesan 'stock')
- Voucher usage limit errors (HTTP 400 dengan pesan 'usage limit')

### 2. Retry Logging

ConcurrencyUtils akan log:
- Retry attempts dengan detail operation dan attempt number
- Successful retries dengan jumlah attempts
- Failed retries dengan error message

## Best Practices

1. **Selalu gunakan transaction** untuk operasi yang melibatkan multiple record
2. **Gunakan optimistic locking** untuk model-model yang sering diupdate
3. **Gunakan pessimistic locking** untuk operasi kritis yang membutuhkan konsistensi tinggi
4. **Implementasikan retry logic** untuk optimistic locking errors
5. **Log race condition errors** untuk monitoring dan debugging
6. **Gunakan isolation level yang tepat** untuk setiap operasi
7. **⚠️ JANGAN gunakan `lock: t.LOCK.UPDATE` dengan `include` nullable associations** - akan error "FOR UPDATE cannot be applied to the nullable side of an outer join"

## Testing

Untuk menguji implementasi race condition prevention:

1. **Optimistic Locking Test**:
   - Update record yang sama dari dua proses secara bersamaan
   - Verifikasi bahwa proses kedua mendapatkan error 409

2. **Stock Management Test**:
   - Buat transaksi untuk produk yang sama dari dua proses secara bersamaan
   - Verifikasi bahwa stok tidak menjadi negatif

3. **Voucher Usage Test**:
   - Gunakan voucher yang sama dari dua proses secara bersamaan
   - Verifikasi bahwa voucher usage count tidak melebihi limit

## Kesimpulan

Implementasi race condition prevention ini telah meningkatkan konsistensi data dan keandalan sistem. Dengan menggunakan kombinasi optimistic locking, pessimistic locking, atomic operations, dan transaction management yang tepat, sistem sekarang dapat menangani concurrent access dengan lebih baik.

Logging dan monitoring yang telah diimplementasikan juga membantu dalam identifikasi dan debugging race condition yang mungkin terjadi di lingkungan produksi.