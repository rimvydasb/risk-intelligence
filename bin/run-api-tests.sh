#!/bin/bash
set -e

DB_CONTAINER="risk-intelligence-db-test"
DB_PORT=5433
TEST_DB_URL="postgresql://postgres:postgres@localhost:${DB_PORT}/risk_intelligence_test"

# 1. Start test database
echo "Starting test database..."
docker compose up -d postgres-test

cleanup() {
  echo "Stopping test database..."
  docker compose stop postgres-test
}
trap cleanup EXIT

# 2. Wait for postgres to accept connections
count=0
until docker exec "$DB_CONTAINER" pg_isready -U postgres > /dev/null 2>&1; do
  if [ "$count" -ge 30 ]; then
    echo "Timeout waiting for test database"
    exit 1
  fi
  echo "Waiting for test database... ($count/30)"
  sleep 1
  ((count++))
done
echo "Test database is ready."

# 3. Apply migrations against the test DB
echo "Running migrations..."
DATABASE_URL="$TEST_DB_URL" npx prisma migrate deploy

# 4. Run ALL Jest tests (unit + integration) with test DB available.
#    NODE_ENV=test tells next/jest to load .env.test automatically.
#    RUN_INTEGRATION=true unlocks staging/graph/route tests in jest.config.ts.
echo "Running tests..."
NODE_ENV=test RUN_INTEGRATION=true npx jest --runInBand --forceExit "$@"
