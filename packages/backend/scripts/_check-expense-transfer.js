// Temporary diagnostic script — check transfer expenses counted as cash
const { Sequelize, QueryTypes } = require('sequelize');
require('dotenv').config({ path: '.env.development' });

const seq = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  dialect: 'postgres',
  logging: false,
});

async function run() {
  try {
    // Per shiftDate: compare cashExpenses vs totalExpenses to see if transfer was wrongly counted
    const perDate = await seq.query(`
      SELECT
        "expenseDate"::date                                             AS tgl,
        SUM("totalAmount")                                             AS total_semua,
        SUM(CASE WHEN "paymentMethod" = 'cash'           THEN "totalAmount" ELSE 0 END) AS total_cash,
        SUM(CASE WHEN "paymentMethod" = 'bank_transfer'  THEN "totalAmount" ELSE 0 END) AS total_transfer,
        SUM(CASE WHEN "paymentMethod" = 'petty_cash'     THEN "totalAmount" ELSE 0 END) AS total_pettycash,
        STRING_AGG(DISTINCT "paymentMethod", ', ')                    AS metode_pembayaran,
        COUNT(*)::int                                                  AS jumlah
      FROM "Expenses"
      WHERE "expenseDate" >= '2026-03-01'
        AND status IN ('approved','paid')
      GROUP BY "expenseDate"::date
      ORDER BY 1
    `, { type: QueryTypes.SELECT });

    console.log('\n=== PENGELUARAN PER TANGGAL (Maret 2026) ===');
    console.log('Kolom: total_semua vs total_cash — jika berbeda berarti ada transfer yg masuk ke laporan');
    console.table(perDate.map(r => ({
      tgl: r.tgl,
      metode: r.metode_pembayaran,
      total_semua: Number(r.total_semua),
      total_cash: Number(r.total_cash),
      total_transfer: Number(r.total_transfer),
      total_pettycash: Number(r.total_pettycash),
      selisih_transfer: Number(r.total_semua) - Number(r.total_cash),
    })));

    // Cek shift report per tanggal untuk melihat apakah ada yang punya transfer yg masuk cashExpenses
    console.log('\n=== TANGGAL YANG PUNYA TRANSFER (transfer > 0) ===');
    const withTransfer = perDate.filter(r => Number(r.total_transfer) > 0 || Number(r.total_pettycash) > 0);
    withTransfer.forEach(r => {
      const issueDays = Number(r.total_transfer) > 0 && Number(r.total_cash) === 0;
      console.log(`  ${r.tgl}: cash=Rp${Number(r.total_cash).toLocaleString('id-ID')} | transfer=Rp${Number(r.total_transfer).toLocaleString('id-ID')} | petty=Rp${Number(r.total_pettycash).toLocaleString('id-ID')}${issueDays ? ' ← hanya transfer, 0 cash' : ''}`);
    });

    // Shift sessions per hari untuk konfirmasi
    const shifts = await seq.query(`
      SELECT
        "shiftDate",
        COUNT(*)::int AS jumlah_shift,
        STRING_AGG("shiftName", ', ' ORDER BY "openedAt") AS nama_shift
      FROM "CashRegisterSessions"
      WHERE "shiftDate" >= '2026-03-01'
        AND "deletedAt" IS NULL
      GROUP BY "shiftDate"
      ORDER BY 1
    `, { type: QueryTypes.SELECT });

    console.log('\n=== SHIFT PER HARI (Maret 2026) ===');
    console.table(shifts);

  } catch (e) {
    console.error(e.message);
  } finally {
    await seq.close();
  }
}

run();
