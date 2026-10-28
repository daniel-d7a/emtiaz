# ADR-0019: Mobile role stacks use bottom tabs for home, notifications, profile

Date: 2026-10-28

## Decision
- Each role stack keeps a `Main` screen that is a React Navigation bottom tab
  navigator: Home, Notifications, and Profile.
- Detail screens (group, lesson, quiz, teacher group) stay in the parent native
  stack and push over the tabs.
- The app forces RTL at startup (`I18nManager` + `NavigationContainer
  direction="rtl"`) and renders text through one Cairo-backed `Text` wrapper.

## Rationale
- Students, teachers, and parents all need the same two utility screens;
  bottom tabs remove duplicated header buttons and make them always reachable.
- Detail screens still need back gestures and hardware back, so they remain
  stack screens.
- One text wrapper keeps Arabic typography consistent across every screen.

## Consequences
- Notifications and Profile no longer take back buttons when tab-rendered.
- Tabs hide while a detail screen is open; returning restores the same tab.
- Fonts must load before the navigator mounts to avoid a fallback flash.
