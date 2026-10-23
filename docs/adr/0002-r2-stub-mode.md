# ADR-0002: R2 runs in stub mode until credentials exist; MinIO unusable in dev here

Date: 2026-10-23

## Decision
The storage module (`backend/src/modules/storage`) emulates object storage when
R2 credentials are not configured: `presigned-upload` returns a recognizable
`stub-upload` URL, metadata is accepted, and downloads return a signed URL only
when real R2 is present. All routes, ownership checks, and the frontend
presigned flow are identical in both modes.

## Rationale
- Pulling the MinIO image is blocked in this environment (registry restriction),
  so a real S3-compatible object store can't run locally here.
- Cloudflare R2 is the production target and its S3 API can never be faithfully
  reproduced by a local emulator that we cannot even pull.

## Consequences
- Attachment uploads are metadata-only in dev; the frontend skips the `PUT`
  when it sees a `stub-upload` URL.
- Enabling production storage is a mapping exercise only: set
  R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET / R2_BUCKET and the stub turns
  itself off (`isConfigured()`).
