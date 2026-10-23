# ADR-0002: Dev object storage via RustFS (S3-API); stub mode only as last resort

Date: 2026-10-23 (supersedes the original "stub mode until credentials exist" decision)

## Decision
Local development runs a real S3-compatible object store — **RustFS** (`rustfs/rustfs`,
chosen instead of MinIO) — via docker-compose. The storage module
(`backend/src/modules/storage/r2.service.ts`) talks plain S3: presigned PUT for
browser uploads, presigned GET for downloads, HEAD for verification. The
legacy stub mode (`?stub-upload=1` pretender) remains as an automatic fallback
when no R2_* config exists at all.

## Rationale
- The MinIO image cannot be pulled in this environment (registry restriction),
  and an npm S3 emulator (`s3rver`) proved less faithful than a real server.
- RustFS implements the actual S3 wire protocol, is containerized, and pulls
  fine from the restricted registry, so presign → browser PUT → objectExists →
  presigned GET is exercised for real in dev and CI.
- Production is unchanged: Cloudflare R2 activates by swapping `R2_ENDPOINT`
  and credentials — the code path is byte-for-byte identical (both use AWS SDK
  v3 with forcePathStyle, and `R2_PRESIGN_ENDPOINT` keeps browser-facing URLs
  host-reachable when the server runs inside docker).

## Key env vars
| Var | Meaning |
|---|---|
| `R2_ENDPOINT` | S3 API endpoint used by the backend process (docker: `http://rustfs:9000`) |
| `R2_PRESIGN_ENDPOINT` | Optional override embedded in presigned URLs so the user's browser can reach the endpoint (docker: `http://localhost:9200`) |
| `R2_REGION` | `us-east-1` for RustFS/MinIO-style stores, `auto` for real R2 |
| `R2_BUCKET_NAME` | Bucket; auto-created by the `rustfs-init` one-shot container (`scripts/ensure-bucket.ts`) |

## Consequences
- Attachment uploads work end-to-end in dev (`npm run storage:check` verifies
  the roundtrip against the real store).
- Enabling production storage is an env-mapping exercise only
  (`isConfigured()` flips to real mode the moment `R2_ENDPOINT` + creds exist).
