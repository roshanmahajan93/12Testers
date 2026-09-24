/**
 * claimTest (tester) — join an open test.
 * Checks: rate limit, slots, reputation, Android version, active-test cap, not already enrolled.
 * Atomically takes a slot (decrement with floor 0), creates the enrollment, and starts the test
 * once TESTERS_REQUIRED testers have joined.
 */
import { claimBlocker, CLAIM_BLOCKER_MESSAGES, LIVE_ENROLLMENT, maxActiveTestsFor } from '../../../src/lib/domain/rules';
import { EMPTY_HISTORY } from '../../../src/lib/domain/rules';
import type { App, AppRow, Enrollment, EnrollmentRow, ProfileRow } from '../../../src/lib/domain/types';
import { claimTestSchema } from '../../../src/lib/validators';
import { requireRole } from '../_shared/auth';
import {
  countRows,
  createRow,
  getRow,
  incrementColumn,
  isConflict,
  loadConfig,
  Query,
  readableBy,
  TABLES,
} from '../_shared/db';
import { activateEnrollment, startTestIfReady, testerDeviceLabel } from '../_shared/lifecycle';
import { sendPush } from '../_shared/push';
import { DATABASE_ID, FnError, handler, validate } from '../_shared/runtime';

export default handler(async ({ admin, body, userId }) => {
  const { appId } = validate(claimTestSchema, body);
  const caller = await requireRole(admin, userId, 'tester');
  const cfg = await loadConfig(admin);
  const now = new Date();

  const recentClaims = await countRows(admin, TABLES.enrollments, [
    Query.equal('testerId', caller.userId),
    Query.greaterThan('$createdAt', new Date(now.getTime() - 3_600_000).toISOString()),
  ]);
  if (recentClaims >= cfg.CLAIM_RATE_LIMIT_PER_HOUR) {
    throw new FnError('rate_limited', 'You’ve joined a lot of tests just now — try again later.', 429);
  }

  const [app, profile] = await Promise.all([
    getRow<AppRow>(admin, TABLES.apps, appId),
    getRow<ProfileRow>(admin, TABLES.profiles, caller.userId),
  ]);
  if (!profile.deviceModel) throw new FnError('setup_incomplete', 'Finish your tester profile first.');

  const [activeTests, alreadyEnrolled] = await Promise.all([
    countRows(admin, TABLES.enrollments, [Query.equal('testerId', caller.userId), Query.equal('status', [...LIVE_ENROLLMENT])]),
    countRows(admin, TABLES.enrollments, [Query.equal('testerId', caller.userId), Query.equal('appId', appId)]),
  ]);
  const blocker = claimBlocker(
    app,
    {
      userId: caller.userId,
      reputation: profile.reputation,
      androidVersion: profile.androidVersion,
      activeTests,
      maxActive: maxActiveTestsFor(profile.reputation, profile.maxActiveTests, cfg),
    },
    alreadyEnrolled > 0,
  );
  if (blocker) throw new FnError(blocker, CLAIM_BLOCKER_MESSAGES[blocker], 409);

  // Atomic slot claim: fails if another tester took the last slot a moment ago.
  try {
    await admin.db.decrementRowColumn({ databaseId: DATABASE_ID, tableId: TABLES.apps, rowId: appId, column: 'slotsOpen', value: 1, min: 0 });
  } catch {
    throw new FnError('no_slots', CLAIM_BLOCKER_MESSAGES.no_slots, 409);
  }

  let enrollment: Enrollment;
  try {
    enrollment = (await createRow<EnrollmentRow>(
      admin,
      TABLES.enrollments,
      {
        appId,
        appName: app.name,
        appIconFileId: app.iconFileId,
        packageName: app.packageName,
        testerId: caller.userId,
        developerId: app.ownerId,
        testerName: profile.displayName,
        testerAvatarFileId: profile.avatarFileId,
        testerDevice: testerDeviceLabel(profile),
        testerReputation: profile.reputation,
        status: 'joined',
        joinedAt: now.toISOString(),
        startedAt: null,
        startDay: null,
        lastTaskCompletedAt: null,
        tasksCompleted: 0,
        streak: 0,
        dayHistory: EMPTY_HISTORY(cfg.TEST_DAYS),
      },
      readableBy(caller.userId, app.ownerId),
    )) as Enrollment;
  } catch (e) {
    await incrementColumn(admin, TABLES.apps, appId, 'slotsOpen', 1); // give the slot back
    if (isConflict(e)) throw new FnError('already_enrolled', CLAIM_BLOCKER_MESSAGES.already_enrolled, 409);
    throw e;
  }
  await incrementColumn(admin, TABLES.apps, appId, 'testersActive', 1);

  // Replacement / late joiner on a running test starts immediately.
  if (app.status === 'testing') {
    enrollment = await activateEnrollment(admin, enrollment, profile, cfg, now);
  }

  await sendPush(admin, [app.ownerId], {
    title: `${app.name}: new tester joined`,
    body: `${profile.displayName} (${testerDeviceLabel(profile) ?? 'Android'}) claimed a slot.`,
    data: { url: `/app/${appId}/testers`, kind: 'tester_joined', role: 'developer' },
    category: 'testerActivity',
  });

  const fresh = await getRow<AppRow>(admin, TABLES.apps, appId);
  const started = await startTestIfReady(admin, fresh as App, cfg, now);
  const finalEnrollment = started ? await getRow<EnrollmentRow>(admin, TABLES.enrollments, enrollment.$id) : enrollment;

  return { enrollment: finalEnrollment, testStarted: started || app.status === 'testing' };
});
