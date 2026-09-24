import { ID } from 'react-native-appwrite';

import { env } from '@/lib/env';
import { kv } from '@/store/storage';

import { account } from './client';

const TARGET_KEY = 'push.targetId';
const TOKEN_KEY = 'push.token';

/**
 * Register this device's native FCM token as an Appwrite push target. Appwrite Messaging then
 * delivers pushes straight through Firebase Cloud Messaging — no Expo push service involved.
 * Idempotent: re-registers only when the token changes.
 */
export async function registerPushTarget(fcmToken: string): Promise<void> {
  const existing = kv.getString(TARGET_KEY);
  if (existing && kv.getString(TOKEN_KEY) === fcmToken) return;
  if (existing) {
    try {
      await account.updatePushTarget({ targetId: existing, identifier: fcmToken });
      kv.set(TOKEN_KEY, fcmToken);
      return;
    } catch {
      // Target was removed server-side (e.g. new account on this device) — create a fresh one.
    }
  }
  const targetId = ID.unique();
  await account.createPushTarget({
    targetId,
    identifier: fcmToken,
    providerId: env.appwriteFcmProviderId || undefined,
  });
  kv.set(TARGET_KEY, targetId);
  kv.set(TOKEN_KEY, fcmToken);
}

/** Call before signing out so the next account on this device doesn't get this user's pushes. */
export async function unregisterPushTarget(): Promise<void> {
  const targetId = kv.getString(TARGET_KEY);
  kv.remove(TARGET_KEY);
  kv.remove(TOKEN_KEY);
  if (!targetId) return;
  try {
    await account.deletePushTarget({ targetId });
  } catch {
    // Already gone.
  }
}
