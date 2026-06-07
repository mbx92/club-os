# FASE 3: THERMAL PRINTING
## Integrasi Printer Thermal Epson TM-T82X

**Status**: 📋 Planning  
**Prioritas**: 🟡 Medium  
**Estimasi**: 2 minggu  
**Dependencies**: Fase 2 (POS & Restaurant Module)

---

## 🎯 Tujuan Fase Ini

Mengimplementasikan sistem **thermal printing** untuk:

1. **Auto-print struk** setelah transaksi disimpan
2. **Direct printing** ke printer Epson TM-T82X via TCP/IP
3. **Device management** - Konfigurasi printer per tenant/location/station
4. **Template management** - Custom receipt templates per tenant
5. **Print queue** - Antrian cetak dengan retry mechanism
6. **Error handling** - Robust error handling untuk offline printer

---

## 📊 Database Schema

### 1. Model `PrinterDevice` (NEW)

```javascript
// models/printerDevice.js
PrinterDevice.init({
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  tenantId: { type: DataTypes.UUID, allowNull: false },
  locationId: { type: DataTypes.UUID },  // Optional: printer per location
  
  // Device Info
  name: { type: DataTypes.STRING, allowNull: false },  // e.g., "POS Station 1", "Kitchen Printer"
  deviceType: {
    type: DataTypes.ENUM('pos', 'kitchen', 'backup'),
    defaultValue: 'pos'
  },
  
  // Connection
  connectionType: {
    type: DataTypes.ENUM('network', 'usb', 'bluetooth'),
    defaultValue: 'network'
  },
  ipAddress: DataTypes.STRING,     // For network printer
  port: { type: DataTypes.INTEGER, defaultValue: 9100 },  // Epson TM-T82X default port
  
  // Printer Model
  printerModel: {
    type: DataTypes.ENUM('epson-tm-t82x', 'epson-tm-t88v', 'other'),
    defaultValue: 'epson-tm-t82x'
  },
  
  // Settings
  paperWidth: { type: DataTypes.INTEGER, defaultValue: 80 },  // mm (80mm or 58mm)
  characterSet: { type: DataTypes.STRING, defaultValue: 'PC437' },
  encoding: { type: DataTypes.STRING, defaultValue: 'utf8' },
  
  // Auto-print Settings
  autoPrint: { type: DataTypes.BOOLEAN, defaultValue: true },
  printOnSave: { type: DataTypes.BOOLEAN, defaultValue: true },
  
  // Status
  isOnline: { type: DataTypes.BOOLEAN, defaultValue: false },
  lastPingAt: DataTypes.DATE,
  lastErrorAt: DataTypes.DATE,
  lastError: DataTypes.TEXT,
  
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  
  // Audit
  createdAt: DataTypes.DATE,
  updatedAt: DataTypes.DATE,
  deletedAt: DataTypes.DATE
}, {
  sequelize,
  modelName: 'PrinterDevice',
  tableName: 'PrinterDevices',
  paranoid: true,
  indexes: [
    { fields: ['tenantId'] },
    { fields: ['locationId'] },
    { fields: ['ipAddress', 'port'] },
    { fields: ['isOnline'] }
  ]
});
```

### 2. Model `ReceiptTemplate` (NEW)

```javascript
// models/receiptTemplate.js
ReceiptTemplate.init({
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  tenantId: { type: DataTypes.UUID, allowNull: false },
  
  // Template Info
  name: { type: DataTypes.STRING, allowNull: false },
  templateType: {
    type: DataTypes.ENUM('transaction', 'kitchen', 'invoice', 'custom'),
    defaultValue: 'transaction'
  },
  
  // Template Content (JSON)
  template: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {}
  },
  /* Example template structure:
  {
    "header": {
      "logo": true,
      "businessName": true,
      "address": true,
      "phone": true,
      "separator": "="
    },
    "body": {
      "transactionNumber": true,
      "date": true,
      "cashier": true,
      "customer": false,
      "table": true,
      "items": {
        "columns": ["name", "qty", "price", "total"],
        "fontSize": "normal"
      }
    },
    "footer": {
      "subtotal": true,
      "tax": true,
      "discount": true,
      "total": true,
      "payment": true,
      "change": true,
      "separator": "=",
      "thankYou": "Terima Kasih!",
      "customMessage": "Selamat datang kembali"
    },
    "qrCode": {
      "enabled": false,
      "content": "transaction-id"
    }
  }
  */
  
  // Layout Settings
  fontSize: {
    type: DataTypes.ENUM('small', 'normal', 'large'),
    defaultValue: 'normal'
  },
  alignment: {
    type: DataTypes.ENUM('left', 'center', 'right'),
    defaultValue: 'left'
  },
  
  // Status
  isDefault: { type: DataTypes.BOOLEAN, defaultValue: false },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  
  // Audit
  createdAt: DataTypes.DATE,
  updatedAt: DataTypes.DATE,
  deletedAt: DataTypes.DATE
}, {
  sequelize,
  modelName: 'ReceiptTemplate',
  tableName: 'ReceiptTemplates',
  paranoid: true,
  indexes: [
    { fields: ['tenantId'] },
    { fields: ['templateType'] },
    { fields: ['isDefault'] }
  ]
});
```

### 3. Model `PrintJob` (NEW)

```javascript
// models/printJob.js
PrintJob.init({
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  tenantId: { type: DataTypes.UUID, allowNull: false },
  printerDeviceId: { type: DataTypes.UUID, allowNull: false },
  
  // Job Info
  jobType: {
    type: DataTypes.ENUM('receipt', 'kitchen-order', 'report', 'custom'),
    defaultValue: 'receipt'
  },
  
  // Reference
  referenceType: DataTypes.STRING,  // 'transaction', 'invoice', etc.
  referenceId: DataTypes.UUID,
  
  // Print Data (ESC/POS commands as Buffer)
  printData: DataTypes.TEXT,  // Base64 encoded ESC/POS commands
  
  // Status
  status: {
    type: DataTypes.ENUM('pending', 'printing', 'completed', 'failed', 'cancelled'),
    defaultValue: 'pending'
  },
  
  // Retry Logic
  attemptCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  maxRetries: { type: DataTypes.INTEGER, defaultValue: 3 },
  
  // Timing
  scheduledAt: DataTypes.DATE,
  startedAt: DataTypes.DATE,
  completedAt: DataTypes.DATE,
  
  // Error Handling
  errorMessage: DataTypes.TEXT,
  lastAttemptAt: DataTypes.DATE,
  
  // User who triggered print
  printedBy: { type: DataTypes.UUID },  // FK ke User
  
  // Audit
  createdAt: DataTypes.DATE,
  updatedAt: DataTypes.DATE
}, {
  sequelize,
  modelName: 'PrintJob',
  tableName: 'PrintJobs',
  timestamps: true,
  indexes: [
    { fields: ['tenantId'] },
    { fields: ['printerDeviceId'] },
    { fields: ['status'] },
    { fields: ['referenceType', 'referenceId'] },
    { fields: ['scheduledAt'] },
    { fields: ['createdAt'] }
  ]
});
```

### 4. Associations

```javascript
// models/index.js (ADD)
PrinterDevice.belongsTo(Tenant, { foreignKey: 'tenantId' });
PrinterDevice.belongsTo(Location, { as: 'location', foreignKey: 'locationId' });
PrinterDevice.hasMany(PrintJob, { as: 'printJobs', foreignKey: 'printerDeviceId' });

ReceiptTemplate.belongsTo(Tenant, { foreignKey: 'tenantId' });

PrintJob.belongsTo(Tenant, { foreignKey: 'tenantId' });
PrintJob.belongsTo(PrinterDevice, { as: 'printer', foreignKey: 'printerDeviceId' });
PrintJob.belongsTo(User, { as: 'printedByUser', foreignKey: 'printedBy' });
```

---

## 🏗️ Printing Service

### 1. ESC/POS Command Generator

```javascript
// services/printingService.js
const escpos = require('escpos');
const net = require('net');
const { PrinterDevice, ReceiptTemplate, PrintJob, Transaction, Tenant } = require('../models');

class PrintingService {
  /**
   * Generate ESC/POS commands untuk transaction receipt
   */
  async generateReceiptCommands(transactionId, templateId = null) {
    try {
      // Get transaction dengan semua relasi
      const transaction = await Transaction.findByPk(transactionId, {
        include: [
          { model: Tenant, as: 'tenant' },
          { model: TransactionItem, as: 'items', include: ['product'] },
          { model: TransactionPayment, as: 'payments' },
          { model: Voucher, as: 'voucher' }
        ]
      });
      
      if (!transaction) {
        throw new Error('Transaction not found');
      }
      
      // Get template
      let template;
      if (templateId) {
        template = await ReceiptTemplate.findByPk(templateId);
      } else {
        template = await ReceiptTemplate.findOne({
          where: {
            tenantId: transaction.tenantId,
            templateType: 'transaction',
            isDefault: true
          }
        });
      }
      
      // Use default template jika tidak ada
      const templateConfig = template?.template || this.getDefaultTemplate();
      
      // Build receipt content
      let receipt = '';
      
      // === HEADER ===
      if (templateConfig.header) {
        if (templateConfig.header.businessName && transaction.tenant) {
          receipt += this.centerText(transaction.tenant.name, 48);
          receipt += '\n';
        }
        
        if (templateConfig.header.address && transaction.tenant.address) {
          receipt += this.centerText(transaction.tenant.address, 48);
          receipt += '\n';
        }
        
        if (templateConfig.header.phone && transaction.tenant.phone) {
          receipt += this.centerText(`Tel: ${transaction.tenant.phone}`, 48);
          receipt += '\n';
        }
        
        receipt += this.separator(templateConfig.header.separator || '=', 48);
        receipt += '\n';
      }
      
      // === BODY ===
      if (templateConfig.body) {
        if (templateConfig.body.transactionNumber) {
          receipt += `No: ${transaction.transactionNumber}\n`;
        }
        
        if (templateConfig.body.date) {
          receipt += `Tanggal: ${this.formatDate(transaction.createdAt)}\n`;
        }
        
        if (templateConfig.body.table && transaction.restaurantTableId) {
          // Get table info
          receipt += `Meja: ${transaction.table?.tableNumber || '-'}\n`;
        }
        
        receipt += this.separator('-', 48);
        receipt += '\n';
        
        // ITEMS
        if (transaction.items && transaction.items.length > 0) {
          transaction.items.forEach(item => {
            const itemName = item.itemType === 'membership' 
              ? item.membership?.membershipType?.name 
              : item.product?.name;
            
            const qty = item.quantity;
            const price = parseFloat(item.unitPrice);
            const total = parseFloat(item.totalPrice);
            
            receipt += `${itemName}\n`;
            receipt += `  ${qty} x ${this.formatCurrency(price)}`;
            receipt += `${this.rightAlign(this.formatCurrency(total), 48 - `  ${qty} x ${this.formatCurrency(price)}`.length)}\n`;
          });
        }
        
        receipt += this.separator('-', 48);
        receipt += '\n';
      }
      
      // === FOOTER ===
      if (templateConfig.footer) {
        if (templateConfig.footer.subtotal) {
          receipt += this.formatLine('Subtotal', this.formatCurrency(transaction.subtotalAmount), 48);
        }
        
        if (templateConfig.footer.discount && transaction.discountAmount > 0) {
          receipt += this.formatLine('Diskon', this.formatCurrency(transaction.discountAmount), 48);
        }
        
        if (templateConfig.footer.tax && transaction.taxAmount > 0) {
          receipt += this.formatLine('Pajak', this.formatCurrency(transaction.taxAmount), 48);
        }
        
        receipt += this.separator(templateConfig.footer.separator || '=', 48);
        receipt += '\n';
        
        if (templateConfig.footer.total) {
          receipt += this.formatLine('TOTAL', this.formatCurrency(transaction.totalAmount), 48, true);
        }
        
        if (templateConfig.footer.payment) {
          const payment = transaction.payments?.[0];
          if (payment) {
            receipt += this.formatLine('Bayar', this.formatCurrency(payment.amount), 48);
            
            if (templateConfig.footer.change) {
              const change = parseFloat(payment.amount) - parseFloat(transaction.totalAmount);
              if (change > 0) {
                receipt += this.formatLine('Kembali', this.formatCurrency(change), 48);
              }
            }
          }
        }
        
        receipt += '\n';
        
        if (templateConfig.footer.thankYou) {
          receipt += this.centerText(templateConfig.footer.thankYou, 48);
          receipt += '\n';
        }
        
        if (templateConfig.footer.customMessage) {
          receipt += this.centerText(templateConfig.footer.customMessage, 48);
          receipt += '\n';
        }
      }
      
      // Feed & Cut
      receipt += '\n\n\n';
      
      return receipt;
    } catch (error) {
      console.error('Generate receipt error:', error);
      throw error;
    }
  }
  
  /**
   * Send print job to thermal printer
   */
  async sendToPrinter(printerDeviceId, content, jobType = 'receipt', referenceType = null, referenceId = null, userId = null) {
    try {
      const printer = await PrinterDevice.findByPk(printerDeviceId);
      
      if (!printer) {
        throw new Error('Printer not found');
      }
      
      if (!printer.isActive) {
        throw new Error('Printer is not active');
      }
      
      // Create print job
      const printJob = await PrintJob.create({
        tenantId: printer.tenantId,
        printerDeviceId: printer.id,
        jobType,
        referenceType,
        referenceId,
        printData: Buffer.from(content).toString('base64'),
        status: 'pending',
        scheduledAt: new Date(),
        printedBy: userId
      });
      
      // Execute print
      await this.executePrintJob(printJob.id);
      
      return printJob;
    } catch (error) {
      console.error('Send to printer error:', error);
      throw error;
    }
  }
  
  /**
   * Execute print job
   */
  async executePrintJob(printJobId) {
    const printJob = await PrintJob.findByPk(printJobId, {
      include: [{ model: PrinterDevice, as: 'printer' }]
    });
    
    if (!printJob) {
      throw new Error('Print job not found');
    }
    
    if (printJob.status !== 'pending') {
      return;
    }
    
    try {
      await printJob.update({
        status: 'printing',
        startedAt: new Date(),
        attemptCount: printJob.attemptCount + 1,
        lastAttemptAt: new Date()
      });
      
      const printer = printJob.printer;
      
      // Connect to printer via TCP/IP
      const client = new net.Socket();
      const timeout = 5000; // 5 seconds
      
      await new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          client.destroy();
          reject(new Error('Connection timeout'));
        }, timeout);
        
        client.connect(printer.port, printer.ipAddress, () => {
          clearTimeout(timeoutId);
          
          // Decode print data
          const printData = Buffer.from(printJob.printData, 'base64');
          
          // Send to printer
          client.write(printData);
          
          // Cut paper command (ESC/POS)
          const cutCommand = Buffer.from([0x1D, 0x56, 0x00]); // GS V 0
          client.write(cutCommand);
          
          client.end();
          resolve();
        });
        
        client.on('error', (err) => {
          clearTimeout(timeoutId);
          reject(err);
        });
      });
      
      // Update print job status
      await printJob.update({
        status: 'completed',
        completedAt: new Date()
      });
      
      // Update printer status
      await printer.update({
        isOnline: true,
        lastPingAt: new Date()
      });
      
    } catch (error) {
      console.error('Execute print job error:', error);
      
      // Update print job dengan error
      await printJob.update({
        status: printJob.attemptCount >= printJob.maxRetries ? 'failed' : 'pending',
        errorMessage: error.message
      });
      
      // Update printer status
      await printJob.printer.update({
        isOnline: false,
        lastErrorAt: new Date(),
        lastError: error.message
      });
      
      // Retry jika belum mencapai max retries
      if (printJob.attemptCount < printJob.maxRetries) {
        // Schedule retry after 10 seconds
        setTimeout(() => {
          this.executePrintJob(printJobId).catch(err => {
            console.error('Retry print job error:', err);
          });
        }, 10000);
      }
      
      throw error;
    }
  }
  
  /**
   * Auto-print transaction receipt
   */
  async autoPrintTransaction(transactionId, userId = null) {
    try {
      const transaction = await Transaction.findByPk(transactionId);
      
      if (!transaction) {
        throw new Error('Transaction not found');
      }
      
      // Find active printer untuk tenant ini
      const printer = await PrinterDevice.findOne({
        where: {
          tenantId: transaction.tenantId,
          isActive: true,
          autoPrint: true,
          printOnSave: true
        },
        order: [['createdAt', 'ASC']]
      });
      
      if (!printer) {
        console.log('No auto-print printer found for tenant:', transaction.tenantId);
        return null;
      }
      
      // Generate receipt
      const receiptContent = await this.generateReceiptCommands(transactionId);
      
      // Send to printer
      const printJob = await this.sendToPrinter(
        printer.id,
        receiptContent,
        'receipt',
        'transaction',
        transactionId,
        userId
      );
      
      return printJob;
    } catch (error) {
      console.error('Auto print transaction error:', error);
      // Don't throw - auto-print failure shouldn't block transaction
      return null;
    }
  }
  
  // === HELPER FUNCTIONS ===
  
  getDefaultTemplate() {
    return {
      header: {
        businessName: true,
        address: true,
        phone: true,
        separator: '='
      },
      body: {
        transactionNumber: true,
        date: true,
        table: true,
        items: true
      },
      footer: {
        subtotal: true,
        tax: true,
        discount: true,
        total: true,
        payment: true,
        change: true,
        separator: '=',
        thankYou: 'Terima Kasih!',
        customMessage: null
      }
    };
  }
  
  centerText(text, width) {
    const padding = Math.floor((width - text.length) / 2);
    return ' '.repeat(padding) + text;
  }
  
  separator(char, width) {
    return char.repeat(width);
  }
  
  formatLine(label, value, width, bold = false) {
    const spaces = width - label.length - value.length;
    return `${label}${' '.repeat(spaces)}${value}\n`;
  }
  
  rightAlign(text, width) {
    return ' '.repeat(width);
  }
  
  formatCurrency(amount) {
    return `Rp ${parseFloat(amount).toLocaleString('id-ID')}`;
  }
  
  formatDate(date) {
    return new Date(date).toLocaleString('id-ID');
  }
}

module.exports = new PrintingService();
```

---

## 🎮 Controllers

```javascript
// controllers/printerController.js
const { PrinterDevice, ReceiptTemplate, PrintJob } = require('../models');
const printingService = require('../services/printingService');

class PrinterController {
  // GET /api/v1/printers
  async getAllPrinters(req, res) {
    try {
      const tenantId = req.user.tenantId;
      
      const printers = await PrinterDevice.findAll({
        where: { tenantId },
        include: [{ model: Location, as: 'location' }],
        order: [['createdAt', 'ASC']]
      });
      
      res.json({ success: true, data: printers });
    } catch (error) {
      console.error('Get printers error:', error);
      res.status(500).json({ success: false, message: 'Error fetching printers' });
    }
  }
  
  // POST /api/v1/printers
  async createPrinter(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const printerData = req.body;
      
      const printer = await PrinterDevice.create({
        ...printerData,
        tenantId
      });
      
      res.status(201).json({ success: true, data: printer });
    } catch (error) {
      console.error('Create printer error:', error);
      res.status(500).json({ success: false, message: 'Error creating printer' });
    }
  }
  
  // POST /api/v1/printers/:id/test
  async testPrint(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      
      const printer = await PrinterDevice.findOne({ where: { id, tenantId } });
      
      if (!printer) {
        return res.status(404).json({ success: false, message: 'Printer not found' });
      }
      
      // Generate test receipt
      const testContent = 'TEST PRINT\n' +
                         '================\n' +
                         'Printer berfungsi!\n' +
                         'Tanggal: ' + new Date().toLocaleString('id-ID') + '\n' +
                         '================\n\n\n';
      
      const printJob = await printingService.sendToPrinter(
        printer.id,
        testContent,
        'custom',
        null,
        null,
        req.user.id
      );
      
      res.json({
        success: true,
        message: 'Test print sent',
        data: printJob
      });
    } catch (error) {
      console.error('Test print error:', error);
      res.status(500).json({
        success: false,
        message: 'Test print failed',
        error: error.message
      });
    }
  }
  
  // POST /api/v1/printers/print-transaction/:transactionId
  async printTransaction(req, res) {
    try {
      const { transactionId } = req.params;
      const { printerId } = req.body;
      const tenantId = req.user.tenantId;
      
      const receiptContent = await printingService.generateReceiptCommands(transactionId);
      
      const printJob = await printingService.sendToPrinter(
        printerId,
        receiptContent,
        'receipt',
        'transaction',
        transactionId,
        req.user.id
      );
      
      res.json({
        success: true,
        message: 'Print job created',
        data: printJob
      });
    } catch (error) {
      console.error('Print transaction error:', error);
      res.status(500).json({
        success: false,
        message: 'Print failed',
        error: error.message
      });
    }
  }
}

module.exports = new PrinterController();
```

---

## 🔗 Integration dengan Transaction Controller

```javascript
// controllers/transactionController.js (UPDATE)
const printingService = require('../services/printingService');

// Di dalam createTransaction function, setelah transaction.commit()
async createTransaction(req, res) {
  const transaction = await sequelize.transaction();
  try {
    // ... existing transaction creation logic ...
    
    await transaction.commit();
    
    // AUTO-PRINT (async, non-blocking)
    if (req.subscriptionFeatures?.printing?.autoPrint) {
      printingService.autoPrintTransaction(newTransaction.id, req.user.id)
        .catch(err => {
          console.error('Auto-print failed:', err);
          // Log but don't fail transaction
        });
    }
    
    res.status(201).json({
      success: true,
      data: newTransaction
    });
  } catch (error) {
    await transaction.rollback();
    // ... error handling ...
  }
}
```

---

## 📝 Implementation Checklist

### Week 1
- [ ] Day 1-2: Database migrations & models
- [ ] Day 3-4: Printing service dengan ESC/POS commands
- [ ] Day 5: Receipt template system

### Week 2
- [ ] Day 6-7: Printer controller & routes
- [ ] Day 8: Integration dengan transaction controller
- [ ] Day 9: Testing (unit + integration)
- [ ] Day 10: Documentation & deployment

---

**Status**: Ready for implementation ✅  
**Next**: [PHASE-04-RESTAURANT-UI-TABLE-DESIGN.md](./PHASE-04-RESTAURANT-UI-TABLE-DESIGN.md)
