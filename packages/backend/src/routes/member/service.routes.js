const express = require('express');
const {
  getAvailableServices,
  getMembershipPlans,
  getClassPackages,
  getPTPackages,
  subscribeToService,
  getMyActiveServices
} = require('../../controllers/member/memberServiceController');
const { authenticate } = require('../../middlewares/authMiddleware');
const auditLog = require('../../middlewares/auditMiddleware');

const router = express.Router();

/**
 * @route GET /member/services
 * @name member.services.list
 * @desc Get all available service plans (membership, classes, PT)
 * @access Private - Member role
 * @query type - Optional filter by service type
 */
router.get('/',
  authenticate,
  auditLog('MEMBER_SERVICES_LIST'),
  getAvailableServices
);

/**
 * @route GET /member/services/membership
 * @name member.services.membership
 * @desc Get membership plans only
 * @access Private - Member role
 */
router.get('/membership',
  authenticate,
  auditLog('MEMBER_MEMBERSHIPS_LIST'),
  getMembershipPlans
);

/**
 * @route GET /member/services/classes
 * @name member.services.classes
 * @desc Get class packages only
 * @access Private - Member role
 */
router.get('/classes',
  authenticate,
  auditLog('MEMBER_CLASSES_LIST'),
  getClassPackages
);

/**
 * @route GET /member/services/pt
 * @name member.services.pt
 * @desc Get personal training packages only
 * @access Private - Member role
 */
router.get('/pt',
  authenticate,
  auditLog('MEMBER_PT_LIST'),
  getPTPackages
);

/**
 * @route POST /member/services/subscribe
 * @name member.services.subscribe
 * @desc Subscribe to a service plan (self-service purchase)
 * @access Private - Member role
 * @body servicePlanId, paymentMethod
 */
router.post('/subscribe',
  authenticate,
  auditLog('MEMBER_SERVICE_SUBSCRIBE'),
  subscribeToService
);

/**
 * @route GET /member/services/my-services
 * @name member.services.myServices
 * @desc Get member's active, pending, and expired services
 * @access Private - Member role
 */
router.get('/my-services',
  authenticate,
  auditLog('MEMBER_MY_SERVICES_LIST'),
  getMyActiveServices
);

module.exports = router;
