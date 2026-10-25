#!/usr/bin/env bash
# Restore a db-*.sql.gz and/or rustfs-*.tar.gz produced by scripts/backup.sh.
# Usage: scripts/restore.sh --yes backups/db-....sql.gz [backups/rustfs-....tar.gz]
set -euo pipefail
cd "$(dirname "$0")/.."

if [ "${1:-}" != "--yes" ]; then
  echo "This overwrites the live database and object store." >&2
  echo "Re-run with --yes plus the files to restore." >&2
  exit 1
fi
shift
[ "$#" -ge 1 ] || { echo "Give at least one backup file" >&2; exit 1; }

for file in "$@"; do
  [ -f "$file" ] || { echo "Missing file: $file" >&2; exit 1; }
  case "$file" in
    *db-*.sql.gz)
      echo "==> Restoring database from $file"
      gunzip -c "$file" | docker compose exec -T db psql -v ON_ERROR_STOP=1 -U emtiaz -d emtiaz
      ;;
    *rustfs-*.tar.gz)
      S3_VOL="$(docker volume ls --filter label=com.docker.compose.volume=s3data --format '{{.Name}}' | head -n1)"
      [ -n "$S3_VOL" ] || { echo "s3data volume not found" >&2; exit 1; }
      echo "==> Restoring object store from $file"
      docker compose stop rustfs >/dev/null
      docker run --rm \
        -v "$S3_VOL":/data \
        -v "$PWD/$(dirname "$file")":/backup:ro \
        alpine:3.20 sh -c "rm -rf /data/* && tar xzf /backup/$(basename "$file") -C /data"
      docker compose start rustfs >/dev/null
      ;;
    *)
      echo "Unknown backup type: $file" >&2
      exit 1
      ;;
  esac
done
echo "Restore complete."
