# ADR-0004: Mobile app is Expo/React Native with no navigation library, state-based screens

Date: 2026-10-23

> Superseded by [ADR-0013](./0013-mobile-react-navigation.md) on 2026-10-25.

## Decision
`mobile/` is a blank-type Expo app with state-based screens (Login, Courses,
Group, Lesson, Quiz, Profile, and teacher screens: TeacherHome, TeacherGroup)
switched by a `screen` state in `App.tsx`. No react-navigation.

## Rationale
- Screens only need params (ids) and a back target; there is still no need for
deep links or a back stack, so a tagged-union state variable covers it.

## Consequences
- No URL/deep-link support (WhatsApp magic links open the web app, not the
  native app).
- Teacher use on mobile is intentionally narrow: see groups, unlock lessons,
  and view the roster. Curriculum editing, quiz building, and the gradebook
  editing stay on the web.
- Sessions ride standard `credentials: 'include'` cookies: iOS (NSURLSession)
  persists them automatically; Android OkHttp bridges CookieManager. If cookie
  persistence is ever flaky on Android, manually capture `set-cookie` at
  sign-in and replay it as a `Cookie` header.
- API base derives from `Constants.expoConfig.hostUri` so Expo Go on a phone
  or emulator hits the dev backend on the same LAN; hardcode the prod URL for
  release builds (see `mobile/src/api.ts`).
