# 11: Student quiz experience

**What to build:** A quiz page with one-column, full-width answers, a submit confirmation, and a result view showing the grade and correct answers. Reopening an already-submitted quiz shows the answers instead of allowing a re-solve.

**Blocked by:** 01, 02, 04.

**Status:** done

- [x] MCQ answers render full width in a single column; true/false is equally usable.
- [x] Submit asks for confirmation, then shows the score and correct answers.
- [x] A second visit shows the previous result and answers, not a fresh form.
- [x] Enrollment and lesson-unlock rules are enforced on the server, including direct URL access.

## Comments

- 2026-10-27: Shipped in `418282c`. Added `/student/groups/<groupId>/quizzes/<quizId>` with full-width single-column MCQ options, equally sized true/false buttons, a confirmation dialog, and a result view showing the score, every given answer, every correct answer, and explanations.
- Reopening a submitted quiz renders the stored best attempt instead of a fresh form. The group quiz payload now includes `attempt` (answers, score, submitted result).
- Server-side lesson-unlock checks now cover direct and group quiz reads plus submissions, so a locked lesson quiz cannot be reached straight from its API URL. Enrollment/course checks remain.
- Group and lesson quiz cards now link to the quiz page, show completion state, and show the stored score when available.
- Tests: student spec covers locked lesson quiz direct/group/submit rejection and reopening with stored answers. Backend 102 tests, frontend 14 tests, all typechecks/builds pass.
- Visual breakpoint check still outstanding (impeccable unavailable).
