# 59: Marquee repeat logic by width

**What to build:** Make the marquee repeat count depend on how wide the text is relative to the screen. At 70% or more of screen width show 2 copies, below 50% show 3, below 30% show 4. Measure after fonts load and recompute on resize.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Copy count follows the 70/50/30 width thresholds.
- [ ] The loop has no visible gap or jump at any count.
- [ ] The count recomputes on resize and language change.
- [ ] No layout shift or hydration warning on first paint.
- [ ] Checked in Arabic and English at 360 / 768 / 1280.
