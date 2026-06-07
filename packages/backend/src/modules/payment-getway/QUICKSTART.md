# Quick Start Guide - Midtrans Integration

## 1. Install Dependencies

```bash
npm install axios
```

## 2. Setup Environment Variables

Copy environment variables ke `.env`:

```bash
cat .env.midtrans.example >> .env
```

Edit values dengan credentials dari Midtrans Dashboard.

## 3. Register Routes

Edit `src/routes/index.js`:

```javascript
// Import payment routes
const { paymentRoutes } = require('../modules/payment-getway/routes');

// Register routes (after other routes)
router.use('/payment', paymentRoutes);
```

## 4. Testing

### Get Configuration

```bash
curl -X GET http://localhost:3000/api/v1/payment/midtrans/config \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Create Payment

```bash
curl -X POST http://localhost:3000/api/v1/payment/midtrans/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"transactionId": "YOUR_TRANSACTION_ID"}'
```

### Test Webhook (Local Development)

1. Install ngrok:
```bash
npm install -g ngrok
```

2. Start ngrok:
```bash
ngrok http 3000
```

3. Copy ngrok URL (e.g., `https://abc123.ngrok.io`)

4. Update Midtrans Dashboard:
   - Go to Settings > Configuration
   - Set Notification URL: `https://abc123.ngrok.io/api/v1/payment/midtrans/notification`

5. Test payment di Sandbox

## 5. Frontend Integration

```html
<!-- Add to your HTML -->
<script 
  src="https://app.sandbox.midtrans.com/snap/snap.js"
  data-client-key="YOUR_CLIENT_KEY">
</script>

<button id="pay-button">Pay Now</button>

<script>
document.getElementById('pay-button').addEventListener('click', async () => {
  // Get snap token from backend
  const response = await fetch('/api/v1/payment/midtrans/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_TOKEN'
    },
    body: JSON.stringify({ transactionId: 'YOUR_TRANSACTION_ID' })
  });
  
  const data = await response.json();
  
  // Show payment page
  snap.pay(data.data.snapToken);
});
</script>
```

## 6. Test Cards (Sandbox)

**Success:**
- Card: `4811 1111 1111 1114`
- CVV: `123`
- Exp: `12/25`

**Denied:**
- Card: `4911 1111 1111 1113`

## Next Steps

1. ✅ Create transaction di sistem
2. ✅ Call `/payment/midtrans/create` untuk get snap token
3. ✅ Show Snap payment page di frontend
4. ✅ Customer complete payment
5. ✅ Webhook updates transaction status automatically
6. ✅ Show success page

## Documentation

Full documentation: `src/modules/payment-getway/README.md`
