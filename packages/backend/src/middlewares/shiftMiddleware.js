'use strict';

/**
 * Shift Middleware
 *
 * Memvalidasi bahwa kasir sudah membuka shift sebelum melakukan transaksi.
 * Jika belum ada shift aktif, request di-reject dengan HTTP 403.
 *
 * Penggunaan:
 *   const { requireActiveShift } = require('../middlewares/shiftMiddleware');
 *   router.post('/transactions', authenticate, requireActiveShift(), transactionController.create);
 *
 * Opsi:
 *   requireActiveShift({ byLocation: true })
 *     → Jika request membawa locationId (body/query/params), hanya cek shift
 *       pada lokasi yang sama (null locationId dianggap "semua lokasi").
 */

const { CashRegisterSession } = require('../models');
const logger = require('../utils/logger');

/**
 * @param {object}  [options]
 * @param {boolean} [options.byLocation=false]
 *   Jika true, filter session berdasarkan locationId dari request.
 *   Session dengan locationId=null selalu dianggap mencakup semua lokasi.
 */
const requireActiveShift = (options = {}) => {
  const { byLocation = false } = options;

  return async (req, res, next) => {
    try {
      // Super admin tidak wajib buka shift
      if (req.user?.isSuperAdmin) return next();

      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Tidak terautentikasi' });
      }

      // Resolusi locationId: body > query > params
      const locationId =
        req.body?.locationId ||
        req.query?.locationId ||
        req.params?.locationId ||
        null;

      // Bangun kondisi WHERE
      const where = { tenantId, status: 'open', deletedAt: null };

      if (byLocation && locationId) {
        // Shift yang match: lokasi sama ATAU shift yang berlaku untuk semua lokasi (null)
        const { Op } = require('sequelize');
        where[Op.or] = [{ locationId }, { locationId: null }];
      }

      const activeSession = await CashRegisterSession.findOne({
        where,
        attributes: ['id', 'shiftName', 'openedAt', 'locationId'],
      });

      if (!activeSession) {
        logger.warn('requireActiveShift: transaksi ditolak — tidak ada shift aktif', {
          tenantId,
          userId: req.user?.id,
          path: req.originalUrl,
          method: req.method,
          locationId,
        });

        return res.status(403).json({
          success: false,
          code: 'NO_ACTIVE_SHIFT',
          message: 'Shift kasir belum dibuka. Harap buka shift terlebih dahulu sebelum melakukan transaksi.',
          hint: 'Buka shift melalui endpoint POST /api/v1/gym/cash-register/open',
        });
      }

      // Sematkan session aktif ke request supaya controller bisa memanfaatkannya
      req.activeShiftSession = activeSession;

      return next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = { requireActiveShift };
