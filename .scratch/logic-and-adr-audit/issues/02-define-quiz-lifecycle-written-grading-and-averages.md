# 02: Define Quiz Lifecycle, Written Grading & Grade Average Rules

**Type:** grilling
**Status:** resolved
**Blocked by:** None

## Question

What are the exact domain rules for quiz editing, `WRITTEN` question scoring, `pending` attempts, and grade average calculations across Teacher, Student, and Parent views? Specifically:

1. **Editing a Quiz with Existing Student Attempts (`TeacherService.updateQuiz` & `upsertQuizFor`)**:
   - Currently, editing a quiz's title or questions executes `DELETE FROM quiz_attempts WHERE quiz_id = ...`, silently wiping all student submissions and grades across every group.
   - How should quiz edits behave when attempts already exist?
2. **`WRITTEN` Question Points vs. Fixed `10` Max Score (`TeacherService.groupStats` bug)**:
   - Currently, `submitQuiz`, `gradeQuizAttempt`, and `gradebook` hardcode `WRITTEN` questions to a max score of `10` (ignoring `quiz_questions.points`), while `TeacherService.groupStats` sums `quiz_questions.points` (default `1`), corrupting `quizAverages` and `gradePercent`.
   - Should `WRITTEN` questions use their configured `quiz_questions.points` everywhere (defaulting to `10` when created, and validating teacher grades as `0..question.points`), or always be fixed at `10` points everywhere?
3. **Ungraded (`pending = true`) Attempts in Best Score & Grade Averages**:
   - Should `pending` attempts be excluded from numeric grade averages (`StudentService.home`, `ParentService.averageGrade`, `TeacherService.groupStats`) until `pending = false`? And if a student has both a graded attempt and a newer `pending` attempt, which one is shown as `bestAttempt` / in the gradebook?
4. **Unifying the Grade Average Denominator Across Teacher, Student, and Parent**:
   - What is the single canonical formula for a student's group grade percentage across Student, Parent, and Teacher views?

## Answer

1. **Quiz Edit Confirmation & Attempt Reset**:
   - Saving edits to an existing quiz continues to replace `quiz_questions` and delete previous `quiz_attempts`, but the teacher UI (web and mobile) **must warn the teacher with a confirmation dialog** stating that saving changes to the quiz will erase previous student attempts before calling `updateQuiz`.
2. **`WRITTEN` Question Points (`question.points`, default `10`)**:
   - `WRITTEN` questions use their configured `quiz_questions.points` (defaulting to `10` when created) everywhere (`submitQuiz`, `gradeQuizAttempt`, `gradebook`, and `groupStats`).
   - Teacher manual grading (`gradeQuizAttempt`) validates each written grade against `0 <= grade <= question.points` instead of a hardcoded `10`.
3. **Ungraded (`pending = true`) Attempts**:
   - `pending = true` attempts are **excluded** from numeric grade averages (`StudentService.home`, `ParentService.averageGrade`, `TeacherService.groupStats`) until the teacher finishes grading them (`pending = false`).
   - Best-attempt selection (`bestFor` and `gradebook`) prefers the highest-scoring **graded** (`pending = false`) attempt when one exists, falling back to the latest `pending = true` attempt only when no graded attempt exists.
4. **Unified Canonical Grade Average**:
   - Teacher (`groupStats`), Student (`home`), and Parent (`averageGrade`) all use the same canonical formula for a student's group grade percentage: the mean percentage across **visible (non-hidden) quizzes where the student has a graded (`pending = false`) attempt** plus **manual grade columns with a non-null score (`score !== null`)**. Unattempted/locked quizzes and empty manual grade cells are treated as ungraded (`null`), never `0%`.
