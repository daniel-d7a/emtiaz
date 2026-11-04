# 53: New group page

**What to build:** Move group creation to its own page. The page captures the group name, time, days as a multi-select, and a list of students entered as name + phone. A student is added to the group if the phone already exists, or created and then added if it does not.

**Blocked by:** 54.

**Status:** done

- [ ] Creating a group opens a dedicated page, not an inline form.
- [ ] The form captures name, time, and multiple days.
- [ ] The student rows accept name and phone and can be added/removed before saving.
- [ ] Existing phones are enrolled without creating duplicates.
- [ ] New phones create a student who can sign in after ticket 54.
- [ ] Saving shows a clear success state and returns to the course groups list.
- [x] Logic verified by tests; visual QA skipped by request.
