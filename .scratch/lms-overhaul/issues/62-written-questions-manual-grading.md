# 62: Written questions and manual grading

**What to build:** Add written-answer questions to quizzes. They have a model answer but are not auto-graded. The teacher opens any student submission to view it and grades written answers with a number out of 10. A quiz with written questions stays pending at student until graded.

**Blocked by:** 61.

**Status:** done

- [x] A teacher can add a written-answer question with a prompt and model answer.
- [x] A student can type and submit a written answer.
- [x] Objective questions still grade automatically.
- [x] A quiz with written answers is pending until the teacher grades it.
- [x] The teacher can open any student submission, see all answers, and enter a grade out of 10.
- [x] Grading updates the student's result and removes the pending state.
- [x] Only the owning teacher can grade.
- [x] Access rules in `docs/security.md` still hold.
- [x] Logic verified by tests; visual QA skipped by request.
