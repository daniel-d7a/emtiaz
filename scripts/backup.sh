#!/usr/bin/env bash
# Dump Postgres + snapshot the RustFS volume into ./backups (override with BACKUP_DIR).
set -euo pipefail
cd "$(dirname "$0")/.."

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="${BACKUP_DIR:-backups}"
mkdir -p "$OUT"

echo "==> Postgres dump"
docker compose exec -T db pg_dump -U emtiaz -d emtiaz --clean --if-exists --no-owner \
  | gzip > "$OUT/db-$STAMP.sql.gz"

S3_VOL="$(docker volume ls --filter label=com.docker.compose.volume=s3data --format '{{.Name}}' | head -n1)"
if [ -z "$S3_VOL" ]; then
  echo "!! s3data volume not found; skipping object-store snapshot" >&2
else
  echo "==> RustFS volume snapshot ($S3_VOL)"
  docker run --rm \
    -v "$S3_VOL":/data:ro \
    -v "$PWD/$OUT":/backup \
    alpine:3.20 tar czf "/backup/rustfs-$STAMP.tar.gz" -C /data .
fi

echo
ls -lh "$OUT"/*-"$STAMP".* 2>/dev/null || true
