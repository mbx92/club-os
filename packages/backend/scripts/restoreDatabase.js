/**
 * Database Restore Script
 * Restores database from SQL backup file
 * 
 * ⚠️ WARNING: This will DROP and RECREATE the database!
 * 
 * Usage:
 *   node scripts/restoreDatabase.js [environment] [backup-filename]
 *   npm run db:restore:dev -- backup_dev_gymdb_2024-12-22T10-30-00.sql
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { ensureBackupStorageDir } = require('../src/utils/backupStorage');
const readline = require('readline');

// Load environment variables
const env = process.argv[2] || process.env.NODE_ENV || 'development';
const backupFilename = process.argv[3];

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

const backupsDir = ensureBackupStorageDir();

/**
 * Prompt user for confirmation
 */
function confirmRestore() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    console.log('\n⚠️  WARNING: This will DROP and RECREATE the database!');
    console.log(`📦 Database: ${dbConfig.database}`);
    console.log(`🌍 Environment: ${env}`);
    console.log(`📁 Backup file: ${backupFilename || 'latest'}`);
    
    rl.question('\nAre you sure you want to continue? (yes/no): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Get latest backup file if not specified
 */
function getBackupFile() {
  if (backupFilename) {
    const filePath = path.join(backupsDir, backupFilename);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Backup file not found: ${backupFilename}`);
    }
    return filePath;
  }
  
  // Get latest backup for this environment
  const files = fs.readdirSync(backupsDir)
    .filter(file => file.startsWith(`backup_${env}_`) && file.endsWith('.sql'))
    .map(file => ({
      name: file,
      path: path.join(backupsDir, file),
      time: fs.statSync(path.join(backupsDir, file)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time); // Sort by newest first
  
  if (files.length === 0) {
    throw new Error(`No backup files found for ${env} environment`);
  }
  
  console.log(`📋 Using latest backup: ${files[0].name}`);
  return files[0].path;
}

/**
 * Restore MySQL database
 */
function restoreMySQL(backupFile) {
  return new Promise((resolve, reject) => {
    console.log(`🔄 Starting MySQL restore for ${env} environment...`);
    
    // Drop and recreate database
    const dropCommand = `mysql -h ${dbConfig.host} -P ${dbConfig.port} -u ${dbConfig.user} -p${dbConfig.password} -e "DROP DATABASE IF EXISTS ${dbConfig.database}; CREATE DATABASE ${dbConfig.database};"`;
    
    exec(dropCommand, (error) => {
      if (error) {
        console.error('❌ Failed to drop/create database:', error.message);
        return reject(error);
      }
      
      console.log('✅ Database dropped and recreated');
      
      // Restore from backup
      const restoreCommand = `mysql -h ${dbConfig.host} -P ${dbConfig.port} -u ${dbConfig.user} -p${dbConfig.password} ${dbConfig.database} < "${backupFile}"`;
      
      console.log('🔄 Restoring data from backup...');
      
      exec(restoreCommand, (error, stdout, stderr) => {
        if (error) {
          console.error('❌ Restore failed:', error.message);
          return reject(error);
        }
        
        if (stderr && !stderr.includes('Warning')) {
          console.warn('⚠️ Warnings:', stderr);
        }
        
        console.log('✅ Database restored successfully!');
        
        resolve({
          database: dbConfig.database,
          environment: env,
          backupFile: path.basename(backupFile),
          restoredAt: new Date().toISOString()
        });
      });
    });
  });
}

/**
 * Restore PostgreSQL database
 */
function restorePostgreSQL(backupFile) {
  return new Promise((resolve, reject) => {
    console.log(`🔄 Starting PostgreSQL restore for ${env} environment...`);
    
    const pgEnv = { ...process.env, PGPASSWORD: dbConfig.password };

    // Terminate active connections first
    const terminateCommand = `psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${dbConfig.database}' AND pid <> pg_backend_pid();"`;
    
    // DROP and CREATE must be separate commands — PostgreSQL does not allow
    // DDL statements like DROP/CREATE DATABASE inside a transaction block.
    const dropCommand   = `psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d postgres -c "DROP DATABASE IF EXISTS \\"${dbConfig.database}\\""`;
    const createCommand = `psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d postgres -c "CREATE DATABASE \\"${dbConfig.database}\\""`;
    
    // Step 1: terminate connections
    exec(terminateCommand, { env: pgEnv }, () => {
      // Step 2: drop database
      exec(dropCommand, { env: pgEnv }, (error) => {
        if (error) {
          console.error('❌ Failed to drop database:', error.message);
          return reject(error);
        }
        console.log('✅ Database dropped');

        // Step 3: create database
        exec(createCommand, { env: pgEnv }, (error) => {
          if (error) {
            console.error('❌ Failed to create database:', error.message);
            return reject(error);
          }

          console.log('✅ Database recreated');
      
      // Restore from backup
      const restoreCommand = `psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} -f "${backupFile}"`;
      
      console.log('🔄 Restoring data from backup...');
      
      exec(restoreCommand, { env: pgEnv }, (error, stdout, stderr) => {
        if (error) {
          console.error('❌ Restore failed:', error.message);
          return reject(error);
        }
        
        if (stderr) {
          console.warn('⚠️ Warnings:', stderr);
        }
        
        console.log('✅ Database restored successfully!');
        
        resolve({
          database: dbConfig.database,
          environment: env,
          backupFile: path.basename(backupFile),
          restoredAt: new Date().toISOString()
        });
      });     // end exec(restoreCommand)
        });   // end exec(createCommand)
      });     // end exec(dropCommand)
    });       // end exec(terminateCommand)
  });         // end new Promise
}

/**
 * Main restore function
 */
async function restoreDatabase() {
  try {
    // Validate database config
    if (!dbConfig.user || !dbConfig.password || !dbConfig.database) {
      throw new Error('Database configuration is incomplete. Check your .env file.');
    }
    
    // Safety check: don't allow restore on production without explicit confirmation
    if (env === 'production') {
      console.log('\n🚨 PRODUCTION ENVIRONMENT DETECTED! 🚨');
      const confirmed = await confirmRestore();
      if (!confirmed) {
        console.log('❌ Restore cancelled by user');
        process.exit(0);
      }
    } else {
      const confirmed = await confirmRestore();
      if (!confirmed) {
        console.log('❌ Restore cancelled by user');
        process.exit(0);
      }
    }
    
    const backupFile = getBackupFile();
    
    let result;
    if (dbConfig.dialect === 'mysql') {
      result = await restoreMySQL(backupFile);
    } else if (dbConfig.dialect === 'postgres') {
      result = await restorePostgreSQL(backupFile);
    } else {
      throw new Error(`Unsupported database dialect: ${dbConfig.dialect}`);
    }
    
    return result;
  } catch (error) {
    console.error('💥 Error during restore:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  restoreDatabase().then(result => {
    console.log('\n📋 Restore Summary:');
    console.log(JSON.stringify(result, null, 2));
    console.log('\n✅ Database has been restored. You may need to restart your application.');
  });
}

module.exports = { restoreDatabase };
