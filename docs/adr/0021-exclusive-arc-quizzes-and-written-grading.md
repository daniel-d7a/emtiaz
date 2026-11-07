# ADR-0021: Exclusive-arc quizzes on course/module/lesson and teacher-graded written questions

Date: 2026-11-07

Quizzes attach to any curriculum level (`course`, `module`, or `lesson`) via an exclusive-arc check constraint on `quizzes` (`(lesson_id IS NOT NULL)::int + (module_id IS NOT NULL)::int + (course_id IS NOT NULL)::int = 1`) with multiple quizzes per target ordered by `display_order`, and support `WRITTEN` questions alongside `MCQ` and `TRUE_FALSE`. Unlike the removed `SHORT_ANSWER` type (which attempted brittle exact-string auto-grading in Arabic), `WRITTEN` questions store a model answer, use their configured `quiz_questions.points` (defaulting to `10`), and keep the attempt in `pending = true` until the course-owning teacher manually assigns a score (`0..points` in `written_grades`).

## Consequences

- **Quiz edits reset attempts with confirmation**: Editing an existing quiz replaces its questions and deletes prior `quiz_attempts` so stored attempt scores never drift from the current question set; the teacher UI warns and requires confirmation before saving edits to an existing quiz.
- **Pending attempts and grade averages**: Attempts with `pending = true` are excluded from numeric grade averages (`StudentService.home`, `ParentService.averageGrade`, `TeacherService.groupStats`) until graded. Best-attempt selection prefers the highest graded (`pending = false`) attempt and falls back to the latest `pending = true` attempt only when no graded attempt exists.
- **Canonical grade average**: Student, Parent, and Teacher views compute a student's group grade percentage from graded (`pending = false`) best attempts on visible quizzes plus non-null manual grade columns, treating unattempted quizzes and empty manual cells as ungraded rather than zero.
