#!/bin/sh
set -eu

cd /app

: "${NODE_ENV:=production}"
: "${PORT:=3000}"
: "${WAIT_FOR_DB:=true}"
: "${DB_WAIT_TIMEOUT:=120}"
: "${DB_WAIT_INTERVAL:=3}"
: "${MIGRATE_ON_START:=true}"
: "${SEED_ON_START:=false}"

mkdir -p packages/backend/public packages/backend/uploads packages/backend/logs
mkdir -p "${BACKUP_STORAGE_DIR:-/app/backups}"

if command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump ready: $(pg_dump --version)"
else
  echo "WARNING: pg_dump not found — database backups will fall back to JSON format"
fi

if [ "${WAIT_FOR_DB}" = "true" ]; then
  echo "Waiting for PostgreSQL to become available..."
  node <<'EOF'
const { Client } = require('pg');

const timeoutMs = Number(process.env.DB_WAIT_TIMEOUT || 120) * 1000;
const intervalMs = Number(process.env.DB_WAIT_INTERVAL || 3) * 1000;
const startedAt = Date.now();

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function canConnect() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionTimeoutMillis: 5000,
  });

  try {
    await client.connect();
    await client.end();
    return { ok: true };
  } catch (error) {
    try {
      await client.end();
    } catch (_) {}

    return { ok: false, error };
  }
}

async function waitForDatabase() {
  while (true) {
    const result = await canConnect();

    if (result.ok) {
      console.log('PostgreSQL is ready.');
      return;
    }

    if (Date.now() - startedAt >= timeoutMs) {
      console.error(`Timed out waiting for PostgreSQL: ${result.error.message}`);
      process.exit(1);
    }

    console.log(`PostgreSQL not ready yet: ${result.error.message}`);
    console.log(`Retrying in ${intervalMs / 1000}s...`);
    await sleep(intervalMs);
  }
}

waitForDatabase().catch((error) => {
  console.error('Failed while waiting for PostgreSQL:', error);
  process.exit(1);
});
EOF
fi

if [ "${MIGRATE_ON_START}" = "true" ]; then
  echo "Running database migrations..."
  (
    cd /app/packages/backend
    npx sequelize-cli db:migrate --env "${NODE_ENV}"
  )
fi

if [ "${SEED_ON_START}" = "true" ]; then
  echo "Running database seeders..."
  (
    cd /app/packages/backend
    npx sequelize-cli db:seed:all --env "${NODE_ENV}"
  )
fi

if [ "$#" -eq 0 ]; then
  set -- node packages/backend/src/server.js
fi

exec "$@"
