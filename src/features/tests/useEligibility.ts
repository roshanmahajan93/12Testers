import { useDomainConfig } from '@/features/config/configApi';
import { useMyProfile } from '@/features/profile/profileApi';
import { claimBlocker, CLAIM_BLOCKER_MESSAGES, LIVE_ENROLLMENT, maxActiveTestsFor, type ClaimBlocker } from '@/lib/domain/rules';
import type { App } from '@/lib/domain/types';
import { useAppSelector } from '@/store/hooks';

import { useMyEnrollmentsQuery } from './testsApi';

/** Client-side preview of claimTest's checks (the server re-checks everything). */
export function useEligibility() {
  const cfg = useDomainConfig();
  const userId = useAppSelector((s) => s.auth.userId) ?? '';
  const { data: profile } = useMyProfile();
  const { data: enrollments } = useMyEnrollmentsQuery(userId, { skip: !userId });
  const activeTests = (enrollments ?? []).filter((e) => LIVE_ENROLLMENT.includes(e.status)).length;
  const maxActive = profile ? maxActiveTestsFor(profile.reputation, profile.maxActiveTests, cfg) : 1;
  const enrolledIds = new Set((enrollments ?? []).map((e) => e.appId));

  const check = (app: App): { blocker: ClaimBlocker | null; message: string | null } => {
    if (!profile) return { blocker: null, message: null };
    const blocker = claimBlocker(
      app,
      { userId, reputation: profile.reputation, androidVersion: profile.androidVersion, activeTests, maxActive },
      enrolledIds.has(app.$id),
    );
    return { blocker, message: blocker ? CLAIM_BLOCKER_MESSAGES[blocker] : null };
  };

  return { check, activeTests, maxActive, enrolledIds, profile };
}
