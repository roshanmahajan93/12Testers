import { router, type Href } from 'expo-router';
import { useEffect } from 'react';

import type { AuthState } from '@/features/auth/authSlice';
import type { Role } from '@/lib/domain/types';
import { useAppSelector } from '@/store/hooks';

export const HOME: Record<Role, Href> = {
  developer: '/dashboard',
  tester: '/today',
};

/** Pure routing decision — unit tested. */
export function homeHrefFor(
  auth: Pick<AuthState, 'status' | 'role' | 'needsTesterSetup' | 'intendedRole'>,
  onboardingSeen: Record<Role, boolean>,
): Href {
  if (auth.status !== 'signedIn') return '/welcome';
  if (!auth.role) return auth.intendedRole ? '/sign-in' : '/welcome';
  if (auth.role === 'tester' && auth.needsTesterSetup) return '/tester-setup';
  if (!onboardingSeen[auth.role]) return '/onboarding';
  return HOME[auth.role];
}

/**
 * Screen-level guard (belt and braces on top of Stack.Protected). If the signed-in user doesn't
 * have `role`, bounce them to their own home. Server functions re-check the role regardless.
 */
export function useRequireRole(role: Role): boolean {
  const current = useAppSelector((s) => s.auth.role);
  const allowed = current === role;
  useEffect(() => {
    if (current && !allowed) router.replace(HOME[current]);
  }, [current, allowed]);
  return allowed;
}
