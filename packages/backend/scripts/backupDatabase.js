/**
 * Database Backup Script
 * Creates SQL dump of database for backup purposes
 * 
 * Usage:
 *   node scripts/backupDatabase.js [environment]
 *   npm run db:backup:dev
 *   npm run db:backup:production
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { maybeUploadBackupToGoogleDrive } = require('./googleDriveBackup');
const { maybeUploadBackupToS3 } = require('./s3Backup');

// Load environment variables
const env = process.argv[2] || process.env.NODE_ENV || 'development';
const envFile = `.env.${env}`;
const envFilePath = path.resolve(process.cwd(), envFile);

// Load base `.env` first, then override with env-specific file
dotenv.config();
if (fs.existsSync(envFilePath)) {
  dotenv.config({ path: envFilePath });
}

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  dialect: process.env.DB_DIALECT
};

// Create backups directory if not exists
const backupsDir = path.join(process.cwd(), 'backups');
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

/**
 * Generate backup filename with timestamp
 */
function generateBackupFilename(env) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  return `backup_${env}_${dbConfig.database}_${timestamp}.sql`;
}

function deleteLocalBackupFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return false;
  }

  fs.unlinkSync(filePath);
  return true;
}

/**
 * Create MySQL backup
 */
function backupMySQL(filename) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(backupsDir, filename);
    
    // Build mysqldump command
    const command = `mysqldump -h ${dbConfig.host} -P ${dbConfig.port} -u ${dbConfig.user} -p${dbConfig.password} ${dbConfig.database} > "${filePath}"`;
    
    console.log(`🔄 Starting MySQL backup for ${env} environment...`);
    console.log(`📦 Database: ${dbConfig.database}`);
    console.log(`📁 File: ${filename}`);
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        error.code = 'NATIVE_BACKUP_FAILED';
        console.error('❌ Backup failed:', error.message);
        return reject(error);
      }
      
      if (stderr && !stderr.includes('Warning')) {
        console.warn('⚠️ Warnings:', stderr);
      }
      
      // Check if file was created and has content
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        
        console.log('✅ Backup completed successfully!');
        console.log(`📊 Size: ${fileSizeMB} MB`);
        console.log(`📂 Location: ${filePath}`);
        
        resolve({
          filename,
          filePath,
          size: stats.size,
          sizeMB: fileSizeMB,
          database: dbConfig.database,
          environment: env,
          timestamp: new Date().toISOString()
        });
      } else {
        const fileError = new Error('Backup file was not created');
        fileError.code = 'NATIVE_BACKUP_FAILED';
        reject(fileError);
      }
    });
  });
}

/**
 * Create PostgreSQL backup
 */
function backupPostgreSQL(filename) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(backupsDir, filename);
    
    // Set PGPASSWORD environment variable for PostgreSQL
    const pgEnv = { ...process.env, PGPASSWORD: dbConfig.password };
    
    // Build pg_dump command
    const command = `pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} -F p -f "${filePath}"`;
    
    console.log(`🔄 Starting PostgreSQL backup for ${env} environment...`);
    console.log(`📦 Database: ${dbConfig.database}`);
    console.log(`📁 File: ${filename}`);
    
    exec(command, { env: pgEnv }, (error, stdout, stderr) => {
      if (error) {
        error.code = 'NATIVE_BACKUP_FAILED';
        console.error('❌ Backup failed:', error.message);
        return reject(error);
      }
      
      if (stderr) {
        console.warn('⚠️ Warnings:', stderr);
      }
      
      // Check if file was created and has content
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        
        console.log('✅ Backup completed successfully!');
        console.log(`📊 Size: ${fileSizeMB} MB`);
        console.log(`📂 Location: ${filePath}`);
        
        resolve({
          filename,
          filePath,
          size: stats.size,
          sizeMB: fileSizeMB,
          database: dbConfig.database,
          environment: env,
          timestamp: new Date().toISOString()
        });
      } else {
        const fileError = new Error('Backup file was not created');
        fileError.code = 'NATIVE_BACKUP_FAILED';
        reject(fileError);
      }
    });
  });
}

/**
 * Main backup function
 */
async function createBackup(options = {}) {
  let result = null;

  try {
    // Validate database config
    if (!dbConfig.user || !dbConfig.password || !dbConfig.database) {
      throw new Error('Database configuration is incomplete. Check your .env file.');
    }
    
    const filename = generateBackupFilename(env);
    
    if (dbConfig.dialect === 'mysql') {
      result = await backupMySQL(filename);
    } else if (dbConfig.dialect === 'postgres') {
      result = await backupPostgreSQL(filename);
    } else {
      throw new Error(`Unsupported database dialect: ${dbConfig.dialect}`);
    }
    
    result.format = 'sql';
    result.googleDrive = await maybeUploadBackupToGoogleDrive(result, options.googleDriveConfig);
    result.minio = await maybeUploadBackupToS3(result, options.minioConfig);
    result.storedLocally = options.retainLocalBackup !== false;

    if (!result.storedLocally) {
      deleteLocalBackupFile(result.filePath);
      result.localFileDeleted = true;
      result.filePath = null;
    }

    // Clean up old backups (keep last 10)
    if (result.storedLocally) {
      cleanOldBackups();
    }
    
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
    // Don't exit process if called from API, just throw error
    throw error;
  }
}

/**
 * Clean up old backups (keep last 10 per environment)
 */
function cleanOldBackups() {
  try {
    const files = fs.readdirSync(backupsDir)
      .filter(file => file.startsWith(`backup_${env}_`) && file.endsWith('.sql'))
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
  createBackup().then(result => {
    console.log('\n📋 Backup Summary:');
    console.log(JSON.stringify(result, null, 2));
  });
}

module.exports = { createBackup, generateBackupFilename };
