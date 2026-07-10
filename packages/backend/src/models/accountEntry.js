'use strict';

const { Model } = require('sequelize');

/**
 * AccountEntry — a single immutable ledger line for an Account.
 *
 * Conventions:
 *  - 'amount' is always positive. Direction is encoded in 'type'.
 *  - Inflow types  (increase balance): opening, inflow, transfer_in, settlement, adjustment_credit
 *  - Outflow types (decrease balance): outflow, transfer_out, adjustment_debit
 *
 * Every entry captures balanceBefore and balanceAfter so the ledger is
 * self-auditable and does not depend on ordering for correctness.
 *
 * Pending settlement:
 *  status = 'pending_settlement' + settlementDate set for T+N entries.
 *  A nightly job (or on-demand trigger) flips them to 'completed' and
 *  updates Account.balance once settlementDate <= today.
 */

module.exports = (sequelize, DataTypes) => {
  class AccountEntry extends Model {
    static associate(models) {
      AccountEntry.belongsTo(models.Account, { foreignKey: 'accountId', as: 'account' });
      AccountEntry.belongsTo(models.Tenant, { foreignKey: 'tenantId', as: 'tenant' });
      AccountEntry.belongsTo(models.User, { foreignKey: 'performedBy', as: 'performer' });
    }
  }

  AccountEntry.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tenantId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'Tenants', key: 'id' },
    },
    accountId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'Accounts', key: 'id' },
    },
    entryNumber: {
      type: DataTypes.STRING(30),
      allowNull: true,
      comment: 'Human-readable reference, e.g. ACE-202607-0001',
    },
    type: {
      type: DataTypes.ENUM(
        'opening',
        'inflow',
        'outflow',
        'transfer_in',
        'transfer_out',
        'settlement',
        'adjustment_credit',
        'adjustment_debit'
      ),
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      comment: 'Always positive. Direction determined by type.',
    },
    balanceBefore: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    balanceAfter: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    referenceType: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Source model name: TransactionPayment, Expense, Income, AccountTransfer, Manual',
    },
    referenceId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'PK of the source record.',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    entryDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Calendar date (tenant timezone) the entry belongs to.',
    },
    settlementDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'For T+N entries: the date the balance will actually be credited.',
    },
    status: {
      type: DataTypes.ENUM('completed', 'pending_settlement'),
      allowNull: false,
      defaultValue: 'completed',
    },
    performedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'Users', key: 'id' },
    },
  }, {
    sequelize,
    modelName: 'AccountEntry',
    tableName: 'AccountEntries',
    timestamps: true,
    // Entries are never deleted; use adjustment_credit/debit to correct errors
    paranoid: false,
    indexes: [
      { fields: ['accountId'] },
      { fields: ['tenantId'] },
      { fields: ['tenantId', 'entryDate'] },
      { fields: ['referenceType', 'referenceId'] },
      { fields: ['status', 'settlementDate'] },
      { fields: ['entryNumber'] },
    ],
  });

  return AccountEntry;
};
