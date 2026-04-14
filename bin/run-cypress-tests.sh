#!/bin/bash

PORT=3000
SCREENSHOTS_DIR="./cypress/screenshots"
LOCK_FILE="./.next/dev/lock"

# 1. Kill any existing process on the test port
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null ; then
    echo "Port $PORT is occupied. Killing existing process..."
    lsof -ti:$PORT | xargs kill -9
    sleep 1
fi

# Remove stale Next.js dev lock if present
if [ -f "$LOCK_FILE" ]; then
    echo "Removing stale Next.js dev lock..."
    rm -f "$LOCK_FILE"
fi

# 2. Clean up old screenshots so Agent doesn't get confused
if [ -d "$SCREENSHOTS_DIR" ]; then
    echo "Cleaning up old screenshots..."
    rm -rf "$SCREENSHOTS_DIR"/*
fi

# 4. Seed database with example data so graph has nodes to render
echo "Seeding database with example data..."
npm run db:seed

# 5. Start server in background
nohup npm run dev -- -p $PORT > server.log 2>&1 &
SERVER_PID=$!
echo "Server started with PID $SERVER_PID"

# Function to kill server on exit
cleanup() {
  echo "Stopping server (PID $SERVER_PID)..."
  kill $SERVER_PID 2>/dev/null
}
trap cleanup EXIT

# 6. Wait for server to be up
count=0
until curl -s --head http://localhost:$PORT | grep "200 OK" > /dev/null; do
  if [ $count -ge 30 ]; then
    echo "Timeout waiting for server"
    cat server.log
    exit 1
  fi
  echo "Waiting for server... ($count/30)"
  sleep 1
  ((count++))
done

echo "Server is up! Running Cypress..."

# 7. Run Cypress tests
CI=1 CYPRESS_COMMERCIAL_RECOMMENDATIONS=false npm run cypress:run -- --quiet --reporter list "$@"