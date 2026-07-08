const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const {
  resolveGoogleDriveConfig,
  validateGoogleDriveConfig,
  getGoogleAccessToken,
  listDriveFilesInFolder,
  uploadMultipartToDrive,
  updateMultipartInDrive,
} = require('./googleDriveBackup');
const { ensureBackupStorageDir } = require('../src/utils/backupStorage');

const env = process.argv[2] || process.env.NODE_ENV || 'development';
const envFile = `.env.${env}`;
const envFilePath = path.resolve(process.cwd(), envFile);

dotenv.config();
if (fs.existsSync(envFilePath)) {
  dotenv.config({ path: envFilePath, override: true });
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const backupsDir = ensureBackupStorageDir();

function getBackupFiles() {
  if (!fs.existsSync(backupsDir)) {
    return [];
  }

  return fs.readdirSync(backupsDir)
    .filter(fileName => fileName.endsWith('.sql') || fileName.endsWith('.json'))
    .map(fileName => {
      const filePath = path.join(backupsDir, fileName);
      const stats = fs.statSync(filePath);

      return {
        fileName,
        filePath,
        size: stats.size,
        sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
        modifiedTime: stats.mtime.toISOString(),
      };
    })
    .sort((left, right) => left.fileName.localeCompare(right.fileName));
}

function buildRemoteFileMap(remoteFiles) {
  const map = new Map();

  for (const remoteFile of remoteFiles) {
    if (!map.has(remoteFile.name)) {
      map.set(remoteFile.name, remoteFile);
    }
  }

  return map;
}

async function syncBackupFolderToGoogleDrive() {
  const config = resolveGoogleDriveConfig();
  const configIssue = validateGoogleDriveConfig(config);

  if (configIssue) {
    throw new Error(`Google Drive sync is not ready: ${configIssue}.`);
  }

  const localFiles = getBackupFiles();

  if (localFiles.length === 0) {
    console.log('No local backup files found in backups/.');
    return {
      authType: config.authType,
      dryRun,
      folderId: config.folderId,
      localCount: 0,
      remoteCount: 0,
      uploaded: 0,
      updated: 0,
      skipped: 0,
      operations: [],
    };
  }

  const accessToken = await getGoogleAccessToken(config);
  const remoteFiles = await listDriveFilesInFolder({
    accessToken,
    folderId: config.folderId,
  });
  const remoteFileMap = buildRemoteFileMap(remoteFiles);
  const operations = [];
  let uploaded = 0;
  let updated = 0;
  let skipped = 0;

  for (const localFile of localFiles) {
    const remoteFile = remoteFileMap.get(localFile.fileName);

    if (!remoteFile) {
      operations.push({ action: 'upload', fileName: localFile.fileName, size: localFile.size });

      if (!dryRun) {
        await uploadMultipartToDrive({
          accessToken,
          filePath: localFile.filePath,
          folderId: config.folderId,
          metadata: {
            name: localFile.fileName,
            description: `Synced from server backups folder | env=${env} | modified=${localFile.modifiedTime}`,
          },
        });
      }

      uploaded += 1;
      continue;
    }

    const remoteSize = Number(remoteFile.size || 0);
    if (remoteSize === localFile.size) {
      operations.push({
        action: 'skip',
        fileName: localFile.fileName,
        reason: 'same size already exists in Drive',
      });
      skipped += 1;
      continue;
    }

    operations.push({
      action: 'update',
      fileName: localFile.fileName,
      localSize: localFile.size,
      remoteSize,
      remoteFileId: remoteFile.id,
    });

    if (!dryRun) {
      await updateMultipartInDrive({
        accessToken,
        fileId: remoteFile.id,
        filePath: localFile.filePath,
        metadata: {
          name: localFile.fileName,
          description: `Synced from server backups folder | env=${env} | modified=${localFile.modifiedTime}`,
        },
      });
    }

    updated += 1;
  }

  return {
    authType: config.authType,
    dryRun,
    folderId: config.folderId,
    localCount: localFiles.length,
    remoteCount: remoteFiles.length,
    uploaded,
    updated,
    skipped,
    operations,
  };
}

if (require.main === module) {
  syncBackupFolderToGoogleDrive()
    .then(result => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error(`Backup folder sync failed: ${error.message}`);
      if (error.response?.data) {
        console.error(JSON.stringify(error.response.data, null, 2));
      }
      process.exit(1);
    });
}

module.exports = { syncBackupFolderToGoogleDrive };
