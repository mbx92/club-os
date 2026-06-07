'use strict';

/**
 * Test Type Controller
 * 
 * Manages psychological test types (PAPI, EPPS, etc.)
 * Supports dynamic question import via JSON paste
 */

const db = require('../../../models');
const { questionParserService } = require('../services');
const { PsychologyTestType } = db;
const logger = require('../../../utils/logger');
const { getClientIp, getUserAgent } = require('../../../utils/requestHelper');

/**
 * Get all test types for tenant
 */
async function getAll(req, res, next) {
  try {
    const { tenantId } = req.user;
    const { isActive, category } = req.query;
    
    const where = { tenantId };
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }
    if (category) {
      where.category = category;
    }
    
    const testTypes = await PsychologyTestType.findAll({
      where,
      attributes: { exclude: ['questions'] }, // Don't send questions in list
      order: [['name', 'ASC']]
    });
    
    // Parse JSON fields that might be stored as strings
    const parsedTestTypes = testTypes.map(tt => {
      const data = tt.toJSON();
      
      // Parse JSONB fields if they're strings
      ['answerSchema', 'scoringConfig', 'config'].forEach(field => {
        if (data[field] && typeof data[field] === 'string') {
          try {
            data[field] = JSON.parse(data[field]);
          } catch (e) {
            // Keep as is if parsing fails
          }
        }
      });
      
      return data;
    });
    
    res.json({
      success: true,
      data: parsedTestTypes
    });

    logger.logInfo('Psychology test types retrieved', {
      action: 'PSYCHOLOGY_TEST_TYPE_LIST',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { count: testTypes.length }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get single test type by ID
 */
async function getById(req, res, next) {
  try {
    const { tenantId } = req.user;
    const { id } = req.params;
    
    const testType = await PsychologyTestType.findOne({
      where: { id, tenantId }
    });
    
    if (!testType) {
      return res.status(404).json({
        success: false,
        message: 'Test type not found'
      });
    }
    
    // Parse JSON fields that might be stored as strings
    const data = testType.toJSON();
    ['answerSchema', 'scoringConfig', 'config', 'questions'].forEach(field => {
      if (data[field] && typeof data[field] === 'string') {
        try {
          data[field] = JSON.parse(data[field]);
        } catch (e) {
          // Keep as is if parsing fails
        }
      }
    });
    
    res.json({
      success: true,
      data
    });

    logger.logInfo('Psychology test type retrieved', {
      action: 'PSYCHOLOGY_TEST_TYPE_GET',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { testTypeId: id, code: testType.code }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Create new test type
 * Supports JSON paste for questions
 */
async function create(req, res, next) {
  try {
    const { tenantId } = req.user;
    let { code, name, description, category, questions, scoringConfig, estimatedDuration, isActive } = req.body;
    
    // Check for duplicate code
    const existing = await PsychologyTestType.findOne({
      where: { tenantId, code }
    });
    
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Test type with code "${code}" already exists`
      });
    }
    
    // Parse questions if string (JSON paste)
    if (typeof questions === 'string') {
      const parsed = questionParserService.parseJSONInput(questions);
      if (!parsed.valid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid JSON format',
          error: parsed.error
        });
      }
      questions = parsed.data;
    }
    
    // Validate questions based on code
    const validation = questionParserService.parseQuestions(code, questions);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Question validation failed',
        errors: validation.errors.slice(0, 10), // Limit error messages
        stats: validation.stats
      });
    }
    
    // Create test type
    const testType = await PsychologyTestType.create({
      tenantId,
      code: code.toUpperCase(),
      name,
      description,
      category: category || 'personality',
      questions: validation.questions,
      scoringConfig,
      estimatedDuration: estimatedDuration || 30,
      isActive: isActive !== false
    });
    
    res.status(201).json({
      success: true,
      message: 'Test type created successfully',
      data: testType
    });

    logger.logAudit('Psychology test type created', {
      action: 'PSYCHOLOGY_TEST_TYPE_CREATE',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { testTypeId: testType.id, code: testType.code, questionsCount: validation.questions.length }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update test type
 */
async function update(req, res, next) {
  try {
    const { tenantId } = req.user;
    const { id } = req.params;
    let { code, name, description, category, questions, scoringConfig, config, estimatedDuration, isActive, version } = req.body;
    
    const testType = await PsychologyTestType.findOne({
      where: { id, tenantId }
    });
    
    if (!testType) {
      return res.status(404).json({
        success: false,
        message: 'Test type not found'
      });
    }
    
    // Check for duplicate code if changing
    if (code && code !== testType.code) {
      const existing = await PsychologyTestType.findOne({
        where: { tenantId, code }
      });
      
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Test type with code "${code}" already exists`
        });
      }
    }
    
    // Parse and validate questions if provided
    if (questions) {
      if (typeof questions === 'string') {
        const parsed = questionParserService.parseJSONInput(questions);
        if (!parsed.valid) {
          return res.status(400).json({
            success: false,
            message: 'Invalid JSON format',
            error: parsed.error
          });
        }
        questions = parsed.data;
      }
      
      const validation = questionParserService.parseQuestions(
        code || testType.code, 
        questions
      );
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: 'Question validation failed',
          errors: validation.errors.slice(0, 10),
          stats: validation.stats
        });
      }
      questions = validation.questions;
    }
    
    // Update fields
    if (code) testType.code = code.toUpperCase();
    if (name) testType.name = name;
    if (description !== undefined) testType.description = description;
    if (category) testType.category = category;
    if (questions) testType.questions = questions;
    if (scoringConfig !== undefined) testType.scoringConfig = scoringConfig;
    if (config !== undefined) testType.config = config;
    if (estimatedDuration) testType.estimatedDuration = estimatedDuration;
    if (isActive !== undefined) testType.isActive = isActive;
    if (version !== undefined) testType.version = version;
    
    await testType.save();
    
    res.json({
      success: true,
      message: 'Test type updated successfully',
      data: testType
    });

    logger.logAudit('Psychology test type updated', {
      action: 'PSYCHOLOGY_TEST_TYPE_UPDATE',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { testTypeId: id, code: testType.code }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete test type
 */
async function remove(req, res, next) {
  try {
    const { tenantId } = req.user;
    const { id } = req.params;
    
    const testType = await PsychologyTestType.findOne({
      where: { id, tenantId }
    });
    
    if (!testType) {
      return res.status(404).json({
        success: false,
        message: 'Test type not found'
      });
    }
    
    // Check if used in any packages
    const packageCount = await db.PsychologyPackageItem.count({
      where: { testTypeId: id }
    });
    
    if (packageCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete: test type is used in ${packageCount} package(s)`
      });
    }
    
    await testType.destroy();
    
    res.json({
      success: true,
      message: 'Test type deleted successfully'
    });

    logger.logAudit('Psychology test type deleted', {
      action: 'PSYCHOLOGY_TEST_TYPE_DELETE',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { testTypeId: id, code: testType.code }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Validate questions (preview before save)
 */
async function validateQuestions(req, res, next) {
  try {
    let { code, questions } = req.body;
    
    if (!code || !questions) {
      return res.status(400).json({
        success: false,
        message: 'Code and questions are required'
      });
    }
    
    // Parse JSON if string
    if (typeof questions === 'string') {
      const parsed = questionParserService.parseJSONInput(questions);
      if (!parsed.valid) {
        return res.status(400).json({
          success: false,
          valid: false,
          message: 'Invalid JSON format',
          error: parsed.error
        });
      }
      questions = parsed.data;
    }
    
    const validation = questionParserService.parseQuestions(code, questions);
    
    res.json({
      success: true,
      valid: validation.valid,
      stats: validation.stats,
      errors: validation.errors.slice(0, 20),
      sampleQuestions: validation.questions.slice(0, 3)
    });

    logger.logInfo('Psychology test type questions validated', {
      action: 'PSYCHOLOGY_TEST_TYPE_VALIDATE',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { code, valid: validation.valid, questionsCount: validation.questions.length }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get list of available export files
 */
async function getExportFiles(req, res, next) {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const exportDir = path.join(process.cwd(), 'public/psychology/export');
    
    // Create directory if not exists
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
      return res.json({
        success: true,
        data: {
          files: [],
          count: 0
        }
      });
    }
    
    // Read all JSON files
    const files = fs.readdirSync(exportDir)
      .filter(file => file.endsWith('.json'))
      .map(filename => {
        const filepath = path.join(exportDir, filename);
        const stats = fs.statSync(filepath);
        
        // Parse filename to extract info (format: CODE_vVERSION.json)
        const match = filename.match(/^(.+?)_v(.+?)\.json$/);
        const code = match ? match[1] : filename.replace('.json', '');
        const version = match ? match[2] : 'unknown';
        
        // Try to read file content for more details
        let testTypeName = null;
        let category = null;
        let questionCount = 0;
        
        try {
          const content = fs.readFileSync(filepath, 'utf8');
          const data = JSON.parse(content);
          testTypeName = data.name;
          category = data.category;
          // Only count actual questions, exclude instructions
          questionCount = Array.isArray(data.questions) 
            ? data.questions.filter(q => q.type === 'question').length 
            : 0;
        } catch (e) {
          // If cannot read/parse, just use filename info
        }
        
        return {
          filename,
          filepath: `/psychology/export/${filename}`,
          code,
          version,
          name: testTypeName,
          category,
          questionCount,
          size: stats.size,
          sizeFormatted: formatFileSize(stats.size),
          modifiedAt: stats.mtime,
          createdAt: stats.birthtime
        };
      })
      .sort((a, b) => {
        // Sort by code, then by version descending
        if (a.code !== b.code) {
          return a.code.localeCompare(b.code);
        }
        return b.version.localeCompare(a.version);
      });
    
    res.json({
      success: true,
      data: {
        files,
        count: files.length,
        directory: '/psychology/export'
      }
    });

    logger.logInfo('Psychology export files listed', {
      action: 'PSYCHOLOGY_TEST_TYPE_EXPORT_LIST',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { count: files.length }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Helper: Format file size to human-readable format
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Export test type to JSON
 */
async function exportToJson(req, res, next) {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const { tenantId } = req.user;
    const { id } = req.params;
    
    const testType = await PsychologyTestType.findOne({
      where: { id, tenantId }
    });
    
    if (!testType) {
      return res.status(404).json({
        success: false,
        message: 'Test type not found'
      });
    }
    
    // Parse JSON fields
    const data = testType.toJSON();
    ['answerSchema', 'scoringConfig', 'config', 'questions'].forEach(field => {
      if (data[field] && typeof data[field] === 'string') {
        try {
          data[field] = JSON.parse(data[field]);
        } catch (e) {
          // Keep as is if parsing fails
        }
      }
    });
    
    // Remove tenant-specific and auto-generated fields
    const exportData = {
      code: data.code,
      name: data.name,
      description: data.description,
      category: data.category,
      estimatedDuration: data.estimatedDuration,
      instructions: data.instructions,
      questions: data.questions,
      answerSchema: data.answerSchema,
      scoringConfig: data.scoringConfig,
      config: data.config,
      metadata: data.metadata,
      isActive: data.isActive,
      version: data.version || '1.0',
      // Include question count for verification
      questionCount: testType.questionCount,
      exportedAt: new Date().toISOString(),
      exportedBy: req.user.email || req.user.id
    };
    
    // Create export directory if not exists
    const exportDir = path.join(process.cwd(), 'public/psychology/export');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }
    
    // Generate filename using version from database (will overwrite if exists)
    const filename = `${data.code}_v${exportData.version}.json`;
    const filepath = path.join(exportDir, filename);
    
    // Check if file already exists
    const fileExists = fs.existsSync(filepath);
    
    fs.writeFileSync(filepath, JSON.stringify(exportData, null, 2), 'utf8');
    
    // Reload to ensure questionCount is calculated by hook
    await testType.reload();
    
    // Return response with file info and download URL (without /public prefix)
    const downloadUrl = `/psychology/export/${filename}`;
    
    res.json({
      success: true,
      message: fileExists 
        ? 'Test type exported successfully (file updated)' 
        : 'Test type exported successfully',
      data: {
        filename,
        filepath: downloadUrl,
        fullPath: filepath,
        overwritten: fileExists,
        testType: {
          id: testType.id,
          code: data.code,
          name: data.name,
          // Use questionCount from database (calculated by beforeSave hook)
          questionCount: testType.questionCount,
          // Total items including instructions
          totalItems: Array.isArray(data.questions) ? data.questions.length : 0
        },
        exportedAt: exportData.exportedAt,
        exportedBy: exportData.exportedBy
      }
    });

    logger.logInfo('Psychology test type exported', {
      action: 'PSYCHOLOGY_TEST_TYPE_EXPORT',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { testTypeId: id, code: data.code, filename, filepath: downloadUrl }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Import test type from JSON
 */
async function importFromJson(req, res, next) {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const { tenantId, id: userId } = req.user;
    const { overwrite = false, filename } = req.query;
    let importData;
    
    // Check if importing from file on server
    if (filename) {
      // Import from export directory
      const filepath = path.join(process.cwd(), 'public/psychology/export', filename);
      
      if (!fs.existsSync(filepath)) {
        return res.status(404).json({
          success: false,
          message: `File not found: ${filename}`
        });
      }
      
      try {
        const fileContent = fs.readFileSync(filepath, 'utf8');
        importData = JSON.parse(fileContent);
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: 'Invalid JSON file',
          error: e.message
        });
      }
    } else {
      // Import from request body
      importData = req.body;
    }
    
    // Validate required fields
    if (!importData.code || !importData.name) {
      return res.status(400).json({
        success: false,
        message: 'Invalid import data. Required fields: code, name'
      });
    }
    
    // Check if test type with same code already exists
    const existing = await PsychologyTestType.findOne({
      where: { code: importData.code, tenantId }
    });
    
    if (existing && !overwrite) {
      return res.status(409).json({
        success: false,
        message: `Test type with code '${importData.code}' already exists. Use overwrite=true to replace.`,
        existingTestType: {
          id: existing.id,
          code: existing.code,
          name: existing.name
        }
      });
    }
    
    // Prepare data for save
    const testTypeData = {
      tenantId,
      code: importData.code,
      name: importData.name,
      description: importData.description || null,
      category: importData.category || 'personality',
      estimatedDuration: importData.estimatedDuration || 60,
      instructions: importData.instructions || null,
      questions: importData.questions || [],
      answerSchema: importData.answerSchema || {},
      scoringConfig: importData.scoringConfig || {},
      config: importData.config || {},
      version: importData.version || '1.0',
      metadata: {
        ...importData.metadata,
        importedAt: new Date().toISOString(),
        importedBy: req.user.email || userId,
        originalExportDate: importData.exportedAt
      },
      isActive: importData.isActive !== undefined ? importData.isActive : true
    };
    
    let testType;
    let action;
    
    if (existing && overwrite) {
      // Update existing
      await existing.update(testTypeData);
      testType = existing;
      action = 'updated';
    } else {
      // Create new
      testType = await PsychologyTestType.create(testTypeData);
      action = 'created';
    }
    
    // Reload to get computed fields (questionCount will be calculated by beforeSave hook)
    await testType.reload();
    
    // Get counts from the reloaded instance
    const totalItems = Array.isArray(testType.questions) ? testType.questions.length : 0;
    const instructionCount = Array.isArray(testType.questions) 
      ? testType.questions.filter(q => q.type === 'instruction').length 
      : 0;
    
    res.json({
      success: true,
      message: `Test type ${action} successfully`,
      action,
      data: {
        id: testType.id,
        code: testType.code,
        name: testType.name,
        category: testType.category,
        // Use questionCount from database (calculated by beforeSave hook)
        questionCount: testType.questionCount,
        instructionCount: instructionCount,
        totalItems: totalItems,
        breakdown: {
          questions: testType.questionCount,
          instructions: instructionCount,
          total: totalItems
        }
      }
    });

    logger.logAudit(`Psychology test type imported (${action})`, {
      action: 'PSYCHOLOGY_TEST_TYPE_IMPORT',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { 
        testTypeId: testType.id, 
        code: importData.code,
        action,
        overwrite 
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  validateQuestions,
  exportToJson,
  importFromJson,
  getExportFiles
};
