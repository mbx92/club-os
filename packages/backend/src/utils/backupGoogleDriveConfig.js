const { Tenant } = require('../models');
const { createError } = require('./errorCodes');

function extractGoogleDriveSettingsFromTenant(tenant) {
  const googleDrive = tenant?.settings?.backup?.googleDrive;
  if (!googleDrive || typeof googleDrive !== 'object') {
    return null;
  }

  const config = {
    source: 'tenant_settings',
  };

  if (Object.prototype.hasOwnProperty.call(googleDrive, 'enabled')) {
    config.enabled = googleDrive.enabled;
  }

  if (Object.prototype.hasOwnProperty.call(googleDrive, 'required')) {
    config.required = googleDrive.required;
  }

  if (googleDrive.folderId) {
    config.folderId = googleDrive.folderId;
  }

  if (googleDrive.folderUrl) {
    config.folderUrl = googleDrive.folderUrl;
  }

  return config;
}

async function resolveBackupOptionsForTenantId(targetTenantId) {
  if (!targetTenantId) {
    return {
      googleDriveConfig: null,
      targetTenantId: null,
      targetTenantName: null,
      resolutionSource: 'env_only',
    };
  }

  const tenant = await Tenant.findByPk(targetTenantId, {
    attributes: ['id', 'name', 'settings'],
  });

  if (!tenant) {
    throw createError('NOT_FOUND', 'Tenant not found for backup settings');
  }

  return {
    googleDriveConfig: extractGoogleDriveSettingsFromTenant(tenant),
    targetTenantId: tenant.id,
    targetTenantName: tenant.name,
    resolutionSource: 'tenant_settings',
  };
}

async function resolveAutoBackupOptions() {
  const configuredTenantId = process.env.AUTO_BACKUP_TENANT_ID || process.env.BACKUP_SETTINGS_TENANT_ID || null;

  if (configuredTenantId) {
    const result = await resolveBackupOptionsForTenantId(configuredTenantId);
    return {
      ...result,
      resolutionSource: 'configured_tenant_settings',
    };
  }

  const tenants = await Tenant.findAll({
    attributes: ['id', 'name', 'settings'],
    order: [['createdAt', 'ASC']],
  });

  const tenantWithGoogleDriveSettings = tenants.find(tenant => extractGoogleDriveSettingsFromTenant(tenant));

  if (!tenantWithGoogleDriveSettings) {
    return {
      googleDriveConfig: null,
      targetTenantId: null,
      targetTenantName: null,
      resolutionSource: 'env_only',
    };
  }

  return {
    googleDriveConfig: extractGoogleDriveSettingsFromTenant(tenantWithGoogleDriveSettings),
    targetTenantId: tenantWithGoogleDriveSettings.id,
    targetTenantName: tenantWithGoogleDriveSettings.name,
    resolutionSource: 'discovered_tenant_settings',
  };
}

module.exports = {
  extractGoogleDriveSettingsFromTenant,
  resolveBackupOptionsForTenantId,
  resolveAutoBackupOptions,
};