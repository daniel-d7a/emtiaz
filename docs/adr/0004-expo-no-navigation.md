# ADR-0004: Mobile app is Expo/React Native with no navigation library, state-based screens

Date: 2026-10-23

## Decision
`mobile/` is a blank-type Expo app with three screens (Login, Courses, Group)
switched by a single `screen` state in `App.tsx`. No react-navigation.

## Rationale
- Three static screens don't need deep-linking, back-stack management, or
  params beyond a group id — a state variable covers all of it.

## Consequences
- No URL/deep-link support (WhatsApp magic links open the web app, not the
  native app).
- Sessions ride standard `credentials: 'include'` cookies: iOS (NSURLSession)
  persists them automatically; Android OkHttp bridges CookieManager. If cookie
  persistence is ever flaky on Android, manually capture `set-cookie` at
  sign-in and replay it as a `Cookie` header.
- API base derives from `Constants.expoConfig.hostUri` so Expo Go on a phone
  or emulator hits the dev backend on the same LAN; hardcode the prod URL for
  release builds (see `mobile/src/api.ts`).
