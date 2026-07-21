#!/usr/bin/env bash
set -Eeuo pipefail

BACKUP_DIR="${POP_ORGANIZE_BACKUP_DIR:-/var/backups/pop-organize}"
CREDENTIALS_FILE="${POP_ORGANIZE_MYSQL_CREDENTIALS:-/root/.my.cnf}"
DATABASE_NAME="${POP_ORGANIZE_DATABASE_NAME:-pop_organize}"
RETENTION_DAYS="${POP_ORGANIZE_BACKUP_RETENTION_DAYS:-14}"

if [[ "$BACKUP_DIR" != "/var/backups/pop-organize" ]]; then
  echo "Refusing unexpected backup directory: $BACKUP_DIR" >&2
  exit 1
fi

if [[ ! -r "$CREDENTIALS_FILE" ]]; then
  echo "MySQL credentials file is not readable: $CREDENTIALS_FILE" >&2
  exit 1
fi

install -d -m 0700 "$BACKUP_DIR"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
TARGET="$BACKUP_DIR/${DATABASE_NAME}-${TIMESTAMP}.sql.gz"

mysqldump \
  --defaults-extra-file="$CREDENTIALS_FILE" \
  --single-transaction \
  --quick \
  --lock-tables=false \
  "$DATABASE_NAME" | gzip -9 > "$TARGET"

test -s "$TARGET"
find "$BACKUP_DIR" -maxdepth 1 -type f -name "${DATABASE_NAME}-*.sql.gz" \
  -mtime "+$RETENTION_DAYS" -delete

echo "$TARGET"
