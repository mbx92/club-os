# Modular Architecture

## Overview

This directory contains all business modules organized in a modular monolith pattern. Each module is self-contained with its own models, controllers, routes, services, and utilities, while sharing common infrastructure through the `shared` module.

## Module Structure

```
modules/
├── shared/           # Shared across all modules
│   ├── models/       # Core models (Tenant, User, Subscription, Transaction)
│   ├── middlewares/  # Shared middlewares (auth, casl, featureGate)
│   ├── services/     # Shared services (sequence, audit)
│   └── utils/        # Shared utilities (logger, errorCodes)
│
├── gym/              # Gym Management Module (90% complete)
│   ├── models/       # Member, Membership, CheckIn, etc.
│   ├── controllers/  # Business logic controllers
│   ├── routes/       # API routes
│   ├── services/     # Business services
│   └── utils/        # Module-specific utilities
│
└── restaurant/       # Restaurant & POS Module (Phase 2 - In Progress)
    ├── models/       # Product, Category, Table, Stock
    ├── controllers/  # Menu, Order, Table management
    ├── routes/       # Restaurant API routes
    ├── services/     # Menu, Stock, Order services
    └── utils/        # JsonbQueryHelper, etc.
```

## Module Organization Principles

### 1. **Self-Contained Modules**
Each module contains everything it needs to function:
- **Models**: Database models specific to the module
- **Controllers**: Request handlers for the module's endpoints
- **Routes**: Express route definitions
- **Services**: Business logic layer
- **Utils**: Module-specific helper functions

### 2. **Shared Infrastructure**
Common functionality is in the `shared` module:
- Authentication & authorization
- Transaction management
- Audit logging
- Sequence generation
- Error handling

### 3. **Clear Dependencies**
- Modules can depend on `shared` module
- Modules should minimize cross-module dependencies
- Use events or services for inter-module communication when needed

### 4. **Feature Gating**
Each module is controlled by subscription features:
```javascript
// In featureRegistry.js
modules: {
  gym: { availableIn: ['Basic', 'Professional', 'Enterprise'] },
  restaurant: { availableIn: ['Professional', 'Enterprise'] }
}
```

## Module Lifecycle

### Creating a New Module

1. **Create directory structure**:
   ```bash
   mkdir -p src/modules/{moduleName}/{models,controllers,routes,services,utils}
   ```

2. **Create index files** for each subdirectory

3. **Add to feature registry**:
   ```javascript
   // src/utils/featureRegistry.js
   modules: {
     moduleName: {
       type: 'boolean',
       default: false,
       label: 'Module Name',
       availableIn: ['Professional', 'Enterprise']
     }
   }
   ```

4. **Create database migrations** in `src/migrations/`

5. **Register routes** in main `src/routes/index.js`

### Module Status

| Module | Status | Progress | Phase |
|--------|--------|----------|-------|
| **Shared** | ✅ Complete | 100% | Core |
| **Gym** | ✅ Operational | 90% | Phase 1 |
| **Restaurant** | 🔄 In Progress | 40% | Phase 2 |
| **Accounting** | 📅 Planned | 0% | Phase 3 |
| **Psychology** | 📅 Planned | 0% | Phase 4 |
| **HR** | 📅 Planned | 0% | Phase 5 |

## Inter-Module Communication

### Shared Transaction System
All modules use the unified transaction system:
```javascript
const { Transaction } = require('../shared/models');

// Restaurant order
await Transaction.create({
  tenantId,
  transactionType: 'restaurant_order',
  items: [...],
  payments: [...]
});
```

### Event-Based Communication (Future)
For decoupled inter-module operations:
```javascript
// In restaurant module
eventBus.emit('order.completed', { orderId, amount });

// In accounting module
eventBus.on('order.completed', async ({ orderId, amount }) => {
  await createJournalEntry({ ... });
});
```

## Best Practices

1. **Keep modules independent**: Avoid tight coupling between modules
2. **Use shared services**: Leverage shared infrastructure for common tasks
3. **Document dependencies**: Clearly mark any cross-module dependencies
4. **Test in isolation**: Each module should be testable independently
5. **Follow naming conventions**: Use consistent naming across modules

## Migration Strategy

We are gradually migrating from flat structure (`src/models/`, `src/controllers/`) to modular structure:

### Phase 1: Create Module Structure ✅
- Create `src/modules/` directory
- Set up `shared/`, `gym/`, and `restaurant/` modules

### Phase 2: Move Restaurant Code (Current)
- Move restaurant models to `modules/restaurant/models/`
- Move restaurant controllers to `modules/restaurant/controllers/`
- Update imports

### Phase 3: Move Gym Code
- Organize existing gym code into `modules/gym/`
- Maintain backward compatibility

### Phase 4: Move Shared Code
- Consolidate shared models into `modules/shared/`
- Update all module imports

## Directory Structure Visualization

```
gym-be/
├── src/
│   ├── modules/              # ← New modular structure
│   │   ├── shared/
│   │   ├── gym/
│   │   └── restaurant/
│   │
│   ├── models/               # ← Legacy (to be migrated)
│   ├── controllers/          # ← Legacy (to be migrated)
│   ├── routes/               # ← Legacy (to be migrated)
│   ├── middlewares/          # ← To become shared/middlewares
│   ├── services/             # ← To become shared/services
│   └── utils/                # ← To become shared/utils
│
├── migrations/               # Database migrations
└── docs/
    └── modules/              # Module-specific documentation
```

## Next Steps

1. ✅ Create restaurant models (Product, ProductCategory, Location, RestaurantTable, StockMovement)
2. ⏳ Implement restaurant controllers (products, categories, tables, orders)
3. ⏳ Create restaurant routes with feature gating
4. ⏳ Implement restaurant services (menu management, stock tracking)
5. ⏳ Add restaurant module to main app routing
6. 📅 Document restaurant API endpoints
7. 📅 Create tests for restaurant module

## Resources

- [Multi-Module Strategy](../../docs/MULTI-MODULE-STRATEGY.md)
- [Feature Registry Guide](../utils/featureRegistry.js)
- [Transaction Architecture](../../docs/TRANSACTION-ARCHITECTURE.md)
- [PHASE-02 Implementation](../../docs/plan/PHASE-02-POS-RESTAURANT.md)
