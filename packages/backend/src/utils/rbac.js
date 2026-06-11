const { getDefaultPermissionsForRole, resolveConditions } = require('./defaultRolePermissions');

/**
 * Apply an array of serialised rules onto a condition-resolved flat list.
 * Returns an array of resolved rule objects.
 */
function resolveRules(rules, user) {
  return rules.map(rule => {
    const conditions = resolveConditions(rule.conditions, user);
    const actions = rule.actions
      ? (Array.isArray(rule.actions) ? rule.actions : [rule.actions])
      : (rule.action ? [rule.action] : []);
    return { ...rule, actions, conditions, resolvedConditions: conditions };
  });
}

/**
 * Get effective rules for a user.
 * Priority:
 *   1. SuperAdmin → special flag
 *   2. DB-stored Role.permissions.rules (customised by admin)
 *   3. DEFAULT_ROLE_PERMISSIONS fallback
 *   4. Unknown role → no permissions
 */
function getEffectiveRules(user) {
  if (!user) {
    return [{ action: 'read', subject: 'Public' }];
  }

  // DB-driven: Role.permissions.rules set by an admin
  const storedRules = user.role?.permissions?.rules;
  if (Array.isArray(storedRules) && storedRules.length > 0) {
    return resolveRules(storedRules, user);
  }

  // Fallback to compiled defaults
  const defaults = getDefaultPermissionsForRole(user.role?.name);
  if (defaults?.rules) {
    return resolveRules(defaults.rules, user);
  }

  return [];
}

const isProd = process.env.NODE_ENV === 'production';

/**
 * Simple permission check — does user have a rule allowing action on subject?
 * SuperAdmin always returns true.
 */
function can(user, action, subject) {
  if (user?.isSuperAdmin) return true;

  const rules = getEffectiveRules(user);

  if (!isProd && rules.length === 0) {
    console.warn(`[rbac] can("${action}","${subject}"): ZERO effective rules for role="${user?.role?.name}", tenantId="${user?.tenantId}"`);
  }

  const allowed = rules.some(r => {
    if (r.inverted) return false;
    const actionMatch = r.actions.includes('manage') || r.actions.includes(action);
    const subjectMatch = r.subject === 'all' || r.subject === subject;
    return actionMatch && subjectMatch;
  });

  if (!isProd && !allowed) {
    console.warn(`[rbac] can("${action}","${subject}"): DENIED — ${rules.length} rules, no match for role="${user?.role?.name}". Rules:`,
      rules.map(r => `${r.subject}:${r.actions.join(',')}`).join(' | '));
  }

  return allowed;
}

module.exports = { can, getEffectiveRules };
