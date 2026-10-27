# 15: Lesson materials editor

**What to build:** Every lesson owns a material list supporting images, PDFs, YouTube links, and external links. Materials are added through a modal, carry the right type, and render the same way for students (inline when previewable, new tab otherwise).

**Blocked by:** 14.

**Status:** done

- [x] A lesson shows its materials with name and type icon.
- [x] Adding a material is a modal that accepts uploads and links.
- [x] Uploads use presigned storage; the post-upload CORS failure is fixed.
- [x] Student view previews embeddable types inline and opens the rest in a new tab.
- [x] Removing a material asks for confirmation.

## Comments

- 2026-10-27: Shipped in `6c08dd7`. Each lesson now has a materials list with type icons, an add-material dialog for presigned file uploads or external URLs, and confirmed removal. Uploaded objects are deleted best-effort with the row; link materials skip storage. `lesson_attachments` now stores either `r2_object_key` or `url` (migration `20261027083109_absurd_ben_urich`); the stale `public_or_signed_url` column is gone.
- Student lesson view now receives `url`, embeds images/PDF/audio/uploaded video inline, embeds YouTube via the shared `embedUrl` helper, and opens other links or files in a new tab. Attachment delete is teacher-owner-only.
- CORS setup from ticket 13 (`npm run s3:init` / compose init) remains in place for browser PUTs.
- Tests: backend 104 pass (link materials, YouTube classification, student serialization, student-delete denial, removal), frontend 14 pass, backend/frontend/mobile typechecks pass, builds pass, fresh migrate + seed on `emtiaz_verify` pass.
- Visual breakpoint check still outstanding (impeccable unavailable).
