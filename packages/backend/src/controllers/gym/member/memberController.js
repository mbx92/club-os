const { Member, Membership, MembershipType, User, Role, Tenant, ActiveService, ServicePlan, sequelize } = require("../../../models");
const { Op } = require('sequelize');
const logger = require("../../../utils/logger");
const { getClientIp, getUserAgent } = require("../../../utils/requestHelper");
const { createError } = require("../../../utils/errorCodes");

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
  return process.env.DEFAULT_MEMBER_PASSWORD || 'password123';
};

/**
 * Helper: Send password to member (email/SMS)
 */
const sendPasswordToMember = async (member, password, req = null) => {
  // TODO: Implement dengan SMTP/SMS service
  // Untuk sekarang, hanya log
  console.log(`Password for ${member.email || member.phone}: ${password}`);
  
  if (req) {
    logger.logInfo('Member password generated', {
      action: 'MEMBER_PASSWORD_GENERATED',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      path: req.path,
      memberId: member.id,
      email: member.email,
      phone: member.phone,
      method: process.env.AUTO_GENERATE_PASSWORD === 'true' ? 'auto-generated' : 'default'
    });
  }
  
  // Future implementation:
  // if (member.email && process.env.SMTP_ENABLED) {
  //   await emailService.send({
  //     to: member.email,
  //     subject: 'Welcome to Our Gym',
  //     template: 'member-welcome',
  //     data: { password, firstName: member.firstName }
  //   });
  // }
};

/**
 * Get all members for tenant
 * Supports pagination, search, and filtering
 */
async function getMembers(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      status = 'all',
      membershipStatus,
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
    if (status !== 'all') {
      where.isActive = status === 'active';
    }

    // Filter by membership status
    if (membershipStatus && membershipStatus !== 'all') {
      where.membershipStatus = membershipStatus;
    }

    // Validate sort field
    const allowedSortFields = ['firstName', 'lastName', 'email', 'createdAt', 'updatedAt', 'joinDate'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const { count, rows: members } = await Member.findAndCountAll({
      where,
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
          model: ActiveService,
          as: 'activeServices',
          include: [{ 
            model: ServicePlan, 
            as: 'servicePlan',
            attributes: ['id', 'name', 'serviceType', 'price', 'duration', 'durationType', 'sessions', 'validityDays', 'isActive']
          }],
          where: { status: 'active' },
          required: false,
          order: [['endDate', 'DESC']],
          limit: 3
        }
      ]
    });

    const totalPages = Math.ceil(count / limitNum);

    logger.logInfo("Members retrieved", {
      action: 'MEMBERS_RETRIEVED',
      userId: req.user?.id,
      count: members.length,
      totalRecords: count,
      tenantId: req.user.tenantId,
      request: {
        method: req.method,
        path: req.path,
        ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path
      }
    });

    return res.json({
      data: members,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalRecords: count,
        limit: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      },
      filters: { search, status, membershipStatus, sortBy: sortField, sortOrder: order }
    });
  } catch (err) {
    logger.logSecurity("Error retrieving members", {
      action: 'RETRIEVING_MEMBERS',
      userId: req.user?.id,
      error: err.message,
      stack: err.stack,
      tenantId: req.user.tenantId,
      request: {
        method: req.method,
        path: req.path,
        ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path
      }
    });
    next(err);
  }
}

/**
 * Get single member by ID
 */
async function getMember(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const member = await Member.findOne({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'phone', 'isActive', 'lastLogin']
        },
        {
          model: ActiveService,
          as: 'activeServices',
          include: [{ 
            model: ServicePlan, 
            as: 'servicePlan',
            attributes: ['id', 'name', 'serviceType', 'price', 'duration', 'durationType']
          }],
          order: [['startDate', 'DESC']]
        },
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['id', 'name']
        }
      ]
    });

    if (!member) {
      const error = createError('NOT_FOUND', 'Member tidak ditemukan');
      return res.status(error.statusCode).json({
        success: false,
        code: error.code,
        message: error.message
      });
    }

    logger.logInfo("Member retrieved", {
      action: 'MEMBER_RETRIEVED',
      userId: req.user?.id,
      memberId: member.id,
      tenantId: req.user.tenantId,
      request: {
        method: req.method,
        path: req.path,
        ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path
      }
    });

    return res.json(member);
  } catch (err) {
    logger.logSecurity("Error retrieving member", {
      action: 'RETRIEVING_MEMBER',
      userId: req.user?.id,
      error: err.message,
      memberId: req.params.id,
      tenantId: req.user.tenantId,
      request: {
        method: req.method,
        path: req.path,
        ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path
      }
    });
    next(err);
  }
}

/**
 * Create new member with auto-create user account
 */
async function createMember(req, res, next) {
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
      address,
      emergencyContactName,
      emergencyContactPhone,
      notes,
      photoUrl
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
      const existingMember = await Member.findOne({
        where: { 
          email, 
          tenantId 
        },
        transaction
      });
      if (existingMember) {
        await transaction.rollback();
        const error = createError('DUPLICATE_ENTRY', 'Member dengan email ini sudah terdaftar');
        return res.status(error.statusCode).json({
          success: false,
          code: error.code,
          message: error.message
        });
      }
    }

    // Check if phone already exists in tenant
    if (phone) {
      const existingPhone = await Member.findOne({
        where: { 
          phone, 
          tenantId 
        },
        transaction
      });
      if (existingPhone) {
        await transaction.rollback();
        const error = createError('DUPLICATE_ENTRY', 'Member dengan nomor telepon ini sudah terdaftar');
        return res.status(error.statusCode).json({
          success: false,
          code: error.code,
          message: error.message
        });
      }
    }

    // Get "Member" role
    const memberRole = await Role.findOne({
      where: { name: 'Member' },
      transaction
    });

    if (!memberRole) {
      await transaction.rollback();
      const error = createError('INTERNAL_ERROR', 'Role member tidak ditemukan. Hubungi administrator.');
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
      roleId: memberRole.id,
      isActive: true,
      isSuperAdmin: false
    }, { transaction });

    // Create member
    const member = await Member.create({
      tenantId,
      userId: user.id,
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      gender,
      address,
      emergencyContactName,
      emergencyContactPhone,
      notes,
      photoUrl,
      joinDate: new Date(),
      isActive: true,
      membershipStatus: 'expired' // Default, will change after buying membership
    }, { transaction });

    // Send password to member (email/SMS) - before commit
    await sendPasswordToMember(member, plainPassword, req);

    // Commit transaction after all operations
    await transaction.commit();

    logger.logAudit("Member created with user account", {
      action: 'MEMBER_CREATED_WITH_USER_ACCOUNT',
      tenantId: req.user?.tenantId,
      memberId: member.id,
      userId: user.id,
      memberName: member.fullName,
      user: req.user,
      request: {
        method: req.method,
        path: req.path,
        ip: getClientIp(req),
        userAgent: getUserAgent(req)
      }
    });

    return res.status(201).json({
      message: "Member created successfully",
      member: {
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        fullName: member.fullName,
        email: member.email,
        phone: member.phone,
        membershipStatus: member.membershipStatus,
        createdAt: member.createdAt
      },
      credentials: process.env.AUTO_GENERATE_PASSWORD === 'true' 
        ? { message: 'Password sent via email/SMS' }
        : { tempPassword: plainPassword } // Only for development
    });
  } catch (err) {
    // Only rollback if transaction is still active
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    
    logger.logSecurity("Error creating member", {
      action: 'CREATING_MEMBER',
      userId: req.user?.id,
      error: err.message,
      stack: err.stack,
      tenantId: req.user.tenantId,
      request: {
        method: req.method,
        path: req.path,
        ip: getClientIp(req),
        userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
        body: { 
          firstName: req.body.firstName,
          lastName: req.body.lastName,
          email: req.body.email,
          phone: req.body.phone
        }
      }
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
 * Update member
 */
async function updateMember(req, res, next) {
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
      address,
      emergencyContactName,
      emergencyContactPhone,
      notes,
      photoUrl,
      isActive,
      membershipStatus
    } = req.body;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    // Include soft-deleted members so they can be restored
    const member = await Member.findOne({ where, paranoid: false, transaction });

    if (!member) {
      await transaction.rollback();
      const error = createError('NOT_FOUND', 'Member tidak ditemukan');
      return res.status(error.statusCode).json({
        success: false,
        code: error.code,
        message: error.message
      });
    }

    // Validate membershipStatus change
    if (membershipStatus && membershipStatus !== member.membershipStatus) {
      // Tidak boleh mengubah status menjadi 'active' secara manual
      if (membershipStatus === 'active') {
        await transaction.rollback();
        const error = createError(
          'INVALID_INPUT',
          'Tidak dapat mengubah status membership menjadi aktif secara manual. Silakan buat atau perpanjang membership.',
          { hint: 'Gunakan endpoint pembayaran membership untuk mengaktifkan' }
        );
        return res.status(error.statusCode).json({
          success: false,
          code: error.code,
          message: error.message,
          data: error.data
        });
      }
      
      // Hanya boleh mengubah dari active ke suspended/cancelled/expired
      const allowedStatuses = ['expired', 'suspended', 'cancelled'];
      if (!allowedStatuses.includes(membershipStatus)) {
        await transaction.rollback();
        const error = createError(
          'VALIDATION_ERROR',
          `Status membership tidak valid. Status yang diizinkan: ${allowedStatuses.join(', ')}`
        );
        return res.status(error.statusCode).json({
          success: false,
          code: error.code,
          message: error.message
        });
      }
    }

    // Check email uniqueness (if changing)
    if (email && email !== member.email) {
      const existingEmail = await Member.findOne({
        where: { 
          email, 
          tenantId: member.tenantId,
          id: { [Op.ne]: member.id }
        },
        transaction
      });
      if (existingEmail) {
        await transaction.rollback();
        const error = createError('DUPLICATE_ENTRY', 'Member dengan email ini sudah terdaftar');
        return res.status(error.statusCode).json({
          success: false,
          code: error.code,
          message: error.message
        });
      }
    }

    // Check phone uniqueness (if changing)
    if (phone && phone !== member.phone) {
      const existingPhone = await Member.findOne({
        where: { 
          phone, 
          tenantId: member.tenantId,
          id: { [Op.ne]: member.id }
        },
        transaction
      });
      if (existingPhone) {
        await transaction.rollback();
        const error = createError('DUPLICATE_ENTRY', 'Member dengan nomor telepon ini sudah terdaftar');
        return res.status(error.statusCode).json({
          success: false,
          code: error.code,
          message: error.message
        });
      }
    }

    // Restore member if was soft-deleted and being reactivated
    if (member.deletedAt && isActive === true) {
      await member.restore({ transaction });
      logger.logInfo('Member restored from soft delete', {
        action: 'MEMBER_RESTORED',
        memberId: member.id,
        memberName: member.fullName,
        tenantId: member.tenantId,
        userId: req.user.id
      });
    }

    // Update member
    await member.update({
      firstName: firstName || member.firstName,
      lastName: lastName || member.lastName,
      email: email !== undefined ? email : member.email,
      phone: phone !== undefined ? phone : member.phone,
      dateOfBirth: dateOfBirth !== undefined ? dateOfBirth : member.dateOfBirth,
      gender: gender || member.gender,
      address: address !== undefined ? address : member.address,
      emergencyContactName: emergencyContactName !== undefined ? emergencyContactName : member.emergencyContactName,
      emergencyContactPhone: emergencyContactPhone !== undefined ? emergencyContactPhone : member.emergencyContactPhone,
      notes: notes !== undefined ? notes : member.notes,
      photoUrl: photoUrl !== undefined ? photoUrl : member.photoUrl,
      isActive: isActive !== undefined ? isActive : member.isActive,
      membershipStatus: membershipStatus !== undefined ? membershipStatus : member.membershipStatus
    }, { transaction });

    // Update user account if relevant fields changed
    if (member.userId) {
      const userUpdates = {};
      
      // Only update fields that were provided and changed
      if (firstName) userUpdates.firstName = firstName;
      if (lastName) userUpdates.lastName = lastName;
      if (isActive !== undefined) userUpdates.isActive = isActive;
      
      // Only update email if it's provided and not null
      if (email !== undefined && email !== null) {
        userUpdates.email = email;
      }
      
      // Only update phone if it's provided
      if (phone !== undefined) {
        userUpdates.phone = phone;
      }
      
      // Only perform update if there are fields to update
      if (Object.keys(userUpdates).length > 0) {
        await User.update(userUpdates, {
          where: { id: member.userId },
          transaction
        });
      }
    }

    await transaction.commit();

    logger.logAudit("Member updated", {
      action: 'MEMBER_UPDATED',
      userId: req.user?.id,
      memberId: member.id,
      memberName: member.fullName,
      tenantId: req.user.tenantId,
      user: req.user,
      request: {
        method: req.method,
        path: req.path,
        ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path
      }
    });

    return res.json({
      message: "Member updated successfully",
      member
    });
  } catch (err) {
    // Only rollback if transaction is still active
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    
    logger.logSecurity("Error updating member", {
      action: 'UPDATING_MEMBER',
      userId: req.user?.id,
      error: err.message,
      stack: err.stack,
      memberId: req.params.id,
      tenantId: req.user.tenantId,
      request: {
        method: req.method,
        path: req.path,
        ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path
      }
    });
    next(err);
  }
}

/**
 * Delete member (soft delete - set status to inactive)
 */
async function deleteMember(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const member = await Member.findOne({ where });

    if (!member) {
      const error = createError('NOT_FOUND', 'Member tidak ditemukan');
      return res.status(error.statusCode).json({
        success: false,
        code: error.code,
        message: error.message
      });
    }

    // Check if member has active memberships
    const activeMemberships = await Membership.count({
      where: {
        memberId: member.id,
        status: 'active'
      }
    });

    if (activeMemberships > 0) {
      const error = createError(
        'RESOURCE_LOCKED',
        'Tidak dapat menghapus member dengan membership aktif. Batalkan membership terlebih dahulu.',
        { activeMemberships }
      );
      return res.status(error.statusCode).json({
        success: false,
        code: error.code,
        message: error.message,
        data: error.data
      });
    }

    // Soft delete
    await member.destroy();

    // Also deactivate user account
    if (member.userId) {
      await User.update(
        { isActive: false },
        { where: { id: member.userId } }
      );
    }

    logger.logAudit("Member deleted (soft)", {
      action: 'MEMBER_DELETED_SOFT',
      userId: req.user?.id,
      memberId: member.id,
      memberName: member.fullName,
      tenantId: req.user.tenantId,
      user: req.user,
      request: {
        method: req.method,
        path: req.path,
        ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path
      }
    });

    return res.json({ 
      message: "Member deactivated successfully" 
    });
  } catch (err) {
    logger.logSecurity("Error deleting member", {
      action: 'DELETING_MEMBER',
      userId: req.user?.id,
      error: err.message,
      memberId: req.params.id,
      tenantId: req.user.tenantId,
      request: {
        method: req.method,
        path: req.path,
        ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path
      }
    });
    next(err);
  }
}

/**
 * Reset member password
 */
async function resetMemberPassword(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const member = await Member.findOne({ where });

    if (!member) {
      const error = createError('NOT_FOUND', 'Member tidak ditemukan');
      return res.status(error.statusCode).json({
        success: false,
        code: error.code,
        message: error.message
      });
    }

    if (!member.userId) {
      const error = createError('INVALID_INPUT', 'Member tidak memiliki akun user');
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
      { password: newPassword }, // Will be hashed by model setter
      { where: { id: member.userId } }
    );

    // Send password to member
    await sendPasswordToMember(member, newPassword, req);

    logger.logAudit("Member password reset", {
      action: 'MEMBER_PASSWORD_RESET',
      memberId: member.id,
      userId: member.userId,
      memberName: member.fullName,
      tenantId: req.user.tenantId,
      user: req.user,
      request: {
        method: req.method,
        path: req.path,
        ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path
      }
    });

    res.json({
      message: 'Password reset successfully',
      data: process.env.AUTO_GENERATE_PASSWORD === 'true'
        ? { message: 'New password sent via email/SMS' }
        : { tempPassword: newPassword } // Only for development
    });

  } catch (err) {
    logger.logSecurity("Error resetting member password", {
      action: 'RESETTING_MEMBER_PASSWORD',
      userId: req.user?.id,
      error: err.message,
      memberId: req.params.id,
      tenantId: req.user.tenantId,
      request: {
        method: req.method,
        path: req.path,
        ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path
      }
    });
    next(err);
  }
}

module.exports = {
  getMembers,
  getMember,
  createMember,
  updateMember,
  deleteMember,
  resetMemberPassword
};
