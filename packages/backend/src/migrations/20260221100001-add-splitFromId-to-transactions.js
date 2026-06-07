'use strict';

/**
 * Migration: Add splitFromId to Transactions
 *
 * Tracks which original order a split bill was created from.
 * This enables:
 * - Proper reporting (exclude split children from double-counting)
 * - UI navigation from split order back to original
 * - Data integrity for split bill reconciliation
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Transactions', 'splitFromId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'Transactions',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'References the original order this was split from (null if not a split)',
    });

    // Index for fast lookup of split children
    await queryInterface.addIndex('Transactions', ['splitFromId'], {
      name: 'idx_transactions_split_from_id',
      where: { splitFromId: { [Sequelize.Op.ne]: null } },
    });

    console.log('✅ Added splitFromId column to Transactions');
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('Transactions', 'idx_transactions_split_from_id');
    await queryInterface.removeColumn('Transactions', 'splitFromId');
    console.log('✅ Removed splitFromId column from Transactions');
  },
};
