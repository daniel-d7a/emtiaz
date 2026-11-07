# 08: Fix Attendance Denominator, Hidden Lesson Scoping & Attachment Privacy

**Status:** done
**Blocked by:** None

## What to build

1. **Attendance Percentage Denominator (`backend/src/modules/parent/parent.service.ts`, `backend/src/modules/admin/admin.service.ts`, `backend/src/modules/teacher/teacher.service.ts`)**:
   - In `ParentService.attendance`, `AdminService.studentProfile`, `TeacherService.groupStats`, and `TeacherService.gradebook`:
     - Count total visible lessons in the group where attendance was recorded for that student (`isPresent = true | false`) as `marked`.
     - Divide `present` (`isPresent = true` on visible lessons) by `marked`. If `marked === 0`, return `0` (or `0/0`).
2. **Exclude Hidden Lessons & Hidden Quizzes from Teacher Views**:
   - In `TeacherService.gradebook`, filter out lessons where `group_lesson_access.isHidden = true` and quizzes where `group_quiz_access.isHidden = true`.
   - In `TeacherService.groupStats`, exclude hidden lessons and hidden quizzes from lessons taken, units taken, attendance rows, and quiz averages.
   - In `TeacherService.listCourses`, calculate `group.progress` excluding hidden lessons.
3. **Group-Scoped Lesson Attachments (`backend/src/modules/student/student.service.ts`)**:
   - In `StudentService.getLesson`, return group-specific attachments (`a.groupId !== null`) only if `a.groupId === requestedGroupId` (or, if `groupId` is omitted, only if `a.groupId` belongs to an enrolled group where the lesson is unlocked and non-hidden).

## Acceptance Criteria
- A student present at 1 of 1 held sessions in a 20-lesson course displays 100% attendance (1/1), not 5% (1/20).
- Lessons and quizzes marked as hidden for a group do not appear in that group's teacher gradebook columns or group stats.
- A group-specific attachment from Group A is never returned to a student in Group B where that lesson is locked or hidden.

## Resolution
- **Attendance Percentage Denominator**: Updated `ParentService.attendance`, `AdminService.studentProfile`, `TeacherService.groupStats`, and `TeacherService.gradebook` to count only marked sessions (`isPresent = true | false`) on visible lessons as the denominator. Students with 1 of 1 held visible sessions now show 100% attendance (or { present: 1, total: 1, percent: 100 }). If `marked === 0`, percentage defaults to 0.
- **Hidden Lesson & Quiz Scoping**:
  - `TeacherService.gradebook`: Excludes lessons where `groupLessonAccess.isHidden === true` and quizzes where `groupQuizAccess.isHidden === true` (or attached to hidden lessons). Calculates attendance percentage against visible held lessons.
  - `TeacherService.groupStats`: Excludes hidden lessons and quizzes from `lessons.total`, `lessons.taken`, `units.taken`, `attendance` per-lesson rows, `quizAverages`, and student attendance percentages.
  - `TeacherService.listCourses`: Groups calculate `progress` denominator excluding hidden lessons.
- **Group-Scoped Lesson Attachments**: Updated `StudentService.getLesson` to only return group-specific attachments (`groupId !== null`) matching the requested `groupId`, or (when omitted) belonging to an enrolled group where the lesson is unlocked and visible. Group attachments from other groups do not leak.
- **Verification**: Verified with comprehensive unit and integration tests across `parent.spec.ts`, `admin.spec.ts`, `student.spec.ts`, and `teacher.spec.ts` (all 102 tests passed in band), and confirmed clean TypeScript compilation (`npm run typecheck` passed for both backend and frontend).
