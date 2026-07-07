# RBAC Audit — Club OS (Gym + Restaurant SaaS)

**Date:** 2026-07-07
**Scope:** `packages/backend` (Express/Sequelize) and `packages/frontend` (Vue 3 / Pinia / vue-router), with a focus on the newly-added *Batal Transaksi* (void/cancel transaction) feature for Gym and Restaurant.
**Method:** static code review of every route file, the RBAC engine, the frontend router guard and navigation filtering, plus **executable unit tests** written against the real RBAC engine (no mocks) to confirm behavior instead of guessing from reading code.

> A companion styled version of this report is available at `docs/RBAC-AUDIT.html`.

---

## 1. Executive Summary

The system has a real, mostly-coherent RBAC design: a single `can(user, action, subject)` engine on the backend, a route→subject map, and a mirrored `menuAccess` system on the frontend for hiding navigation. That core is sound. However the audit found **14 findings**, including **one Critical, cross-tenant privilege-escalation bug** and a **High severity gap directly affecting the void/cancel-transaction feature built in this session**.

| Severity | Count | IDs |
|---|---|---|
| 🔴 Critical | 1 | RBAC-01 |
| 🟠 High | 2 | RBAC-02, RBAC-03 |
| 🟡 Medium | 4 | RBAC-04, RBAC-05, RBAC-06, RBAC-14 |
| 🔵 Low | 5 | RBAC-07, RBAC-08, RBAC-09, RBAC-10, RBAC-11 |
| ⚪ Info | 2 | RBAC-12, RBAC-13 |

**Top priority:** RBAC-01 (roles are shared globally across every tenant, and any tenant admin can edit them) and RBAC-02 (voiding a transaction only requires the same generic permission as routine order updates, so kitchen/waiter/staff roles can void paid orders).

---

## 2. What Was Tested (not just read)

Reading code can miss runtime truths (e.g. how Express resolves `req.path` inside a mounted sub-router). To avoid guessing, a real Jest test file was added and executed against the **actual** RBAC engine — no database required:

```
packages/backend/tests/utils/rbacAudit.test.js
```

Run with:

```bash
npx jest --config '{"testEnvironment":"node","collectCoverage":false}' tests/utils/rbacAudit.test.js
```

**Result: 16/16 passed.** Several of the "passing" tests are *regression tests that intentionally assert the current buggy behavior* so they double as living proof for this report (each is annotated `REGRESSION` in the test file and cross-referenced to a Finding ID below).

```
PASS  tests/utils/rbacAudit.test.js
  RBAC — can() core engine
    ✓ super admin bypasses every check
    ✓ role with wildcard resources ("*": ["*"]) gets full access
    ✓ role is denied an action it was not granted
    ✓ role is allowed an action it was explicitly granted
    ✓ falls back to DEFAULT_ROLE_PERMISSIONS when role has no stored resources
    ✓ REGRESSION: default roles (cashier/trainer/kitchen/waiter/staff) cannot read "User"      [RBAC-10]
  RBAC — permissionUtils normalization
    ✓ normalizes legacy resource names (e.g. "transactions" -> "Transaction")
    ✓ hasFullAccess is true for {"*": ["*"]}, false for a scoped resource wildcard
    ✓ REGRESSION (Finding B8): "*" resource key ignores its action list, escalates to full access [RBAC-04]
    ✓ hasResourceAccess honors a per-resource wildcard action
    ✓ resolveRolePermissions derives menuAccess from resources when none stored
  RBAC — getEffectiveResources
    ✓ prefers stored role.permissions.resources over defaults
    ✓ returns {} for unknown role with no stored permissions
  RBAC — autoAuthorize route matching (Finding B1)
    ✓ REGRESSION: ROUTE_TO_SUBJECT_MAP full paths never match relative sub-router paths   [RBAC-05]
    ✓ sanity: findRouteMapping does work when given the full documented path
  RBAC — default role catalog sanity
    ✓ every non-admin default role is scoped (no accidental "*" wildcard)

Test Suites: 1 passed, 1 total
Tests:       16 passed, 16 total
```

Also attempted: run the project's *existing* test suite (`npm test`). **It currently cannot run at all** — see RBAC-11.

Also checked: the frontend has **no test runner configured** (no vitest/jest, no `test` script in `package.json`) — see RBAC-11.

---

## 3. Findings

### 🔴 RBAC-01 — Roles are global; any tenant Admin/Owner can edit or delete any role, including other tenants' custom roles

**Severity:** Critical
**Area:** Backend / multi-tenancy
**Files:**
- `packages/backend/src/models/role.js` (no `tenantId` column; `name` is globally `unique`)
- `packages/backend/src/migrations/20250923014850-create-role.js`
- `packages/backend/src/controllers/core/system/permissionController.js` (`getAllRoles`, `updateRole`, `updateRolePermissions`, `deleteRole`, `createRole` — all query `Role` with **no tenant filter**)
- `packages/backend/src/routes/core/system/permission.routes.js` (protected only by `authorize('update', 'Role')`)
- `packages/backend/src/middlewares/permissionMiddleware.js` (tenant admin/owner **bypass** the `can()` check entirely)

**Evidence:**

```12:76:packages/backend/src/middlewares/permissionMiddleware.js
    if (req.user.isSuperAdmin) {
      return next();
    }
    if (isTenantAdmin(req.user)) {
      return next();
    }
```

```9:14:packages/backend/src/models/role.js
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
```

```317:325:packages/backend/src/controllers/core/system/permissionController.js
    const role = await Role.findByPk(id);
    if (!role) {
      return res.status(404).json({ ... });
    }
    const nextPermissions = buildRolePermissionsPayload(...)
```

**Impact:** The `Roles` table has no `tenantId` and every user (of every tenant) with `roleId = X` shares the exact same row. `authorize('update', 'Role')` lets through **any tenant Admin/Owner** (not just super-admin), and the controllers never scope the query by tenant. This means:

- A tenant's own Admin, using the normal "Roles & Permissions" settings screen, can open `PATCH /permissions/roles/:id/permissions` for **any role ID that exists on the platform** — including a role that belongs to a completely different gym/restaurant tenant.
- Granting a low-privilege role (e.g. `cashier`) `{"*":["*"]}` instantly elevates **every cashier on every tenant** to full admin — a single click affects the whole SaaS platform, not just the acting tenant.
- Deleting or renaming a shared system role (`manager`, `cashier`, etc.) breaks login/menu resolution for every tenant using it.
- `createRole` enforces a **global unique `name`**, so tenants are effectively fighting over one shared namespace of custom role names too.

**Recommended fix:**
1. Add a nullable `tenantId` column to `Roles` (`null` = system/global default role, non-null = tenant-owned custom role).
2. Change the unique constraint to `unique: ['name', 'tenantId']`.
3. In every controller (`getAllRoles`, `updateRole`, `updateRolePermissions`, `deleteRole`), filter by `where: { id, tenantId: req.user.isSuperAdmin ? undefined : req.user.tenantId }` and **reject any request for a role owned by a different tenant** (404, not 403, to avoid leaking existence).
4. Prevent tenant Admin/Owner from mutating rows where `tenantId IS NULL` (the shared system defaults) — only Super Admin should be able to touch those. Tenant Admins should only be able to create/edit **their own tenant's custom roles**, cloned from the defaults.
5. Add a migration + backfill plan, and an integration test that asserts cross-tenant role access returns 404.

---

### 🟠 RBAC-02 — Voiding a transaction reuses the generic `Transaction:update` permission — no dedicated "cancel/void" permission

**Severity:** High
**Area:** Backend, directly affects the feature built in this session ("Batal Transaksi")
**Files:**
- `packages/backend/src/routes/gym/transaction/transaction.routes.js:90-94` (`/transactions/:id/cancel`)
- `packages/backend/src/modules/restaurant/routes/order.routes.js:192-194` (`/orders/:id/status`, used by the frontend to set `status: 'cancelled'`)
- `packages/backend/src/utils/defaultRolePermissions.js`

**Evidence:**

```90:94:packages/backend/src/routes/gym/transaction/transaction.routes.js
router.post('/:id/cancel',
  authorize('update', 'Transaction'),
  requireFeature('refunds'),
  transactionController.cancelTransaction
);
```

```192:194:packages/backend/src/modules/restaurant/routes/order.routes.js
router.put('/:id/status',
  authorize('update', 'Transaction'),
  orderController.updateOrderStatus
);
```

Default role grants (`defaultRolePermissions.js`) that already include `Transaction: update`:

```65:167:packages/backend/src/utils/defaultRolePermissions.js
  cashier:  { resources: { ..., Transaction: ALL, ... } },
  staff:    { resources: { ..., Transaction: READ_CREATE_UPDATE, ... } },
  kitchen:  { resources: { ..., Transaction: ['read', 'update'], ... } },
  waiter:   { resources: { ..., Transaction: READ_CREATE_UPDATE, ... } },
```

**Impact:** "Update a transaction's status from `pending` → `preparing`" and "**permanently void a paid/completed transaction**" are two very different, differently-risky actions, but they check the exact same permission (`update`/`Transaction`). By default:
- `waiter`, `kitchen`, and `staff` — roles meant for day-to-day order handling, not financial corrections — can already call the void/cancel endpoints for both Gym and Restaurant, because they all have `Transaction: update` by default.
- On the Restaurant side there is **no `requireFeature('refunds')` gate** on `/orders/:id/status`, unlike the Gym cancel route — so restaurant voiding isn't even tied to the subscription's `refunds` feature the way Gym is.
- The frontend `VoidTransactionPanel.vue` shows the "Batal" button purely based on transaction **status** (`canCancelGym`/`canCancelRestaurant`), with no client-side permission check at all — so any role that can reach the page sees the button.

**Recommended fix:**
1. Introduce a distinct action for destructive/financial corrections, e.g. `authorize('cancel', 'Transaction')`, and only grant `cancel` to `admin`, `owner`, `manager`, and (optionally) `cashier` by default — **not** `waiter`/`kitchen`/`staff`.
2. Apply it to both `POST /transactions/:id/cancel` (Gym) **and** special-case `PUT /orders/:id/status` in the restaurant controller: when the incoming `status === 'cancelled'` and the *previous* status was `completed`/`paid`, require `authorize('cancel', 'Transaction')` in addition to `update`.
3. Add `requireFeature('refunds')` to the restaurant cancel path for parity with Gym.
4. In `VoidTransactionPanel.vue`, hide the "Batal" button (in addition to the status check) using `checkPermission('cancel', 'Transaction')` from `usePermissions.js`, and gate the two `void-transactions` pages' route meta with `{ action: 'cancel', subject: 'Transaction' }` (see RBAC-06).

---

### 🟠 RBAC-03 — Payment gateway cancel/refund endpoints have no `authorize()` check

**Severity:** High
**Area:** Backend
**File:** `packages/backend/src/modules/payment-getway/routes/payment.routes.js`

**Evidence:**

```17:36:packages/backend/src/modules/payment-getway/routes/payment.routes.js
router.use(authenticate);
...
router.post('/cancel/:transactionNumber', paymentController.cancelPayment);
router.post('/refund/:transactionNumber', paymentController.refundPayment);
```

**Impact:** These routes only require *being logged in* — there is no `authorize('update', 'Payment')` (or similar) call, unlike every other payment/billing route in the codebase (compare with `billing.routes.js`, which correctly wraps every write route in `authorize(...)`). The controller does scope the lookup by `req.user.tenantId`, so this is **not** a cross-tenant issue, but it means **any authenticated user in the tenant — including a waiter, trainer, or a member — could cancel or refund a Midtrans payment** for their tenant, since there's no role check at all.

**Recommended fix:** add `authorize('update', 'Payment')` (matching the subject used elsewhere in `billing.routes.js`) to the `/cancel/:transactionNumber` and `/refund/:transactionNumber` routes, and add `Payment` to the `ROUTE_TO_SUBJECT_MAP` for consistency.

---

### 🟡 RBAC-04 — `normalizeResourcePermissions` silently escalates any `"*"` grant to full `["*"]` access

**Severity:** Medium (latent — becomes Critical the moment anyone configures a partial wildcard grant)
**Area:** Backend
**File:** `packages/backend/src/utils/permissionUtils.js:80-83`
**Proven by test:** `rbacAudit.test.js` → `REGRESSION (Finding B8)`

**Evidence:**

```76:89:packages/backend/src/utils/permissionUtils.js
  for (const [rawResource, rawActions] of Object.entries(resources)) {
    const resource = normalizeResourceName(rawResource);
    if (!resource) continue;

    if (resource === FULL_ACCESS_RESOURCE) {
      normalized[resource] = [FULL_ACCESS_ACTION];   // <-- ignores rawActions entirely
      continue;
    }
    ...
```

**Impact:** If a role is ever configured with `resources: { "*": ["read"] }` — intending "read-only access to every resource" — the normalizer throws away the `["read"]` and hard-codes `["*"]` (full CRUD on everything). Confirmed with a unit test:

```js
normalizeResourcePermissions({ '*': ['read'] })
// => { '*': ['*'] }   (should be { '*': ['read'] })
```

There's no UI path that currently sets this today (the role editor works per-resource), so it's currently **latent**, but it is a landmine for any future "read-only super role" feature or a manually-edited `Role.permissions` JSON in the database.

**Recommended fix:**
```js
if (resource === FULL_ACCESS_RESOURCE) {
  normalized[resource] = normalizeActionList(rawActions);
  continue;
}
```
Add a regression test (already added in `rbacAudit.test.js`) so this can't silently regress again.

---

### 🟡 RBAC-05 — `autoAuthorize` middleware can never match real requests (dead code masquerading as protection)

**Severity:** Medium (currently harmless because every route it's applied to also has inline `authorize()`, but risky if relied upon for a future route)
**Area:** Backend
**Files:** `packages/backend/src/middlewares/autoAuthorizeMiddleware.js`, used in `transaction.routes.js` and `staffAttendance.routes.js`
**Proven by test:** `rbacAudit.test.js` → `REGRESSION` in "autoAuthorize route matching"

**Evidence:** `ROUTE_TO_SUBJECT_MAP` keys are full paths like `/transactions/statistics`, but `transaction.routes.js` is mounted at `/transactions` and calls `router.use(autoAuthorize)` **from inside that sub-router** — by the time Express hands control to it, `req.path` is already relative to the mount point (e.g. `/statistics`, not `/transactions/statistics`). The map lookup therefore never succeeds for these two route files, and `autoAuthorize` silently falls through to "unmapped route — allow through" for every single request it's supposed to guard:

```99:118:packages/backend/src/middlewares/autoAuthorizeMiddleware.js
function autoAuthorize(req, res, next) {
  if (!req.user) return next();
  if (req.user.isSuperAdmin) return next();
  if (isTenantAdmin(req.user)) return next();
  const mapping = findRouteMapping(req.path, req.method);
  if (!mapping) {
    // Route not in the map — log in dev, allow through
    return next();
  }
  ...
```

**Impact:** Today this is **not exploitable**, because both `transaction.routes.js` and `staffAttendance.routes.js` also apply an explicit `authorize(action, subject)` per-route. But the comment on `autoAuthorize` explicitly sells it as "opt-out instead of opt-in… any route added to the map is automatically protected" — that promise is false for any route mounted under a path prefix (which is *all* of them, per `routes/index.js`). If a future route is added to one of these two files **relying only on `autoAuthorize`** (as the file's own docstring encourages), it would be **completely unprotected**.

**Recommended fix:** Either (a) fix `findRouteMapping`/the callers to reconstruct the full path via `req.baseUrl + req.path` before matching, and add a startup-time assertion that every mounted "auto-authorize" router's routes actually resolve to a mapping, or (b) remove `autoAuthorize` and its false sense of security, and keep relying on the already-consistent inline `authorize()` pattern used by the rest of the codebase.

---

### 🟡 RBAC-06 — Frontend route guard only checks permissions for ~4% of pages

**Severity:** Medium
**Area:** Frontend
**File:** `packages/frontend/src/router/index.js:330-345`

**Evidence:**

```330:345:packages/frontend/src/router/index.js
if (!isPublic && to.meta?.action && to.meta?.subject) {
  if (!isSuperAdmin) {
    const action = to.meta.action
    const subject = to.meta.subject
    if (!checkPermission(action, subject)) {
      return { path: '/403', ... }
    }
  }
}
```

This only runs when a page's own `<route>` block defines **both** `meta.action` and `meta.subject`. A repo-wide scan found:

```
total .vue pages: 136
pages defining meta.action + meta.subject: 6
  - index.vue
  - gym/trainers/[id]/commissions.vue
  - gym/transactions/index.vue
  - gym/transactions/pos.vue
  - gym/transactions/[id].vue
  - gym/memberships/plans.vue
```

The two new `void-transactions.vue` pages built this session are **not** in that list either.

**Impact:** For the other ~130 pages, direct URL navigation is blocked only by: (1) being logged in, (2) subscription/module gating, and (3) whatever the page's own API calls return (which *is* enforced server-side, assuming the backend route is correctly protected — see RBAC-01/02/03/05 for cases where it isn't). Menu-based hiding (`useNavigation.js`) prevents a link from being *shown*, but does not stop a user from typing the URL directly. This is a defense-in-depth gap: it's fine as long as every single backend endpoint is airtight, but the audit shows that isn't always true.

**Recommended fix:**
1. Add `meta.action` / `meta.subject` to every private page's `<route>` block as a matter of course (lint rule or codegen from the same `ROUTE_TO_SUBJECT_MAP`/`menuKey` data used on the backend — see RBAC-14).
2. At minimum, add it to the two new void-transaction pages (`{ action: 'cancel', subject: 'Transaction' }` once RBAC-02 introduces that action).
3. Consider a CI check that fails if a page under a private layout has no `meta.action`/`meta.subject`/`meta.public` at all (forces an explicit decision instead of silent inheritance).

---

### 🔵 RBAC-07 — `navigation.js` items declare `action`/`subject` that are never actually checked (misleading dead metadata)

**Severity:** Low (developer-experience / false sense of security)
**Area:** Frontend
**File:** `packages/frontend/src/navigation/navigation.js`, `packages/frontend/src/composables/core/useNavigation.js`

**Evidence:** Every nav item (including the two added this session) declares `action`/`subject`:

```js
{ label: "Batal Transaksi", to: "/gym/void-transactions", menuKey: "gym.void-transactions", action: "update", subject: "Transaction" }
```

But `filterByModuleAccess()` in `useNavigation.js` only ever calls `isMenuAllowed(item)` (checks `item.menuKey` against `menuAccess`) and `hasSubscriptionAccess(item)` — it **never reads `item.action`/`item.subject`**. A repo-wide search confirms `checkPermission`/`canAccess` is only invoked from `router/index.js` and inside `useNavigation.js` itself (and there, only exposed, never called against nav items).

**Impact:** A developer adding a new menu entry can set `action`/`subject` believing it gates visibility, when only `menuKey` (and its presence in the role's `menuAccess` array, itself derived from `resolveRolePermissions`) actually matters. This is exactly the kind of ambiguity that caused this session's void-transaction menu items to need three separate files updated by hand (see RBAC-14) — the `action`/`subject` fields look like they should be the single source of truth but aren't.

**Recommended fix:** Either wire `filterByModuleAccess` to also call `checkPermission(item.action, item.subject)` when present (making the fields meaningful), or remove them from `navigation.js` entirely and rely solely on `menuKey` to avoid the ambiguity.

---

### 🔵 RBAC-08 — No component ever hides a button/action based on granular permission

**Severity:** Low
**Area:** Frontend
**Evidence:** `checkPermission`/`canAccess`/`hasMenuAccess` (`usePermissions.js`) are used in exactly 3 files in the whole frontend: `router/index.js`, `usePermissions.js` itself, and `useNavigation.js` (which doesn't call them against items — see RBAC-07). No `.vue` file imports `checkPermission` to conditionally render a create/edit/delete button.

**Impact:** Once a user can view a page (which, per RBAC-06, is nearly unconditional), every button on it renders regardless of role — e.g. a `waiter` viewing the void-transactions table sees the exact same "Batal" button as a `manager`. The backend is the only real gate, which is fine *if and only if* every backend route is correctly scoped (RBAC-01/02/03 show it currently is not always the case). This also produces a poor UX: users click buttons that then fail with a 403 instead of never seeing them.

**Recommended fix:** Add a tiny reusable pattern, e.g. a `v-permission="{ action: 'cancel', subject: 'Transaction' }"` custom directive or a `<PermissionGate>` wrapper component built on `checkPermission`, and use it for at least the destructive actions (void/cancel/delete) across the app, starting with `VoidTransactionPanel.vue`.

---

### 🔵 RBAC-09 — Legacy placeholder module routes have no `authorize()` at all

**Severity:** Low (currently only returns static placeholder JSON, no real data)
**Area:** Backend
**Files:** `packages/backend/src/routes/gym/pos.routes.js`, `packages/backend/src/routes/gym/restaurant.routes.js` (mounted at `/modules/pos`, `/modules/restaurant`)

**Evidence:**
```19:21:packages/backend/src/routes/gym/pos.routes.js
router.use(authenticate);
router.use(requireModule(MODULE_NAME));
```
No `authorize()` call anywhere in either file — any authenticated user with the `pos`/`restaurant` module enabled on their tenant can hit every route.

**Impact:** Low today (`router.post('/transactions', ...)` etc. just return `{ message: 'implementation coming in Fase 2' }`), but these are real, reachable, mounted routes that shadow the module name of the real, fully-implemented restaurant module (`/restaurant/*`, mounted separately). If someone "finishes" these placeholders later without adding RBAC (easy to do, since the file never had a pattern to copy), real endpoints would ship unprotected.

**Recommended fix:** Either delete the dead placeholder route files (the real POS/restaurant modules already exist under `/modules/restaurant`* via `modules/restaurant/routes`), or add `authorize()` now so the pattern is correct before anyone builds on top of it.

---

### 🔵 RBAC-10 — Several default roles cannot pass their own `/auth/profile` permission check

**Severity:** Low (currently dead — the frontend never calls this endpoint — but a landmine)
**Area:** Backend
**Files:** `packages/backend/src/routes/core/auth/auth.routes.js:32`, `packages/backend/src/utils/defaultRolePermissions.js`
**Proven by test:** `rbacAudit.test.js` → `REGRESSION` in "can() core engine"

**Evidence:**
```32:34:packages/backend/src/routes/core/auth/auth.routes.js
router.get('/profile', authenticate, authorize('read', 'User'), auditLog('VIEW_PROFILE'), (req, res) => {
  res.json({ user: req.user });
});
```
`cashier`, `trainer`, `kitchen`, `waiter`, and `staff` have no `User` entry at all in `defaultRolePermissions.js`, so `can(user, 'read', 'User')` returns `false` for them by default — confirmed by test.

**Impact:** None currently (grep confirms the frontend never calls `/auth/profile`), but it's an inconsistency that will bite the next person who wires up this endpoint, or any tenant that customizes these roles and expects "view my own profile" to always work.

**Recommended fix:** Either give every default role baseline `User: ['read']`, or (better) special-case "read your own user record" so it doesn't depend on the generic `User` resource permission at all (e.g. skip the `authorize` check when `req.params.id === req.user.id` / when it's explicitly a "me" endpoint).

---

### 🔵 RBAC-11 — Zero automated test coverage for RBAC; the existing backend test suite currently cannot run; frontend has no test runner

**Severity:** Low (process/quality gate, not a direct vulnerability)
**Area:** Both

**Evidence:**
- No pre-existing tests reference `rbac.js`, `permissionUtils.js`, `autoAuthorizeMiddleware.js`, or `menuKeys.js` (`find packages/backend/tests -name "*.test.js"` → 10 files, none permission-related).
- Running the project's own `npm test` in `packages/backend` fails immediately for *every* suite, including pre-existing ones, because `NODE_ENV=test` has no matching `DB_DIALECT`/`.env.test`:
  ```
  FAIL tests/utils/passwordGenerator.test.js
    ● Test suite failed to run
      Dialect needs to be explicitly supplied as of v4.0.0
  ```
- `packages/frontend/package.json` has no `test` script and no `vitest`/`jest` dependency at all.

**Impact:** RBAC bugs like RBAC-04/05 (both confirmed via new tests in this audit) could ship silently and nobody would know until they were exploited or reported by a customer.

**Recommended fix:**
1. Fix the test environment (`.env.test` with a real/throwaway test DB, or mock `tests/setup.js` to skip the DB hook when no connection is configured) so `npm test` is runnable in CI again.
2. Land `packages/backend/tests/utils/rbacAudit.test.js` (added by this audit) permanently, and keep extending it as new subjects/roles are added.
3. Add `vitest` to the frontend and at least unit-test `usePermissions.js` (`checkPermission`, `hasMenuAccess`) — it has zero dependencies on the DOM and is trivial to test in isolation with a mocked Pinia store.
4. Add a CI job that runs both suites on every PR.

---

### ⚪ RBAC-12 — CORS reflects the request origin even when not in the allow-list, "in production too"

**Severity:** Info (adjacent to RBAC, not RBAC itself)
**File:** `packages/backend/src/app.js:55-59`

```55:59:packages/backend/src/app.js
if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
  callback(null, origin);
} else {
  callback(null, origin); // Allow all in production too, but with specific origin
}
```

Both branches call `callback(null, origin)` — the allow-list check has no actual effect; any origin is reflected back with `credentials: true`. Worth tightening once outside the scope of this specific audit, since a stolen/XSS'd token becomes easier to use cross-origin.

---

### ⚪ RBAC-13 — `JWT_SECRET` falls back to a hardcoded default if the env var is missing

**Severity:** Info
**File:** `packages/backend/src/utils/jwt.js:4`

```js
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
```

If a deployment ever forgets to set `JWT_SECRET`, every token (including role/tenant claims) can be forged with a well-known default. Recommend failing fast (`throw` at boot) instead of silently falling back, at least for `NODE_ENV=production`.

---

### 🟡 RBAC-14 — Menu-key ↔ permission wiring is manually duplicated across 3 files

**Severity:** Medium (process/maintainability, directly caused rework in this session)
**Files:** `packages/frontend/src/navigation/menuKeys.js`, `packages/frontend/src/navigation/menuKeyUtils.js` (`SUBJECT_MENU_MAP`), `packages/backend/src/utils/menuKeys.js`

**Impact:** Adding the two `void-transactions` menu keys this session required hand-editing three separate role→menuKey allow-lists (frontend `menuKeys.js`, frontend `SUBJECT_MENU_MAP`, and the backend mirror in `menuKeys.js`) to stay in sync. There is no shared source of truth and no test asserting the three stay consistent — a missed file silently breaks either menu visibility or `SUBJECT_MENU_MAP`-based fallbacks, and is easy to miss in review since none of the three files import from each other.

**Recommended fix:** Generate the frontend `menuKeys.js` from the backend's copy at build time (single source of truth, backend owns RBAC data), or move both into a shared package/JSON file imported by both apps. At minimum, add a script (`npm run check:menu-keys`) that diffs the three lists and fails CI if they diverge.

---

## 4. Findings Summary Table

| ID | Severity | Title |
|---|---|---|
| RBAC-01 | 🔴 Critical | Global `Roles` table — cross-tenant privilege escalation via role editor |
| RBAC-02 | 🟠 High | Void/cancel transaction reuses generic `Transaction:update` — no dedicated permission |
| RBAC-03 | 🟠 High | Payment cancel/refund endpoints missing `authorize()` |
| RBAC-04 | 🟡 Medium | `normalizeResourcePermissions` escalates any `"*"` grant to full access |
| RBAC-05 | 🟡 Medium | `autoAuthorize` middleware never actually matches (dead protection) |
| RBAC-06 | 🟡 Medium | Frontend route guard covers only ~4% of pages |
| RBAC-14 | 🟡 Medium | Menu key/permission data duplicated across 3 files, no consistency check |
| RBAC-07 | 🔵 Low | `navigation.js` `action`/`subject` fields unused/misleading |
| RBAC-08 | 🔵 Low | No component-level (button) permission gating |
| RBAC-09 | 🔵 Low | Legacy placeholder module routes missing `authorize()` |
| RBAC-10 | 🔵 Low | Several roles fail their own `/auth/profile` check by default |
| RBAC-11 | 🔵 Low | No RBAC test coverage; backend test suite currently broken; no frontend tests |
| RBAC-12 | ⚪ Info | CORS reflects any origin |
| RBAC-13 | ⚪ Info | Weak hardcoded `JWT_SECRET` fallback |

---

## 5. Best Practices — How To Fix What Was Found (Action Plan)

Priority order, roughly matching severity and blast radius:

1. **RBAC-01 (Critical)** — Add `tenantId` to `Roles`, scope every role controller query by tenant, block tenant admins from editing global/system-default roles. Ship an audit-log alert for any `Role` mutation touching a `tenantId IS NULL` row.
2. **RBAC-02 (High)** — Add a `cancel` action distinct from `update` for `Transaction`; restrict it to admin/owner/manager (+cashier if desired) by default; enforce it on both Gym cancel and Restaurant "set status to cancelled"; mirror the check client-side.
3. **RBAC-03 (High)** — Add `authorize('update', 'Payment')` to the two payment routes.
4. **RBAC-04 (Medium)** — One-line fix in `normalizeResourcePermissions`; keep the regression test.
5. **RBAC-05 (Medium)** — Fix `findRouteMapping` to use the full mounted path, or delete `autoAuthorize` and its misleading docstring.
6. **RBAC-06 (Medium)** — Backfill `meta.action`/`meta.subject` on private pages, starting with financially-sensitive ones (void-transactions, settings, refunds).
7. **RBAC-14 (Medium)** — Generate/derive the menu-key lists instead of hand-syncing 3 files; add a CI consistency check as a stop-gap.
8. **RBAC-07/08 (Low)** — Either wire `action`/`subject` into `useNavigation`'s filtering or delete them; add a `<PermissionGate>`/`v-permission` pattern for destructive buttons.
9. **RBAC-09/10 (Low)** — Add `authorize()` to placeholder routes or delete them; give roles baseline `User:read` or special-case "my profile".
10. **RBAC-11 (Low, but unblocks everything above)** — Fix the backend test environment, land the new RBAC test file, add frontend unit tests for `usePermissions.js`, wire both into CI so regressions in items 1–9 are caught automatically going forward.
11. **RBAC-12/13 (Info)** — Tighten CORS allow-list enforcement; make `JWT_SECRET` required (fail-fast) in production.

---

## 6. Best Practices — How To Implement RBAC Correctly Going Forward

### 6.1 Backend

1. **One source of truth for "what can call what."** Keep using `ROUTE_TO_SUBJECT_MAP` / `PERMISSION_CATALOG`, but make it *load-bearing*: either fix and actually rely on `autoAuthorize`, or delete it and standardize 100% on the explicit `router.METHOD(path, authorize(action, subject), controller)` pattern already used almost everywhere. Don't keep both a real and a fake enforcement path in the same codebase — it's how RBAC-05 happened.
2. **Multi-tenancy is a permission dimension, not an afterthought.** Every model that can be customized *per tenant* (roles, printer settings, receipt templates, etc.) needs a `tenantId` column and every query touching it needs `where: { tenantId }` — even for "admin" endpoints. `isTenantAdmin()` should only ever grant blanket access *within the acting user's own tenant*, never globally. Add a lint/test convention: any controller for a tenant-scoped model must include `tenantId` in its `WHERE` clause; consider a query-builder wrapper that makes it impossible to forget.
3. **Separate "routine write" from "destructive/financial correction."** Don't reuse `update` for both "change order status to preparing" and "void a paid transaction." Model these as distinct actions (`update` vs `cancel`/`refund`/`void`) so role defaults can differ meaningfully. A good rule of thumb: if reversing the action requires a manager approval in real life, it should require a distinct permission in code.
4. **Fail closed, not open.** `can()` already defaults to `false` when nothing matches — keep that. Never write a middleware (like the current `autoAuthorize`) that defaults to "allow" when it can't find a match; log-and-deny is safer than log-and-allow for anything auth-related.
5. **No hardcoded secret fallbacks.** `JWT_SECRET`, `OPERATOR_JWT_SECRET`, etc. should throw at process boot if unset in any non-development environment.
6. **Test the permission engine like business logic, because it is.** Pure functions (`can`, `hasResourceAccess`, `normalizeResourcePermissions`, `findRouteMapping`) don't need a database — unit test them directly (see `tests/utils/rbacAudit.test.js` for a starting point). Reserve integration tests (real DB, real HTTP) for verifying that routes are actually wired to the right `authorize()` call and that tenant scoping holds.
7. **Audit-log every permission/role mutation** (already partially done via `auditLog(...)` — extend it to flag cross-tenant or global-role changes specifically, since those are the highest-blast-radius operations).

### 6.2 Frontend

1. **Treat the router guard as UX, the backend as the real gate — but still turn the UX on.** `meta.action`/`meta.subject` should be set on every private page, not 6 out of 136. Consider generating this from the same route→subject data used to build `menuKey`s so it can't drift.
2. **One mechanism per concern.** Don't have two systems (`menuKey` and `action`/`subject`) that look like they both gate the same thing when only one actually does. Either make `useNavigation.js` check both, or delete the unused one — ambiguity here is exactly what causes future contributors to "protect" something that isn't actually protected.
3. **Gate destructive UI at the component level, not just the page level.** A reusable `checkPermission(action, subject)` composable already exists — use it. A small `<PermissionGate action="cancel" subject="Transaction"><button>...</button></PermissionGate>` wrapper (or a `v-permission` directive) removes the temptation to skip this per-button.
4. **Keep permission data fresh and minimal in storage.** `permissions` (resources/menuAccess) are cached in `localStorage`/`sessionStorage` alongside the token — that's normal for an SPA, but make sure a role/permission change on the backend invalidates the cached copy quickly (short polling or a "permissions changed" push) rather than only refreshing on next login.
5. **Single source of truth for menu keys.** Generate the frontend's `menuKeys.js` and `SUBJECT_MENU_MAP` from the backend's copy (a small build script that reads the backend file and emits a frontend-consumable JSON/JS module) instead of hand-syncing three files per change.
6. **Write tests.** Add `vitest` (or similar) and cover `usePermissions.js` and the router guard's permission branch — these are pure/mockable and cheap to test, and they're exactly the layer that silently drifted in this audit (RBAC-06/07).

### 6.3 Checklist for every new protected feature (use this for the next one)

- [ ] Backend route wrapped in `authenticate` + `authorize(action, subject)` (or a more specific action like `cancel`/`refund` if it's a destructive/financial operation).
- [ ] Route added to `ROUTE_TO_SUBJECT_MAP` for documentation/tooling purposes even if `autoAuthorize` isn't relied upon.
- [ ] `subject` added to `defaultRolePermissions.js` for every role that should have access, and explicitly *absent* from roles that shouldn't.
- [ ] Menu key added to `menuKeys.js` (frontend **and** backend) and `SUBJECT_MENU_MAP` if applicable — verified with a diff, not just "seems right."
- [ ] Frontend page's `<route>` block sets `meta.action` + `meta.subject` matching the backend check.
- [ ] Any destructive button on the page wrapped in a client-side `checkPermission(...)` check in addition to the status/business-rule check.
- [ ] Cross-tenant test: a user from Tenant B cannot read/mutate Tenant A's data via this route, even with a matching role.
- [ ] Unit test added for any new pure permission logic; at least one integration test hitting the route as an authorized and an unauthorized role.
