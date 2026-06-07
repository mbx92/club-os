const db = require('../src/models');
(async () => {
  // Find the split parent
  const parent = await db.Transaction.findOne({
    where: { transactionNumber: 'ORD-202602-0033' },
    attributes: ['id', 'transactionNumber', 'status', 'tableId'],
    raw: true
  });
  console.log('Parent:', parent.id, '| table:', parent.tableId);

  // Find children by splitFromId
  const children = await db.Transaction.findAll({
    where: { splitFromId: parent.id },
    attributes: ['id', 'transactionNumber', 'status', 'tableId', 'splitFromId', 'totalAmount', 'paidAmount', 'completedAt'],
    raw: true
  });

  if (children.length === 0) {
    // Maybe old split without splitFromId - search by notes
    console.log('\nNo children found via splitFromId. Searching by notes...');
    const byNotes = await db.Transaction.findAll({
      where: { 
        [db.Sequelize.Op.or]: [
          { notes: { [db.Sequelize.Op.iLike]: '%ORD-202602-0033%' } },
          { notes: { [db.Sequelize.Op.iLike]: '%split%0033%' } }
        ]
      },
      attributes: ['id', 'transactionNumber', 'status', 'tableId', 'splitFromId', 'totalAmount', 'paidAmount', 'notes'],
      raw: true
    });
    console.log('Found by notes:', byNotes.length);
    byNotes.forEach(o => console.log(o.transactionNumber, '|', o.status, '| table:', o.tableId, '| splitFrom:', o.splitFromId || '-', '| notes:', (o.notes || '').substring(0, 80)));
  } else {
    console.log(`\nSplit children (${children.length}):`);
    children.forEach(o => console.log(o.transactionNumber, '|', o.status, '| table:', o.tableId, '| total:', o.totalAmount, '| paid:', o.paidAmount, '| completed:', o.completedAt || 'null'));
  }

  // Also check currentOrderId  
  const currentOrder = await db.Transaction.findByPk('8c65bb79-b9c2-4c03-b5e8-5498af0b0936', {
    attributes: ['id', 'transactionNumber', 'status', 'tableId'],
    raw: true
  });
  console.log('\nTable currentOrderId order:', currentOrder?.transactionNumber, '|', currentOrder?.status, '| table:', currentOrder?.tableId);

  process.exit();
})();
