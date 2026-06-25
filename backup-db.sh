#!/data/data/com.termux/files/usr/bin/bash
# Database Backup Script for Thaesu Online
# Run daily via cron: crontab -e -> 0 2 * * * /data/data/com.termux/files/home/thaesu-online/backup-db.sh

source ~/thaesu-online/.env.local
BACKUP_DIR=~/thaesu-backups
mkdir -p $BACKUP_DIR
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump "$NEON_DATABASE_URL" -f "$BACKUP_DIR/thaesu_$DATE.sql"
# Keep only last 7 backups
ls -t $BACKUP_DIR/thaesu_*.sql | tail -n +8 | xargs rm -f
