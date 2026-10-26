# Backups and restore runbook

Two things need backing up: Postgres (`db` service) and the RustFS object
store (`s3data` volume). `scripts/backup.sh` captures both.

Redis (`redis` service) is **not** backed up. It only holds expiring throttle
counters, sign-in lockout keys, and the monthly-summary lock; losing it resets
those ephemeral values. See [ADR-0014](./adr/0014-redis-shared-state.md).

## Take a backup

```bash
./scripts/backup.sh
# writes backups/db-<UTC stamp>.sql.gz
#        backups/rustfs-<UTC stamp>.tar.gz
```

`BACKUP_DIR=/mnt/backups ./scripts/backup.sh` writes elsewhere. The DB dump
uses `--clean --if-exists`, so it can be replayed over an existing database.
The object-store snapshot mounts the compose volume read-only and tars it with
a throwaway `alpine` container (no need for `tar` inside the RustFS image).

Schedule it from cron (daily 02:00, keep 14 days):

```cron
0 2 * * * cd /srv/emtiaz && ./scripts/backup.sh && find backups -name '*-*.gz' -mtime +14 -delete
```

Copy backups off the host (object storage, another machine). A backup that only
lives on the same disk is not a backup.

## Restore

```bash
# both at once
./scripts/restore.sh --yes backups/db-20261025T105422Z.sql.gz backups/rustfs-20261025T105422Z.tar.gz
```

The script refuses to run without `--yes`; it replays the DB dump with
`ON_ERROR_STOP=1`, stops RustFS, replaces the volume contents, and starts
RustFS again. The API can stay up during a DB-only restore, but restart it after
an object-store restore so presigned URLs are regenerated.

### Verify a restore without touching production

```bash
docker run -d --name emtiaz-restore-test -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=oman_lms -p 5435:5432 postgres:16-alpine
gunzip -c backups/db-*.sql.gz | \
  docker exec -i emtiaz-restore-test psql -U postgres -d oman_lms
docker exec emtiaz-restore-test psql -U postgres -d oman_lms -c 'select count(*) from "user";'
docker rm -f emtiaz-restore-test
```

For the object store, extract into a scratch directory and spot-check that
avatars/attachments exist:

```bash
mkdir -p /tmp/rustfs-check && tar xzf backups/rustfs-*.tar.gz -C /tmp/rustfs-check
find /tmp/rustfs-check -type f | head
```

## RPO / RTO

- RPO: whatever the cron interval is (daily = up to 24 h of data loss).
  Increase frequency or add WAL archiving if that is too much.
- RTO: minutes — dump/restore of a classroom-sized database is small, and the
  object snapshot is a file copy.

## Caveats

- `pg_dump` is logical: it does not capture roles, extensions, or DB-level
  settings. The compose database is single-user (`emtiaz`), so this is fine.
- Restoring the DB does not restore files, and vice versa. Restore both to get a
  consistent point in time.
- Secrets (`BETTER_AUTH_SECRET`, R2 credentials) are environment variables, not
  in the backup. Keep them in your secret manager.
