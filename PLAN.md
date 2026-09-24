# 12Testers — build plan

Legend: `[x]` done · `[~]` partially done (see notes) · `[ ]` not started

## Phases

- [x] **1. Scaffold** — Expo SDK 57 + TS strict + Expo Router, ESLint/Prettier, theme tokens with
      role accents, base UI kit, original icons, `CLAUDE.md`, `PLAN.md`.
- [x] **2. Store + services** — RTK + RTK Query base, redux-persist + MMKV, Appwrite service
      layer (auth, db, storage, functions, realtime), logger, env check.
- [x] **3. Backend schema** — `appwrite/schema.ts` + idempotent `scripts/setup-appwrite.ts`
      (tables, columns, indexes, row security, buckets, config row), `appwrite.json` for
      functions, seed script. All 15 Functions were implemented here (shared lifecycle helpers in
      `appwrite/functions/_shared`) so later phases only added UI.
- [x] **4. Auth + roles** — welcome role choice (animated cards, parallax, accent veil), email OTP
      + Google, `setRole`, tester setup, `Stack.Protected` redirects + `useRequireRole`, wrong-role sheet.
- [x] **5. Motion kit** — PressableScale, ProgressRing (Skia), AnimatedCounter, Shimmer, Confetti,
      CardStack, AnimatedTabBar (one per role via icon maps), Lottie builders, CheckTick,
      GradientBackdrop, Illustration, `/dev/playground`.
- [x] **6. Developer: add-app wizard + test plan editor + My Apps** (`saveApp`, `listApp`).
- [x] **7. Tester: Available + claim flow + My Tests** (`claimTest`, join checklist).
- [x] **8. Daily tasks** — `generateDailyTasks` cron, Today card stack, completion with
      screenshot/answer (`completeDailyTask`), streaks + points, optimistic update.
- [x] **9. Developer owner dashboard** — rings, today's completion, tester strips, screenshot
      gallery per day, flag task, feedback inbox + rating.
- [x] **10. Dropout monitor + replacement recruiting** (warn 48h, drop 72h, slot reopen, invites,
      developer daily summary).
- [x] **11. Notifications** — token registration, local pending-task reminder, push via functions
      (`_shared/push.ts`), role-aware deep links, notification centre.
- [x] **12. RevenueCat** — init/identify (developer only), offerings paywall, credit packs, Pro,
      restore, webhook with idempotent grants.
- [x] **13. Dashboards, Points/badges, Leaderboard, Guide, Settings, account deletion.**
- [~] **14. Polish** — error/empty/offline states, reduced motion, a11y labels, permissions
      trimmed. *Not done:* on-device performance profiling (no device/emulator in the build
      environment) — see docs/STORE_READINESS.md.
- [x] **15. Tests + README + store-readiness checklist** — 73 Jest tests (domain rules, timezone
      rollover, validators, guards, CardStack, function lifecycle with an in-memory Appwrite
      fake, handler envelope), README, `docs/STORE_READINESS.md`.

## Verification status

- `npm run typecheck` (app + functions), `npm run lint`, `npm test` pass.
- `expo export --platform android` bundles successfully; `expo prebuild` generates a manifest with
  the restricted permissions removed.
- **Not yet verified on a device**: nothing has been run against a live Appwrite project,
  RevenueCat, or FCM (no credentials in the build environment). Expect small integration fixes
  on first real run (e.g. Appwrite channel names, RevenueCat product ids).

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
- **Enrollment completion**: completing the final-day task completes the enrollment with the
  bonus; a tester who stays in without completing the last day is completed by the cron without
  the bonus. The app is `completed` once `TESTERS_REQUIRED` enrollments complete.
- **Reputation** = 60% completion rate + 25% developer feedback ratings + 15% base − flags/drops
  (`computeReputation`), recomputed by functions on every relevant event.
- **Pro perks** (until decided otherwise): 7-day boosted listing (sorted first), invites sent to
  twice as many testers. Feedback export is not built yet.
- **Production checklist ticks** are stored locally per device (MMKV) — guidance only.
- **Template LICENSE removed** (it carried Expo's copyright); choose a license for the project.

## Open TODOs / business decisions

- [ ] **Points redemption** — what points buy (rewards, payouts, badges only) is undecided. The
      ledger + Points screen exist; redemption UI/logic is intentionally not built.
- [ ] Web account-deletion page (`EXPO_PUBLIC_ACCOUNT_DELETION_URL`) must be hosted separately.
- [ ] Sentry (or similar) — plug into `src/services/logger.ts` via `setLogSink`.
