'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CashRegisterSession extends Model {
    static associate(models) {
      CashRegisterSession.belongsTo(models.Tenant, {
        foreignKey: 'tenantId',
        as: 'tenant',
      });
      CashRegisterSession.belongsTo(models.Location, {
        foreignKey: 'locationId',
        as: 'location',
      });
      CashRegisterSession.belongsTo(models.User, {
        foreignKey: 'openedById',
        as: 'openedBy',
      });
      CashRegisterSession.belongsTo(models.User, {
        foreignKey: 'closedById',
        as: 'closedBy',
      });
    }

    /** Hitung total cash inflow/outflow dari transaksi tunai + pengeluaran kas */
    async getCashSummary(t) {
      const { Transaction, TransactionPayment, Expense, PettyCashTransaction, PettyCash } = sequelize.models;
      const { Op } = require('sequelize');

      const timeWhere = {
        [Op.gte]: this.openedAt,
        ...(this.closedAt ? { [Op.lte]: this.closedAt } : {}),
      };
      const transactionLocationWhere = this.locationId ? { locationId: this.locationId } : {};
      const expenseLocationWhere = this.locationId
        ? { [Op.or]: [{ locationId: this.locationId }, { locationId: null }] }
        : {};
      const pettyCashLocationInclude = this.locationId
        ? [{
          model: PettyCash,
          as: 'pettyCash',
          where: {
            [Op.or]: [{ locationId: this.locationId }, { locationId: null }],
          },
          attributes: [],
          required: true,
        }]
        : [];

      // ── Cash payments from transactions ──────────────────────────────────
      const payments = await TransactionPayment.findAll({
        where: {
          paymentMethod: 'cash',
          status: 'completed',          // Only count completed payments (exclude failed/voided)
          createdAt: timeWhere,
        },
        include: [
          {
            model: Transaction,
            as: 'transaction',
            where: { tenantId: this.tenantId, ...transactionLocationWhere },
            required: true,
            // changeAmount is needed to net out cash kembalian from cashIn.
            // e.g. customer pays 100000, item costs 51 → changeAmount=99949 → net cashIn=51
            attributes: ['id', 'status', 'changeAmount', 'locationId'],
          },
        ],
        transaction: t,
      });

      // Exclude cancelled, refunded, and partially_refunded from cash inflow
      const EXCLUDED_STATUSES = ['cancelled', 'refunded', 'partially_refunded'];

      // Net cash in = tendered amount minus change returned to customer.
      // TransactionPayment.amount may store the full tendered cash (e.g. 100000 for a 51 sale).
      // We deduct Transaction.changeAmount so only the actual sale amount enters kas.
      const cashIn = payments
        .filter((p) => !EXCLUDED_STATUSES.includes(p.transaction.status))
        .reduce((sum, p) => {
          const tendered = parseFloat(p.amount || 0);
          const change = parseFloat(p.transaction.changeAmount || 0);
          return sum + Math.max(0, tendered - change);
        }, 0);

      const refundOut = payments
        .filter((p) => ['refunded', 'partially_refunded'].includes(p.transaction.status))
        .reduce((sum, p) => sum + Math.max(0, parseFloat(p.amount || 0) - parseFloat(p.transaction.changeAmount || 0)), 0);

      // ── Cash expenses (pengeluaran kas) ───────────────────────────────────
      const cashExpenses = await Expense.findAll({
        where: {
          tenantId: this.tenantId,
          paymentMethod: 'cash',
          status: { [Op.in]: ['approved', 'paid'] },
          createdAt: timeWhere,
          ...expenseLocationWhere,
        },
        attributes: ['totalAmount'],
        transaction: t,
      });

      const cashExpenseOut = cashExpenses
        .reduce((sum, e) => sum + parseFloat(e.totalAmount || 0), 0);

      // ── Petty cash sales returns (pengembalian modal dari hasil penjualan) ──
      const pettyCashReturns = await PettyCashTransaction.findAll({
        where: {
          tenantId: this.tenantId,
          type: 'sales_return',
          createdAt: timeWhere,
        },
        include: pettyCashLocationInclude,
        attributes: ['amount'],
        transaction: t,
      });
      const pettyCashReturnOut = pettyCashReturns
        .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

      const cashOut = refundOut + cashExpenseOut + pettyCashReturnOut;

      return {
        cashIn,
        cashOut,
        cashExpenseOut,
        pettyCashReturnOut,
        expectedCash: parseFloat(this.openingBalance) + cashIn - cashOut,
      };
    }
  }

  CashRegisterSession.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      tenantId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      locationId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      shiftName: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'e.g. "pagi", "siang", "malam"',
      },
      shiftDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      shiftNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: 'Shift sequence on the same date',
      },
      openingBalance: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
      },
      openedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      openedById: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      openingNotes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('open', 'closed'),
        allowNull: false,
        defaultValue: 'open',
      },
      closingBalance: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        comment: 'Calculated: opening + cash inflows - cash outflows',
      },
      actualCash: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
      },
      difference: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        comment: 'actualCash - closingBalance',
      },
      tipping: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        defaultValue: 0,
        comment: 'Manual tipping inputted during shift close',
      },
      closedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      closedById: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      closingNotes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'CashRegisterSession',
      tableName: 'CashRegisterSessions',
      timestamps: true,
      paranoid: true,
      indexes: [
        { fields: ['tenantId'] },
        { fields: ['tenantId', 'shiftDate'] },
        { fields: ['tenantId', 'status'] },
        { fields: ['locationId'] },
        { fields: ['openedById'] },
      ],
    }
  );

  return CashRegisterSession;
};
