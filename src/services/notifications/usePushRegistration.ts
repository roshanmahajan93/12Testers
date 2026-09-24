import { useEffect } from 'react';

import { useMyProfile, useUpdateProfileMutation } from '@/features/profile/profileApi';
import { deviceTimeZone } from '@/lib/device';
import { logger } from '@/services/logger';
import { useAppSelector } from '@/store/hooks';

import { ensureAndroidChannels, getExpoPushToken, getPermissionState } from './permissions';

/**
 * Once signed in with a role: make sure Android channels exist, and keep the profile's Expo push
 * token + timezone current. Never prompts — the onboarding primer asks for permission.
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
      const patch: { expoPushToken?: string; timezone?: string } = {};
      const tz = deviceTimeZone();
      if (profile.timezone !== tz) patch.timezone = tz;
      if ((await getPermissionState()) === 'granted') {
        const token = await getExpoPushToken();
        if (token && token !== profile.expoPushToken) patch.expoPushToken = token;
      }
      if (!cancelled && Object.keys(patch).length) await updateProfile({ userId, ...patch }).unwrap();
    })().catch((e) => logger.warn('push registration failed', e));
    return () => {
      cancelled = true;
    };
  }, [userId, profile, updateProfile]);
}
