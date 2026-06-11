const express = require('express');
const { register, login, refreshToken, logout } = require('../../../controllers/core/auth/authController');
const { authenticate } = require('../../../middlewares/authMiddleware');
const { authorize } = require('../../../middlewares/permissionMiddleware');
const auditLog = require('../../../middlewares/auditMiddleware');
const operatorRoutes = require('./operator.routes');

const router = express.Router();

/**
 * @route POST /auth/register
 * @name auth.register
 * @desc User registration
 * @access Public
 */
router.post('/register', register, auditLog('USER_REGISTER'));

/**
 * @route POST /auth/login
 * @name auth.login
 * @desc User login
 * @access Public
 */
router.post('/login', login, auditLog('USER_LOGIN'));

/**
 * @route GET /auth/profile
 * @name auth.profile
 * @desc Get user profile
 * @access Private
 */
router.get('/profile', authenticate, authorize('read', 'User'), auditLog('VIEW_PROFILE'), (req, res) => {
  res.json({ user: req.user });
});

/**
 * @route POST /auth/refresh-token
 * @name auth.refreshToken
 * @desc Refresh access token
 * @access Public
 */
router.post('/refresh-token', refreshToken, auditLog('REFRESH_TOKEN'));

/**
 * @route POST /auth/logout
 * @name auth.logout
 * @desc User logout
 * @access Public
 */
router.post('/logout', logout, auditLog('USER_LOGOUT'));

/**
 * Operator PIN login sub-routes
 * GET  /auth/operator/list
 * POST /auth/operator/verify
 * PUT  /auth/operator/users/:id/pin
 */
router.use('/operator', operatorRoutes);

module.exports = router;
