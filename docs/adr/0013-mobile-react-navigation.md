# ADR-0013: Mobile uses React Navigation native stacks

Date: 2026-10-25

## Decision
- `mobile/` uses `@react-navigation/native` + `@react-navigation/native-stack`
  with `react-native-screens` and `react-native-safe-area-context`.
- `App.tsx` renders a separate stack per role: Student (courses → group →
  lesson → quiz), Teacher (courses → group, profile, notifications), and
  Parent (children → notifications). Auth and the admin notice stay outside
  the navigator.
- Native headers remain hidden; screens keep their existing back buttons and
  callbacks, wired to `navigation.goBack()` / `navigation.navigate()`.

## Rationale
- Android hardware back, swipe-back gestures, and a real stack replace the
  tagged-union `screen` state.
- Typed route params catch broken ids at compile time.
- Thin wrappers let existing screens keep their UI and props; no rewrite was
  needed.

## Consequences
- Bare/prebuild apps need a native rebuild for the new modules; Expo Go SDK 58
  already includes them.
- Deep links are still not configured. WhatsApp invites continue to open the
  web app.
- Query data can stay mounted when navigating back; screens that need fresh
  data should invalidate their query keys after writes.
