# Restaurant Module API - Postman Collection

## Overview

This Postman collection provides comprehensive API testing for the Restaurant Module, which includes product catalog management with JSONB variants, hierarchical categories, table management, stock tracking, and multi-tenant support with CASL authorization.

## Features

- **Multi-tenant Architecture**: Full tenant isolation with automatic context handling
- **CASL Authorization**: Role-based permissions for all operations
- **Feature Gating**: Module-level feature validation
- **JSONB Product Support**: Flexible product variants, options, and ingredients
- **Hierarchical Categories**: Unlimited nesting with breadcrumb support
- **Table Management**: Real-time status tracking with QR code generation
- **Stock Tracking**: Immutable audit trail with low stock alerts
- **Location Management**: GPS coordinates with distance calculations

## Setup Instructions

### 1. Import Collection and Environment

1. Download the files:
   - `restaurant-module.postman_collection.json`
   - `restaurant-module.postman_environment.json`

2. Open Postman and import:
   - Click **Import** → **Select Files**
   - Choose both JSON files
   - Select the "Restaurant Module Environment" as your active environment

### 2. Configure Authentication

Update the following environment variables:
- `restaurantUserEmail`: Your restaurant user email
- `restaurantUserPassword`: Your restaurant user password
- `baseUrl`: API base URL (default: `http://localhost:8000`)

### 3. Run Authentication

1. Execute the **Login** request in the **Authentication** folder
2. The script will automatically save:
   - `jwt_token` and `authToken` for API requests
   - `tenantId` and `userId` from the authenticated user
   - `refreshToken` for token renewal

## API Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/login` | Authenticate user and get JWT token |
| POST | `/refresh-token` | Renew authentication token |

### Product Categories (`/api/v1/restaurant/categories`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/` | Get all categories (flat or tree) | `read:ProductCategory` |
| GET | `/tree` | Get hierarchical category tree | `read:ProductCategory` |
| GET | `/:id` | Get category by ID with full path | `read:ProductCategory` |
| POST | `/` | Create new category | `create:ProductCategory` |
| PUT | `/:id` | Update category | `update:ProductCategory` |
| DELETE | `/:id` | Delete category | `delete:ProductCategory` |
| POST | `/reorder` | Reorder categories | `update:ProductCategory` |

#### Query Parameters
- `tree=true`: Return hierarchical tree structure
- `parentId`: Filter by parent category
- `includeCount=true`: Include product count per category
- `includeInactive=true`: Include inactive categories

### Products (`/api/v1/restaurant/products`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/` | Get all products with filters | `read:Product` |
| GET | `/low-stock` | Get low stock products | `read:Product` |
| GET | `/:id` | Get product by ID with stock movements | `read:Product` |
| POST | `/` | Create new product | `create:Product` |
| PUT | `/:id` | Update product details | `update:Product` |
| DELETE | `/:id` | Delete product (soft delete) | `delete:Product` |
| POST | `/:id/adjust-stock` | Adjust product stock | `update:Product` |

#### Query Parameters
- `search`: Search by name, SKU, or barcode
- `categoryId`: Filter by category
- `locationId`: Filter by location
- `isActive`: Filter by active status
- `trackInventory`: Filter by inventory tracking
- `lowStock=true`: Show only low stock products
- `productType`: Filter by JSONB productType field

#### Product Details Structure (JSONB)
```json
{
  "productType": "beverage",
  "hasVariants": true,
  "variants": [
    {
      "name": "Small",
      "sku": "BEV-COFFEE-001-S",
      "price": 20000,
      "isAvailable": true
    }
  ],
  "options": [
    {
      "name": "Sugar Level",
      "values": ["No Sugar", "Less Sugar", "Normal"]
    }
  ],
  "allergens": ["Milk", "Caffeine"],
  "ingredients": ["Coffee Beans", "Water", "Milk"],
  "preparationTime": 5
}
```

### Restaurant Tables (`/api/v1/restaurant/tables`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/` | Get all tables with filters | `read:RestaurantTable` |
| GET | `/statistics` | Get table occupancy statistics | `read:RestaurantTable` |
| GET | `/layout/:locationId` | Get table layout for location | `read:RestaurantTable` |
| GET | `/:id` | Get table by ID with current order | `read:RestaurantTable` |
| POST | `/` | Create new table | `create:RestaurantTable` |
| PUT | `/:id` | Update table details | `update:RestaurantTable` |
| DELETE | `/:id` | Delete table | `delete:RestaurantTable` |
| POST | `/:id/occupy` | Occupy table (start order) | `update:RestaurantTable` |
| POST | `/:id/release` | Release table (finish order) | `update:RestaurantTable` |
| POST | `/:id/reserve` | Reserve table | `update:RestaurantTable` |
| POST | `/:id/cleaning` | Set table for cleaning | `update:RestaurantTable` |

#### Table Status Values
- `available`: Table is free and ready
- `occupied`: Table is currently in use
- `reserved`: Table is reserved for future use
- `cleaning`: Table is being cleaned

#### Table Layout Structure
```json
{
  "tableNumber": "T01",
  "capacity": 4,
  "positionX": 100,
  "positionY": 200,
  "width": 80,
  "height": 80,
  "shape": "rectangle",
  "section": "Main Hall",
  "qrCode": "auto-generated-SHA256-hash"
}
```

### Locations (`/api/v1/restaurant/locations`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/` | Get all locations | `read:Location` |
| POST | `/` | Create new location | `create:Location` |
| GET | `/:id` | Get location by ID | `read:Location` |
| PUT | `/:id` | Update location | `update:Location` |
| DELETE | `/:id` | Delete location | `delete:Location` |

#### Location Types
- `main`: Main restaurant location
- `branch`: Additional branch
- `outlet`: Smaller outlet
- `warehouse`: Storage facility

### Stock Movements (`/api/v1/restaurant/stock-movements`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/` | Get stock movements history | `read:StockMovement` |
| GET | `/summary` | Get stock summary by date range | `read:StockMovement` |
| GET | `/most-moved` | Get most moved products | `read:StockMovement` |

#### Movement Types
- `in`: Stock addition (purchase, return)
- `out`: Stock removal (sale, damage)
- `adjustment`: Manual stock correction
- `transfer`: Stock movement between locations

## Testing Workflows

### 1. Complete Product Management Flow

1. **Create Category**: `POST /api/v1/restaurant/categories`
2. **Create Subcategory**: `POST /api/v1/restaurant/categories` with `parentId`
3. **Create Product with Variants**: `POST /api/v1/restaurant/products`
4. **Adjust Stock**: `POST /api/v1/restaurant/products/:id/adjust-stock`
5. **Get Low Stock Alert**: `GET /api/v1/restaurant/products/low-stock`
6. **Update Product**: `PUT /api/v1/restaurant/products/:id`
7. **Delete Product**: `DELETE /api/v1/restaurant/products/:id`

### 2. Table Management Flow

1. **Create Location**: `POST /api/v1/restaurant/locations`
2. **Create Table**: `POST /api/v1/restaurant/tables`
3. **Get Table Layout**: `GET /api/v1/restaurant/tables/layout/:locationId`
4. **Reserve Table**: `POST /api/v1/restaurant/tables/:id/reserve`
5. **Occupy Table**: `POST /api/v1/restaurant/tables/:id/occupy`
6. **Release Table**: `POST /api/v1/restaurant/tables/:id/release`
7. **Set for Cleaning**: `POST /api/v1/restaurant/tables/:id/cleaning`
8. **Get Statistics**: `GET /api/v1/restaurant/tables/statistics`

### 3. Category Tree Management

1. **Create Parent Categories**: Multiple `POST /api/v1/restaurant/categories`
2. **Create Child Categories**: Set `parentId` in requests
3. **Get Category Tree**: `GET /api/v1/restaurant/categories/tree`
4. **Reorder Categories**: `POST /api/v1/restaurant/categories/reorder`
5. **Get Breadcrumb Path**: `GET /api/v1/restaurant/categories/:id`

## Environment Variables

### Authentication Variables
- `jwt_token`: JWT authentication token (auto-set)
- `authToken`: Alternative token variable (auto-set)
- `refreshToken`: Token renewal (auto-set)
- `tenantId`: Current tenant ID (auto-set)
- `userId`: Current user ID (auto-set)

### Test Data Variables (auto-set during testing)
- `productId`: Main product ID (with variants)
- `productId2`: Secondary product ID (simple product)
- `categoryId`: Parent category ID
- `subcategoryId`: Child category ID
- `locationId`: Location ID
- `tableId`: Table ID
- `orderId`: Order ID (from table operations)
- `stockMovementId`: Stock movement ID

### Configuration Variables
- `baseUrl`: API base URL
- `restaurantUserEmail`: Login email
- `restaurantUserPassword`: Login password

### Filter Variables
- `productType`: Product type filter
- `search`: Search term
- `tree`: Category tree view
- `isActive`: Product active status
- `trackInventory`: Inventory tracking filter
- `status`: Table status filter
- `movementType`: Stock movement type
- `limit`: Pagination limit
- `page`: Pagination page

## Security Features

### Multi-Tenant Isolation
- All requests automatically filtered by `tenantId`
- Cross-tenant access prevention at database level
- Tenant context from authenticated user

### CASL Authorization
- All endpoints require specific permissions
- Role-based access control
- Automatic permission validation

### Feature Gating
- Restaurant module feature validation
- Subscription plan integration
- Trial mode bypass support

## Error Handling

### Common Response Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation error)
- `401`: Unauthorized (invalid/expired token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `422`: Unprocessable Entity (business logic error)
- `500`: Internal Server Error

### Error Response Format
```json
{
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": "Additional error details"
  }
}
```

## Performance Considerations

### Pagination
- All list endpoints support `page` and `limit` parameters
- Default limit: 20 items
- Maximum limit: 100 items

### JSONB Indexing
- GIN indexes on `productDetails` for fast queries
- Optimized for variant and option searches

### Optimistic Locking
- `version` field prevents concurrent updates
- Automatic retry logic for conflicts

## Testing Tips

### 1. Sequential Execution
Run requests in the order shown in folders to ensure dependencies are met.

### 2. Environment Variable Management
- Clear variables between test runs
- Use the "Reset Environment" button if needed
- Check variable values in the Environment tab

### 3. Debugging
- Use Postman Console for script debugging
- Check response bodies for error details
- Verify authentication tokens are valid

### 4. Performance Testing
- Use Postman Runner for bulk operations
- Monitor response times
- Test with different pagination limits

## Integration Notes

### Frontend Integration
- Use the same API endpoints
- Handle authentication token storage
- Implement proper error handling
- Support real-time table updates

### Mobile App Integration
- QR code scanning for table identification
- Offline mode for table status
- Push notifications for order updates

### Third-Party Integration
- Webhook support for stock movements
- API rate limiting considerations
- Data export capabilities

## Support

For issues and questions:
1. Check the API response messages
2. Review the implementation documentation
3. Verify environment variables are correct
4. Ensure authentication is valid
5. Check user permissions

---

## Order Management (NEW v2.0)

### Orders (`/api/v1/restaurant/orders`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/` | Get all orders with filters | `read:Transaction` |
| GET | `/:id` | Get order by ID | `read:Transaction` |
| POST | `/` | Create new order | `create:Transaction` |
| POST | `/direct` | Direct order (quick sale) | `create:Transaction` |
| PATCH | `/:id/status` | Update order status | `update:Transaction` |
| POST | `/:id/items` | Add items to order | `update:Transaction` |
| POST | `/:id/complete` | Checkout with payment | `update:Transaction` |
| POST | `/validate-voucher` | Validate voucher | `read:Voucher` |
| POST | `/:id/split` | Split bill | `update:Transaction` |
| POST | `/merge` | Merge bills | `update:Transaction` |
| GET | `/kitchen` | Kitchen display orders | `read:Transaction` |
| GET | `/table/:tableId` | Orders by table | `read:Transaction` |

### Direct Order Request
```json
{
  "orderType": "takeaway",
  "items": [
    { "productId": "uuid", "quantity": 2 }
  ],
  "payments": [
    { "method": "cash", "amount": 50000 },
    { "method": "e_wallet", "amount": 25000, "reference": "GOPAY-123" }
  ],
  "voucherCode": "PROMO2024"
}
```

### Complete Order (Checkout)
```json
{
  "payments": [
    { "method": "cash", "amount": 100000 }
  ],
  "voucherCode": "DISCOUNT10"
}
```

### Split Bill
```json
// Equal split
{ "splitType": "equal", "splits": 3 }

// By items
{
  "splitType": "by_items",
  "splits": [
    { "itemIds": ["item1", "item2"], "customerName": "Person A" },
    { "itemIds": ["item3"], "customerName": "Person B" }
  ]
}
```

### Merge Bills
```json
{ "orderIds": ["order1", "order2", "order3"] }
```

### Payment Methods
- `cash`, `credit_card`, `debit_card`, `bank_transfer`, `e_wallet`, `other`

### Order Status Flow
```
pending → confirmed → preparing → ready → served → completed
                                                  ↘ cancelled
                                                  ↘ split
                                                  ↘ merged
```

---

## Combined Billing (NEW v2.0)

### Combined Billing (`/api/v1/restaurant/combined-billing`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| POST | `/` | Create combined transaction | `create:Transaction` |
| POST | `/validate-voucher` | Validate voucher | `read:Voucher` |
| GET | `/:id/receipt` | Get receipt with printer settings | `read:Transaction` |

**Feature Gate**: Requires `combinedBilling` feature (Professional+ plans)

### Combined Transaction Request
```json
{
  "customerId": "member-uuid",
  "customerType": "member",
  "tableId": "table-uuid",
  "items": [
    { "type": "membership", "membershipTypeId": "uuid" },
    { "type": "product", "productId": "uuid", "quantity": 2 }
  ],
  "payments": [
    { "method": "credit_card", "amount": 500000 }
  ],
  "voucherCode": "NEWCOMER2024"
}
```

---

**Version**: 2.0.0  
**Last Updated**: 2025-11-29  
**API Version**: v1  
**Module**: Restaurant Module