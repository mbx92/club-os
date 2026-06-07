const express = require('express');
const { authenticate } = require('../../../middlewares/authMiddleware');
const { authorizeCasl } = require('../../../middlewares/caslMiddleware');
const { enforceLimit } = require('../../../middlewares/featureGateMiddleware');
const auditLog = require('../../../middlewares/auditMiddleware');
const { getUsers, getUser, createUser, updateUser, deleteUser } = require('../../../controllers/core/user/userController');
const { User } = require('../../../models');

const router = express.Router();

/**
 * @route GET /users
 * @name users.list
 * @desc Get all users
 * @access Private
 * @query role - Filter by role name (e.g. admin, cashier, member, trainer)
 */
router.get('/', authenticate, authorizeCasl('read', 'User'), auditLog('LIST_USERS'), getUsers);

/**
 * @route GET /users/:id
 * @name users.get
 * @desc Get user by ID
 * @access Private
 */
router.get('/:id', authenticate, authorizeCasl('read', 'User'), auditLog('GET_USER'), getUser);

/**
 * @route POST /users
 * @name users.create
 * @desc Create a new user
 * @access Private
 * @limits Enforces maxUsers limit from subscription plan
 */
router.post('/', 
  authenticate, 
  authorizeCasl('create', 'User'),
  enforceLimit('maxUsers', async (tenantId) => {
    return await User.count({ where: { tenantId } });
  }),
  auditLog('CREATE_USER'), 
  createUser
);

/**
 * @route PUT /users/:id
 * @name users.update
 * @desc Update user
 * @access Private
 */
router.put('/:id', authenticate, authorizeCasl('update', 'User'), auditLog('UPDATE_USER'), updateUser);

/**
 * @route DELETE /users/:id
 * @name users.delete
 * @desc Delete user
 * @access Private
 */
router.delete('/:id', authenticate, authorizeCasl('delete', 'User'), auditLog('DELETE_USER'), deleteUser);

module.exports = router;
