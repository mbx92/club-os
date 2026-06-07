const db = require('../src/models');
(async () => {
  const [rows] = await db.sequelize.query(
    `UPDATE "CashRegisterSessions" SET "shiftDate" = '2026-02-22' WHERE id = '6f354464-e0c6-41a1-a07b-868ec1cb1340' RETURNING id, "shiftName", "shiftDate"`
  );
  console.log('Updated:', JSON.stringify(rows));
  process.exit();
})();
