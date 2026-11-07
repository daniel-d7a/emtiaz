# 02: Define Student & Storage Limit Calculation and Upgrade Modal UX

**Type:** grilling
**Status:** resolved
**Blocked by:** [01: Define Plan Catalog & Subscription Snapshot Model](01-plan-catalog-and-snapshot-model.md)

## Question

How are a teacher's usage metrics calculated and enforced across web, mobile, and backend APIs? Specifically:
1. How is "monthly unique students across active groups" defined and computed (e.g., distinct `studentId` enrolled in non-deleted groups with `isActive = true` owned by the teacher, or a rolling/calendar-month high-water mark so archiving/re-creating groups mid-month cannot game the limit)?
2. How is lesson file storage (`maxStorageBytes`) calculated (sum of `lessonAttachments.fileSizeBytes` across all non-deleted courses owned by the teacher, excluding external `LINK`s, plus or minus quiz question images)?
3. What exact actions are blocked when a teacher reaches their student limit or storage limit (e.g., student attempting to join a group via join/entry code vs. teacher generating entry codes / importing roster / uploading a lesson attachment), and what does the student vs. teacher see when blocked?
4. What does the teacher's Upgrade Modal show when a limit is hit on `Free` vs. `Pro` vs. `Ultimate`?

## Answer

1. **`Active Student Count` calculation**:
   - Count of distinct non-deleted `student_id`s in `group_students` across all non-deleted groups (`groups.deleted_at IS NULL`, `courses.deleted_at IS NULL`) owned by the teacher where `groups.is_active = true`, **unioned** with any distinct `student_id`s who joined (`group_students.joined_at >= start_of_current_calendar_month`) any of the teacher's groups during the current calendar month.
2. **`Lesson Storage Usage` (`usedStorageBytes`) calculation**:
   - Sum of `lesson_attachments.file_size_bytes` across all non-deleted courses (`courses.deleted_at IS NULL`) owned by the teacher (excluding external `LINK` rows, profile avatars/banners, and quiz images).
3. **Limit Enforcement Points**:
   - **Teacher actions** (when breached, API returns a structured `PLAN_LIMIT_REACHED` error and UI opens the **Upgrade Modal**):
     - Importing a student roster on group creation when the new unique students would push `activeStudentCount > maxStudents`.
     - Generating a `group_entry_code` when `activeStudentCount >= maxStudents` or when `activeStudentCount + maxUses > maxStudents`.
     - Reactivating an archived group (`is_active: false -> true`) when its students would push `activeStudentCount > maxStudents`.
     - Requesting/creating a lesson attachment upload when `usedStorageBytes + fileSizeBytes > maxStorageBytes`.
   - **Student action (`POST /api/student/groups/join`)**:
     - If a new unique student for that teacher tries to join when `activeStudentCount >= maxStudents`, reject with a polite student-facing capacity message (*"This group has reached its maximum capacity — please contact your teacher"*) and send an in-app notification to the teacher prompting them to upgrade.
4. **Upgrade Modal & Anti-Griefer First-Month Limit-Crossing Discount**:
   - Shows which limit was hit (`X / Y students` or `X / Y GB`), lists all public higher plans in the teacher's `Country` currency (`OMR` or `EGP`), and provides a primary **Contact Administration on WhatsApp** button + Promo Code link.
   - If the teacher crosses the limit of the highest tier (`Ultimate`, or `Early Bird`'s 500 students / 100 GB), prompts them to **Contact Administration for a Custom Plan**.
   - **First-Month Limit-Crossing Discount**: Teachers who cross their plan limit receive the yearly-discounted monthly rate on their first month of a higher tier (`Pro`: `10 → 7 OMR` / `500 → 300 EGP`; `Ultimate`: `25 → 20 OMR` / `1500 → 1000 EGP`), regardless of whether `yearlyPlanDiscountEnabled` is globally enabled.
   - **Discount Ledger (`teacher_discounts`)**: Every discount or gift granted to a teacher is recorded with its `occasion` (e.g., `LIMIT_CROSS_PRO`, `LIMIT_CROSS_ULTIMATE`, `EARLY_BIRD_TRIAL`, `PROMO_CODE`, `REFERRAL_GIVER`, `REFERRAL_TAKER`), plan, amount/days, and timestamp so a teacher can never claim the same limit-crossing discount or one-time offer twice ("no griefers"). Admin can see the teacher's full discount history when assigning a subscription.
