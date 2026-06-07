# Copilot Instructions - Gym Membership Multi-Tenant SaaS Backend

## Architecture Overview

This is a **multi-tenant SaaS** backend for gym management with subscription-based feature gating. Key architectural decisions:

- **Multi-tenancy**: Complete data isolation per tenant. All queries must include `tenantId` filtering (except super admin operations)
- **Feature-gated modules**: Subscription plans control access to modules (POS, restaurant, advanced reports). Check `src/utils/featureRegistry.js` for the single source of truth
- **Unified transaction system**: All financial transactions (membership payments, POS sales, restaurant orders) use `Transaction` → `TransactionItem` → `TransactionPayment` hierarchy
- **Race condition prevention**: Critical operations use optimistic locking (`version` field) + pessimistic locking. See `src/utils/concurrency.js`

## Project Structure (Module-based)

```
src/
├── controllers/{module}/  # Organized by business domain (auth, user, subscription, gym, etc.)
├── routes/{module}/       # Matches controller structure
├── middlewares/           # Authentication, CASL authorization, feature gating, subscription checks
├── models/                # Sequelize models (20+ models including Tenant, User, Transaction, Subscription)
├── services/              # Business logic (featureSyncService, sequenceService)
└── utils/                 # featureRegistry, concurrency, casl, logger, metrics
```

**Module pattern**: Each module has `controllers/{module}/index.js` and `routes/{module}/index.js` that export named exports, aggregated in `src/routes/index.js`.

## Critical Workflows

### Database Operations
```bash
# Environment-specific (use NODE_ENV=development|test|production)
npm run db:dev:reset      # Drop, create, migrate, seed for development
npm run db:test:reset      # Same for test environment
npm run test               # Run Jest tests (uses test DB config)
```

**Config**: Uses `.env.{NODE_ENV}` files (see `src/config/config.js`). Always specify environment for DB commands.

### Feature Synchronization
After modifying `src/utils/featureRegistry.js` (subscription plan features):
```bash
npm run sync:features          # Sync to database
npm run sync:features:compare  # Dry-run preview
```
Or via API: `POST /api/v1/admin/features/sync/:planId` (super admin only).

### Routes Metadata Generation
After adding/modifying routes, regenerate metadata for permission system:
```bash
npm run generate:routes
```
Or via API: `POST /api/v1/permissions/routes/regenerate` (super admin only).

**How it works**: The v2 generator uses intelligent export chain tracing:
1. Scans `src/routes/index.js` for `router.use()` mountings
2. Recursively finds all `.routes.js` files in nested folders
3. Traces export path: route file → parent index → main index
4. Auto-detects mount paths (e.g., `gym/member/member.routes.js` exported as `membersRoutes` → mounted at `/gym/members`)
5. Generates `src/utils/routesMetadata.js` with 134+ routes

**Example**: `src/routes/gym/member/member.routes.js`:
- Exported as `membersRoutes` in `src/routes/gym/index.js`
- Imported via `const { membersRoutes } = require('./gym')` in main index
- Mounted via `router.use('/gym/members', membersRoutes)`
- Generator automatically detects mount path as `/gym/members` ✓

See `docs/ROUTES-METADATA-GENERATOR.md` for technical details.

## Authentication & Authorization

**3-layer security model**:

1. **JWT Authentication** (`authMiddleware.js`): Loads user with `tenant` and `role` associations
2. **CASL Authorization** (`caslMiddleware.js`): Fine-grained permissions via `abilityBuilder` in `src/utils/casl.js`
3. **Feature Gating** (`featureGateMiddleware.js`): Checks subscription plan features from `featureRegistry.js`

**Middleware chain example**:
```javascript
router.get('/products', 
  authenticate,                          // JWT check
  requireModule('pos'),                  // Feature gate
  authorizeCasl('read', 'Product'),     // CASL permission
  posController.getAllProducts
);
```

**Super admin**: Has `isSuperAdmin: true` flag, bypasses tenant isolation and subscription checks.

## Data Model Conventions

### Multi-tenancy
- **Always** include `tenantId` in WHERE clauses (unless super admin)
- Models have `tenantId` foreign key to `Tenant`
- Check `req.user.isSuperAdmin` to determine if tenant filtering should be applied

### Race Condition Prevention
Models with `version` field use **optimistic locking**:
- `Transaction`, `Voucher`, `Product`, `MembershipPayment`
- Use `withRetry()` from `concurrency.js` when updating these
- Use `generateUniqueSequence()` for auto-incrementing numbers (transactionNumber, voucher.code, etc.)

### Controller Pattern
```javascript
async function controllerFunction(req, res, next) {
  try {
    // Business logic
    res.json(result);
  } catch (err) {
    next(err);  // Pass to centralized errorHandler middleware
  }
}
```

## Feature Registry System

**Single source of truth**: `src/utils/featureRegistry.js` defines all subscription features.

**Categories**:
- `modules`: Boolean flags for major features (gym, pos, restaurant, classes)
- `limits`: Numeric limits per plan (maxUsers, maxMembers, maxProducts)
- `features`: Feature flags (combinedBilling, thermalPrinting, creditCard)

**Feature check in middleware**:
```javascript
const requireModule = (moduleName) => {
  // Checks subscription.plan.features.modules[moduleName]
  // Trial mode bypasses checks
}
```

**Sync workflow**: Edit registry → run `npm run sync:features` → updates `SubscriptionPlan.features` JSON field.

## Testing Patterns

- Jest with `testEnvironment: 'node'`
- Setup: `tests/setup.js` runs before all tests
- Use `NODE_ENV=test` with dedicated test database
- Coverage enabled by default (`npm run test:coverage`)

## Key Files to Reference

- **Feature definitions**: `src/utils/featureRegistry.js`
- **Auth logic**: `src/middlewares/authMiddleware.js`, `src/utils/casl.js`
- **Transaction architecture**: `docs/TRANSACTION-ARCHITECTURE.md`
- **Race conditions**: `docs/RACE-CONDITION-PREVENTION.md`, `src/utils/concurrency.js`
- **SaaS flow**: `docs/SAAS-APPLICATION-FLOW.md`
- **Module structure**: `docs/MODULAR-STRUCTURE.md`

## Common Patterns

### Adding a new subscription feature
1. Add to `FEATURE_REGISTRY` in `src/utils/featureRegistry.js`
2. Update plan configurations (Basic/Professional/Enterprise)
3. Run `npm run sync:features`
4. Use `requireFeature('featureName')` middleware in routes

### Adding a new route
1. Create controller in `src/controllers/{module}/{name}Controller.js`
2. Create route in `src/routes/{module}/{name}.routes.js`
3. Export from `src/routes/{module}/index.js`
4. Add to `src/routes/index.js`
5. Run `npm run generate:routes` to update metadata

### Handling concurrent operations
```javascript
const { withRetry, atomicIncrement } = require('../utils/concurrency');

await withRetry(async () => {
  // Update operation on optimistic-locked model
});

// Or for counters
await atomicIncrement(model, 'fieldName', tenantId);
```

## Monitoring & Observability

- **Prometheus metrics**: Exposed at `/metrics` endpoint (`prom-client` integration)
- **Logging**: Winston logger in `src/utils/logger.js` (logs to `logs/` directory)
- **Audit trail**: Most operations logged with user context and tenant isolation
- **Health check**: `GET /health` endpoint returns `{ status: 'ok' }`

## Development Commands

```bash
npm run dev                # Start with nodemon (hot reload)
npm run start:dev          # NODE_ENV=development node src/server.js
npm run test               # Run Jest tests
npm run db:dev:reset       # Reset development database
npm run sync:features      # Sync feature registry to database
npm run generate:routes    # Regenerate routes metadata
npm run db:check-columns   # Check database column structure (see docs/DATABASE-COLUMN-CHECKER.md)
```

### Database Column Checker
Quick database structure inspection tool:
```bash
npm run db:check-columns                      # Show all tables
npm run db:check-columns -- --summary         # Summary only
npm run db:check-columns -- --table Users     # Specific table
npm run db:check-columns -- --search tenantId # Search column
npm run db:check-columns -- --export out.json # Export to JSON
```
See full documentation: `docs/DATABASE-COLUMN-CHECKER.md`
