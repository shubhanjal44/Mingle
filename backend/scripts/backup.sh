#!/bin/bash
# Database Backup Script for tej-india India

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="tej-india_backup_${TIMESTAMP}.sql"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}tej-india Database Backup Tool${NC}"
echo -e "${GREEN}========================================${NC}"

# Parse DATABASE_URL to extract connection details
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL environment variable is not set${NC}"
    exit 1
fi

# Extract database credentials from DATABASE_URL
# Format: postgresql://user:password@host:port/database
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Function to create backup
create_backup() {
    echo -e "${YELLOW}Creating database backup...${NC}"
    echo "Database: $DB_NAME"
    echo "Host: $DB_HOST:$DB_PORT"
    echo "Backup file: $BACKUP_FILE"

    export PGPASSWORD=$DB_PASS
    pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -F c -b -v -f "$BACKUP_DIR/$BACKUP_FILE" $DB_NAME

    # Compress the backup
    gzip "$BACKUP_DIR/$BACKUP_FILE"
    echo -e "${GREEN}✓ Backup created: $BACKUP_DIR/${BACKUP_FILE}.gz${NC}"

    # Calculate backup size
    BACKUP_SIZE=$(du -h "$BACKUP_DIR/${BACKUP_FILE}.gz" | cut -f1)
    echo -e "${GREEN}Backup size: $BACKUP_SIZE${NC}"
}

# Function to restore backup
restore_backup() {
    if [ -z "$1" ]; then
        echo -e "${RED}Error: Backup file is required${NC}"
        echo "Usage: ./backup.sh restore <backup-file>"
        exit 1
    fi

    RESTORE_FILE="$1"

    if [ ! -f "$RESTORE_FILE" ]; then
        echo -e "${RED}Error: Backup file not found: $RESTORE_FILE${NC}"
        exit 1
    fi

    echo -e "${RED}WARNING: This will restore the database from backup!${NC}"
    echo -e "${RED}All current data will be replaced!${NC}"
    read -p "Are you sure? (type 'yes' to confirm): " confirm

    if [ "$confirm" != "yes" ]; then
        echo -e "${YELLOW}Restore cancelled${NC}"
        exit 0
    fi

    echo -e "${YELLOW}Restoring database from backup...${NC}"

    # Decompress if needed
    if [[ "$RESTORE_FILE" == *.gz ]]; then
        echo "Decompressing backup..."
        gunzip -k "$RESTORE_FILE"
        RESTORE_FILE="${RESTORE_FILE%.gz}"
    fi

    export PGPASSWORD=$DB_PASS
    pg_restore -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c -v "$RESTORE_FILE"

    echo -e "${GREEN}✓ Database restored successfully${NC}"
}

# Function to list backups
list_backups() {
    echo -e "${YELLOW}Available backups in $BACKUP_DIR:${NC}"
    echo ""
    ls -lh "$BACKUP_DIR"/*.sql.gz 2>/dev/null || echo "No backups found"
}

# Function to cleanup old backups
cleanup_old_backups() {
    echo -e "${YELLOW}Cleaning up backups older than $RETENTION_DAYS days...${NC}"

    DELETED_COUNT=$(find "$BACKUP_DIR" -name "*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete -print | wc -l)

    if [ $DELETED_COUNT -gt 0 ]; then
        echo -e "${GREEN}✓ Deleted $DELETED_COUNT old backup(s)${NC}"
    else
        echo -e "${YELLOW}No old backups to delete${NC}"
    fi
}

# Function to upload backup to S3 (optional)
upload_to_s3() {
    if [ -z "$S3_BUCKET_NAME" ]; then
        echo -e "${YELLOW}S3_BUCKET_NAME not set, skipping S3 upload${NC}"
        return
    fi

    echo -e "${YELLOW}Uploading backup to S3...${NC}"
    aws s3 cp "$BACKUP_DIR/${BACKUP_FILE}.gz" "s3://$S3_BUCKET_NAME/backups/${BACKUP_FILE}.gz"
    echo -e "${GREEN}✓ Backup uploaded to S3${NC}"
}

# Main script
case "$1" in
    create)
        create_backup
        cleanup_old_backups
        # Uncomment to enable S3 upload
        # upload_to_s3
        ;;
    restore)
        restore_backup "$2"
        ;;
    list)
        list_backups
        ;;
    cleanup)
        cleanup_old_backups
        ;;
    *)
        echo "Usage: $0 {create|restore|list|cleanup}"
        echo ""
        echo "Commands:"
        echo "  create  - Create a new database backup"
        echo "  restore - Restore database from backup file"
        echo "  list    - List available backups"
        echo "  cleanup - Remove backups older than $RETENTION_DAYS days"
        exit 1
        ;;
esac

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Operation completed!${NC}"
echo -e "${GREEN}========================================${NC}"
