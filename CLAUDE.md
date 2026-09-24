# 12Testers — project guide

Expo (SDK 57) + React Native app that helps indie Android developers run Google Play's closed test
(12 testers × 14 days). One binary, two role-based experiences: **Developer** and **Tester**.
Publisher: Astralites. Package / bundle id: `com.twelvetesters`. App name lives in `APP_NAME`
(`src/lib/constants.ts`, mirrored in `app.config.ts`).

## Commands

```bash
npm install
npx expo install <pkg>          # ALWAYS use for new deps (SDK-matched versions). Offline: EXPO_OFFLINE=1
npm run typecheck               # tsc for app + functions
npm run lint                    # expo lint (eslint flat config)
npm test                        # jest (app + functions projects)
npm run check-env               # fails fast if EXPO_PUBLIC_* vars are missing
npm run functions:build         # bundle Appwrite Functions → appwrite/functions/dist
npm run setup:appwrite          # idempotent schema/bucket/config setup (needs APPWRITE_API_KEY)
npm run seed                    # sample developers/testers/apps (dev projects only)
npx expo run:android            # dev build (expo-dev-client) — Expo Go is NOT supported
node scripts/generate-icons.mjs # regenerate brand icons
```

Run `npm run typecheck && npm run lint && npm test` before every commit.

## Architecture (read before changing things)

- **Routes** live in `src/app/` (SDK 57 default). Groups: `(auth)`, `(onboarding)`, `(developer)`,
  `(tester)`, plus shared `notifications`, `settings/`. Each role group is a Stack wrapping a
  `(tabs)` Tabs layout with a custom animated tab bar. Tab paths are unique per role
  (`/dashboard` vs `/today`) so the two groups never collide.
- **Role gating**: root `_layout.tsx` uses `Stack.Protected` guards driven by the `auth` slice;
  screens additionally call `useRequireRole()` (`src/navigation/guards.ts`). The role comes from
  the Appwrite **user label** set by the `setRole` function — the client never writes roles.
- **Client reads, functions write.** The app reads rows via TablesDB (row permissions filter what
  it sees). Every business write (profiles, apps, enrollments, tasks, credits, points, feedback)
  goes through an Appwrite Function (`src/services/appwrite/functions.ts → callFunction`). The only
  client write is toggling `read` on the user's own notifications.
- **Service layer**: only `src/services/appwrite/*` imports `react-native-appwrite`. Only
  `src/services/purchases` imports RevenueCat. Only `src/services/notifications` imports
  expo-notifications (local notifications + the native FCM token — never `getExpoPushTokenAsync`).
- **State**: Redux Toolkit. Server data via RTK Query (`src/store/api.ts`, `fakeBaseQuery` +
  `queryFn`, features call `api.injectEndpoints`). Slices only for client state: `auth`,
  `settings`, `ui`. `redux-persist` + MMKV persists `auth` (session meta, role) and `settings`.
- **Realtime**: `src/features/realtime/useRealtimeSync.ts` subscribes per role and invalidates tags.
- **Domain rules** (`src/lib/domain/*`) are pure TS shared with the functions (bundled by esbuild):
  time/day keys, streaks, reputation, dropout, claim eligibility, test-plan templates.
  `src/lib/validators.ts` holds zod schemas used by forms AND by every function.
- **Tunable numbers** (12 testers, 14 days, credits per slot, points…) live in the Appwrite
  `config` row; `DEFAULT_CONFIG` only seeds it. Read with `useDomainConfig()`.
- **Functions**: `appwrite/functions/<name>/main.ts`, shared helpers in `appwrite/functions/_shared`.
  Every function: parse JSON → zod-validate → check caller label → act → `{ ok, data | error }`.

## Design system

- Tokens in `src/theme`: `colors.ts` (neutral palettes + per-role accents), `tokens.ts` (4pt spacing,
  radii, typography with Manrope), `motion.ts` (durations, springs, easings). Never hard-code
  colors/durations in components — use tokens.
- Accent is scoped with `<AccentProvider accent="developer|tester">` in each role layout.
- UI kit: `src/components/ui` (Button, Card, Input, Sheet, Chip, Avatar, Skeleton, …).
  Motion kit: `src/components/motion` (PressableScale, ProgressRing, AnimatedCounter, Shimmer,
  Confetti, CardStack, AnimatedTabBar, LottieIllustration, GradientBackdrop).
- All tappables use `PressableScale`. Loading states use skeletons, not spinners.
- Respect `useReduceMotion()` everywhere (fades instead of springs; CardStack → list).
- Reanimated: write shared values with `.set()` / read with `.get()` outside worklet styles
  (React Compiler + eslint react-hooks rules flag `.value =`).

## Conventions

- TypeScript strict + `noUncheckedIndexedAccess`. No `any` (lint error) unless justified.
- Secrets never in the client — only `EXPO_PUBLIC_*`. Server keys live in Function env vars.
- **No paid Expo services** (no Expo push service, no EAS Build/Update/Submit). Push = device FCM
  token → Appwrite push target → `messaging.createPush` (`appwrite/functions/_shared/push.ts`).
  Builds are local (`expo run:android`, `expo prebuild` + Gradle).
- Do not request `QUERY_ALL_PACKAGES`. Never claim the app guarantees Google approval.
- Original copy/branding only. Icons generated by `scripts/generate-icons.mjs`.
- Commit messages: imperative, reference the phase from `PLAN.md` when relevant.
