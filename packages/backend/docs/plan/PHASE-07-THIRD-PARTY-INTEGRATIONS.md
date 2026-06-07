# FASE 7: THIRD-PARTY INTEGRATIONS
## Framework Integrasi untuk Twilio, Midtrans, dan Ekstensibilitas

**Status**: 📋 Planning  
**Prioritas**: 🟢 Low (Enhancement)  
**Estimasi**: 3 minggu  
**Dependencies**: None (bisa parallel dengan fase lain)

---

## 🎯 Tujuan Fase Ini

Membangun **integration framework** yang extensible untuk:

1. **SMS Notifications** - Twilio integration untuk OTP, payment reminders, membership expiry
2. **Payment Gateway** - Midtrans integration untuk online payments
3. **Email Notifications** - SendGrid/Nodemailer untuk email notifications
4. **WhatsApp** - Twilio WhatsApp Business API (future)
5. **Accounting Software** - Jurnal.id, Accurate (future)
6. **Webhook Management** - Handle callbacks dari third-party services
7. **Integration Logging** - Audit trail untuk semua integration calls
8. **Error Handling** - Robust retry mechanism dan error notifications

---

## 📊 Database Schema

### 1. Model `Integration` (NEW)

```javascript
// models/integration.js
Integration.init({
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  tenantId: { type: DataTypes.UUID, allowNull: false },
  
  // Integration Info
  name: { type: DataTypes.STRING, allowNull: false },
  provider: {
    type: DataTypes.ENUM('twilio', 'midtrans', 'sendgrid', 'whatsapp', 'jurnal', 'accurate', 'xendit', 'custom'),
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('sms', 'payment', 'email', 'whatsapp', 'accounting', 'other'),
    allowNull: false
  },
  
  // Configuration
  config: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {}
  },
  /* Example config:
  {
    "accountSid": "ACxxxx",        // Twilio
    "authToken": "encrypted",       // Encrypted
    "fromNumber": "+1234567890",
    "serverKey": "encrypted",       // Midtrans
    "clientKey": "SB-xxx",
    "environment": "sandbox"
  }
  */
  
  // Credentials (ENCRYPTED)
  credentials: {
    type: DataTypes.TEXT,  // Encrypted JSON string
    allowNull: false
  },
  
  // Webhook
  webhookUrl: DataTypes.STRING,
  webhookSecret: DataTypes.STRING,
  
  // Status
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  isVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
  
  // Stats
  totalCalls: { type: DataTypes.INTEGER, defaultValue: 0 },
  successfulCalls: { type: DataTypes.INTEGER, defaultValue: 0 },
  failedCalls: { type: DataTypes.INTEGER, defaultValue: 0 },
  lastCalledAt: DataTypes.DATE,
  lastError: DataTypes.TEXT,
  lastErrorAt: DataTypes.DATE,
  
  // Audit
  createdAt: DataTypes.DATE,
  updatedAt: DataTypes.DATE,
  deletedAt: DataTypes.DATE
}, {
  sequelize,
  modelName: 'Integration',
  tableName: 'Integrations',
  paranoid: true,
  indexes: [
    { fields: ['tenantId'] },
    { fields: ['provider'] },
    { fields: ['type'] },
    { fields: ['isActive'] }
  ]
});
```

### 2. Model `IntegrationLog` (NEW)

```javascript
// models/integrationLog.js
IntegrationLog.init({
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  tenantId: { type: DataTypes.UUID, allowNull: false },
  integrationId: { type: DataTypes.UUID, allowNull: false },
  
  // Request Info
  method: DataTypes.STRING,         // API method/action called
  endpoint: DataTypes.STRING,       // API endpoint URL
  requestPayload: DataTypes.JSONB,  // Request data (sanitized)
  requestHeaders: DataTypes.JSONB,  // Request headers (sanitized)
  
  // Response Info
  responseStatus: DataTypes.INTEGER,
  responsePayload: DataTypes.JSONB,
  responseHeaders: DataTypes.JSONB,
  
  // Timing
  duration: DataTypes.INTEGER,      // milliseconds
  
  // Status
  status: {
    type: DataTypes.ENUM('success', 'failed', 'pending', 'retrying'),
    allowNull: false
  },
  
  // Error Info
  errorMessage: DataTypes.TEXT,
  errorCode: DataTypes.STRING,
  errorDetails: DataTypes.JSONB,
  
  // Reference
  referenceType: DataTypes.STRING,  // 'transaction', 'member', 'invoice', etc.
  referenceId: DataTypes.UUID,
  
  // Retry
  attemptNumber: { type: DataTypes.INTEGER, defaultValue: 1 },
  maxAttempts: { type: DataTypes.INTEGER, defaultValue: 3 },
  nextRetryAt: DataTypes.DATE,
  
  // Audit
  createdAt: DataTypes.DATE,
  updatedAt: DataTypes.DATE
}, {
  sequelize,
  modelName: 'IntegrationLog',
  tableName: 'IntegrationLogs',
  timestamps: true,
  indexes: [
    { fields: ['tenantId'] },
    { fields: ['integrationId'] },
    { fields: ['status'] },
    { fields: ['referenceType', 'referenceId'] },
    { fields: ['createdAt'] }
  ]
});
```

### 3. Model `WebhookEvent` (NEW)

```javascript
// models/webhookEvent.js
WebhookEvent.init({
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  tenantId: { type: DataTypes.UUID },  // Nullable untuk webhook sebelum verification
  integrationId: { type: DataTypes.UUID },
  
  // Webhook Info
  provider: DataTypes.STRING,
  eventType: DataTypes.STRING,      // e.g., 'payment.success', 'sms.delivered'
  
  // Payload
  payload: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  headers: DataTypes.JSONB,
  
  // Processing
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'processed', 'failed', 'ignored'),
    defaultValue: 'pending'
  },
  processedAt: DataTypes.DATE,
  processingError: DataTypes.TEXT,
  
  // Verification
  signature: DataTypes.STRING,
  isVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
  
  // Retry
  attemptCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  maxAttempts: { type: DataTypes.INTEGER, defaultValue: 3 },
  
  // Audit
  createdAt: DataTypes.DATE,
  updatedAt: DataTypes.DATE
}, {
  sequelize,
  modelName: 'WebhookEvent',
  tableName: 'WebhookEvents',
  timestamps: true,
  indexes: [
    { fields: ['tenantId'] },
    { fields: ['integrationId'] },
    { fields: ['provider'] },
    { fields: ['eventType'] },
    { fields: ['status'] },
    { fields: ['createdAt'] }
  ]
});
```

### 4. Associations

```javascript
// models/index.js (ADD)
Integration.belongsTo(Tenant, { foreignKey: 'tenantId' });
Integration.hasMany(IntegrationLog, { as: 'logs', foreignKey: 'integrationId' });
Integration.hasMany(WebhookEvent, { as: 'webhooks', foreignKey: 'integrationId' });

IntegrationLog.belongsTo(Tenant, { foreignKey: 'tenantId' });
IntegrationLog.belongsTo(Integration, { as: 'integration', foreignKey: 'integrationId' });

WebhookEvent.belongsTo(Tenant, { foreignKey: 'tenantId' });
WebhookEvent.belongsTo(Integration, { as: 'integration', foreignKey: 'integrationId' });
```

---

## 🏗️ Integration Services

### 1. Base Integration Class

```javascript
// services/integrations/BaseIntegration.js
const { Integration, IntegrationLog } = require('../../models');
const crypto = require('crypto');

class BaseIntegration {
  constructor(integrationId) {
    this.integrationId = integrationId;
    this.integration = null;
  }
  
  async loadIntegration() {
    this.integration = await Integration.findByPk(this.integrationId);
    
    if (!this.integration) {
      throw new Error('Integration not found');
    }
    
    if (!this.integration.isActive) {
      throw new Error('Integration is not active');
    }
    
    return this.integration;
  }
  
  async logCall(method, endpoint, requestPayload, responseStatus, responsePayload, duration, error = null) {
    const log = await IntegrationLog.create({
      tenantId: this.integration.tenantId,
      integrationId: this.integration.id,
      method,
      endpoint,
      requestPayload: this.sanitizePayload(requestPayload),
      responseStatus,
      responsePayload: this.sanitizePayload(responsePayload),
      duration,
      status: error ? 'failed' : 'success',
      errorMessage: error?.message,
      errorCode: error?.code,
      errorDetails: error?.details
    });
    
    // Update integration stats
    await this.integration.update({
      totalCalls: this.integration.totalCalls + 1,
      successfulCalls: error ? this.integration.successfulCalls : this.integration.successfulCalls + 1,
      failedCalls: error ? this.integration.failedCalls + 1 : this.integration.failedCalls,
      lastCalledAt: new Date(),
      lastError: error?.message,
      lastErrorAt: error ? new Date() : this.integration.lastErrorAt
    });
    
    return log;
  }
  
  sanitizePayload(payload) {
    // Remove sensitive data before logging
    if (!payload) return null;
    
    const sanitized = JSON.parse(JSON.stringify(payload));
    const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'authToken', 'cardNumber', 'cvv'];
    
    const sanitize = (obj) => {
      for (const key in obj) {
        if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
          obj[key] = '***REDACTED***';
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitize(obj[key]);
        }
      }
    };
    
    sanitize(sanitized);
    return sanitized;
  }
  
  encryptCredentials(credentials) {
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(JSON.stringify(credentials), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }
  
  decryptCredentials(encryptedData) {
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
    
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }
  
  async call(method, ...args) {
    throw new Error('call() method must be implemented by subclass');
  }
}

module.exports = BaseIntegration;
```

### 2. Twilio SMS Service

```javascript
// services/integrations/TwilioService.js
const BaseIntegration = require('./BaseIntegration');
const twilio = require('twilio');

class TwilioService extends BaseIntegration {
  constructor(integrationId) {
    super(integrationId);
    this.client = null;
  }
  
  async initialize() {
    await this.loadIntegration();
    
    const credentials = this.decryptCredentials(this.integration.credentials);
    
    this.client = twilio(
      credentials.accountSid,
      credentials.authToken
    );
    
    this.fromNumber = this.integration.config.fromNumber;
    
    return this;
  }
  
  async sendSMS(to, message) {
    const startTime = Date.now();
    
    try {
      const response = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: to
      });
      
      const duration = Date.now() - startTime;
      
      await this.logCall(
        'sendSMS',
        'https://api.twilio.com/2010-04-01/Accounts/.../Messages.json',
        { to, message },
        200,
        { sid: response.sid, status: response.status },
        duration
      );
      
      return {
        success: true,
        messageId: response.sid,
        status: response.status
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      await this.logCall(
        'sendSMS',
        'https://api.twilio.com/2010-04-01/Accounts/.../Messages.json',
        { to, message },
        error.status || 500,
        null,
        duration,
        { message: error.message, code: error.code }
      );
      
      throw error;
    }
  }
  
  async sendOTP(phoneNumber, code) {
    const message = `Kode OTP Anda: ${code}. Berlaku 5 menit.`;
    return await this.sendSMS(phoneNumber, message);
  }
  
  async sendPaymentReminder(phoneNumber, memberName, amount, dueDate) {
    const message = `Halo ${memberName}, pembayaran membership Anda sebesar Rp ${amount} jatuh tempo pada ${dueDate}. Terima kasih.`;
    return await this.sendSMS(phoneNumber, message);
  }
  
  async sendMembershipExpiryNotification(phoneNumber, memberName, expiryDate) {
    const message = `Halo ${memberName}, membership Anda akan berakhir pada ${expiryDate}. Segera perpanjang untuk tetap menikmati fasilitas kami.`;
    return await this.sendSMS(phoneNumber, message);
  }
}

module.exports = TwilioService;
```

### 3. Midtrans Payment Service

```javascript
// services/integrations/MidtransService.js
const BaseIntegration = require('./BaseIntegration');
const midtransClient = require('midtrans-client');

class MidtransService extends BaseIntegration {
  constructor(integrationId) {
    super(integrationId);
    this.snap = null;
    this.core = null;
  }
  
  async initialize() {
    await this.loadIntegration();
    
    const credentials = this.decryptCredentials(this.integration.credentials);
    const isProduction = this.integration.config.environment === 'production';
    
    // Snap API (untuk payment page)
    this.snap = new midtransClient.Snap({
      isProduction: isProduction,
      serverKey: credentials.serverKey,
      clientKey: this.integration.config.clientKey
    });
    
    // Core API (untuk direct charge, status check, dll)
    this.core = new midtransClient.CoreApi({
      isProduction: isProduction,
      serverKey: credentials.serverKey,
      clientKey: this.integration.config.clientKey
    });
    
    return this;
  }
  
  async createTransaction(transaction) {
    const startTime = Date.now();
    
    try {
      const parameter = {
        transaction_details: {
          order_id: transaction.transactionNumber,
          gross_amount: parseFloat(transaction.totalAmount)
        },
        customer_details: {
          first_name: transaction.customerName || 'Customer',
          email: transaction.customerEmail || 'customer@example.com',
          phone: transaction.customerPhone || ''
        },
        item_details: transaction.items.map(item => ({
          id: item.id,
          name: item.name,
          price: parseFloat(item.unitPrice),
          quantity: item.quantity
        }))
      };
      
      const response = await this.snap.createTransaction(parameter);
      
      const duration = Date.now() - startTime;
      
      await this.logCall(
        'createTransaction',
        'https://app.midtrans.com/snap/v1/transactions',
        parameter,
        200,
        { token: response.token, redirect_url: response.redirect_url },
        duration
      );
      
      return {
        success: true,
        token: response.token,
        redirectUrl: response.redirect_url
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      await this.logCall(
        'createTransaction',
        'https://app.midtrans.com/snap/v1/transactions',
        { order_id: transaction.transactionNumber },
        error.httpStatusCode || 500,
        null,
        duration,
        { message: error.message, details: error.ApiResponse }
      );
      
      throw error;
    }
  }
  
  async checkTransactionStatus(orderId) {
    const startTime = Date.now();
    
    try {
      const response = await this.core.transaction.status(orderId);
      
      const duration = Date.now() - startTime;
      
      await this.logCall(
        'checkStatus',
        `https://api.midtrans.com/v2/${orderId}/status`,
        { order_id: orderId },
        200,
        response,
        duration
      );
      
      return {
        success: true,
        status: response.transaction_status,
        fraudStatus: response.fraud_status,
        paymentType: response.payment_type,
        data: response
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      await this.logCall(
        'checkStatus',
        `https://api.midtrans.com/v2/${orderId}/status`,
        { order_id: orderId },
        error.httpStatusCode || 500,
        null,
        duration,
        { message: error.message }
      );
      
      throw error;
    }
  }
  
  verifyWebhookSignature(payload, signature) {
    const crypto = require('crypto');
    const credentials = this.decryptCredentials(this.integration.credentials);
    
    const hash = crypto
      .createHash('sha512')
      .update(`${payload.order_id}${payload.status_code}${payload.gross_amount}${credentials.serverKey}`)
      .digest('hex');
    
    return hash === signature;
  }
}

module.exports = MidtransService;
```

---

## 🎮 Controllers

### Integration Management Controller

```javascript
// controllers/integrationController.js
const { Integration, IntegrationLog } = require('../models');
const BaseIntegration = require('../services/integrations/BaseIntegration');

class IntegrationController {
  // GET /api/v1/integrations
  async getAllIntegrations(req, res) {
    try {
      const tenantId = req.user.tenantId;
      
      const integrations = await Integration.findAll({
        where: { tenantId },
        attributes: { exclude: ['credentials'] },  // Don't expose credentials
        order: [['provider', 'ASC']]
      });
      
      res.json({ success: true, data: integrations });
    } catch (error) {
      console.error('Get integrations error:', error);
      res.status(500).json({ success: false, message: 'Error fetching integrations' });
    }
  }
  
  // POST /api/v1/integrations
  async createIntegration(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const { name, provider, type, config, credentials } = req.body;
      
      // Encrypt credentials
      const baseIntegration = new BaseIntegration();
      const encryptedCredentials = baseIntegration.encryptCredentials(credentials);
      
      const integration = await Integration.create({
        tenantId,
        name,
        provider,
        type,
        config,
        credentials: encryptedCredentials
      });
      
      // Return without credentials
      const response = integration.toJSON();
      delete response.credentials;
      
      res.status(201).json({ success: true, data: response });
    } catch (error) {
      console.error('Create integration error:', error);
      res.status(500).json({ success: false, message: 'Error creating integration' });
    }
  }
  
  // GET /api/v1/integrations/:id/logs
  async getIntegrationLogs(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 50 } = req.query;
      const tenantId = req.user.tenantId;
      
      const offset = (page - 1) * limit;
      
      const { rows: logs, count } = await IntegrationLog.findAndCountAll({
        where: { integrationId: id, tenantId },
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: offset
      });
      
      res.json({
        success: true,
        data: logs,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      console.error('Get integration logs error:', error);
      res.status(500).json({ success: false, message: 'Error fetching logs' });
    }
  }
}

module.exports = new IntegrationController();
```

### Webhook Controller

```javascript
// controllers/webhookController.js
const { WebhookEvent, Integration, Transaction, TransactionPayment } = require('../models');
const MidtransService = require('../services/integrations/MidtransService');
const { sequelize } = require('../models');

class WebhookController {
  // POST /api/v1/webhooks/midtrans
  async handleMidtransWebhook(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const payload = req.body;
      const signature = req.headers['x-signature'] || req.body.signature_key;
      
      // Save webhook event
      const webhookEvent = await WebhookEvent.create({
        provider: 'midtrans',
        eventType: `payment.${payload.transaction_status}`,
        payload,
        headers: { signature },
        status: 'pending'
      }, { transaction });
      
      // Find integration
      const integration = await Integration.findOne({
        where: {
          provider: 'midtrans',
          isActive: true
        }
      });
      
      if (!integration) {
        await transaction.rollback();
        return res.status(404).json({ success: false, message: 'Integration not found' });
      }
      
      // Verify signature
      const midtrans = new MidtransService(integration.id);
      await midtrans.initialize();
      
      const isValid = midtrans.verifyWebhookSignature(payload, signature);
      
      if (!isValid) {
        await webhookEvent.update({ status: 'failed', processingError: 'Invalid signature' }, { transaction });
        await transaction.rollback();
        return res.status(401).json({ success: false, message: 'Invalid signature' });
      }
      
      await webhookEvent.update({ 
        isVerified: true, 
        tenantId: integration.tenantId,
        integrationId: integration.id,
        status: 'processing'
      }, { transaction });
      
      // Process payment notification
      const orderId = payload.order_id;
      const transactionStatus = payload.transaction_status;
      const fraudStatus = payload.fraud_status;
      
      // Find transaction
      const orderTransaction = await Transaction.findOne({
        where: { transactionNumber: orderId },
        transaction
      });
      
      if (!orderTransaction) {
        await webhookEvent.update({ status: 'ignored', processingError: 'Transaction not found' }, { transaction });
        await transaction.commit();
        return res.json({ success: true, message: 'Transaction not found, ignored' });
      }
      
      // Update transaction based on status
      if (transactionStatus === 'capture' || transactionStatus === 'settlement') {
        if (fraudStatus === 'accept' || !fraudStatus) {
          // Payment success
          await orderTransaction.update({ status: 'completed' }, { transaction });
          
          // Update payment record
          await TransactionPayment.update({
            paymentGatewayRef: payload.transaction_id,
            notes: `Midtrans ${transactionStatus}`
          }, {
            where: { transactionId: orderTransaction.id },
            transaction
          });
        }
      } else if (transactionStatus === 'pending') {
        await orderTransaction.update({ status: 'pending' }, { transaction });
      } else if (transactionStatus === 'deny' || transactionStatus === 'cancel' || transactionStatus === 'expire') {
        await orderTransaction.update({ status: 'cancelled' }, { transaction });
      }
      
      await webhookEvent.update({ 
        status: 'processed',
        processedAt: new Date()
      }, { transaction });
      
      await transaction.commit();
      
      res.json({ success: true, message: 'Webhook processed' });
    } catch (error) {
      await transaction.rollback();
      console.error('Midtrans webhook error:', error);
      res.status(500).json({ success: false, message: 'Error processing webhook' });
    }
  }
  
  // POST /api/v1/webhooks/twilio
  async handleTwilioWebhook(req, res) {
    try {
      const payload = req.body;
      
      // Save webhook event
      await WebhookEvent.create({
        provider: 'twilio',
        eventType: `sms.${payload.SmsStatus}`,
        payload,
        status: 'processed',
        processedAt: new Date()
      });
      
      // Process SMS status (delivered, failed, etc.)
      // Update notification log if needed
      
      res.json({ success: true });
    } catch (error) {
      console.error('Twilio webhook error:', error);
      res.status(500).json({ success: false });
    }
  }
}

module.exports = new WebhookController();
```

---

## 🛣️ Routes

```javascript
// routes/v1/integrationRoutes.js (NEW)
const express = require('express');
const router = express.Router();
const integrationController = require('../../controllers/integrationController');
const authMiddleware = require('../../middlewares/authMiddleware');
const caslMiddleware = require('../../middlewares/caslMiddleware');

router.use(authMiddleware.authenticate);

// Integrations (Admin only)
router.get('/integrations',
  caslMiddleware.authorize('manage', 'integrations'),
  integrationController.getAllIntegrations
);

router.post('/integrations',
  caslMiddleware.authorize('manage', 'integrations'),
  integrationController.createIntegration
);

router.get('/integrations/:id/logs',
  caslMiddleware.authorize('manage', 'integrations'),
  integrationController.getIntegrationLogs
);

module.exports = router;
```

```javascript
// routes/v1/webhookRoutes.js (NEW)
const express = require('express');
const router = express.Router();
const webhookController = require('../../controllers/webhookController');

// Webhooks (NO AUTH - External services call these)
router.post('/webhooks/midtrans', webhookController.handleMidtransWebhook);
router.post('/webhooks/twilio', webhookController.handleTwilioWebhook);

module.exports = router;
```

---

## 📝 Implementation Checklist

### Week 1: Foundation
- [ ] Day 1-2: Models (Integration, IntegrationLog, WebhookEvent)
- [ ] Day 3: BaseIntegration class
- [ ] Day 4-5: Encryption/decryption utilities & testing

### Week 2: Integrations
- [ ] Day 6-7: TwilioService implementation
- [ ] Day 8-9: MidtransService implementation
- [ ] Day 10: Email service (SendGrid/Nodemailer)

### Week 3: Controllers & Testing
- [ ] Day 11-12: Integration & Webhook controllers
- [ ] Day 13-14: Integration testing dengan sandbox accounts
- [ ] Day 15: Documentation & deployment

---

## 🔐 Security Checklist

- [ ] Encrypt all credentials at rest
- [ ] Use environment variables untuk encryption keys
- [ ] Sanitize logs (remove sensitive data)
- [ ] Verify webhook signatures
- [ ] Rate limit webhook endpoints
- [ ] HTTPS only untuk webhooks
- [ ] IP whitelist untuk webhooks (optional)

---

**Status**: Ready for implementation ✅  
**Selesai!** Semua 7 fase sudah didokumentasikan lengkap.
