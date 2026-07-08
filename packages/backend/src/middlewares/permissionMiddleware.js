const { can } = require('../utils/rbac');
const { isTenantAdmin } = require('../utils/rbacUtils');

/**
 * Simple resource/action permission middleware.
 *
 * @param {string} action - Permission action (read, create, update, delete)
 * @param {string} subject - Resource name (Member, Tenant, etc.)
 *
 * @example
 * router.get('/', authenticate, authorize('read', 'Member'), getMembers);
 */
function authorize(action, subject) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    // Super admin bypasses everything
    if (req.user.isSuperAdmin) {
      return next();
    }

    // Tenant admin/owner roles get full access within their tenant
    if (isTenantAdmin(req.user)) {
      return next();
    }

    // For object subjects with tenantId, validate tenant ownership
    if (typeof subject === 'object' && subject.tenantId && subject.tenantId !== req.user.tenantId) {
      return res.status(403).json({ message: 'Forbidden: resource belongs to different tenant' });
    }

    if (typeof subject === 'string') {
      if (can(req.user, action, subject)) {
        return next();
      }
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[permission] 403 Forbidden: ${req.method} ${req.originalUrl} — user role="${req.user.role?.name}" (id=${req.user.role?.id}), action="${action}", subject="${subject}"`);
      }
      return res.status(403).json({
        message: 'Forbidden',
        code: 'PERMISSION_DENIED',
        required: { action, subject },
        role: req.user.role ? { id: req.user.role.id, name: req.user.role.name } : null,
      });
    }

    // Fallback: if subject is some other object, just check via string
    if (can(req.user, action, String(subject))) {
      return next();
    }
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[permission] 403 Forbidden (object subject): ${req.method} ${req.originalUrl} — user role="${req.user.role?.name}"`);
    }
    return res.status(403).json({ message: 'Forbidden' });
  };
}

/**
 * Allow if the user has any of the listed actions on the subject.
 * Use for POS flows where "create transaction" should cover adding line items.
 */
function authorizeAny(actions, subject) {
  const actionList = Array.isArray(actions) ? actions : [actions];
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    if (req.user.isSuperAdmin || isTenantAdmin(req.user)) {
      return next();
    }

    const allowed = actionList.some(action => can(req.user, action, subject));
    if (allowed) return next();

    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        `[permission] 403 Forbidden: ${req.method} ${req.originalUrl} — user role="${req.user.role?.name}", ` +
        `required one of [${actionList.join(', ')}] on "${subject}"`
      );
    }
    return res.status(403).json({
      message: 'Forbidden',
      code: 'PERMISSION_DENIED',
      required: { actions: actionList, subject },
      role: req.user.role ? { id: req.user.role.id, name: req.user.role.name } : null,
    });
  };
}

module.exports = { authorize, authorizeAny };
