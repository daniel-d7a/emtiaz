# ADR-0009: Two S3 clients — API client vs presign client

Date: 2026-10-25

## Context
The backend talks to S3-compatible storage from two different places:

1. **Server-side calls** (`objectExists`, future deletes/copies) run inside the
   API process. They must use an endpoint the container can resolve.
2. **Presigned URLs** (`presignedPut`, `presignedGet`) are opened by the user's
   browser or phone. The endpoint baked into the signature must be reachable
   from that device.

In Docker, those endpoints differ: the API resolves `http://rustfs:9000`, while
the browser needs `http://localhost:9200`. Signing with the container endpoint
would hand users an unreachable URL.

## Decision
`R2StorageService` keeps two lazily-built `S3Client`s:

| Client | Built from | Used by |
|---|---|---|
| `getClient()` | `R2_ENDPOINT` | `objectExists` and any server-side S3 command |
| `getPresignClient()` | `R2_PRESIGN_ENDPOINT`, falling back to `R2_ENDPOINT` when unset | `presignedPut`, `presignedGet` |

Both share `R2_REGION`, credentials, and `forcePathStyle: true`. Setting only
`R2_ENDPOINT` (the production case, where the API and the browser share one
public hostname) is valid; `R2_PRESIGN_ENDPOINT` exists solely to bridge the
Docker host/container split.

## Consequences
- Local and production use the same code path; only env vars change.
- A wrong `R2_PRESIGN_ENDPOINT` produces URLs that fail at the browser, not at
  the API — `npm run storage:check` is the quickest way to catch it.
- No extra dependency: the second client is the same SDK class with a
  different endpoint.
