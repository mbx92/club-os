/**
 * Auto-authorization middleware — reads ROUTE_TO_SUBJECT_MAP and enforces
 * RBAC checks automatically for every mapped route.
 *
 * This makes RBAC opt-out instead of opt-in: any route added to the map
 * is automatically protected. Routes without a mapping are logged in dev
 * but allowed through to avoid breaking unmapped endpoints.
 *
 * Routes that already have inline `authorize()` calls will pass through
 * harmlessly (double-checked, but consistent).
 *
 * @module middlewares/autoAuthorizeMiddleware
 */

const { can } = require('../utils/rbac');
const { isTenantAdmin } = require('../utils/rbacUtils');

/**
 * Match a request path against a route pattern string.
 * Supports Express-style params like /users/:id and /service/management/:serviceId/assign-trainer.
 *
 * @param {string} pattern - Route pattern from ROUTE_TO_SUBJECT_MAP
 * @param {string} requestPath - Actual request path
 * @returns {object|null} Matched params or null
 */
function matchRoute(pattern, requestPath) {
  const patternParts = pattern.split('/');
  const pathParts = requestPath.split('/');

  if (patternParts.length !== pathParts.length) return null;

  const params = {};
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].slice(1)] = pathParts[i];
    } else if (patternParts[i] !== pathParts[i]) {
      return null;
    }
  }

  return params;
}

/**
 * RBAC-05 fix: reconstruct the full request path.
 *
 * ROUTE_TO_SUBJECT_MAP keys are written relative to the API root (e.g.
 * '/gym/staff-attendance/report'), but when `autoAuthorize` is mounted as
 * `router.use(autoAuthorize)` inside a sub-router (transaction.routes.js,
 * staffAttendance.routes.js, ...), `req.path` is only the portion *after*
 * that sub-router's mount point (e.g. '/report'), so it can never match.
 * `req.baseUrl + req.path` restores the full path, and we then strip the
 * leading `/api/vN` prefix app.js mounts all routes under so it lines up
 * with the map's un-prefixed patterns.
 */
function getFullRoutePath(req) {
  const full = `${req.baseUrl || ''}${req.path || ''}` || '/';
  return full.replace(/^\/api\/v\d+/, '') || '/';
}

/**
 * Find the route mapping for a given path + method.
 */
function findRouteMapping(path, method) {
  // Try to load lazily to avoid circular deps at module load time
  let ROUTE_TO_SUBJECT_MAP;
  try {
    ROUTE_TO_SUBJECT_MAP = require('../config/routePermissions').ROUTE_TO_SUBJECT_MAP;
  } catch (e) {
    return null;
  }

  // Sort keys by specificity (longer patterns first, more specific params later)
  const patterns = Object.keys(ROUTE_TO_SUBJECT_MAP).sort((a, b) => {
    // Static segments > param segments
    const aStatic = a.split('/').filter(s => !s.startsWith(':')).length;
    const bStatic = b.split('/').filter(s => !s.startsWith(':')).length;
    if (bStatic !== aStatic) return bStatic - aStatic;
    return b.length - a.length;
  });

  for (const pattern of patterns) {
    const match = matchRoute(pattern, path);
    if (!match) continue;

    const mapping = ROUTE_TO_SUBJECT_MAP[pattern];

    // Simple mapping — applies to all methods
    if (mapping.subject) {
      return { ...mapping, params: match };
    }

    // Method-specific mapping
    const upperMethod = method.toUpperCase();
    if (mapping[upperMethod]) {
      return { ...mapping[upperMethod], params: match };
    }
  }

  return null;
}

/**
 * Auto-authorize middleware.
 *
 * Checks ROUTE_TO_SUBJECT_MAP for the current request. If mapped, enforces
 * the RBAC check automatically. If not mapped, allows through (with dev warning).
 *
 * Apply this BEFORE route handlers but AFTER authenticate.
 *
 * @example
 * const { autoAuthorize } = require('./middlewares/autoAuthorizeMiddleware');
 * router.use(authenticate);
 * router.use(autoAuthorize);
 */
function autoAuthorize(req, res, next) {
  // Skip if not authenticated
  if (!req.user) return next();

  // Super admin bypasses everything
  if (req.user.isSuperAdmin) return next();

  // Tenant admin/owner bypass
  if (isTenantAdmin(req.user)) return next();

  // Find the route mapping
  const fullPath = getFullRoutePath(req);
  const mapping = findRouteMapping(fullPath, req.method);

  if (!mapping) {
    // Route not in the map — log in dev, allow through
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[autoAuthorize] Unmapped route: ${req.method} ${fullPath} — consider adding to routePermissions.js`);
    }
    return next();
  }

  const { subject, actions } = mapping;

  // Check if user has any of the required actions
  const allowed = actions.some(action => can(req.user, action, subject));

  if (!allowed) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[autoAuthorize] 403 Forbidden: ${req.method} ${fullPath} — role="${req.user.role?.name}", required=[${actions.join(',')}] on "${subject}"`);
    }
    return res.status(403).json({ message: 'Forbidden' });
  }

  next();
}

module.exports = { autoAuthorize, findRouteMapping, getFullRoutePath };
