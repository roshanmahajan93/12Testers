# 12Testers

A React Native + Expo app by **Astralites** that helps indie Android developers get through Google
Play's closed-testing requirement (12 testers × 14 continuous days). One app, two roles:

- **Developers** list an app, write a 14-day test plan, reserve tester slots with credits and
  watch live progress until they reach the production-access checklist.
- **Testers** claim tests and get **one focused task card per app per day** (open the app, do
  the task, upload a screenshot, answer a question). They earn points, keep streaks and build
  a reputation.

> 12Testers helps you meet the testing requirement and collect feedback. Google alone decides
> whether production access is granted.

Stack: Expo SDK 57 · Expo Router · TypeScript (strict) · Redux Toolkit + RTK Query · redux-persist
(MMKV) · Appwrite (Auth, TablesDB, Storage, Functions, Realtime) · RevenueCat · expo-notifications ·
Reanimated 4 · Gesture Handler · Skia · Lottie.

See [`CLAUDE.md`](./CLAUDE.md) for architecture and conventions and [`PLAN.md`](./PLAN.md) for
the build log, decisions and open TODOs.

---

## 1. Prerequisites

- Node 20+ and npm
- Android Studio (SDK + JDK 17, an emulator or a device with USB debugging) — builds run locally
- An [Appwrite](https://appwrite.io) project (Cloud or self-hosted **1.8+**, TablesDB API) and the
  [Appwrite CLI](https://appwrite.io/docs/tooling/command-line/installation)
- A [RevenueCat](https://www.revenuecat.com) project linked to your Play Console app
- A Firebase project (free) — Firebase Cloud Messaging delivers push notifications

**No paid Expo services are used**: no Expo push service, no EAS Build/Update/Submit. Push goes
Appwrite Messaging → FCM, and builds are made locally with Gradle.

The app uses native modules (RevenueCat, MMKV, Skia, notifications), so it runs in a
**development build**, not Expo Go.

## 2. Install & configure

```bash
npm install
cp .env.example .env.local      # fill in the values below
npm run check-env               # fails fast if something is missing
```

| Variable | Where it comes from |
|---|---|
| `EXPO_PUBLIC_APPWRITE_ENDPOINT` | Appwrite console → Settings (e.g. `https://cloud.appwrite.io/v1`) |
| `EXPO_PUBLIC_APPWRITE_PROJECT_ID` | Appwrite project ID |
| `EXPO_PUBLIC_APPWRITE_DATABASE_ID` | Database ID created by the setup script (default `main`) |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` / `_IOS_KEY` | RevenueCat → Project → API keys (public SDK keys) |
| `EXPO_PUBLIC_PRIVACY_URL`, `EXPO_PUBLIC_TERMS_URL` | Your hosted policy pages |
| `EXPO_PUBLIC_ACCOUNT_DELETION_URL` | Web page explaining/performing account deletion (Play policy) |
| `EXPO_PUBLIC_APPWRITE_FCM_PROVIDER_ID` | Optional — Appwrite Messaging → Providers → your FCM provider id (only needed if you have several) |

Only `EXPO_PUBLIC_*` values are bundled into the app. **Never** put the Appwrite API key or the
RevenueCat webhook secret in `EXPO_PUBLIC_*` variables.

## 3. Appwrite backend

### 3.1 Platform
In the Appwrite console add an **Android** platform with package name `com.twelvetesters`
(and an iOS one with bundle ID `com.twelvetesters` if you build for iOS).

### 3.2 Auth
- Enable **Email OTP** (Auth → Settings → Email/Password token).
- Enable **Google** OAuth (Auth → Settings → OAuth2 Providers) with your Google client ID/secret.
  The app uses the OAuth token flow and listens on the `appwrite-callback-<PROJECT_ID>` scheme,
  which `app.config.ts` registers automatically.

### 3.3 Schema, buckets and config row
Create an API key (Overview → Integrations → API keys) with the `databases.*`, `tables.*`,
`columns.*`, `indexes.*`, `rows.*` and `buckets.*` scopes, then:

```bash
APPWRITE_API_KEY=<key> npm run setup:appwrite
```

This is idempotent. It creates the database, 11 tables with columns, indexes and row security,
the 4 storage buckets (`avatars`, `app-icons`, `task-screenshots`, `feedback-attachments`) and
the `config/global` row with the tunable rules (12 testers, 14 days, credits per slot, points,
reset hour, dropout thresholds…). **Edit that row in the console to tune the business rules**
without shipping an app update.

### 3.4 Roles are user labels
Roles are Appwrite **user labels** (`developer` / `tester`) set only by the `setRole` function.
Tables/buckets use label-based permissions (`label:tester`, `label:developer`). To change a
user's role manually, edit their labels **and** `profiles.role` in the console.

### 3.5 Functions
```bash
npm run functions:build                     # bundles each function into appwrite/functions/dist/<name>
cd appwrite
# put your project ID in appwrite.json ("projectId"), then:
appwrite login
appwrite push functions --all
```

Set these **function environment variables** in the console (Functions → each function →
Settings → Environment variables), or as project-wide global variables:

| Variable | Used by | Value |
|---|---|---|
| `APPWRITE_DATABASE_ID` | all | same as `EXPO_PUBLIC_APPWRITE_DATABASE_ID` (default `main`) |
| `REVENUECAT_WEBHOOK_AUTH` | `revenuecatWebhook` | a long random secret (same value in RevenueCat) |
| `CREDIT_PACKS` | `revenuecatWebhook` | optional JSON, e.g. `{"credits_50":50,"credits_150":150,"credits_500":500}` |
| `PRO_ENTITLEMENT_ID` | `revenuecatWebhook` | optional, default `pro` |

Functions authenticate to Appwrite with the per-execution dynamic key (scopes are declared in
`appwrite.json`), so no API key needs to be stored for them.

Schedules: `generateDailyTasks` runs hourly at :05 and `dropoutMonitor` hourly at :35. They have
no execute permissions, so only the scheduler can run them.

## 4. RevenueCat (developer purchases)

1. In Play Console create in-app products **`credits_50`**, **`credits_150`**, **`credits_500`**
   (consumable) and a subscription for **Pro** (monthly and/or annual base plans).
2. In RevenueCat: add the Play app, import the products, create an entitlement **`pro`**
   attached to the subscription, and a **current offering** containing the credit packs and the
   Pro packages.
3. Webhook: Integrations → Webhooks → URL = the `revenuecatWebhook` function's domain
   (Functions → revenuecatWebhook → Domains), Authorization header =
   `Bearer <REVENUECAT_WEBHOOK_AUTH>`.
4. The app identifies users with `Purchases.logIn(<appwrite user id>)`, so webhook events carry the
   Appwrite user id. Credits are granted **only** by the webhook (idempotent by event id); the app
   polls its profile after a purchase.

## 5. Push notifications (Appwrite Messaging + FCM — free)

1. **Firebase**: create a project, add an Android app with package `com.twelvetesters`, download
   `google-services.json` into the project root (git-ignored) or point `GOOGLE_SERVICES_JSON` at
   it. The build embeds it so the app can get a native FCM token.
2. **Firebase service account**: Project settings → Service accounts → *Generate new private key*.
3. **Appwrite**: Messaging → Providers → *Add provider* → **FCM**, paste the service-account JSON
   and enable it. (If you add more than one FCM provider, put its id in
   `EXPO_PUBLIC_APPWRITE_FCM_PROVIDER_ID`.)

How it works: after the user grants notification permission (onboarding primer on Android 13+),
the app reads the device's FCM token with `getDevicePushTokenAsync()` and registers it as an
Appwrite **push target** (`account.createPushTarget`). Functions send with
`messaging.createPush({ users: [...] })`, and Appwrite delivers through FCM to every device of those
users. Every push is also written as an in-app row in `notifications`. Testers additionally get a
**local** reminder (on-device, no server) at their chosen time when tasks are still pending.
Signing out removes the device's push target.

## 6. Build & run (local, no EAS)

```bash
npx expo run:android                       # debug dev-client build installed on a device/emulator
npm start                                  # Metro for the dev client
```

Release builds for Play:

```bash
npx expo prebuild --platform android       # generates ./android (git-ignored)
# create an upload keystore once and configure signing in android/gradle.properties
cd android && ./gradlew bundleRelease       # → app/build/outputs/bundle/release/app-release.aab
```

Upload the `.aab` to the Play Console (internal track first). Increase `android.versionCode` in
`app.config.ts` for every upload. To test a release APK locally: `./gradlew assembleRelease`.

### Test accounts
- **Seed data** (dev projects only):
  `APPWRITE_API_KEY=<key> SEED_EMAIL=you@gmail.com npm run seed`
  creates `you+dev1@gmail.com`, `you+dev2@…` (developers with 200 credits) and
  `you+tester1@…` … `you+tester14@…` (testers), plus a recruiting app, an app on day 5 of
  testing with today's tasks, and a draft. Sign in with email OTP; plus-addressed mail arrives
  in your inbox.
- **By hand**: open the app, choose *I'm a Developer* or *I'm a Tester*, sign in with any email
  (OTP). The first sign-in calls `setRole`. Use a second email for the other role — one role per
  account.
- Trigger the cron functions manually from the console (Functions → Execute) to generate tasks
  without waiting for the hour.

## 7. Quality gates

```bash
npm run typecheck     # app + functions
npm run lint
npm test              # 70+ unit tests: domain rules, validators, guards, CardStack, function lifecycle
npm run verify        # all three
```

The motion kit can be explored in the dev-only `/dev/playground` route (Settings → Motion
playground in dev builds).

## 8. Project layout

```
src/app/            Expo Router routes: (auth) (onboarding) (developer) (tester) + shared
src/components/     ui/ (design-system kit) · motion/ (Skia/Reanimated/Lottie motion kit)
src/features/       RTK Query endpoints + feature components (apps, tests, tasks, ledger, …)
src/lib/domain/     pure business rules shared with the functions (time, streaks, reputation…)
src/services/       appwrite/ · purchases/ · notifications/ · logger
src/store/          store, base api, typed hooks, MMKV storage
src/theme/          colors (role accents), tokens, motion tokens, ThemeProvider
appwrite/           schema.ts · appwrite.json · functions/ (TypeScript, bundled with esbuild)
scripts/            setup-appwrite · seed · check-env · generate-icons
```

## 9. Store readiness

See [`docs/STORE_READINESS.md`](./docs/STORE_READINESS.md).
