# 19: Gradebook

**What to build:** A readable gradebook: sticky student column and header, two-axis scrolling, export at the top, a default attendance column, and grade-column management in group settings. Grades exist only for attendance and quizzes, not units or lessons.

**Blocked by:** 17.

**Status:** done

- [x] Student names and the header stay fixed while scrolling both directions.
- [x] CSV export sits at the top and keeps Arabic readable.
- [x] Attendance is a default column; custom columns are added/deleted from settings with confirmation.
- [x] Unit and lesson rows no longer show grades.
- [x] Values are right-aligned with tabular numerals and correct in RTL.

## Close-out notes

- Attendance is a read-only percentage computed from `lesson_attendance` against course lessons, consistent with the parent view.
- Gradebook has one column per quiz plus manual columns; there are no unit or lesson grade rows.
