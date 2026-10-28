# 20: Group statistics tab

**What to build:** A Stats tab for each group: start date, lessons taken/total and percentage, the same for units, an attendance chart across lessons, average grade per quiz, per-student totals for grade and attendance, and a podium ordered by combined average.

**Blocked by:** 17, 19.

**Status:** done

- [x] Start date and lesson/unit completion totals are correct.
- [x] Attendance and average-quiz-grade charts render with readable Arabic labels.
- [x] Each student row shows total grade percentage and attendance percentage.
- [x] The podium orders students by the combined average.
- [x] Empty groups and groups with no quizzes show sensible states.

## Close-out notes

- "Lessons/units taken" means at least one enrolled student completed a lesson/unit.
- Student grade totals use best quiz score over all quiz max points; combined average averages grade and attendance when quizzes exist, otherwise attendance.
- Charts are dependency-free CSS bars with horizontal scroll and accessible titles.
