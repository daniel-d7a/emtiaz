# ADR-0011: Parents link to students by the student's unique Monitoring Code and QR

Date: 2026-10-25
Updated: 2026-11-07

## Decision
- Add `PARENT` to the `role` enum. Parents sign up at `/api/onboarding/parent`
  (or the web register form) with name, email, password, and phone number.
- Every `STUDENT` receives a unique `monitoring_code` (displayed alongside a QR
  code on the student's profile page).
- `POST /api/parent/link` resolves an active `STUDENT` by their `monitoring_code`
  (entered manually or scanned via QR) and attaches the parent. Links are
  many-to-many and idempotent (`parent_students` unique pair).
- Parents get read-only views: `GET /api/parent/students` (children, groups,
  progress, attendance, average grade, reports) and
  `GET /api/parent/students/:studentId/groups/:groupId/grades`. They cannot call
  student write endpoints (quiz submit, lesson complete, join).

## Rationale
- A separate link table keeps one parent able to follow siblings and one student
  able to have two parents, without changing the `user` table further.
- Reusing `StudentService.myGroups` / `myGrades` after an ownership check keeps
  parent and student numbers identical by construction.
- Linking by a dedicated student `monitoring_code` (and QR code on the student's
  profile) prevents anyone who merely knows a student's phone number from
  linking to their account and reading their grades.

## Consequences
- Soft-deleted or suspended students cannot be linked.
- Parent UI exists on web and mobile: link/unlink children by monitoring code or
  QR scan, see groups and progress, and open quiz/manual grades. Parents remain
  read-only and cannot call student write endpoints or read lessons/attachments.
- Enrollment and move notices go to the linked parent's in-app inbox. The
  monthly summary additionally uses email and WhatsApp when configured.
