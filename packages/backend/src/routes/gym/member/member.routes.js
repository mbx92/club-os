const express = require('express');
const { authenticate } = require('../../../middlewares/authMiddleware');
const { authorizeCasl } = require('../../../middlewares/caslMiddleware');
const { enforceLimit } = require('../../../middlewares/featureGateMiddleware');
const auditLog = require('../../../middlewares/auditMiddleware');
const { 
  getMembers, 
  getMember, 
  createMember, 
  updateMember, 
  deleteMember,
  resetMemberPassword
} = require('../../../controllers/gym/member/memberController');
const { Member } = require('../../../models');

const router = express.Router();

/**
 * @route GET /gym/members
 * @name members.list
 * @desc Get all members for tenant
 * @access Private
 * @query page, limit, search, status, sortBy, sortOrder
 */
router.get('/', 
  authenticate, 
  authorizeCasl('read', 'Member'), 
  auditLog('LIST_MEMBERS'), 
  getMembers
);

/**
 * @route GET /gym/members/:id
 * @name members.get
 * @desc Get member by ID
 * @access Private
 */
router.get('/:id', 
  authenticate, 
  authorizeCasl('read', 'Member'), 
  auditLog('GET_MEMBER'), 
  getMember
);

/**
 * @route POST /gym/members
 * @name members.create
 * @desc Create a new member
 * @access Private
 * @limits Enforces maxMembers limit from subscription plan
 */
router.post('/', 
  authenticate, 
  authorizeCasl('create', 'Member'),
  enforceLimit('maxMembers', async (tenantId) => {
    return await Member.count({ where: { tenantId } });
  }),
  auditLog('CREATE_MEMBER'), 
  createMember
);

/**
 * @route PUT /gym/members/:id
 * @name members.update
 * @desc Update member
 * @access Private
 */
router.put('/:id', 
  authenticate, 
  authorizeCasl('update', 'Member'), 
  auditLog('UPDATE_MEMBER'), 
  updateMember
);

/**
 * @route DELETE /gym/members/:id
 * @name members.delete
 * @desc Delete/deactivate member
 * @access Private
 */
router.delete('/:id', 
  authenticate, 
  authorizeCasl('delete', 'Member'), 
  auditLog('DELETE_MEMBER'), 
  deleteMember
);

/**
 * @route POST /gym/members/:id/reset-password
 * @name members.resetPassword
 * @desc Reset member password
 * @access Private
 */
router.post('/:id/reset-password', 
  authenticate, 
  authorizeCasl('update', 'Member'), 
  auditLog('RESET_MEMBER_PASSWORD'), 
  resetMemberPassword
);

module.exports = router;
