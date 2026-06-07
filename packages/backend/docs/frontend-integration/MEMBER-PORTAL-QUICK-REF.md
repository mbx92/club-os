# Member Portal - Quick Reference

## Endpoints Overview

### Authentication
```
POST /api/v1/auth/login
```
Login member menggunakan email atau phone number yang terdaftar.

---

## Member Portal Endpoints

Base URL: `/api/v1/member`

### 1. Dashboard
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/member/dashboard` | GET | Overview lengkap member: active services, stats, recent transactions |

### 2. Service Plans
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/member/services` | GET | List semua service (membership, classes, PT) |
| `/member/services/membership` | GET | List khusus membership plans |
| `/member/services/classes` | GET | List khusus class packages |
| `/member/services/pt` | GET | List khusus PT packages |
| `/member/services/subscribe` | POST | Berlangganan service (self-service) |
| `/member/services/my-services` | GET | List layanan aktif member |

### 3. Transactions
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/member/transactions` | GET | History semua transaksi member |
| `/member/transactions/:id` | GET | Detail spesifik transaksi |

### 4. Restaurant (Feature-Gated)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/member/restaurant/menu` | GET | Menu makanan/minuman |
| `/member/restaurant/order` | POST | Pesan makanan |
| `/member/restaurant/orders` | GET | History pesanan restaurant |

---

## Quick Examples

### Login Member
```bash
curl -X POST https://api.yourgym.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"member@example.com","password":"password123"}'
```

### Get Dashboard
```bash
curl https://api.yourgym.com/api/v1/member/dashboard \
  -H "Authorization: Bearer <token>"
```

### Browse Services
```bash
# All services
curl https://api.yourgym.com/api/v1/member/services \
  -H "Authorization: Bearer <token>"

# Membership only
curl https://api.yourgym.com/api/v1/member/services/membership \
  -H "Authorization: Bearer <token>"

# Classes only
curl https://api.yourgym.com/api/v1/member/services/classes \
  -H "Authorization: Bearer <token>"

# PT only
curl https://api.yourgym.com/api/v1/member/services/pt \
  -H "Authorization: Bearer <token>"
```

### Subscribe to Service
```bash
curl -X POST https://api.yourgym.com/api/v1/member/services/subscribe \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "servicePlanId": "uuid-service-plan",
    "paymentMethod": "transfer"
  }'
```

### Get Transaction History
```bash
curl "https://api.yourgym.com/api/v1/member/transactions?page=1&limit=10" \
  -H "Authorization: Bearer <token>"
```

### Place Restaurant Order
```bash
curl -X POST https://api.yourgym.com/api/v1/member/restaurant/order \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"productId": "uuid-1", "quantity": 2, "notes": "Less sugar"},
      {"productId": "uuid-2", "quantity": 1}
    ],
    "notes": "Take away",
    "paymentMethod": "cash"
  }'
```

---

## File Structure

```
src/
├── controllers/member/
│   ├── memberDashboardController.js      # Dashboard logic
│   ├── memberServiceController.js        # Service browsing & subscription
│   ├── memberTransactionController.js    # Transaction history
│   └── memberRestaurantController.js     # Restaurant ordering
│
└── routes/member/
    ├── index.js                          # Main router aggregator
    ├── dashboard.routes.js               # Dashboard routes
    ├── service.routes.js                 # Service routes
    ├── transaction.routes.js             # Transaction routes
    └── restaurant.routes.js              # Restaurant routes (feature-gated)
```

---

## Response Format

All endpoints follow this format:

### Success Response
```json
{
  "status": "success",
  "message": "Description of what happened",
  "data": { /* response data */ }
}
```

### Error Response
```json
{
  "status": "error",
  "message": "Error description",
  "errors": { /* validation errors if any */ }
}
```

---

## Common HTTP Status Codes

| Code | Meaning | Common Cause |
|------|---------|--------------|
| 200 | OK | Success |
| 201 | Created | Resource created (subscribe, order) |
| 400 | Bad Request | Invalid input, validation error |
| 401 | Unauthorized | Token invalid/missing |
| 403 | Forbidden | Feature not enabled in subscription |
| 404 | Not Found | Resource doesn't exist |
| 500 | Server Error | Internal server error |

---

## Feature Gating

Restaurant endpoints memerlukan tenant subscription dengan `restaurant` module enabled.

Check di dashboard:
```json
{
  "features": {
    "restaurant": true  // ✓ Can access restaurant endpoints
  }
}
```

Jika `false`, restaurant endpoints akan return:
```json
{
  "status": "error",
  "message": "This feature is not available in your subscription plan"
}
```

---

## Security Notes

1. **Authentication**: All endpoints require valid JWT token
2. **Tenant Isolation**: Data automatically filtered by `tenantId`
3. **Data Privacy**: Member can only see their own data
4. **Role Check**: Endpoints designed for member role

---

## Next Steps

1. **Test endpoints**: Use Postman or cURL to test
2. **Integrate frontend**: Build member portal/mobile app
3. **Add payment gateway**: For online payment completion
4. **Push notifications**: Notify member on payment confirmation

---

For detailed documentation, see: [MEMBER-PORTAL-API.md](./MEMBER-PORTAL-API.md)
