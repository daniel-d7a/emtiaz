# 67: Failed image save can orphan an uploaded object

**What to build:** Clean up the uploaded R2 object when the follow-up API call fails. Course, banner, and avatar uploads currently upload first and then save the object key; if the save fails, the uploaded file is unreachable and never deleted.

**Blocked by:** None.

- [x] Failed course image, banner, or avatar saves remove the just-uploaded object.
- [x] Cleanup failure is best-effort and does not hide the original error.

**Status:** done
