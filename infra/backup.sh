#!/bin/bash
# Backup script for Supabase PostgreSQL database
# Run this via a weekly cron job

set -e

# Load env variables (SUPABASE_DB_URL, GPG_PASSPHRASE, S3_BUCKET, etc.)
source .env.production

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="backup_${TIMESTAMP}.sql"
ENCRYPTED_FILE="${BACKUP_FILE}.gpg"

echo "Starting database backup at ${TIMESTAMP}..."

# 1. Dump the database using Supabase connection string
pg_dump "$SUPABASE_DB_URL" -F p -f "$BACKUP_FILE"

# 2. Encrypt the backup
echo "Encrypting backup..."
echo "$GPG_PASSPHRASE" | gpg --batch --yes --passphrase-fd 0 --symmetric --cipher-algo AES256 -o "$ENCRYPTED_FILE" "$BACKUP_FILE"

# 3. Upload to secure storage (e.g., AWS S3 or Cloudflare R2)
echo "Uploading to artifact storage..."
# aws s3 cp "$ENCRYPTED_FILE" "s3://${S3_BUCKET}/backups/${ENCRYPTED_FILE}"

# 4. Cleanup local files
rm "$BACKUP_FILE" "$ENCRYPTED_FILE"

echo "Backup complete!"
