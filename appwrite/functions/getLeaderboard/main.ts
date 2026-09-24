/**
 * getLeaderboard (any role) — top testers this month (by completed tasks) or all-time (points).
 * Profiles are private rows, so the function returns only public fields.
 */
import type { LeaderboardEntry, ProfileRow } from '../../../src/lib/domain/types';
import { leaderboardSchema } from '../../../src/lib/validators';
import { requireAnyRole } from '../_shared/auth';
import { listRows, Query, TABLES } from '../_shared/db';
import { currentMonthKey } from '../_shared/lifecycle';
import { handler, validate } from '../_shared/runtime';

export default handler(async ({ admin, body, userId }) => {
  const { period } = validate(leaderboardSchema, body);
  await requireAnyRole(admin, userId);
  const month = currentMonthKey();

  const rows = await listRows<ProfileRow>(
    admin,
    TABLES.profiles,
    period === 'month'
      ? [Query.equal('role', 'tester'), Query.equal('monthKey', month), Query.orderDesc('tasksThisMonth'), Query.orderDesc('reputation'), Query.limit(25)]
      : [Query.equal('role', 'tester'), Query.orderDesc('points'), Query.limit(25)],
  );

  const entries: LeaderboardEntry[] = rows.map((p) => ({
    testerId: p.userId,
    displayName: p.displayName,
    avatarFileId: p.avatarFileId,
    points: p.points,
    reputation: p.reputation,
    testsCompleted: p.testsCompleted,
    tasksThisMonth: p.monthKey === month ? p.tasksThisMonth : 0,
  }));
  return { period, month, entries };
});
