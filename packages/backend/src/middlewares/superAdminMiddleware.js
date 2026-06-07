const { authenticate } = require('./authMiddleware');

function requireSuperAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  if (!req.user.isSuperAdmin) {
    return res.status(403).json({ message: 'Forbidden: Superadmin access required' });
  }
  
  next();
}

// Middleware to allow superadmin to access all tenants or regular users to access only their tenant
function tenantAccessControl(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  // If user is superadmin, allow access to all tenants
  if (req.user.isSuperAdmin) {
    // If tenantId is provided in query params, use it
    if (req.query.tenantId) {
      req.tenantId = req.query.tenantId;
    }
    // Otherwise, no tenant filter needed for superadmin
    next();
  } else {
    // Regular users can only access their own tenant
    if (req.user.tenantId) {
      req.tenantId = req.user.tenantId;
      next();
    } else {
      return res.status(403).json({ message: 'Forbidden: User has no tenant assigned' });
    }
  }
}

module.exports = { requireSuperAdmin, tenantAccessControl };