# Kitchen & Bar Split Printing System

> **Last Updated**: February 18, 2026  
> **Version**: 1.0  
> **Status**: Implementation Guide

## Overview

Sistem untuk memisahkan print order berdasarkan kategori produk (makanan vs minuman) dan print ke printer yang berbeda secara otomatis.

### Key Features

✅ **Auto-split orders** berdasarkan product type (food/beverage)  
✅ **Multiple kitchen printers** - Kitchen printer untuk food, Bar printer untuk beverage  
✅ **Smart routing** - Sistem otomatis route items ke printer yang sesuai  
✅ **Printer fallback** - Jika bar printer tidak ada, print ke kitchen printer  
✅ **Configuration per tenant** - Setiap tenant bisa configure printer routing sendiri

---

## 1. Database Changes

### 1.1 Product Model - Add productType Field

**Migration**: Add `productType` field to Products table

```sql
ALTER TABLE "Products" 
ADD COLUMN "productType" VARCHAR(20) DEFAULT 'food' 
CHECK ("productType" IN ('food', 'beverage', 'other'));

COMMENT ON COLUMN "Products"."productType" IS 'Product type for printer routing: food → kitchen, beverage → bar';

-- Create index for filtering
CREATE INDEX idx_products_product_type ON "Products"("productType");
```

**Model Update** (`src/models/product.legacy.js`):

```javascript
productType: {
  type: DataTypes.ENUM('food', 'beverage', 'other'),
  allowNull: false,
  defaultValue: 'food',
  comment: 'Product type for kitchen/bar routing'
},
```

---

### 1.2 PrinterSettings Model - Add printerCategory Field

**Migration**: Add `printerCategory` field to PrinterSettings table

```sql
ALTER TABLE "PrinterSettings" 
ADD COLUMN "printerCategory" VARCHAR(20) DEFAULT 'all' 
CHECK ("printerCategory" IN ('all', 'food', 'beverage'));

COMMENT ON COLUMN "PrinterSettings"."printerCategory" IS 'What product categories this printer handles (all, food, beverage)';

CREATE INDEX idx_printer_settings_category ON "PrinterSettings"("printerCategory");
```

**Model Update** (`src/models/printerSettings.js`):

```javascript
printerCategory: {
  type: DataTypes.ENUM('all', 'food', 'beverage'),
  allowNull: false,
  defaultValue: 'all',
  comment: 'What product categories this printer handles'
},
```

---

## 2. Backend Implementation

### 2.1 Update receiptPrinterService - Split Print Function

**File**: `src/services/receiptPrinterService.js`

Add new function to split and print by category:

```javascript
/**
 * Get kitchen printer for specific product category
 * @param {object} tenant - Tenant object with settings
 * @param {string} category - Product category: 'food' | 'beverage'
 * @returns {object|null} Printer configuration
 */
const getKitchenPrinterByCategory = (tenant, category = 'food') => {
  const printers = tenant.settings?.printers || [];
  
  // First, find printer specific to this category
  let printer = printers.find(p => 
    p.printerType === 'kitchen' && 
    p.printerCategory === category &&
    p.isActive === true
  );
  
  // Fallback: Find printer that handles 'all' categories
  if (!printer) {
    printer = printers.find(p => 
      p.printerType === 'kitchen' && 
      p.printerCategory === 'all' &&
      p.isActive === true
    );
  }
  
  // Last fallback: Any active kitchen printer
  if (!printer) {
    printer = printers.find(p => 
      p.printerType === 'kitchen' && 
      p.isActive === true
    );
  }
  
  return printer;
};

/**
 * Print kitchen tickets split by product category (food/beverage)
 * @param {object} order - Order object
 * @param {array} items - Order items with product details
 * @param {object} tenant - Tenant object with settings
 * @returns {object} Print results per category
 */
const printKitchenTicketsSplit = async (order, items, tenant) => {
  try {
    // Group items by productType
    const foodItems = [];
    const beverageItems = [];
    const otherItems = [];
    
    items.forEach(item => {
      const productType = item.product?.productType || 'food';
      
      if (productType === 'food') {
        foodItems.push(item);
      } else if (productType === 'beverage') {
        beverageItems.push(item);
      } else {
        otherItems.push(item);
      }
    });
    
    const results = {
      food: null,
      beverage: null,
      other: null,
      success: false,
      errors: []
    };
    
    // Print food items to kitchen printer
    if (foodItems.length > 0) {
      try {
        const kitchenPrinter = getKitchenPrinterByCategory(tenant, 'food');
        
        if (kitchenPrinter) {
          results.food = await printKitchenTicketForCategory(
            order, 
            foodItems, 
            tenant, 
            kitchenPrinter,
            'KITCHEN'
          );
        } else {
          results.food = { 
            success: false, 
            message: 'No kitchen printer configured',
            skipped: true 
          };
        }
      } catch (error) {
        results.errors.push({ category: 'food', error: error.message });
        results.food = { success: false, message: error.message };
      }
    }
    
    // Print beverage items to bar printer
    if (beverageItems.length > 0) {
      try {
        const barPrinter = getKitchenPrinterByCategory(tenant, 'beverage');
        
        if (barPrinter) {
          // Add delay if food was printed to same printer
          if (results.food?.success && barPrinter.id === results.food.printerId) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
          results.beverage = await printKitchenTicketForCategory(
            order, 
            beverageItems, 
            tenant, 
            barPrinter,
            'BAR'
          );
        } else {
          results.beverage = { 
            success: false, 
            message: 'No bar printer configured',
            skipped: true 
          };
        }
      } catch (error) {
        results.errors.push({ category: 'beverage', error: error.message });
        results.beverage = { success: false, message: error.message };
      }
    }
    
    // Print other items to default kitchen printer
    if (otherItems.length > 0) {
      try {
        const printer = getKitchenPrinter(tenant);
        
        if (printer) {
          // Add delay if previous prints were sent to same printer
          if ((results.food?.success || results.beverage?.success) && 
              (printer.id === results.food?.printerId || printer.id === results.beverage?.printerId)) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
          results.other = await printKitchenTicketForCategory(
            order, 
            otherItems, 
            tenant, 
            printer,
            'KITCHEN'
          );
        }
      } catch (error) {
        results.errors.push({ category: 'other', error: error.message });
        results.other = { success: false, message: error.message };
      }
    }
    
    // Overall success if at least one print succeeded
    results.success = results.food?.success || results.beverage?.success || results.other?.success;
    
    logger.logInfo('Split kitchen tickets printed', {
      action: 'PRINT_KITCHEN_SPLIT',
      tenantId: tenant.id,
      orderId: order.id,
      foodItems: foodItems.length,
      beverageItems: beverageItems.length,
      otherItems: otherItems.length,
      results: {
        food: results.food?.success || false,
        beverage: results.beverage?.success || false,
        other: results.other?.success || false
      }
    });
    
    return results;
    
  } catch (error) {
    logger.logSecurity('Split kitchen print failed', {
      action: 'PRINT_KITCHEN_SPLIT_ERROR',
      tenantId: tenant.id,
      orderId: order?.id,
      error: error.message,
      stack: error.stack
    });
    
    return { 
      success: false, 
      message: error.message, 
      error: true,
      errors: [error.message]
    };
  }
};

/**
 * Print kitchen ticket for specific category
 * @param {object} order - Order object
 * @param {array} items - Filtered items for this category
 * @param {object} tenant - Tenant object
 * @param {object} printer - Printer configuration
 * @param {string} headerLabel - Header label (KITCHEN/BAR)
 * @returns {object} Print result
 */
const printKitchenTicketForCategory = async (order, items, tenant, printer, headerLabel = 'KITCHEN') => {
  try {
    if (printer.connectionType !== 'network') {
      return { success: false, message: 'Only network printers are supported', skipped: true };
    }
    
    // Get template from tenant settings
    const templates = tenant.settings?.receiptTemplates || {};
    const template = templates.kitchen || getDefaultKitchenTicketTemplate();
    
    // Override header text with category-specific label
    const categoryTemplate = {
      ...template,
      header: {
        ...template.header,
        customHeaderText: `=== ${headerLabel} ===`
      }
    };
    
    const ticketContent = buildKitchenTicket(order, items, tenant, categoryTemplate);
    
    // Create print job record
    let printJob;
    try {
      printJob = await PrintJob.create({
        tenantId: tenant.id,
        printerId: printer.id,
        jobType: 'kitchen',
        printData: ticketContent,
        status: 'pending',
        metadata: {
          orderId: order.id,
          orderNumber: order.transactionNumber,
          itemCount: items.length,
          printerName: printer.name,
          category: headerLabel.toLowerCase()
        }
      });
      
      logger.logInfo(`PrintJob created for ${headerLabel}`, {
        action: 'PRINT_JOB_CREATED',
        printJobId: printJob.id,
        orderId: order.id,
        printerId: printer.id,
        category: headerLabel,
        tenantId: tenant.id
      });
    } catch (jobError) {
      logger.logSecurity('Failed to create PrintJob', {
        action: 'PRINT_JOB_CREATE_ERROR',
        error: jobError.message,
        orderId: order.id,
        printerId: printer.id,
        category: headerLabel,
        tenantId: tenant.id
      });
      printJob = null;
    }
    
    try {
      const result = await sendToPrinter(
        printer.ipAddress,
        printer.port || 9100,
        ticketContent
      );
      
      // Mark as completed if job was created
      if (printJob) {
        await printJob.update({ 
          status: 'completed',
          completedAt: new Date()
        });
      }
      
      logger.logInfo(`${headerLabel} ticket printed`, {
        action: `PRINT_${headerLabel}_SUCCESS`,
        tenantId: tenant.id,
        orderId: order.id,
        printerId: printer.id,
        printJobId: printJob?.id
      });
      
      return { 
        ...result, 
        printJobId: printJob?.id,
        printerId: printer.id,
        category: headerLabel.toLowerCase()
      };
    } catch (printError) {
      // Mark as failed if job was created
      if (printJob) {
        await printJob.update({ 
          status: 'failed',
          errorMessage: printError.message,
          completedAt: new Date()
        });
      }
      throw printError;
    }
  } catch (error) {
    logger.logSecurity(`${headerLabel} ticket print failed`, {
      action: `PRINT_${headerLabel}_ERROR`,
      tenantId: tenant.id,
      orderId: order?.id,
      error: error.message
    });
    
    return { success: false, message: error.message, error: true };
  }
};

// Export new functions
module.exports = {
  // ... existing exports
  printKitchenTicketsSplit,
  getKitchenPrinterByCategory,
  printKitchenTicketForCategory
};
```

---

### 2.2 Update orderController - Use Split Print

**File**: `src/modules/restaurant/controllers/orderController.js`

Replace the single `printKitchenTicket` call with `printKitchenTicketsSplit`:

```javascript
// Around line 673
if (autoPrintKitchen && createdOrder.items?.length > 0) {
  try {
    // Use split printing instead of single kitchen print
    kitchenPrintResult = await receiptPrinterService.printKitchenTicketsSplit(
      createdOrder,
      createdOrder.items,
      tenant
    );
    
    logger.logInfo('Kitchen tickets printed (split)', {
      action: 'PRINT_KITCHEN_SPLIT_SUCCESS',
      orderId: createdOrder.id,
      results: {
        food: kitchenPrintResult.food?.success || false,
        beverage: kitchenPrintResult.beverage?.success || false,
        overall: kitchenPrintResult.success
      },
      tenantId
    });
  } catch (printErr) {
    logger.logSecurity('Kitchen split print failed', {
      action: 'PRINT_KITCHEN_SPLIT_ERROR',
      error: printErr.message,
      orderId: createdOrder.id,
      tenantId
    });
  }
}
```

---

## 3. API Endpoints

### 3.1 Update Product - Set Product Type

**Endpoint**: `PUT /api/v1/products/:id`

**Request Body**:
```json
{
  "name": "Espresso",
  "productType": "beverage",
  "category": "Coffee",
  "price": 25000
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid-product-id",
    "name": "Espresso",
    "productType": "beverage",
    "category": "Coffee",
    "price": 25000
  }
}
```

**Product Types**:
- `food` - Goes to kitchen printer
- `beverage` - Goes to bar printer
- `other` - Goes to default kitchen printer

---

### 3.2 Create/Update Printer - Set Printer Category

**Endpoint**: `POST /api/v1/system/printers`

**Create Bar Printer**:
```json
{
  "name": "Bar Printer",
  "printerType": "kitchen",
  "printerCategory": "beverage",
  "connectionType": "network",
  "ipAddress": "192.168.1.102",
  "port": 9100,
  "isActive": true
}
```

**Create Kitchen Printer**:
```json
{
  "name": "Kitchen Printer",
  "printerType": "kitchen",
  "printerCategory": "food",
  "connectionType": "network",
  "ipAddress": "192.168.1.101",
  "port": 9100,
  "isActive": true
}
```

**Create All-in-One Printer** (handles both):
```json
{
  "name": "Main Kitchen Printer",
  "printerType": "kitchen",
  "printerCategory": "all",
  "connectionType": "network",
  "ipAddress": "192.168.1.100",
  "port": 9100,
  "isActive": true
}
```

**Endpoint**: `PUT /api/v1/system/printers/:id`

**Update Printer Category**:
```json
{
  "printerCategory": "beverage"
}
```

---

### 3.3 Get Printer Configuration

**Endpoint**: `GET /api/v1/system/printers`

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-printer-1",
      "name": "Kitchen Printer",
      "printerType": "kitchen",
      "printerCategory": "food",
      "connectionType": "network",
      "ipAddress": "192.168.1.101",
      "isActive": true
    },
    {
      "id": "uuid-printer-2",
      "name": "Bar Printer",
      "printerType": "kitchen",
      "printerCategory": "beverage",
      "connectionType": "network",
      "ipAddress": "192.168.1.102",
      "isActive": true
    }
  ]
}
```

---

## 4. Frontend Integration

### 4.1 Product Management - Set Product Type

```javascript
// Product Form Component
function ProductForm({ product, onSubmit }) {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    productType: product?.productType || 'food',
    category: product?.category || '',
    price: product?.price || 0
  });
  
  const productTypes = [
    { value: 'food', label: 'Food (Kitchen)', icon: '🍽️' },
    { value: 'beverage', label: 'Beverage (Bar)', icon: '☕' },
    { value: 'other', label: 'Other', icon: '📦' }
  ];
  
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      onSubmit(formData);
    }}>
      <div className="form-group">
        <label>Product Name</label>
        <input 
          type="text" 
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
        />
      </div>
      
      <div className="form-group">
        <label>Product Type (for printing)</label>
        <div className="product-type-selector">
          {productTypes.map(type => (
            <div 
              key={type.value}
              className={`product-type-card ${formData.productType === type.value ? 'active' : ''}`}
              onClick={() => setFormData({...formData, productType: type.value})}
            >
              <span className="icon">{type.icon}</span>
              <span className="label">{type.label}</span>
            </div>
          ))}
        </div>
        <small className="help-text">
          Food items print to kitchen, beverages print to bar
        </small>
      </div>
      
      <div className="form-group">
        <label>Category</label>
        <input 
          type="text" 
          value={formData.category}
          onChange={(e) => setFormData({...formData, category: e.target.value})}
          placeholder="e.g., Coffee, Main Course, Dessert"
        />
      </div>
      
      <div className="form-group">
        <label>Price</label>
        <input 
          type="number" 
          value={formData.price}
          onChange={(e) => setFormData({...formData, price: e.target.value})}
        />
      </div>
      
      <button type="submit">Save Product</button>
    </form>
  );
}
```

---

### 4.2 Printer Settings - Configure Printer Category

```javascript
// Printer Settings Component
function PrinterSettingsForm({ printer, onSubmit }) {
  const [formData, setFormData] = useState({
    name: printer?.name || '',
    printerType: printer?.printerType || 'kitchen',
    printerCategory: printer?.printerCategory || 'all',
    connectionType: printer?.connectionType || 'network',
    ipAddress: printer?.ipAddress || '',
    port: printer?.port || 9100,
    isActive: printer?.isActive ?? true
  });
  
  const printerCategories = [
    { 
      value: 'all', 
      label: 'All Items', 
      description: 'Prints both food and beverage orders',
      icon: '🖨️' 
    },
    { 
      value: 'food', 
      label: 'Kitchen (Food Only)', 
      description: 'Only prints food items',
      icon: '🍽️' 
    },
    { 
      value: 'beverage', 
      label: 'Bar (Beverage Only)', 
      description: 'Only prints beverage items',
      icon: '☕' 
    }
  ];
  
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      onSubmit(formData);
    }}>
      <div className="form-group">
        <label>Printer Name</label>
        <input 
          type="text" 
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
          placeholder="e.g., Main Kitchen Printer, Bar Printer"
        />
      </div>
      
      <div className="form-group">
        <label>Printer Type</label>
        <select 
          value={formData.printerType}
          onChange={(e) => setFormData({...formData, printerType: e.target.value})}
        >
          <option value="receipt">Receipt Printer</option>
          <option value="kitchen">Kitchen/Bar Printer</option>
          <option value="label">Label Printer</option>
        </select>
      </div>
      
      {formData.printerType === 'kitchen' && (
        <div className="form-group">
          <label>Printer Category</label>
          <div className="printer-category-selector">
            {printerCategories.map(category => (
              <div 
                key={category.value}
                className={`category-card ${formData.printerCategory === category.value ? 'active' : ''}`}
                onClick={() => setFormData({...formData, printerCategory: category.value})}
              >
                <div className="category-icon">{category.icon}</div>
                <div className="category-info">
                  <div className="category-label">{category.label}</div>
                  <div className="category-description">{category.description}</div>
                </div>
                <div className="category-check">
                  {formData.printerCategory === category.value && '✓'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="form-group">
        <label>Connection Type</label>
        <select 
          value={formData.connectionType}
          onChange={(e) => setFormData({...formData, connectionType: e.target.value})}
        >
          <option value="network">Network (IP)</option>
          <option value="usb">USB</option>
          <option value="bluetooth">Bluetooth</option>
        </select>
      </div>
      
      {formData.connectionType === 'network' && (
        <>
          <div className="form-group">
            <label>IP Address</label>
            <input 
              type="text" 
              value={formData.ipAddress}
              onChange={(e) => setFormData({...formData, ipAddress: e.target.value})}
              placeholder="192.168.1.100"
            />
          </div>
          
          <div className="form-group">
            <label>Port</label>
            <input 
              type="number" 
              value={formData.port}
              onChange={(e) => setFormData({...formData, port: e.target.value})}
            />
          </div>
        </>
      )}
      
      <div className="form-group">
        <label>
          <input 
            type="checkbox" 
            checked={formData.isActive}
            onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
          />
          Active
        </label>
      </div>
      
      <button type="submit">Save Printer</button>
    </form>
  );
}
```

---

### 4.3 Order Display - Show Split Print Status

```javascript
// Order Details Component
function OrderPrintStatus({ order }) {
  const [printStatus, setPrintStatus] = useState(null);
  
  useEffect(() => {
    // Get print status from order metadata or separate API call
    if (order.printResults) {
      setPrintStatus(order.printResults);
    }
  }, [order]);
  
  if (!printStatus) return null;
  
  return (
    <div className="print-status-section">
      <h4>Print Status</h4>
      
      <div className="print-status-grid">
        {printStatus.food && (
          <div className={`print-status-card ${printStatus.food.success ? 'success' : 'failed'}`}>
            <div className="status-icon">🍽️</div>
            <div className="status-info">
              <div className="status-label">Kitchen (Food)</div>
              <div className="status-value">
                {printStatus.food.success ? '✓ Printed' : '✗ Failed'}
              </div>
              {printStatus.food.itemCount && (
                <div className="status-detail">{printStatus.food.itemCount} items</div>
              )}
            </div>
          </div>
        )}
        
        {printStatus.beverage && (
          <div className={`print-status-card ${printStatus.beverage.success ? 'success' : 'failed'}`}>
            <div className="status-icon">☕</div>
            <div className="status-info">
              <div className="status-label">Bar (Beverage)</div>
              <div className="status-value">
                {printStatus.beverage.success ? '✓ Printed' : '✗ Failed'}
              </div>
              {printStatus.beverage.itemCount && (
                <div className="status-detail">{printStatus.beverage.itemCount} items</div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {printStatus.errors?.length > 0 && (
        <div className="print-errors">
          <strong>Print Errors:</strong>
          <ul>
            {printStatus.errors.map((err, idx) => (
              <li key={idx}>{err.category}: {err.error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

---

## 5. Configuration Scenarios

### Scenario 1: Separate Kitchen & Bar Printers

**Setup**:
- Kitchen Printer (192.168.1.101) → `printerCategory: 'food'`
- Bar Printer (192.168.1.102) → `printerCategory: 'beverage'`

**Result**:
- Food items (productType: 'food') → Prints to Kitchen Printer
- Beverage items (productType: 'beverage') → Prints to Bar Printer

---

### Scenario 2: Single Printer for All

**Setup**:
- Main Printer (192.168.1.100) → `printerCategory: 'all'`

**Result**:
- All items print to Main Printer
- Food and beverage on same ticket (or separate tickets if preferred)

---

### Scenario 3: Bar Printer + Fallback Kitchen

**Setup**:
- Kitchen Printer (192.168.1.101) → `printerCategory: 'all'` (fallback)
- Bar Printer (192.168.1.102) → `printerCategory: 'beverage'`

**Result**:
- Food items → Prints to Kitchen Printer (only one that can handle food)
- Beverage items → Prints to Bar Printer
- If Bar Printer fails → Falls back to Kitchen Printer

---

### Scenario 4: Kitchen + Cashier Printer (Cashier handles Bar)

**Setup** (Kasus umum: 2 printer, kasir handle bar):
```json
[
  {
    "name": "Kitchen Printer",
    "printerType": "kitchen",
    "printerCategory": "food",
    "ipAddress": "192.168.1.101"
  },
  {
    "name": "Cashier Printer",
    "printerType": "kitchen",
    "printerCategory": "beverage",
    "ipAddress": "192.168.1.200"
  }
]
```

**Alternative Setup** (1 printer kasir untuk Receipt + Bar):

Jika ingin 1 printer kasir untuk receipt customer DAN bar orders, create 2 printer entries dengan IP yang sama:

```json
[
  {
    "id": "printer-kitchen",
    "name": "Kitchen Printer",
    "printerType": "kitchen",
    "printerCategory": "food",
    "ipAddress": "192.168.1.101",
    "isActive": true
  },
  {
    "id": "printer-receipt",
    "name": "Cashier Printer (Receipt)",
    "printerType": "receipt",
    "printerCategory": "all",
    "ipAddress": "192.168.1.200",
    "isDefault": true,
    "isActive": true
  },
  {
    "id": "printer-bar",
    "name": "Cashier Printer (Bar Orders)",
    "printerType": "kitchen",
    "printerCategory": "beverage",
    "ipAddress": "192.168.1.200",
    "isActive": true
  }
]
```

**Result**:
- Food orders → Print to Kitchen Printer
- Beverage orders → Print to Cashier Printer (as bar ticket)
- Customer receipt → Print to Cashier Printer (as receipt)
- Same physical printer di kasir, tapi 2 fungsi berbeda

**Advantages**:
- ✅ Kasir bisa monitor bar orders langsung
- ✅ Efisien untuk lokasi kecil (tidak perlu printer terpisah untuk bar)
- ✅ Printer kasir bisa print receipt DAN kitchen tickets
- ✅ System tetap track print jobs terpisah

**Notes**:
- Karena IP sama, system akan auto-add delay 1 detik antar print
- Pastikan printer kasir bisa handle high volume (food receipt + beverage tickets)
- Bisa tambahkan `port` berbeda jika kasir punya multiple print queues

**Setup via API** (Alternative Setup - 3 printers):

```javascript
// Frontend code untuk setup 3 printer entries
const setupPrintersForScenario4 = async () => {
  const baseURL = '/api/v1/system/printers';
  
  // 1. Create Kitchen Printer (Food)
  await fetch(baseURL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: "Kitchen Printer",
      printerType: "kitchen",
      printerCategory: "food",
      connectionType: "network",
      ipAddress: "192.168.1.101",
      port: 9100,
      isActive: true
    })
  });
  
  // 2. Create Cashier Printer (Receipt)
  await fetch(baseURL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: "Cashier Printer (Receipt)",
      printerType: "receipt",
      printerCategory: "all",
      connectionType: "network",
      ipAddress: "192.168.1.200",
      port: 9100,
      isDefault: true,
      isActive: true
    })
  });
  
  // 3. Create Cashier Printer (Bar Orders) - SAME IP
  await fetch(baseURL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: "Cashier Printer (Bar Orders)",
      printerType: "kitchen",
      printerCategory: "beverage",
      connectionType: "network",
      ipAddress: "192.168.1.200",  // ← Same as receipt printer
      port: 9100,
      isActive: true
    })
  });
  
  console.log('Scenario 4 setup complete');
};
```

**Testing**:
```javascript
// Test print routing
const testOrder = {
  items: [
    { name: "Nasi Goreng", productType: "food" },      // → Kitchen (192.168.1.101)
    { name: "Es Teh Manis", productType: "beverage" }, // → Cashier (192.168.1.200)
    { name: "Cappuccino", productType: "beverage" }    // → Cashier (192.168.1.200)
  ]
};

// Result:
// Kitchen Printer: 1 ticket dengan "=== KITCHEN ===" (Nasi Goreng)
// Cashier Printer: 1 ticket dengan "=== BAR ===" (Es Teh + Cappuccino)
// Customer receipt: Printer via separate API call
```

---

### Scenario 5: Multiple Kitchens (Future Enhancement)

**Setup**:
- Hot Kitchen (192.168.1.101) → `printerCategory: 'food'` + `metadata: { station: 'hot' }`
- Cold Kitchen (192.168.1.102) → `printerCategory: 'food'` + `metadata: { station: 'cold' }`
- Bar (192.168.1.103) → `printerCategory: 'beverage'`

**Enhancement Needed**:
- Add `station` field to Product model
- Update routing logic to check both `productType` and `station`

---

## 6. Cash Drawer Integration

### Overview

Cash drawer terhubung ke **receipt printer** dan dibuka dengan ESC/POS command khusus. System mendukung 2 pin configuration (Pin 2 atau Pin 5, tergantung jenis cash drawer).

### 6.1 Printer Configuration

**Enable Cash Drawer** di Printer Settings:

```json
{
  "name": "Cashier Printer",
  "printerType": "receipt",
  "connectionType": "network",
  "ipAddress": "192.168.1.200",
  "port": 9100,
  "isActive": true,
  "isDefault": true,
  "openCashDrawer": true,      // ← Enable cash drawer
  "cashDrawerPin": 0,           // ← 0 = Pin 2 (default), 1 = Pin 5
  "autoCut": true
}
```

**Field Descriptions**:
- `openCashDrawer` (boolean): Enable/disable cash drawer functionality
- `cashDrawerPin` (integer): 
  - `0` = Pin 2 (most common, RJ11/RJ12 connector)
  - `1` = Pin 5 (some cash drawers)
  - Check cash drawer manual untuk pin yang benar

**How to determine correct pin**:
1. Check cash drawer documentation
2. Most Epson-compatible drawers use **Pin 2** (cashDrawerPin: 0)
3. Some Star Micronics drawers use **Pin 5** (cashDrawerPin: 1)
4. Test dengan send command manual untuk verify

---

### 6.2 API Endpoint

**Open Cash Drawer Manually**:

```javascript
POST /api/v1/restaurant/orders/drawer/open
```

**Request**:
```javascript
// No body required - uses tenant's default receipt printer
fetch('/api/v1/restaurant/orders/drawer/open', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  }
})
```

**Response Success**:
```json
{
  "success": true,
  "message": "Cash drawer opened"
}
```

**Response Error**:
```json
{
  "success": false,
  "message": "Cash drawer disabled for this printer"
}
```

**Common Error Messages**:
- `"No receipt printer configured"` - Belum ada printer receipt di tenant settings
- `"Cash drawer only supported for network printers"` - Printer type bukan network (USB/Bluetooth tidak support)
- `"Cash drawer disabled for this printer"` - Field `openCashDrawer` set ke `false`
- `"Printer connection timeout"` - Printer tidak bisa diakses (check IP/port/network)

---

### 6.3 Frontend Integration

**React Component Example**:

```javascript
import React, { useState } from 'react';
import { Button, message } from 'antd';
import { DollarOutlined } from '@ant-design/icons';

function CashDrawerButton() {
  const [loading, setLoading] = useState(false);

  const handleOpenDrawer = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/v1/restaurant/orders/drawer/open', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        message.success('Cash drawer opened successfully');
      } else {
        message.error(data.message || 'Failed to open cash drawer');
      }
    } catch (error) {
      message.error('Error opening cash drawer: ' + error.message);
      console.error('Cash drawer error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="default"
      icon={<DollarOutlined />}
      onClick={handleOpenDrawer}
      loading={loading}
      size="large"
    >
      Open Cash Drawer
    </Button>
  );
}

export default CashDrawerButton;
```

**Placement Recommendations**:
- ✅ POS screen - Top toolbar atau quick access di kasir
- ✅ Order complete modal - Jika customer minta struk fisik
- ✅ Cash management screen - Untuk ambil uang tanpa transaksi

---

### 6.4 Auto-Open on Cash Payment

System secara **otomatis membuka cash drawer** saat:
1. Order dibuat dengan payment method = 'cash'
2. Receipt berhasil di-print
3. Printer setting `openCashDrawer` = `true`

**Code Flow** (sudah implemented di backend):

```javascript
// src/modules/restaurant/controllers/orderController.js

// After successful receipt print
if (receiptPrintResult?.success) {
  const hasCashPayment = payments.some(p => p.method === 'cash');
  if (hasCashPayment) {
    // Auto-open cash drawer after 500ms delay
    await new Promise(resolve => setTimeout(resolve, 500));
    await receiptPrinterService.openCashDrawer(tenant);
  }
}
```

**Disable Auto-Open**:
- Set `openCashDrawer: false` di printer settings
- Useful untuk testing atau jika drawer tidak ada

---

### 6.5 Printer Settings UI Example

**Add Cash Drawer Fields** ke Printer Form:

```javascript
// Printer settings form
<Form.Item label="Enable Cash Drawer" name="openCashDrawer" valuePropName="checked">
  <Switch 
    checkedChildren="Enabled" 
    unCheckedChildren="Disabled"
  />
</Form.Item>

{form.getFieldValue('openCashDrawer') && (
  <Form.Item 
    label="Cash Drawer Pin" 
    name="cashDrawerPin"
    tooltip="Check your cash drawer manual. Most use Pin 2 (0)"
  >
    <Radio.Group>
      <Radio value={0}>Pin 2 (Default, most common)</Radio>
      <Radio value={1}>Pin 5 (Some Star printers)</Radio>
    </Radio.Group>
  </Form.Item>
)}
```

**Validation**:
```javascript
const onFinish = (values) => {
  // Validate cash drawer settings
  if (values.openCashDrawer && values.printerType !== 'receipt') {
    message.warning('Cash drawer only works with receipt printers');
    return;
  }
  
  if (values.openCashDrawer && values.connectionType !== 'network') {
    message.warning('Cash drawer requires network printer');
    return;
  }
  
  // Submit form...
};
```

---

### 6.6 Testing Cash Drawer

**Manual Test Steps**:

1. **Configure Printer** via API atau UI:
   ```json
   {
     "name": "Test Receipt Printer",
     "printerType": "receipt",
     "connectionType": "network",
     "ipAddress": "192.168.1.200",
     "openCashDrawer": true,
     "cashDrawerPin": 0
   }
   ```

2. **Test Open Drawer** via API:
   ```bash
   curl -X POST http://localhost:8000/api/v1/restaurant/orders/drawer/open \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json"
   ```

3. **Check Logs** untuk troubleshooting:
   ```bash
   tail -f logs/combined.log | grep CASH_DRAWER
   ```

**Expected Log Output**:
```json
{
  "level": "info",
  "action": "OPEN_CASH_DRAWER_SUCCESS",
  "tenantId": "uuid",
  "printerId": "uuid",
  "printerName": "Cashier Printer",
  "cashDrawerPin": 0,
  "timestamp": "2026-02-18T10:30:00.000Z"
}
```

**Troubleshooting**:

| Error | Cause | Solution |
|-------|-------|----------|
| `OPEN_CASH_DRAWER_NO_PRINTER` | No receipt printer configured | Add receipt printer di settings |
| `OPEN_CASH_DRAWER_NON_NETWORK` | Printer type bukan network | Change ke network printer atau gunakan manual open |
| `OPEN_CASH_DRAWER_DISABLED` | openCashDrawer = false | Enable di printer settings |
| `Printer connection timeout` | Network issue atau IP salah | Verify IP address dan network connectivity |
| Drawer tidak buka tapi success | Wrong pin configuration | Try ubah cashDrawerPin dari 0→1 atau 1→0 |

**ESC/POS Commands Used**:
- Pin 2 (default): `\x1B\x70\x00\x19\xFA` (ESC p 0 25 250)
- Pin 5: `\x1B\x70\x01\x19\xFA` (ESC p 1 25 250)

---

## 7. Migration Steps

### Step 1: Database Migration

```bash
# Create migration file
npx sequelize-cli migration:generate --name add-product-type-and-printer-category

# Edit migration file to add columns
# Run migration
npm run db:dev:migrate
```

### Step 2: Update Existing Data

```sql
-- Set default productType for existing products based on category
UPDATE "Products" 
SET "productType" = 'beverage'
WHERE LOWER("category") IN ('drink', 'beverage', 'coffee', 'tea', 'juice', 'soda');

UPDATE "Products" 
SET "productType" = 'food'
WHERE "productType" IS NULL;

-- Set default printerCategory for existing kitchen printers
UPDATE "PrinterSettings"
SET "printerCategory" = 'all'
WHERE "printerType" = 'kitchen' AND "printerCategory" IS NULL;
```

### Step 3: Deploy Backend Changes

```bash
# Deploy updated services and controllers
git pull
npm install
pm2 restart gym-api
```

### Step 4: Update Printer Settings via API

```bash
# Update kitchen printer
curl -X PUT http://localhost:5500/api/v1/system/printers/{kitchen-printer-id} \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"printerCategory": "food"}'

# Update bar printer
curl -X PUT http://localhost:5500/api/v1/system/printers/{bar-printer-id} \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"printerCategory": "beverage"}'
```

### Step 5: Update Products via Bulk Upload

Create CSV with productType column:
```csv
id,name,category,productType,price
uuid-1,Nasi Goreng,Main Course,food,25000
uuid-2,Espresso,Coffee,beverage,20000
uuid-3,Cappuccino,Coffee,beverage,25000
uuid-4,Chicken Satay,Appetizer,food,30000
```

Upload via API: `POST /api/v1/products/bulk-upload`

### Step 6: Dynasty Menu Seeders

**Both Dynasty menu seeder scripts have been updated** to automatically set `productType`:

**Updated Scripts**:
- `scripts/importDynastyMenu.js` - Basic menu import
- `scripts/importDynastyMenuWithVariants.js` - Menu with variants & extras

**Auto-detection Logic**:
The scripts automatically categorize products based on category names:

```javascript
function determineProductType(categoryName) {
  const beverageCategories = [
    'coffee', 'tea', 'juice', 'drink', 'beverage', 
    'beer', 'wine', 'cocktail', 'mocktail', 'smoothie',
    'soda', 'soft drink', 'milkshake', 'frappe', 'latte'
  ];
  
  const categoryLower = categoryName.toLowerCase();
  const isBeverage = beverageCategories.some(keyword => 
    categoryLower.includes(keyword)
  );
  
  return isBeverage ? 'beverage' : 'food';
}
```

**Usage**:
```bash
# Import Dynasty menu with auto product type detection
node scripts/importDynastyMenuWithVariants.js <tenantId>

# Example
node scripts/importDynastyMenuWithVariants.js 3151f7b8-b34c-4abc-8cf2-db4e9a5202e7
```

**Output**:
```
✅ Created: Espresso (productType: beverage)
✅ Created: Nasi Goreng (productType: food)
✅ Created: Green Tea (productType: beverage)
✅ Created: Chicken Satay (productType: food)
```

---

## 7. Testing Checklist

### Backend Testing

- [ ] Create order with only food items → Prints to kitchen only
- [ ] Create order with only beverage items → Prints to bar only
- [ ] Create order with mixed items → Prints separately to kitchen & bar
- [ ] Test with no bar printer configured → Beverage prints to kitchen
- [ ] Test with printer offline → Logs error, order still created
- [ ] Test printer fallback logic
- [ ] Verify print job records created in database
- [ ] Check logs for split print events

### Frontend Testing

- [ ] Product form shows productType selector
- [ ] Product type saved correctly
- [ ] Printer settings shows printerCategory selector
- [ ] Printer category saved correctly
- [ ] Order details shows split print status
- [ ] Print status updates correctly
- [ ] Error messages display properly

### Integration Testing

- [ ] Create test order with 2 food + 2 beverage items
- [ ] Verify 2 separate tickets printed
- [ ] Check kitchen ticket contains only food items
- [ ] Check bar ticket contains only beverage items
- [ ] Verify headers show "KITCHEN" vs "BAR"
- [ ] Test with different printer scenarios

---

## 8. Troubleshooting

### Issue 1: All items printing to single printer

**Cause**: `printerCategory` not set or all printers set to `'all'`

**Solution**: 
```sql
-- Check printer categories
SELECT id, name, "printerType", "printerCategory", "isActive" 
FROM "PrinterSettings" 
WHERE "printerType" = 'kitchen';

-- Update specific printer
UPDATE "PrinterSettings" 
SET "printerCategory" = 'beverage' 
WHERE name = 'Bar Printer';
```

---

### Issue 2: Beverage items not printing

**Cause**: No bar printer configured or products not marked as beverage

**Solution**:
```sql
-- Check products
SELECT id, name, "productType", category 
FROM "Products" 
WHERE "productType" = 'beverage';

-- Update products
UPDATE "Products" 
SET "productType" = 'beverage' 
WHERE LOWER(category) LIKE '%drink%' 
   OR LOWER(category) LIKE '%coffee%'
   OR LOWER(name) LIKE '%juice%';
```

---

### Issue 3: Duplicate prints

**Cause**: Multiple printers with overlapping categories

**Solution**: Ensure only one printer per category or set proper priority

---

### Issue 4: Print delay between tickets

**Expected**: System adds 1 second delay between prints to same printer

**If too slow**: Adjust delay in code (currently 1000ms)

---

## 9. Future Enhancements

### 9.1 Station-based Routing

Add `station` field to products for finer control:
- Hot Kitchen
- Cold Kitchen
- Grill Station
- Bar
- Dessert Station

### 9.2 Priority Printing

Add priority levels:
- High: Drinks (fast prep)
- Medium: Appetizers
- Low: Main courses

### 9.3 Print Consolidation

Group multiple orders to same station before printing to reduce paper usage.

### 9.4 Printer Load Balancing

If multiple printers for same category, distribute load evenly.

### 9.5 Re-print Function

Allow re-printing specific categories if ticket was lost.

---

## 10. Support

For issues or questions:
- Check backend logs: `logs/error.log`
- Check print job records: `SELECT * FROM "PrintJobs" WHERE status = 'failed'`
- Verify printer connectivity: `ping {printer-ip}`
- Test printer directly: Use printer test page

**API Documentation**: See `/docs/postman/Printer Settings.postman_collection.json`

**Backend Developer**: [Your contact]

---

**End of Documentation**
