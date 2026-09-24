# 12Testers — build plan

Legend: `[x]` done · `[~]` partially done (see notes) · `[ ]` not started

## Phases

- [x] **1. Scaffold** — Expo SDK 57 + TS strict + Expo Router, ESLint/Prettier, theme tokens with
      role accents, base UI kit, original icons, `CLAUDE.md`, `PLAN.md`.
- [x] **2. Store + services** — RTK + RTK Query base, redux-persist + MMKV, Appwrite service
      layer (auth, db, storage, functions, realtime), logger, env check.
- [ ] **3. Backend schema** — setup script (tables, columns, indexes, permissions, buckets, config
      row), `appwrite.json` for functions, seed script.
- [ ] **4. Auth + roles** — welcome role choice, email OTP + Google, `setRole`, tester setup,
      role redirect + guards, wrong-role sheet.
- [ ] **5. Motion kit** — PressableScale, ProgressRing (Skia), AnimatedCounter, Shimmer, Confetti,
      CardStack, two animated tab bars, Lottie wrappers, `/dev/playground`.
- [ ] **6. Developer: add-app wizard + test plan editor + My Apps** (`saveApp`, `listApp`).
- [ ] **7. Tester: Available + claim flow + My Tests** (`claimTest`).
- [ ] **8. Daily tasks** — `generateDailyTasks` cron, Today card stack, completion
      (`completeDailyTask`), streaks + points.
- [ ] **9. Developer owner dashboard** — tester progress, screenshots, flag task, feedback + rating.
- [ ] **10. Dropout monitor + replacement recruiting.**
- [ ] **11. Notifications** — token registration, local reminders, push via functions, deep links,
      notification centre.
- [ ] **12. RevenueCat** — init/identify, offerings, paywall, credit packs, Pro, restore, webhook.
- [ ] **13. Dashboards, Points/badges, Leaderboard, Guide, Settings, account deletion.**
- [ ] **14. Polish** — empty/error/offline states, reduced motion, a11y, perf pass.
- [ ] **15. Tests + README + store-readiness checklist.**

## Decisions

- **Routes in `src/app/`** (SDK 57 template default) instead of a root `app/` folder.
- **Route layout differs slightly from the brief** to avoid URL collisions between the two role
  groups (both can't own `/`): developer tabs are `/dashboard`, `/apps`, `/credits`, `/account`;
  tester tabs are `/today`, `/available`, `/my-tests`, `/points`, `/profile`. Detail screens are
  stack routes above the tabs (`/app/[id]`, `/app/[id]/test-plan`, `/task/[taskId]`, …).
- **Styling**: typed tokens + `StyleSheet` (no NativeWind) — fewer moving parts with Reanimated
  animated styles and Skia.
- **Font**: Manrope (Google Font, via `@expo-google-fonts/manrope`, static weights).
- **Appwrite SDK**: `react-native-appwrite@1` (TablesDB API: tables/rows/columns). It still imports
  the legacy `expo-file-system` API, so `metro.config.js` redirects that import to
  `expo-file-system/legacy` and `package.json#overrides` dedupes the native module.
- **Client reads, functions write**: Appwrite has row-level (not column-level) permissions, so a
  client-writable profile would let users edit their own credits. Every business write goes
  through a Function; the client can only update `read` on its own notifications. Extra functions
  beyond the brief: `updateProfile`, `saveApp`, `manageApp`, `submitFeedback`, `report`,
  `getLeaderboard`; `flagTask`/`rateFeedback` are one `moderate` function.
- **Developer never reads tester profiles**: public tester info (name, avatar, device, reputation)
  is denormalized onto `enrollments` by functions. Tester emails are never exposed.
- **Private images** (screenshots/attachments) load in `expo-image` with a short-lived JWT header;
  the consuming function grants the developer read access on the file.
- **Schema as code**: `scripts/setup-appwrite.ts` (node-appwrite, idempotent) is the source of truth
  for tables/buckets/config; `appwrite/appwrite.json` declares the Functions for `appwrite push`.
- **Functions are bundled with esbuild** (shared domain code + zod + node-appwrite inlined) into
  `appwrite/functions/dist/<name>/main.js`, so each deployment is self-contained.
- **Paywall is custom UI** on RevenueCat Offerings (matches the design system);
  `react-native-purchases-ui` is not installed.
- **Lottie animations are generated in code** (`components/motion/lottie/builders.ts`) so they're
  original and tinted per role.
- **Slots**: listing reserves `TESTERS_REQUIRED + EXTRA_TESTER_BUFFER` slots (14). Replacements
  after drop-outs reuse the reserved slot (no extra charge). Unused slots are refunded on
  completion/cancel.
- **Day numbering**: each tester's day 1 is the day their enrollment became active; the app's day
  counter runs from `testStartDate` (when 12 testers had joined).
- **Tasks per day**: one task per active enrollment per tester-local task day
  (reset at `TASK_DAY_RESET_HOUR`, default 04:00).

## Open TODOs / business decisions

- [ ] **Points redemption** — what points buy (rewards, payouts, badges only) is undecided. The
      ledger + Points screen exist; redemption UI/logic is intentionally not built.
- [ ] Web account-deletion page (`EXPO_PUBLIC_ACCOUNT_DELETION_URL`) must be hosted separately.
- [ ] Sentry (or similar) — plug into `src/services/logger.ts` via `setLogSink`.
