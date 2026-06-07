'use strict';

const { Operator } = require('../../../models');
const { generateOperatorToken } = require('../../../utils/jwt');
const logger = require('../../../utils/logger');

const VALID_PERMISSIONS = ['discount', 'void', 'refund', 'openShift', 'closeShift', 'settings', 'financialReport'];

/**
 * GET /auth/operator/list
 * Daftar operator aktif di tenant (untuk dropdown PIN modal di frontend)
 */
async function listOperators(req, res, next) {
  try {
    const tenantId = req.user.tenantId;
    const operators = await Operator.findAll({
      where: { tenantId, isActive: true },
      attributes: ['id', 'name', 'notes', 'permissions'],
      order: [['name', 'ASC']]
    });
    res.json({ operators });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /auth/operator/verify
 * Verifikasi PIN. PIN dicocokkan ke semua operator aktif tenant.
 * Body: { pin: "1234" }
 */
async function verifyOperatorPin(req, res, next) {
  try {
    const { pin } = req.body;
    if (!pin || String(pin).length < 4) {
      return res.status(400).json({ message: 'PIN minimal 4 digit' });
    }
    const tenantId = req.user.tenantId;
    const operators = await Operator.findAll({
      where: { tenantId, isActive: true },
      attributes: ['id', 'name', 'pin', 'permissions']
    });
    if (operators.length === 0) {
      return res.status(404).json({ message: 'Belum ada operator yang terdaftar. Hubungi admin.' });
    }
    let matched = null;
    for (const op of operators) {
      if (await op.validatePin(pin)) { matched = op; break; }
    }
    if (!matched) {
      logger.warn(`[OperatorPin] PIN salah, tenant=${tenantId}, ip=${req.ip}`);
      return res.status(401).json({ message: 'PIN salah' });
    }
    const operatorToken = generateOperatorToken({
      operatorId: matched.id,
      tenantId,
      name: matched.name,
      permissions: matched.permissions || {}
    });
    logger.info(`[OperatorPin] Login: ${matched.name}, tenant=${tenantId}`);
    res.json({
      success: true,
      operatorToken,
      expiresIn: '8h',
      operator: { id: matched.id, name: matched.name, permissions: matched.permissions || {} }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /auth/operator/manage
 * Semua operator tenant (admin view, termasuk nonaktif)
 */
async function getAllOperators(req, res, next) {
  try {
    const operators = await Operator.findAll({
      where: { tenantId: req.user.tenantId },
      attributes: { exclude: ['pin'] },
      order: [['name', 'ASC']]
    });
    res.json({ operators });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /auth/operator/manage
 * Buat operator baru
 * Body: { name, pin, permissions, notes }
 */
async function createOperator(req, res, next) {
  try {
    const { name, pin, permissions = {}, notes } = req.body;
    const tenantId = req.user.tenantId;
    if (!name) return res.status(400).json({ message: 'Nama operator wajib diisi' });
    if (!pin || String(pin).length < 4 || String(pin).length > 6 || !/^\d+$/.test(String(pin))) {
      return res.status(400).json({ message: 'PIN harus 4-6 digit angka' });
    }
    const filteredPermissions = {};
    for (const key of VALID_PERMISSIONS) filteredPermissions[key] = Boolean(permissions[key]);
    const operator = await Operator.create({ tenantId, name: name.trim(), pin, permissions: filteredPermissions, notes: notes || null });
    logger.info(`[OperatorPin] Operator baru: ${operator.name}, tenant=${tenantId}`);
    res.status(201).json({
      success: true,
      operator: { id: operator.id, name: operator.name, isActive: operator.isActive, permissions: operator.permissions, notes: operator.notes }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /auth/operator/manage/:id
 * Update operator (nama, PIN, permissions, aktif)
 */
async function updateOperator(req, res, next) {
  try {
    const { id } = req.params;
    const { name, pin, permissions, notes, isActive } = req.body;
    const tenantId = req.user.tenantId;
    const operator = await Operator.findOne({ where: { id, tenantId } });
    if (!operator) return res.status(404).json({ message: 'Operator tidak ditemukan' });
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (isActive !== undefined) updateData.isActive = isActive;
    if (notes !== undefined) updateData.notes = notes;
    if (pin !== undefined) {
      if (String(pin).length < 4 || String(pin).length > 6 || !/^\d+$/.test(String(pin))) {
        return res.status(400).json({ message: 'PIN harus 4-6 digit angka' });
      }
      updateData.pin = pin;
    }
    if (permissions !== undefined) {
      const filtered = {};
      for (const key of VALID_PERMISSIONS) { if (key in permissions) filtered[key] = Boolean(permissions[key]); }
      updateData.permissions = { ...operator.permissions, ...filtered };
    }
    await operator.update(updateData);
    logger.info(`[OperatorPin] Update: ${operator.name}, tenant=${tenantId}`);
    res.json({ success: true, operator: { id: operator.id, name: operator.name, isActive: operator.isActive, permissions: operator.permissions, notes: operator.notes } });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /auth/operator/manage/:id
 * Nonaktifkan operator
 */
async function deleteOperator(req, res, next) {
  try {
    const { id } = req.params;
    const operator = await Operator.findOne({ where: { id, tenantId: req.user.tenantId } });
    if (!operator) return res.status(404).json({ message: 'Operator tidak ditemukan' });
    await operator.update({ isActive: false });
    logger.info(`[OperatorPin] Nonaktif: ${operator.name}`);
    res.json({ success: true, message: `Operator ${operator.name} dinonaktifkan` });
  } catch (err) {
    next(err);
  }
}

module.exports = { listOperators, verifyOperatorPin, getAllOperators, createOperator, updateOperator, deleteOperator };
