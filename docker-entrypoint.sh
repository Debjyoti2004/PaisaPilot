#!/bin/sh
# No set -e — we handle errors explicitly so a migration hiccup doesn't kill the container

echo "[paisapilot] Syncing database schema..."
./node_modules/.bin/prisma db push --accept-data-loss --skip-generate 2>&1 \
  && echo "[paisapilot] Schema synced" \
  || echo "[paisapilot] WARNING: schema sync failed — app will still start"

echo "[paisapilot] Starting app..."
exec "$@"
