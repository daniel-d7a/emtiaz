This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

This project uses npm (no `bun.lock`).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npm run start               # expo start
npm run dev:tunnel          # Expo Go + compose tunnel (API on :3100)
npm run typecheck           # tsc --noEmit
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run `npm run typecheck` before declaring any task done.

## Navigation & Routing

This app uses **React Navigation native stacks**, not Expo Router (ADR-0013).

- `App.tsx` renders one stack per role: Student (`Courses → Group → Lesson → Quiz`), Teacher (`TeacherHome → TeacherGroup`), Parent (`ParentHome`), plus `Profile` and `Notifications`.
- Screens live in `src/screens/` and take callbacks (`onBack`, `onOpen…`); the stack wrapper calls `navigation.navigate` / `goBack`.
- Add a screen by extending `RootStackParamList` and adding a `Stack.Screen` to the role stack that needs it.
- Deep links are not configured; WhatsApp invites open the web app.
- Use the `emtiaz-mobile` skill for the project-specific contract.

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
