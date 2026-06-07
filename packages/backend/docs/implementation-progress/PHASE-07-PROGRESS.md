# FASE 7 PROGRESS: THIRD-PARTY INTEGRATIONS
## Twilio, Midtrans, WhatsApp, Email & Scheduled Jobs

**Status**: 🔵 Not Started  
**Progress**: 0% (0/15 days completed)  
**Owner**: TBD  
**Start Date**: TBD  
**Target Completion**: TBD  
**Actual Completion**: -

---

## 📊 Progress Summary

### Week 1: Database & Foundation (Days 1-5)
- [ ] **Day 1-2**: Integration Config Database
  - [ ] Create IntegrationConfig migration (tenant-specific credentials)
  - [ ] Create IntegrationLog migration (audit trail untuk API calls)
  - [ ] Create NotificationQueue migration (SMS, email, WhatsApp queue)
  - [ ] Encryption service untuk sensitive credentials
  - [ ] Sequelize models dengan associations
  - [ ] Seed sample configs (sandbox credentials)
  - **Status**: Not Started
  - **Blockers**: None
  - **Notes**: -

- [ ] **Day 3-4**: Base Integration Service
  - [ ] Implement `BaseIntegrationService.js` (abstract class)
  - [ ] Method: `getConfig(tenantId, provider)` - Load encrypted credentials
  - [ ] Method: `logRequest(provider, endpoint, request, response)` - Audit logging
  - [ ] Method: `retryWithBackoff(fn, maxRetries)` - Retry logic
  - [ ] Error handling: Rate limits, timeouts, API errors
  - [ ] Unit tests: Config loading, logging, retry
  - **Status**: Not Started
  - **Blockers**: None
  - **Notes**: -

- [ ] **Day 5**: Twilio SMS Service
  - [ ] Implement `TwilioService.js` extends BaseIntegrationService
  - [ ] Method: `sendSMS(to, message)` - Send SMS
  - [ ] Method: `sendBulkSMS(recipients, message)` - Bulk SMS
  - [ ] Method: `getDeliveryStatus(messageSid)` - Check delivery
  - [ ] Webhook endpoint: `/api/webhooks/twilio/status` - Delivery callbacks
  - [ ] Template system: SMS templates dengan placeholders
  - [ ] Unit tests: SMS sending, templates, webhooks
  - **Status**: Not Started
  - **Blockers**: Need Twilio account & credentials
  - **Notes**: -

### Week 2: Payment & Messaging (Days 6-10)
- [ ] **Day 6-7**: Midtrans Payment Gateway
  - [ ] Implement `MidtransService.js` extends BaseIntegrationService
  - [ ] Method: `createTransaction(orderDetails)` - Create payment link
  - [ ] Method: `checkStatus(orderId)` - Check payment status
  - [ ] Method: `refund(orderId, amount)` - Process refund
  - [ ] Webhook endpoint: `/api/webhooks/midtrans/notification` - Payment callbacks
  - [ ] Signature verification untuk webhook security
  - [ ] Update Transaction model dengan `midtrans_order_id`, `payment_link`
  - [ ] Unit tests: Payment creation, status check, refund, webhook verification
  - **Status**: Not Started
  - **Blockers**: Need Midtrans account & credentials
  - **Notes**: -

- [ ] **Day 8**: WhatsApp & Email Services
  - [ ] Implement `WhatsAppService.js` - WhatsApp Business API
  - [ ] Method: `sendMessage(to, message)` - Send WhatsApp message
  - [ ] Method: `sendTemplate(to, templateName, params)` - Send template message
  - [ ] Implement `EmailService.js` - Nodemailer wrapper
  - [ ] Method: `sendEmail(to, subject, body)` - Send email
  - [ ] Method: `sendTemplateEmail(to, templateName, data)` - Template email
  - [ ] Template storage: Email templates di database atau files
  - [ ] Unit tests: WhatsApp, Email sending
  - **Status**: Not Started
  - **Blockers**: Need WhatsApp Business API access
  - **Notes**: -

- [ ] **Day 9**: Notification Queue Service
  - [ ] Implement `NotificationQueueService.js`
  - [ ] Method: `enqueue(type, recipient, message)` - Add to queue
  - [ ] Method: `processBatch()` - Process queued notifications
  - [ ] Priority system: urgent, normal, low
  - [ ] Rate limiting: Max 10 SMS/minute per tenant
  - [ ] Batch processing: Process 50 notifications per batch
  - [ ] Unit tests: Queue operations, rate limiting
  - **Status**: Not Started
  - **Blockers**: None
  - **Notes**: -

- [ ] **Day 10**: Scheduled Jobs Setup
  - [ ] Install `node-cron` atau `agenda`
  - [ ] Job: Membership expiry reminder (7 days before)
  - [ ] Job: Payment reminder (overdue payments)
  - [ ] Job: Transaction sequence reset (monthly)
  - [ ] Job: Notification queue processor (every 1 minute)
  - [ ] Job monitoring: Log execution, failures
  - [ ] Unit tests: Job scheduling, execution
  - **Status**: Not Started
  - **Blockers**: None
  - **Notes**: -

### Week 3: Integration & Testing (Days 11-15)
- [ ] **Day 11-12**: Controller Integration
  - [ ] Integration config endpoints: CRUD untuk tenant configs
  - [ ] Notification endpoints: Manual send SMS/email/WhatsApp
  - [ ] Payment endpoints: Create Midtrans payment link
  - [ ] Webhook handlers: Twilio, Midtrans callbacks
  - [ ] CASL permissions: `manage:integrations`, `send:notifications`
  - [ ] Role assignments: Admin only untuk integration config
  - **Status**: Not Started
  - **Blockers**: None
  - **Notes**: -

- [ ] **Day 13**: End-to-End Testing
  - [ ] Test SMS: Membership payment receipt SMS
  - [ ] Test WhatsApp: Membership expiry reminder
  - [ ] Test Email: Invoice email dengan PDF attachment
  - [ ] Test Midtrans: Payment flow (create → pay → webhook → verify)
  - [ ] Test scheduled jobs: Expiry reminder execution
  - [ ] Test notification queue: Bulk notifications (100 recipients)
  - [ ] Test error scenarios: Invalid credentials, rate limits, timeouts
  - **Status**: Not Started
  - **Blockers**: Need sandbox/test credentials
  - **Notes**: -

- [ ] **Day 14**: Security & Compliance
  - [ ] Credential encryption: Test encryption/decryption
  - [ ] Webhook signature verification: Test forged webhooks
  - [ ] Rate limiting: Test burst requests
  - [ ] Audit logging: Verify all API calls logged
  - [ ] PII handling: Mask phone numbers di logs
  - [ ] GDPR compliance: Data retention policies
  - **Status**: Not Started
  - **Blockers**: None
  - **Notes**: -

- [ ] **Day 15**: Documentation & Deployment
  - [ ] Integration setup guide: How to add Twilio, Midtrans, WhatsApp
  - [ ] API documentation: All endpoints dengan examples
  - [ ] Webhook documentation: Callback formats, security
  - [ ] Template documentation: SMS, email, WhatsApp templates
  - [ ] Scheduled jobs documentation: Job schedules, monitoring
  - [ ] Deploy ke staging
  - [ ] UAT: Real SMS, email, payment test
  - **Status**: Not Started
  - **Blockers**: None
  - **Notes**: -

---

## 📝 Detailed Task Breakdown

### Database Models (3 models)
- [ ] **IntegrationConfig**
  - `tenant_id` (FK to Tenant)
  - `provider` (ENUM: 'twilio', 'midtrans', 'whatsapp', 'email')
  - `credentials` (JSONB, encrypted)
  - `is_active` (BOOLEAN)
  - `settings` (JSONB, provider-specific settings)
  
- [ ] **IntegrationLog**
  - `tenant_id` (FK to Tenant)
  - `provider` (VARCHAR)
  - `endpoint` (VARCHAR)
  - `request_data` (JSONB)
  - `response_data` (JSONB)
  - `status_code` (INTEGER)
  - `duration_ms` (INTEGER)
  - `created_at` (TIMESTAMP)
  
- [ ] **NotificationQueue**
  - `tenant_id` (FK to Tenant)
  - `type` (ENUM: 'sms', 'email', 'whatsapp')
  - `recipient` (VARCHAR)
  - `message` (TEXT)
  - `priority` (ENUM: 'urgent', 'normal', 'low')
  - `status` (ENUM: 'pending', 'processing', 'sent', 'failed')
  - `retry_count` (INTEGER)
  - `scheduled_at` (TIMESTAMP)
  - `sent_at` (TIMESTAMP)

### Service Implementations (6 services)
- [ ] BaseIntegrationService (abstract)
- [ ] TwilioService (SMS)
- [ ] MidtransService (Payment)
- [ ] WhatsAppService (Messaging)
- [ ] EmailService (Email)
- [ ] NotificationQueueService (Queue management)

### Scheduled Jobs (4 jobs)
- [ ] **Membership Expiry Reminder** (Daily at 09:00)
  - Query: Memberships expiring in 7 days
  - Action: Send SMS + WhatsApp notification
  
- [ ] **Payment Reminder** (Daily at 10:00)
  - Query: Overdue payments (> 3 days)
  - Action: Send email reminder
  
- [ ] **Transaction Sequence Reset** (Monthly at 00:00)
  - Query: All sequences dengan reset_policy = 'monthly'
  - Action: Call SequenceService.resetSequence()
  
- [ ] **Notification Queue Processor** (Every 1 minute)
  - Query: Pending notifications (status = 'pending')
  - Action: Process batch (50 notifications)
  - Rate limiting: Max 10 SMS/minute per tenant

### Webhook Endpoints (2 webhooks)
- [ ] **POST /api/webhooks/twilio/status**
  - Payload: Twilio delivery status callback
  - Action: Update NotificationQueue status
  - Security: Validate Twilio signature
  
- [ ] **POST /api/webhooks/midtrans/notification**
  - Payload: Midtrans payment notification
  - Action: Update Transaction payment_status
  - Security: Validate Midtrans signature

### Testing Coverage
- [ ] Unit tests: Each service (6 services)
- [ ] Unit tests: Encryption/decryption
- [ ] Unit tests: Retry logic, error handling
- [ ] Integration tests: SMS sending (sandbox)
- [ ] Integration tests: Payment flow (sandbox)
- [ ] Integration tests: Email sending (test SMTP)
- [ ] Integration tests: Webhook callbacks
- [ ] Integration tests: Scheduled jobs
- [ ] Load tests: 100 bulk notifications
- [ ] Security tests: Webhook signature verification

---

## 🐛 Issues & Blockers

### Current Blockers
- **Twilio Account**: Need production credentials atau sandbox account
  - Action: Setup Twilio account sebelum Day 5
  - Owner: TBD
  
- **Midtrans Account**: Need merchant account untuk staging
  - Action: Register Midtrans merchant sebelum Day 6
  - Owner: TBD
  
- **WhatsApp Business API**: Need approved business account
  - Action: Apply for WhatsApp Business API access (2-4 weeks approval)
  - Owner: TBD

### Potential Risks
- **Rate Limits**: Twilio, WhatsApp have API rate limits
  - Mitigation: Implement queue system, retry dengan backoff
  - Monitoring: Track rate limit errors, alert admin
  
- **Webhook Delivery Failures**: Third-party webhooks may fail/timeout
  - Mitigation: Fallback ke polling untuk status checks
  - Testing: Simulate webhook failures
  
- **Credential Leakage**: Sensitive credentials di logs/errors
  - Mitigation: Mask credentials di all logs, use encryption
  - Testing: Audit log output untuk PII
  
- **Payment Gateway Downtime**: Midtrans API down
  - Mitigation: Graceful error handling, retry later
  - Monitoring: Health check endpoints
  
- **SMS Delivery Failures**: Invalid phone numbers, carrier issues
  - Mitigation: Phone number validation, delivery status tracking
  - Testing: Test dengan invalid numbers

### Resolved Issues
- None

---

## 📊 Metrics & KPIs

### Performance Targets
- [ ] SMS delivery success rate > 95%
- [ ] Email delivery success rate > 98%
- [ ] Payment webhook processing time < 2 seconds
- [ ] Notification queue processing < 5 seconds per batch (50 items)
- [ ] Scheduled job execution time < 30 seconds
- [ ] Test coverage > 75%

### Current Metrics
- SMS delivery rate: Not measured yet
- Email delivery rate: Not measured yet
- Webhook processing time: Not measured yet
- Queue processing time: Not measured yet
- Job execution time: Not measured yet
- Test coverage: 0%

---

## 🔄 Daily Updates

### 2025-11-22 (Example format)
- **Progress**: Not started yet (depends on all previous phases)
- **Completed**: Planning documentation finalized
- **Next**: Register third-party accounts (Twilio, Midtrans, WhatsApp)
- **Blockers**: Third-party accounts not setup
- **Notes**: WhatsApp Business API may take 2-4 weeks approval

---

## ✅ Definition of Done

- [ ] All database models created and tested
- [ ] All integration services implemented (6 services)
- [ ] Encryption service implemented dan tested
- [ ] All webhook endpoints implemented
- [ ] All scheduled jobs implemented dan tested
- [ ] Notification queue system working
- [ ] All controllers implemented
- [ ] CASL permissions configured
- [ ] All tests passing (unit + integration + load + security)
- [ ] Credential encryption verified
- [ ] Webhook signature verification tested
- [ ] API documentation complete
- [ ] Integration setup guide complete
- [ ] Deployed to staging dengan real credentials
- [ ] UAT completed: Real SMS, email, payment test
- [ ] Performance metrics met
- [ ] Security audit passed
- [ ] No critical bugs

---

## 📚 References

- [Plan Document](../../plan/PHASE-07-THIRD-PARTY.md)
- [Twilio API Docs](https://www.twilio.com/docs/sms)
- [Midtrans API Docs](https://docs.midtrans.com/)
- [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)
- [Nodemailer Docs](https://nodemailer.com/)
- [node-cron Docs](https://www.npmjs.com/package/node-cron)

---

## 🔗 Dependencies

### Upstream Dependencies (Must Complete First)
- ✅ Fase 1-6: All previous phases (needs transactions, memberships, payments untuk notifications)

### Downstream Dependencies (Blocks These)
- None (final phase)

---

## 🔐 Security Considerations

### Credential Storage
```javascript
// Example encryption
const crypto = require('crypto');

function encryptCredentials(credentials, tenantKey) {
  const cipher = crypto.createCipheriv('aes-256-cbc', tenantKey, iv);
  let encrypted = cipher.update(JSON.stringify(credentials), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

function decryptCredentials(encryptedData, tenantKey) {
  const decipher = crypto.createDecipheriv('aes-256-cbc', tenantKey, iv);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted);
}
```

### Webhook Signature Verification
```javascript
// Twilio signature verification
const crypto = require('crypto');

function verifyTwilioSignature(signature, url, params, authToken) {
  const data = Object.keys(params).sort().map(key => key + params[key]).join('');
  const hmac = crypto.createHmac('sha1', authToken);
  hmac.update(url + data);
  const expectedSignature = hmac.digest('base64');
  return signature === expectedSignature;
}

// Midtrans signature verification
function verifyMidtransSignature(orderId, statusCode, grossAmount, serverKey) {
  const input = orderId + statusCode + grossAmount + serverKey;
  const hash = crypto.createHash('sha512').update(input).digest('hex');
  return hash;
}
```

---

## 💡 Integration Examples

### Example 1: Membership Payment Receipt SMS
```javascript
// After payment success
await TwilioService.sendSMS(
  member.phone,
  `Terima kasih ${member.name}! Pembayaran membership ${membership.type} sebesar Rp ${amount} telah diterima. Berlaku hingga ${expiryDate}.`
);
```

### Example 2: Midtrans Payment Link
```javascript
// Create payment link untuk combined transaction
const orderDetails = {
  order_id: transaction.invoice_number,
  gross_amount: transaction.total_amount,
  customer_details: {
    first_name: customer.name,
    email: customer.email,
    phone: customer.phone
  }
};

const paymentLink = await MidtransService.createTransaction(orderDetails);
// Return: https://app.midtrans.com/snap/v2/vtweb/xxx
```

### Example 3: Membership Expiry Reminder Job
```javascript
// Scheduled job (daily at 09:00)
cron.schedule('0 9 * * *', async () => {
  const expiringMemberships = await Membership.findAll({
    where: {
      end_date: {
        [Op.between]: [today, sevenDaysFromNow]
      }
    },
    include: [Member]
  });
  
  for (const membership of expiringMemberships) {
    await NotificationQueueService.enqueue(
      'whatsapp',
      membership.Member.phone,
      `Halo ${membership.Member.name}, membership Anda akan berakhir pada ${membership.end_date}. Segera perpanjang!`,
      'normal'
    );
  }
});
```

---

**Last Updated**: 2025-11-22  
**Updated By**: System (Initial creation)
