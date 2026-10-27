# 16: Quiz builder

**What to build:** A modal launched from the unit header builds a quiz: name, questions with image and/or text, a radio button marking the correct answer, and 2–4 MCQ options. Quizzes appear as small items beside lessons and reorder among them. The unit-quiz visibility bug is fixed.

**Blocked by:** 14.

**Status:** done

- [x] Quiz creation is a modal with better placeholders and full-width, single-column answer inputs.
- [x] MCQ supports 2–4 options; true/false is supported; the correct answer is chosen by radio.
- [x] A question can be text-only, image-only, or text plus image.
- [x] Created quizzes appear in the unit, reorder with lessons, and remain visible after reload.
- [x] Short-answer questions are not offered.

## Comments

- 2026-10-27: Shipped in `b4efcb7`. The course, unit, and lesson quiz builders are now one modal launched by a small trigger; the unit header launches its quiz. Question text and options are stacked single-column, MCQ options are capped at 2–4, and correctness is chosen with a radio for both MCQ and true/false. A question can be text-only, image-only, or both; images upload to `courses/<courseId>/quiz/…` (5 MB max) and are signed on read.
- Unit quizzes now render as small items among lessons. Reordering writes `lessons.display_order` and `quizzes.display_order` through `PUT /api/teacher/modules/:moduleId/items/reorder` (migration `20261027083816_good_smasher`), and the student curriculum uses the same order.
- Existing questions now load into the modal instead of starting empty, and saving invalidates the curriculum so the quiz appears immediately after reload.
- Tests: backend 106 pass (reorder persistence, image-only question, cross-course image denial), frontend 14 pass, backend/frontend/mobile typechecks pass, frontend build passes, fresh migrate + seed on `emtiaz_verify` pass.
- Visual breakpoint check still outstanding (impeccable unavailable).
