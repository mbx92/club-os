const express = require('express');
const {
  getMenu,
  placeOrder,
  getOrderHistory
} = require('../../controllers/member/memberRestaurantController');
const { authenticate } = require('../../middlewares/authMiddleware');
const { requireModule } = require('../../middlewares/featureGateMiddleware');
const auditLog = require('../../middlewares/auditMiddleware');

const router = express.Router();

// All restaurant routes require the restaurant module to be enabled
router.use(requireModule('restaurant'));

/**
 * @route GET /member/restaurant/menu
 * @name member.restaurant.menu
 * @desc Get restaurant menu for member ordering
 * @access Private - Member role (requires restaurant module)
 * @query category, search
 */
router.get('/menu',
  authenticate,
  auditLog('MEMBER_RESTAURANT_MENU_VIEW'),
  getMenu
);

/**
 * @route POST /member/restaurant/order
 * @name member.restaurant.order
 * @desc Place restaurant order
 * @access Private - Member role (requires restaurant module)
 * @body items, notes, paymentMethod
 */
router.post('/order',
  authenticate,
  auditLog('MEMBER_RESTAURANT_ORDER_CREATE'),
  placeOrder
);

/**
 * @route GET /member/restaurant/orders
 * @name member.restaurant.orders
 * @desc Get member's restaurant order history
 * @access Private - Member role (requires restaurant module)
 * @query page, limit, status
 */
router.get('/orders',
  authenticate,
  auditLog('MEMBER_RESTAURANT_ORDERS_LIST'),
  getOrderHistory
);

module.exports = router;
