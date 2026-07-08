/**
 * Database Backup using Sequelize (No external tools required)
 * Creates JSON backup of all tables
 * 
 * Usage:
 *   node scripts/backupDatabaseSequelize.js [environment]
 *   npm run db:backup:json:dev
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { maybeUploadBackupToGoogleDrive } = require('./googleDriveBackup');
const { maybeUploadBackupToS3 } = require('./s3Backup');
const { ensureBackupStorageDir } = require('../src/utils/backupStorage');

// Load environment variables
const env = process.argv[2] || process.env.NODE_ENV || 'development';
const envFile = `.env.${env}`;
const envFilePath = path.resolve(process.cwd(), envFile);

// Load base `.env` first, then override with env-specific file
dotenv.config();
if (fs.existsSync(envFilePath)) {
  dotenv.config({ path: envFilePath });
}

// Create backups directory if not exists
const backupsDir = ensureBackupStorageDir();

/**
 * Generate backup filename with timestamp
 */
function generateBackupFilename(env) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const dbName = process.env.DB_NAME || 'database';
  return `backup_${env}_${dbName}_${timestamp}.json`;
}

function deleteLocalBackupFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return false;
  }

  fs.unlinkSync(filePath);
  return true;
}

/**
 * Create backup using Sequelize
 */
async function createSequelizeBackup(options = {}) {
  let result = null;

  try {
    console.log(`🔄 Starting Sequelize backup for ${env} environment...`);
    console.log(`📦 Database: ${process.env.DB_NAME}`);
    
    // Dynamically load models to avoid circular dependency
    const { sequelize } = require('../src/models');
    
    const backup = {
      metadata: {
        database: process.env.DB_NAME,
        environment: env,
        timestamp: new Date().toISOString(),
        dialect: sequelize.getDialect()
      },
      tables: {}
    };
    
    // Get all table names
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log(`📋 Found ${tables.length} tables to backup`);
    
    // Backup each table
    for (const { table_name } of tables) {
      try {
        const [rows] = await sequelize.query(`SELECT * FROM "${table_name}"`);
        backup.tables[table_name] = rows;
        console.log(`  ✓ ${table_name}: ${rows.length} rows`);
      } catch (err) {
        console.warn(`  ⚠️ ${table_name}: ${err.message}`);
        backup.tables[table_name] = { error: err.message };
      }
    }
    
    // Write backup to file
    const filename = generateBackupFilename(env);
    const filePath = path.join(backupsDir, filename);
    
    fs.writeFileSync(filePath, JSON.stringify(backup, null, 2), 'utf8');
    
    const stats = fs.statSync(filePath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    console.log('✅ Backup completed successfully!');
    console.log(`📊 Size: ${fileSizeMB} MB`);
    console.log(`📂 Location: ${filePath}`);
    
    result = {
      filename,
      filePath,
      size: stats.size,
      sizeMB: fileSizeMB,
      database: process.env.DB_NAME,
      environment: env,
      timestamp: new Date().toISOString(),
      tableCount: Object.keys(backup.tables).length,
      format: 'json',
    };

    result.googleDrive = await maybeUploadBackupToGoogleDrive(result, options.googleDriveConfig);
    result.minio = await maybeUploadBackupToS3(result, options.minioConfig);
    result.storedLocally = options.retainLocalBackup !== false;

    if (!result.storedLocally) {
      deleteLocalBackupFile(result.filePath);
      result.localFileDeleted = true;
      result.filePath = null;
    }

    // Clean up old backups
    if (result.storedLocally) {
      cleanOldBackups();
    }
    
    // Note: Don't close sequelize connection when called from API
    // The connection is managed by the main application
    
    return result;
  } catch (error) {
    if (options.retainLocalBackup === false && result?.filePath) {
      try {
        deleteLocalBackupFile(result.filePath);
      } catch (cleanupError) {
        console.warn('⚠️ Warning: Could not remove temporary backup file:', cleanupError.message);
      }
    }

    console.error('💥 Error during backup:', error.message);
    throw error;
  }
}

/**
 * Clean up old backups (keep last 10)
 */
function cleanOldBackups() {
  try {
    const files = fs.readdirSync(backupsDir)
      .filter(file => file.startsWith(`backup_${env}_`) && file.endsWith('.json'))
      .map(file => ({
        name: file,
        path: path.join(backupsDir, file),
        time: fs.statSync(path.join(backupsDir, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time); // Sort by newest first
    
    // Keep only last 10 backups
    const toDelete = files.slice(10);
    
    if (toDelete.length > 0) {
      console.log(`🗑️  Cleaning up ${toDelete.length} old backup(s)...`);
      toDelete.forEach(file => {
        fs.unlinkSync(file.path);
        console.log(`   Deleted: ${file.name}`);
      });
    }
  } catch (error) {
    console.warn('⚠️ Warning: Could not clean old backups:', error.message);
  }
}

// Run if called directly
if (require.main === module) {
  createSequelizeBackup()
    .then(result => {
      console.log('\n📋 Backup Summary:');
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch(err => {
      console.error('Backup failed:', err);
      process.exit(1);
    });
}

module.exports = { createSequelizeBackup, generateBackupFilename };
