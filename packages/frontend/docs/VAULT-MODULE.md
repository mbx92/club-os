# Vault Module Frontend Integration

## Tujuan

Halaman vault dipakai admin atau owner untuk:

1. Melihat saldo vault saat ini.
2. Melihat semua mutasi yang menyentuh vault.
3. Melihat cash drawer hasil shift yang belum diambil.
4. Melakukan checklist atau collect dari drawer ke vault.
5. Melacak expense mana yang dibayar dari vault.

Kasir tidak perlu melihat halaman ini.

## Konsep Data

Sistem sekarang membedakan beberapa kompartemen uang:

1. `cash_drawer`: uang fisik di laci kasir selama shift.
2. `vault`: uang yang sudah diambil admin dari laci dan masuk brankas.
3. `petty_cash`: fund operasional kecil.
4. `bank`: rekening atau transfer.

Mutasi vault bersumber dari tabel `CashMutations`.

## API Backend

### 1. GET `/api/v1/finance/vault/summary`

Dipakai untuk summary cards di halaman vault.

Contoh respons:

```json
{
	"success": true,
	"data": {
		"summary": {
			"vaultBalance": 25000000,
			"totalIn": 42000000,
			"totalOut": 17000000,
			"todayCollected": 3500000,
			"pendingDrawerCash": 2750000,
			"pendingSessionCount": 3
		},
		"pendingCollectionsPreview": [
			{
				"shiftDate": "2026-04-05",
				"location": { "id": "uuid", "name": "Main Branch" },
				"sessionCount": 2,
				"collectibleBase": 4500000,
				"collectedAmount": 2000000,
				"remainingAmount": 2500000,
				"collectionStatus": "partially_collected",
				"sessions": [
					{
						"id": "shift-session-uuid",
						"shiftName": "pagi",
						"shiftNumber": 1,
						"remainingAmount": 1500000,
						"collectedAmount": 1000000,
						"collectionStatus": "partially_collected"
					}
				]
			}
		]
	}
}
```

### 2. GET `/api/v1/finance/vault/mutations`

Dipakai untuk tabel mutasi vault.

Filter query yang relevan:

```json
{
	"page": 1,
	"limit": 20,
	"startDate": "2026-04-01",
	"endDate": "2026-04-30",
	"mutationType": "drawer_to_vault_transfer",
	"sourceAccount": "cash_drawer",
	"destinationAccount": "vault",
	"status": "posted",
	"locationId": "optional-uuid",
	"search": "CM-2026"
}
```

Contoh row mutasi:

```json
{
	"id": "uuid",
	"mutationNumber": "CM-2026-000123",
	"sourceAccount": "cash_drawer",
	"destinationAccount": "vault",
	"amount": "1500000.00",
	"mutationType": "drawer_to_vault_transfer",
	"referenceType": "CashRegisterSession",
	"referenceId": "session-uuid",
	"shiftSessionId": "session-uuid",
	"status": "posted",
	"notes": "Pengambilan kas shift pagi",
	"mutationDate": "2026-04-05",
	"metadata": {
		"shiftDate": "2026-04-05",
		"collectibleBase": 3000000,
		"alreadyCollected": 1500000
	},
	"creator": {
		"id": "uuid",
		"firstName": "Admin",
		"lastName": "Gym"
	},
	"location": {
		"id": "uuid",
		"name": "Main Branch"
	},
	"shiftSession": {
		"id": "uuid",
		"shiftDate": "2026-04-05",
		"shiftName": "pagi",
		"shiftNumber": 1
	}
}
```

### 3. GET `/api/v1/finance/vault/collectibles`

Dipakai untuk panel cash belum diambil dari laci.

Contoh respons:

```json
{
	"success": true,
	"data": {
		"sessions": [
			{
				"id": "uuid",
				"shiftDate": "2026-04-05",
				"shiftName": "pagi",
				"shiftNumber": 1,
				"location": { "id": "uuid", "name": "Main Branch" },
				"closingBalance": 3000000,
				"actualCash": 3000000,
				"difference": 0,
				"collectibleBase": 3000000,
				"collectedAmount": 1000000,
				"remainingAmount": 2000000,
				"collectionStatus": "partially_collected"
			}
		],
		"daily": [
			{
				"shiftDate": "2026-04-05",
				"location": { "id": "uuid", "name": "Main Branch" },
				"sessionCount": 2,
				"collectibleBase": 4500000,
				"collectedAmount": 2000000,
				"remainingAmount": 2500000,
				"collectionStatus": "partially_collected",
				"sessions": []
			}
		],
		"pagination": {
			"total": 10,
			"page": 1,
			"limit": 50,
			"totalPages": 1
		}
	}
}
```

### 4. POST `/api/v1/finance/vault/collect`

Dipakai ketika admin checklist cash shift yang sudah dipindahkan ke vault.

Contoh payload:

```json
{
	"mutationDate": "2026-04-05",
	"notes": "Pengambilan kas sore oleh admin",
	"collections": [
		{
			"sessionId": "shift-session-uuid-1",
			"amount": 1500000,
			"notes": "Diambil penuh"
		},
		{
			"sessionId": "shift-session-uuid-2"
		}
	]
}
```

Jika `amount` kosong, backend akan mengambil seluruh sisa collectible shift tersebut.

## Struktur UI Yang Disarankan

### Section 1: Summary Cards

Tampilkan minimal 5 kartu:

1. `Saldo Vault`
2. `Total Masuk Vault`
3. `Total Keluar Vault`
4. `Collected Hari Ini`
5. `Pending Cash Drawer`

### Section 2: Pending Collections

Tampilkan dua mode:

1. Group by tanggal.
2. Detail per shift session.

Kolom yang disarankan:

1. Tanggal
2. Lokasi
3. Shift
4. Closing atau Actual Cash
5. Sudah Diambil
6. Sisa
7. Status
8. Checkbox atau input amount

### Section 3: Mutation Table

Kolom yang disarankan:

1. Nomor Mutasi
2. Tanggal
3. Tipe Mutasi
4. Dari
5. Ke
6. Amount
7. Referensi
8. Shift
9. Lokasi
10. Dibuat Oleh
11. Catatan
12. Status

## Mapping Label UI

1. `cash_drawer` -> `Laci Kasir`
2. `vault` -> `Vault / Brankas`
3. `petty_cash` -> `Petty Cash`
4. `bank` -> `Bank / Transfer`
5. `revenue` -> `Revenue`
6. `external` -> `Eksternal`

## Perilaku Frontend Yang Penting

1. Jangan hitung saldo vault di frontend dari data collectible. Gunakan summary API.
2. Setelah berhasil collect, refresh `summary`, `collectibles`, dan `mutations` sekaligus.
3. Untuk shift dengan status `collected`, checkbox default nonaktif.
4. Untuk `partially_collected`, tampilkan sisa collectible dengan jelas.
5. Simpan filter query di URL agar halaman vault bisa dibuka ulang dengan state yang sama.

## Expense Form Integration

1. Kasir hanya tampilkan opsi `Tunai` yang dipetakan ke `paymentMethod=cash` dan `fundSource=cash_drawer`.
2. Admin atau owner tampilkan opsi `Vault / Brangkas` yang dipetakan ke `paymentMethod=cash` dan `fundSource=vault`.
3. Untuk petty cash, gunakan `paymentMethod=petty_cash`.
4. Untuk transfer bank, gunakan `paymentMethod=bank_transfer` dan `fundSource=bank`.

## Catatan Backend Compatibility

1. Data expense lama yang belum memiliki `fundSource` akan dianggap legacy.
2. Untuk audit lama, frontend sebaiknya menyediakan edit fund source pada expense tunai historis bila memang dibayar dari vault.
3. Mutasi vault hanya memuat event yang menyentuh vault. Inflow cash hasil penjualan tetap berasal dari transaction dan cash register session, lalu menjadi mutasi vault saat admin collect dari drawer ke vault.