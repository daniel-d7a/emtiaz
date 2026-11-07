# 04: Cloudflare R2 Object Storage, Upload Paths & Quotas

**Type:** audit
**Status:** open
**Blocked by:** None

## Objective

Audit Cloudflare R2 object storage integration, presigned URL generation, file upload authorization, storage quota enforcement, and secure file downloads.

## Verification Checklist

1. **Upload Path Prefix Integrity**:
   - In `backend/src/modules/storage/storage.controller.ts`:
     - Verify presigned upload generation restricts object keys strictly to the owning course and lesson: `courses/<courseId>/lessons/<lessonId>/...`.
     - Verify that avatar uploads enforce `avatars/<userId>/...`.
     - Verify that teachers cannot attach an object key that belongs to another course or teacher (`prefix.startsWith(...)` check).
2. **Quota Enforcement & File Size Caps**:
   - Verify `assertCanUploadStorage` is called before generating presigned URLs for lesson attachments and homework reference files.
   - Verify student homework uploads are strictly capped at 10MB (`fileSizeBytes <= 10 * 1024 * 1024`) and do not charge against the teacher's quota.
   - Verify onboarding files are capped (2MB for CV, 5MB for photo).
3. **Download Authorization**:
   - Verify that `/api/storage/attachments/:id/download`, `/file`, `/homework/:id/file`, and `/homework-submissions/:id/file`:
     - Require authentication.
     - Verify teacher ownership, student active enrollment and lesson unlock, or parent linkage before issuing presigned download URLs or streaming bytes.
