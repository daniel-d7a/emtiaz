# Emtiaz mobile (Expo / React Native)

Student, teacher, and parent companion app. `App.tsx` mounts role-specific
React Navigation native stacks (see `docs/adr/0013-mobile-react-navigation.md`).

Layout:

- `src/screens/` — one file per screen; `App.tsx` wires them into per-role stacks
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

From **WSL** (or anywhere the phone cannot reach the API), use the tunnel
script instead — it exposes the API on its own public URL and passes it to
Expo, because `--tunnel` only tunnels Metro, not the API:

```bash
npm run dev:tunnel            # API on :3100 (docker compose)
API_PORT=3000 npm run dev:tunnel
```

It uses the compose `tunnel` service (cloudflared, no account) if Docker is
running, otherwise a local `cloudflared` or `ngrok` binary. Metro is tunnelled
with Expo's legacy `--tunnel ngrok` provider, which does not require an Expo
login (`--tunnel` alone does).


4. Scan the QR code with Expo Go (Android: inside the app; iOS: Camera app).

The API base is derived from Metro's `hostUri`
(`mobile/src/api.ts`), so the phone talks to `http://<your-LAN-ip>:3000`
automatically. Override it with `EXPO_PUBLIC_API_URL` (required with
`npx expo start --tunnel`, and for docker compose where the API is on `:3100`).

## What each role sees

- **Student**: login, my groups, join by code, curriculum, lesson viewer
  (marks lesson as viewed), quizzes with retry, notifications, and profile
  (avatar upload, name/phone, logout). Parent-code display/rotation stays on
  the web profile.
- **Teacher**: login, course/group list with student/group/lesson/progress
  summaries, per-group pacing with lesson unlock toggles, roster with progress,
  group announcements, notifications, and profile.
- **Parent**: login, link/unlink a child with the student's parent code, see
  each child's groups and progress, open quiz/manual grades, and notifications.
- **Admin**: web only.

## Troubleshooting

- **Cannot reach the API**: confirm `curl http://<LAN-ip>:3000/api/health`
  works from another device on the same network. Android sometimes blocks
  cleartext HTTP outside Expo Go — production must use HTTPS.
- **Avatar does not load**: the app loads the signed URL returned by
  `GET /api/me`; if storage is not configured that URL is `null`.
- **Expo version warning**: `npx expo install --check` may suggest a patch
  update; run `npx expo install --fix` if the app misbehaves.
