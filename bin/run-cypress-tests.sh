#!/bin/bash

PORT=3000
SCREENSHOTS_DIR="./cypress/screenshots"
LOCK_FILE="./.next/dev/lock"

# 1. Check for Next.js dev lock
if [ -f "$LOCK_FILE" ]; then
    echo "Error: Next.js dev lock detected at $LOCK_FILE"
    echo "Another instance of 'next dev' is likely running."
    echo "Please shut down the other instance before running tests."
    echo "If this is not the case, remove .next folder and build the service again."
    exit 1
fi

# 2. Clean up old screenshots so Agent doesn't get confused
if [ -d "$SCREENSHOTS_DIR" ]; then
    echo "Cleaning up old screenshots..."
    rm -rf "$SCREENSHOTS_DIR"/*
fi

# 3. Kill any existing process on port 3005
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null ; then
    echo "Port $PORT is occupied. Killing existing process..."
    lsof -ti:$PORT | xargs kill -9
fi

# 4. Start server in background
nohup npm run dev -- -p $PORT > server.log 2>&1 &
SERVER_PID=$!
echo "Server started with PID $SERVER_PID"

# Function to kill server on exit
cleanup() {
  echo "Stopping server (PID $SERVER_PID)..."
  kill $SERVER_PID 2>/dev/null
}
trap cleanup EXIT

# 5. Wait for server to be up
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

# 6. Run Cypress tests
CI=1 CYPRESS_COMMERCIAL_RECOMMENDATIONS=false npm run cypress:run -- --quiet --reporter list "$@"