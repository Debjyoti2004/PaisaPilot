#!/bin/sh
set -e

echo "[paisapilot] Running Prisma migrations..."
npx prisma migrate deploy 2>/dev/null || npx prisma db push --accept-data-loss

echo "[paisapilot] Starting app..."
exec "$@"
