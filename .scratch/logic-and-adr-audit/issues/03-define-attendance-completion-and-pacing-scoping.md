# 03: Define Attendance, Lesson Completion & Pacing Scoping Across Groups

**Type:** grilling
**Status:** resolved
**Blocked by:** None

## Question

How should attendance, lesson completions, and pacing/visibility be scoped and calculated per group? Specifically:

1. **Attendance Percentage Denominator (`ParentService.attendance`, `AdminService.studentProfile`, `TeacherService.groupStats`, `TeacherService.gradebook`)**:
   - Currently, every attendance percentage divides `isPresent = true` rows by **all lessons in the course** (so if a course has 20 lessons and the teacher has only taken attendance for Lesson 1 where the student was present, the student's attendance shows `5%` instead of `100%`).
   - Should a student's attendance percentage in a group divide `present` by the number of visible lessons in that group where attendance has been recorded (`isPresent = true` or `false`) for that student?
2. **Group Scoping for `lesson_attendance` and `lesson_completions`**:
   - Currently, `lesson_attendance(lesson_id, student_id)` and `lesson_completions(lesson_id, student_id)` have no `group_id`. Should they remain per `(lesson_id, student_id)` so moving groups within the same course preserves progress and attendance?
3. **Hidden Lessons & Hidden Quizzes in Teacher `gradebook`, `groupStats`, and `listCourses`**:
   - Should hidden lessons and hidden quizzes for a group be excluded from that group's `gradebook`, `groupStats`, and `listCourses` progress calculation?
4. **Scoping Student Lesson Attachments to Unlocked Visible Groups**:
   - Should `StudentService.getLesson` filter group-specific attachments (`a.groupId`) to the passed `groupId` (or, when `groupId` is omitted, only to enrolled groups where the lesson is both visible and unlocked)?

## Answer

1. **Attendance Percentage Denominator (`present / marked`)**:
   - Across `ParentService.attendance`, `AdminService.studentProfile`, `TeacherService.groupStats`, and `TeacherService.gradebook`, a student's attendance percentage in a group divides `present` (`isPresent = true` on visible lessons) by `marked` (total visible lessons in that group where an attendance row `isPresent = true | false` has been recorded for that student). When `marked === 0`, attendance percentage is `0` (`0/0` in Parent view).
2. **Course-Level Keying for `lesson_attendance` and `lesson_completions`**:
   - Keep `(lesson_id, student_id)` on both `lesson_completions` and `lesson_attendance` so moving a student between groups of the same course preserves their completed lessons and attendance history, while always evaluating visibility/unlock rules against the specific group being viewed.
3. **Exclude Hidden Lessons & Quizzes Everywhere**:
   - Group-hidden lessons (`group_lesson_access.is_hidden = true`) and group-hidden quizzes (`group_quiz_access.is_hidden = true`) are excluded from `TeacherService.gradebook`, `TeacherService.groupStats`, and `TeacherService.listCourses` group progress so Teacher, Student, and Parent views always agree.
4. **Prevent Cross-Group Attachment Leakage in `StudentService.getLesson`**:
   - In `StudentService.getLesson`, group-specific attachments (`a.groupId !== null`) are returned only when `a.groupId` matches the requested `groupId` (or, if `groupId` is omitted, only when `a.groupId` belongs to an enrolled group where that lesson is both visible and unlocked).
