# Panduan Testing Midtrans via Postman

## 📦 Import Collection

1. Buka Postman
2. Import file: `postman/Midtrans-Payment.postman_collection.json`
3. Collection "Midtrans Payment Gateway" akan muncul

## 🔧 Setup Environment Variables

Setelah import, edit collection variables:

1. Klik collection → tab "Variables"
2. Update nilai:

```
baseUrl: http://localhost:3000/api/v1
authToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (JWT token dari login)
transactionId: uuid-transaction-yang-ada-di-database
transactionNumber: TRX-001 (transaction number yang ada)
```

## 🚀 Testing Flow

### Step 1: Login & Get Token

Panggil endpoint login dulu untuk dapat JWT token:

```http
POST http://localhost:3000/api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "password123"
}
```

Copy `token` dari response, paste ke collection variable `authToken`.

### Step 2: Buat Transaction

Sebelum test payment, buat transaction dulu via endpoint transaction yang sudah ada:

```http
POST http://localhost:3000/api/v1/transactions
Authorization: Bearer {{authToken}}
Content-Type: application/json

{
  "customerType": "walk-in",
  "customerName": "Test Customer",
  "customerPhone": "081234567890",
  "items": [
    {
      "productId": "product-uuid",
      "quantity": 2,
      "price": 50000
    }
  ],
  "paymentMethod": "midtrans",
  "total": 100000
}
```

Copy `id` dan `transactionNumber` dari response, paste ke collection variables.

### Step 3: Test Endpoints

#### A. Get Config (Optional)
```
GET /payment/midtrans/config
```
Response:
```json
{
  "success": true,
  "data": {
    "clientKey": "SB-Mid-client-xxx",
    "isProduction": false,
    "environment": "sandbox"
  }
}
```

#### B. Create Snap Payment
```
POST /payment/midtrans/create
Body: { "transactionId": "{{transactionId}}" }
```
Response:
```json
{
  "success": true,
  "data": {
    "transactionId": "uuid",
    "transactionNumber": "TRX-001",
    "amount": 100000,
    "snapToken": "abc123-token",
    "redirectUrl": "https://app.sandbox.midtrans.com/snap/v3/...",
    "clientKey": "SB-Mid-client-xxx"
  }
}
```

**Testing:**
- Copy `redirectUrl` → buka di browser
- Atau gunakan frontend example dengan `snapToken`

#### C. Create Direct Charge - Bank Transfer BCA
```
POST /payment/midtrans/charge
Body: 
{
  "transactionId": "{{transactionId}}",
  "paymentType": "bank_transfer",
  "bankTransfer": { "bank": "bca" }
}
```
Response:
```json
{
  "success": true,
  "data": {
    "transactionId": "uuid",
    "transactionNumber": "TRX-001",
    "midtransTransactionId": "abc123",
    "paymentType": "bank_transfer",
    "vaNumber": "12345678901",
    "bank": "bca",
    "status": "pending"
  }
}
```

**Testing:**
- Gunakan VA number untuk simulasi payment di Midtrans Dashboard

#### D. Create Direct Charge - GoPay
```
POST /payment/midtrans/charge
Body:
{
  "transactionId": "{{transactionId}}",
  "paymentType": "gopay",
  "gopay": {
    "enable_callback": true,
    "callback_url": "http://localhost:3001/payment/gopay/callback"
  }
}
```
Response:
```json
{
  "success": true,
  "data": {
    "qrCode": "data:image/png;base64,...",
    "deeplink": "gojek://gopay/merchanttransfer?..."
  }
}
```

#### E. Check Status
```
GET /payment/midtrans/status/{{transactionNumber}}
```
Response:
```json
{
  "success": true,
  "data": {
    "transactionNumber": "TRX-001",
    "midtransTransactionId": "abc123",
    "status": "settlement",
    "paymentType": "bank_transfer",
    "grossAmount": 100000,
    "transactionTime": "2024-01-15 10:30:00"
  }
}
```

#### F. Cancel Payment
```
POST /payment/midtrans/cancel/{{transactionNumber}}
```

#### G. Refund Payment
```
POST /payment/midtrans/refund/{{transactionNumber}}
Body:
{
  "amount": 50000,
  "reason": "Customer request"
}
```

## 🧪 Test Cards (Sandbox)

Untuk testing credit card via Snap:

| Card Number | CVV | Exp Date | Result |
|-------------|-----|----------|--------|
| 4811 1111 1111 1114 | 123 | 01/25 | ✅ Success |
| 4911 1111 1111 1113 | 123 | 01/25 | ❌ Denied |
| 4411 1111 1111 1118 | 123 | 01/25 | ⏳ Challenge |

## 🔔 Test Webhook

### Option 1: Use Ngrok (Recommended)

```bash
# Install ngrok
choco install ngrok

# Start ngrok
ngrok http 3000

# Output:
# Forwarding: https://abc123.ngrok.io -> http://localhost:3000
```

Update `.env`:
```env
MIDTRANS_NOTIFICATION_URL=https://abc123.ngrok.io/api/v1/payment/midtrans/notification
```

### Option 2: Manual Test via Postman

```
POST /payment/midtrans/notification
Body:
{
  "transaction_time": "2024-01-15 10:30:00",
  "transaction_status": "settlement",
  "transaction_id": "abc123-midtrans",
  "status_message": "midtrans payment success",
  "status_code": "200",
  "signature_key": "valid-signature-hash",
  "payment_type": "bank_transfer",
  "order_id": "TRX-001",
  "merchant_id": "G123456789",
  "gross_amount": "100000.00",
  "fraud_status": "accept",
  "currency": "IDR"
}
```

⚠️ **Note**: Signature validation akan gagal jika manual test. Untuk bypass, comment line validasi di `paymentController.js` sementara.

## 📋 Checklist Testing

- [ ] **Setup**
  - [ ] Axios installed (`npm install axios`)
  - [ ] Environment variables configured (`.env`)
  - [ ] Server running (`npm run dev`)
  - [ ] JWT token obtained
  - [ ] Transaction created

- [ ] **Snap Payment**
  - [ ] Config endpoint works
  - [ ] Create payment returns token
  - [ ] Redirect URL opens Midtrans page
  - [ ] Payment success callback received

- [ ] **Direct Charge**
  - [ ] Bank Transfer BCA → VA number generated
  - [ ] Bank Transfer Mandiri → Bill key generated
  - [ ] GoPay → QR code returned
  - [ ] Status check works

- [ ] **Webhook**
  - [ ] Notification endpoint accessible
  - [ ] Transaction status updated
  - [ ] Signature verified

## 🐛 Troubleshooting

### Error: "Transaction not found"
- Pastikan `transactionId` di collection variable valid
- Pastikan transaction milik tenant yang sama dengan user login

### Error: "Invalid credentials"
- Check `MIDTRANS_SERVER_KEY` di `.env`
- Pastikan menggunakan Sandbox key (prefix `SB-`)

### Error: "Signature verification failed"
- Pastikan `MIDTRANS_SERVER_KEY` sama dengan di Dashboard
- Untuk manual test, comment validation sementara

### Webhook tidak triggered
- Gunakan ngrok untuk expose local server
- Update `MIDTRANS_NOTIFICATION_URL` dengan ngrok URL
- Set notification URL di Midtrans Dashboard

## 📚 References

- **Midtrans Docs**: https://docs.midtrans.com/
- **Dashboard**: https://dashboard.midtrans.com/
- **Simulator**: https://simulator.sandbox.midtrans.com/

## 💡 Tips

1. **Sandbox Mode**: Selalu gunakan test credentials
2. **Signature**: Webhook harus verify signature untuk security
3. **Status Sync**: Status dari webhook lebih reliable daripada polling
4. **Error Handling**: Semua endpoint sudah handle error dengan proper response
5. **Logging**: Check logs untuk debug (`logs/combined.log`)

---

Happy Testing! 🚀
