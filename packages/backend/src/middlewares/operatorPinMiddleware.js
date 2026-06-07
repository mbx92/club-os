'use strict';

const { verifyOperatorToken } = require('../utils/jwt');

const PERMISSION_LABELS = {
  discount: 'Diskon / Voucher',
  void: 'Void / Cancel Transaksi',
  refund: 'Refund',
  openShift: 'Buka Shift',
  closeShift: 'Tutup Shift',
  settings: 'Menu Settings',
  financialReport: 'Laporan Keuangan'
};

/**
 * Middleware untuk melindungi endpoint yang butuh otorisasi operator PIN.
 *
 * Cara pakai di route:
 *   router.post('/apply-voucher', authenticate, requireOperatorPermission('discount'), controller.fn);
 *
 * Frontend harus kirim:
 *   Header: X-Operator-Token: <operatorToken>
 *
 * Jika token tidak ada / kadaluarsa / tidak punya permission:
 *   Response 403 { requireOperatorPin: true, permission }
 *   → Frontend tampilkan PIN modal, lalu retry dengan token baru
 *
 * @param {string|null} permission - key permission (misal 'void'). Null = hanya cek token valid.
 */
const requireOperatorPermission = (permission = null) => (req, res, next) => {
  const token = req.headers['x-operator-token'];

  if (!token) {
    return res.status(403).json({
      message: permission
        ? `Aksi ini memerlukan otorisasi operator: ${PERMISSION_LABELS[permission] || permission}`
        : 'Aksi ini memerlukan login operator',
      requireOperatorPin: true,
      permission
    });
  }

  try {
    const payload = verifyOperatorToken(token);

    // Pastikan operator dari tenant yang sama
    if (req.user && payload.tenantId !== req.user.tenantId) {
      return res.status(403).json({
        message: 'Operator token tidak valid untuk tenant ini',
        requireOperatorPin: true,
        permission
      });
    }

    // Cek permission spesifik jika diminta
    if (permission && !payload.permissions?.[permission]) {
      return res.status(403).json({
        message: `Operator tidak memiliki izin: ${PERMISSION_LABELS[permission] || permission}`,
        requireOperatorPin: true,
        permission,
        operatorName: payload.name
      });
    }

    // Suntikkan info operator ke request
    req.operator = {
      id: payload.operatorId,
      name: payload.name,
      tenantId: payload.tenantId,
      permissions: payload.permissions
    };

    next();
  } catch (err) {
    const isExpired = err.name === 'TokenExpiredError';
    return res.status(401).json({
      message: isExpired
        ? 'Sesi operator sudah berakhir, silakan PIN ulang'
        : 'Operator token tidak valid',
      requireOperatorPin: true,
      permission,
      expired: isExpired
    });
  }
};

module.exports = { requireOperatorPermission };
