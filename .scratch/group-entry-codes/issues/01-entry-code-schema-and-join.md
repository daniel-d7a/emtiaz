# 01: Group entry codes and join enforcement

**What to build:** A teacher can mark a group as requiring an entry code. When required, a student must provide both the group code and a valid entry code to join. Each entry code has a teacher-set maximum number of uses, records who used it and when, and stops working once exhausted. Re-joining a group already joined does not consume a use.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] Groups expose a `requiresEntryCode` setting.
- [x] Teachers can generate unique 6–8 character entry codes with a minimum `maxUses` of 1.
- [x] Joining a code-required group rejects missing, wrong, or exhausted entry codes.
- [x] A successful join increments the used count and records the student and timestamp.
- [x] The same student cannot consume the same entry code twice.
- [x] Students can join without an entry code when the group does not require one.
- [x] Backend specs cover allow/deny, exhaustion, and re-join behaviour.
