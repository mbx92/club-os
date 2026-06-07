# Audit Selisih Laporan

Dokumen ini merangkum hasil audit statis terhadap faktor-faktor yang dapat menyebabkan selisih antara:

- laporan penjualan
- breakdown payment method
- rekap kasir / shift
- laporan harian export
- dashboard finance / dashboard operasional

Audit ini disusun dari inspeksi kode pada 2 Juni 2026. Belum semua temuan direproduksi dengan data nyata atau diuji end-to-end.

## Ringkasan

Secara umum, penyebab selisih terbagi ke 5 kelompok besar:

1. definisi transaksi yang dihitung tidak konsisten
2. status payment tidak konsisten dengan status transaksi
3. basis tanggal laporan tidak seragam
4. rumus cash drawer berbeda dengan rumus omzet / export harian
5. query shift dan kasir masih memiliki edge case untuk multi-lokasi, split/merge, refund, dan carry-over order

Temuan paling berisiko:

- cash register per lokasi masih bisa mencampur transaksi dari lokasi lain
- ada flow yang membuat transaksi final tetapi `TransactionPayment` tetap `pending`
- endpoint daily summary menghitung `selisihCash` dengan rumus yang berbeda dari rumus penutupan shift
- codebase masih mencampur `transactionDate`, `createdAt`, dan `completedAt`

## Temuan yang Sudah Dipatch

Perubahan yang sudah diterapkan:

- filter revenue utama diseragamkan ke status final `completed` dan `paid`
- sebagian besar breakdown payment kini hanya menghitung `TransactionPayment.status = completed`
- rekap kasir tidak lagi menghitung parent `split` atau `merged` secara mentah bila tidak punya payment final
- beberapa dashboard dan report restaurant/gym yang sebelumnya hanya memakai `completed` kini disamakan dengan laporan revenue utama

Catatan:

- endpoint `/api/v1/reports/daily/daily-summary`
- endpoint `/api/v1/reports/daily/daily-summary/export`

sudah ikut dipatch pada tahap implementasi lanjutan:

- daily summary sekarang memakai status revenue dan payment final yang sama dengan report utama
- kolom `totalCash`, `actualCash`, dan `selisihCash` kini memakai angka resmi dari `CashRegisterSessions` bila sesi sudah ditutup
- export XLSX sekarang ikut menuliskan `Actual Cash`
- helper kasir kini mewajibkan payment final juga untuk status `served`, selain `split` dan `merged`

## Temuan Detail

### 1. Multi-lokasi pada Cash Register Masih Bisa Tercampur

Severity: Critical

Masalah:

- `getCashSummary()` yang dipakai saat tutup shift hanya memfilter `tenantId`
- query transaksi kasir harian dan shift juga masih mengambil transaksi berdasarkan `tenantId + createdAt`
- expense justru sudah memakai filter lokasi

Dampak:

- shift lokasi A bisa ikut menghitung cash-in transaksi dari lokasi B
- tetapi pengeluaran yang dikurangkan hanya expense lokasi A
- hasil akhirnya bisa muncul selisih kas yang besar dan sulit ditelusuri

Referensi:

- [src/models/cashRegisterSession.js](/Users/mbx/Projects/gym-membership-backend/src/models/cashRegisterSession.js:37)
- [src/models/cashRegisterSession.js](/Users/mbx/Projects/gym-membership-backend/src/models/cashRegisterSession.js:76)
- [src/controllers/gym/cashRegister/cashRegisterController.js](/Users/mbx/Projects/gym-membership-backend/src/controllers/gym/cashRegister/cashRegisterController.js:674)
- [src/controllers/gym/cashRegister/cashRegisterController.js](/Users/mbx/Projects/gym-membership-backend/src/controllers/gym/cashRegister/cashRegisterController.js:704)
- [src/controllers/gym/cashRegister/cashRegisterController.js](/Users/mbx/Projects/gym-membership-backend/src/controllers/gym/cashRegister/cashRegisterController.js:1582)
- [src/controllers/gym/cashRegister/cashRegisterController.js](/Users/mbx/Projects/gym-membership-backend/src/controllers/gym/cashRegister/cashRegisterController.js:1610)

### 2. Ada Transaksi Final Tapi Payment Masih `pending`

Severity: Critical

Masalah:

- model `TransactionPayment` punya default status `pending`
- beberapa flow membuat transaksi final, tetapi saat membuat payment tidak mengisi status `completed`

Kasus yang ditemukan:

- create order restaurant awal
- combined billing

Akibatnya:

- omzet transaksi bisa masuk laporan transaksi
- tetapi breakdown payment, cash-in, dan rekap kasir yang memfilter payment `completed` tidak ikut menghitungnya

Referensi:

- [src/models/transactionPayment.js](/Users/mbx/Projects/gym-membership-backend/src/models/transactionPayment.js:39)
- [src/modules/restaurant/controllers/orderController.js](/Users/mbx/Projects/gym-membership-backend/src/modules/restaurant/controllers/orderController.js:731)
- [src/modules/restaurant/controllers/orderController.js](/Users/mbx/Projects/gym-membership-backend/src/modules/restaurant/controllers/orderController.js:783)
- [src/modules/restaurant/controllers/combinedBillingController.js](/Users/mbx/Projects/gym-membership-backend/src/modules/restaurant/controllers/combinedBillingController.js:257)
- [src/modules/restaurant/controllers/combinedBillingController.js](/Users/mbx/Projects/gym-membership-backend/src/modules/restaurant/controllers/combinedBillingController.js:351)

### 3. Rumus `selisihCash` Daily Summary Berbeda dari Rumus Tutup Shift

Severity: High

Masalah:

Daily summary memakai:

- `totalCash = cash payment - cashier expense`
- `selisihCash = actualCash - totalCash`

Sedangkan penutupan shift memakai:

- `openingBalance + cashIn - refundOut - cashExpenseOut - pettyCashReturnOut + tipping`

Artinya daily summary mengabaikan:

- opening balance
- refund cash out
- petty cash sales return
- tipping

Dampak:

- nilai `selisihCash` di daily summary bisa berbeda walau shift ditutup dengan benar

Referensi:

- [src/controllers/reports/dailyReportController.js](/Users/mbx/Projects/gym-membership-backend/src/controllers/reports/dailyReportController.js:192)
- [src/models/cashRegisterSession.js](/Users/mbx/Projects/gym-membership-backend/src/models/cashRegisterSession.js:63)
- [src/models/cashRegisterSession.js](/Users/mbx/Projects/gym-membership-backend/src/models/cashRegisterSession.js:103)
- [src/controllers/gym/cashRegister/cashRegisterController.js](/Users/mbx/Projects/gym-membership-backend/src/controllers/gym/cashRegister/cashRegisterController.js:282)

### 4. Daily Summary Sudah Mengambil `difference` Resmi, Tapi Tidak Dipakai

Severity: High

Masalah:

- daily summary query ke `CashRegisterSessions` sudah mengambil `closingBalance`, `actualCash`, dan `difference`
- tetapi saat menyusun response, kolom `selisihCash` tetap dihitung ulang dengan rumus sendiri

Dampak:

- angka yang tampil di report harian bisa berbeda dari angka shift close yang tersimpan di database

Referensi:

- [src/controllers/reports/dailyReportController.js](/Users/mbx/Projects/gym-membership-backend/src/controllers/reports/dailyReportController.js:95)
- [src/controllers/reports/dailyReportController.js](/Users/mbx/Projects/gym-membership-backend/src/controllers/reports/dailyReportController.js:193)

### 5. Basis Tanggal Expense dan Petty Cash Tidak Konsisten

Severity: High

Masalah:

Perhitungan cash resmi dan laporan memakai field waktu yang berbeda:

- `getCashSummary()` memakai `Expense.createdAt` dan `PettyCashTransaction.createdAt`
- shift report dan daily report kasir memakai `expenseDate` dan `transactionDate`
- daily summary export juga memakai `expenseDate` dan `transactionDate`

Dampak:

- pengeluaran atau petty cash yang dicatat terlambat bisa masuk ke hari yang berbeda
- angka `difference` saat close shift bisa tidak sama dengan angka report harian

Referensi:

- [src/models/cashRegisterSession.js](/Users/mbx/Projects/gym-membership-backend/src/models/cashRegisterSession.js:81)
- [src/models/cashRegisterSession.js](/Users/mbx/Projects/gym-membership-backend/src/models/cashRegisterSession.js:95)
- [src/controllers/gym/cashRegister/cashRegisterController.js](/Users/mbx/Projects/gym-membership-backend/src/controllers/gym/cashRegister/cashRegisterController.js:708)
- [src/controllers/gym/cashRegister/cashRegisterController.js](/Users/mbx/Projects/gym-membership-backend/src/controllers/gym/cashRegister/cashRegisterController.js:732)
- [src/controllers/gym/cashRegister/cashRegisterController.js](/Users/mbx/Projects/gym-membership-backend/src/controllers/gym/cashRegister/cashRegisterController.js:1635)
- [src/controllers/reports/dailyReportController.js](/Users/mbx/Projects/gym-membership-backend/src/controllers/reports/dailyReportController.js:79)

### 6. `createdAt` Bisa Diubah Saat Open Shift

Severity: High

Masalah:

Saat open shift, orphaned order dari shift sebelumnya bisa diwariskan ke shift baru dengan cara mengubah `createdAt` order menjadi waktu sekarang.

Dampak:

- semua laporan berbasis `createdAt` bisa memindahkan transaksi ke sesi atau hari lain
- laporan berbasis `transactionDate` atau `completedAt` tidak ikut berubah
- satu transaksi bisa muncul pada hari yang berbeda tergantung endpoint yang dilihat

Referensi:

- [src/controllers/gym/cashRegister/cashRegisterController.js](/Users/mbx/Projects/gym-membership-backend/src/controllers/gym/cashRegister/cashRegisterController.js:156)
- [src/controllers/gym/cashRegister/cashRegisterController.js](/Users/mbx/Projects/gym-membership-backend/src/controllers/gym/cashRegister/cashRegisterController.js:173)

### 7. Basis Tanggal Laporan Masih Campur `transactionDate`, `createdAt`, dan `completedAt`

Severity: Medium

Masalah:

Belum ada satu definisi resmi untuk “tanggal laporan”.

Contoh:

- finance dan banyak report revenue memakai `transactionDate`
- cash register memakai `createdAt`
- restaurant modular report memakai `completedAt`

Dampak:

- transaksi di batas hari atau lintas shift bisa berbeda antar layar
- export finance dan rekap kasir bisa sama-sama benar menurut logika masing-masing, tetapi tetap tidak rekonsiliasi

Referensi:

- [src/controllers/reports/dailyReportController.js](/Users/mbx/Projects/gym-membership-backend/src/controllers/reports/dailyReportController.js:46)
- [src/controllers/reports/financeReportController.js](/Users/mbx/Projects/gym-membership-backend/src/controllers/reports/financeReportController.js:102)
- [src/controllers/gym/cashRegister/cashRegisterController.js](/Users/mbx/Projects/gym-membership-backend/src/controllers/gym/cashRegister/cashRegisterController.js:676)
- [src/modules/restaurant/controllers/reportController.js](/Users/mbx/Projects/gym-membership-backend/src/modules/restaurant/controllers/reportController.js:55)

### 8. Refund Parsial dan Full Refund Dipresentasikan Berbeda Antar Laporan

Severity: Medium

Masalah:

- transaksi gym yang di-refund akan berubah status menjadi `partially_refunded` atau `refunded`
- laporan finance/daily yang hanya mengambil `completed` dan `paid` akan mengeluarkan transaksi itu seluruhnya dari omzet
- report shift gym masih menampilkan refund sebagai komponen terpisah

Dampak:

- angka “revenue” dan angka “refund” tidak selalu direpresentasikan dengan pola yang sama antar endpoint

Referensi:

- [src/controllers/gym/transaction/transactionController.js](/Users/mbx/Projects/gym-membership-backend/src/controllers/gym/transaction/transactionController.js:1813)
- [src/controllers/reports/dailyReportController.js](/Users/mbx/Projects/gym-membership-backend/src/controllers/reports/dailyReportController.js:49)
- [src/controllers/gym/cashRegister/cashRegisterController.js](/Users/mbx/Projects/gym-membership-backend/src/controllers/gym/cashRegister/cashRegisterController.js:1443)

### 9. Export XLSX Daily Summary Tidak Menuliskan `Actual Cash`

Severity: Medium

Masalah:

- sheet `LAPORAN HARIAN` mengosongkan kolom `ACTUAL CASH`
- bagian summary export juga mengosongkan `Actual Cash`

Dampak:

- user yang membandingkan export dengan API atau dengan shift close bisa mengira ada selisih, padahal kolomnya memang sengaja dikosongkan

Referensi:

- [src/controllers/reports/dailyReportController.js](/Users/mbx/Projects/gym-membership-backend/src/controllers/reports/dailyReportController.js:414)
- [src/controllers/reports/dailyReportController.js](/Users/mbx/Projects/gym-membership-backend/src/controllers/reports/dailyReportController.js:421)
- [src/controllers/reports/dailyReportController.js](/Users/mbx/Projects/gym-membership-backend/src/controllers/reports/dailyReportController.js:564)

### 10. Status `served` Masih Bisa Masuk Rekap Kasir Tertentu

Severity: Medium

Masalah:

- helper kasir mengizinkan `served` sebagai status reportable
- untuk status ini tidak ada syarat wajib harus punya payment final

Dampak:

- pada situasi tertentu, transaksi yang sudah disajikan tetapi belum final bayar bisa ikut summary operasional
- cash breakdown bisa tidak setara dengan jumlah transaksi yang terlihat

Referensi:

- [src/utils/reportingStatus.js](/Users/mbx/Projects/gym-membership-backend/src/utils/reportingStatus.js:2)
- [src/utils/reportingStatus.js](/Users/mbx/Projects/gym-membership-backend/src/utils/reportingStatus.js:14)
- [src/controllers/gym/cashRegister/cashRegisterController.js](/Users/mbx/Projects/gym-membership-backend/src/controllers/gym/cashRegister/cashRegisterController.js:438)

### 11. Per-Shift Summary Daily Report Masih Pakai Filter Lokal Lama

Severity: Low

Masalah:

- di bagian per-shift summary pada daily cash register, filter lokal masih memakai logika lama untuk `split`
- belum seluruhnya memakai helper `shouldIncludeCashierTransaction`

Dampak:

- count atau rincian shift pada daily report bisa sedikit berbeda dari report shift individual
- dampak utamanya lebih ke snapshot detail, bukan total revenue utama

Referensi:

- [src/controllers/gym/cashRegister/cashRegisterController.js](/Users/mbx/Projects/gym-membership-backend/src/controllers/gym/cashRegister/cashRegisterController.js:1687)

## Endpoint yang Perlu Perhatian Khusus

### `/api/v1/reports/daily/daily-summary`

Status:

- sudah dipatch
- memakai `difference` dan `expectedCash` resmi dari sesi kasir bila data sesi tersedia
- memakai `transactionDate`
- memakai `TransactionPayment.status = completed`

Risiko:

- masih bisa beda dari shift close untuk hari yang belum punya sesi kasir tertutup
- bisa beda dari report kasir harian

### `/api/v1/reports/daily/daily-summary/export`

Status:

- sudah dipatch
- me-reuse JSON daily summary untuk sheet utama
- menambah sheet detail transaksi, payment method, dan summary

Risiko:

- mewarisi aturan tanggal yang sama dengan daily summary
- tetap bisa berbeda dengan report operasional yang berbasis `createdAt`

## Akar Masalah Struktural

Di luar bug per query, ada beberapa akar masalah arsitektural:

1. belum ada definisi tunggal untuk status revenue final
2. belum ada definisi tunggal untuk tanggal laporan resmi
3. belum ada definisi tunggal untuk rumus expected cash vs omzet harian
4. laporan cash register, report revenue, dan export finance masih melayani kebutuhan bisnis yang berbeda tetapi namanya mirip
5. beberapa flow transaksi lama dan flow transaksi baru belum seluruhnya seragam terhadap status payment

## Rekomendasi Prioritas

### Prioritas 1

- paksa semua flow transaksi final membuat `TransactionPayment.status = completed`
- tambahkan filter `locationId` ke semua query cash register dan `getCashSummary()`
- samakan rumus daily summary dengan rumus `CashRegisterSession.getCashSummary()`

### Prioritas 2

- putuskan satu basis tanggal resmi untuk tiap kategori laporan
- dokumentasikan kapan harus pakai `transactionDate`, `createdAt`, atau `completedAt`
- revisi endpoint daily summary agar memakai angka `difference` resmi dari sesi yang sudah ditutup

### Prioritas 3

- audit semua flow refund agar presentasi revenue net vs refund konsisten
- rapikan edge case `served`, `split`, dan `merged`
- samakan snapshot per-shift daily report dengan helper filter baru

## Definisi Resmi Setelah Patch

### Basis tanggal laporan

- laporan finance, revenue utama, dan export harian memakai `transactionDate`
- laporan cash register, shift, dan rekonsiliasi kas operasional memakai `createdAt` di dalam jendela buka-tutup shift
- laporan restaurant yang tujuannya mengukur completion/throughput memakai `completedAt`
- saat orphaned order diwariskan ke shift baru, sistem sekarang menggeser `createdAt` dan `transactionDate` sekaligus agar report operasional dan finance tidak berbeda hari hanya karena carry-over

### Aturan refund dan net revenue

- revenue utama tetap diakui dari transaksi final `completed` dan `paid`
- full refund tetap dikeluarkan dari revenue utama dan ditampilkan sebagai pengurang terpisah pada report operasional gym/kasir
- partial refund sudah direview dan saat ini tetap diperlakukan sebagai kasus operasional yang harus dibaca bersama komponen refund, bukan hanya dari payment breakdown
- karena flow refund lama belum selalu menyimpan refund payment method sebagai transaksi cash/card keluar yang eksplisit, rekonsiliasi net revenue vs breakdown payment tetap harus membaca komponen refund secara terpisah

## Checklist Patch Lanjutan

- [x] patch `TransactionPayment.create()` yang masih tidak mengisi status final
- [x] patch `CashRegisterSession.getCashSummary()` agar aware terhadap `locationId`
- [x] patch query transaksi shift/daily kasir agar konsisten filter lokasi
- [x] patch `/reports/daily/daily-summary` dan export-nya
- [x] definisikan basis tanggal resmi untuk laporan finance
- [x] definisikan basis tanggal resmi untuk laporan kasir
- [x] review ulang refund dan partially refunded pada report net revenue

## Catatan Audit

- Audit ini berbasis pembacaan kode, bukan hasil uji transaksi nyata
- Beberapa temuan adalah bug langsung, beberapa lainnya adalah gap definisi bisnis
- Selama definisi “omzet”, “cash in drawer”, dan “tanggal laporan” belum dipisahkan dengan tegas, sistem masih rawan terlihat selisih walau tiap endpoint menghitung sesuatu yang berbeda dengan benar
