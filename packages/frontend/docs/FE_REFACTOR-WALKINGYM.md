Frontend Integration Guide
API Endpoint
POST /api/gym/service/active/purchase
Request Body — Dengan Quantity (NEW)
json
{
  "customerName": "John Doe",
  "servicePlans": [
    {
      "servicePlanId": "uuid-1-day-pass",
      "quantity": 2
    },
    {
      "servicePlanId": "uuid-towel-rental",
      "quantity": 3
    }
  ],
  "paymentMethods": [
    { "method": "cash", "amount": 500000 }
  ]
}
Request Body — Tanpa Quantity (backward-compatible, sama seperti sebelumnya)
json
{
  "customerName": "Jane",
  "servicePlans": [
    { "servicePlanId": "uuid-1-day-pass" }
  ],
  "paymentMethods": [
    { "method": "cash", "amount": 100000 }
  ]
}
IMPORTANT

Field quantity bersifat opsional. Jika tidak dikirim, backend akan default ke 1. Semua request lama tetap bekerja tanpa perubahan.

Response
json
{
  "message": "5 service(s) purchased successfully",
  "data": {
    "activeServices": [
      { "id": "...", "servicePlanId": "uuid-1-day-pass", "pricePaid": 100000, "startDate": "2026-02-25", "endDate": "2026-02-26" },
      { "id": "...", "servicePlanId": "uuid-1-day-pass", "pricePaid": 100000, "startDate": "2026-02-25", "endDate": "2026-02-26" },
      { "id": "...", "servicePlanId": "uuid-towel-rental", "pricePaid": 15000, "startDate": "2026-02-25", "endDate": "2026-02-25" },
      { "id": "...", "servicePlanId": "uuid-towel-rental", "pricePaid": 15000, "startDate": "2026-02-25", "endDate": "2026-02-25" },
      { "id": "...", "servicePlanId": "uuid-towel-rental", "pricePaid": 15000, "startDate": "2026-02-25", "endDate": "2026-02-25" }
    ],
    "transaction": {
      "id": "...",
      "transactionNumber": "GYM-20260225-001",
      "subtotal": 245000,
      "voucherDiscount": 0,
      "taxAmount": 0,
      "totalAmount": 245000,
      "paidAmount": 500000,
      "changeAmount": 255000
    }
  }
}
Perubahan di Frontend yang Diperlukan
1. State Management — Tambahkan quantity ke cart item
javascript
// Sebelumnya (1 entry per item):
const cart = [
  { servicePlanId: 'uuid-1-day-pass' },
  { servicePlanId: 'uuid-1-day-pass' } // Duplikat untuk qty 2
]
// Sekarang (pakai quantity):
const cart = [
  { servicePlanId: 'uuid-1-day-pass', quantity: 2 }
]
2. Subtotal Calculation di FE
javascript
// Hitung subtotal di FE untuk preview sebelum submit
const subtotal = cart.reduce((sum, item) => {
  const plan = servicePlans.find(p => p.id === item.servicePlanId)
  return sum + (plan.price * (item.quantity || 1))
}, 0)
3. API Call
javascript
const response = await $fetch('/api/gym/service/active/purchase', {
  method: 'POST',
  body: {
    customerName: walkInName,
    servicePlans: cart.map(item => ({
      servicePlanId: item.servicePlanId,
      quantity: item.quantity || 1
    })),
    paymentMethods: [
      { method: selectedPaymentMethod, amount: paidAmount }
    ]
  }
})
4. UI — Quantity Selector
Di halaman POS Walk-in checkout, tambahkan +/− button atau number input di sebelah setiap service plan:

Service Plan	Harga	Qty	Subtotal
1 Day Pass	100,000	2	200,000
Towel Rental	15,000	3	45,000
Total			245,000
5. Validasi FE
quantity harus ≥ 1 (integer)
Jangan kirim quantity: 0 — gunakan remove dari cart saja
Total payment (paidAmount) harus ≥ subtotal + tax