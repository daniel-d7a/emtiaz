# ADR-0011: Parents link to students by the student's phone number

Date: 2026-10-25
Updated: 2026-10-27

## Decision
- Add `PARENT` to the `role` enum. Parents sign up at `/api/onboarding/parent`
  (or the web register form) with name, email, password, and optional phone.
- `POST /api/parent/link` resolves an active `STUDENT` by their registered
  phone number and attaches the parent. Links are many-to-many and idempotent
  (`parent_students` unique pair).
- Parents get read-only views: `GET /api/parent/students` (children, groups,
  progress) and `GET /api/parent/students/:studentId/groups/:groupId/grades`.
  They cannot call student write endpoints (quiz submit, lesson complete, join).
- The earlier private-invite-code design was removed pre-launch. There is no
  parent invite code column or rotation endpoint.

## Rationale
- A separate link table keeps one parent able to follow siblings and one student
  able to have two parents, without changing the `user` table further.
- Reusing `StudentService.myGroups` / `myGrades` after an ownership check keeps
  parent and student numbers identical by construction.
- Phone possession is the product's current proof of relationship. It is
  simpler than invite-code distribution and matches how Omani families share a
  student's registered number.

## Consequences
- Anyone who knows an active student's registered phone number can link to that
  student and read their grades. Add an OTP challenge before linking if abuse
  appears.
- Soft-deleted or suspended students cannot be linked.
- Parent UI exists on web and mobile: link/unlink children, see groups and
  progress, and open quiz/manual grades. Parents remain read-only and cannot
  call student write endpoints or read lessons/attachments.
- Enrollment and move notices go to the linked parent's in-app inbox. The
  monthly summary additionally uses email and WhatsApp when configured.
