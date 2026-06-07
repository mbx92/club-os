const { defineAbilitiesFor } = require('../utils/casl');

function authorizeCasl(action, subject) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const ability = defineAbilitiesFor(req.user);

    // For superadmin, skip tenant validation
    if (req.user.isSuperAdmin) {
      return next(); // Superadmin has access to everything
    }

    // For regular users, validate tenant context
    // For GET /tenants/:id, we need to check if the tenant belongs to the user's tenant
    if (req.user && !req.user.isSuperAdmin) {
      // If subject is a string (model name), we'll check at controller level
      if (typeof subject === 'string') {
        if (ability.can(action, subject)) {
          return next();
        }
        return res.status(403).json({ message: 'Forbidden by CASL policy' });
      }
      
      // If subject is an object with tenantId, validate it
      if (typeof subject === 'object' && subject.tenantId && subject.tenantId !== req.user.tenantId) {
        return res.status(403).json({ message: 'Forbidden: resource belongs to different tenant' });
      }
    }

    if (ability.can(action, subject)) {
      return next();
    }
    return res.status(403).json({ message: 'Forbidden by CASL policy' });
  };
}

module.exports = { authorizeCasl };
