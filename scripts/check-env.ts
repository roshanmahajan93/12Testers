/**
 * Fails fast when required public env vars are missing.
 *   npm run check-env            (reads .env, .env.local)
 */
import { config } from 'dotenv';

config({ path: ['.env.local', '.env'], quiet: true });

const REQUIRED = [
  'EXPO_PUBLIC_APPWRITE_ENDPOINT',
  'EXPO_PUBLIC_APPWRITE_PROJECT_ID',
  'EXPO_PUBLIC_APPWRITE_DATABASE_ID',
  'EXPO_PUBLIC_REVENUECAT_ANDROID_KEY',
  'EXPO_PUBLIC_PRIVACY_URL',
  'EXPO_PUBLIC_TERMS_URL',
  'EXPO_PUBLIC_ACCOUNT_DELETION_URL',
] as const;

const OPTIONAL = ['EXPO_PUBLIC_REVENUECAT_IOS_KEY', 'EAS_PROJECT_ID'] as const;

const missing = REQUIRED.filter((k) => !process.env[k]?.trim());
const missingOptional = OPTIONAL.filter((k) => !process.env[k]?.trim());

for (const key of Object.keys(process.env)) {
  if (key.startsWith('EXPO_PUBLIC_') && /KEY|SECRET|TOKEN/.test(key) && !/REVENUECAT_(ANDROID|IOS)_KEY/.test(key)) {
    console.error(`✖ ${key} looks like a secret but is prefixed EXPO_PUBLIC_ (it would ship in the app bundle).`);
    process.exitCode = 1;
  }
}

if (missingOptional.length) console.warn(`⚠ Optional vars not set: ${missingOptional.join(', ')}`);
if (missing.length) {
  console.error(`✖ Missing required env vars:\n  ${missing.join('\n  ')}\nCopy .env.example to .env.local and fill them in.`);
  process.exit(1);
}
if (!process.exitCode) console.log('✔ Environment looks good.');
