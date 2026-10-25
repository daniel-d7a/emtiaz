# Emtiaz mobile (Expo / React Native)

Student and teacher companion app. Screens are switched by state in `App.tsx`
(no navigation library — see `docs/adr/0004-expo-no-navigation.md`).

Layout:

- `src/screens/` — one file per screen
- `src/ui/` — shared primitives (`Btn`, `Card`, `Field`, feedback) + theme
- `src/query.ts` — shared TanStack Query client; screens use `useQuery` /
  `useMutation` and invalidate by query key after writes
- `src/api.ts` — fetch wrapper and auth calls

## Run it

1. Install **Expo Go** on your phone (App Store / Play Store), or have an
   Android emulator / iOS simulator ready.
2. Make sure the backend is running on port **3000** and reachable from the
   phone (same Wi-Fi, no VPN on the phone).
3. From this folder:

   ```bash
   npm install
   npx expo start
   ```

4. Scan the QR code with Expo Go (Android: inside the app; iOS: Camera app).

The API base is derived from Metro's `hostUri`
(`mobile/src/api.ts`), so the phone talks to `http://<your-LAN-ip>:3000`
automatically. For a release build, hardcode the production API URL there.

## What each role sees

- **Student**: login, my groups, join by code, curriculum, lesson viewer
  (marks lesson as viewed), quizzes with retry, and profile (avatar upload,
  name/phone, logout).
- **Teacher**: login, course/group list, per-group pacing with lesson unlock
  toggles, roster, and profile.
- **Admin**: web only.

## Troubleshooting

- **Cannot reach the API**: confirm `curl http://<LAN-ip>:3000/api/health`
  works from another device on the same network. Android sometimes blocks
  cleartext HTTP outside Expo Go — production must use HTTPS.
- **Avatar does not load**: the app loads the signed URL returned by
  `GET /api/me`; if storage is not configured that URL is `null`.
- **Expo version warning**: `npx expo install --check` may suggest a patch
  update; run `npx expo install --fix` if the app misbehaves.
