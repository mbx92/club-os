#!/usr/bin/env node
'use strict';

/**
 * RBAC-14 — Menu key consistency check.
 *
 * Menu keys are hand-duplicated across three files that must stay in sync:
 *   - packages/backend/src/utils/menuKeys.js       (source of truth)
 *   - packages/frontend/src/navigation/menuKeys.js (ALL_MENU_KEYS + ROLE_MENU_MAP)
 *   - packages/frontend/src/navigation/navigation.js (sidebar items, each with a menuKey)
 *
 * There is no build-time guarantee these stay aligned — a key added to one
 * and forgotten in another silently breaks either menu visibility (frontend
 * hides a page the backend would allow) or an access check (backend rejects
 * a menuAccess key the frontend UI lets you pick).
 *
 * This script is a stop-gap: it diffs the three files and fails (non-zero
 * exit code) on any mismatch, so it can be wired into CI or run manually
 * before shipping a menu/permissions change.
 *
 * Usage: node scripts/checkMenuKeySync.js
 */

const path = require('path');
const { pathToFileURL } = require('url');

const backendMenuKeys = require('../src/utils/menuKeys');

const FRONTEND_ROOT = path.resolve(__dirname, '../../frontend/src/navigation');

function setDiff(a, b) {
  return [...a].filter(item => !b.has(item));
}

function formatList(list) {
  return list.length ? list.map(item => `    - ${item}`).join('\n') : '    (none)';
}

async function main() {
  const errors = [];

  const frontendMenuKeysUrl = pathToFileURL(path.join(FRONTEND_ROOT, 'menuKeys.js')).href;
  const frontendNavigationUrl = pathToFileURL(path.join(FRONTEND_ROOT, 'navigation.js')).href;

  const [frontendMenuKeys, frontendNavigation] = await Promise.all([
    import(frontendMenuKeysUrl),
    import(frontendNavigationUrl),
  ]);

  // ── 1. Flatten each side's "all valid keys" list ──────────────────────────
  const backendKeys = new Set(backendMenuKeys.VALID_MENU_KEYS);

  const frontendKeys = new Set();
  for (const item of frontendMenuKeys.ALL_MENU_KEYS) {
    frontendKeys.add(item.key);
    for (const child of item.children || []) {
      frontendKeys.add(child.key);
    }
  }

  const missingInFrontend = setDiff(backendKeys, frontendKeys);
  const missingInBackend = setDiff(frontendKeys, backendKeys);

  if (missingInFrontend.length) {
    errors.push(
      `Menu keys defined in backend menuKeys.js (ADMIN_MENU_ACCESS) but missing from ` +
      `frontend menuKeys.js (ALL_MENU_KEYS):\n${formatList(missingInFrontend)}`
    );
  }
  if (missingInBackend.length) {
    errors.push(
      `Menu keys defined in frontend menuKeys.js (ALL_MENU_KEYS) but missing from ` +
      `backend menuKeys.js (ADMIN_MENU_ACCESS):\n${formatList(missingInBackend)}`
    );
  }

  // ── 2. Per-role ROLE_MENU_MAP parity ───────────────────────────────────────
  const backendRoles = new Set(Object.keys(backendMenuKeys.ROLE_MENU_MAP));
  const frontendRoles = new Set(Object.keys(frontendMenuKeys.ROLE_MENU_MAP));

  const roleMismatch = setDiff(backendRoles, frontendRoles).concat(setDiff(frontendRoles, backendRoles));
  if (roleMismatch.length) {
    errors.push(`Role keys differ between backend and frontend ROLE_MENU_MAP:\n${formatList([...new Set(roleMismatch)])}`);
  }

  for (const role of [...backendRoles].filter(r => frontendRoles.has(r))) {
    const backendSet = new Set(backendMenuKeys.ROLE_MENU_MAP[role]);
    const frontendSet = new Set(frontendMenuKeys.ROLE_MENU_MAP[role]);
    const onlyBackend = setDiff(backendSet, frontendSet);
    const onlyFrontend = setDiff(frontendSet, backendSet);

    if (onlyBackend.length || onlyFrontend.length) {
      const details = [];
      if (onlyBackend.length) details.push(`  only in backend:\n${formatList(onlyBackend)}`);
      if (onlyFrontend.length) details.push(`  only in frontend:\n${formatList(onlyFrontend)}`);
      errors.push(`ROLE_MENU_MAP["${role}"] differs between backend and frontend:\n${details.join('\n')}`);
    }
  }

  // ── 3. Every menuKey referenced in navigation.js sidebar items must exist ──
  const danglingMenuKeys = new Set();
  const walkNav = (items) => {
    for (const item of items || []) {
      if (item.menuKey && !frontendKeys.has(item.menuKey)) {
        danglingMenuKeys.add(`${item.menuKey} (label: "${item.label}")`);
      }
      if (Array.isArray(item.children)) walkNav(item.children);
    }
  };
  walkNav(frontendNavigation.navigation);

  if (danglingMenuKeys.size) {
    errors.push(
      `navigation.js references menuKey values that don't exist in ALL_MENU_KEYS:\n${formatList([...danglingMenuKeys])}`
    );
  }

  // ── Report ──────────────────────────────────────────────────────────────
  if (errors.length) {
    console.error(`\n✗ Menu key sync check FAILED (${errors.length} issue${errors.length > 1 ? 's' : ''}):\n`);
    errors.forEach((err, i) => console.error(`${i + 1}. ${err}\n`));
    process.exitCode = 1;
    return;
  }

  console.log('✓ Menu keys are in sync across backend/utils/menuKeys.js, frontend/navigation/menuKeys.js and navigation.js.');
}

main().catch(err => {
  console.error('Menu key sync check crashed:', err);
  process.exitCode = 1;
});
