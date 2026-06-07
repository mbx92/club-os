const db = require('../src/models');
(async () => {
  const orders = await db.Transaction.findAll({
    where: { tableId: 'a913cf4b-5788-44c9-97c4-a0fc5bab8137' },
    attributes: ['id', 'transactionNumber', 'status', 'splitFromId', 'totalAmount', 'paidAmount', 'completedAt', 'createdAt'],
    order: [['createdAt', 'ASC']],
    raw: true,
    paranoid: false
  });

  console.log('Orders for table a913cf4b:\n');
  console.log('TransactionNumber       | Status      | SplitFrom                            | Total       | Paid        | CompletedAt');
  console.log('-'.repeat(140));
  orders.forEach(o => {
    console.log(
      `${(o.transactionNumber || '').padEnd(24)}| ${(o.status || '').padEnd(12)}| ${(o.splitFromId || '-').padEnd(37)}| ${String(o.totalAmount).padEnd(12)}| ${String(o.paidAmount).padEnd(12)}| ${o.completedAt || 'null'}`
    );
  });

  // Also check table status
  const table = await db.RestaurantTable.findByPk('a913cf4b-5788-44c9-97c4-a0fc5bab8137', { raw: true });
  console.log('\nTable status:', table?.status, '| currentOrderId:', table?.currentOrderId || 'null');

  process.exit();
})();
