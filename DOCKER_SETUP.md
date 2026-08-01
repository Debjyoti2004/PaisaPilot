# PaisaPilot Docker Setup Guide

## Overview
This setup includes:
- ✅ **Production-grade PostgreSQL 16** with backup automation
- ✅ **Automated nightly backup** (2 AM UTC)
- ✅ **7-day backup retention** (auto-cleanup)
- ✅ **Health checks** for reliability
- ✅ **Resource limits** to prevent crashes
- ✅ **Local storage** (no cloud dependencies)

## Quick Start

### 1. Setup Directories
```bash
mkdir -p backups logs/postgres
chmod 755 backups logs/postgres
```

### 2. Update Passwords
Edit `docker-compose.yml` and change:
```yaml
POSTGRES_PASSWORD: your_secure_password_here  # Change this!
DATABASE_URL: postgresql://paisapilot_user:your_secure_password_here@...
```

### 3. Build & Start
```bash
# Build custom PostgreSQL image with backups
docker-compose build

# Start PostgreSQL + Next.js
docker-compose up -d

# Check status
docker-compose ps
docker-compose logs -f postgres
```

### 4. Verify Backup Script
```bash
# Check backup logs
docker-compose logs postgres | grep "Starting backup"

# List backups
ls -lh backups/

# View backup details
docker-compose exec postgres ls -lh /backups/
```

## Backup System

### How It Works
- **Cron job** runs inside PostgreSQL container at 2 AM UTC daily
- **Automatic compression** (gzip) to save space
- **7-day retention** — old backups auto-deleted
- **Local storage** at `./backups/` on your server

### Backup Location
```
./backups/
  ├── paisapilot_20260802_020000.sql.gz    (2 MB) - Last night
  ├── paisapilot_20260801_020000.sql.gz    (2 MB) - 2 nights ago
  └── paisapilot_20260731_020000.sql.gz    (2 MB) - 3 nights ago
```

### Restore from Backup
```bash
# Extract backup
gunzip paisapilot_20260802_020000.sql.gz

# Restore to database
docker-compose exec postgres psql -U paisapilot_user -d paisapilot < paisapilot_20260802_020000.sql

# Or restore while running:
zcat backups/paisapilot_20260802_020000.sql.gz | \
  docker-compose exec -T postgres psql -U paisapilot_user -d paisapilot
```

## Production Checklist

- [ ] Change PostgreSQL password in `docker-compose.yml`
- [ ] Set strong password for database
- [ ] Test backup restore: `docker-compose exec postgres /usr/local/bin/backup.sh`
- [ ] Verify backups appear in `./backups/` directory
- [ ] Monitor disk space (each backup ~2-5 MB for typical app)
- [ ] Test that app connects to database: Check app logs for DB connection
- [ ] Set up server monitoring to track backup job status

## Environment Variables

Update these in `docker-compose.yml`:

| Variable | Default | Change To |
|----------|---------|-----------|
| `POSTGRES_PASSWORD` | `your_secure_password_here` | ⚠️ **Required** |
| `POSTGRES_USER` | `paisapilot_user` | Optional |
| `POSTGRES_DB` | `paisapilot` | Optional |

## Monitoring

### Check PostgreSQL Health
```bash
docker-compose exec postgres pg_isready -U paisapilot_user
```

### View Database Size
```bash
docker-compose exec postgres psql -U paisapilot_user -d paisapilot -c "SELECT pg_size_pretty(pg_database_size('paisapilot'));"
```

### View Backup Logs
```bash
docker-compose exec postgres tail -f /var/log/backup.log
```

### Check Disk Usage
```bash
du -sh ./backups/
du -sh postgres_data/
```

## Troubleshooting

### Backup Not Running
```bash
# Check cron logs
docker-compose exec postgres cat /var/log/backup.log

# Manually trigger backup
docker-compose exec postgres /usr/local/bin/backup.sh
```

### Database Connection Failed
```bash
# Verify PostgreSQL is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Test connection
docker-compose exec postgres psql -U paisapilot_user -d paisapilot -c "SELECT 1;"
```

### Out of Disk Space
```bash
# Check backup size
du -sh ./backups/

# Manually cleanup old backups
find ./backups/ -name "*.sql.gz" -mtime +7 -delete

# Check database size
docker-compose exec postgres psql -U paisapilot_user -d paisapilot -c "SELECT pg_size_pretty(pg_database_size('paisapilot'));"
```

## Resource Limits

The PostgreSQL container has:
- **Max CPU**: 1 core
- **Max Memory**: 512 MB
- **Reserved**: 0.5 CPU + 256 MB (guaranteed)

For larger apps, increase in `docker-compose.yml`:
```yaml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 2G
```

## Security Best Practices

1. ✅ Change default password immediately
2. ✅ Backups stored locally (no cloud exposure)
3. ✅ Database only accessible via `postgres` service (not exposed to host)
4. ✅ Automatic cleanup prevents old backups accumulating
5. ✅ Container restarts on failure (`restart: unless-stopped`)

## Backup Strategy

### Daily Backups (Automatic)
- **2 AM UTC**: Full database backup (every night)
- **Retention**: Last 7 days of backups kept locally
- **Auto-cleanup**: Backups older than 7 days deleted automatically

### Manual Backup (Anytime)
```bash
docker-compose exec postgres /usr/local/bin/backup.sh
```

### Monthly Archival (Recommended)
```bash
# Copy to external drive/NAS
cp backups/paisapilot_*.sql.gz /mnt/external-backup/paisapilot-2026-08/

# Or upload to cloud storage (optional):
# aws s3 cp backups/paisapilot_*.sql.gz s3://my-backup-bucket/
```

## Scaling Up

When you need more:

### Increase Database Resources
Edit `docker-compose.yml`:
```yaml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 2G
```

### External Backup (Cloud)
Add to `backup.sh` after successful backup:
```bash
# Upload to S3
aws s3 cp "${BACKUP_FILE}" s3://my-bucket/paisapilot-backups/

# Or use rclone for any cloud storage
# rclone copy "${BACKUP_FILE}" remote:paisapilot-backups/
```

---

**Questions?** Check Docker/PostgreSQL logs:
```bash
docker-compose logs -f postgres
docker-compose logs -f app
```
