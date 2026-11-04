# 54: Phone-first login and registration

**What to build:** Make phone number the primary login and registration identifier. A student created when added to a group gets a dummy password and can sign in with their phone; they must change the password after first login. Existing phone-only students must be able to sign in too.

**Blocked by:** None (can start immediately).

**Status:** done

- [ ] Login accepts a phone number and password.
- [ ] Registration uses phone as the primary field for students; email is optional.
- [ ] Students created by a teacher are given a login account with a dummy password.
- [ ] A student signing in with a dummy password is forced to set a new password before using the app.
- [ ] Existing phone-only students without credentials can sign in or are migrated.
- [ ] Wrong phone/password and duplicate phone cases show clear Arabic and English errors.
- [ ] Access rules in `docs/security.md` still hold.
- [x] Logic verified by tests; visual QA skipped by request.
