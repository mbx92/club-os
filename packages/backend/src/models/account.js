'use strict';

const { Model } = require('sequelize');

/**
 * Account — financial account that mirrors a real-world bank account,
 * e-wallet, or petty cash fund.
 *
 * Cash flow (tunai) — two separate compartments:
 *   1. CashRegisterSession (cash drawer) — holds POS cash during the shift
 *   2. Account type=cash (akun tunai) — finance ledger for settled cash
 *
 * POS cash payments NEVER auto-credit Account. Settlement happens when
 * cash is collected from the drawer and deposited to the cash Account
 * (via vault collect → creditFromCashCollect).
 *
 * Other types:
 *   - bank     : Transfer BCA, QRIS BCA, Debit Mandiri, etc.
 *   - e_wallet : GoPay, OVO, DANA (standalone, not bank-linked)
 *   - payment_gateway : Midtrans, Stripe virtual wallets
 *   - petty_cash : replaces the separate Petty Cash model for new funds
 *   - main_vault : Brankas Utama — physical safe; funded via transfer from Tunai
 *   - custom   : anything else the tenant needs
 *
 * Auto-match key: (tenantId, paymentMethod, bankName) must be unique
 * so the system can automatically credit/debit the right account when
 * a TransactionPayment is completed.
 *
 * Settlement: non-cash payments may not arrive on the same day (e.g.
 * QRIS typically settles T+1). settlementDays = 0 means record
 * immediately; > 0 means create a 'pending_settlement' entry that
 * matures after N days. Cash settlement is the drawer→akun tunai collect.
 */

module.exports = (sequelize, DataTypes) => {
  class Account extends Model {
    static associate(models) {
      Account.belongsTo(models.Tenant, { foreignKey: 'tenantId', as: 'tenant' });
      Account.belongsTo(models.Location, { foreignKey: 'locationId', as: 'location' });
      Account.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
      Account.hasMany(models.AccountEntry, { foreignKey: 'accountId', as: 'entries' });
    }
  }

  Account.init({
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
    locationId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'Locations', key: 'id' },
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Display name, e.g. "QRIS BCA", "Transfer BNI", "Modal Harian"',
    },
    type: {
      type: DataTypes.ENUM('cash', 'bank', 'e_wallet', 'payment_gateway', 'petty_cash', 'main_vault', 'custom'),
      allowNull: false,
      defaultValue: 'bank',
      comment: 'Broad account category',
    },
    paymentMethod: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Matches TransactionPayment.paymentMethod key, e.g. qris, bank_transfer, e_wallet',
    },
    bankName: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Bank or provider name, e.g. BCA, MANDIRI, GoPay. Null = catch-all for this paymentMethod.',
    },
    openingBalance: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Real-world balance at openingDate, set manually by the tenant owner.',
    },
    openingDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Cut-off date. AccountEntries are only created for transactions on or after this date.',
    },
    balance: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Running balance = openingBalance + sum(all AccountEntry net amounts).',
    },
    settlementDays: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '0 = credit immediately; 1 = T+1 settlement; etc.',
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'IDR',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    pettyCashId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Reference to legacy PettyCash record if this account was migrated from petty cash.',
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'Users', key: 'id' },
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Optimistic locking counter.',
    },
  }, {
    sequelize,
    modelName: 'Account',
    tableName: 'Accounts',
    timestamps: true,
    paranoid: true,
    indexes: [
      { fields: ['tenantId'] },
      { fields: ['tenantId', 'isActive'] },
      { fields: ['tenantId', 'bankName'] },
      // Partial unique indexes are created in migration:
      // accounts_tenant_bank_unique, accounts_tenant_method_unique
    ],
    hooks: {
      beforeUpdate(account) {
        account.version += 1;
      },
    },
  });

  return Account;
};
