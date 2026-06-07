const { Member, ActiveService, ServicePlan, Transaction, TransactionItem, Subscription, SubscriptionPlan } = require('../../models');
const logger = require('../../utils/logger');
const { Op } = require('sequelize');

/**
 * Get Member Dashboard
 * Shows overview of member's active services, recent transactions, and statistics
 */
async function getDashboard(req, res, next) {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenantId;

    // Find member by userId
    const member = await Member.findOne({
      where: { 
        userId,
        tenantId 
      },
      attributes: ['id', 'userId', 'firstName', 'lastName', 'email', 'phone', 'photoUrl', 'membershipStatus', 'joinDate']
    });

    if (!member) {
      return res.status(404).json({
        status: 'error',
        message: 'Member profile not found'
      });
    }

    // Get active services with details
    const activeServices = await ActiveService.findAll({
      where: {
        memberId: member.id,
        tenantId,
        status: 'active',
        endDate: {
          [Op.gte]: new Date()
        }
      },
      include: [
        {
          model: ServicePlan,
          as: 'servicePlan',
          attributes: ['id', 'name', 'serviceType', 'price', 'description', 'duration', 'durationType', 'sessions']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Get recent transactions (last 5)
    const recentTransactions = await Transaction.findAll({
      where: {
        tenantId,
        customerId: member.userId,
        status: {
          [Op.in]: ['completed', 'pending']
        }
      },
      include: [
        {
          model: TransactionItem,
          as: 'items',
          attributes: ['id', 'itemType', 'itemName', 'quantity', 'unitPrice', 'subtotal']
        }
      ],
      limit: 5,
      order: [['createdAt', 'DESC']]
    });

    // Calculate statistics
    const stats = {
      totalActiveServices: activeServices.length,
      membershipServices: activeServices.filter(s => s.servicePlan.serviceType === 'membership').length,
      classServices: activeServices.filter(s => s.servicePlan.serviceType === 'class_package').length,
      ptServices: activeServices.filter(s => s.servicePlan.serviceType === 'pt_package').length,
      totalSpent: recentTransactions.reduce((sum, t) => sum + parseFloat(t.totalAmount || 0), 0)
    };

    // Check tenant's restaurant feature availability
    const subscription = await Subscription.findOne({
      where: {
        tenantId,
        status: 'active'
      },
      include: [
        {
          model: SubscriptionPlan,
          as: 'plan',
          attributes: ['features']
        }
      ]
    });

    const hasRestaurant = subscription?.plan?.features?.modules?.restaurant || false;

    logger.logInfo('Member dashboard retrieved', {
      action: 'MEMBER_DASHBOARD_VIEW',
      userId,
      tenantId,
      memberId: member.id,
      stats
    });

    res.json({
      status: 'success',
      message: 'Dashboard data retrieved successfully',
      data: {
        member: {
          id: member.id,
          fullName: `${member.firstName} ${member.lastName}`,
          email: member.email,
          phone: member.phone,
          photoUrl: member.photoUrl,
          membershipStatus: member.membershipStatus,
          joinDate: member.joinDate
        },
        activeServices: activeServices.map(s => ({
          id: s.id,
          servicePlan: {
            id: s.servicePlan.id,
            name: s.servicePlan.name,
            type: s.servicePlan.serviceType,
            description: s.servicePlan.description
          },
          startDate: s.startDate,
          endDate: s.endDate,
          remainingSessions: s.remainingSessions,
          status: s.status
        })),
        recentTransactions: recentTransactions.map(t => ({
          id: t.id,
          transactionNumber: t.transactionNumber,
          date: t.transactionDate,
          totalAmount: t.totalAmount,
          status: t.status,
          type: t.type,
          items: t.items.map(item => ({
            name: item.itemName,
            quantity: item.quantity,
            price: item.unitPrice
          }))
        })),
        stats,
        features: {
          restaurant: hasRestaurant
        }
      }
    });

  } catch (err) {
    logger.logError('Error retrieving member dashboard', {
      action: 'MEMBER_DASHBOARD_ERROR',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      error: err.message,
      stack: err.stack
    });
    next(err);
  }
}

module.exports = {
  getDashboard
};
