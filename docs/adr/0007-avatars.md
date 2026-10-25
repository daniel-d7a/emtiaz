# ADR-0007: Profile avatars reuse the S3 presign flow; `user.image` stores the object key

Date: 2026-10-25

## Decision
- Avatars upload with the same presigned-PUT flow as lesson attachments:
  `POST /api/storage/avatar` (any signed-in role, images only, <= 2 MB) returns
  `{ objectKey, uploadUrl }` under `avatars/<userId>/…`.
- `PATCH /api/me` accepts `image` (the object key) and rejects keys that do not
  start with the caller's `avatars/<userId>/` prefix.
- `GET /api/me` returns `avatarUrl` (a fresh presigned GET, or null);
  `GET /api/me/avatar` 302s to it so `<img src>` works without JS.

## Rationale
- Avoids a multipart upload endpoint + multer/disk handling on the API: the
  browser/mobile client PUTs bytes straight to the object store, exactly like
  course files.
- Storing the key (not a URL) keeps avatars valid forever; signed URLs expire
  and would silently rot in the users table.
- Prefix enforcement stops a user pointing their profile at another user's
  object (the storage is shared, the bucket policy is not object-level).

## Consequences
- If storage is unconfigured, avatar endpoints 503 (no fake URLs).
- Old avatars are not deleted on replace (orphans in the bucket). Acceptable
  for now; add lifecycle rules or delete-on-replace if storage grows.
- Mobile fetches `avatarUrl` via `/api/me` because React Native image loaders
  do not reliably share the fetch cookie jar; web can use the 302 endpoint.
