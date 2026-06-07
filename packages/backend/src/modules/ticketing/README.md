# Ticketing Module

Complete customer support and issue tracking system for gym management.

## Quick Start

### 1. Run Migration
```bash
npm run db:dev:reset
# or
npx sequelize-cli db:migrate
```

### 2. Setup Feature
Add to subscription plan and sync:
```bash
npm run sync:features
```

### 3. Create Categories & Priorities
```bash
# Use API endpoints to create initial setup
POST /api/v1/ticketing/categories
POST /api/v1/ticketing/priorities
```

## Module Structure

```
src/modules/ticketing/
├── models/              # 5 models (Ticket, Category, Priority, Comment, Attachment)
├── controllers/         # 6 controllers (CRUD + Dashboard)
├── routes/              # 6 route files
├── services/            # 2 services (Business logic, Notifications)
├── utils/               # 2 utilities (Validator, Formatter)
└── index.js             # Module export

src/migrations/
└── 20251222222712-create-ticketing-tables.js

docs/
└── TICKETING-SERVICES.md  # Complete documentation

uploads/ticketing/attachments/  # File upload directory
```

## Features

✅ Complete ticket lifecycle management  
✅ Categories & priorities with SLA tracking  
✅ Comments with internal/external notes  
✅ File attachments (images, documents, videos)  
✅ Member integration  
✅ Dashboard analytics & trends  
✅ Multi-tenant isolation  
✅ CASL authorization  
✅ Optimistic locking for concurrent updates  

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/ticketing/tickets` | GET | List tickets with filters |
| `/api/v1/ticketing/tickets` | POST | Create ticket |
| `/api/v1/ticketing/tickets/:id` | GET | Get ticket details |
| `/api/v1/ticketing/tickets/:id` | PUT | Update ticket |
| `/api/v1/ticketing/tickets/:id/status` | PATCH | Update status |
| `/api/v1/ticketing/tickets/:id/assign` | PATCH | Assign to staff |
| `/api/v1/ticketing/categories` | GET/POST | Manage categories |
| `/api/v1/ticketing/priorities` | GET/POST | Manage priorities |
| `/api/v1/ticketing/tickets/:id/comments` | GET/POST | Comments |
| `/api/v1/ticketing/tickets/:id/attachments` | GET/POST | Attachments |
| `/api/v1/ticketing/dashboard/stats` | GET | Dashboard statistics |
| `/api/v1/ticketing/dashboard/trends` | GET | Ticket trends |

## Usage Example

```javascript
// Create ticket
POST /api/v1/ticketing/tickets
{
  "subject": "Equipment issue",
  "description": "Treadmill not working",
  "categoryId": "uuid",
  "priorityId": "uuid",
  "tags": ["equipment", "urgent"]
}

// Assign to staff
PATCH /api/v1/ticketing/tickets/{id}/assign
{ "assignedToId": "staff-uuid" }

// Add comment
POST /api/v1/ticketing/tickets/{id}/comments
{ "comment": "Working on it", "isInternal": false }

// Mark resolved
PATCH /api/v1/ticketing/tickets/{id}/status
{ "status": "resolved", "resolution": "Fixed" }
```

## Database Schema

- **TicketCategories**: Categories for organizing tickets
- **TicketPriorities**: Priority levels with SLA hours
- **Tickets**: Main ticket entity with full lifecycle
- **TicketComments**: Comments and activity log
- **TicketAttachments**: File uploads

## Documentation

See [TICKETING-SERVICES.md](../../docs/TICKETING-SERVICES.md) for complete documentation including:
- Architecture details
- API reference
- Integration guide
- Best practices
- Troubleshooting

## Security

- Multi-tenant data isolation
- CASL permission checks
- JWT authentication required
- Feature gate middleware (`requireModule('ticketing')`)
- Optimistic locking for concurrent updates

## Next Steps

1. Run migration to create tables
2. Add ticketing feature to subscription plans
3. Create initial categories and priorities
4. Regenerate route metadata: `npm run generate:routes`
5. Start using the API!

---

**Version**: 1.0.0  
**Created**: December 22, 2025  
**Status**: Production Ready ✅
