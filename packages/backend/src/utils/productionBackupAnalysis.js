'use strict';

/** Tables used by current Sequelize models (keep data) */
const KEEP_TABLES = new Set([
  'Tenants', 'Users', 'Roles', 'Operators',
  'Members', 'CheckIns', 'ActiveServices', 'ServicePlans', 'PTSessions',
  'Trainers', 'TrainerCommissions',
  'Transactions', 'TransactionItems', 'TransactionPayments',
  'Payments', 'Vouchers', 'VoucherUsages',
  'Products', 'ProductCategories', 'ProductExtras', 'RestaurantTables', 'StockMovements', 'Locations',
  'CashRegisterSessions', 'CashFlows', 'Expenses', 'ExpenseCategories', 'Incomes', 'IncomeCategories',
  'PettyCashes', 'PettyCashTransactions', 'Suppliers', 'Shareholders',
  'Subscriptions', 'SubscriptionPlans', 'Invoices',
  'HikvisionDevices', 'DeviceEmployees', 'DeviceAttendanceLogs', 'DeviceSyncLogs', 'StaffAttendances',
  'EmployeeSchedules', 'EmployeeScheduleTemplates', 'EmployeeScheduleOverrides', 'SchedulePeriods', 'Shifts',
  'PrinterSettings', 'PrintJobs', 'Sequences', 'Logs',
]);

const LEGACY_PATTERNS = [
  /^Psychology/i,
  /^HD/i,
  /^Ticket/i,
  /^Membership/i,
  /^Patients?$/i,
  /^Psikograms$/i,
  /^TestSessionLogs$/i,
];

const SKIP_TABLES = new Set(['SequelizeMeta']);

function classifyTable(table) {
  if (SKIP_TABLES.has(table)) return 'skip';
  if (KEEP_TABLES.has(table)) return 'keep';
  if (LEGACY_PATTERNS.some(rx => rx.test(table))) return 'drop';
  return 'review';
}

function extractTablesFromSql(sql) {
  const tables = new Set();
  for (const line of sql.split('\n')) {
    const m = line.match(/^-- Name: ([^;]+); Type: TABLE/);
    if (m) tables.add(m[1].trim());
  }
  return [...tables].sort();
}

function analyzeTables(tables) {
  const groups = { keep: [], drop: [], skip: [], review: [] };
  tables.forEach(t => groups[classifyTable(t)].push(t));
  return groups;
}

function analyzeBackupSql(sql) {
  const tables = extractTablesFromSql(sql);
  const groups = analyzeTables(tables);
  return {
    tableCount: tables.length,
    groups,
    summary: {
      keep: groups.keep.length,
      drop: groups.drop.length,
      skip: groups.skip.length,
      review: groups.review.length,
    },
    dropSql: buildDropLegacySql(groups.drop),
  };
}

function buildDropLegacySql(dropTables) {
  const header = [
    '-- Drop legacy tables not used by current codebase',
    '-- Review before executing',
    '',
  ].join('\n');
  const statements = dropTables.map(
    t => `DROP TABLE IF EXISTS public."${t}" CASCADE;`,
  );
  return `${header}\n${statements.join('\n')}\n`;
}

function isLegacyTable(tableName) {
  return classifyTable(tableName) === 'drop';
}

module.exports = {
  KEEP_TABLES,
  classifyTable,
  extractTablesFromSql,
  analyzeTables,
  analyzeBackupSql,
  buildDropLegacySql,
  isLegacyTable,
};
