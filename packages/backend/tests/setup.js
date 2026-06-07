const { sequelize } = require('../src/models');

// After all tests, close the database connection
afterAll(async () => {
  await sequelize.close();
});

// Before each test, clear sequences table only (not all tables - too destructive)
beforeEach(async () => {
  if (sequelize.models.Sequence) {
    await sequelize.models.Sequence.destroy({ where: {}, truncate: true });
  }
});