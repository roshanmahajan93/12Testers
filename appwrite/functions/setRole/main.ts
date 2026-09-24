/**
 * setRole — called once right after sign-up with the role picked on the welcome screen.
 * Creates the profile (row id = user id, so it doubles as a lock) and sets the user label.
 * Rejects if the account already has a role. The client can never change roles.
 */
import { ROLES, type ProfileRow } from '../../../src/lib/domain/types';
import { isValidTimeZone } from '../../../src/lib/domain/time';
import { setRoleSchema } from '../../../src/lib/validators';
import { getCaller } from '../_shared/auth';
import { createRow, getRowOrNull, isConflict, loadConfig, readableBy, TABLES } from '../_shared/db';
import { applyCredits } from '../_shared/ledger';
import { FnError, handler, validate } from '../_shared/runtime';

export default handler(async ({ admin, body, userId }) => {
  const input = validate(setRoleSchema, body);
  const caller = await getCaller(admin, userId);
  if (caller.role) throw new FnError('role_exists', `This account is already registered as a ${caller.role}.`, 409);

  const cfg = await loadConfig(admin);
  const displayName = (input.displayName || caller.name || caller.email.split('@')[0] || 'New user').slice(0, 40);
  const timezone = input.timezone && isValidTimeZone(input.timezone) ? input.timezone : 'UTC';

  const profile: ProfileRow = {
    userId: caller.userId,
    role: input.role,
    displayName,
    avatarFileId: null,
    country: null,
    languages: [],
    timezone,
    notificationPrefs: null,
    credits: 0,
    isPro: false,
    companyName: null,
    deviceModel: null,
    androidVersion: null,
    maxActiveTests: Math.min(3, cfg.MAX_ACTIVE_TESTS_PER_TESTER),
    points: 0,
    reputation: cfg.DEFAULT_REPUTATION,
    currentStreak: 0,
    longestStreak: 0,
    lastStreakDay: null,
    testsCompleted: 0,
    tasksCompleted: 0,
    tasksMissed: 0,
    flagsReceived: 0,
    drops: 0,
    ratingSum: 0,
    ratingCount: 0,
    monthKey: null,
    tasksThisMonth: 0,
  };

  try {
    await createRow(admin, TABLES.profiles, profile, readableBy(caller.userId), caller.userId);
  } catch (e) {
    if (!isConflict(e)) throw e;
    // A previous attempt created the profile but failed before labelling — only resume if roles match.
    const existing = await getRowOrNull<ProfileRow>(admin, TABLES.profiles, caller.userId);
    if (!existing || existing.role !== input.role) {
      throw new FnError('role_exists', 'This account already has a different role.', 409);
    }
  }

  const otherLabels = caller.labels.filter((l) => !(ROLES as readonly string[]).includes(l));
  await admin.users.updateLabels({ userId: caller.userId, labels: [...otherLabels, input.role] });

  if (input.role === 'developer' && cfg.DEVELOPER_WELCOME_CREDITS > 0) {
    await applyCredits(admin, {
      developerId: caller.userId,
      amount: cfg.DEVELOPER_WELCOME_CREDITS,
      type: 'welcome',
      note: 'Welcome credits',
      idempotencyKey: `welcome:${caller.userId}`,
    });
  }

  return getRowOrNull<ProfileRow>(admin, TABLES.profiles, caller.userId);
});
