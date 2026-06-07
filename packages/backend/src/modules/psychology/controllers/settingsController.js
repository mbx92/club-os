'use strict';

/**
 * Psychology Settings Controller
 * 
 * Manages psychology module settings (branding, report config, etc.)
 */

const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../../../models');
const { PsychologySettings } = db;
const logger = require('../../../utils/logger');
const { getClientIp, getUserAgent } = require('../../../utils/requestHelper');

// Upload directory relative to project root
const UPLOAD_BASE_DIR = 'uploads/psychology/settings';
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

/**
 * Get psychology settings for tenant
 */
async function getSettings(req, res, next) {
  try {
    const { tenantId } = req.user;

    const settings = await PsychologySettings.findOne({
      where: { tenantId }
    });

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'Settings not found',
        data: null
      });
    }

    res.json({
      success: true,
      data: settings
    });

    logger.logInfo('Psychology settings retrieved', {
      action: 'PSYCHOLOGY_SETTINGS_GET',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Save/Update psychology settings
 */
async function saveSettings(req, res, next) {
  try {
    const { tenantId, id: userId } = req.user;
    const settingsData = req.body;

    // Find existing or create new
    let settings = await PsychologySettings.findOne({
      where: { tenantId }
    });

    if (settings) {
      // Update existing
      await settings.update(settingsData);
    } else {
      // Create new
      settings = await PsychologySettings.create({
        tenantId,
        ...settingsData
      });
    }

    // Reload to get updated data
    await settings.reload();

    res.json({
      success: true,
      message: 'Settings saved successfully',
      data: settings
    });

    logger.logAudit('Psychology settings saved', {
      action: 'PSYCHOLOGY_SETTINGS_SAVE',
      userId,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { settingsId: settings.id, isNew: !settings.createdAt }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Upload file (logo, footer, signature)
 */
async function uploadFile(req, res, next) {
  try {
    const { tenantId } = req.user;
    const { type } = req.body;

    // Validate type
    const validTypes = ['logo', 'footer', 'signature'];
    if (!type || !validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid file type. Allowed: ${validTypes.join(', ')}`
      });
    }

    // Check if file exists
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const file = req.file;

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      // Clean up uploaded file
      if (file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      return res.status(413).json({
        success: false,
        message: 'File size exceeds maximum limit of 2MB'
      });
    }

    // Validate mime type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      // Clean up uploaded file
      if (file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      return res.status(415).json({
        success: false,
        message: 'Invalid file format. Allowed: PNG, JPG, JPEG, SVG'
      });
    }

    // Create tenant-specific directory
    const tenantDir = path.join(process.cwd(), UPLOAD_BASE_DIR, tenantId);
    if (!fs.existsSync(tenantDir)) {
      fs.mkdirSync(tenantDir, { recursive: true });
    }

    // Generate unique filename
    const fileExt = path.extname(file.originalname).toLowerCase();
    const filename = `${type}-${uuidv4()}${fileExt}`;
    const filePath = path.join(tenantDir, filename);

    // Move file to destination
    fs.renameSync(file.path, filePath);

    // Build URL for accessing the file
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const fileUrl = `${baseUrl}/uploads/psychology/settings/${tenantId}/${filename}`;

    res.json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        url: fileUrl,
        filename,
        size: file.size,
        mimeType: file.mimetype,
        type
      }
    });

    logger.logInfo('Psychology settings file uploaded', {
      action: 'PSYCHOLOGY_SETTINGS_UPLOAD',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { type, filename, size: file.size }
    });
  } catch (err) {
    // Clean up file if error occurs
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(err);
  }
}

/**
 * Delete uploaded file
 */
async function deleteFile(req, res, next) {
  try {
    const { tenantId } = req.user;
    const { type } = req.params;

    // Validate type
    const validTypes = ['logo', 'footer', 'signature'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid file type. Allowed: ${validTypes.join(', ')}`
      });
    }

    // Get current settings
    const settings = await PsychologySettings.findOne({
      where: { tenantId }
    });

    if (!settings || !settings[type]) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Extract filename from URL
    const fileUrl = settings[type];
    const urlParts = fileUrl.split('/');
    const filename = urlParts[urlParts.length - 1];
    const filePath = path.join(process.cwd(), UPLOAD_BASE_DIR, tenantId, filename);

    // Delete file if exists
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Update settings to remove URL
    await settings.update({ [type]: null });

    res.json({
      success: true,
      message: 'File deleted successfully'
    });

    logger.logInfo('Psychology settings file deleted', {
      action: 'PSYCHOLOGY_SETTINGS_DELETE_FILE',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { type, filename }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get psychology settings by tenantId (public access - no auth)
 */
async function getSettingsByTenantId(req, res, next) {
  try {
    const { tenantId } = req.params;

    const settings = await PsychologySettings.findOne({
      where: { tenantId },
      attributes: { exclude: ['createdAt', 'updatedAt'] } // Return all fields except timestamps
    });

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'Settings not found',
        data: null
      });
    }

    res.json({
      success: true,
      data: settings
    });

    logger.logInfo('Psychology settings accessed publicly', {
      action: 'PSYCHOLOGY_SETTINGS_PUBLIC_ACCESS',
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSettings,
  saveSettings,
  uploadFile,
  deleteFile,
  getSettingsByTenantId
};
