import { useEffect } from 'react';

import { useMyProfile, useUpdateProfileMutation } from '@/features/profile/profileApi';
import { deviceTimeZone } from '@/lib/device';
import { registerPushTarget } from '@/services/appwrite/pushTargets';
import { logger } from '@/services/logger';
import { useAppSelector } from '@/store/hooks';

import { ensureAndroidChannels, getFcmToken, getPermissionState } from './permissions';

/**
 * Once signed in with a role: make sure Android channels exist, register this device's FCM token
 * as an Appwrite push target, and keep the profile timezone current. Never prompts — the
 * onboarding primer asks for permission.
 */
export function usePushRegistration(): void {
  const userId = useAppSelector((s) => s.auth.userId);
  const { data: profile } = useMyProfile();
  const [updateProfile] = useUpdateProfileMutation();

  useEffect(() => {
    if (!userId || !profile) return;
    let cancelled = false;
    (async () => {
      await ensureAndroidChannels();
      if ((await getPermissionState()) === 'granted') {
        const token = await getFcmToken();
        if (token && !cancelled) await registerPushTarget(token);
      }
      const tz = deviceTimeZone();
      if (!cancelled && profile.timezone !== tz) await updateProfile({ userId, timezone: tz }).unwrap();
    })().catch((e) => logger.warn('push registration failed', e));
    return () => {
      cancelled = true;
    };
  }, [userId, profile, updateProfile]);
}
