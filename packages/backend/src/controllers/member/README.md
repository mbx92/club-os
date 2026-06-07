# Member Portal Module

## Overview

Module Member Portal menyediakan API khusus untuk member (anggota gym) agar dapat:
- **Self-service**: Member dapat berlangganan service plan secara mandiri
- **Dashboard**: Lihat overview layanan aktif, transaksi, dan statistik
- **Service Shopping**: Browse dan subscribe ke membership, classes, dan PT packages
- **Transaction History**: Lihat semua riwayat transaksi
- **Restaurant Ordering**: Pesan makanan (jika tenant punya fitur restaurant)

## Key Features

✅ **Member Dashboard** - Overview lengkap status member  
✅ **Service Browsing** - Lihat semua service plans yang tersedia  
✅ **Self-Service Subscription** - Member beli service sendiri  
✅ **Separate Endpoints by Type** - Membership, Classes, PT terpisah  
✅ **Transaction History** - Riwayat semua transaksi member  
✅ **Restaurant Integration** - Pesan makanan jika fitur enabled  
✅ **Feature-Gated** - Restaurant hanya available jika tenant subscribe  
✅ **Tenant Isolation** - Data otomatis filtered by tenant  

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Member Portal API                     │
│                  /api/v1/member/*                        │
└─────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
   ┌────▼────┐      ┌──────▼──────┐     ┌─────▼──────┐
   │Dashboard│      │  Services   │     │Transaction │
   └─────────┘      └─────────────┘     └────────────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
      ┌─────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐
      │ Membership │ │  Classes   │ │     PT     │
      └────────────┘ └────────────┘ └────────────┘

   ┌──────────────────────────────────────────────┐
   │         Restaurant (Feature-Gated)           │
   │   Only if tenant has restaurant module       │
   └──────────────────────────────────────────────┘
```

## Directory Structure

```
src/
├── controllers/member/
│   ├── memberDashboardController.js
│   │   └── getDashboard()
│   │       → Active services, recent transactions, stats
│   │
│   ├── memberServiceController.js
│   │   ├── getAvailableServices()      → All services
│   │   ├── getMembershipPlans()        → Membership only
│   │   ├── getClassPackages()          → Classes only
│   │   ├── getPTPackages()             → PT only
│   │   ├── subscribeToService()        → Self-service purchase
│   │   └── getMyActiveServices()       → Member's active services
│   │
│   ├── memberTransactionController.js
│   │   ├── getTransactionHistory()     → All transactions with pagination
│   │   └── getTransactionDetail()      → Single transaction detail
│   │
│   └── memberRestaurantController.js
│       ├── getMenu()                   → Restaurant menu
│       ├── placeOrder()                → Place order
│       └── getOrderHistory()           → Order history
│
└── routes/member/
    ├── index.js                        → Main aggregator
    ├── dashboard.routes.js             → GET /dashboard
    ├── service.routes.js               → Service endpoints
    ├── transaction.routes.js           → Transaction endpoints
    └── restaurant.routes.js            → Restaurant endpoints (feature-gated)
```

## API Endpoints

### Dashboard
- `GET /api/v1/member/dashboard` - Member overview

### Services
- `GET /api/v1/member/services` - All available services
- `GET /api/v1/member/services/membership` - Membership plans only
- `GET /api/v1/member/services/classes` - Class packages only
- `GET /api/v1/member/services/pt` - PT packages only
- `POST /api/v1/member/services/subscribe` - Subscribe to service
- `GET /api/v1/member/services/my-services` - My active services

### Transactions
- `GET /api/v1/member/transactions` - Transaction history
- `GET /api/v1/member/transactions/:id` - Transaction detail

### Restaurant (Feature-Gated)
- `GET /api/v1/member/restaurant/menu` - Restaurant menu
- `POST /api/v1/member/restaurant/order` - Place order
- `GET /api/v1/member/restaurant/orders` - Order history

## Authentication

Member login menggunakan endpoint yang sama:

```bash
POST /api/v1/auth/login
{
  "email": "member@example.com",  # atau phone: "08123456789"
  "password": "password123"
}
```

Response:
```json
{
  "status": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "email": "member@example.com",
      "role": "member"
    }
  }
}
```

Gunakan token di header:
```
Authorization: Bearer <token>
```

## Self-Service Flow

### 1. Member Browse Services

```bash
GET /api/v1/member/services/membership
```

Response:
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "name": "Gold Membership",
      "price": 500000,
      "duration": 1,
      "durationUnit": "month"
    }
  ]
}
```

### 2. Member Subscribe

```bash
POST /api/v1/member/services/subscribe
{
  "serviceTypeId": "uuid",
  "paymentMethod": "transfer"
}
```

Response:
```json
{
  "status": "success",
  "data": {
    "activeService": {
      "id": "uuid",
      "status": "pending"  // Waiting for payment
    },
    "transaction": {
      "id": "uuid",
      "transactionNumber": "GYM-20241223-001",
      "amount": 500000,
      "status": "pending"
    },
    "paymentInstructions": {
      "message": "Please complete payment to activate",
      "amount": 500000
    }
  }
}
```

### 3. Member Pay (via staff/gateway)

Staff konfirmasi pembayaran → ActiveService status berubah dari `pending` → `active`

### 4. Member Check Active Services

```bash
GET /api/v1/member/services/my-services
```

Response:
```json
{
  "status": "success",
  "data": {
    "active": [
      {
        "id": "uuid",
        "serviceType": {
          "name": "Gold Membership"
        },
        "status": "active",
        "endDate": "2025-01-23"
      }
    ]
  }
}
```

## Restaurant Ordering Flow

### 1. Check if Restaurant Available

```bash
GET /api/v1/member/dashboard
```

Response includes:
```json
{
  "features": {
    "restaurant": true  // ✓ Available
  }
}
```

### 2. Browse Menu

```bash
GET /api/v1/member/restaurant/menu
```

### 3. Place Order

```bash
POST /api/v1/member/restaurant/order
{
  "items": [
    {"productId": "uuid-1", "quantity": 2},
    {"productId": "uuid-2", "quantity": 1}
  ],
  "paymentMethod": "cash"
}
```

## Security & Permissions

### Authentication
- **Required**: Valid JWT token dari login
- **Role**: Intended for `member` role

### Tenant Isolation
- Semua data otomatis filtered by `tenantId` dari token
- Member tidak bisa akses data tenant lain

### Data Privacy
- Member hanya bisa lihat **data mereka sendiri**
- Transaction history filtered by `customerId = userId`
- Tidak bisa akses data member lain

### Feature Gating
- Restaurant endpoints cek `subscription.features.modules.restaurant`
- Jika tidak enabled → `403 Forbidden`

## Database Models Used

- `Member` - Member profile
- `ActiveService` - Member's active services
- `ServiceType` - Service plan templates (membership/class/PT)
- `Transaction` - All transactions
- `TransactionItem` - Transaction line items
- `TransactionPayment` - Payment records
- `Product` - Restaurant products
- `Subscription` - Tenant subscription (for feature checking)

## Error Handling

All endpoints menggunakan consistent error format:

```json
{
  "status": "error",
  "message": "Error description",
  "errors": { /* validation errors */ }
}
```

Common errors:
- `401`: Token invalid/missing
- `403`: Feature not available
- `404`: Member/Resource not found
- `400`: Validation error
- `500`: Server error

## Testing

### Postman Collection
Import file: `docs/postman/member-portal.postman_collection.json` (to be created)

### Manual Testing

1. **Create test member** via gym staff interface
2. **Login as member** → Get token
3. **Test dashboard**: `GET /member/dashboard`
4. **Browse services**: `GET /member/services`
5. **Subscribe**: `POST /member/services/subscribe`
6. **Check history**: `GET /member/transactions`

### Unit Tests
```bash
npm test -- memberServiceController.test.js
```

## Frontend Integration

### JavaScript/TypeScript
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.yourgym.com/api/v1',
  headers: { Authorization: `Bearer ${token}` }
});

// Get dashboard
const dashboard = await api.get('/member/dashboard');

// Subscribe to service
const result = await api.post('/member/services/subscribe', {
  serviceTypeId: 'uuid',
  paymentMethod: 'transfer'
});
```

### React/Vue Component Example
See: [docs/frontend-integration/MEMBER-PORTAL-API.md](../docs/frontend-integration/MEMBER-PORTAL-API.md#frontend-integration-examples)

### Flutter/Mobile Example
See: [docs/frontend-integration/MEMBER-PORTAL-API.md](../docs/frontend-integration/MEMBER-PORTAL-API.md#mobile-app-integration-flutter-example)

## Deployment Notes

### Environment Variables
No additional env vars needed. Uses existing:
- `JWT_SECRET` - For token verification
- `DATABASE_URL` - Database connection

### Database Migrations
No new migrations required. Uses existing tables:
- `Members`
- `ActiveServices`
- `ServiceTypes`
- `Transactions`
- `TransactionItems`
- `TransactionPayments`
- `Products`
- `Subscriptions`

### Routes Registration
Already registered in `src/routes/index.js`:
```javascript
router.use('/member', memberPortalRoutes);
```

## Monitoring & Logging

### Audit Logs
All endpoints logged with:
- `action`: e.g., `MEMBER_DASHBOARD_VIEW`, `MEMBER_SERVICE_SUBSCRIBE`
- `userId`: Member user ID
- `tenantId`: Tenant ID
- `metadata`: Additional context

### Metrics
Prometheus metrics tracked:
- API request duration
- Success/error rates
- Service subscription counts

## Future Enhancements

### Phase 2 (Planned)
- [ ] Payment gateway integration (Midtrans, Stripe)
- [ ] Push notifications on payment confirmation
- [ ] Attendance check-in from mobile
- [ ] QR code for member check-in
- [ ] Referral program
- [ ] Member reviews/ratings

### Phase 3 (Future)
- [ ] Social features (member community)
- [ ] Workout tracking
- [ ] Progress photos
- [ ] Nutrition planning
- [ ] Integration with fitness trackers

## Documentation

- **API Documentation**: [docs/frontend-integration/MEMBER-PORTAL-API.md](../docs/frontend-integration/MEMBER-PORTAL-API.md)
- **Quick Reference**: [docs/frontend-integration/MEMBER-PORTAL-QUICK-REF.md](../docs/frontend-integration/MEMBER-PORTAL-QUICK-REF.md)
- **Transaction Architecture**: [docs/TRANSACTION-ARCHITECTURE.md](../docs/TRANSACTION-ARCHITECTURE.md)
- **Feature Registry**: [src/utils/featureRegistry.js](../src/utils/featureRegistry.js)

## Support

For questions or issues:
- Check API documentation first
- Review error responses for hints
- Check logs in `logs/` directory
- Contact backend team for assistance

---

**Version**: 1.0.0  
**Last Updated**: December 23, 2024  
**Status**: ✅ Production Ready
