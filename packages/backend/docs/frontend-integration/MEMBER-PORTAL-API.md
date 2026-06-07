# Member Portal API Documentation

## Overview

Member Portal adalah API khusus untuk member (anggota gym) yang memungkinkan mereka untuk:
- Melihat dashboard dengan overview layanan aktif
- Melihat dan berlangganan service plans (membership, classes, PT)
- Melakukan pembelian mandiri (self-service)
- Melihat history transaksi
- Memesan makanan dari restaurant (jika tenant memiliki fitur restaurant)

**Base URL**: `/api/v1/member`

**Authentication**: Semua endpoint memerlukan JWT token dari login member melalui `/api/v1/auth/login`

---

## Authentication

Member menggunakan endpoint login yang sama dengan user lainnya, tetapi dengan kredensial member:

### Login Member

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "member@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "email": "member@example.com",
      "role": "member",
      "tenantId": "tenant-uuid"
    }
  }
}
```

**Kemudian gunakan token di header semua request:**
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 1. Dashboard

### Get Member Dashboard

Menampilkan overview lengkap member: layanan aktif, transaksi terakhir, statistik, dan fitur yang tersedia.

**Endpoint**: `GET /api/v1/member/dashboard`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "status": "success",
  "message": "Dashboard data retrieved successfully",
  "data": {
    "member": {
      "id": "uuid",
      "fullName": "John Doe",
      "email": "john@example.com",
      "phone": "08123456789",
      "photoUrl": "https://...",
      "membershipStatus": "active",
      "joinDate": "2024-01-15"
    },
    "activeServices": [
      {
        "id": "uuid",
        "serviceType": {
          "id": "uuid",
          "name": "Gold Membership",
          "type": "membership",
          "description": "Akses unlimited ke gym"
        },
        "startDate": "2024-12-01",
        "endDate": "2025-01-01",
        "remainingSessions": null,
        "status": "active"
      },
      {
        "id": "uuid",
        "serviceType": {
          "id": "uuid",
          "name": "Yoga Class Package",
          "type": "class",
          "description": "10 sesi yoga"
        },
        "startDate": "2024-12-10",
        "endDate": "2025-01-10",
        "remainingSessions": 7,
        "status": "active"
      }
    ],
    "recentTransactions": [
      {
        "id": "uuid",
        "transactionNumber": "GYM-20241223-001",
        "date": "2024-12-23T10:00:00Z",
        "totalAmount": 500000,
        "status": "completed",
        "type": "service_purchase",
        "items": [
          {
            "name": "Gold Membership",
            "quantity": 1,
            "price": 500000
          }
        ]
      }
    ],
    "stats": {
      "totalActiveServices": 2,
      "membershipServices": 1,
      "classServices": 1,
      "ptServices": 0,
      "totalSpent": 1500000
    },
    "features": {
      "restaurant": true
    }
  }
}
```

**Use Cases:**
- Tampilan home dashboard member app/portal
- Quick overview untuk member
- Cek status layanan aktif

---

## 2. Service Plans

### 2.1 Get All Available Services

Melihat semua service plans yang tersedia (membership, classes, PT).

**Endpoint**: `GET /api/v1/member/services`

**Query Parameters:**
- `type` (optional): Filter by type (`membership`, `class`, `personal_training`)

**Example Request:**
```http
GET /api/v1/member/services
Authorization: Bearer <token>
```

**Response:**
```json
{
  "status": "success",
  "message": "Available services retrieved successfully",
  "data": {
    "all": [
      {
        "id": "uuid",
        "name": "Basic Membership",
        "type": "membership",
        "description": "Akses gym standar",
        "price": 300000,
        "duration": 1,
        "durationUnit": "month",
        "sessions": null,
        "features": {
          "gymAccess": true,
          "lockerAccess": true
        }
      }
    ],
    "grouped": {
      "membership": [...],
      "classes": [...],
      "personal_training": [...]
    }
  }
}
```

---

### 2.2 Get Membership Plans Only

Melihat hanya paket membership.

**Endpoint**: `GET /api/v1/member/services/membership`

**Response:**
```json
{
  "status": "success",
  "message": "Membership plans retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "name": "Gold Membership",
      "description": "Akses unlimited + fasilitas premium",
      "price": 500000,
      "duration": 1,
      "durationUnit": "month",
      "features": {
        "gymAccess": true,
        "lockerAccess": true,
        "poolAccess": true,
        "saunaAccess": true
      }
    }
  ]
}
```

---

### 2.3 Get Class Packages Only

Melihat hanya paket kelas (Yoga, Zumba, etc).

**Endpoint**: `GET /api/v1/member/services/classes`

**Response:**
```json
{
  "status": "success",
  "message": "Class packages retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "name": "Yoga Class - 10 Sessions",
      "description": "10 sesi yoga dengan instruktur bersertifikat",
      "price": 750000,
      "sessions": 10,
      "duration": 2,
      "durationUnit": "month",
      "features": {
        "instructorLevel": "certified",
        "classSize": "small"
      }
    }
  ]
}
```

---

### 2.4 Get Personal Training Packages Only

Melihat hanya paket personal training.

**Endpoint**: `GET /api/v1/member/services/pt`

**Response:**
```json
{
  "status": "success",
  "message": "Personal training packages retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "name": "Personal Training - 8 Sessions",
      "description": "8 sesi PT dengan trainer profesional",
      "price": 2000000,
      "sessions": 8,
      "duration": 1,
      "durationUnit": "month",
      "features": {
        "oneOnOne": true,
        "nutritionPlan": true
      }
    }
  ]
}
```

---

### 2.5 Subscribe to Service (Self-Service Purchase)

Member membeli/berlangganan service secara mandiri.

**Endpoint**: `POST /api/v1/member/services/subscribe`

**Request Body:**
```json
{
  "servicePlanId": "uuid",  // ⚠️ REQUIRED: ID dari service plan (bukan serviceTypeId)
  "paymentMethod": "transfer"  // ⚠️ REQUIRED: cash, transfer, atau credit_card
}
```

**Field Descriptions:**
- `servicePlanId` (string, required): UUID dari service plan yang ingin dibeli. Didapat dari endpoint `/member/services`, `/member/services/membership`, `/member/services/classes`, atau `/member/services/pt`
- `paymentMethod` (string, required): Metode pembayaran. Allowed values: `cash`, `transfer`, `credit_card`

**⚠️ PENTING - Tentang Customer ID:**
Backend **automatically** mengambil member info dari JWT token untuk security. Tidak perlu (dan tidak boleh) mengirim `customerId` di payload. Jika dikirim, akan diabaikan dan diganti dengan userId dari token.

**Response:**
```json
{
  "status": "success",
  "message": "Service subscription created. Please complete payment to activate.",
  "data": {
    "activeService": {
      "id": "uuid",
      "serviceName": "Gold Membership",
      "startDate": "2024-12-23",
      "endDate": "2025-01-23",
      "status": "suspended"
    },
    "transaction": {
      "id": "uuid",
      "transactionNumber": "GYM-20241223-002",
      "amount": 500000,
      "status": "pending",
      "customerName": "John Doe",
      "customerType": "member"
    },
    "paymentInstructions": {
      "message": "Please complete payment to activate your service",
      "amount": 500000,
      "methods": ["cash", "transfer", "credit_card"]
    }
  }
}
```

**Process Flow:**
1. Member pilih service yang ingin dibeli
2. System create ActiveService dengan status `suspended` (menunggu pembayaran)
3. System create Transaction dengan status `pending`
4. Member harus melakukan pembayaran
5. Setelah pembayaran dikonfirmasi oleh staff, ActiveService akan diubah menjadi `active`

**Important Notes:**
- ActiveService dibuat dengan status `suspended` sampai payment dikonfirmasi
- Transaction dibuat dengan status `pending`
- Setelah staff konfirmasi pembayaran, status ActiveService otomatis berubah jadi `active`
- Tidak perlu payload tambahan, hanya `servicePlanId` dan `paymentMethod`

---

### 2.6 Get My Active Services

Melihat layanan yang sedang aktif untuk member.

**Endpoint**: `GET /api/v1/member/services/my-services`

**Response:**
```json
{
  "status": "success",
  "message": "Active services retrieved successfully",
  "data": {
    "active": [
      {
        "id": "uuid",
        "servicePlan": {
          "id": "uuid",
          "name": "Gold Membership",
          "serviceType": "membership",
          "description": "...",
          "price": 500000,
          "duration": 1,
          "durationType": "month",
          "sessions": null
        },
        "startDate": "2024-12-01",
        "endDate": "2025-01-01",
        "remainingSessions": null,
        "status": "active"
      }
    ],
    "suspended": [
      {
        "id": "uuid",
        "servicePlan": {
          "id": "uuid",
          "name": "Yoga Class Package",
          "serviceType": "class_package",
          "price": 750000
        },
        "startDate": "2024-12-23",
        "endDate": "2025-01-23",
        "status": "suspended",
        "note": "Waiting for payment confirmation"
      }
    ],
    "expired": [],
    "cancelled": [],
    "summary": {
      "totalActive": 1,
      "totalSuspended": 1,
      "totalExpired": 0,
      "totalCancelled": 0
    }
  }
}
```

---

## 3. Transaction History

### 3.1 Get Transaction History

Melihat riwayat semua transaksi member.

**Endpoint**: `GET /api/v1/member/transactions`

**Query Parameters:**
- `page` (default: 1): Page number
- `limit` (default: 10): Items per page
- `status`: Filter by status (`pending`, `completed`, `cancelled`)
- `type`: Filter by type (`service_purchase`, `restaurant`, `pos`)
- `startDate`: Filter from date (YYYY-MM-DD)
- `endDate`: Filter to date (YYYY-MM-DD)

**Example Request:**
```http
GET /api/v1/member/transactions?page=1&limit=10&status=completed
Authorization: Bearer <token>
```

**Response:**
```json
{
  "status": "success",
  "message": "Transaction history retrieved successfully",
  "data": {
    "transactions": [
      {
        "id": "uuid",
        "transactionNumber": "GYM-20241223-001",
        "date": "2024-12-23T10:00:00Z",
        "type": "service_purchase",
        "category": "service",
        "totalAmount": 500000,
        "status": "completed",
        "items": [
          {
            "id": "uuid",
            "type": "service",
            "name": "Gold Membership",
            "quantity": 1,
            "unitPrice": 500000,
            "subtotal": 500000
          }
        ],
        "payments": [
          {
            "id": "uuid",
            "method": "transfer",
            "amount": 500000,
            "date": "2024-12-23T10:30:00Z",
            "status": "completed",
            "reference": "TRF123456"
          }
        ],
        "notes": "Self-service purchase: Gold Membership"
      }
    ],
    "summary": {
      "totalSpent": 2500000,
      "totalTransactions": 15,
      "byType": {
        "service_purchase": 10,
        "restaurant_order": 5,
        "pos_sale": 0
      }
    },
    "pagination": {
      "currentPage": 1,
      "totalPages": 2,
      "totalItems": 15,
      "itemsPerPage": 10
    }
  }
}
```

---

### 3.2 Get Transaction Detail

Melihat detail spesifik dari satu transaksi.

**Endpoint**: `GET /api/v1/member/transactions/:id`

**Response:**
```json
{
  "status": "success",
  "message": "Transaction detail retrieved successfully",
  "data": {
    "id": "uuid",
    "transactionNumber": "GYM-20241223-001",
    "date": "2024-12-23T10:00:00Z",
    "type": "service_purchase",
    "category": "service",
    "totalAmount": 500000,
    "discountAmount": 0,
    "taxAmount": 0,
    "status": "completed",
    "items": [
      {
        "id": "uuid",
        "type": "service",
        "itemId": "uuid",
        "name": "Gold Membership",
        "quantity": 1,
        "unitPrice": 500000,
        "subtotal": 500000,
        "notes": null
      }
    ],
    "payments": [
      {
        "id": "uuid",
        "method": "transfer",
        "amount": 500000,
        "date": "2024-12-23T10:30:00Z",
        "status": "completed",
        "reference": "TRF123456",
        "notes": "Bank Mandiri"
      }
    ],
    "notes": "Self-service purchase: Gold Membership",
    "metadata": {
      "orderedBy": "member",
      "memberId": "uuid",
      "memberName": "John Doe"
    }
  }
}
```

---

## 4. Restaurant (Feature-Gated)

**⚠️ Important**: Restaurant endpoints hanya bisa diakses jika tenant memiliki subscription dengan fitur restaurant enabled.

### 4.1 Get Restaurant Menu

Melihat menu makanan/minuman yang tersedia.

**Endpoint**: `GET /api/v1/member/restaurant/menu`

**Query Parameters:**
- `category`: Filter by category ID
- `search`: Search by product name

**Example Request:**
```http
GET /api/v1/member/restaurant/menu?search=coffee
Authorization: Bearer <token>
```

**Response:**
```json
{
  "status": "success",
  "message": "Menu retrieved successfully",
  "data": {
    "menu": [
      {
        "id": "uuid",
        "name": "Espresso Coffee",
        "description": "Single shot espresso",
        "price": 25000,
        "imageUrl": "https://...",
        "category": {
          "id": "uuid",
          "name": "Beverages",
          "description": "Minuman"
        },
        "isAvailable": true
      }
    ],
    "categories": [
      {
        "id": "uuid",
        "name": "Beverages",
        "description": "Minuman"
      },
      {
        "id": "uuid",
        "name": "Food",
        "description": "Makanan"
      }
    ]
  }
}
```

---

### 4.2 Place Restaurant Order

Member memesan makanan/minuman secara mandiri.

**Endpoint**: `POST /api/v1/member/restaurant/order`

**Request Body:**
```json
{
  "items": [
    {
      "productId": "uuid",
      "quantity": 2,
      "notes": "Less sugar"
    },
    {
      "productId": "uuid",
      "quantity": 1
    }
  ],
  "notes": "Take away",
  "paymentMethod": "cash"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Order placed successfully",
  "data": {
    "transaction": {
      "id": "uuid",
      "transactionNumber": "REST-20241223-001",
      "totalAmount": 75000,
      "status": "pending"
    },
    "items": [
      {
        "productName": "Espresso Coffee",
        "quantity": 2,
        "unitPrice": 25000,
        "subtotal": 50000
      },
      {
        "productName": "Croissant",
        "quantity": 1,
        "unitPrice": 25000,
        "subtotal": 25000
      }
    ],
    "paymentInstructions": {
      "message": "Please proceed to payment counter or complete payment online",
      "amount": 75000,
      "methods": ["cash", "transfer", "credit_card"]
    }
  }
}
```

**Process Flow:**
1. Member browse menu
2. Member pilih item dan quantity
3. System create transaction dengan status `pending`
4. System reduce product stock
5. Member bayar di kasir atau online
6. Staff konfirmasi pembayaran
7. Transaction status → `completed`

---

### 4.3 Get Restaurant Order History

Melihat riwayat pesanan restaurant member.

**Endpoint**: `GET /api/v1/member/restaurant/orders`

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 10)
- `status`: Filter by status

**Response:**
```json
{
  "status": "success",
  "message": "Order history retrieved successfully",
  "data": {
    "orders": [
      {
        "id": "uuid",
        "orderNumber": "REST-20241223-001",
        "date": "2024-12-23T11:00:00Z",
        "totalAmount": 75000,
        "status": "completed",
        "items": [
          {
            "name": "Espresso Coffee",
            "quantity": 2,
            "price": 25000
          }
        ]
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalItems": 5,
      "itemsPerPage": 10
    }
  }
}
```

---

## Error Responses

Semua endpoint menggunakan format error yang konsisten:

**400 Bad Request:**
```json
{
  "status": "error",
  "message": "Validation error",
  "errors": {
    "servicePlanId": "Service plan ID is required"
  }
}
```

**Example - Missing payment method:**
```json
{
  "status": "error",
  "message": "Validation error",
  "errors": {
    "paymentMethod": "Payment method is required"
  }
}
```

**401 Unauthorized:**
```json
{
  "status": "error",
  "message": "Authentication required"
}
```

**403 Forbidden:**
```json
{
  "status": "error",
  "message": "This feature is not available in your subscription plan"
}
```

**404 Not Found:**
```json
{
  "status": "error",
  "message": "Member profile not found"
}
```

**500 Internal Server Error:**
```json
{
  "status": "error",
  "message": "An unexpected error occurred"
}
```

---

## Frontend Integration Examples

### React/Vue.js Example - Get Dashboard

```javascript
// memberService.js
import axios from 'axios';

const API_BASE_URL = 'https://api.yourgym.com/api/v1';

class MemberService {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Add auth token to all requests
    this.client.interceptors.request.use(config => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  // Get dashboard
  async getDashboard() {
    const response = await this.client.get('/member/dashboard');
    return response.data;
  }

  // Get available services
  async getAvailableServices(type = null) {
    const params = type ? { type } : {};
    const response = await this.client.get('/member/services', { params });
    return response.data;
  }

  // Subscribe to service
  async subscribeToService(servicePlanId, paymentMethod) {
    const response = await this.client.post('/member/services/subscribe', {
      servicePlanId,
      paymentMethod
    });
    return response.data;
  }

  // Get transaction history
  async getTransactionHistory(page = 1, limit = 10, filters = {}) {
    const response = await this.client.get('/member/transactions', {
      params: { page, limit, ...filters }
    });
    return response.data;
  }

  // Get restaurant menu
  async getRestaurantMenu(search = '', category = null) {
    const params = { search };
    if (category) params.category = category;
    const response = await this.client.get('/member/restaurant/menu', { params });
    return response.data;
  }

  // Place restaurant order
  async placeRestaurantOrder(items, notes, paymentMethod) {
    const response = await this.client.post('/member/restaurant/order', {
      items,
      notes,
      paymentMethod
    });
    return response.data;
  }
}

export default new MemberService();
```

### Usage in Component

```javascript
// Dashboard.vue
<template>
  <div class="member-dashboard">
    <h1>Welcome, {{ member.fullName }}</h1>
    
    <!-- Stats -->
    <div class="stats-grid">
      <div class="stat-card">
        <h3>Active Services</h3>
        <p>{{ dashboard.stats.totalActiveServices }}</p>
      </div>
      <div class="stat-card">
        <h3>Total Spent</h3>
        <p>Rp {{ formatCurrency(dashboard.stats.totalSpent) }}</p>
      </div>
    </div>

    <!-- Active Services -->
    <div class="active-services">
      <h2>My Active Services</h2>
      <div v-for="service in dashboard.activeServices" :key="service.id">
        <ServiceCard :service="service" />
      </div>
    </div>

    <!-- Recent Transactions -->
    <div class="recent-transactions">
      <h2>Recent Transactions</h2>
      <TransactionList :transactions="dashboard.recentTransactions" />
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import memberService from '@/services/memberService';

export default {
  setup() {
    const dashboard = ref(null);
    const loading = ref(true);

    const loadDashboard = async () => {
      try {
        const response = await memberService.getDashboard();
        dashboard.value = response.data;
      } catch (error) {
        console.error('Failed to load dashboard:', error);
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => {
      loadDashboard();
    });

    return {
      dashboard,
      loading
    };
  }
};
</script>
```

---

## Mobile App Integration (Flutter Example)

```dart
// member_service.dart
import 'package:http/http.dart' as http;
import 'dart:convert';

class MemberService {
  final String baseUrl = 'https://api.yourgym.com/api/v1';
  String? authToken;

  // Set auth token
  void setAuthToken(String token) {
    authToken = token;
  }

  // Get headers with auth
  Map<String, String> _getHeaders() {
    return {
      'Content-Type': 'application/json',
      if (authToken != null) 'Authorization': 'Bearer $authToken',
    };
  }

  // Get dashboard
  Future<Map<String, dynamic>> getDashboard() async {
    final response = await http.get(
      Uri.parse('$baseUrl/member/dashboard'),
      headers: _getHeaders(),
    );

    if (response.statusCode == 200) {
      return json.decode(response.body);
    } else {
      throw Exception('Failed to load dashboard');
    }
  }

  // Subscribe to service
  Future<Map<String, dynamic>> subscribeToService(
    String servicePlanId,
    String paymentMethod,
  ) async {
    final response = await http.post(
      Uri.parse('$baseUrl/member/services/subscribe'),
      headers: _getHeaders(),
      body: json.encode({
        'servicePlanId': servicePlanId,
        'paymentMethod': paymentMethod,
      }),
    );

    if (response.statusCode == 201) {
      return json.decode(response.body);
    } else {
      throw Exception('Failed to subscribe');
    }
  }

  // Place restaurant order
  Future<Map<String, dynamic>> placeRestaurantOrder(
    List<Map<String, dynamic>> items,
    String? notes,
    String paymentMethod,
  ) async {
    final response = await http.post(
      Uri.parse('$baseUrl/member/restaurant/order'),
      headers: _getHeaders(),
      body: json.encode({
        'items': items,
        'notes': notes,
        'paymentMethod': paymentMethod,
      }),
    );

    if (response.statusCode == 201) {
      return json.decode(response.body);
    } else {
      throw Exception('Failed to place order');
    }
  }
}
```

---

## Testing with Postman/cURL

### Example: Get Dashboard

```bash
curl -X GET \
  https://api.yourgym.com/api/v1/member/dashboard \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

### Example: Subscribe to Service

```bash
curl -X POST \
  https://api.yourgym.com/api/v1/member/services/subscribe \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'Content-Type: application/json' \
  -d '{
    "servicePlanId": "uuid-here",
    "paymentMethod": "transfer"
  }'

# Note: customerId is automatically extracted from JWT token
# DO NOT send customerId in payload - it will be ignored for security
```

### Example: Place Restaurant Order

```bash
curl -X POST \
  https://api.yourgym.com/api/v1/member/restaurant/order \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'Content-Type: application/json' \
  -d '{
    "items": [
      {
        "productId": "uuid-1",
        "quantity": 2,
        "notes": "Less sugar"
      }
    ],
    "notes": "Take away",
    "paymentMethod": "cash"
  }'
```

---

## Permission & Security

### Role-Based Access

Member endpoints menggunakan JWT authentication dan memerlukan:
- **Role**: `member` (atau role lain yang memiliki permission yang sesuai)
- **Tenant isolation**: Semua data difilter berdasarkan `tenantId` dari token

### Feature Gating

Restaurant endpoints memerlukan:
- Tenant subscription dengan `features.modules.restaurant = true`
- Jika tidak ada, akan return `403 Forbidden`

### Data Privacy

- Member hanya bisa melihat data mereka sendiri
- Transaction history difilter by `customerId = userId`
- Tidak bisa akses data member lain

---

## Summary of Endpoints

| Method | Endpoint | Description | Feature Gate |
|--------|----------|-------------|--------------|
| GET | `/member/dashboard` | Member dashboard overview | - |
| GET | `/member/services` | List all available services | - |
| GET | `/member/services/membership` | List membership plans | - |
| GET | `/member/services/classes` | List class packages | - |
| GET | `/member/services/pt` | List PT packages | - |
| POST | `/member/services/subscribe` | Subscribe to a service | - |
| GET | `/member/services/my-services` | Get my active services | - |
| GET | `/member/transactions` | Transaction history | - |
| GET | `/member/transactions/:id` | Transaction detail | - |
| GET | `/member/restaurant/menu` | Restaurant menu | `restaurant` |
| POST | `/member/restaurant/order` | Place restaurant order | `restaurant` |
| GET | `/member/restaurant/orders` | Restaurant order history | `restaurant` |

---

## Best Practices

### For Frontend Developers

1. **Always handle loading states**: API calls bisa lambat, berikan feedback ke user
2. **Error handling**: Tampilkan error message yang user-friendly
3. **Token refresh**: Implement automatic token refresh sebelum expired
4. **Cache wisely**: Cache dashboard data, tetapi selalu fresh untuk transaction
5. **Optimistic UI**: Untuk subscribe/order, update UI dulu sebelum API response

### For Mobile App Developers

1. **Offline support**: Cache data penting untuk offline viewing
2. **Push notifications**: Notify member ketika payment dikonfirmasi
3. **Deep linking**: Link langsung ke service/transaction tertentu
4. **Pull to refresh**: Implement refresh untuk dashboard dan history
5. **Image caching**: Cache product/service images

---

## Changelog

### Version 1.0.0 (December 23, 2024)
- Initial release
- Dashboard endpoint
- Service browsing and subscription
- Transaction history
- Restaurant ordering (feature-gated)

---

## Support

For questions or issues:
- **Documentation**: Check this guide first
- **API Issues**: Contact backend team
- **Feature Requests**: Submit via internal ticketing system

---

*Last updated: December 23, 2024*
