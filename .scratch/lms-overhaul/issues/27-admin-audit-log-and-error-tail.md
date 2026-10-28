# 27: Admin audit log and error tail

**What to build:** A robust activity log that records model changes and endpoint calls with the actor, touched model/endpoint, action, request data, and response type, retained for at least 30 days. The admin tab filters by user type, model/endpoint, action, and actor (including phone). A separate viewer tails the last 500 lines of the error file, polling every few seconds.

**Blocked by:** 21.

**Status:** done

- [x] Mutating admin/teacher/student actions write an audit row with actor and action data.
- [x] Logs are queryable with the listed filters and retained for at least 30 days.
- [x] Sensitive values (passwords, tokens) never appear in the log.
- [x] The error viewer shows the last 500 lines and refreshes automatically.
- [x] Logging failures never break the primary request.
