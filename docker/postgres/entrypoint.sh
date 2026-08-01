#!/bin/bash
set -e

# Start cron in background
crond -f -l 2 &
CRON_PID=$!

# Start PostgreSQL
exec docker-entrypoint.sh "$@" &
PG_PID=$!

# Wait for both processes
wait $CRON_PID $PG_PID
