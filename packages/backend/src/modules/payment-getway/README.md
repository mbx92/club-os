# Midtrans Payment Gateway Integration

Integrasi lengkap dengan Midtrans payment gateway untuk menerima pembayaran online.

## 📋 Fitur

- ✅ **Snap Payment** - Payment page hosted oleh Midtrans
- ✅ **Direct API** - Custom payment flow
- ✅ **Multiple Payment Methods**:
  - Credit/Debit Card (Visa, Mastercard, JCB, Amex)
  - Bank Transfer (BCA, Mandiri, BNI, BRI, Permata)
  - E-Wallet (GoPay, ShopeePay)
  - Convenience Store (Indomaret, Alfamart)
  - Installment (Akulaku, Kredivo)
- ✅ **Webhook Notification** - Real-time payment status update
- ✅ **Transaction Management** - Check status, cancel, refund
- ✅ **Secure** - Signature verification, encrypted communication

## 🚀 Setup

### 1. Install Dependencies

```bash
npm install axios
```

### 2. Konfigurasi Environment Variables

Tambahkan ke file `.env`:

```env
# Midtrans Configuration
MIDTRANS_IS_PRODUCTION=false
MIDTRANS_SERVER_KEY=your-server-key-here
MIDTRANS_CLIENT_KEY=your-client-key-here
MIDTRANS_MERCHANT_ID=your-merchant-id

# Callback URLs (untuk redirect setelah payment)
MIDTRANS_FINISH_URL=https://yourdomain.com/payment/finish
MIDTRANS_ERROR_URL=https://yourdomain.com/payment/error
MIDTRANS_PENDING_URL=https://yourdomain.com/payment/pending

# Webhook URL (untuk notification dari Midtrans)
MIDTRANS_NOTIFICATION_URL=https://yourdomain.com/api/v1/payment/midtrans/notification
```

**Cara mendapatkan credentials:**
1. Daftar di [Midtrans Dashboard](https://dashboard.midtrans.com/)
2. Pilih environment (Sandbox untuk testing, Production untuk live)
3. Copy Server Key dan Client Key dari Settings > Access Keys

### 3. Register Routes

Edit `src/routes/index.js`:

```javascript
const { paymentRoutes } = require('../modules/payment-getway/routes');

// Register payment routes
router.use('/payment', paymentRoutes);
```

### 4. Setup Webhook di Midtrans Dashboard

1. Login ke Midtrans Dashboard
2. Go to Settings > Configuration
3. Set **Payment Notification URL**: `https://yourdomain.com/api/v1/payment/midtrans/notification`
4. Set **Finish Redirect URL**: `https://yourdomain.com/payment/finish`

## 📡 API Endpoints

### 1. Get Configuration (Frontend)

```http
GET /api/v1/payment/midtrans/config
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "clientKey": "SB-Mid-client-xxx",
    "isProduction": false,
    "snapUrl": "https://app.sandbox.midtrans.com/snap/v1",
    "enabledPayments": ["credit_card", "gopay", "bank_transfer", ...]
  }
}
```

### 2. Create Payment (Snap Token)

```http
POST /api/v1/payment/midtrans/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "transactionId": "uuid-here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment created successfully",
  "data": {
    "transactionId": "uuid",
    "transactionNumber": "TRX-20231216-001",
    "amount": "150000",
    "snapToken": "abc123xyz",
    "redirectUrl": "https://app.sandbox.midtrans.com/snap/v2/vtweb/abc123xyz",
    "clientKey": "SB-Mid-client-xxx"
  }
}
```

### 3. Create Direct Charge

```http
POST /api/v1/payment/midtrans/charge
Authorization: Bearer <token>
Content-Type: application/json

{
  "transactionId": "uuid-here",
  "paymentType": "bank_transfer",
  "bankTransfer": {
    "bank": "bca"
  }
}
```

### 4. Check Payment Status

```http
GET /api/v1/payment/midtrans/status/:transactionNumber
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionNumber": "TRX-20231216-001",
    "midtransStatus": "settlement",
    "fraudStatus": "accept",
    "paymentType": "credit_card",
    "currentStatus": "paid"
  }
}
```

### 5. Cancel Payment

```http
POST /api/v1/payment/midtrans/cancel/:transactionNumber
Authorization: Bearer <token>
```

### 6. Refund Payment

```http
POST /api/v1/payment/midtrans/refund/:transactionNumber
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 50000,  // Optional: partial refund
  "reason": "Customer request"
}
```

### 7. Webhook Notification (Public)

```http
POST /api/v1/payment/midtrans/notification
Content-Type: application/json

{
  "order_id": "TRX-20231216-001",
  "transaction_status": "settlement",
  "fraud_status": "accept",
  ...
}
```

## 💻 Frontend Integration

### Snap.js Integration (Recommended)

```html
<!-- Load Snap.js -->
<script 
  type="text/javascript"
  src="https://app.sandbox.midtrans.com/snap/snap.js"
  data-client-key="YOUR_CLIENT_KEY">
</script>
```

```javascript
// 1. Create payment and get token
async function checkout(transactionId) {
  const response = await fetch('/api/v1/payment/midtrans/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ transactionId })
  });
  
  const data = await response.json();
  
  // 2. Show Snap payment page
  snap.pay(data.data.snapToken, {
    onSuccess: function(result) {
      console.log('Payment success:', result);
      // Redirect or update UI
      window.location.href = '/payment/success';
    },
    onPending: function(result) {
      console.log('Payment pending:', result);
      window.location.href = '/payment/pending';
    },
    onError: function(result) {
      console.log('Payment error:', result);
      window.location.href = '/payment/error';
    },
    onClose: function() {
      console.log('Payment popup closed');
    }
  });
}
```

### React Example

```jsx
import { useEffect } from 'react';

function CheckoutButton({ transactionId }) {
  useEffect(() => {
    // Load Snap.js
    const script = document.createElement('script');
    script.src = 'https://app.sandbox.midtrans.com/snap/snap.js';
    script.setAttribute('data-client-key', 'YOUR_CLIENT_KEY');
    document.body.appendChild(script);
  }, []);

  const handleCheckout = async () => {
    try {
      const response = await fetch('/api/v1/payment/midtrans/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ transactionId })
      });

      const data = await response.json();

      window.snap.pay(data.data.snapToken, {
        onSuccess: (result) => {
          console.log('Success:', result);
        },
        onPending: (result) => {
          console.log('Pending:', result);
        },
        onError: (result) => {
          console.log('Error:', result);
        }
      });
    } catch (error) {
      console.error('Checkout error:', error);
    }
  };

  return (
    <button onClick={handleCheckout}>
      Pay with Midtrans
    </button>
  );
}
```

## 🔄 Payment Flow

### 1. Snap Payment Flow

```
1. Customer → Create Transaction di sistem
2. Backend → Generate Snap Token via Midtrans API
3. Frontend → Show Snap Payment Page (hosted by Midtrans)
4. Customer → Pilih payment method & complete payment
5. Midtrans → Send notification ke webhook
6. Backend → Update transaction status
7. Frontend → Redirect to success/finish page
```

### 2. Direct API Flow

```
1. Customer → Create Transaction
2. Backend → Create Charge via Midtrans API
3. Backend → Return payment instructions (VA number, etc)
4. Customer → Complete payment di bank/app
5. Midtrans → Send notification ke webhook
6. Backend → Update transaction status
```

## 📊 Transaction Status Mapping

| Midtrans Status | Our Status | Description |
|----------------|------------|-------------|
| `pending` | `pending` | Waiting for payment |
| `capture` + `accept` | `paid` | Card payment successful |
| `capture` + `challenge` | `pending` | Card payment under review |
| `settlement` | `paid` | Payment successful & settled |
| `deny` | `failed` | Payment denied |
| `expire` | `failed` | Payment expired |
| `cancel` | `failed` | Payment cancelled |
| `refund` | `refunded` | Full refund |
| `partial_refund` | `partial_refund` | Partial refund |

## 🔒 Security

### Signature Verification

Setiap notification dari Midtrans diverifikasi signature-nya:

```javascript
SHA512(order_id + status_code + gross_amount + server_key)
```

Service otomatis verify sebelum process notification.

### Best Practices

1. ✅ **Always verify signature** pada webhook
2. ✅ **Use HTTPS** untuk production
3. ✅ **Validate transaction** before processing
4. ✅ **Log all transactions** untuk audit trail
5. ✅ **Handle duplicate notifications** (Midtrans bisa kirim multiple times)
6. ✅ **Always return 200 OK** di webhook (prevent retry loop)

## 🧪 Testing

### Sandbox Test Cards

**Success Payment:**
- Card Number: `4811 1111 1111 1114`
- CVV: `123`
- Exp: Any future date

**Failed Payment:**
- Card Number: `4911 1111 1111 1113`

**Full list:** [Midtrans Testing Guide](https://docs.midtrans.com/en/technical-reference/sandbox-test)

### Test Virtual Account

- BCA VA: Will auto-settle after 10 seconds
- Mandiri Bill: Will auto-settle after 10 seconds

## 🐛 Troubleshooting

### Error: "Invalid signature"

- Check SERVER_KEY di .env
- Pastikan gross_amount dalam integer (bukan string)
- Log signature generation untuk debug

### Error: "Transaction not found"

- Pastikan transactionNumber sama dengan order_id di Midtrans
- Check tenantId filtering

### Notification tidak diterima

- Check Notification URL di Midtrans Dashboard
- Pastikan endpoint publicly accessible (use ngrok for local testing)
- Check firewall/security group

### Payment success tapi status tidak update

- Check webhook logs
- Verify signature valid
- Check transaction mapping logic

## 📚 Resources

- [Midtrans Documentation](https://docs.midtrans.com/)
- [Snap API Reference](https://snap-docs.midtrans.com/)
- [Core API Reference](https://api-docs.midtrans.com/)
- [Payment Methods](https://docs.midtrans.com/en/core-api/payment-methods)
- [Notification Handling](https://docs.midtrans.com/en/after-payment/http-notification)

## 🔧 Development Tools

### Ngrok (untuk local testing webhook)

```bash
ngrok http 3000
```

Copy URL dan set di Midtrans Dashboard notification URL.

### Postman Collection

Import collection dari Midtrans docs untuk testing API calls.

## 📝 Notes

- Sandbox credentials TIDAK bisa digunakan di production
- Production mode requires verified merchant account
- Some payment methods hanya available di production
- Webhook URL harus HTTPS di production

---

**Status**: ✅ Ready for integration
**Last Updated**: December 18, 2025
