function authorize(roles = []) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    if (!Array.isArray(roles)) {
      roles = [roles];
    }

    if (!roles.includes(req.user.role.name)) {
      return res.status(403).json({ message: 'Forbidden: insufficient role' });
    }

    next();
  };
}

/**
 * Middleware to ensure user is super admin
 */
function requireSuperAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ 
      success: false,
      message: 'Unauthorized: Authentication required' 
    });
  }

  if (!req.user.isSuperAdmin) {
    return res.status(403).json({ 
      success: false,
      message: 'Forbidden: Super Admin access required' 
    });
  }

  next();
}

function requireSuperAdminOrAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Authentication required'
    });
  }

  if (req.user.isSuperAdmin || req.user.role?.name === 'admin') {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Forbidden: Super Admin or Admin access required'
  });
}

module.exports = { authorize, requireSuperAdmin, requireSuperAdminOrAdmin };
