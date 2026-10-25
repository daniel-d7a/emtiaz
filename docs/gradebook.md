# Gradebook: quiz columns vs manual columns

The teacher gradebook (`/api/teacher/groups/:groupId/gradebook`) is a grid of
students × columns. There are two kinds of columns, and they are stored
differently on purpose.

## Quiz columns (derived)

- Source: `quizzes` attached to lessons of the group's course.
- Column header: the lesson title; `maxScore` is the sum of that quiz's
  `quiz_questions.points`.
- Cell value: the **best** `quiz_attempts.score` for that student and quiz in
  this group (not the latest). Attempts are written by the quiz flow, never by
  the gradebook.
- No row is created until the student attempts the quiz; an empty cell means
  "not attempted", not zero.
- Shape returned by the API: `quizColumns[]` + `quizCells["<studentId>:<quizId>"]`.

## Manual columns (teacher-entered)

Two tables:

### `manual_grade_columns`

| Column | Meaning |
|---|---|
| `group_id` | Owning group (cascade delete with the group) |
| `title` | Free text, e.g. "Speaking Test 1" |
| `max_score` | Integer, default `10`; displayed in the student view |
| `display_order` | Position in the grid; new columns append |

### `manual_grade_values`

| Column | Meaning |
|---|---|
| `column_id` | Manual column (cascade delete with the column) |
| `student_id` | Student (cascade delete with the user) |
| `score` | Integer, required, validated `0..1000` by the API DTO |
| `teacher_note` | Optional note, max 500 chars |
| `updated_at` | Last write |

One row per `(column_id, student_id)` — enforced by
`unique_manual_grade_cell_idx`. Setting a cell upserts on that pair.

- Shape returned by the API: `manualColumns[]` + `manualCells[]` with
  `{ columnId, studentId, score, note }`.
- A missing row means "no mark entered yet"; the grid renders an empty input.
- The API rejects a score above the column's `max_score` (400) and also caps
  input at `0..1000`.
- The grid writes on blur via `PUT /gradebook/cell` with
  `{ columnId, studentId, score, note? }`; `score: null` deletes the mark.
  Deleting a column cascades its values.

## Student view

`GET /api/student/groups/:groupId/grades` returns the student's own best quiz
attempts plus every manual column for the group, with `score: null` and
`note: null` when no mark exists. Students never see other students' marks.

## Known gaps

- Quiz columns show every quiz in the course, even if the group has not unlocked
  the lesson yet; the attempt is what decides whether a cell has a value.
