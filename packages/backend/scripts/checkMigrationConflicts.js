#!/usr/bin/env node
/**
 * Migration Pre-Check Tool
 * 
 * Mendeteksi potensi konflik sebelum menjalankan migration.
 * Cek apakah tabel/index yang akan dibuat sudah ada di database.
 * 
 * Usage:
 *   node scripts/checkMigrationConflicts.js
 *   node scripts/checkMigrationConflicts.js --fix  (untuk generate fix SQL)
 * 
 * @author Development Team
 */

const fs = require('fs');
const path = require('path');
const { sequelize } = require('../src/models');
const { QueryTypes } = require('sequelize');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

async function getExistingTables() {
  const result = await sequelize.query(`
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public'
    ORDER BY tablename;
  `, { type: QueryTypes.SELECT });
  return result.map(r => r.tablename);
}

async function getExistingIndexes() {
  const result = await sequelize.query(`
    SELECT indexname, tablename FROM pg_indexes 
    WHERE schemaname = 'public'
    ORDER BY indexname;
  `, { type: QueryTypes.SELECT });
  return result.map(r => ({ name: r.indexname, table: r.tablename }));
}

async function getExistingEnums() {
  const result = await sequelize.query(`
    SELECT t.typname as name
    FROM pg_type t
    JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typtype = 'e'
    ORDER BY t.typname;
  `, { type: QueryTypes.SELECT });
  return result.map(r => r.name);
}

async function getPendingMigrations() {
  const migrationsPath = path.join(__dirname, '../src/migrations');
  
  // Get all migration files
  const allMigrations = fs.readdirSync(migrationsPath)
    .filter(f => f.endsWith('.js'))
    .sort();
  
  // Get executed migrations from SequelizeMeta
  let executedMigrations = [];
  try {
    const result = await sequelize.query(
      'SELECT name FROM "SequelizeMeta" ORDER BY name',
      { type: QueryTypes.SELECT }
    );
    executedMigrations = result.map(r => r.name);
  } catch (e) {
    // SequelizeMeta might not exist
    console.log(`${colors.yellow}⚠ SequelizeMeta table not found${colors.reset}`);
  }
  
  // Find pending migrations
  const pending = allMigrations.filter(m => !executedMigrations.includes(m));
  return pending;
}

function parseMigrationFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const issues = {
    tables: [],
    indexes: [],
    enums: []
  };
  
  // Find createTable calls
  const tableMatches = content.matchAll(/createTable\s*\(\s*['"]([^'"]+)['"]/g);
  for (const match of tableMatches) {
    issues.tables.push(match[1]);
  }
  
  // Find addIndex calls
  const indexMatches = content.matchAll(/addIndex\s*\([^,]+,\s*\[[^\]]+\],\s*\{[^}]*name:\s*['"]([^'"]+)['"]/g);
  for (const match of indexMatches) {
    issues.indexes.push(match[1]);
  }
  
  // Find index names in CREATE INDEX statements
  const createIndexMatches = content.matchAll(/CREATE\s+INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/gi);
  for (const match of createIndexMatches) {
    if (!match[0].includes('IF NOT EXISTS')) {
      issues.indexes.push(match[1]);
    }
  }
  
  // Find ENUM type creations
  const enumMatches = content.matchAll(/DataTypes\.ENUM\s*\(|type:\s*Sequelize\.ENUM/g);
  // ENUMs are usually created implicitly, harder to track
  
  return issues;
}

async function checkConflicts() {
  console.log(`\n${colors.bold}🔍 Migration Pre-Check Tool${colors.reset}\n`);
  console.log('Checking for potential conflicts before migration...\n');
  
  // Get existing database objects
  const existingTables = await getExistingTables();
  const existingIndexes = await getExistingIndexes();
  const existingEnums = await getExistingEnums();
  
  console.log(`${colors.blue}Database Status:${colors.reset}`);
  console.log(`  Tables: ${existingTables.length}`);
  console.log(`  Indexes: ${existingIndexes.length}`);
  console.log(`  Enums: ${existingEnums.length}\n`);
  
  // Get pending migrations
  const pendingMigrations = await getPendingMigrations();
  
  if (pendingMigrations.length === 0) {
    console.log(`${colors.green}✅ No pending migrations${colors.reset}\n`);
    return { conflicts: [], fixSql: [] };
  }
  
  console.log(`${colors.yellow}Pending Migrations: ${pendingMigrations.length}${colors.reset}`);
  pendingMigrations.forEach(m => console.log(`  - ${m}`));
  console.log('');
  
  // Check each pending migration for conflicts
  const conflicts = [];
  const fixSql = [];
  const migrationsPath = path.join(__dirname, '../src/migrations');
  
  for (const migration of pendingMigrations) {
    const filePath = path.join(migrationsPath, migration);
    const parsed = parseMigrationFile(filePath);
    
    // Check table conflicts
    for (const table of parsed.tables) {
      if (existingTables.includes(table)) {
        conflicts.push({
          type: 'TABLE',
          name: table,
          migration,
          message: `Table "${table}" already exists`
        });
        fixSql.push(`DROP TABLE IF EXISTS "${table}" CASCADE;`);
      }
    }
    
    // Check index conflicts
    for (const index of parsed.indexes) {
      const existing = existingIndexes.find(i => i.name === index);
      if (existing) {
        conflicts.push({
          type: 'INDEX',
          name: index,
          migration,
          message: `Index "${index}" already exists on table "${existing.table}"`
        });
        fixSql.push(`DROP INDEX IF EXISTS ${index};`);
      }
    }
  }
  
  // Print results
  if (conflicts.length === 0) {
    console.log(`${colors.green}✅ No conflicts detected! Safe to migrate.${colors.reset}\n`);
  } else {
    console.log(`${colors.red}❌ Found ${conflicts.length} potential conflict(s):${colors.reset}\n`);
    
    conflicts.forEach((c, i) => {
      console.log(`  ${i + 1}. [${c.type}] ${c.message}`);
      console.log(`     ${colors.yellow}Migration: ${c.migration}${colors.reset}`);
    });
    
    console.log(`\n${colors.bold}Fix Options:${colors.reset}\n`);
    console.log(`${colors.blue}Option 1: Drop conflicting objects (⚠️ DATA LOSS)${colors.reset}`);
    console.log('Run this SQL in your database:\n');
    console.log('```sql');
    fixSql.forEach(sql => console.log(sql));
    console.log('```\n');
    
    console.log(`${colors.blue}Option 2: Mark migrations as done (if objects are correct)${colors.reset}`);
    console.log('Run this SQL:\n');
    console.log('```sql');
    const uniqueMigrations = [...new Set(conflicts.map(c => c.migration))];
    uniqueMigrations.forEach(m => {
      console.log(`INSERT INTO "SequelizeMeta" (name) VALUES ('${m}') ON CONFLICT DO NOTHING;`);
    });
    console.log('```\n');
    
    console.log(`${colors.blue}Option 3: Fix migration files${colors.reset}`);
    console.log('Use "CREATE INDEX IF NOT EXISTS" and "CREATE TABLE IF NOT EXISTS" patterns.\n');
  }
  
  return { conflicts, fixSql };
}

// Run the check
checkConflicts()
  .then(({ conflicts }) => {
    process.exit(conflicts.length > 0 ? 1 : 0);
  })
  .catch(err => {
    console.error(`${colors.red}Error: ${err.message}${colors.reset}`);
    process.exit(1);
  })
  .finally(() => {
    sequelize.close();
  });
