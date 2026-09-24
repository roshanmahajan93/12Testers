# Store-readiness checklist (Google Play)

Status legend: ✅ done in code · 🔧 needs console/config work · ⚠️ decision needed

## Account & data
- ✅ In-app account deletion: Settings → Delete account → `deleteAccount` function removes profile,
  apps/plans/enrollments/tasks/feedback/ledgers/notifications, uploaded files, and the Appwrite user.
- 🔧 Web deletion URL: host a page and set `EXPO_PUBLIC_ACCOUNT_DELETION_URL`; add the same URL in
  Play Console → App content → Data safety → Data deletion.
- 🔧 Privacy policy + Terms: host them, set `EXPO_PUBLIC_PRIVACY_URL` / `EXPO_PUBLIC_TERMS_URL`,
  and add the privacy URL in Play Console.
- ✅ Tester emails are never exposed to developers (public tester info is denormalised onto
  enrollments by functions; profiles are readable only by their owner).

## Data safety form (what the app collects)
| Data | Purpose | Shared with |
|---|---|---|
| Email address | Account sign-in (Appwrite Auth) | — |
| Name / display name | Shown to developers of apps you test | Developers (in-app) |
| Device model, Android version | Match testers to apps' requirements | Developers (in-app) |
| Photos (screenshots you upload) | Proof of daily tasks, feedback attachments | The developer of that app |
| App interactions (tasks, feedback, points) | Core functionality | The developer of that app |
| Push token (FCM) | Notifications | Google Firebase Cloud Messaging (via Appwrite) |
| Purchase history | Credits / Pro (RevenueCat, Google Play Billing) | RevenueCat |

All data is encrypted in transit (HTTPS). Users can request deletion in-app.

## Payments
- ✅ All digital goods (credit packs, Pro) are sold through Google Play Billing via RevenueCat.
- ✅ Restore purchases available on the paywall.
- ✅ Credits are granted server-side only (webhook, idempotent by event id).
- 🔧 Create products `credits_50/150/500` + Pro subscription in Play Console; configure RevenueCat
  offering, entitlement `pro` and webhook (see README §4).

## Permissions
- ✅ `QUERY_ALL_PACKAGES` is explicitly blocked (removed from the merged manifest).
- ✅ `RECORD_AUDIO` and `SYSTEM_ALERT_WINDOW` are blocked (not needed).
- ✅ `POST_NOTIFICATIONS` is requested only after an in-app primer (onboarding / settings).
- ✅ Camera / photos are requested only when the user taps Camera/Gallery.

## Content & claims
- ✅ No claims of guaranteed production access; the guide, wizard and checklist state that Google
  decides.
- ✅ All copy, illustrations, Lottie animations and icons are original (generated in code).
- ⚠️ Points redemption is not built (see PLAN.md). If points ever become cash/gift-card rewards,
  review Play's policies on incentivised installs/reviews first.
- ⚠️ Make sure the testing incentive model complies with Play's policies on incentivised
  engagement at the time of submission.

## Build & release
- 🔧 Add `google-services.json` and configure the FCM provider in Appwrite Messaging (README §5).
- 🔧 Create an upload keystore, `npx expo prebuild` + `./gradlew bundleRelease` → AAB → Play
  Console internal track (README §6). No Expo/EAS cloud services are used.
- 🔧 Store listing: title, short/long description, feature graphic, phone screenshots (capture
  from a dev build), content rating questionnaire, target audience (not designed for children).
- 🔧 Performance pass on a mid-range device with a release build (`./gradlew assembleRelease`):
  check Today card-stack swipes, dashboard rings and tab bar stay at 60 fps.
- ✅ Reduced motion respected (OS setting or in-app override), 44pt touch targets, labels on
  icon buttons, dynamic font scaling with sensible caps.
