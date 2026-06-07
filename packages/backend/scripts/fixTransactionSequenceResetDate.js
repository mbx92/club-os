'use strict';

const { sequelize } = require('../src/models');

function getArgValue(name, fallback = null) {
  const prefix = `--${name}=`;
  const arg = process.argv.find(item => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function quoteLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function main() {
  const apply = hasFlag('apply');
  const timezone = getArgValue('timezone', process.env.APP_TIMEZONE || process.env.TZ || 'Asia/Makassar');
  const sequencePrefix = getArgValue('prefix', 'transaction_%');

  const replacements = { sequencePrefix, timezone };

  const [beforeRows] = await sequelize.query(`
    SELECT
      name,
      "currentValue",
      prefix,
      "resetPeriod",
      "lastResetDate",
      "updatedAt"
    FROM "Sequences"
    WHERE name LIKE :sequencePrefix
      AND "resetPeriod" = 'monthly'
      AND "lastResetDate" < date_trunc('month', (NOW() AT TIME ZONE :timezone))::date
    ORDER BY name;
  `, { replacements });

  console.log(`Environment : ${process.env.NODE_ENV || 'development'}`);
  console.log(`Timezone    : ${timezone}`);
  console.log(`Mode        : ${apply ? 'APPLY' : 'DRY RUN'}`);
  console.log(`Matched     : ${beforeRows.length} sequence(s)`);

  if (beforeRows.length > 0) {
    console.table(beforeRows);
  }

  if (!apply) {
    console.log('\nNo changes applied. Re-run with --apply to update the database.');
    return;
  }

  const [updatedRows] = await sequelize.query(`
    UPDATE "Sequences"
    SET
      "lastResetDate" = (NOW() AT TIME ZONE :timezone)::date,
      "updatedAt" = NOW()
    WHERE name LIKE :sequencePrefix
      AND "resetPeriod" = 'monthly'
      AND "lastResetDate" < date_trunc('month', (NOW() AT TIME ZONE :timezone))::date
    RETURNING
      name,
      "currentValue",
      prefix,
      "resetPeriod",
      "lastResetDate",
      "updatedAt";
  `, { replacements });

  console.log(`\nUpdated     : ${updatedRows.length} sequence(s)`);
  if (updatedRows.length > 0) {
    console.table(updatedRows);
  }

  console.log(`\nSQL equivalent:\nUPDATE "Sequences"\nSET "lastResetDate" = (NOW() AT TIME ZONE ${quoteLiteral(timezone)})::date,\n    "updatedAt" = NOW()\nWHERE name LIKE ${quoteLiteral(sequencePrefix)}\n  AND "resetPeriod" = 'monthly'\n  AND "lastResetDate" < date_trunc('month', (NOW() AT TIME ZONE ${quoteLiteral(timezone)}) )::date;`);
}

main()
  .catch(error => {
    console.error('Failed to fix transaction sequence reset date:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
