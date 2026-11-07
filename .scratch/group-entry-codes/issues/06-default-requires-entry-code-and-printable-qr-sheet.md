# 06: Default requiresEntryCode on New Groups & Printable Entry Code QR Cards

**What to build:** Change the default of `requiresEntryCode` on newly created groups to `true` across schema, backend service, and UI forms. Add a "Print QR Codes / طباعة رموز الدخول" button on the teacher's group Entry Codes tab (web and mobile) that opens a print-optimized sheet rendering individual printable cards (group name, join code, unique entry code, uses, and scannable QR code encoding the direct join link), triggering browser print.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] `groups.requiresEntryCode` schema default is changed to `true` (with migration) and `TeacherService.addGroup` defaults `requiresEntryCode` to `true` when omitted.
- [x] New Group creation form (`NewGroup.tsx` and mobile) defaults the `requiresEntryCode` toggle/checkbox to checked/true.
- [x] Group Entry Codes tab displays a "Print QR Codes / طباعة رموز الدخول" button alongside the code generator.
- [x] Clicking the button opens a print-friendly dialog rendering a grid of printable cards with the group title, join code, entry code text, usage limit, and QR code generated via `qrcode` targeting `/join/<joinCode>?entry=<code>`.
- [x] Provides a "Print / طباعة" button triggering `window.print()` with `@media print` CSS hiding navigation/backgrounds and formatting clean card cutouts.
- [x] Integration tests verify the new group default and UI components render QR codes properly.
