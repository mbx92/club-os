/**
 * Cleanup Old Transactions Script
 * 
 * Menghapus transaksi, shift, dan reset table stuck.
 * 
 * Usage:
 *   node scripts/cleanup-old-transactions.js                    # Dry-run (preview)
 *   node scripts/cleanup-old-transactions.js --execute           # Execute deletion
 *   node scripts/cleanup-old-transactions.js --date 2026-02-20   # Custom cutoff date
 *   node scripts/cleanup-old-transactions.js --tenant <tenantId> # Specific tenant only
 *   node scripts/cleanup-old-transactions.js --txn ORD-202602-0018,TRX-202602-0007  # Hapus transaksi spesifik
 */

require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` });
const { sequelize, Transaction, TransactionItem, TransactionPayment, 
        CashFlow, Income, Payment, VoucherUsage, MembershipPayment, 
        CashRegisterSession, RestaurantTable } = require('../src/models');
const { Op } = require('sequelize');

const args = process.argv.slice(2);
const isDryRun = !args.includes('--execute');
const dateArgIdx = args.indexOf('--date');
const cutoffDate = dateArgIdx !== -1 ? args[dateArgIdx + 1] : '2026-02-21';
const tenantArgIdx = args.indexOf('--tenant');
const tenantFilter = tenantArgIdx !== -1 ? args[tenantArgIdx + 1] : null;
const txnArgIdx = args.indexOf('--txn');
const specificTxns = txnArgIdx !== -1 ? args[txnArgIdx + 1].split(',').map(s => s.trim()) : [];

async function deleteTransactions(transactionIds, label) {
  if (transactionIds.length === 0) return;

  if (!isDryRun) {
    const t = await sequelize.transaction();
    try {
      const batchSize = 500;
      for (let i = 0; i < transactionIds.length; i += batchSize) {
        const batch = transactionIds.slice(i, i + batchSize);
        const batchWhere = { transactionId: { [Op.in]: batch } };

        await Promise.all([
          TransactionItem.destroy({ where: batchWhere, force: true, transaction: t }),
          TransactionPayment.destroy({ where: batchWhere, force: true, transaction: t }),
          CashFlow ? CashFlow.destroy({ where: batchWhere, force: true, transaction: t }).catch(() => 0) : 0,
          Income ? Income.destroy({ where: batchWhere, force: true, transaction: t }).catch(() => 0) : 0,
          Payment ? Payment.destroy({ where: batchWhere, force: true, transaction: t }).catch(() => 0) : 0,
          VoucherUsage ? VoucherUsage.destroy({ where: batchWhere, force: true, transaction: t }).catch(() => 0) : 0,
        ]);
        console.log(`  Batch ${Math.floor(i/batchSize) + 1}: child records deleted`);
      }

      // Clear splitFromId references (self-referencing FK)
      await Transaction.update(
        { splitFromId: null },
        { where: { splitFromId: { [Op.in]: transactionIds } }, transaction: t, paranoid: false }
      );

      // Delete transactions
      for (let i = 0; i < transactionIds.length; i += batchSize) {
        const batch = transactionIds.slice(i, i + batchSize);
        await Transaction.destroy({ where: { id: { [Op.in]: batch } }, force: true, transaction: t });
        console.log(`  Batch ${Math.floor(i/batchSize) + 1}: ${batch.length} transactions deleted`);
      }

      await t.commit();
      console.log(`\n✅ ${label}: ${transactionIds.length} transaksi dihapus.`);
    } catch (err) {
      await t.rollback();
      console.error(`\n❌ Error saat menghapus (${label}), rollback:`, err.message);
      throw err;
    }
  }
}

async function showTransactionSummary(transactions) {
  const statusSummary = {};
  transactions.forEach(t => { statusSummary[t.status] = (statusSummary[t.status] || 0) + 1; });
  
  console.log('\nRincian per status:');
  Object.entries(statusSummary).forEach(([status, count]) => console.log(`  ${status}: ${count}`));

  console.log(`\nDaftar transaksi (max 30):`);
  transactions.slice(0, 30).forEach(t => {
    console.log(`  ${t.transactionNumber} | ${t.transactionDate.toISOString().slice(0,16)} | ${t.status} | Rp ${t.totalAmount?.toLocaleString() || 0}`);
  });
  if (transactions.length > 30) console.log(`  ... dan ${transactions.length - 30} lainnya`);

  const transactionIds = transactions.map(t => t.id);
  const [itemCount, paymentCount, cashflowCount, incomeCount, paymentModelCount, voucherUsageCount] = await Promise.all([
    TransactionItem.count({ where: { transactionId: { [Op.in]: transactionIds } }, paranoid: false }),
    TransactionPayment.count({ where: { transactionId: { [Op.in]: transactionIds } }, paranoid: false }),
    CashFlow ? CashFlow.count({ where: { transactionId: { [Op.in]: transactionIds } }, paranoid: false }).catch(() => 0) : 0,
    Income ? Income.count({ where: { transactionId: { [Op.in]: transactionIds } }, paranoid: false }).catch(() => 0) : 0,
    Payment ? Payment.count({ where: { transactionId: { [Op.in]: transactionIds } }, paranoid: false }).catch(() => 0) : 0,
    VoucherUsage ? VoucherUsage.count({ where: { transactionId: { [Op.in]: transactionIds } }, paranoid: false }).catch(() => 0) : 0,
  ]);

  console.log(`\nData terkait yang akan dihapus:`);
  console.log(`  TransactionItems: ${itemCount}`);
  console.log(`  TransactionPayments: ${paymentCount}`);
  console.log(`  CashFlows: ${cashflowCount}`);
  console.log(`  Incomes: ${incomeCount}`);
  console.log(`  Payments: ${paymentModelCount}`);
  console.log(`  VoucherUsages: ${voucherUsageCount}`);
}

async function main() {
  try {
    console.log('='.repeat(60));
    console.log('🧹 CLEANUP OLD TRANSACTIONS & SHIFTS');
    console.log('='.repeat(60));
    console.log(`Mode: ${isDryRun ? '🔍 DRY-RUN (preview only)' : '⚠️  EXECUTE (will delete!)'}`);
    console.log(`Cutoff date: ${cutoffDate} (hapus data SEBELUM tanggal ini)`);
    if (tenantFilter) console.log(`Tenant filter: ${tenantFilter}`);
    if (specificTxns.length > 0) console.log(`Specific transactions: ${specificTxns.join(', ')}`);
    console.log('');

    // ═══════════════════════════════════════════════════════
    // 1. TRANSACTIONS BY DATE
    // ═══════════════════════════════════════════════════════
    const whereClause = {
      transactionDate: { [Op.lt]: new Date(cutoffDate + 'T00:00:00') }
    };
    if (tenantFilter) whereClause.tenantId = tenantFilter;

    const transactions = await Transaction.findAll({
      where: whereClause,
      attributes: ['id', 'transactionNumber', 'transactionDate', 'status', 'totalAmount', 'tenantId', 'tableId'],
      order: [['transactionDate', 'ASC']],
      paranoid: false
    });

    console.log(`📋 Transaksi sebelum ${cutoffDate}: ${transactions.length}`);
    
    if (transactions.length > 0) {
      await showTransactionSummary(transactions);
      if (!isDryRun) {
        console.log('\n⚠️  MENGHAPUS TRANSAKSI (by date)...\n');
        await deleteTransactions(transactions.map(t => t.id), 'By date');
      }
    } else {
      console.log('✅ Tidak ada transaksi sebelum cutoff date.');
    }

    // ═══════════════════════════════════════════════════════
    // 2. SPECIFIC TRANSACTIONS (--txn)
    // ═══════════════════════════════════════════════════════
    if (specificTxns.length > 0) {
      console.log('\n' + '='.repeat(60));
      console.log('📌 SPECIFIC TRANSACTIONS');
      console.log('='.repeat(60));

      const specWhere = { transactionNumber: { [Op.in]: specificTxns } };
      if (tenantFilter) specWhere.tenantId = tenantFilter;

      const specTransactions = await Transaction.findAll({
        where: specWhere,
        attributes: ['id', 'transactionNumber', 'transactionDate', 'status', 'totalAmount', 'tenantId', 'tableId'],
        order: [['transactionDate', 'ASC']],
        paranoid: false
      });

      console.log(`\nDitemukan: ${specTransactions.length} dari ${specificTxns.length} yang diminta`);
      
      if (specTransactions.length > 0) {
        await showTransactionSummary(specTransactions);
        if (!isDryRun) {
          console.log('\n⚠️  MENGHAPUS TRANSAKSI (specific)...\n');
          await deleteTransactions(specTransactions.map(t => t.id), 'Specific');
        }
      }

      // Report not found
      const foundNumbers = specTransactions.map(t => t.transactionNumber);
      const notFound = specificTxns.filter(n => !foundNumbers.includes(n));
      if (notFound.length > 0) {
        console.log(`\n⚠️  Tidak ditemukan: ${notFound.join(', ')}`);
      }
    }

    // ═══════════════════════════════════════════════════════
    // 3. SHIFTS (CashRegisterSession)
    // ═══════════════════════════════════════════════════════
    console.log('\n' + '='.repeat(60));
    console.log('📅 SHIFTS (CashRegisterSession)');
    console.log('='.repeat(60));

    const shiftWhere = { shiftDate: { [Op.lt]: cutoffDate } };
    if (tenantFilter) shiftWhere.tenantId = tenantFilter;

    const shifts = await CashRegisterSession.findAll({
      where: shiftWhere,
      attributes: ['id', 'shiftDate', 'status', 'openedAt', 'closedAt', 'tenantId'],
      order: [['shiftDate', 'ASC']],
      paranoid: false
    });

    console.log(`\nShift sebelum ${cutoffDate}: ${shifts.length}`);
    if (shifts.length > 0) {
      shifts.forEach(s => {
        console.log(`  ${s.shiftDate} | ${s.status} | opened: ${s.openedAt?.toISOString().slice(11,16) || '-'} | closed: ${s.closedAt?.toISOString().slice(11,16) || '-'}`);
      });

      if (!isDryRun) {
        console.log('\n⚠️  MENGHAPUS SHIFTS...');
        const deleted = await CashRegisterSession.destroy({
          where: shiftWhere,
          force: true
        });
        console.log(`✅ ${deleted} shift dihapus.`);
      }
    } else {
      console.log('✅ Tidak ada shift sebelum cutoff date.');
    }

    // ═══════════════════════════════════════════════════════
    // 4. STUCK TABLES
    // ═══════════════════════════════════════════════════════
    console.log('\n' + '='.repeat(60));
    console.log('🪑 CHECK STUCK TABLES');
    console.log('='.repeat(60));

    const tableWhere = { status: 'occupied' };
    if (tenantFilter) tableWhere.tenantId = tenantFilter;

    const occupiedTables = await RestaurantTable.findAll({
      where: tableWhere,
      attributes: ['id', 'tenantId', 'tableNumber', 'tableName', 'status', 'currentOrderId', 'occupiedAt']
    });

    console.log(`\nTable occupied: ${occupiedTables.length}`);

    const stuckTables = [];
    for (const table of occupiedTables) {
      if (!table.currentOrderId) {
        stuckTables.push({ table, reason: 'currentOrderId is null' });
        continue;
      }

      const currentOrder = await Transaction.findByPk(table.currentOrderId, {
        attributes: ['id', 'transactionNumber', 'status'],
        paranoid: false
      });

      if (!currentOrder) {
        stuckTables.push({ table, reason: `order ${table.currentOrderId.slice(0,8)}... not found (deleted)` });
      } else if (['completed', 'cancelled', 'paid', 'split', 'merged', 'refunded'].includes(currentOrder.status)) {
        stuckTables.push({ table, reason: `order ${currentOrder.transactionNumber} status: ${currentOrder.status}` });
      }
    }

    // Also check: transactions with status split/merged still holding a tableId
    const splitHoldingTable = await Transaction.findAll({
      where: {
        status: { [Op.in]: ['split', 'merged'] },
        tableId: { [Op.ne]: null },
        ...(tenantFilter ? { tenantId: tenantFilter } : {})
      },
      attributes: ['id', 'transactionNumber', 'status', 'tableId'],
      paranoid: false
    });

    if (splitHoldingTable.length > 0) {
      console.log(`\n⚠️  Split/merged orders masih holding tableId: ${splitHoldingTable.length}`);
      splitHoldingTable.forEach(t => {
        console.log(`  ${t.transactionNumber} (${t.status}) → tableId: ${t.tableId.slice(0,8)}...`);
      });

      if (!isDryRun) {
        console.log('  Clearing tableId...');
        await Transaction.update(
          { tableId: null },
          { where: { id: { [Op.in]: splitHoldingTable.map(t => t.id) } }, paranoid: false }
        );
        console.log('  ✅ tableId cleared on split/merged orders.');
      }
    }

    if (stuckTables.length === 0) {
      console.log('✅ Tidak ada table stuck.');
    } else {
      console.log(`\n⚠️  Table stuck: ${stuckTables.length}`);
      stuckTables.forEach(({ table, reason }) => {
        console.log(`  Table ${table.tableNumber} (${table.tableName || '-'}) — ${reason}`);
      });

      if (!isDryRun) {
        console.log('\nMereset table stuck...');
        for (const { table, reason } of stuckTables) {
          await table.update({
            status: 'available',
            currentOrderId: null,
            occupiedAt: null,
            occupiedBy: null
          });
          console.log(`  ✅ Table ${table.tableNumber} → available`);
        }
      }
    }

    // ═══════════════════════════════════════════════════════
    console.log('\n' + '='.repeat(60));
    if (isDryRun) {
      console.log('ℹ️  Ini DRY-RUN. Untuk eksekusi, jalankan:');
      console.log('   node scripts/cleanup-old-transactions.js --execute');
      if (specificTxns.length > 0) {
        console.log(`   node scripts/cleanup-old-transactions.js --execute --txn ${specificTxns.join(',')}`);
      }
    } else {
      console.log('✅ CLEANUP SELESAI');
    }
    console.log('='.repeat(60));

  } catch (err) {
    console.error('Fatal error:', err);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

main();
