'use strict';

/**
 * Order Routes - Restaurant Module
 * 
 * Includes endpoints for order management, checkout with split payment,
 * voucher validation, split bill, and merge bills.
 * 
 * @module modules/restaurant/routes/order.routes
 */

const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticate, authenticateSSE } = require('../../../middlewares/authMiddleware');
const { authorize, authorizeAny } = require('../../../middlewares/permissionMiddleware');
const { requireModule } = require('../../../middlewares/featureGateMiddleware');

// ===== PUBLIC ROUTES (no auth required) =====

/**
 * @route GET /api/v1/restaurant/orders/queue/display
 * @desc Public SSE endpoint for customer-facing queue display
 * @query {String} tenantId - Tenant ID (required)
 * @query {String} [locationId] - Filter by location
 * @access Public - no authentication required
 * @description For customer-facing displays showing queue status.
 *              Returns limited data (queue numbers only, no sensitive info).
 * @example new EventSource('/api/v1/restaurant/orders/queue/display?tenantId=xxx&locationId=yyy')
 */
router.get('/queue/display',
  orderController.streamQueueDisplay
);

// ===== SSE ROUTES (before global middleware - uses query param token) =====

/**
 * @route GET /api/v1/restaurant/orders/queue/stream
 * @desc SSE endpoint for real-time queue updates (for staff)
 * @query {String} token - JWT token for authentication
 * @query {String} [locationId] - Filter by location
 * @access Private - requires valid JWT token
 * @description Client connects once and receives updates via Server-Sent Events.
 *              Use token query param since EventSource can't set headers.
 * @example new EventSource('/api/v1/restaurant/orders/queue/stream?token=xxx&locationId=yyy')
 */
router.get('/queue/stream',
  authenticateSSE,
  requireModule('restaurant'),
  orderController.streamQueueList
);

/**
 * @route GET /api/v1/restaurant/orders/kitchen/stream
 * @desc SSE endpoint for real-time kitchen display updates (for staff)
 * @query {String} token - JWT token for authentication
 * @query {String} [locationId] - Filter by location
 * @access Private - requires valid JWT token
 * @example new EventSource('/api/v1/restaurant/orders/kitchen/stream?token=xxx&locationId=yyy')
 */
router.get('/kitchen/stream',
  authenticateSSE,
  requireModule('restaurant'),
  orderController.streamKitchenOrders
);
// ===== STANDARD ROUTES (with global middleware) =====

// All routes below require authentication and restaurant module access
router.use(authenticate);
router.use(requireModule('restaurant'));

/**
 * @route GET /api/v1/restaurant/orders
 * @desc Get all restaurant orders with filters
 * @access Private - requires 'read' permission on 'Transaction'
 * @access Private - requires 'read' permission on 'Transaction'
 */
router.get('/',
  authorize('read', 'Transaction'),
  orderController.getAllOrders
);

/**
 * @route GET /api/v1/restaurant/orders/kitchen
 * @desc Get kitchen display orders (confirmed/preparing)
 * @access Private - requires 'read' permission on 'Transaction'
 */
router.get('/kitchen',
  authorize('read', 'Transaction'),
  orderController.getKitchenOrders
);

/**
 * @route GET /api/v1/restaurant/orders/queue
 * @desc Get active queue list (for kitchen/counter staff)
 * @query {String} [locationId] - Filter by location
 * @query {String} [status] - Filter by status (paid, preparing, ready)
 * @access Private - requires 'read' permission on 'Transaction'
 */
router.get('/queue',
  authorize('read', 'Transaction'),
  orderController.getQueueList
);

/**
 * @route GET /api/v1/restaurant/orders/queue/stats
 * @desc Get SSE connection statistics (for monitoring)
 * @access Private - requires 'read' permission on 'Transaction'
 */
router.get('/queue/stats',
  authorize('read', 'Transaction'),
  orderController.getQueueStreamStats
);

/**
 * @route GET /api/v1/restaurant/orders/table/:tableId
 * @desc Get orders by table
 * @access Private - requires 'read' permission on 'Transaction'
 */
router.get('/table/:tableId',
  authorize('read', 'Transaction'),
  orderController.getOrdersByTable
);

/**
 * @route GET /api/v1/restaurant/orders/:id
 * @desc Get order by ID with full details
 * @access Private - requires 'read' permission on 'Transaction'
 */
router.get('/:id',
  authorize('read', 'Transaction'),
  orderController.getOrderById
);

/**
 * @route POST /api/v1/restaurant/orders
 * @desc Create new restaurant order
 * @access Private - requires 'create' permission on 'Transaction'
 */
router.post('/',
  authorize('create', 'Transaction'),
  orderController.createOrder
);

/**
 * @route POST /api/v1/restaurant/orders/direct
 * @desc Create direct order with immediate payment (quick sale)
 * @access Private - requires 'create' permission on 'Transaction'
 * @body {Array} items - Array of { productId, quantity, notes }
 * @body {Array} payments - Array of { method, amount, reference }
 * @body {String} [voucherCode] - Optional voucher code
 * @body {String} [orderType=takeaway] - 'dine-in', 'takeaway', 'delivery'
 * @body {UUID} [tableId] - Required for dine-in
 * @body {UUID} [locationId] - Location ID
 * @body {String} [customerName] - Customer name
 * @body {String} [customerPhone] - Customer phone
 * @body {String} [deliveryAddress] - Required for delivery
 */
router.post('/direct',
  authorize('create', 'Transaction'),
  orderController.createDirectOrder
);

/**
 * @route POST /api/v1/restaurant/orders/validate-voucher
 * @desc Validate voucher and calculate discount
 * @access Private - requires 'read' permission on 'Voucher'
 * @body {String} code - Voucher code
 * @body {Number} amount - Order amount to calculate discount
 */
router.post('/validate-voucher',
  authorize('read', 'Voucher'),
  orderController.validateVoucher
);

/**
 * @route POST /api/v1/restaurant/orders/merge
 * @desc Merge multiple orders into one
 * @access Private - requires 'update' permission on 'Transaction'
 * @body {Array} orderIds - Array of order IDs to merge
 */
router.post('/merge',
  authorize('update', 'Transaction'),
  orderController.mergeBills
);

/**
 * @route PATCH /api/v1/restaurant/orders/:id/status
 * @desc Update order status
 * @access Private - requires 'update' permission on 'Transaction'
 */
router.put('/:id/status',
  authorize('update', 'Transaction'),
  orderController.updateOrderStatus
);

/**
 * @route POST /api/v1/restaurant/orders/:id/transfer-items
 * @desc Transfer specific items (full or partial qty) from this order to the active order
 *       on the target table. If the target table has no active order, a new one is created.
 * @access Private - requires 'update' permission on 'Transaction'
 * @body {Array}  items         - [{ orderItemId: UUID, quantity: Number }]
 * @body {UUID}   targetTableId - Destination table ID
 */
router.post('/:id/transfer-items',
  authorize('update', 'Transaction'),
  orderController.transferItems
);

/**
 * @route PUT /api/v1/restaurant/orders/:id/move-table
 * @desc Move order to a different table
 * @access Private - requires 'update' permission on 'Transaction'
 * @body {UUID} newTableId - Target table ID to move the order to
 */
router.put('/:id/move-table',
  authorize('update', 'Transaction'),
  orderController.moveTable
);

/**
 * @route POST /api/v1/restaurant/orders/:id/items
 * @desc Add items to existing order
 * @access Private - requires 'create' or 'update' permission on 'Transaction'
 */
router.post('/:id/items',
  authorizeAny(['create', 'update'], 'Transaction'),
  orderController.addOrderItems
);

/**
 * @route GET /api/v1/restaurant/orders/:orderId/items/grouped
 * @desc Get order items grouped by status (for kitchen view)
 * @access Private - requires 'read' permission on 'Transaction'
 */
router.get('/:orderId/items/grouped',
  authorize('read', 'Transaction'),
  orderController.getItemsGroupedByStatus
);

/**
 * @route PUT /api/v1/restaurant/orders/:orderId/items/:itemId/status
 * @desc Update individual item status (pending, preparing, ready, served)
 * @access Private - requires 'update' permission on 'Transaction'
 * @body {String} status - New status (pending, preparing, ready, served, cancelled)
 */
router.put('/:orderId/items/:itemId/status',
  authorize('update', 'Transaction'),
  orderController.updateItemStatus
);

/**
 * @route POST /api/v1/restaurant/orders/:id/complete
 * @desc Complete order with payments (checkout)
 * @access Private - requires 'update' permission on 'Transaction'
 * @body {Array} payments - Array of { method, amount, reference }
 * @body {String} [voucherCode] - Optional voucher code
 * @body {String} [customerName] - Customer name
 * @body {String} [customerPhone] - Customer phone
 * @body {String} [notes] - Additional notes
 */
router.post('/:id/complete',
  authorize('update', 'Transaction'),
  orderController.completeOrder
);

/**
 * @route POST /api/v1/restaurant/orders/:id/split
 * @desc Split order into multiple bills
 * @access Private - requires 'update' permission on 'Transaction'
 * @body {String} [splitType=by_items] - 'equal' or 'by_items'
 * @body {Number|Array} splits - Number for equal split, or Array of { itemIds, customerName } for by_items
 */
router.post('/:id/split',
  authorize('update', 'Transaction'),
  orderController.splitBill
);

/**
 * @route GET /api/v1/restaurant/orders/:id/splits
 * @desc Get split child orders of a parent order
 * @access Private - requires 'read' permission on 'Transaction'
 */
router.get('/:id/splits',
  authorize('read', 'Transaction'),
  orderController.getSplitOrders
);

/**
 * @route POST /api/v1/restaurant/orders/:id/print
 * @desc Print receipt or kitchen ticket for order
 * @access Private - requires 'read' permission on 'Transaction'
 * @query {String} [type=receipt] - 'receipt' or 'kitchen'
 */
router.post('/:id/print',
  authorize('read', 'Transaction'),
  orderController.printReceipt
);

/**
 * @route POST /api/v1/restaurant/orders/drawer/open
 * @desc Open cash drawer
 * @access Private - requires 'update' permission on 'Transaction'
 */
router.post('/drawer/open',
  authorize('update', 'Transaction'),
  orderController.openDrawer
);

// ===== QUEUE MANAGEMENT ROUTES =====

/**
 * @route PUT /api/v1/restaurant/orders/queue/:id/status
 * @desc Update queue order status (paid -> preparing -> ready -> completed)
 * @body {String} status - New status (preparing, ready, completed)
 * @access Private - requires 'update' permission on 'Transaction'
 */
router.put('/queue/:id/status',
  authorize('update', 'Transaction'),
  orderController.updateQueueStatus
);

/**
 * @route POST /api/v1/restaurant/orders/queue/:id/call
 * @desc Call queue number for pickup (marks queueCalledAt)
 * @access Private - requires 'update' permission on 'Transaction'
 */
router.post('/queue/:id/call',
  authorize('update', 'Transaction'),
  orderController.callQueueNumber
);

module.exports = router;
