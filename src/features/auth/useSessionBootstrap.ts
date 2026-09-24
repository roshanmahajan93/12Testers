import { useEffect } from 'react';

import type { ProfileRow, Role } from '@/lib/domain/types';
import { isBackendConfigured } from '@/lib/env';
import { getRowOrNull, getSessionUser, TABLES } from '@/services/appwrite';
import { logger } from '@/services/logger';
import type { AppDispatch } from '@/store/store';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

import { sessionResolved, signedOut } from './authSlice';

/** Resolve the Appwrite session + role label + tester setup state into the auth slice. */
export async function refreshSession(
  dispatch: AppDispatch,
  persisted?: { userId: string | null; role: Role | null; needsTesterSetup: boolean },
): Promise<void> {
  if (!isBackendConfigured) {
    dispatch(signedOut());
    return;
  }
  try {
    const user = await getSessionUser();
    if (!user) {
      dispatch(signedOut());
      return;
    }
    let needsTesterSetup = false;
    if (user.role === 'tester') {
      const profile = await getRowOrNull<ProfileRow>(TABLES.profiles, user.userId);
      needsTesterSetup = !profile?.deviceModel;
    }
    dispatch(sessionResolved({ ...user, needsTesterSetup }));
  } catch (e) {
    // Offline at boot: trust the persisted session so the app still opens; queries will retry.
    logger.warn('session refresh failed', e);
    if (persisted?.userId && persisted.role) {
      dispatch(
        sessionResolved({
          userId: persisted.userId,
          email: '',
          name: '',
          role: persisted.role,
          needsTesterSetup: persisted.needsTesterSetup,
        }),
      );
    } else {
      dispatch(signedOut());
    }
  }
}

export function useSessionBootstrap(rehydrated: boolean): void {
  const dispatch = useAppDispatch();
  const { status, userId, role, needsTesterSetup } = useAppSelector((s) => s.auth);
  useEffect(() => {
    if (rehydrated && status === 'unknown') void refreshSession(dispatch, { userId, role, needsTesterSetup });
  }, [rehydrated, status, dispatch, userId, role, needsTesterSetup]);
}
