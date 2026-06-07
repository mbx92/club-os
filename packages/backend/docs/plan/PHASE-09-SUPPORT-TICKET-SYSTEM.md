# 🎫 Support Ticket System - Rancangan Implementasi

**Document Version**: 1.0  
**Created**: November 30, 2025  
**Status**: Planning  
**Priority**: Medium  
**Estimated Development Time**: 7-10 days

---

## 📋 Table of Contents

1. [Overview](#-overview)
2. [Database Schema](#-database-schema)
3. [Status Workflow](#-status-workflow)
4. [File Structure](#-file-structure)
5. [API Endpoints](#-api-endpoints)
6. [Permission Matrix (CASL)](#-permission-matrix-casl)
7. [Feature Registry Update](#-feature-registry-update)
8. [Race Condition Prevention](#-race-condition-prevention)
9. [Notification System](#-notification-system)
10. [Dashboard & Metrics](#-dashboard--metrics)
11. [Implementation Phases](#-implementation-phases)
12. [Checklist Implementasi](#-checklist-implementasi)

---

## 📋 Overview

### Tujuan

Membangun sistem support ticket yang memungkinkan tenant melaporkan masalah, bug, atau permintaan fitur ke platform super admin. Sistem ini mendukung:

- ✅ Ticket creation dengan kategori dan prioritas
- ✅ Threaded replies untuk komunikasi dua arah
- ✅ Status workflow dengan SLA tracking
- ✅ Notifikasi email untuk status changes
- ⚠️ Optional: File attachments (Phase 2)

### Scope

| Scope | Included | Notes |
|-------|----------|-------|
| Tenant → Super Admin | ✅ | Primary use case |
| Member → Tenant Admin | ❌ | Future enhancement |
| File Attachments | ⚠️ | Optional phase 2 |
| Email Notifications | ⚠️ | Requires email service |
| SLA Tracking | ✅ | Enterprise plan |

### Key Features

| Feature | Basic | Professional | Enterprise |
|---------|-------|--------------|------------|
| Create Tickets | ✅ | ✅ | ✅ |
| View Own Tickets | ✅ | ✅ | ✅ |
| Priority Support | ❌ | ❌ | ✅ |
| SLA Tracking | ❌ | ❌ | ✅ |
| File Attachments | ❌ | ✅ | ✅ |

---

## 🗂️ Database Schema

### 1. SupportTicket Model

```javascript
// src/models/supportTicket.js
{
  // Primary Key
  id: UUID (PK, default: UUIDV4),
  
  // Tenant Relationship
  tenantId: UUID (FK → Tenants.id, NOT NULL),
  
  // Ticket Identity
  ticketNumber: STRING(50) (UNIQUE per tenant, auto-generated: TKT-YYYYMM-XXXX),
  
  // Content
  subject: STRING(255) (NOT NULL),
  description: TEXT (NOT NULL),
  
  // Classification
  category: ENUM ['bug', 'feature_request', 'billing', 'technical', 'general'],
  priority: ENUM ['low', 'medium', 'high', 'urgent'],
  
  // Status Workflow
  status: ENUM ['open', 'in_progress', 'waiting_response', 'resolved', 'closed'],
  
  // Assignment
  assignedTo: UUID (FK → Users.id, NULLABLE), // Super admin yang handle
  
  // Audit Trail
  createdBy: UUID (FK → Users.id, NOT NULL),
  resolvedAt: DATETIME (NULLABLE),
  resolvedBy: UUID (FK → Users.id, NULLABLE),
  closedAt: DATETIME (NULLABLE),
  closedBy: UUID (FK → Users.id, NULLABLE),
  
  // SLA Tracking (Enterprise)
  expectedResponseAt: DATETIME (NULLABLE),
  firstResponseAt: DATETIME (NULLABLE),
  
  // Race Condition Prevention
  version: INTEGER (default: 0), // Optimistic locking
  
  // Metadata
  metadata: JSONB {
    browser: string,
    os: string,
    appVersion: string,
    screenPath: string,
    customFields: object
  },
  
  // Timestamps
  createdAt: DATETIME,
  updatedAt: DATETIME
}
```

### 2. TicketReply Model

```javascript
// src/models/ticketReply.js
{
  id: UUID (PK),
  ticketId: UUID (FK → SupportTickets.id, NOT NULL, CASCADE),
  
  // Content
  message: TEXT (NOT NULL),
  isInternal: BOOLEAN (default: false), // Internal notes (super admin only)
  
  // Author
  createdBy: UUID (FK → Users.id, NOT NULL),
  
  // Metadata
  metadata: JSONB {
    attachments: [{ filename, url, size, mimeType }]
  },
  
  createdAt: DATETIME,
  updatedAt: DATETIME
}
```

### 3. TicketAttachment Model (Optional - Phase 2)

```javascript
// src/models/ticketAttachment.js
{
  id: UUID (PK),
  ticketId: UUID (FK → SupportTickets.id, NULLABLE),
  replyId: UUID (FK → TicketReplies.id, NULLABLE),
  
  filename: STRING(255),
  originalName: STRING(255),
  mimeType: STRING(100),
  size: INTEGER,
  path: STRING(500), // Storage path
  
  uploadedBy: UUID (FK → Users.id),
  createdAt: DATETIME
}
```

### Database Indexes

```sql
-- SupportTickets
CREATE UNIQUE INDEX idx_tickets_tenant_number ON SupportTickets(tenantId, ticketNumber);
CREATE INDEX idx_tickets_tenant_status ON SupportTickets(tenantId, status);
CREATE INDEX idx_tickets_created_by ON SupportTickets(createdBy);
CREATE INDEX idx_tickets_assigned_to ON SupportTickets(assignedTo);
CREATE INDEX idx_tickets_priority ON SupportTickets(priority, status);
CREATE INDEX idx_tickets_created_at ON SupportTickets(createdAt DESC);

-- TicketReplies
CREATE INDEX idx_replies_ticket ON TicketReplies(ticketId, createdAt);
CREATE INDEX idx_replies_created_by ON TicketReplies(createdBy);
```

### Entity Relationship Diagram

```
┌─────────────┐       ┌──────────────────┐       ┌───────────────┐
│   Tenant    │───1:N─│  SupportTicket   │───1:N─│  TicketReply  │
└─────────────┘       └──────────────────┘       └───────────────┘
                              │                         │
                              │ createdBy               │ createdBy
                              │ assignedTo              │
                              │ resolvedBy              │
                              │ closedBy                │
                              ▼                         ▼
                      ┌──────────────┐          ┌──────────────┐
                      │     User     │          │     User     │
                      └──────────────┘          └──────────────┘
```

---

## 🔄 Status Workflow

### Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        TICKET LIFECYCLE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│   ┌────────┐    assign    ┌─────────────┐   reply    ┌────────┐ │
│   │  OPEN  │─────────────▶│ IN_PROGRESS │───────────▶│WAITING │ │
│   └────────┘              └─────────────┘            │RESPONSE│ │
│       │                         │                    └────────┘ │
│       │                         │                        │      │
│       │ auto-close              │ resolve                │ reply│
│       │ (30 days)               ▼                        │      │
│       │                   ┌──────────┐◀──────────────────┘      │
│       │                   │ RESOLVED │                          │
│       │                   └──────────┘                          │
│       │                         │                               │
│       │                         │ confirm/auto (7 days)         │
│       ▼                         ▼                               │
│   ┌────────┐              ┌──────────┐                          │
│   │ CLOSED │◀─────────────│  CLOSED  │                          │
│   │(unused)│              │(resolved)│                          │
│   └────────┘              └──────────┘                          │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Status Definitions

| Status | Description | Next Actions | Who Can Change |
|--------|-------------|--------------|----------------|
| `open` | Ticket baru dibuat, menunggu assignment | Assign, Reply, Close | Super Admin |
| `in_progress` | Sedang ditangani super admin | Reply, Resolve, Waiting | Super Admin |
| `waiting_response` | Menunggu respons dari tenant | Reply (tenant), Close | Tenant / Super Admin |
| `resolved` | Masalah sudah diselesaikan | Close, Reopen | Tenant / Super Admin |
| `closed` | Ticket selesai/ditutup | Reopen (within 7 days) | Ticket Owner |

### Status Transition Matrix

| From ↓ / To → | open | in_progress | waiting_response | resolved | closed |
|---------------|------|-------------|------------------|----------|--------|
| **open** | - | ✅ | ❌ | ❌ | ✅ |
| **in_progress** | ❌ | - | ✅ | ✅ | ✅ |
| **waiting_response** | ❌ | ✅ | - | ✅ | ✅ |
| **resolved** | ❌ | ✅ | ❌ | - | ✅ |
| **closed** | ✅* | ❌ | ❌ | ❌ | - |

*Reopen only within 7 days

### Auto-Close Rules

| Rule | Duration | Action |
|------|----------|--------|
| Ticket tanpa aktivitas | 30 days | Auto-close dengan note |
| Resolved tanpa konfirmasi | 7 days | Auto-close |
| Waiting response | 14 days reminder, 21 days auto-close | Email reminder → Auto-close |

---

## 📁 File Structure

```
src/
├── controllers/
│   └── support/
│       ├── index.js                    # Export aggregator
│       ├── ticketController.js         # CRUD + status operations
│       └── ticketReplyController.js    # Reply operations
│
├── routes/
│   └── support/
│       ├── index.js                    # Route aggregator
│       ├── ticket.routes.js            # Ticket endpoints
│       └── reply.routes.js             # Reply endpoints
│
├── models/
│   ├── supportTicket.js                # SupportTicket model
│   ├── ticketReply.js                  # TicketReply model
│   └── ticketAttachment.js             # (Optional) Attachment model
│
├── migrations/
│   ├── YYYYMMDDHHMMSS-create-support-tickets.js
│   ├── YYYYMMDDHHMMSS-create-ticket-replies.js
│   └── YYYYMMDDHHMMSS-create-ticket-attachments.js  # Optional
│
├── services/
│   ├── ticketService.js                # Business logic
│   ├── ticketNotificationService.js    # Email notifications
│   └── emailService.js                 # Generic email service (new)
│
└── utils/
    ├── casl.js                         # Update: add Ticket permissions
    ├── featureRegistry.js              # Update: add support features
    └── sequenceService.js              # Use for ticketNumber generation
```

---

## 🛣️ API Endpoints

### Ticket Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `POST` | `/api/v1/support/tickets` | Create ticket | Tenant User |
| `GET` | `/api/v1/support/tickets` | List tickets (filtered) | Tenant User / Super Admin |
| `GET` | `/api/v1/support/tickets/:id` | Get ticket detail | Owner / Super Admin |
| `PATCH` | `/api/v1/support/tickets/:id` | Update ticket | Owner (open only) |
| `DELETE` | `/api/v1/support/tickets/:id` | Delete ticket | Super Admin only |
| `POST` | `/api/v1/support/tickets/:id/assign` | Assign to admin | Super Admin |
| `POST` | `/api/v1/support/tickets/:id/status` | Change status | Super Admin |
| `POST` | `/api/v1/support/tickets/:id/resolve` | Mark resolved | Super Admin |
| `POST` | `/api/v1/support/tickets/:id/close` | Close ticket | Super Admin / Owner |
| `POST` | `/api/v1/support/tickets/:id/reopen` | Reopen ticket | Owner (within 7 days) |

### Reply Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `POST` | `/api/v1/support/tickets/:ticketId/replies` | Add reply | Owner / Super Admin |
| `GET` | `/api/v1/support/tickets/:ticketId/replies` | List replies | Owner / Super Admin |
| `PATCH` | `/api/v1/support/tickets/:ticketId/replies/:id` | Edit reply | Author (within 15 min) |
| `DELETE` | `/api/v1/support/tickets/:ticketId/replies/:id` | Delete reply | Super Admin |

### Admin Dashboard Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET` | `/api/v1/admin/support/dashboard` | Ticket stats | Super Admin |
| `GET` | `/api/v1/admin/support/tickets` | All tickets (cross-tenant) | Super Admin |
| `GET` | `/api/v1/admin/support/metrics` | SLA metrics | Super Admin |

### Request/Response Examples

#### Create Ticket

```json
// POST /api/v1/support/tickets
// Request
{
  "subject": "Tidak bisa generate laporan bulanan",
  "description": "Ketika klik tombol generate report, muncul error 500. Sudah coba refresh halaman tapi tetap error.",
  "category": "bug",
  "priority": "high",
  "metadata": {
    "browser": "Chrome 120",
    "os": "Windows 11",
    "screenPath": "/reports/monthly"
  }
}

// Response 201 Created
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "ticketNumber": "TKT-202411-0001",
    "subject": "Tidak bisa generate laporan bulanan",
    "description": "Ketika klik tombol generate report...",
    "status": "open",
    "priority": "high",
    "category": "bug",
    "createdBy": {
      "id": "user-uuid",
      "name": "John Doe"
    },
    "tenant": {
      "id": "tenant-uuid",
      "name": "Gym ABC"
    },
    "createdAt": "2024-11-30T10:00:00Z",
    "expectedResponseAt": "2024-12-01T10:00:00Z"
  }
}
```

#### List Tickets (Tenant User)

```json
// GET /api/v1/support/tickets?status=open&page=1&limit=10

// Response 200 OK
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "ticketNumber": "TKT-202411-0001",
      "subject": "Tidak bisa generate laporan bulanan",
      "status": "open",
      "priority": "high",
      "category": "bug",
      "createdAt": "2024-11-30T10:00:00Z",
      "repliesCount": 2,
      "lastReplyAt": "2024-11-30T11:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  },
  "filters": {
    "status": "open"
  }
}
```

#### Add Reply

```json
// POST /api/v1/support/tickets/:ticketId/replies
// Request
{
  "message": "Terima kasih sudah menghubungi. Bisakah share screenshot error-nya?"
}

// Response 201 Created
{
  "success": true,
  "data": {
    "id": "reply-uuid",
    "ticketId": "ticket-uuid",
    "message": "Terima kasih sudah menghubungi. Bisakah share screenshot error-nya?",
    "isInternal": false,
    "createdBy": {
      "id": "admin-uuid",
      "name": "Admin Support",
      "isSuperAdmin": true
    },
    "createdAt": "2024-11-30T10:30:00Z"
  }
}
```

#### Change Status

```json
// POST /api/v1/support/tickets/:id/status
// Request
{
  "status": "resolved",
  "note": "Issue sudah diperbaiki di update v2.1.5"
}

// Response 200 OK
{
  "success": true,
  "data": {
    "id": "ticket-uuid",
    "ticketNumber": "TKT-202411-0001",
    "previousStatus": "in_progress",
    "status": "resolved",
    "resolvedAt": "2024-11-30T15:00:00Z",
    "resolvedBy": {
      "id": "admin-uuid",
      "name": "Admin Support"
    }
  }
}
```

---

## 🔐 Permission Matrix (CASL)

### Role-Based Access

| Action | Tenant Owner/Admin | Tenant Staff | Super Admin |
|--------|-------------------|--------------|-------------|
| Create Ticket | ✅ | ✅ | ✅ |
| View Own Tickets | ✅ | ✅ | ✅ |
| View Tenant Tickets | ✅ | ❌ | ✅ (all) |
| Update Own Ticket | ✅ (open) | ✅ (open) | ✅ |
| Delete Ticket | ❌ | ❌ | ✅ |
| Add Reply | ✅ (own) | ✅ (own) | ✅ |
| Internal Reply | ❌ | ❌ | ✅ |
| Assign Ticket | ❌ | ❌ | ✅ |
| Change Status | ❌ | ❌ | ✅ |
| Close Ticket | ✅ (own) | ❌ | ✅ |
| View All Tenants | ❌ | ❌ | ✅ |

### CASL Implementation

```javascript
// src/utils/casl.js - Add to existing abilityBuilder function

// Super Admin - full access
if (user.isSuperAdmin) {
  can('manage', 'SupportTicket');
  can('manage', 'TicketReply');
  return build();
}

// Tenant Admin/Owner
if (role.name === 'admin' || role.name === 'owner') {
  // Can create tickets for their tenant
  can('create', 'SupportTicket', { tenantId: user.tenantId });
  
  // Can read all tickets in their tenant
  can('read', 'SupportTicket', { tenantId: user.tenantId });
  
  // Can update only open tickets they created
  can('update', 'SupportTicket', { 
    tenantId: user.tenantId, 
    createdBy: user.id,
    status: 'open' 
  });
  
  // Can close tickets they created
  can('close', 'SupportTicket', { 
    tenantId: user.tenantId, 
    createdBy: user.id 
  });
  
  // Can create replies on their tenant's tickets
  can('create', 'TicketReply', { 'ticket.tenantId': user.tenantId });
  
  // Can read non-internal replies
  can('read', 'TicketReply', { 
    'ticket.tenantId': user.tenantId, 
    isInternal: false 
  });
}

// Tenant Staff/User
if (role.name === 'staff' || role.name === 'user') {
  // Can create tickets
  can('create', 'SupportTicket', { tenantId: user.tenantId });
  
  // Can only read tickets they created
  can('read', 'SupportTicket', { createdBy: user.id });
  
  // Can update only open tickets they created
  can('update', 'SupportTicket', { 
    createdBy: user.id, 
    status: 'open' 
  });
  
  // Can create replies on tickets they created
  can('create', 'TicketReply', { 'ticket.createdBy': user.id });
  
  // Can read non-internal replies on their tickets
  can('read', 'TicketReply', { 
    'ticket.createdBy': user.id, 
    isInternal: false 
  });
}
```

---

## ⚙️ Feature Registry Update

```javascript
// src/utils/featureRegistry.js - Add to FEATURE_REGISTRY

support: {
  ticketSystem: {
    type: 'boolean',
    default: true,  // Available to all plans
    label: 'Support Ticket System',
    description: 'Create and manage support tickets',
    icon: '🎫',
    availableIn: ['Basic', 'Professional', 'Enterprise']
  },
  ticketAttachments: {
    type: 'boolean',
    default: false,
    label: 'Ticket Attachments',
    description: 'Upload file attachments to tickets',
    icon: '📎',
    availableIn: ['Professional', 'Enterprise']
  },
  slaTracking: {
    type: 'boolean',
    default: false,
    label: 'SLA Tracking',
    description: 'Track response time and SLA metrics',
    icon: '⏱️',
    availableIn: ['Enterprise']
  },
  prioritySupport: {
    type: 'boolean',
    default: false,
    label: 'Priority Support',
    description: '24/7 priority ticket handling with faster SLA',
    icon: '🚀',
    availableIn: ['Enterprise']
  }
}
```

### SLA Configuration by Plan

| Plan | First Response | Resolution Target | Priority Support |
|------|---------------|-------------------|------------------|
| Basic | 48 hours | 7 days | ❌ |
| Professional | 24 hours | 3 days | ❌ |
| Enterprise | 4 hours | 24 hours | ✅ 24/7 |

---

## 🔒 Race Condition Prevention

### Overview

Support Ticket system memerlukan penanganan race condition untuk:

1. **Ticket Number Generation** - Auto-increment unik per tenant per bulan
2. **Status Updates** - Concurrent status changes dari multiple users
3. **Reply Ordering** - Concurrent replies tidak boleh conflict
4. **Assignment** - Prevent double assignment

### Locking Strategy Summary

| Operation | Lock Type | Isolation Level | Retry |
|-----------|-----------|-----------------|-------|
| Create Ticket | Pessimistic (Sequence) | READ COMMITTED | No |
| Update Ticket | Pessimistic + Optimistic | REPEATABLE READ | Yes (3x) |
| Change Status | Pessimistic | REPEATABLE READ | Yes (3x) |
| Assign Ticket | Pessimistic | READ COMMITTED | No |
| Create Reply | Pessimistic | REPEATABLE READ | No |
| Delete Ticket | Pessimistic | READ COMMITTED | No |

### 1. Ticket Number Generation

Menggunakan `sequenceService` yang sudah ada dengan row-level locking.

```javascript
// src/controllers/support/ticketController.js

const { getNextSequence } = require('../../services/sequenceService');
const { sequelize } = require('../../models');

async function createTicket(req, res, next) {
  const t = await sequelize.transaction();
  
  try {
    const { tenantId } = req.user;
    
    // Generate unique ticket number dengan sequence service
    // Format: TKT-{YYYYMM}-{XXXX} (reset monthly per tenant)
    const sequenceName = `ticket_${tenantId}`;
    const ticketNumber = await getNextSequence(sequenceName, t, {
      prefix: 'TKT-',
      resetPeriod: 'monthly',
      padLength: 4
    });
    
    const ticket = await SupportTicket.create({
      ...req.body,
      tenantId,
      ticketNumber,  // TKT-202411-0001
      createdBy: req.user.id,
      status: 'open'
    }, { transaction: t });
    
    await t.commit();
    res.status(201).json({ success: true, data: ticket });
  } catch (error) {
    await t.rollback();
    next(error);
  }
}
```

#### Sequence Diagram - Ticket Number Generation

```
┌────────┐     ┌────────────┐     ┌──────────────┐     ┌─────────────┐
│ User A │     │ Controller │     │SequenceService│     │  Database   │
└───┬────┘     └─────┬──────┘     └──────┬───────┘     └──────┬──────┘
    │                │                    │                    │
    │ POST /tickets  │                    │                    │
    │───────────────>│                    │                    │
    │                │                    │                    │
    │                │ BEGIN TRANSACTION  │                    │
    │                │────────────────────────────────────────>│
    │                │                    │                    │
    │                │ getNextSequence()  │                    │
    │                │───────────────────>│                    │
    │                │                    │                    │
    │                │                    │ SELECT ... FOR UPDATE
    │                │                    │───────────────────>│
    │                │                    │                    │
    │                │                    │   Row Locked 🔒    │
    │                │                    │<───────────────────│
    │                │                    │                    │
    │                │                    │ UPDATE currentValue
    │                │                    │───────────────────>│
    │                │                    │                    │
    │                │  TKT-202411-0001   │                    │
    │                │<───────────────────│                    │
    │                │                    │                    │
    │                │ INSERT SupportTicket                    │
    │                │────────────────────────────────────────>│
    │                │                    │                    │
    │                │ COMMIT             │                    │
    │                │────────────────────────────────────────>│
    │                │                    │                    │
    │   201 Created  │                    │   Row Unlocked 🔓  │
    │<───────────────│                    │                    │
    │                │                    │                    │
```

#### Concurrent Request Handling

```
┌────────┐     ┌────────┐     ┌──────────────┐     ┌─────────────┐
│ User A │     │ User B │     │SequenceService│     │  Database   │
└───┬────┘     └───┬────┘     └──────┬───────┘     └──────┬──────┘
    │              │                  │                    │
    │ POST /tickets│                  │                    │
    │──────────────────────────────────────────────────────>
    │              │                  │                    │
    │              │ POST /tickets    │                    │
    │              │──────────────────────────────────────>│
    │              │                  │                    │
    │              │                  │ SELECT FOR UPDATE  │
    │              │                  │ (User A first)     │
    │              │                  │───────────────────>│
    │              │                  │                    │
    │              │                  │   Locked by A 🔒   │
    │              │                  │<───────────────────│
    │              │                  │                    │
    │              │                  │ SELECT FOR UPDATE  │
    │              │                  │ (User B waits...)  │
    │              │                  │- - - - - - - - - ->│
    │              │                  │                    │
    │              │                  │ UPDATE (A: 0→1)    │
    │              │                  │───────────────────>│
    │              │                  │                    │
    │ TKT-...-0001 │                  │                    │
    │<─────────────────────────────────────────────────────│
    │              │                  │   A Released 🔓    │
    │              │                  │                    │
    │              │                  │   B Acquires 🔒    │
    │              │                  │<───────────────────│
    │              │                  │                    │
    │              │                  │ UPDATE (B: 1→2)    │
    │              │                  │───────────────────>│
    │              │                  │                    │
    │              │ TKT-...-0002     │                    │
    │              │<──────────────────────────────────────│
    │              │                  │                    │
```

### 2. Status Update dengan Optimistic Locking

Model `SupportTicket` menggunakan `version` field untuk optimistic locking.

```javascript
// src/models/supportTicket.js

module.exports = (sequelize, DataTypes) => {
  const SupportTicket = sequelize.define('SupportTicket', {
    // ... other fields
    
    // Version field for optimistic locking
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    
    status: {
      type: DataTypes.ENUM('open', 'in_progress', 'waiting_response', 'resolved', 'closed'),
      defaultValue: 'open'
    }
  }, {
    hooks: {
      beforeUpdate: async (ticket, options) => {
        // Auto-increment version on every update
        ticket.version += 1;
      }
    }
  });
  
  return SupportTicket;
};
```

```javascript
// src/controllers/support/ticketController.js

const ConcurrencyUtils = require('../../utils/concurrency');

async function updateTicketStatus(req, res, next) {
  const { id } = req.params;
  const { status } = req.body;
  
  try {
    // Use withRetry for optimistic locking conflicts
    const result = await ConcurrencyUtils.withRetry(async () => {
      const t = await sequelize.transaction({
        isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.REPEATABLE_READ
      });
      
      try {
        const ticket = await SupportTicket.findOne({
          where: { id },
          transaction: t,
          lock: t.LOCK.UPDATE  // Pessimistic lock for critical updates
        });
        
        if (!ticket) {
          await t.rollback();
          throw createError('NOT_FOUND', 'Ticket not found');
        }
        
        // Validate status transition
        validateStatusTransition(ticket.status, status);
        
        const previousStatus = ticket.status;
        
        await ticket.update({
          status,
          ...(status === 'resolved' ? { 
            resolvedAt: new Date(), 
            resolvedBy: req.user.id 
          } : {}),
          ...(status === 'closed' ? { 
            closedAt: new Date(), 
            closedBy: req.user.id 
          } : {})
        }, { transaction: t });
        
        await t.commit();
        
        return { ticket, previousStatus };
      } catch (error) {
        await t.rollback();
        throw error;
      }
    }, 3, 100, 'UPDATE_TICKET_STATUS');  // 3 retries, 100ms delay
    
    res.json({ 
      success: true, 
      data: result.ticket,
      previousStatus: result.previousStatus
    });
  } catch (error) {
    next(error);
  }
}

// Status transition validation
function validateStatusTransition(currentStatus, newStatus) {
  const allowedTransitions = {
    'open': ['in_progress', 'closed'],
    'in_progress': ['waiting_response', 'resolved', 'closed'],
    'waiting_response': ['in_progress', 'resolved', 'closed'],
    'resolved': ['closed', 'in_progress'],  // reopen
    'closed': ['open']  // reopen within 7 days
  };
  
  if (!allowedTransitions[currentStatus]?.includes(newStatus)) {
    throw createError('VALIDATION_ERROR', 
      `Cannot transition from ${currentStatus} to ${newStatus}`);
  }
}
```

#### Sequence Diagram - Concurrent Status Update

```
┌────────────┐     ┌────────────┐     ┌────────────┐     ┌──────────┐
│ Admin A    │     │ Admin B    │     │ Controller │     │ Database │
└─────┬──────┘     └─────┬──────┘     └─────┬──────┘     └────┬─────┘
      │                  │                  │                  │
      │ PATCH /tickets/1 │                  │                  │
      │ status=in_progress                  │                  │
      │─────────────────────────────────────>                  │
      │                  │                  │                  │
      │                  │ PATCH /tickets/1 │                  │
      │                  │ status=resolved  │                  │
      │                  │─────────────────>│                  │
      │                  │                  │                  │
      │                  │                  │ SELECT FOR UPDATE│
      │                  │                  │ (Admin A first)  │
      │                  │                  │─────────────────>│
      │                  │                  │                  │
      │                  │                  │ version=0, open  │
      │                  │                  │<─────────────────│
      │                  │                  │                  │
      │                  │                  │ SELECT FOR UPDATE│
      │                  │                  │ (Admin B waits)  │
      │                  │                  │- - - - - - - - ->│
      │                  │                  │                  │
      │                  │                  │ UPDATE version=1 │
      │                  │                  │ status=in_progress
      │                  │                  │─────────────────>│
      │                  │                  │                  │
      │  200 OK          │                  │   A Released     │
      │<─────────────────────────────────────                  │
      │                  │                  │                  │
      │                  │                  │   B Acquires     │
      │                  │                  │<─────────────────│
      │                  │                  │                  │
      │                  │                  │ version=1,       │
      │                  │                  │ in_progress      │
      │                  │                  │                  │
      │                  │                  │ ❌ VALIDATION    │
      │                  │                  │ Cannot: in_progress
      │                  │                  │ → resolved       │
      │                  │                  │ (need waiting)   │
      │                  │                  │                  │
      │                  │   400 Error      │                  │
      │                  │<─────────────────│                  │
      │                  │                  │                  │
```

### 3. Reply Creation dengan Transaction Isolation

```javascript
// src/controllers/support/ticketReplyController.js

async function createReply(req, res, next) {
  const { ticketId } = req.params;
  const { message, isInternal } = req.body;
  
  const t = await sequelize.transaction({
    isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.REPEATABLE_READ
  });
  
  try {
    // Lock ticket row to prevent concurrent modifications
    const ticket = await SupportTicket.findOne({
      where: { id: ticketId },
      transaction: t,
      lock: t.LOCK.UPDATE
    });
    
    if (!ticket) {
      await t.rollback();
      return next(createError('NOT_FOUND', 'Ticket not found'));
    }
    
    // Create reply
    const reply = await TicketReply.create({
      ticketId,
      message,
      isInternal: isInternal || false,
      createdBy: req.user.id
    }, { transaction: t });
    
    // Update ticket's updatedAt and status if needed
    const updateData = { updatedAt: new Date() };
    
    // If super admin replies, update first response time
    if (req.user.isSuperAdmin && !ticket.firstResponseAt) {
      updateData.firstResponseAt = new Date();
    }
    
    // Auto-change status based on who replied
    if (req.user.isSuperAdmin && ticket.status === 'open') {
      updateData.status = 'in_progress';
    } else if (!req.user.isSuperAdmin && ticket.status === 'waiting_response') {
      updateData.status = 'in_progress';
    }
    
    await ticket.update(updateData, { transaction: t });
    
    await t.commit();
    
    res.status(201).json({ success: true, data: reply });
  } catch (error) {
    await t.rollback();
    next(error);
  }
}
```

### 4. Assignment dengan Pessimistic Lock

```javascript
// src/controllers/support/ticketController.js

async function assignTicket(req, res, next) {
  const { id } = req.params;
  const { assignedTo } = req.body;
  
  const t = await sequelize.transaction();
  
  try {
    // Pessimistic lock - only one admin can assign at a time
    const ticket = await SupportTicket.findOne({
      where: { id },
      transaction: t,
      lock: t.LOCK.UPDATE
    });
    
    if (!ticket) {
      await t.rollback();
      return next(createError('NOT_FOUND', 'Ticket not found'));
    }
    
    // Check if already assigned to different admin
    if (ticket.assignedTo && ticket.assignedTo !== assignedTo) {
      await t.rollback();
      return next(createError('CONFLICT', 
        'Ticket is already assigned to another admin'));
    }
    
    // Verify assignee is super admin
    const admin = await User.findOne({
      where: { id: assignedTo, isSuperAdmin: true }
    });
    
    if (!admin) {
      await t.rollback();
      return next(createError('VALIDATION_ERROR', 
        'Assignee must be a super admin'));
    }
    
    await ticket.update({
      assignedTo,
      status: ticket.status === 'open' ? 'in_progress' : ticket.status
    }, { transaction: t });
    
    await t.commit();
    
    res.json({ success: true, data: ticket });
  } catch (error) {
    await t.rollback();
    next(error);
  }
}
```

### Error Handling untuk Race Conditions

```javascript
// Custom error codes untuk ticket operations
// src/utils/errorCodes.js - tambahkan:

const TICKET_ERRORS = {
  TICKET_NOT_FOUND: {
    code: 'TICKET_NOT_FOUND',
    message: 'Ticket not found',
    status: 404
  },
  TICKET_ALREADY_ASSIGNED: {
    code: 'TICKET_ALREADY_ASSIGNED',
    message: 'Ticket is already assigned to another admin',
    status: 409  // Conflict
  },
  TICKET_STATUS_CONFLICT: {
    code: 'TICKET_STATUS_CONFLICT',
    message: 'Ticket status was changed by another user',
    status: 409
  },
  INVALID_STATUS_TRANSITION: {
    code: 'INVALID_STATUS_TRANSITION',
    message: 'Invalid status transition',
    status: 400
  },
  TICKET_CLOSED: {
    code: 'TICKET_CLOSED',
    message: 'Cannot modify closed ticket',
    status: 400
  },
  REOPEN_EXPIRED: {
    code: 'REOPEN_EXPIRED',
    message: 'Cannot reopen ticket after 7 days',
    status: 400
  }
};
```

---

## 📧 Notification System

### Email Triggers

| Event | Recipient | Template | Priority |
|-------|-----------|----------|----------|
| Ticket Created | Super Admin + Tenant | `ticket-created` | High |
| Ticket Assigned | Assigned Admin | `ticket-assigned` | Medium |
| New Reply (from Admin) | Ticket Creator | `ticket-reply-admin` | High |
| New Reply (from Tenant) | Assigned Admin | `ticket-reply-tenant` | Medium |
| Status Changed | Ticket Creator | `ticket-status-changed` | Medium |
| Ticket Resolved | Ticket Creator | `ticket-resolved` | High |
| Ticket Closed | Ticket Creator | `ticket-closed` | Low |
| SLA Warning (80%) | Assigned Admin | `ticket-sla-warning` | High |
| SLA Breached | Super Admin | `ticket-sla-breached` | Critical |

### Email Service Structure

```javascript
// src/services/emailService.js (new file)

const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    
    this.defaultFrom = process.env.SMTP_FROM || 'support@gymapp.com';
  }

  async send({ to, subject, html, text }) {
    try {
      const result = await this.transporter.sendMail({
        from: this.defaultFrom,
        to,
        subject,
        html,
        text
      });
      
      logger.logInfo('Email sent successfully', {
        action: 'EMAIL_SENT',
        to,
        subject,
        messageId: result.messageId
      });
      
      return result;
    } catch (error) {
      logger.logError('Failed to send email', {
        action: 'EMAIL_FAILED',
        to,
        subject,
        error: error.message
      });
      throw error;
    }
  }

  async sendTicketNotification(type, ticket, recipient) {
    const template = this.getTemplate(type, ticket);
    return this.send({
      to: recipient.email,
      subject: template.subject,
      html: template.html
    });
  }
  
  getTemplate(type, data) {
    const templates = {
      'ticket-created': {
        subject: `[${data.ticketNumber}] New Support Ticket: ${data.subject}`,
        html: `
          <h2>New Support Ticket</h2>
          <p><strong>Ticket:</strong> ${data.ticketNumber}</p>
          <p><strong>Subject:</strong> ${data.subject}</p>
          <p><strong>Priority:</strong> ${data.priority}</p>
          <p><strong>Category:</strong> ${data.category}</p>
          <hr>
          <p>${data.description}</p>
        `
      },
      'ticket-reply-admin': {
        subject: `[${data.ticketNumber}] New Reply from Support`,
        html: `
          <h2>New Reply on Your Ticket</h2>
          <p><strong>Ticket:</strong> ${data.ticketNumber}</p>
          <p><strong>Subject:</strong> ${data.subject}</p>
          <hr>
          <p>${data.replyMessage}</p>
          <p><a href="${process.env.APP_URL}/support/tickets/${data.id}">View Ticket</a></p>
        `
      },
      // ... more templates
    };
    
    return templates[type] || { subject: 'Notification', html: '' };
  }
}

module.exports = new EmailService();
```

### Notification Service

```javascript
// src/services/ticketNotificationService.js

const emailService = require('./emailService');
const { User } = require('../models');

class TicketNotificationService {
  async notifyTicketCreated(ticket) {
    // Notify super admins
    const superAdmins = await User.findAll({
      where: { isSuperAdmin: true }
    });
    
    for (const admin of superAdmins) {
      await emailService.sendTicketNotification('ticket-created', ticket, admin);
    }
  }
  
  async notifyTicketAssigned(ticket, assignedAdmin) {
    await emailService.sendTicketNotification('ticket-assigned', ticket, assignedAdmin);
  }
  
  async notifyNewReply(ticket, reply, recipient) {
    const type = reply.createdBy.isSuperAdmin ? 'ticket-reply-admin' : 'ticket-reply-tenant';
    await emailService.sendTicketNotification(type, { ...ticket, replyMessage: reply.message }, recipient);
  }
  
  async notifyStatusChanged(ticket, previousStatus, user) {
    await emailService.sendTicketNotification('ticket-status-changed', {
      ...ticket,
      previousStatus
    }, user);
  }
  
  async notifySLAWarning(ticket, assignedAdmin) {
    await emailService.sendTicketNotification('ticket-sla-warning', ticket, assignedAdmin);
  }
  
  async notifySLABreached(ticket) {
    const superAdmins = await User.findAll({
      where: { isSuperAdmin: true }
    });
    
    for (const admin of superAdmins) {
      await emailService.sendTicketNotification('ticket-sla-breached', ticket, admin);
    }
  }
}

module.exports = new TicketNotificationService();
```

---

## 📊 Dashboard & Metrics

### Super Admin Dashboard Response

```json
// GET /api/v1/admin/support/dashboard
{
  "success": true,
  "data": {
    "summary": {
      "total": 150,
      "open": 25,
      "inProgress": 15,
      "waitingResponse": 10,
      "resolved": 80,
      "closed": 20
    },
    "byPriority": {
      "urgent": 5,
      "high": 20,
      "medium": 80,
      "low": 45
    },
    "byCategory": {
      "bug": 40,
      "feature_request": 30,
      "billing": 25,
      "technical": 35,
      "general": 20
    },
    "sla": {
      "onTrack": 120,
      "atRisk": 20,
      "breached": 10,
      "complianceRate": 80.0
    },
    "averages": {
      "firstResponseTime": "4.5 hours",
      "resolutionTime": "2.3 days"
    },
    "recentTickets": [
      {
        "id": "uuid",
        "ticketNumber": "TKT-202411-0025",
        "subject": "Cannot login...",
        "status": "open",
        "priority": "urgent",
        "createdAt": "2024-11-30T10:00:00Z"
      }
    ],
    "topTenants": [
      {
        "tenantId": "uuid",
        "tenantName": "Gym ABC",
        "ticketCount": 15,
        "openCount": 3
      }
    ]
  }
}
```

### Metrics Tracking

| Metric | Description | Query Pattern |
|--------|-------------|---------------|
| Average First Response Time | Time from creation to first admin reply | GROUP BY plan, category, priority |
| Average Resolution Time | Time from creation to resolved status | GROUP BY plan, category |
| SLA Compliance Rate | % tickets within SLA | WHERE resolvedAt <= expectedResolutionAt |
| Tickets by Tenant | Volume analysis per tenant | GROUP BY tenantId |
| Repeat Ticket Rate | Same tenant, same category within 30 days | Subquery analysis |
| Customer Satisfaction | Post-resolution survey (optional) | From survey responses |

---

## 🚀 Implementation Phases

### Phase 1: Core Ticket System (3-4 days)

| Task | Estimated Time | Priority |
|------|---------------|----------|
| Create `SupportTicket` model | 2 hours | P0 |
| Create `TicketReply` model | 1 hour | P0 |
| Create migrations with indexes | 2 hours | P0 |
| Implement ticket controller (CRUD) | 4 hours | P0 |
| Implement status change logic | 3 hours | P0 |
| Implement reply controller | 2 hours | P0 |
| Create routes with middleware | 2 hours | P0 |
| Update CASL permissions | 2 hours | P0 |
| Generate routes metadata | 30 min | P0 |
| Basic testing | 4 hours | P0 |

### Phase 2: Notifications (2-3 days)

| Task | Estimated Time | Priority |
|------|---------------|----------|
| Create `emailService.js` | 3 hours | P1 |
| Create email templates | 4 hours | P1 |
| Implement `ticketNotificationService.js` | 3 hours | P1 |
| Add notification triggers | 2 hours | P1 |
| Test email delivery | 3 hours | P1 |
| Setup SMTP configuration | 1 hour | P1 |

### Phase 3: SLA & Metrics (2 days)

| Task | Estimated Time | Priority |
|------|---------------|----------|
| Implement SLA calculation logic | 3 hours | P1 |
| Create dashboard endpoints | 4 hours | P1 |
| Add SLA warning cron job | 2 hours | P1 |
| Add auto-close cron job | 2 hours | P1 |
| Create metrics queries | 3 hours | P2 |

### Phase 4: Attachments (Optional, 2 days)

| Task | Estimated Time | Priority |
|------|---------------|----------|
| Setup multer middleware | 2 hours | P2 |
| Create `TicketAttachment` model | 1 hour | P2 |
| Implement upload endpoints | 3 hours | P2 |
| Configure storage (local/S3) | 2 hours | P2 |
| Add file validation | 2 hours | P2 |

---

## ✅ Checklist Implementasi

### Pre-Development

- [ ] Review dan approve rancangan ini
- [ ] Setup email service credentials (SMTP)
- [ ] Decide on attachment storage strategy
- [ ] Confirm SLA requirements per plan

### Database

- [ ] Create migration: `SupportTickets`
- [ ] Create migration: `TicketReplies`
- [ ] Create migration: `TicketAttachments` (optional)
- [ ] Run migrations on dev environment
- [ ] Create seeder for test data
- [ ] Verify indexes created

### Models

- [ ] Create `src/models/supportTicket.js`
- [ ] Create `src/models/ticketReply.js`
- [ ] Create `src/models/ticketAttachment.js` (optional)
- [ ] Update `src/models/index.js` associations
- [ ] Test model relationships
- [ ] Add model hooks (beforeCreate, beforeUpdate)

### Controllers & Routes

- [ ] Create `src/controllers/support/index.js`
- [ ] Create `src/controllers/support/ticketController.js`
- [ ] Create `src/controllers/support/ticketReplyController.js`
- [ ] Create `src/routes/support/index.js`
- [ ] Create `src/routes/support/ticket.routes.js`
- [ ] Create `src/routes/support/reply.routes.js`
- [ ] Mount in `src/routes/index.js`

### Permissions & Features

- [ ] Update `src/utils/casl.js` with Ticket permissions
- [ ] Update `src/utils/featureRegistry.js` with support features
- [ ] Run `npm run sync:features`
- [ ] Run `npm run generate:routes`
- [ ] Test permission enforcement

### Services

- [ ] Create `src/services/emailService.js`
- [ ] Create `src/services/ticketService.js`
- [ ] Create `src/services/ticketNotificationService.js`
- [ ] Add email templates
- [ ] Test email delivery

### Cron Jobs

- [ ] Add SLA warning job (check at 80% time elapsed)
- [ ] Add auto-close job (run daily)
- [ ] Add reminder job for waiting_response

### Testing

- [ ] Create `tests/controllers/support/ticket.test.js`
- [ ] Create `tests/controllers/support/reply.test.js`
- [ ] Create `tests/services/ticketService.test.js`
- [ ] Add race condition tests
- [ ] Manual API testing via Postman
- [ ] Integration testing

### Documentation

- [ ] Update Postman collection
- [ ] Update `BISNIS-LOGIC-SYSTEM.md`
- [ ] Create frontend integration guide
- [ ] Document API endpoints

---

## 📝 Notes & Decisions

### Keputusan Arsitektur

1. **Ticket Scope**: Tenant → Super Admin (member tickets ditunda ke future)
2. **Ticket Number Format**: `TKT-YYYYMM-XXXX` (auto-increment per tenant per bulan, reset monthly)
3. **Reply Model**: Separate model untuk flexibility, indexing, dan audit trail
4. **Internal Notes**: `isInternal` flag untuk catatan internal super admin (tidak visible ke tenant)
5. **Soft Delete**: Menggunakan `paranoid: true` untuk audit trail
6. **Race Condition**: Kombinasi optimistic locking (version field) + pessimistic locking (SELECT FOR UPDATE)

### Pertimbangan Future

1. **Canned Responses**: Template jawaban untuk pertanyaan umum
2. **Ticket Tags**: Label tambahan untuk kategorisasi
3. **Satisfaction Survey**: Rating setelah ticket closed
4. **Knowledge Base Integration**: Link ke artikel bantuan
5. **Live Chat**: Upgrade dari ticket ke real-time chat
6. **Mobile Push Notifications**: Notifikasi ke app mobile
7. **Member Tickets**: Allow members to create tickets to tenant admin
8. **Escalation Rules**: Auto-escalate based on priority and time

---

## 📚 Related Documentation

- [Business Logic System](./BISNIS-LOGIC-SYSTEM.md)
- [Race Condition Prevention](../system-docs/RACE-CONDITION-PREVENTION.md)
- [Feature Registry](../src/utils/featureRegistry.js)
- [CASL Authorization](../src/utils/casl.js)

---

*Document prepared for development phase.*  
*Last reviewed: November 30, 2025*  
*Author: Development Team*
