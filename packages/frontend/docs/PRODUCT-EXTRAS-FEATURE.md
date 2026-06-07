# Product Extras/Additions Feature - Restaurant Module

## Overview

Fitur Product Extras memungkinkan admin/staff untuk menambahkan tambahan (extras) yang dapat dipilih customer untuk produk tertentu. Contoh: Nasi Goreng dengan opsi "Extra Telur +5000", "Extra Sambal +2000", dll.

## Features

- ✅ Product bisa di-mark sebagai customizable dengan flag `isCustomized`
- ✅ Multiple extras per product dengan grouping
- ✅ Support input types: checkbox, radio, select
- ✅ Required/optional extras
- ✅ Multiple selection per group
- ✅ Automatic price calculation dengan extras
- ✅ Integration dengan order/POS system

## Database Structure

### Products Table - New Field
- `isCustomized` (BOOLEAN) - Flag untuk menandai product yang punya extras

### ProductExtras Table
```sql
CREATE TABLE ProductExtras (
  id UUID PRIMARY KEY,
  tenantId UUID NOT NULL,
  productId UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10,2) DEFAULT 0,
  inputType ENUM('radio', 'checkbox', 'select') DEFAULT 'checkbox',
  groupName VARCHAR(255),
  isRequired BOOLEAN DEFAULT false,
  isMultiple BOOLEAN DEFAULT false,
  sortOrder INTEGER DEFAULT 0,
  isActive BOOLEAN DEFAULT true,
  createdBy UUID,
  updatedBy UUID,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP,
  deletedAt TIMESTAMP
);
```

## API Endpoints

### 1. Get Product Extras

**GET** `/api/v1/restaurant/products/:productId/extras`

Query Parameters:
- `grouped` (boolean) - Return extras grouped by groupName

**Response (flat):**
```json
{
  "success": true,
  "data": {
    "productId": "uuid",
    "productName": "Nasi Goreng",
    "isCustomized": true,
    "extras": [
      {
        "id": "uuid",
        "name": "Extra Telur",
        "price": 5000,
        "inputType": "checkbox",
        "groupName": "Toppings",
        "isRequired": false,
        "isMultiple": true,
        "sortOrder": 1,
        "isActive": true
      }
    ]
  }
}
```

**Response (grouped):**
```json
{
  "success": true,
  "data": {
    "productId": "uuid",
    "productName": "Nasi Goreng",
    "isCustomized": true,
    "extras": {
      "Toppings": [
        {
          "id": "uuid",
          "name": "Extra Telur",
          "price": 5000,
          "priceFormatted": "+5,000",
          "inputType": "checkbox"
        }
      ],
      "Spice Level": [
        {
          "id": "uuid",
          "name": "Pedas Sedang",
          "price": 0,
          "priceFormatted": "+0",
          "inputType": "radio"
        }
      ]
    }
  }
}
```

### 2. Create Product Extra

**POST** `/api/v1/restaurant/products/:productId/extras`

**Request Body:**
```json
{
  "name": "Extra Telur",
  "price": 5000,
  "inputType": "checkbox",
  "groupName": "Toppings",
  "isRequired": false,
  "isMultiple": true,
  "sortOrder": 1,
  "isActive": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Product extra created successfully",
  "data": {
    "id": "uuid",
    "productId": "uuid",
    "name": "Extra Telur",
    "price": 5000,
    ...
  }
}
```

### 3. Bulk Create Extras

**POST** `/api/v1/restaurant/products/:productId/extras/bulk`

**Request Body:**
```json
{
  "extras": [
    {
      "name": "Extra Telur",
      "price": 5000,
      "inputType": "checkbox",
      "groupName": "Toppings"
    },
    {
      "name": "Extra Sambal",
      "price": 2000,
      "inputType": "checkbox",
      "groupName": "Toppings"
    },
    {
      "name": "Pedas Sedang",
      "price": 0,
      "inputType": "radio",
      "groupName": "Spice Level",
      "isRequired": true
    }
  ]
}
```

### 4. Update Product Extra

**PUT** `/api/v1/restaurant/products/:productId/extras/:extraId`

**Request Body:**
```json
{
  "name": "Extra Telur Mata Sapi",
  "price": 6000,
  "isActive": true
}
```

### 5. Delete Product Extra

**DELETE** `/api/v1/restaurant/products/:productId/extras/:extraId`

Soft delete. Jika semua extras sudah dihapus, `product.isCustomized` otomatis di-set ke `false`.

### 6. Get Extras by Group

**GET** `/api/v1/restaurant/products/:productId/extras/groups`

Alternative endpoint untuk mendapatkan extras yang sudah dikelompokkan.

## Integration dengan Order/POS

### Create Order dengan Extras

**POST** `/api/v1/restaurant/orders`

**Request Body:**
```json
{
  "orderType": "dine-in",
  "tableId": "uuid",
  "items": [
    {
      "productId": "uuid-nasi-goreng",
      "quantity": 2,
      "extras": [
        {
          "id": "uuid-extra-telur",
          "quantity": 1
        },
        {
          "id": "uuid-extra-sambal",
          "quantity": 1
        }
      ],
      "notes": "Pedas sedang"
    }
  ],
  "payments": []
}
```

### Price Calculation

```
Base Price: 25,000 (Nasi Goreng)
Extra Telur: +5,000
Extra Sambal: +2,000
-----------------------
Unit Price: 32,000
Quantity: 2
-----------------------
Item Total: 64,000
```

### Response TransactionItem

```json
{
  "itemName": "Nasi Goreng",
  "quantity": 2,
  "unitPrice": 32000,
  "subtotal": 64000,
  "itemDetails": {
    "basePrice": 25000,
    "extras": [
      {
        "id": "uuid",
        "name": "Extra Telur",
        "price": 5000,
        "quantity": 1,
        "groupName": "Toppings"
      },
      {
        "id": "uuid",
        "name": "Extra Sambal",
        "price": 2000,
        "quantity": 1,
        "groupName": "Toppings"
      }
    ],
    "extrasTotal": 7000
  }
}
```

## Frontend Implementation Guide

### 1. Product List Page (Admin)

```javascript
// Fetch products with extras
GET /api/v1/restaurant/products

// Display badge if product.isCustomized === true
{products.map(product => (
  <ProductCard>
    <h3>{product.name}</h3>
    {product.isCustomized && <Badge>Customizable</Badge>}
  </ProductCard>
))}
```

### 2. Product Detail/Edit Page (Admin)

```javascript
// Fetch product extras
const { data } = await axios.get(`/api/v1/restaurant/products/${productId}/extras?grouped=true`);

// Display extras management UI
<ExtrasList>
  {Object.entries(data.extras).map(([groupName, extras]) => (
    <ExtraGroup key={groupName}>
      <h4>{groupName}</h4>
      {extras.map(extra => (
        <ExtraItem key={extra.id}>
          {extra.name} - {extra.priceFormatted}
          <EditButton onClick={() => editExtra(extra)} />
          <DeleteButton onClick={() => deleteExtra(extra.id)} />
        </ExtraItem>
      ))}
    </ExtraGroup>
  ))}
</ExtrasList>

// Add new extra
<Button onClick={showAddExtraModal}>Add Extra</Button>
```

### 3. POS/Order Page (Frontend)

```javascript
// When customer selects a product
const handleProductSelect = async (product) => {
  if (product.isCustomized) {
    // Fetch extras
    const { data } = await axios.get(
      `/api/v1/restaurant/products/${product.id}/extras/groups`
    );
    
    // Show modal with extras selection
    showExtrasModal({
      product,
      extras: data.groups,
      onConfirm: (selectedExtras) => {
        addToCart({
          productId: product.id,
          quantity: 1,
          extras: selectedExtras // [{ id, quantity }]
        });
      }
    });
  } else {
    // Add to cart directly
    addToCart({ productId: product.id, quantity: 1 });
  }
};
```

### 4. Extras Modal Component

```jsx
function ExtrasModal({ product, extras, onConfirm, onClose }) {
  const [selectedExtras, setSelectedExtras] = useState([]);
  
  const handleExtraToggle = (extra, groupName, inputType) => {
    if (inputType === 'radio') {
      // Radio: replace selection in same group
      setSelectedExtras(prev => [
        ...prev.filter(e => e.groupName !== groupName),
        { id: extra.id, quantity: 1, groupName }
      ]);
    } else if (inputType === 'checkbox') {
      // Checkbox: toggle
      const exists = selectedExtras.find(e => e.id === extra.id);
      if (exists) {
        setSelectedExtras(prev => prev.filter(e => e.id !== extra.id));
      } else {
        setSelectedExtras(prev => [...prev, { id: extra.id, quantity: 1 }]);
      }
    }
  };
  
  const calculateTotal = () => {
    const extrasTotal = selectedExtras.reduce((sum, sel) => {
      const extra = findExtraById(sel.id);
      return sum + (extra.price * sel.quantity);
    }, 0);
    return product.price + extrasTotal;
  };
  
  return (
    <Modal>
      <h2>Customize {product.name}</h2>
      
      {Object.entries(extras).map(([groupName, groupExtras]) => {
        const firstExtra = groupExtras[0];
        const isRequired = firstExtra?.isRequired;
        const inputType = firstExtra?.inputType || 'checkbox';
        
        return (
          <ExtraGroup key={groupName}>
            <h3>
              {groupName} 
              {isRequired && <span className="required">*</span>}
            </h3>
            
            {groupExtras.map(extra => (
              <ExtraOption key={extra.id}>
                <input
                  type={inputType === 'radio' ? 'radio' : 'checkbox'}
                  name={groupName}
                  checked={selectedExtras.some(e => e.id === extra.id)}
                  onChange={() => handleExtraToggle(extra, groupName, inputType)}
                />
                <label>
                  {extra.name}
                  {extra.price > 0 && ` ${extra.priceFormatted}`}
                </label>
              </ExtraOption>
            ))}
          </ExtraGroup>
        );
      })}
      
      <TotalPrice>
        Total: Rp {calculateTotal().toLocaleString('id-ID')}
      </TotalPrice>
      
      <Button onClick={() => onConfirm(selectedExtras)}>
        Add to Cart
      </Button>
      <Button variant="secondary" onClick={onClose}>
        Cancel
      </Button>
    </Modal>
  );
}
```

## Model Methods

### ProductExtra Model

#### Instance Methods

```javascript
// Format for display
extra.formatForDisplay()
// Returns: { id, name, price, priceFormatted, inputType, ... }
```

#### Static Methods

```javascript
// Get grouped extras
const grouped = await ProductExtra.getGroupedExtras(productId, tenantId);
// Returns: { "Toppings": [...], "Spice Level": [...] }

// Validate selection
const validExtras = await ProductExtra.validateSelection(
  productId, 
  tenantId, 
  selectedExtras
);
// Throws error if required groups are missing

// Calculate total price
const total = ProductExtra.calculateTotalPrice(extras);
// Returns: number
```

## Permissions

All endpoints menggunakan Product permissions:
- **Read**: `authorizeCasl('read', 'Product')`
- **Create**: `authorizeCasl('create', 'Product')`
- **Update**: `authorizeCasl('update', 'Product')`
- **Delete**: `authorizeCasl('delete', 'Product')`

## Example Use Cases

### 1. Nasi Goreng dengan Toppings

```javascript
// Create product
POST /api/v1/restaurant/products
{
  "name": "Nasi Goreng",
  "price": 25000,
  "isCustomized": false // Will be auto-set to true when extras added
}

// Add extras
POST /api/v1/restaurant/products/{id}/extras/bulk
{
  "extras": [
    { "name": "Extra Telur", "price": 5000, "inputType": "checkbox", "groupName": "Toppings" },
    { "name": "Extra Ayam", "price": 8000, "inputType": "checkbox", "groupName": "Toppings" },
    { "name": "Extra Sambal", "price": 2000, "inputType": "checkbox", "groupName": "Toppings" }
  ]
}
```

### 2. Coffee dengan Size dan Sugar Level

```javascript
POST /api/v1/restaurant/products/{id}/extras/bulk
{
  "extras": [
    // Size (required, radio)
    { "name": "Small", "price": 0, "inputType": "radio", "groupName": "Size", "isRequired": true },
    { "name": "Medium", "price": 5000, "inputType": "radio", "groupName": "Size", "isRequired": true },
    { "name": "Large", "price": 10000, "inputType": "radio", "groupName": "Size", "isRequired": true },
    
    // Sugar Level (required, radio)
    { "name": "No Sugar", "price": 0, "inputType": "radio", "groupName": "Sugar Level", "isRequired": true },
    { "name": "Less Sugar", "price": 0, "inputType": "radio", "groupName": "Sugar Level", "isRequired": true },
    { "name": "Normal Sugar", "price": 0, "inputType": "radio", "groupName": "Sugar Level", "isRequired": true },
    
    // Add-ons (optional, checkbox)
    { "name": "Extra Shot", "price": 8000, "inputType": "checkbox", "groupName": "Add-ons" },
    { "name": "Whipped Cream", "price": 5000, "inputType": "checkbox", "groupName": "Add-ons" }
  ]
}
```

## Notes

- Extras price secara otomatis ditambahkan ke `unitPrice` item
- `itemDetails.basePrice` menyimpan harga original product
- `itemDetails.extras` menyimpan detail extras yang dipilih
- `itemDetails.extrasTotal` menyimpan total harga semua extras
- Product `isCustomized` otomatis di-update ketika extras ditambah/dihapus
- Soft delete untuk extras (tetap ada di database dengan `deletedAt`)
- Validation untuk required extras ada di model method
- Support untuk multiple quantity per extra (useful untuk "Extra Telur x2")

## Future Enhancements

- [ ] Max selection per group
- [ ] Min selection per group
- [ ] Conditional extras (show extra B only if extra A selected)
- [ ] Extra inventory tracking
- [ ] Extra image upload
- [ ] Pricing rules based on combination
- [ ] Templates untuk common extras combinations
- [ ] Analytics untuk popular extras
