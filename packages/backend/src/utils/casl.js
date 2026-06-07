const { AbilityBuilder, Ability } = require('@casl/ability');
const { resolveConditions, getDefaultPermissionsForRole } = require('./defaultRolePermissions');

/**
 * Apply an array of serialised CASL rules onto the can/cannot builders.
 * Conditions may contain "$tenantId" / "$userId" placeholders that are
 * resolved against the live user object at runtime.
 *
 * @param {Array}    rules
 * @param {object}   user
 * @param {Function} can
 * @param {Function} cannot
 */
function applyRules(rules, user, can, cannot) {
  for (const rule of rules) {
    const conditions = resolveConditions(rule.conditions, user);
    const fn = rule.inverted ? cannot : can;

    // Normalise action(s): support both legacy `action: 'read'`
    // and new format `actions: ['read','create']`
    const actions = rule.actions
      ? (Array.isArray(rule.actions) ? rule.actions : [rule.actions])
      : (rule.action ? [rule.action] : []);

    for (const action of actions) {
      if (rule.fields && conditions) {
        fn(action, rule.subject, rule.fields, conditions);
      } else if (rule.fields) {
        fn(action, rule.subject, rule.fields);
      } else if (conditions) {
        fn(action, rule.subject, conditions);
      } else {
        fn(action, rule.subject);
      }
    }
  }
}

/**
 * Build a CASL Ability for a given user.
 *
 * Priority order:
 *   1. SuperAdmin → manage all
 *   2. role.permissions.caslRules in DB (customised by admin)
 *   3. DEFAULT_ROLE_PERMISSIONS fallback (matches legacy behaviour)
 *   4. Unknown role → no permissions
 */
function defineAbilitiesFor(user) {
  const { can, cannot, build } = new AbilityBuilder(Ability);

  if (!user) {
    can('read', 'Public');
    return build();
  }

  // SuperAdmin bypasses everything
  if (user.isSuperAdmin) {
    can('manage', 'all');
    return build();
  }

  // DB-driven: Role.permissions.caslRules set by an admin
  const storedRules = user.role?.permissions?.caslRules;
  if (Array.isArray(storedRules) && storedRules.length > 0) {
    applyRules(storedRules, user, can, cannot);
    return build();
  }

  // Fallback to compiled defaults (mirrors old hard-coded behaviour)
  const defaults = getDefaultPermissionsForRole(user.role?.name);
  if (defaults) {
    applyRules(defaults.caslRules, user, can, cannot);
    return build();
  }

  // Unknown role – grant nothing
  return build();
}

module.exports = { defineAbilitiesFor, applyRules };
