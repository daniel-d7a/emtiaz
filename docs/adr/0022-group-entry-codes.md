# ADR-0022: Two-factor cohort enrollment via public joinCode and usage-capped entryCode

Date: 2026-11-07

A group's `join_code` is a public cohort identifier shared in WhatsApp links and storefronts, so it cannot stop unauthorized students from joining when a link is forwarded. When a group sets `requires_entry_code = true`, joining requires both the group's `join_code` and a teacher-generated `group_entry_codes` code (`max_uses`), with first-use consumption tracked per `(entry_code_id, student_id)` in `group_entry_code_uses` inside a transaction so re-joining an existing group never burns an extra seat.
