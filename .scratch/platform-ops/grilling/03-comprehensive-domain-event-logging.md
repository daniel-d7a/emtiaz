# 03: Comprehensive Domain Event Logging & Filterable Audit Dashboard

**Type:** grilling
**Status:** resolved
**Blocked by:** None

## Question

How should the domain audit trail be expanded across all LMS entities, and how should administrators inspect it? Specifically:
1. What exact domain actions must be explicitly recorded beyond raw HTTP interceptor logs?
2. How should the actions list / config file be structured so that developers and admins know what events are logged, and how are user ID and timestamp guaranteed on every record?
3. How should the Admin Audit interface in `frontend/src/pages/admin/Audit.tsx` be upgraded (search by User ID, category filters, action badges)?

## Answer

1. **Centralized Audit Events Registry / Config File (`shared/audit-events.ts`)**:
   - A single typed source of truth defining all logged domain actions:
     - `Curriculum`: `course.create`, `course.update`, `course.delete`, `lesson.create`, `lesson.update`, `lesson.delete`.
     - `Quizzes`: `quiz.create`, `quiz.update`, `quiz.delete`, `quiz.submit`.
     - `Cohorts`: `group.create`, `group.update`, `group.delete`, `student.enroll`, `student.remove`, `entry_code.generate`, `attendance.mark`.
     - `Homework`: `homework.create`, `homework.update`, `homework.delete`, `homework.submit`, `homework.grade`, `homework.revision_request`.
     - `Users & Auth`: `user.password.reset`, `user.status`, `user.delete`, `user.restore`.
     - `Billing`: `plan.create`, `plan.update`, `promo_code.create`, `promo_code.update`, `teacher.subscription.assign`, `teacher.gift.grant`.
   - Each registry entry specifies category, bilingual label (Arabic & English), target type, and payload keys.
2. **User Data & Timestamp Guarantee**:
   - Every audit record explicitly persists:
     - `actorId` (non-nullable user ID of the actor)
     - `createdAt` (exact timestamp of action)
     - `action` (canonical action string from registry)
     - `targetType` & `targetId` (ID of the affected course, lesson, quiz, group, homework, or user)
     - `metadata`: sanitized payload with changes diff (passwords and tokens automatically redacted).
3. **Admin Audit Dashboard Upgrades (`frontend/src/pages/admin/Audit.tsx`)**:
   - **User ID Search**: Dedicated input to filter logs directly by `userId` (actor ID or target user ID).
   - **Category Filters**: Dropdown to filter by `All`, `Curriculum`, `Cohorts`, `Quizzes`, `Homework`, `Users & Billing`, `Auth`.
   - **Action Badges**: Color-coded badges with clear Arabic labels.
   - **Detail Modal**: Clickable rows opening an event inspection drawer displaying exact timestamp, actor info, endpoint, and formatted JSON metadata.
