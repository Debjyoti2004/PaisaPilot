#!/bin/sh
# No set -e — migration failure must not kill the container

echo "[paisapilot] Syncing database schema..."
# Call prisma via node directly so __dirname resolves WASM files correctly
node ./node_modules/prisma/build/index.js db push --accept-data-loss --skip-generate 2>&1 \
  && echo "[paisapilot] Schema synced OK" \
  || echo "[paisapilot] WARNING: schema sync failed — app will still start"

echo "[paisapilot] Starting app..."
exec "$@"
