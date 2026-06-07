# 🏢 SaaS Application Flow - Gym Membership Management

## 📋 Table of Contents
- [Overview](#overview)
- [User Journey](#user-journey)
- [System Architecture](#system-architecture)
- [Core Modules](#core-modules)
- [Complete Flow Diagrams](#complete-flow-diagrams)
- [Next Steps & Recommendations](#next-steps--recommendations)

---

## 🎯 Overview

Aplikasi ini adalah **Multi-Tenant SaaS** untuk manajemen gym membership dengan fitur:
- ✅ Multi-tenancy (setiap gym/tenant terpisah)
- ✅ Subscription-based billing
- ✅ Role-based access control (RBAC)
- ✅ Member & membership management
- ✅ Payment & invoice tracking
- ✅ Feature gating per subscription plan

---

## 👥 User Journey

### 1️⃣ **Super Admin Journey**
```
┌─────────────────────────────────────────────────────────┐
│ SUPER ADMIN (Platform Owner)                            │
└─────────────────────────────────────────────────────────┘
                          │
    ┌─────────────────────┼─────────────────────┐
    ▼                     ▼                     ▼
┌─────────┐         ┌──────────┐         ┌──────────┐
│ Manage  │         │ Manage   │         │ Monitor  │
│ Tenants │         │ Plans    │         │ Platform │
└─────────┘         └──────────┘         └──────────┘
    │                     │                     │
    ├─ Create tenant     ├─ Create plans      ├─ View analytics
    ├─ Activate tenant   ├─ Set pricing       ├─ System logs
    ├─ Suspend tenant    ├─ Define features   ├─ Health check
    └─ Delete tenant     └─ Manage sortOrder  └─ Audit logs
```

**Super Admin dapat:**
- Membuat dan mengelola subscription plans
- Membuat tenant baru (gym baru)
- Melihat semua tenant dan subscription
- Mengatur pricing dan features untuk setiap plan
- Monitor platform health

---

### 2️⃣ **Tenant Registration & Onboarding**
```
┌──────────────────────────────────────────────────────────────┐
│ TENANT REGISTRATION FLOW                                     │
└──────────────────────────────────────────────────────────────┘

1. Registration
   └─> POST /api/v1/auth/register
       Input: name, email, password, tenantName, domain
       Output: User + Tenant created
       Status: Tenant with Trial (optional)

2. Email Verification (if enabled)
   └─> Verify email to activate account

3. Login & Dashboard Access
   └─> POST /api/v1/auth/login
       Returns: JWT Token + User Info + Tenant Info

4. Choose Subscription Plan
   └─> GET /api/v1/billing/plans
       Display available plans

5. Create Subscription
   └─> POST /api/v1/billing/subscriptions
       Input: tenantId, planId, paymentMethod
       Status: PENDING (waiting for payment)

6. Payment Process
   └─> POST /api/v1/billing/invoices (create invoice)
   └─> POST /api/v1/billing/payments (process payment)
       Status: Payment processed

7. Activate Subscription
   └─> POST /api/v1/billing/subscriptions/:id/activate
       Status: ACTIVE
       Result: Access granted to features
```

---

### 3️⃣ **Gym Owner/Admin Journey**
```
┌─────────────────────────────────────────────────────────┐
│ GYM OWNER/ADMIN (Tenant Admin)                          │
└─────────────────────────────────────────────────────────┘
                          │
    ┌─────────────────────┼─────────────────────┐
    ▼                     ▼                     ▼
┌──────────┐       ┌─────────────┐      ┌──────────────┐
│ Settings │       │ Manage Team │      │ Manage       │
│ & Config │       │ & Members   │      │ Subscription │
└──────────┘       └─────────────┘      └──────────────┘
    │                     │                     │
    ├─ Tenant info       ├─ Add users          ├─ View plan
    ├─ Working hours     ├─ Assign roles       ├─ Renew subs
    ├─ Currency/TZ       ├─ Add members        ├─ View invoices
    └─ Theme settings    ├─ Create membership  └─ Payment history
                         └─ Track payments
```

**Gym Owner dapat:**
- Setup gym profile (logo, address, working hours)
- Invite staff (receptionist, trainer, etc.)
- Manage members & memberships
- View subscription & billing info
- Renew subscription

---

### 4️⃣ **Staff Journey (Receptionist/Trainer)**
```
┌─────────────────────────────────────────────────────────┐
│ STAFF (Receptionist/Trainer)                            │
└─────────────────────────────────────────────────────────┘
                          │
    ┌─────────────────────┼─────────────────────┐
    ▼                     ▼                     ▼
┌──────────┐       ┌─────────────┐      ┌──────────────┐
│ Members  │       │ Memberships │      │ Attendance   │
│ (CRUD)   │       │ (CRUD)      │      │ & Check-in   │
└──────────┘       └─────────────┘      └──────────────┘
    │                     │                     │
    ├─ Add member        ├─ Create new         ├─ Check-in
    ├─ Update info       ├─ Renew              ├─ View history
    ├─ Search            ├─ Suspend            └─ Reports
    └─ View history      └─ Track payments
```

**Staff dapat:**
- Manage member data
- Create & renew memberships
- Process payments
- Check-in members
- View reports (based on permission)

---

## 🏗️ System Architecture

### **Multi-Tenant Architecture**
```
┌────────────────────────────────────────────────────────────┐
│                     APPLICATION LAYER                       │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │  Tenant A   │  │  Tenant B   │  │  Tenant C   │       │
│  │  (Gym 1)    │  │  (Gym 2)    │  │  (Gym 3)    │       │
│  └─────────────┘  └─────────────┘  └─────────────┘       │
│         │                │                │                 │
│         └────────────────┴────────────────┘                │
│                          │                                  │
├──────────────────────────┼──────────────────────────────────┤
│                   DATA ISOLATION                            │
│                          │                                  │
│  ┌───────────────────────▼───────────────────────────┐     │
│  │         Shared Database (PostgreSQL)              │     │
│  │                                                    │     │
│  │  • Tenant A Data (filtered by tenantId)          │     │
│  │  • Tenant B Data (filtered by tenantId)          │     │
│  │  • Tenant C Data (filtered by tenantId)          │     │
│  └────────────────────────────────────────────────────┘     │
└────────────────────────────────────────────────────────────┘
```

### **Authentication & Authorization Flow**
```
┌─────────────────────────────────────────────────────────────┐
│ REQUEST → JWT Middleware → CASL Middleware → Controller    │
└─────────────────────────────────────────────────────────────┘
                │                    │
                ▼                    ▼
         ┌──────────┐         ┌────────────┐
         │ Validate │         │ Check      │
         │ Token    │         │ Permission │
         └──────────┘         └────────────┘
                │                    │
                ▼                    ▼
         Extract User          Check Feature
         Extract Tenant        Check Role
         Inject req.user       Allow/Deny
```

---

## 🔧 Core Modules

### **1. Authentication & User Management**
**Status: ✅ Implemented**

```
Files:
├── controllers/auth/authController.js
├── controllers/user/userController.js
├── middlewares/authMiddleware.js
└── models/user.js

Features:
✅ Register (with tenant creation)
✅ Login (JWT-based)
✅ Password reset
✅ Role-based access (SuperAdmin, Admin, User)
✅ User CRUD operations
```

**API Endpoints:**
```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
GET    /api/v1/users
POST   /api/v1/users
PUT    /api/v1/users/:id
DELETE /api/v1/users/:id
```

---

### **2. Tenant Management**
**Status: ✅ Implemented**

```
Files:
├── controllers/tenant/tenantController.js
├── models/tenant.js
└── routes/tenant/tenant.routes.js

Features:
✅ Tenant CRUD
✅ Tenant settings (currency, timezone, working hours, theme)
✅ Multi-tenant data isolation
✅ Subscription linking
```

**API Endpoints:**
```
GET    /api/v1/tenants
GET    /api/v1/tenants/:id
POST   /api/v1/tenants
PUT    /api/v1/tenants/:id
DELETE /api/v1/tenants/:id
PATCH  /api/v1/tenants/settings
```

**What's Working:**
- ✅ Create tenant with basic info
- ✅ Update tenant settings (currency, timezone, theme)
- ✅ Link tenant to subscription

**Recent Fix:**
- ✅ Fixed tenant settings update (currency, timezone now properly saved)

---

### **3. Subscription & Billing**
**Status: ✅ Implemented**

```
Files:
├── controllers/subscription/subscriptionController.js
├── controllers/subscription/paymentController.js
├── models/subscriptionPlan.js
├── models/subscription.js
├── models/invoice.js
├── models/payment.js
├── models/sequence.js
└── services/sequenceService.js

Features:
✅ Subscription plans management
✅ Subscription lifecycle (pending → active → expired)
✅ Invoice generation with auto-number
✅ Payment processing
✅ Subscription renewal
✅ Race-condition safe invoice numbering
```

**API Endpoints:**
```
# Subscription Plans
GET    /api/v1/billing/plans
GET    /api/v1/billing/plans/:id
POST   /api/v1/billing/plans (SuperAdmin)
PUT    /api/v1/billing/plans/:id (SuperAdmin)
DELETE /api/v1/billing/plans/:id (SuperAdmin)

# Subscriptions
POST   /api/v1/billing/subscriptions
GET    /api/v1/billing/subscriptions/tenant/:tenantId
PUT    /api/v1/billing/subscriptions/:id
POST   /api/v1/billing/subscriptions/:id/activate
POST   /api/v1/billing/subscriptions/:id/renew
DELETE /api/v1/billing/subscriptions/:id

# Invoices
POST   /api/v1/billing/invoices
GET    /api/v1/billing/invoices
GET    /api/v1/billing/invoices/:id
PUT    /api/v1/billing/invoices/:id/status

# Payments
POST   /api/v1/billing/payments
GET    /api/v1/billing/payments
GET    /api/v1/billing/payments/:id
POST   /api/v1/billing/payments/:id/refund
```

**Subscription Flow:**
```
1. Create Subscription (status: pending)
2. Generate Invoice (auto-number: INV-202511-000001)
3. Process Payment
4. Activate Subscription (status: active)
```

**Recent Fixes:**
- ✅ Auto-generate invoice number using sequence table
- ✅ Race-condition prevention with database locking
- ✅ Prevent duplicate subscriptions
- ✅ Proper validation on subscription creation
- ✅ Subscription activation endpoint

---

### **4. Member & Membership Management**
**Status: ✅ Implemented**

```
Files:
├── controllers/gym/memberController.js
├── controllers/gym/membershipController.js
├── models/member.js
├── models/membership.js
└── models/membershipType.js

Features:
✅ Member CRUD
✅ Membership types
✅ Membership creation & renewal
✅ Membership status tracking
```

**API Endpoints:**
```
# Members
GET    /api/v1/gym/members
GET    /api/v1/gym/members/:id
POST   /api/v1/gym/members
PUT    /api/v1/gym/members/:id
DELETE /api/v1/gym/members/:id

# Memberships
GET    /api/v1/gym/memberships
GET    /api/v1/gym/memberships/:id
POST   /api/v1/gym/memberships
PUT    /api/v1/gym/memberships/:id
DELETE /api/v1/gym/memberships/:id

# Membership Types
GET    /api/v1/gym/membership-types
POST   /api/v1/gym/membership-types
PUT    /api/v1/gym/membership-types/:id
DELETE /api/v1/gym/membership-types/:id
```

---

### **5. Permission & Feature Management**
**Status: ✅ Implemented**

```
Files:
├── middlewares/caslMiddleware.js
├── middlewares/featureGateMiddleware.js
├── models/role.js
├── models/permission.js
└── models/feature.js

Features:
✅ Role-based permissions (CASL)
✅ Feature gating per subscription plan
✅ Dynamic permission checking
```

**How it Works:**
```javascript
// Check permission
router.get('/members', 
  authenticate, 
  authorizeCasl('read', 'Member'), // ← Check permission
  getMembers
);

// Check feature access
router.post('/members', 
  authenticate,
  requireFeature('member_management'), // ← Check feature
  createMember
);
```

---

### **6. Payment Management**
**Status: ✅ Implemented**

```
Files:
├── controllers/gym/paymentController.js
├── models/payment.js
└── routes/gym/payment.routes.js

Features:
✅ Payment tracking
✅ Payment methods (cash, credit_card, transfer)
✅ Payment history
✅ Refund support
```

---

### **7. Audit & Logging**
**Status: ✅ Implemented**

```
Files:
├── middlewares/auditMiddleware.js
├── middlewares/loggerMiddleware.js
├── utils/logger.js
└── models/auditLog.js

Features:
✅ Audit trail for all actions
✅ Security logging
✅ Request/response logging
✅ Error tracking
```

---

## 📊 Complete Flow Diagrams

### **Flow 1: New Gym Registration**
```
┌─────────────────────────────────────────────────────────────┐
│ NEW GYM OWNER REGISTRATION                                  │
└─────────────────────────────────────────────────────────────┘

1. Landing Page
   │
   ▼
2. Register Form
   ├─ Name
   ├─ Email
   ├─ Password
   ├─ Gym Name
   └─ Domain
   │
   ▼
3. POST /auth/register
   ├─ Create Tenant (gym)
   ├─ Create User (owner, admin role)
   └─ Link user to tenant
   │
   ▼
4. Email Verification (optional)
   │
   ▼
5. Login
   │
   ▼
6. Dashboard (Trial or Select Plan)
   │
   ├─ Option A: Start Trial
   │   └─> Access with limited features
   │
   └─ Option B: Choose Plan
       │
       ▼
   7. Select Subscription Plan
       │
       ▼
   8. Create Subscription (status: pending)
       │
       ▼
   9. Payment Page
       ├─ Generate Invoice
       └─ Process Payment
       │
       ▼
   10. Activate Subscription
       │
       ▼
   11. Full Access Granted ✅
```

---

### **Flow 2: Member Registration & Membership**
```
┌─────────────────────────────────────────────────────────────┐
│ MEMBER REGISTRATION & MEMBERSHIP CREATION                   │
└─────────────────────────────────────────────────────────────┘

Staff Login
   │
   ▼
Dashboard → Members → Add New Member
   │
   ▼
Member Registration Form
   ├─ Name
   ├─ Email
   ├─ Phone
   ├─ Address
   └─ Emergency contact
   │
   ▼
POST /gym/members
   └─ Member Created ✅
   │
   ▼
Create Membership
   ├─ Select Membership Type
   ├─ Start Date
   ├─ Duration
   └─ Payment
   │
   ▼
POST /gym/memberships
   └─ Membership Created ✅
   │
   ▼
Generate Invoice
   │
   ▼
Process Payment
   ├─ Cash
   ├─ Card
   └─ Transfer
   │
   ▼
Membership Active ✅
```

---

### **Flow 3: Subscription Renewal**
```
┌─────────────────────────────────────────────────────────────┐
│ SUBSCRIPTION RENEWAL FLOW                                   │
└─────────────────────────────────────────────────────────────┘

Subscription Near Expiry
   │
   ▼
Email Reminder (optional)
   │
   ▼
Owner Login → Subscription → Renew
   │
   ▼
POST /billing/subscriptions/:id/renew
   ├─ Create new subscription (status: pending)
   └─ Keep old subscription active until payment
   │
   ▼
Generate Invoice
   │
   ▼
Payment Page
   │
   ▼
POST /billing/payments
   │
   ▼
POST /billing/subscriptions/:newId/activate
   ├─ New subscription → ACTIVE
   └─ Old subscription → EXPIRED
   │
   ▼
Continued Access ✅
```

---

### **Flow 4: Daily Operations**
```
┌─────────────────────────────────────────────────────────────┐
│ DAILY GYM OPERATIONS                                        │
└─────────────────────────────────────────────────────────────┘

Staff Login
   │
   ├─> Check-in Members
   │   └─ Scan card/Enter ID
   │       └─ Verify membership active
   │           └─ Record attendance
   │
   ├─> Register New Member
   │   └─ Follow Member Registration Flow
   │
   ├─> Renew Membership
   │   ├─ Find member
   │   ├─ Create new membership
   │   └─ Process payment
   │
   ├─> View Reports
   │   ├─ Member stats
   │   ├─ Revenue
   │   └─ Attendance
   │
   └─> Manage Payments
       ├─ Record payment
       ├─ Generate receipt
       └─ Update records
```

---

## 🎯 Next Steps & Recommendations

### **Phase 1: Core Completion (High Priority) 🔴**

#### 1.1 Payment Gateway Integration
**Why:** Currently using mock payments
```
TODO:
├── Integrate Stripe/Midtrans
├── Webhook handlers
├── Payment status sync
└── Refund processing
```

#### 1.2 Email Notifications
**Why:** User engagement & automation
```
TODO:
├── Setup email service (SendGrid/AWS SES)
├── Email templates
│   ├── Welcome email
│   ├── Subscription reminder
│   ├── Invoice sent
│   ├── Payment received
│   └── Membership expiry
└── Queue system (Bull/BullMQ)
```

#### 1.3 Frontend Dashboard
**Why:** Currently no UI
```
TODO:
├── Super Admin Dashboard
│   ├── Tenant management
│   ├── Plan management
│   └── Platform analytics
│
├── Gym Owner Dashboard
│   ├── Settings
│   ├── Member overview
│   ├── Revenue stats
│   └── Subscription management
│
└── Staff Dashboard
    ├── Member check-in
    ├── Member management
    └── Membership creation
```

---

### **Phase 2: Feature Enhancement (Medium Priority) 🟡**

#### 2.1 Reporting & Analytics
```
TODO:
├── Dashboard widgets
├── Revenue reports
├── Member growth charts
├── Attendance tracking
└── Export to Excel/PDF
```

#### 2.2 Attendance & Check-in System
```
TODO:
├── QR Code check-in
├── RFID card support
├── Attendance history
├── Access control rules
└── Notification on check-in
```

#### 2.3 Class/Session Management
```
TODO:
├── Class scheduling
├── Trainer assignment
├── Booking system
├── Capacity management
└── Waitlist support
```

#### 2.4 Advanced Member Features
```
TODO:
├── Member portal (self-service)
├── Online booking
├── Payment history view
├── Profile management
└── Mobile app (optional)
```

---

### **Phase 3: Optimization & Scale (Low Priority) 🟢**

#### 3.1 Performance Optimization
```
TODO:
├── Database indexing review
├── Query optimization
├── Caching (Redis)
├── CDN for assets
└── Load testing
```

#### 3.2 Advanced Features
```
TODO:
├── Multi-location support (franchise)
├── Inventory management
├── POS integration
├── WhatsApp/SMS notifications
└── Advanced reporting (BI tools)
```

#### 3.3 Mobile Apps
```
TODO:
├── Mobile app for members
├── Mobile app for staff
└── Push notifications
```

---

### **Phase 4: Additional Modules (Future)**

#### 4.1 Marketing & CRM
```
TODO:
├── Lead management
├── Email campaigns
├── Referral program
├── Loyalty points
└── Promotions/Discounts
```

#### 4.2 Trainer Management
```
TODO:
├── Trainer profiles
├── Schedule management
├── Commission tracking
└── Performance metrics
```

#### 4.3 Equipment Management
```
TODO:
├── Equipment tracking
├── Maintenance schedule
├── Usage logs
└── Inventory alerts
```

---

## 🗺️ Recommended Development Roadmap

### **Week 1-2: Foundation**
- [ ] Setup frontend project (React/Next.js)
- [ ] Implement authentication UI
- [ ] Create basic layouts & navigation
- [ ] Connect to backend APIs

### **Week 3-4: Super Admin**
- [ ] Tenant management UI
- [ ] Subscription plan management
- [ ] Platform dashboard
- [ ] Analytics & reports

### **Week 5-6: Gym Owner Dashboard**
- [ ] Settings & configuration
- [ ] Subscription management
- [ ] Billing & invoices
- [ ] Team management

### **Week 7-8: Staff Operations**
- [ ] Member management UI
- [ ] Membership creation flow
- [ ] Payment processing UI
- [ ] Check-in system

### **Week 9-10: Polish & Test**
- [ ] Bug fixes
- [ ] UI/UX improvements
- [ ] Testing (unit + integration)
- [ ] Documentation

### **Week 11-12: Deployment**
- [ ] Setup production environment
- [ ] Deploy backend (AWS/DigitalOcean)
- [ ] Deploy frontend (Vercel/Netlify)
- [ ] Setup monitoring & logging
- [ ] Beta testing

---

## 📝 Current Status Summary

### ✅ **Completed Modules**
- Authentication & User Management
- Tenant Management
- Subscription & Billing System
- Member & Membership Management
- Role & Permission System
- Audit Logging
- Invoice Auto-numbering (Race-condition safe)

### 🚧 **In Progress**
- Payment Gateway Integration
- Frontend Dashboard

### ❌ **Not Started**
- Email Notifications
- Reporting & Analytics
- Class Management
- Mobile Apps
- Advanced CRM Features

---

## 🎯 Decision Points

### **What to Build Next?**

**Option A: Focus on MVP (Recommended)**
```
Priority Order:
1. Payment Gateway Integration (Stripe/Midtrans)
2. Super Admin Dashboard (manage tenants & plans)
3. Gym Owner Dashboard (settings & members)
4. Staff Dashboard (daily operations)
5. Email Notifications (basic)
```
**Time: ~3 months**
**Result: Functional SaaS ready for beta testing**

**Option B: Go Full Feature**
```
Priority Order:
1. Complete Option A
2. Reporting & Analytics
3. Class Management
4. Member Portal
5. Mobile Apps
```
**Time: ~6 months**
**Result: Enterprise-grade SaaS**

**Option C: Niche Focus**
```
Pick specific niche first:
- Small gym focus (simple, fast setup)
- Franchise focus (multi-location)
- Boutique studio focus (class-based)
```

---

## 💡 Key Recommendations

### 1. **Start with Super Admin Dashboard**
Why: You need to be able to manage tenants and plans before getting customers.

### 2. **Integrate Real Payment Gateway Early**
Why: Payment is core to SaaS business model. Test early.

### 3. **Build Mobile-Responsive from Day 1**
Why: Many gym staff use tablets/phones.

### 4. **Focus on User Onboarding**
Why: First impression matters. Make signup & setup easy.

### 5. **Setup Analytics Early**
Why: You need data to make decisions. Track everything.

### 6. **Create Demo Data Generator**
Why: Makes testing and demos much easier.

---

## 📞 Support & Resources

### **Documentation Files**
```
docs/
├── SAAS-APPLICATION-FLOW.md (this file)
├── API-DOCUMENTATION.md
├── AUTHENTICATION-ENDPOINTS.md
├── BILLING-SUBSCRIPTION-FRONTEND.md
├── ROLE-PERMISSION-MANAGEMENT.md
└── frontend-integration/
    └── QUICK-START.md
```

### **Testing**
- Postman Collection: `docs/gym-api.postman_collection.json`
- Environment: `docs/gym-api.postman_environment.json`

---

## 🚀 Quick Start Commands

```bash
# Start development server
npm run dev

# Run migrations
npx sequelize-cli db:migrate

# Create new migration
npx sequelize-cli migration:generate --name migration-name

# Test API
# Import Postman collection from docs/
```

---

**Document Version:** 1.0
**Last Updated:** November 22, 2025
**Status:** Living Document (will be updated as features are added)

---

Good luck with your SaaS journey! 🎉
