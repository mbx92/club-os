#!/usr/bin/env node
'use strict';

/**
 * Audit ROUTE_TO_SUBJECT_MAP vs actual route files.
 * Reports:
 *  - mapped paths that use legacy /modules/ prefix while live API uses another
 *  - authorize()-protected routes missing from the map
 *  - route subjects not present in PERMISSION_CATALOG
 */

const fs = require('fs');
const path = require('path');
const { ROUTE_TO_SUBJECT_MAP, getAllSubjects } = require('../src/config/routePermissions');
const { PERMISSION_CATALOG } = require('../src/config/permissionCatalog');
const { findRouteMapping } = require('../src/middlewares/autoAuthorizeMiddleware');

const SRC_ROOT = path.join(__dirname, '../src');
const ROUTES_INDEX = path.join(SRC_ROOT, 'routes/index.js');

const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete']);

function parseMainMountings() {
  const content = fs.readFileSync(ROUTES_INDEX, 'utf8');
  const map = {};
  const re = /router\.use\(['"`]([^'"`]+)['"`],\s*(\w+)\)/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    map[m[2]] = m[1];
  }
  // restaurant module mounted separately
  map.restaurantModuleRoutes = '/restaurant';
  map.paymentRoutes = '/payment/midtrans';
  return map;
}

function getRouteFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) getRouteFiles(full, out);
    else if (entry.endsWith('.routes.js')) out.push(full);
  }
  return out;
}

function resolveMountPath(filePath, mainMountings) {
  const rel = path.relative(SRC_ROOT, filePath).replace(/\\/g, '/');

  if (rel.startsWith('modules/restaurant/routes/')) {
    const sub = rel.replace('modules/restaurant/routes/', '').replace('.routes.js', '');
    const subMountMap = {
      index: '/restaurant',
      order: '/restaurant/orders',
      product: '/restaurant/products',
      productCategory: '/restaurant/categories',
      productExtra: '/restaurant/products',
      table: '/restaurant/tables',
      location: '/restaurant/locations',
      stockMovement: '/restaurant/stock-movements',
      combinedBilling: '/restaurant/billing',
      report: '/restaurant/reports',
      dashboard: '/restaurant/dashboard',
    };
    return subMountMap[sub] || `/restaurant/${sub}`;
  }
  if (rel.startsWith('modules/payment-getway/routes/')) return '/payment/midtrans';

  const mainContent = fs.readFileSync(ROUTES_INDEX, 'utf8');
  const base = path.basename(filePath, '.routes.js');
  const relFromRoutes = path.relative(path.join(SRC_ROOT, 'routes'), filePath).replace(/\\/g, '/');

  // Explicit mount overrides for nested index re-exports
  const explicitMounts = {
    'gym/dashboard/dashboard.routes.js': '/gym/dashboard',
    'gym/report/report.routes.js': '/gym/reports',
    'gym/transaction/transaction.routes.js': '/transactions',
    'finance/dashboard.routes.js': '/finance/dashboard',
    'reports/finance.routes.js': '/reports/finance',
    'dashboard/dashboard.routes.js': '/dashboard',
  };
  if (explicitMounts[relFromRoutes]) return explicitMounts[relFromRoutes];

  const patterns = [
    new RegExp(`\\b(\\w+)\\s*=\\s*require\\(['"][^'"]*${base}(?:\\.routes)?['"]\\)`),
    new RegExp(`\\{[^}]*\\b(\\w+)\\b[^}]*\\}\\s*=\\s*require\\(['"][^'"]+['"]\\)`),
  ];

  for (const [varName, mount] of Object.entries(mainMountings)) {
    const varLower = varName.toLowerCase();
    const baseLower = base.toLowerCase();
    if (varLower.includes(baseLower) || baseLower.includes(varLower.replace('routes', ''))) {
      return mount;
    }
  }

  // direct variable name heuristics from filename
  const camel = base.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  const guesses = [
    `${camel}Routes`,
    `${camel}Router`,
    `${base}Routes`,
  ];
  for (const g of guesses) {
    if (mainMountings[g]) return mainMountings[g];
  }

  return null;
}

function normalizeRoutePath(mount, routePath) {
  const mountClean = (mount || '').replace(/\/$/, '');
  const routeClean = routePath.startsWith('/') ? routePath : `/${routePath}`;
  if (!mountClean) return routeClean;
  if (routeClean === '/') return mountClean;
  return `${mountClean}${routeClean}`;
}

function extractAuthorizedRoutes(filePath, mount) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const routes = [];

  const routeRe = /router\.(get|post|put|patch|delete)\(\s*['"`]([^'"`]+)['"`]/i;
  const authRe = /authorize(?:Any)?\(\s*(?:\[([^\]]+)\]|['"`](\w+)['"`])\s*,\s*['"`](\w+)['"`]/;
  const authPosRe = /authorizePosWrite/;

  let pending = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const routeMatch = line.match(routeRe);
    if (routeMatch) {
      pending = {
        method: routeMatch[1].toUpperCase(),
        subPath: routeMatch[2],
        line: i + 1,
        file: filePath,
      };
      continue;
    }

    if (!pending) continue;

    let subject = null;
    let actions = [];
    const authMatch = line.match(authRe);
    if (authMatch) {
      if (authMatch[1]) {
        actions = authMatch[1].split(',').map(s => s.replace(/['"`\s]/g, ''));
      } else {
        actions = [authMatch[2]];
      }
      subject = authMatch[3];
    } else if (authPosRe.test(line)) {
      actions = ['create', 'update'];
      subject = 'Transaction';
    }

    if (subject || /authorize\(/.test(line) || authPosRe.test(line)) {
      // Skip public auth routes (login/register have no RBAC middleware)
      if (pending.subPath === '/login' && pending.file.includes('auth.routes.js')) {
        pending = null;
        continue;
      }

      const fullPath = normalizeRoutePath(mount, pending.subPath);
      routes.push({
        method: pending.method,
        path: fullPath,
        subject: subject || '(dynamic)',
        actions,
        file: path.relative(SRC_ROOT, pending.file),
        line: pending.line,
      });
      pending = null;
    }
  }

  return routes;
}

function collectMappedPaths() {
  return new Set(Object.keys(ROUTE_TO_SUBJECT_MAP));
}

function findMapping(path, method) {
  return findRouteMapping(path, method);
}

function main() {
  const mainMountings = parseMainMountings();
  const routeFiles = [
    ...getRouteFiles(path.join(SRC_ROOT, 'routes')),
    ...getRouteFiles(path.join(SRC_ROOT, 'modules')),
  ].filter(f => !f.endsWith('metricsRoutes.js'));

  const catalogSubjects = new Set(PERMISSION_CATALOG.map(i => i.subject));
  const allAuthorized = [];

  for (const file of routeFiles) {
    const mount = resolveMountPath(file, mainMountings);
    const routes = extractAuthorizedRoutes(file, mount);
    allAuthorized.push(...routes);
  }

  const missing = [];
  const legacyPrefix = [];
  const orphanSubjects = new Set();

  for (const route of allAuthorized) {
    const mapping = findMapping(route.path, route.method);
    if (!mapping) {
      // check legacy /modules/restaurant alias
      const alias = route.path.replace(/^\/restaurant\b/, '/modules/restaurant');
      const aliasMap = alias !== route.path ? findMapping(alias, route.method) : null;
      if (aliasMap) {
        legacyPrefix.push({ ...route, mappedAs: alias });
      } else {
        missing.push(route);
      }
    }
    if (route.subject && route.subject !== '(dynamic)' && !catalogSubjects.has(route.subject)) {
      orphanSubjects.add(route.subject);
    }
  }

  // mapped entries that nothing hits (rough: only /modules/restaurant/*)
  const staleModulePrefix = Object.keys(ROUTE_TO_SUBJECT_MAP).filter(k => k.startsWith('/modules/'));

  const subjects = getAllSubjects(true);
  const routeSubjects = new Set();
  for (const [, mapping] of Object.entries(ROUTE_TO_SUBJECT_MAP)) {
    if (mapping.subject) routeSubjects.add(mapping.subject);
    else Object.values(mapping).forEach(m => m.subject && routeSubjects.add(m.subject));
  }
  const catalogGaps = [...routeSubjects].filter(s => !catalogSubjects.has(s)).sort();

  console.log('=== Route Permission Audit ===\n');
  console.log(`Authorized routes scanned: ${allAuthorized.length}`);
  console.log(`ROUTE_TO_SUBJECT_MAP entries: ${Object.keys(ROUTE_TO_SUBJECT_MAP).length}`);
  console.log(`PERMISSION_CATALOG subjects: ${PERMISSION_CATALOG.length}`);
  console.log(`Merged subjects (catalog API): ${subjects.length}\n`);

  console.log(`--- Missing from ROUTE_TO_SUBJECT_MAP (${missing.length}) ---`);
  if (!missing.length) console.log('  (none)');
  else {
    const grouped = {};
    for (const r of missing) {
      grouped[r.file] = grouped[r.file] || [];
      grouped[r.file].push(r);
    }
    for (const [file, items] of Object.entries(grouped).sort()) {
      console.log(`\n  ${file}`);
      for (const r of items) {
        console.log(`    ${r.method.padEnd(6)} ${r.path}  → ${r.subject} [${r.actions.join(', ')}]`);
      }
    }
  }

  console.log(`\n--- Legacy /modules/ prefix only (${legacyPrefix.length}) ---`);
  if (!legacyPrefix.length) console.log('  (none)');
  else {
    const sample = legacyPrefix.slice(0, 15);
    for (const r of sample) {
      console.log(`    ${r.method} ${r.path}  (catalog: ${r.mappedAs})`);
    }
    if (legacyPrefix.length > 15) console.log(`    ... +${legacyPrefix.length - 15} more`);
  }

  console.log(`\n--- Subjects in routes but not PERMISSION_CATALOG (${catalogGaps.length}) ---`);
  console.log(catalogGaps.length ? `  ${catalogGaps.join(', ')}` : '  (none)');

  console.log(`\n--- Stale /modules/* map entries (${staleModulePrefix.length}) ---`);
  console.log(`  Consider migrating to live API prefix (e.g. /restaurant/*)`);

  if (missing.length || catalogGaps.length) {
    process.exitCode = 1;
  }
}

main();
