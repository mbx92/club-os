const { Sequelize, Op } = require('sequelize');
const s = new Sequelize('gym_db_dev', 'mbx', 'Nopassword123!', { host: 'localhost', dialect: 'postgres', logging: false });

const now = new Date();
const witaOffset = 8 * 60 * 60 * 1000;
const witaNow = new Date(now.getTime() + witaOffset);
const todayStr = witaNow.toISOString().slice(0, 10);
const today = new Date(`${todayStr}T00:00:00+08:00`);
const tomorrow = new Date(`${todayStr}T23:59:59.999+08:00`);

Promise.all([
  // Session hari ini
  s.query(`SELECT id, "shiftDate", "openedAt", "closedAt", status FROM "CashRegisterSessions"
    WHERE "shiftDate" = :todayStr AND "deletedAt" IS NULL ORDER BY "openedAt" ASC`,
    { replacements: { todayStr } }),

  // Semua transaksi gym hari ini dengan timestamp
  s.query(`SELECT id, "transactionNumber", "createdAt", status, subtotal, "voucherDiscount", "totalAmount"
    FROM "Transactions"
    WHERE "transactionType"='gym' AND status IN ('completed','paid','served','split','merged')
    AND "createdAt" >= :today AND "createdAt" <= :tomorrow AND "deletedAt" IS NULL
    ORDER BY "createdAt" ASC`,
    { replacements: { today, tomorrow } }),

]).then(async ([sessQ, trxQ]) => {
  const sessions = sessQ[0];
  const trxs = trxQ[0];

  console.log('=== SESSIONS HARI INI (' + todayStr + ') ===');
  if (sessions.length === 0) {
    console.log('  TIDAK ADA SESSION!');
  } else {
    sessions.forEach(sess => {
      console.log(`  Session ${sess.id} | status=${sess.status} | openedAt=${sess.openedAt} | closedAt=${sess.closedAt || 'MASIH OPEN'}`);
    });
  }

  console.log('\n=== TRANSAKSI GYM HARI INI ===');
  console.log(`Total: ${trxs.length} transaksi`);

  if (sessions.length > 0) {
    // Hitung window laporan harian
    const firstOpen = new Date(sessions[0].openedAt);
    const sortedByClose = [...sessions].sort((a, b) => {
      if (!a.closedAt) return 1;
      if (!b.closedAt) return -1;
      return new Date(b.closedAt) - new Date(a.closedAt);
    });
    const lastClose = sortedByClose[0].closedAt ? new Date(sortedByClose[0].closedAt) : null;

    console.log(`\nWindow laporan harian: ${firstOpen.toISOString()} → ${lastClose ? lastClose.toISOString() : 'OPEN (now)'}`);
    console.log(`Window dashboard     : ${today.toISOString()} → ${tomorrow.toISOString()}`);

    let inSession = 0, outSession = 0;
    let inSessionTotal = 0, outSessionTotal = 0;
    let inSessionSubtotal = 0, outSessionSubtotal = 0;

    trxs.forEach(t => {
      const created = new Date(t.createdAt);
      const withinSession = created >= firstOpen && (lastClose ? created <= lastClose : true);
      if (withinSession) {
        inSession++;
        inSessionTotal += parseFloat(t.totalamount || t.totalAmount || 0);
        inSessionSubtotal += parseFloat(t.subtotal || 0);
      } else {
        outSession++;
        outSessionTotal += parseFloat(t.totalamount || t.totalAmount || 0);
        outSessionSubtotal += parseFloat(t.subtotal || 0);
        console.log(`  [LUAR WINDOW] trx=${t.transactionNumber} createdAt=${t.createdAt} subtotal=${t.subtotal} total=${t.totalamount || t.totalAmount}`);
      }
    });

    console.log(`\nDalam window session : ${inSession} trx | subtotal=${inSessionSubtotal.toLocaleString()} | totalAmount=${inSessionTotal.toLocaleString()}`);
    console.log(`Di luar window session: ${outSession} trx | subtotal=${outSessionSubtotal.toLocaleString()} | totalAmount=${outSessionTotal.toLocaleString()}`);
    console.log(`\nSelisih totalAmount (in vs all): ${(inSessionTotal).toLocaleString()} vs 1,820,000`);
  }

  s.close();
}).catch(e => { console.error(e.message); s.close(); });

