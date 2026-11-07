# 07: Fix Quiz Points, Written Grading, Pending Attempts & Grade Averages

**Status:** done
**Blocked by:** None

## What to build

1. **`WRITTEN` Question Points & Validation (`backend/src/modules/student/student.service.ts`, `backend/src/modules/teacher/teacher.service.ts`, `backend/src/lib/schemas.ts`)**:
   - Schema and DTO set default `points = 10` for `WRITTEN` questions if unspecified.
   - `submitQuiz` adds `question.points` (instead of fixed 10) to `maxScore` for `WRITTEN` questions.
   - `gradeQuizAttempt` validates each written grade against `0 <= grade <= question.points` (instead of fixed 10).
   - `groupStats` calculates question totals using `question.points` for written questions as well.
2. **Pending Written Attempts & Best Score Selection**:
   - `bestAttempt` calculation in `StudentService.curriculum`, `StudentService.getGroupQuiz`, and `TeacherService.gradebook` ranks attempts by graded first (`pending = false`) by score descending, falling back to the latest `pending = true` attempt only if no graded attempt exists.
   - `StudentService.home`, `ParentService.averageGrade`, and `TeacherService.groupStats` exclude `pending = true` attempts from numeric percentage calculations.
3. **Canonical Grade Average Formula**:
   - Unify group grade average across Student, Parent, and Teacher views: sum of student's best graded attempt scores + non-null manual column scores divided by sum of max scores of those attempted/graded items.
   - Unattempted visible quizzes and empty manual cells are treated as ungraded (`null`), not zero.
4. **Quiz Edit Confirmation Modal (`frontend/`, `mobile/`)**:
   - When a teacher edits an existing quiz in the Quiz Builder, show a confirmation dialog before submitting: *"Editing this quiz will clear all previous student attempts. Are you sure you want to continue?"*.

## Acceptance Criteria
- `WRITTEN` questions with custom points (e.g., 5 or 20) compute max scores and validate teacher grades properly.
- A student with an ungraded `pending = true` attempt does not suffer a 0% drop in their home, parent, or group stats grade averages.
- Teacher `groupStats`, student `home`, and parent `averageGrade` produce the exact same grade percentage for the same student and group.
- Teacher UI displays confirmation before saving quiz edits.

## Resolution
- Updated `QuizQuestionDto` in `backend/src/lib/schemas.ts` to default `points` to 10 for `WRITTEN` questions (and 1 for objective questions).
- Updated `GradeQuizAttemptDto` in `backend/src/lib/schemas.ts` to remove hardcoded max 10.
- Updated `TeacherService.gradeQuizAttempt` to validate `0 <= grade <= (question.points ?? 10)` and throw `BadRequestException` on out-of-bounds grades.
- Updated `StudentService.submitQuiz` to add `q.points ?? 10` to `maxScore`.
- Updated `StudentService.curriculum`, `StudentService.attemptResult` (used by `getGroupQuiz`), `StudentService.myGrades`, and `TeacherService.gradebook` to resolve `bestAttempt` by ranking graded attempts (`pending === false`) by score descending, falling back to the latest `pending === true` attempt only when no graded attempt exists.
- Unified canonical grade percentage calculation in `TeacherService.groupStats`, `StudentService.home`, and `ParentService.averageGrade`: sum of student's best graded quiz attempt scores + non-null manual column scores divided by the sum of max scores of those attempted items. Excluded `pending === true` attempts and unattempted quizzes so unreviewed submissions do not pull averages to 0%.
- Added quiz edit confirmation modals in both web (`frontend/src/pages/teacher/Curriculum.tsx`) and mobile (`mobile/src/screens/TeacherCurriculum.tsx`) warning teachers that saving edits clears previous student attempts. Added points input and dynamic grade bounds display in teacher grading interfaces.
- Verified with integration tests in `backend/src/modules/teacher/teacher.spec.ts`, `backend/src/modules/student/student.spec.ts`, and `backend/src/modules/parent/parent.spec.ts`. All typechecks pass across backend, frontend, and mobile.
