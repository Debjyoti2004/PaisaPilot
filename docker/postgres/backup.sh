#!/bin/bash

# Backup configuration
DB_USER="${POSTGRES_USER:-postgres}"
DB_NAME="${POSTGRES_DB:-paisapilot}"
BACKUP_DIR="/backups"
RETENTION_DAYS=7
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# Perform backup
echo "[$(date)] Starting backup of ${DB_NAME}..."

if pg_dump -U "${DB_USER}" -d "${DB_NAME}" | gzip > "${BACKUP_FILE}"; then
    BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    echo "[$(date)] ✅ Backup successful: ${BACKUP_FILE} (${BACKUP_SIZE})"

    # Set proper permissions
    chmod 600 "${BACKUP_FILE}"

    # Cleanup old backups (keep only last 7 days)
    echo "[$(date)] Cleaning up backups older than ${RETENTION_DAYS} days..."
    find "${BACKUP_DIR}" -name "${DB_NAME}_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete
    echo "[$(date)] Cleanup complete"

    # List current backups
    echo "[$(date)] Current backups:"
    ls -lh "${BACKUP_DIR}"/${DB_NAME}_*.sql.gz 2>/dev/null || echo "No backups found"
else
    echo "[$(date)] ❌ Backup failed for ${DB_NAME}"
    exit 1
fi
