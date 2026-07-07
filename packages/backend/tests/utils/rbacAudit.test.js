/**
 * RBAC Audit Tests
 *
 * These are pure unit tests for the RBAC engine (`utils/rbac.js`,
 * `utils/permissionUtils.js`, `middlewares/autoAuthorizeMiddleware.js`).
 * They do NOT touch the database and can be run in isolation, e.g.:
 *
 *   npx jest --config '{"testEnvironment":"node"}' tests/utils/rbacAudit.test.js
 *
 * (the project-wide `npm test` currently requires a live Postgres test
 * database — see RBAC-AUDIT.md, Finding RBAC-11 — which is why these are
 * kept DB-free so they can run anywhere.)
 *
 * This file originally documented 14 findings from the RBAC audit (several
 * as REGRESSION tests that intentionally asserted buggy behavior as proof).
 * All of those findings have since been fixed in the source — see
 * docs/RBAC-AUDIT.md for the write-up — and the tests below have been
 * updated to assert the corrected behavior instead, so they now function as
 * ordinary regression protection against the bugs coming back.
 */

const { can, getEffectiveResources } = require('../../src/utils/rbac');
const {
  hasFullAccess,
  hasResourceAccess,
  normalizeResourcePermissions,
  resolveRolePermissions,
} = require('../../src/utils/permissionUtils');
const { getDefaultPermissionsForRole } = require('../../src/utils/defaultRolePermissions');
const { findRouteMapping, getFullRoutePath } = require('../../src/middlewares/autoAuthorizeMiddleware');

function makeUser({ role, permissions, isSuperAdmin = false } = {}) {
  return {
    isSuperAdmin,
    role: role ? { name: role, permissions } : undefined,
  };
}

describe('RBAC — can() core engine', () => {
  test('super admin bypasses every check', () => {
    const user = makeUser({ isSuperAdmin: true });
    expect(can(user, 'delete', 'Tenant')).toBe(true);
  });

  test('role with wildcard resources ("*": ["*"]) gets full access', () => {
    const user = makeUser({ role: 'admin', permissions: { resources: { '*': ['*'] } } });
    expect(can(user, 'delete', 'AnythingAtAll')).toBe(true);
  });

  test('role is denied an action it was not granted', () => {
    const user = makeUser({
      role: 'cashier',
      permissions: { resources: { Transaction: ['read', 'create'] } },
    });
    expect(can(user, 'delete', 'Transaction')).toBe(false);
  });

  test('role is allowed an action it was explicitly granted', () => {
    const user = makeUser({
      role: 'cashier',
      permissions: { resources: { Transaction: ['read', 'create'] } },
    });
    expect(can(user, 'read', 'Transaction')).toBe(true);
  });

  test('falls back to DEFAULT_ROLE_PERMISSIONS when role has no stored resources', () => {
    // No `permissions.resources` on the role at all → should fall back to
    // defaultRolePermissions.js for the named role.
    const user = makeUser({ role: 'trainer', permissions: {} });
    expect(can(user, 'read', 'Member')).toBe(true); // trainer default grants Member:read
    expect(can(user, 'delete', 'Member')).toBe(false); // but not delete
  });

  test('FIXED (RBAC-10): default roles (cashier/trainer/kitchen/waiter/staff) still ' +
    'have no generic "User" grant, by design — GET /auth/profile no longer depends on it', () => {
    // These five roles intentionally have no `User` entry in
    // defaultRolePermissions.js (User:read/write governs looking up *other*
    // users, which most roles shouldn't have). The RBAC-10 fix was to stop
    // gating "read your own profile" behind this permission at all (see
    // auth.routes.js) rather than granting every role a broad User:read.
    for (const role of ['cashier', 'trainer', 'kitchen', 'waiter', 'staff']) {
      const user = makeUser({ role, permissions: {} });
      expect(can(user, 'read', 'User')).toBe(false);
    }
  });

  test('FIXED (RBAC-02): Transaction:update does NOT imply the "cancel" (void) action', () => {
    const user = makeUser({
      role: 'staff',
      permissions: { resources: { Transaction: ['read', 'create', 'update'] } },
    });
    expect(can(user, 'update', 'Transaction')).toBe(true);
    expect(can(user, 'cancel', 'Transaction')).toBe(false);
  });

  test('FIXED (RBAC-02): manager/cashier defaults explicitly grant Transaction:cancel, ' +
    'but staff/kitchen/waiter (order-handling only) do not', () => {
    for (const role of ['manager', 'cashier']) {
      const defaults = getDefaultPermissionsForRole(role);
      expect(defaults.resources.Transaction).toContain('cancel');
    }
    for (const role of ['staff', 'kitchen', 'waiter']) {
      const defaults = getDefaultPermissionsForRole(role);
      expect(defaults.resources.Transaction || []).not.toContain('cancel');
    }
  });
});

describe('RBAC — permissionUtils normalization', () => {
  test('normalizes legacy resource names (e.g. "transactions" -> "Transaction")', () => {
    const normalized = normalizeResourcePermissions({ transactions: ['read'] });
    expect(normalized).toEqual({ Transaction: ['read'] });
  });

  test('hasFullAccess is true for {"*": ["*"]}, false for a scoped resource wildcard', () => {
    expect(hasFullAccess({ '*': ['*'] })).toBe(true);
    expect(hasFullAccess({ Transaction: ['*'] })).toBe(false);
  });

  test('FIXED (RBAC-04): a partial wildcard grant like {"*": ["read"]} no longer ' +
    'silently escalates to full {"*": ["*"]} access', () => {
    // Intent: grant read-only access to every resource. Previously this was
    // hard-coded to normalized['*'] = ['*'] whenever the resource key was
    // '*', ignoring whatever actions were actually configured — a full
    // privilege-escalation bug for any role granted a scoped "*" permission.
    const readOnlyEverything = normalizeResourcePermissions({ '*': ['read'] });
    expect(readOnlyEverything).toEqual({ '*': ['read'] });
    expect(hasFullAccess(readOnlyEverything)).toBe(false);
  });

  test('FIXED (RBAC-04): a literal "*" action under the "*" resource key is preserved ' +
    '(still grants true full access, unlike a partial grant)', () => {
    const fullAccess = normalizeResourcePermissions({ '*': ['*'] });
    expect(fullAccess).toEqual({ '*': ['*'] });
    expect(hasFullAccess(fullAccess)).toBe(true);
  });

  test('hasResourceAccess honors a per-resource wildcard action', () => {
    expect(hasResourceAccess({ Transaction: ['*'] }, 'delete', 'Transaction')).toBe(true);
    expect(hasResourceAccess({ Transaction: ['read'] }, 'delete', 'Transaction')).toBe(false);
  });

  test('FIXED (RBAC-04): hasResourceAccess also honors a partial wildcard grant across ' +
    'every resource, without escalating to full access on any single resource', () => {
    const readEverything = { '*': ['read'] };
    expect(hasResourceAccess(readEverything, 'read', 'Transaction')).toBe(true);
    expect(hasResourceAccess(readEverything, 'read', 'AnyOtherResource')).toBe(true);
    expect(hasResourceAccess(readEverything, 'delete', 'Transaction')).toBe(false);
    expect(hasFullAccess(readEverything)).toBe(false);
  });

  test('resolveRolePermissions derives menuAccess from resources when none stored', () => {
    const resolved = resolveRolePermissions({ resources: { Member: ['read'] } }, 'trainer');
    expect(Array.isArray(resolved.menuAccess)).toBe(true);
  });
});

describe('RBAC — getEffectiveResources', () => {
  test('merges stored role.permissions.resources with role defaults', () => {
    const user = makeUser({
      role: 'manager',
      permissions: { resources: { Member: ['read'] } },
    });
    const resources = getEffectiveResources(user);
    expect(resources.Member).toEqual(['read']);
    expect(resources.Tenant).toContain('read');
  });

  test('returns {} for unknown role with no stored permissions', () => {
    const user = makeUser({ role: 'totally-made-up-role', permissions: {} });
    expect(getEffectiveResources(user)).toEqual({});
  });
});

describe('RBAC — autoAuthorize route matching (RBAC-05)', () => {
  test('a bare relative path (what req.path looks like inside a mounted sub-router, ' +
    'without reconstruction) still never matches the full-path map — this is why ' +
    'getFullRoutePath() exists', () => {
    const relativePathAsSeenByMiddleware = '/statistics';
    expect(findRouteMapping(relativePathAsSeenByMiddleware, 'GET')).toBeNull();
  });

  test('sanity: findRouteMapping does work when given the full documented path', () => {
    const mapping = findRouteMapping('/gym/dashboard/petty-cash', 'GET');
    expect(mapping).toMatchObject({ subject: 'CashRegisterSession', actions: ['read'] });
  });

  test('FIXED (RBAC-05): getFullRoutePath() reconstructs req.baseUrl + req.path and ' +
    'strips the /api/vN prefix, so requests through a mounted sub-router now match', () => {
    // transaction.routes.js is mounted at `/transactions` under the global
    // `/api/v1` prefix, and calls `router.use(autoAuthorize)` from *inside*
    // that router. Express only exposes the portion of the path *after* the
    // sub-router's mount point as `req.path` — `req.baseUrl` holds the rest.
    const reqInsideSubRouter = { baseUrl: '/api/v1/transactions', path: '/statistics' };
    const fullPath = getFullRoutePath(reqInsideSubRouter);

    expect(fullPath).toBe('/transactions/statistics');
    expect(findRouteMapping(fullPath, 'GET')).toMatchObject({ subject: 'Transaction', actions: ['read'] });
  });

  test('FIXED (RBAC-05): staffAttendance sub-router paths resolve and match correctly too', () => {
    const req = { baseUrl: '/api/v1/gym/staff-attendance', path: '/report' };
    const fullPath = getFullRoutePath(req);

    expect(fullPath).toBe('/gym/staff-attendance/report');
    expect(findRouteMapping(fullPath, 'GET')).toMatchObject({ subject: 'StaffAttendance', actions: ['read'] });
  });

  test('FIXED: trailing slash on staff-attendance list must require read, not empty :id update', () => {
    const req = { baseUrl: '/api/v1/gym/staff-attendance', path: '/' };
    const fullPath = getFullRoutePath(req);

    expect(fullPath).toBe('/gym/staff-attendance');
    expect(findRouteMapping(fullPath, 'GET')).toMatchObject({ subject: 'StaffAttendance', actions: ['read'] });
  });

  test('cashier can read staff-attendance list route (read permission only)', () => {
    const user = makeUser({ role: 'cashier', permissions: {} });
    const fullPath = getFullRoutePath({ baseUrl: '/api/v1/gym/staff-attendance', path: '/' });
    const mapping = findRouteMapping(fullPath, 'GET');

    expect(mapping).toMatchObject({ subject: 'StaffAttendance', actions: ['read'] });
    expect(can(user, 'read', 'StaffAttendance')).toBe(true);
    expect(mapping.actions.every((action) => can(user, action, mapping.subject))).toBe(true);
  });

  test('FIXED (RBAC-02/05): the dedicated Transaction cancel/refund routes now have ' +
    'explicit map entries requiring the "cancel" action, not "update"', () => {
    for (const suffix of ['cancel', 'refund', 'refund-items']) {
      const fullPath = getFullRoutePath({ baseUrl: '/api/v1/transactions', path: `/some-id/${suffix}` });
      expect(findRouteMapping(fullPath, 'POST')).toMatchObject({ subject: 'Transaction', actions: ['cancel'] });
    }
  });
});

describe('RBAC — default role catalog sanity', () => {
  test('every non-admin default role is scoped (no accidental "*" wildcard)', () => {
    for (const role of ['manager', 'cashier', 'staff', 'trainer', 'kitchen', 'waiter', 'user']) {
      const defaults = getDefaultPermissionsForRole(role);
      expect(defaults.resources['*']).toBeUndefined();
    }
  });

  test('legacy cashier rules without Tenant still inherit Tenant:read from defaults', () => {
    const legacyCashier = {
      role: {
        name: 'Cashier',
        permissions: {
          rules: [
            { subject: 'Transaction', actions: ['read', 'create', 'update'] },
            { subject: 'Payment', actions: ['read', 'create'] },
          ],
        },
      },
    };

    expect(can(legacyCashier, 'read', 'Tenant')).toBe(true);
    expect(can(legacyCashier, 'read', 'Transaction')).toBe(true);
    expect(getEffectiveResources(legacyCashier).Tenant).toContain('read');
  });

  test('empty resources object does not block legacy rules from being applied', () => {
    const user = makeUser({
      role: 'cashier',
      permissions: {
        resources: {},
        rules: [
          { subject: 'Transaction', actions: ['read', 'create'] },
        ],
      },
    });

    expect(can(user, 'create', 'Transaction')).toBe(true);
  });

  test('cashier with Expense:create in resources is allowed to create expenses', () => {
    const user = makeUser({
      role: 'cashier',
      permissions: {
        resources: { Expense: ['read', 'create'] },
        menuAccess: ['finances', 'finances.expenses'],
      },
    });

    expect(can(user, 'create', 'Expense')).toBe(true);
    expect(can(user, 'read', 'Expense')).toBe(true);
    expect(can(user, 'delete', 'Expense')).toBe(false);
  });
});
