# Restaurant POS API Postman Collection

This document provides comprehensive documentation for the Restaurant POS API Postman collection, which includes all the necessary endpoints for managing restaurant operations, inventory, and orders.

## 📋 Table of Contents

1. [Setup Instructions](#setup-instructions)
2. [Environment Variables](#environment-variables)
3. [API Endpoints Overview](#api-endpoints-overview)
4. [Authentication Flow](#authentication-flow)
5. [Testing Scenarios](#testing-scenarios)
6. [Common Response Formats](#common-response-formats)
7. [Error Handling](#error-handling)

## 🚀 Setup Instructions

### Prerequisites
- Node.js server running on `http://localhost:8000`
- Database with restaurant module tables created
- Valid user credentials for authentication

### Import Steps

1. **Import Collection:**
   - Open Postman
   - Click "Import" in the top left
   - Select the `restaurant-api.postman_collection.json` file
   - Choose "Import as collection"

2. **Import Environment:**
   - Go to the "Environments" tab in Postman
   - Click "Import"
   - Select the `restaurant-api.postman_environment.json` file
   - Choose the imported environment as active

3. **Configure Environment:**
   - Update the `baseUrl` if your server runs on a different port
   - Set the `restaurantUserEmail` and `restaurantUserPassword` to valid credentials
   - The collection will automatically populate other variables during testing

## 🔧 Environment Variables

| Variable | Type | Description | Default Value |
|----------|------|-------------|--------------|
| `baseUrl` | string | Base URL for API endpoints | `http://localhost:8000/api/v1` |
| `jwt_token` | secret | JWT authentication token | Auto-populated |
| `authToken` | secret | Bearer token for requests | Auto-populated |
| `refreshToken` | secret | Token for refreshing auth | Auto-populated |
| `restaurantUserEmail` | default | User email for login | `restaurant@example.com` |
| `restaurantUserPassword` | secret | User password for login | `password123` |
| `tenantId` | default | Current tenant ID | Auto-populated |
| `userId` | default | Current user ID | Auto-populated |
| `productId` | default | Product ID for testing | Auto-populated |
| `categoryId` | default | Category ID for testing | Auto-populated |
| `locationId` | default | Location ID for testing | Auto-populated |
| `tableId` | default | Table ID for testing | Auto-populated |
| `orderId` | default | Order ID for testing | Auto-populated |
| `productType` | default | Product type filter | `food` |
| `searchTerm` | default | Search term for products | `nasi` |

## � API Endpoints Overview

### 1. Authentication
- **Login**: Authenticate user and get JWT token
- **Refresh Token**: Renew authentication token

### 2. Product Management
- **Get All Products**: Retrieve products with filters
- **Search Products**: Search products by name or SKU
- **Create Product**: Add new product to inventory
- **Get Product By ID**: Retrieve specific product details
- **Update Product**: Modify existing product information
- **Adjust Stock**: Add/remove stock with tracking
- **Get Low Stock Products**: View products below minimum stock

### 3. Product Categories
- **Get All Categories**: List all product categories
- **Create Category**: Add new product category
- **Get Category By ID**: Retrieve specific category
- **Update Category**: Modify category information
- **Delete Category**: Remove category

### 4. Location Management
- **Get All Locations**: List restaurant locations/outlets
- **Create Location**: Add new location
- **Get Location By ID**: Retrieve specific location
- **Update Location**: Modify location information
- **Delete Location**: Remove location

### 5. Restaurant Tables
- **Get All Tables**: List tables with status filters
- **Create Table**: Add new restaurant table
- **Get Table By ID**: Retrieve specific table
- **Update Table Status**: Change table status (available, occupied, reserved, cleaning)

### 6. Stock Management
- **Get Stock Movements**: View stock movement history
- **Create Stock Movement**: Manual stock adjustment
- **Get Stock Report**: Generate stock reports

### 7. Orders & Transactions
- **Create Order**: Create new restaurant order
- **Get All Orders**: List orders with filters
- **Get Order By ID**: Retrieve specific order
- **Update Order Status**: Change order status
- **Add Item to Order**: Add items to existing order
- **Complete Order**: Finalize order with payment

### 8. Reports & Analytics
- **Sales Report**: Generate sales reports by date range
- **Product Sales Report**: View product performance
- **Table Performance Report**: Analyze table utilization
- **Daily Summary**: Get daily business summary

### 9. Kitchen Display
- **Get Kitchen Orders**: View orders for kitchen preparation
- **Update Kitchen Order Status**: Update order preparation status

## 🔐 Authentication Flow

1. **Login First:**
   - Run the "Login" request in the Authentication folder
   - The response will automatically populate JWT tokens in the environment

2. **Token Usage:**
   - All subsequent requests will use the stored `authToken`
   - Tokens are automatically included in the Authorization header

3. **Token Refresh:**
   - Use the "Refresh Token" endpoint when the current token expires
   - The new token will be automatically saved to the environment

## 🧪 Testing Scenarios

### Scenario 1: Complete Restaurant Workflow

1. **Setup:**
   ```
   Login → Create Location → Create Category → Create Product
   ```

2. **Table Management:**
   ```
   Create Table → Check Table Status → Update Table Status
   ```

3. **Order Processing:**
   ```
   Create Order → Update Order Status → Add Items → Complete Order
   ```

4. **Stock Management:**
   ```
   Adjust Stock → Check Low Stock → View Stock Movements
   ```

### Scenario 2: Daily Operations

1. **Morning Setup:**
   - Check low stock items
   - Adjust inventory if needed
   - Verify table availability

2. **During Service:**
   - Create orders as customers arrive
   - Update table status
   - Monitor kitchen orders

3. **End of Day:**
   - Generate daily sales report
   - Review product performance
   - Check table utilization

### Scenario 3: Inventory Management

1. **Stock In:**
   ```
   Create Stock Movement (Type: in) → Verify Product Stock
   ```

2. **Stock Out:**
   ```
   Create Order → Complete Order → Check Stock Movements
   ```

3. **Stock Adjustment:**
   ```
   Adjust Stock (Type: adjustment) → Verify New Quantity
   ```

## 📊 Common Response Formats

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data here
  },
  "pagination": {  // For list endpoints
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "code": "ERROR_CODE",
    "details": "Additional error information"
  }
}
```

## ⚠️ Error Handling

### Common HTTP Status Codes
- `200` - Success
- `201` - Created successfully
- `400` - Bad request (validation error)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not found
- `409` - Conflict (duplicate data)
- `500` - Internal server error

### Common Error Scenarios

1. **Authentication Errors:**
   - Check that you've run the Login request first
   - Verify the token is still valid
   - Use Refresh Token if needed

2. **Validation Errors:**
   - Ensure all required fields are included
   - Check data types and formats
   - Verify foreign key references exist

3. **Permission Errors:**
   - Confirm user has required permissions
   - Check tenant access rights
   - Verify feature gate permissions

4. **Stock Errors:**
   - Ensure sufficient stock for operations
   - Check product availability
   - Verify location permissions

## 🎯 Best Practices

1. **Sequential Testing:**
   - Run requests in the recommended order
   - Wait for each request to complete before the next
   - Check environment variables are populated

2. **Data Cleanup:**
   - Use test data that won't conflict with production
   - Clean up created test data after testing
   - Reset environment variables between test runs

3. **Performance Testing:**
   - Monitor response times for optimization
   - Test with larger datasets
   - Verify pagination works correctly

4. **Security Testing:**
   - Test with invalid tokens
   - Verify permission restrictions
   - Check data isolation between tenants

## 📞 Support

For issues related to:
- **API Functionality:** Check the API documentation
- **Authentication:** Verify user credentials and permissions
- **Database Issues:** Check database connectivity and migrations
- **Environment Setup:** Ensure all variables are correctly configured

## 🔄 Updates

This collection will be updated as the restaurant API evolves:
- New endpoints will be added
- Existing endpoints may be modified
- Response formats may change
- Environment variables may be updated

Always check for the latest version of this collection and documentation.