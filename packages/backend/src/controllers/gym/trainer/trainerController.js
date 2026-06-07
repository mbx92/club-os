const { Trainer, User, Role, Tenant, TrainerCommission, Transaction, ActiveService, sequelize } = require('../../../models');
const { Op } = require('sequelize');
const logger = require('../../../utils/logger');
const { getClientIp, getUserAgent } = require('../../../utils/requestHelper');
const { createError } = require('../../../utils/errorCodes');

/**
 * Helper: Generate password (default atau random)
 */
const generatePassword = () => {
  const autoGenerate = process.env.AUTO_GENERATE_PASSWORD === 'true';
  
  if (autoGenerate) {
    // Random password: 12 characters
    return Math.random().toString(36).slice(-12) + 
           Math.random().toString(36).slice(-12);
  }
  
  // Default password dari env atau fallback
  return process.env.DEFAULT_TRAINER_PASSWORD || 'password123';
};

/**
 * Helper: Send password to trainer (email/SMS)
 */
const sendPasswordToTrainer = async (trainer, password, req) => {
  // TODO: Implement dengan SMTP/SMS service
  // Untuk sekarang, hanya log
  console.log(`Password for ${trainer.email || trainer.phone}: ${password}`);
  logger.logInfo('Trainer password generated', {
      action: 'TRAINER_PASSWORD_GENERATED',
      tenantId: req?.user?.tenantId,
      userAgent: getUserAgent(req),
      path: req?.path,
      trainerId: trainer.id,
    email: trainer.email,
    phone: trainer.phone,
    method: process.env.AUTO_GENERATE_PASSWORD === 'true' ? 'auto-generated' : 'default',
  userId: req?.user?.id,
  ip: getClientIp(req)
    });
};

/**
 * Get all trainers for tenant
 * Supports pagination, search, and filtering
 */
async function getAllTrainers(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      status = 'all',
      specialization,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    const where = isSuperAdmin ? {} : { tenantId };

    // Search by name, email, or phone
    if (search) {
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Filter by active status
    // status=deleted  → tampilkan yang soft-deleted (paranoid: false + deletedAt NOT NULL)
    // status=active   → isActive true, non-deleted
    // status=inactive → isActive false, non-deleted
    // status=all      → semua non-deleted (default)
    let paranoid = true; // default: exclude soft-deleted
    if (status === 'deleted') {
      paranoid = false;
      where.deletedAt = { [Op.ne]: null };
    } else if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    // Filter by specialization
    if (specialization) {
      where.specializations = {
        [Op.contains]: [specialization]
      };
    }

    // Validate sort field
    const allowedSortFields = ['firstName', 'lastName', 'email', 'createdAt', 'updatedAt', 'hireDate'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const { count, rows: trainers } = await Trainer.findAndCountAll({
      where,
      paranoid,
      order: [[sortField, order]],
      limit: limitNum,
      offset,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'phone', 'isActive', 'lastLogin']
        },
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['id', 'name', 'settings']
        }
      ]
    });

    const totalPages = Math.ceil(count / limitNum);

    logger.logInfo('Trainers retrieved', {
      action: 'TRAINERS_RETRIEVED',
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      count: trainers.length,
      totalRecords: count,
      tenantId: req.user.tenantId,
    userId: req.user?.id,
    ip: getClientIp(req)
    });

    return res.json({
      success: true,
      data: trainers,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalRecords: count,
        limit: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      },
      filters: { search, status, specialization, sortBy: sortField, sortOrder: order }
    });
  } catch (err) {
    logger.logSecurity('Error retrieving trainers', {
      action: 'RETRIEVING_TRAINERS',
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      error: err.message,
      stack: err.stack,
      tenantId: req.user.tenantId,
    userId: req.user?.id,
    ip: getClientIp(req)
    });
    next(err);
  }
}

/**
 * Get single trainer by ID
 */
async function getTrainerById(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;
    const { includeDeleted = 'false' } = req.query;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const trainer = await Trainer.findOne({
      where,
      paranoid: includeDeleted !== 'true',
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'phone', 'isActive', 'lastLogin']
        },
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['id', 'name', 'settings']
        }
      ]
    });

    if (!trainer) {
      const error = createError('NOT_FOUND', 'Trainer tidak ditemukan');
      return res.status(error.statusCode).json({
        success: false,
        code: error.code,
        message: error.message
      });
    }

    logger.logInfo('Trainer retrieved', {
      action: 'TRAINER_RETRIEVED',
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      trainerId: trainer.id,
      tenantId: req.user.tenantId,
    userId: req.user?.id,
    ip: getClientIp(req)
    });

    return res.json({
      success: true,
      data: trainer
    });
  } catch (err) {
    logger.logSecurity('Error retrieving trainer', {
      action: 'RETRIEVING_TRAINER',
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      error: err.message,
      trainerId: req.params.id,
      tenantId: req.user.tenantId,
    userId: req.user?.id,
    ip: getClientIp(req)
    });
    next(err);
  }
}

/**
 * Create new trainer with auto-create user account
 */
async function createTrainer(req, res, next) {
  const transaction = await sequelize.transaction();
  
  try {
    const { tenantId } = req.user;
    const {
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      gender,
      specializations,
      certifications,
      bio,
      photoUrl,
      commissionType,
      commissionValue,
      commissionNotes,
      bankName,
      bankAccountNumber,
      bankAccountName,
      availability,
      hireDate
    } = req.body;

    // Validation: firstName and lastName required
    if (!firstName || !lastName) {
      await transaction.rollback();
      const error = createError('VALIDATION_ERROR', 'Nama depan dan nama belakang wajib diisi');
      return res.status(error.statusCode).json({
        success: false,
        code: error.code,
        message: error.message
      });
    }

    // Validation: email or phone harus ada
    if (!email && !phone) {
      await transaction.rollback();
      const error = createError('VALIDATION_ERROR', 'Email atau nomor telepon wajib diisi');
      return res.status(error.statusCode).json({
        success: false,
        code: error.code,
        message: error.message
      });
    }

    // Check if email already exists in tenant (if provided)
    if (email) {
      const existingTrainer = await Trainer.findOne({
        where: { email, tenantId },
        transaction
      });
      if (existingTrainer) {
        await transaction.rollback();
        const error = createError('DUPLICATE_ENTRY', 'Trainer dengan email ini sudah terdaftar');
        return res.status(error.statusCode).json({
          success: false,
          code: error.code,
          message: error.message
        });
      }
    }

    // Check if phone already exists in tenant
    if (phone) {
      const existingPhone = await Trainer.findOne({
        where: { phone, tenantId },
        transaction
      });
      if (existingPhone) {
        await transaction.rollback();
        const error = createError('DUPLICATE_ENTRY', 'Trainer dengan nomor telepon ini sudah terdaftar');
        return res.status(error.statusCode).json({
          success: false,
          code: error.code,
          message: error.message
        });
      }
    }

    // Get "Trainer" role
    const trainerRole = await Role.findOne({
      where: { name: 'Trainer' },
      transaction
    });

    if (!trainerRole) {
      await transaction.rollback();
      const error = createError('INTERNAL_ERROR', 'Role trainer tidak ditemukan. Hubungi administrator.');
      return res.status(error.statusCode).json({
        success: false,
        code: error.code,
        message: error.message
      });
    }

    // Generate password
    const plainPassword = generatePassword();

    // Create User account
    const user = await User.create({
      tenantId,
      email: email || null,
      phone: phone || null,
      password: plainPassword, // Will be hashed by model setter
      firstName,
      lastName,
      roleId: trainerRole.id,
      isActive: true,
      isSuperAdmin: false
    }, { transaction });

    // Create trainer
    const trainer = await Trainer.create({
      tenantId,
      userId: user.id,
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      gender,
      specializations: specializations || [],
      certifications: certifications || [],
      bio,
      photoUrl,
      commissionType: commissionType || 'percentage',
      commissionValue: commissionValue || 0,
      commissionNotes,
      bankName: bankName || null,
      bankAccountNumber: bankAccountNumber || null,
      bankAccountName: bankAccountName || null,
      availability: availability || {},
      hireDate: hireDate || new Date(),
      isActive: true
    }, { transaction });

    await transaction.commit();

    // Send password to trainer (email/SMS)
    await sendPasswordToTrainer(trainer, plainPassword, req);

    logger.logAudit('Trainer created with user account', {
      action: 'TRAINER_CREATED_WITH_USER_ACCOUNT',
      tenantId: req.user?.tenantId,
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      trainerId: trainer.id,
      userId: user.id,
      trainerName: trainer.fullName,
      tenantId,
      user: req.user,
    userId: req.user?.id,
    ip: getClientIp(req)
    });

    return res.status(201).json({
      success: true,
      message: 'Trainer berhasil dibuat',
      data: {
        trainer: {
          id: trainer.id,
          firstName: trainer.firstName,
          lastName: trainer.lastName,
          fullName: trainer.fullName,
          email: trainer.email,
          phone: trainer.phone,
          commissionType: trainer.commissionType,
          commissionValue: trainer.commissionValue,
          specializations: trainer.specializations,
          createdAt: trainer.createdAt
        },
        credentials: process.env.AUTO_GENERATE_PASSWORD === 'true' 
          ? { message: 'Password sent via email/SMS' }
          : { tempPassword: plainPassword } // Only for development
      }
    });
  } catch (err) {
    // Only rollback if transaction is still pending
    if (!transaction.finished) {
      await transaction.rollback();
    }
    
    logger.logSecurity('Error creating trainer', {
      action: 'CREATING_TRAINER',
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      error: err.message,
      stack: err.stack,
      tenantId: req.user.tenantId,
    userId: req.user?.id,
    ip: getClientIp(req)
    });

    // Handle Sequelize validation errors
    if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
      const error = createError('VALIDATION_ERROR', 'Validasi gagal');
      return res.status(error.statusCode).json({
        success: false,
        code: error.code,
        message: error.message,
        errors: err.errors.map(e => ({ field: e.path, message: e.message }))
      });
    }

    next(err);
  }
}

/**
 * Update trainer
 */
async function updateTrainer(req, res, next) {
  const transaction = await sequelize.transaction();
  
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;
    const {
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      gender,
      specializations,
      certifications,
      bio,
      photoUrl,
      commissionType,
      commissionValue,
      commissionNotes,
      bankName,
      bankAccountNumber,
      bankAccountName,
      availability,
      isActive
    } = req.body;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const trainer = await Trainer.findOne({ where, transaction });

    if (!trainer) {
      await transaction.rollback();
      const error = createError('NOT_FOUND', 'Trainer tidak ditemukan');
      return res.status(error.statusCode).json({
        success: false,
        code: error.code,
        message: error.message
      });
    }

    // Check email uniqueness (if changing)
    if (email && email !== trainer.email) {
      const existingEmail = await Trainer.findOne({
        where: { 
          email, 
          tenantId: trainer.tenantId,
          id: { [Op.ne]: trainer.id }
        },
        transaction
      });
      if (existingEmail) {
        await transaction.rollback();
        const error = createError('DUPLICATE_ENTRY', 'Trainer dengan email ini sudah terdaftar');
        return res.status(error.statusCode).json({
          success: false,
          code: error.code,
          message: error.message
        });
      }
    }

    // Check phone uniqueness (if changing)
    if (phone && phone !== trainer.phone) {
      const existingPhone = await Trainer.findOne({
        where: { 
          phone, 
          tenantId: trainer.tenantId,
          id: { [Op.ne]: trainer.id }
        },
        transaction
      });
      if (existingPhone) {
        await transaction.rollback();
        const error = createError('DUPLICATE_ENTRY', 'Trainer dengan nomor telepon ini sudah terdaftar');
        return res.status(error.statusCode).json({
          success: false,
          code: error.code,
          message: error.message
        });
      }
    }

    // Update trainer
    await trainer.update({
      firstName: firstName || trainer.firstName,
      lastName: lastName || trainer.lastName,
      email: email !== undefined ? email : trainer.email,
      phone: phone !== undefined ? phone : trainer.phone,
      dateOfBirth: dateOfBirth !== undefined ? dateOfBirth : trainer.dateOfBirth,
      gender: gender || trainer.gender,
      specializations: specializations || trainer.specializations,
      certifications: certifications || trainer.certifications,
      bio: bio !== undefined ? bio : trainer.bio,
      photoUrl: photoUrl !== undefined ? photoUrl : trainer.photoUrl,
      commissionType: commissionType || trainer.commissionType,
      commissionValue: commissionValue !== undefined ? commissionValue : trainer.commissionValue,
      commissionNotes: commissionNotes !== undefined ? commissionNotes : trainer.commissionNotes,
      bankName: bankName !== undefined ? bankName : trainer.bankName,
      bankAccountNumber: bankAccountNumber !== undefined ? bankAccountNumber : trainer.bankAccountNumber,
      bankAccountName: bankAccountName !== undefined ? bankAccountName : trainer.bankAccountName,
      availability: availability || trainer.availability,
      isActive: isActive !== undefined ? isActive : trainer.isActive
    }, { transaction });

    // Update user account if relevant fields changed
    if (trainer.userId) {
      const userUpdates = {};
      
      if (firstName) userUpdates.firstName = firstName;
      if (lastName) userUpdates.lastName = lastName;
      if (isActive !== undefined) userUpdates.isActive = isActive;
      
      if (email !== undefined && email !== null) {
        userUpdates.email = email;
      }
      
      if (phone !== undefined) {
        userUpdates.phone = phone;
      }
      
      if (Object.keys(userUpdates).length > 0) {
        await User.update(userUpdates, {
          where: { id: trainer.userId },
          transaction
        });
      }
    }

    await transaction.commit();

    logger.logAudit('Trainer updated', {
      action: 'TRAINER_UPDATED',
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      trainerId: trainer.id,
      trainerName: trainer.fullName,
      tenantId: req.user.tenantId,
      user: req.user,
    userId: req.user?.id,
    ip: getClientIp(req)
    });

    return res.json({
      success: true,
      message: 'Trainer berhasil diperbarui',
      data: trainer
    });
  } catch (err) {
    // Only rollback if transaction is still pending
    if (!transaction.finished) {
      await transaction.rollback();
    }
    
    logger.logSecurity('Error updating trainer', {
      action: 'UPDATING_TRAINER',
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      error: err.message,
      stack: err.stack,
      trainerId: req.params.id,
      tenantId: req.user.tenantId,
    userId: req.user?.id,
    ip: getClientIp(req)
    });
    next(err);
  }
}

/**
 * Delete trainer (soft delete)
 */
async function deleteTrainer(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const trainer = await Trainer.findOne({ where });

    if (!trainer) {
      const error = createError('NOT_FOUND', 'Trainer tidak ditemukan');
      return res.status(error.statusCode).json({
        success: false,
        code: error.code,
        message: error.message
      });
    }

    // Check if trainer has pending commissions
    const pendingCommissions = await TrainerCommission.count({
      where: {
        trainerId: trainer.id,
        status: 'pending'
      }
    });

    if (pendingCommissions > 0) {
      const error = createError(
        'RESOURCE_LOCKED',
        'Tidak dapat menghapus trainer dengan komisi pending. Selesaikan pembayaran komisi terlebih dahulu.',
        { pendingCommissions }
      );
      return res.status(error.statusCode).json({
        success: false,
        code: error.code,
        message: error.message,
        data: error.data
      });
    }

    // Soft delete
    await trainer.destroy();

    // Also deactivate user account
    if (trainer.userId) {
      await User.update(
        { isActive: false },
        { where: { id: trainer.userId } }
      );
    }

    logger.logAudit('Trainer deleted (soft)', {
      action: 'TRAINER_DELETED_SOFT',
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      trainerId: trainer.id,
      trainerName: trainer.fullName,
      tenantId: req.user.tenantId,
      user: req.user,
    userId: req.user?.id,
    ip: getClientIp(req)
    });

    return res.json({
      success: true,
      message: 'Trainer berhasil dihapus'
    });
  } catch (err) {
    logger.logSecurity('Error deleting trainer', {
      action: 'DELETING_TRAINER',
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      error: err.message,
      trainerId: req.params.id,
      tenantId: req.user.tenantId,
    userId: req.user?.id,
    ip: getClientIp(req)
    });
    next(err);
  }
}

/**
 * Reset trainer password
 */
async function resetTrainerPassword(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const trainer = await Trainer.findOne({ where });

    if (!trainer) {
      const error = createError('NOT_FOUND', 'Trainer tidak ditemukan');
      return res.status(error.statusCode).json({
        success: false,
        code: error.code,
        message: error.message
      });
    }

    if (!trainer.userId) {
      const error = createError('INVALID_INPUT', 'Trainer tidak memiliki akun user');
      return res.status(error.statusCode).json({
        success: false,
        code: error.code,
        message: error.message
      });
    }

    // Generate new password
    const newPassword = generatePassword();

    // Update user password
    await User.update(
      { password: newPassword },
      { where: { id: trainer.userId } }
    );

    // Send password to trainer
    await sendPasswordToTrainer(trainer, newPassword);

    logger.logAudit('Trainer password reset', {
      action: 'TRAINER_PASSWORD_RESET',
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      trainerId: trainer.id,
      userId: trainer.userId,
      trainerName: trainer.fullName,
      tenantId: req.user.tenantId,
      user: req.user,
    userId: req.user?.id,
    ip: getClientIp(req)
    });

    res.json({
      success: true,
      message: 'Password berhasil direset',
      data: process.env.AUTO_GENERATE_PASSWORD === 'true'
        ? { message: 'Password baru dikirim via email/SMS' }
        : { tempPassword: newPassword }
    });

  } catch (err) {
    logger.logSecurity('Error resetting trainer password', {
      action: 'RESETTING_TRAINER_PASSWORD',
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      error: err.message,
      trainerId: req.params.id,
      tenantId: req.user.tenantId,
    userId: req.user?.id,
    ip: getClientIp(req)
    });
    next(err);
  }
}

/**
 * Get trainer commissions
 */
async function getTrainerCommissions(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;
    const { 
      page = 1, 
      limit = 10,
      status,
      startDate,
      endDate
    } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    // Check trainer exists
    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const trainer = await Trainer.findOne({ where });

    if (!trainer) {
      const error = createError('NOT_FOUND', 'Trainer tidak ditemukan');
      return res.status(error.statusCode).json({
        success: false,
        code: error.code,
        message: error.message
      });
    }

    // Build commission where clause
    const commissionWhere = { 
      trainerId: id,
      tenantId: isSuperAdmin ? trainer.tenantId : tenantId
    };

    if (status) {
      commissionWhere.status = status;
    }

    if (startDate || endDate) {
      commissionWhere.createdAt = {};
      if (startDate) commissionWhere.createdAt[Op.gte] = new Date(startDate);
      if (endDate) commissionWhere.createdAt[Op.lte] = new Date(endDate);
    }

    const { count, rows } = await TrainerCommission.findAndCountAll({
      where: commissionWhere,
      include: [
        {
          model: Transaction,
          as: 'transaction',
          attributes: ['id', 'transactionNumber', 'totalAmount', 'createdAt']
        }
      ],
      limit: limitNum,
      offset,
      order: [['createdAt', 'DESC']]
    });

    // Calculate summary
    const summary = await TrainerCommission.findOne({
      where: { trainerId: id, tenantId: trainer.tenantId },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalCommissions'],
        [sequelize.fn('SUM', sequelize.col('commissionAmount')), 'totalAmount'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN status = 'paid' THEN \"commissionAmount\" ELSE 0 END")), 'paidAmount'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN status = 'pending' THEN \"commissionAmount\" ELSE 0 END")), 'pendingAmount']
      ],
      raw: true
    });

    const totalPages = Math.ceil(count / limitNum);

    logger.logInfo('Trainer commissions retrieved', {
      action: 'TRAINER_COMMISSIONS_RETRIEVED',
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      trainerId: id,
      count: rows.length,
      totalRecords: count,
      tenantId: req.user.tenantId,
    userId: req.user?.id,
    ip: getClientIp(req)
    });

    res.json({
      success: true,
      data: {
        commissions: rows,
        summary: {
          totalCommissions: parseInt(summary.totalCommissions) || 0,
          totalAmount: parseFloat(summary.totalAmount) || 0,
          paidAmount: parseFloat(summary.paidAmount) || 0,
          pendingAmount: parseFloat(summary.pendingAmount) || 0
        },
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalRecords: count,
          limit: limitNum,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1
        }
      }
    });

  } catch (err) {
    logger.logSecurity('Error retrieving trainer commissions', {
      action: 'RETRIEVING_TRAINER_COMMISSIONS',
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      error: err.message,
      trainerId: req.params.id,
      tenantId: req.user.tenantId,
    userId: req.user?.id,
    ip: getClientIp(req)
    });
    next(err);
  }
}

/**
 * Pay trainer commission
 */
async function payCommission(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id, commissionId } = req.params;
    const { paymentMethod, notes } = req.body;

    // Check trainer exists
    const trainerWhere = { id };
    if (!isSuperAdmin) {
      trainerWhere.tenantId = tenantId;
    }

    const trainer = await Trainer.findOne({ where: trainerWhere });

    if (!trainer) {
      const error = createError('NOT_FOUND', 'Trainer tidak ditemukan');
      return res.status(error.statusCode).json({
        success: false,
        code: error.code,
        message: error.message
      });
    }

    // Find commission
    const commission = await TrainerCommission.findOne({
      where: {
        id: commissionId,
        trainerId: id,
        tenantId: isSuperAdmin ? trainer.tenantId : tenantId
      }
    });

    if (!commission) {
      const error = createError('NOT_FOUND', 'Komisi tidak ditemukan');
      return res.status(error.statusCode).json({
        success: false,
        code: error.code,
        message: error.message
      });
    }

    if (commission.status === 'paid') {
      const error = createError('INVALID_INPUT', 'Komisi sudah dibayar');
      return res.status(error.statusCode).json({
        success: false,
        code: error.code,
        message: error.message
      });
    }

    // Mark as paid
    await commission.markAsPaid(paymentMethod, notes);

    logger.logAudit('Trainer commission paid', {
      action: 'TRAINER_COMMISSION_PAID',
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      commissionId: commission.id,
      trainerId: trainer.id,
      amount: commission.commissionAmount,
      paymentMethod,
      tenantId: req.user.tenantId,
      user: req.user,
    userId: req.user?.id,
    ip: getClientIp(req)
    });

    res.json({
      success: true,
      message: 'Komisi berhasil dibayar',
      data: commission
    });

  } catch (err) {
    logger.logSecurity('Error paying trainer commission', {
      action: 'PAYING_TRAINER_COMMISSION',
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      error: err.message,
      trainerId: req.params.id,
      commissionId: req.params.commissionId,
      tenantId: req.user.tenantId,
    userId: req.user?.id,
    ip: getClientIp(req)
    });
    next(err);
  }
}

/**
 * Backfill commissions for active services that have a trainer assigned
 * but no commission record yet. Useful for fixing historical data.
 * @route POST /gym/trainers/commissions/backfill
 */
async function backfillCommissions(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { dryRun = false } = req.query;
    const isDryRun = dryRun === 'true' || dryRun === true;

    // Find all active services that have a trainer assigned and a purchase transaction
    const where = {
      assignedTrainerId: { [Op.ne]: null },
      purchaseTransactionId: { [Op.ne]: null }
    };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const services = await ActiveService.findAll({
      where,
      include: [
        {
          model: Trainer,
          as: 'assignedTrainer',
          attributes: ['id', 'firstName', 'lastName', 'commissionType', 'commissionValue']
        }
      ],
      transaction: t
    });

    const created = [];
    const skipped = [];

    for (const service of services) {
      const trainer = service.assignedTrainer;
      if (!trainer || !trainer.commissionValue || trainer.commissionValue <= 0) {
        skipped.push({ serviceId: service.id, reason: 'Trainer has no commission configured' });
        continue;
      }

      // Check if commission already exists (non-cancelled)
      const existing = await TrainerCommission.findOne({
        where: {
          trainerId: trainer.id,
          transactionId: service.purchaseTransactionId,
          status: { [Op.ne]: 'cancelled' }
        },
        transaction: t
      });

      if (existing) {
        skipped.push({ serviceId: service.id, reason: 'Commission already exists', commissionId: existing.id });
        continue;
      }

      if (!isDryRun) {
        const commission = await TrainerCommission.create({
          tenantId: service.tenantId,
          trainerId: trainer.id,
          transactionId: service.purchaseTransactionId,
          classId: null,
          baseAmount: service.pricePaid || 0,
          commissionType: trainer.commissionType,
          commissionRate: trainer.commissionValue,
          status: 'pending',
          notes: `[BACKFILL] Commission for ${service.serviceType} service - Service ID: ${service.id}`
        }, { transaction: t });
        created.push({
          serviceId: service.id,
          trainerId: trainer.id,
          trainerName: `${trainer.firstName} ${trainer.lastName}`,
          commissionId: commission.id,
          commissionAmount: parseFloat(service.pricePaid || 0) * (trainer.commissionType === 'percentage' ? trainer.commissionValue / 100 : 1)
        });
      } else {
        created.push({
          serviceId: service.id,
          trainerId: trainer.id,
          trainerName: `${trainer.firstName} ${trainer.lastName}`,
          wouldCreate: true
        });
      }
    }

    if (!isDryRun) {
      await t.commit();
    } else {
      await t.rollback();
    }

    logger.logInfo('Commission backfill completed', {
      action: 'COMMISSION_BACKFILL',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      ip: getClientIp(req),
      isDryRun,
      createdCount: created.length,
      skippedCount: skipped.length
    });

    return res.json({
      success: true,
      message: isDryRun
        ? `Dry run: would create ${created.length} commission(s)`
        : `Backfill complete: created ${created.length} commission(s), skipped ${skipped.length}`,
      data: {
        isDryRun,
        created,
        skipped,
        summary: {
          totalServicesChecked: services.length,
          commissionsCreated: created.length,
          commissionsSkipped: skipped.length
        }
      }
    });
  } catch (err) {
    if (t && !t.finished) {
      await t.rollback();
    }
    logger.logError('Error backfilling commissions', {
      action: 'COMMISSION_BACKFILL_ERROR',
      error: err.message,
      stack: err.stack
    });
    next(err);
  }
}

/**
 * Toggle trainer active/inactive (disable / enable)
 */
async function toggleTrainerActive(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) where.tenantId = tenantId;

    const trainer = await Trainer.findOne({ where });
    if (!trainer) {
      const error = createError('NOT_FOUND', 'Trainer tidak ditemukan');
      return res.status(error.statusCode).json({ success: false, code: error.code, message: error.message });
    }

    const newStatus = !trainer.isActive;

    await trainer.update({ isActive: newStatus });

    // Sync user account status
    if (trainer.userId) {
      await User.update({ isActive: newStatus }, { where: { id: trainer.userId } });
    }

    logger.logAudit(`Trainer ${newStatus ? 'activated' : 'deactivated'}`, {
      action: newStatus ? 'TRAINER_ACTIVATED' : 'TRAINER_DEACTIVATED',
      trainerId: trainer.id,
      tenantId: req.user.tenantId,
      userId: req.user?.id,
      ip: getClientIp(req)
    });

    return res.json({
      success: true,
      message: `Trainer berhasil ${newStatus ? 'diaktifkan' : 'dinonaktifkan'}`,
      data: { id: trainer.id, isActive: newStatus }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Restore soft-deleted trainer
 */
async function restoreTrainer(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const trainer = await Trainer.findOne({
      where: isSuperAdmin ? { id } : { id, tenantId },
      paranoid: false,
    });

    if (!trainer) {
      const error = createError('NOT_FOUND', 'Trainer tidak ditemukan');
      return res.status(error.statusCode).json({ success: false, code: error.code, message: error.message });
    }

    if (!trainer.deletedAt) {
      return res.status(400).json({ success: false, message: 'Trainer tidak dalam status terhapus' });
    }

    await trainer.restore();
    await trainer.update({ isActive: true });

    if (trainer.userId) {
      await User.update({ isActive: true }, { where: { id: trainer.userId } });
    }

    logger.logAudit('Trainer restored', {
      action: 'TRAINER_RESTORED',
      trainerId: trainer.id,
      tenantId: req.user.tenantId,
      userId: req.user?.id,
      ip: getClientIp(req)
    });

    return res.json({
      success: true,
      message: 'Trainer berhasil dipulihkan',
      data: { id: trainer.id, isActive: true }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllTrainers,
  getTrainerById,
  createTrainer,
  updateTrainer,
  deleteTrainer,
  toggleTrainerActive,
  restoreTrainer,
  resetTrainerPassword,
  getTrainerCommissions,
  payCommission,
  backfillCommissions
};
