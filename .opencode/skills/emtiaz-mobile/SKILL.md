---
name: emtiaz-mobile
description: Use when changing the Expo/React Native app in mobile/ — screens, navigation, RTL, theming, uploads, or bringing a web feature to iOS/Android. Encodes the real React Navigation architecture (not Expo Router), Expo SDK 58 rules, and web/mobile parity expectations.
---

# Emtiaz mobile

Expo SDK 58, React 19, React Native 0.88. This app uses **React Navigation native stacks**, not Expo Router (ADR-0013). Do not introduce `expo-router` or a `src/app/` directory.

## Navigation

- `mobile/App.tsx` holds one typed stack per role: Student (`Courses → Group → Lesson → Quiz`), Teacher (`TeacherHome → TeacherGroup`), Parent (`ParentHome`); plus `Profile` and `Notifications` where each role needs them. Admin stays web-only.
- Add a screen by extending `RootStackParamList`, adding a `Stack.Screen`, and wiring it into the role stack that needs it.
- Screens take callbacks (`onBack`, `onOpen…`) and call `navigation.navigate` from the wrapper. Follow that pattern; if you migrate to `useNavigation`, do it for the whole stack in one change.
- Deep links are not configured; WhatsApp invites open the web app.

## Data and UI

- API methods live in `mobile/src/api.ts`; responses come from `shared/api.ts`. `API` derives from Metro `hostUri` in dev — release builds need a hardcoded production URL.
- TanStack Query keys live in `mobile/src/query.ts`; invalidate after writes.
- Tokens and shared styles live in `mobile/src/ui/theme.ts` (`c`, `s`); primitives in `mobile/src/ui/` (`Btn`, `Card`, `Field`, `Feedback`). Add tokens there — no raw hex in screens.
- Arabic/RTL: current `s.row` uses `row-reverse`; verify real RTL and 44px targets. Match web fonts (Cairo/DM Sans) when adding typography.

## Expo rules

1. Read the `expo` major version in `package.json`.
2. Fetch `https://docs.expo.dev/versions/v<major>.0.0/` and `https://docs.expo.dev/llms.txt` before using an Expo API; never answer from memory.
3. Install with `npx expo install <package>` (never `npm add`), and do not create or edit `ios/` or `android/`.

## Done when

`npm run typecheck` passes in `mobile/`; the screen works on a device/Expo Go for every role that can reach it; back gesture and typed params still work; no raw hex or hardcoded copy added.
