require('dotenv').config({ path: '.env.development' });
const { Sequelize, QueryTypes } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
  }
);

async function main() {
  await sequelize.authenticate();

  // 1. Cari shift morning tanggal 26 Feb 2026
  const sessions = await sequelize.query(`
    SELECT id, "shiftName", "openedAt", "closedAt", "openedById", status
    FROM "CashRegisterSessions"
    WHERE DATE("openedAt" AT TIME ZONE 'Asia/Jakarta') = '2026-02-26'
      AND LOWER("shiftName") LIKE '%morning%'
    ORDER BY "openedAt"
  `, { type: QueryTypes.SELECT });

  console.log('\n=== CASH REGISTER SESSIONS (Morning, 26 Feb 2026) ===');
  if (sessions.length === 0) {
    console.log('Tidak ada sesi morning pada tanggal 26 Feb 2026');
    // Cari semua shift tanggal 26
    const allSessions = await sequelize.query(`
      SELECT id, "shiftName", "openedAt", "closedAt", status
      FROM "CashRegisterSessions"
      WHERE DATE("openedAt" AT TIME ZONE 'Asia/Jakarta') = '2026-02-26'
      ORDER BY "openedAt"
    `, { type: QueryTypes.SELECT });
    console.log('\nSemua sesi tanggal 26:', JSON.stringify(allSessions, null, 2));
    await sequelize.close();
    return;
  }
  console.log(JSON.stringify(sessions, null, 2));

  const session = sessions[0];
  const openedAt = session.openedAt;
  const closedAt = session.closedAt || new Date().toISOString();

  // 3. Transaksi dalam rentang waktu sesi morning
  const transactions = await sequelize.query(`
    SELECT 
      t.id,
      t."transactionNumber",
      t."transactionType",
      t."orderType",
      t."subtotal",
      t."tax",
      t."serviceCharge",
      t."voucherDiscount",
      t."roundingAmount",
      t."totalAmount",
      t."paidAmount",
      t."voucherId",
      t.status,
      t."customerName",
      t."createdAt"
    FROM "Transactions" t
    WHERE t."createdAt" >= :openedAt
      AND t."createdAt" <= :closedAt
      AND t.status NOT IN ('cancelled', 'voided')
    ORDER BY t."createdAt"
  `, { type: QueryTypes.SELECT, replacements: { openedAt, closedAt } });

  // Juga ambil item per transaksi untuk detail produk
  const txIds = transactions.map(t => t.id);
  let items = [];
  if (txIds.length > 0) {
    items = await sequelize.query(`
      SELECT ti."transactionId", ti.name, ti.quantity, ti."unitPrice", ti."totalPrice", ti.discount
      FROM "TransactionItems" ti
      WHERE ti."transactionId" = ANY(:txIds)
      ORDER BY ti."transactionId", ti."createdAt"
    `, { type: QueryTypes.SELECT, replacements: { txIds } });
  }

  // Group items by transactionId
  const itemsByTx = {};
  items.forEach(item => {
    if (!itemsByTx[item.transactionId]) itemsByTx[item.transactionId] = [];
    itemsByTx[item.transactionId].push(item);
  });

  console.log(`\n=== TRANSAKSI SHIFT MORNING 26 Feb 2026 ===`);
  console.log(`Sesi: ${new Date(openedAt).toLocaleString('id-ID', {timeZone:'Asia/Jakarta'})} - ${new Date(closedAt).toLocaleString('id-ID', {timeZone:'Asia/Jakarta'})}`);
  console.log(`Total Transaksi: ${transactions.length}`);
  
  let totalRevenue = 0;
  let totalDiscount = 0;
  let totalVoucherDiscount = 0;

  transactions.forEach((tx, i) => {
    const voucher = parseFloat(tx.voucherDiscount || 0);
    const total = parseFloat(tx.totalAmount || 0);
    const subtotal = parseFloat(tx.subtotal || 0);
    const itemDiscount = (itemsByTx[tx.id] || []).reduce((s, it) => s + parseFloat(it.discount || 0) * parseFloat(it.quantity || 1), 0);
    totalRevenue += total;
    totalDiscount += itemDiscount;
    totalVoucherDiscount += voucher;

    console.log(`\n[${i+1}] #${tx.transactionNumber} | ${tx.transactionType} | ${tx.orderType || '-'}`);
    console.log(`    Customer   : ${tx.customerName || 'Walk-in'}`);
    console.log(`    Subtotal   : Rp ${subtotal.toLocaleString('id-ID')}`);
    if (itemDiscount > 0) console.log(`    Diskon Item: Rp ${itemDiscount.toLocaleString('id-ID')}`);
    if (voucher > 0) console.log(`    Diskon Voucher: Rp ${voucher.toLocaleString('id-ID')}`);
    console.log(`    Total      : Rp ${total.toLocaleString('id-ID')}`);
    console.log(`    Status     : ${tx.status}`);
    console.log(`    Waktu      : ${new Date(tx.createdAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`);

    const txItems = itemsByTx[tx.id] || [];
    if (txItems.length > 0) {
      console.log(`    Items:`);
      txItems.forEach(it => {
        const disc = parseFloat(it.discount || 0);
        const discStr = disc > 0 ? ` (diskon: Rp ${(disc * it.quantity).toLocaleString('id-ID')})` : '';
        console.log(`      - ${it.name} x${it.quantity} @ Rp ${parseFloat(it.unitPrice).toLocaleString('id-ID')} = Rp ${parseFloat(it.totalPrice).toLocaleString('id-ID')}${discStr}`);
      });
    }
  });

  console.log(`\n${'='.repeat(50)}`);
  console.log(`SUMMARY SHIFT MORNING 26 Feb 2026`);
  console.log(`${'='.repeat(50)}`);
  console.log(`Total Transaksi   : ${transactions.length}`);
  console.log(`Total Revenue     : Rp ${totalRevenue.toLocaleString('id-ID')}`);
  console.log(`Total Diskon Item : Rp ${totalDiscount.toLocaleString('id-ID')}`);
  console.log(`Total Diskon Vch  : Rp ${totalVoucherDiscount.toLocaleString('id-ID')}`);
  console.log(`Total Semua Diskon: Rp ${(totalDiscount + totalVoucherDiscount).toLocaleString('id-ID')}`);

  await sequelize.close();
}

main().catch(e => { console.error(e); process.exit(1); });
