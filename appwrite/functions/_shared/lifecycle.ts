/**
 * Enrollment / task / app lifecycle shared by several functions. All writes are idempotent where
 * it matters (unique indexes + ledger idempotency keys).
 */
import { Permission, Role } from 'node-appwrite';

import type { DomainConfig } from '../../../src/lib/domain/config';
import { computeReputation, EMPTY_HISTORY, setDayHistory } from '../../../src/lib/domain/rules';
import { GENERIC_INSTRUCTION } from '../../../src/lib/domain/testPlan';
import { dayNumberFor, taskDayKey } from '../../../src/lib/domain/time';
import type {
  App,
  AppRow,
  AppStatus,
  DailyTaskRow,
  Enrollment,
  EnrollmentRow,
  Profile,
  ProfileRow,
  TestPlanRow,
} from '../../../src/lib/domain/types';

import {
  createRow,
  getRow,
  getRowOrNull,
  incrementColumn,
  isConflict,
  listRows,
  Query,
  readableBy,
  TABLES,
  updateRow,
} from './db';
import { applyCredits, applyPoints } from './ledger';
import { sendPush } from './push';
import type { Admin } from './runtime';

export const planRowId = (appId: string, day: number) => `${appId}-${day}`;

/** Row permissions for an app + its plan rows. Testers can read only while it's recruiting/testing. */
export function appPermissions(ownerId: string, status: AppStatus): string[] {
  const perms = [Permission.read(Role.user(ownerId))];
  if (status === 'recruiting' || status === 'testing') perms.push(Permission.read(Role.label('tester')));
  return perms;
}

export async function syncPlanPermissions(admin: Admin, app: App): Promise<void> {
  const rows = await listRows<TestPlanRow>(admin, TABLES.testPlans, [Query.equal('appId', app.$id), Query.limit(100)]);
  const perms = appPermissions(app.ownerId, app.status);
  await Promise.all(rows.map((r) => updateRow<TestPlanRow>(admin, TABLES.testPlans, r.$id, {}, perms)));
}

export function testerDeviceLabel(p: Pick<ProfileRow, 'deviceModel' | 'androidVersion'>): string | null {
  if (!p.deviceModel) return null;
  return p.androidVersion ? `${p.deviceModel} · Android ${p.androidVersion}` : p.deviceModel;
}

export function recomputeReputation(p: ProfileRow): number {
  return computeReputation(p);
}

export function currentMonthKey(now = new Date()): string {
  return now.toISOString().slice(0, 7);
}

/**
 * Create today's task for an active enrollment if it doesn't exist yet.
 * Returns the created task, or null when it already existed / the test is over.
 */
export async function ensureTodayTask(
  admin: Admin,
  e: Enrollment,
  tester: Pick<ProfileRow, 'timezone'>,
  cfg: DomainConfig,
  now: Date,
): Promise<(DailyTaskRow & { $id: string }) | null> {
  if (!e.startDay) return null;
  const todayKey = taskDayKey(now, tester.timezone || 'UTC', cfg.TASK_DAY_RESET_HOUR);
  const dayNumber = dayNumberFor(e.startDay, todayKey);
  if (dayNumber < 1 || dayNumber > cfg.TEST_DAYS) return null;

  const plan = await getRowOrNull<TestPlanRow>(admin, TABLES.testPlans, planRowId(e.appId, dayNumber));
  try {
    const task = await createRow<DailyTaskRow>(
      admin,
      TABLES.dailyTasks,
      {
        enrollmentId: e.$id,
        appId: e.appId,
        appName: e.appName,
        appIconFileId: e.appIconFileId,
        packageName: e.packageName,
        testerId: e.testerId,
        developerId: e.developerId,
        dayNumber,
        dueDate: todayKey,
        title: plan?.title || `Day ${dayNumber}`,
        instruction: plan?.instruction || GENERIC_INSTRUCTION,
        requiresScreenshot: plan?.requiresScreenshot ?? true,
        question: plan?.question ?? null,
        status: 'pending',
        screenshotFileId: null,
        answer: null,
        note: null,
        completedAt: null,
        flagReason: null,
      },
      readableBy(e.testerId, e.developerId),
    );
    await updateRow<EnrollmentRow>(admin, TABLES.enrollments, e.$id, {
      dayHistory: setDayHistory(e.dayHistory || EMPTY_HISTORY(cfg.TEST_DAYS), dayNumber, 'p', cfg.TEST_DAYS),
    });
    return task;
  } catch (err) {
    if (isConflict(err)) return null; // already generated this day
    throw err;
  }
}

/** Mark pending tasks before `todayKey` as missed; updates history + tester stats. Returns count. */
export async function markMissedTasks(admin: Admin, e: Enrollment, todayKey: string, cfg: DomainConfig): Promise<number> {
  const stale = await listRows<DailyTaskRow>(admin, TABLES.dailyTasks, [
    Query.equal('enrollmentId', e.$id),
    Query.equal('status', 'pending'),
    Query.lessThan('dueDate', todayKey),
    Query.limit(50),
  ]);
  if (stale.length === 0) return 0;
  let history = e.dayHistory || EMPTY_HISTORY(cfg.TEST_DAYS);
  for (const t of stale) {
    await updateRow<DailyTaskRow>(admin, TABLES.dailyTasks, t.$id, { status: 'missed' });
    history = setDayHistory(history, t.dayNumber, 'm', cfg.TEST_DAYS);
  }
  await updateRow<EnrollmentRow>(admin, TABLES.enrollments, e.$id, { dayHistory: history, streak: 0 });
  const profile = await getRow<ProfileRow>(admin, TABLES.profiles, e.testerId);
  const next = { ...profile, tasksMissed: profile.tasksMissed + stale.length };
  await updateRow<ProfileRow>(admin, TABLES.profiles, e.testerId, {
    tasksMissed: next.tasksMissed,
    reputation: recomputeReputation(next),
  });
  return stale.length;
}

/** Activate a joined enrollment (test started or late joiner). */
export async function activateEnrollment(admin: Admin, e: Enrollment, tester: Pick<ProfileRow, 'timezone'>, cfg: DomainConfig, now: Date): Promise<Enrollment> {
  const startDay = taskDayKey(now, tester.timezone || 'UTC', cfg.TASK_DAY_RESET_HOUR);
  const updated = (await updateRow<EnrollmentRow>(admin, TABLES.enrollments, e.$id, {
    status: 'active',
    startedAt: now.toISOString(),
    startDay,
    dayHistory: EMPTY_HISTORY(cfg.TEST_DAYS),
  })) as Enrollment;
  await ensureTodayTask(admin, updated, tester, cfg, now);
  return updated;
}

/** Start the test once enough testers joined: flips the app to `testing` and activates everyone. */
export async function startTestIfReady(admin: Admin, app: App, cfg: DomainConfig, now: Date): Promise<boolean> {
  if (app.status !== 'recruiting') return false;
  const live = await listRows<EnrollmentRow>(admin, TABLES.enrollments, [
    Query.equal('appId', app.$id),
    Query.equal('status', ['joined', 'active', 'warned']),
    Query.limit(100),
  ]);
  if (live.length < cfg.TESTERS_REQUIRED) return false;

  await updateRow<AppRow>(admin, TABLES.apps, app.$id, {
    status: 'testing',
    testStartDate: now.toISOString().slice(0, 10),
  }, appPermissions(app.ownerId, 'testing'));

  const testerIds: string[] = [];
  for (const e of live) {
    if (e.status !== 'joined') continue;
    const tester = await getRow<ProfileRow>(admin, TABLES.profiles, e.testerId);
    await activateEnrollment(admin, e as Enrollment, tester, cfg, now);
    testerIds.push(e.testerId);
  }
  await sendPush(admin, [app.ownerId], {
    title: `${app.name}: your test has started 🎉`,
    body: `${live.length} testers are in. Day 1 of ${cfg.TEST_DAYS} begins today.`,
    data: { url: `/app/${app.$id}`, kind: 'test_started', role: 'developer' },
    category: 'testerActivity',
  });
  await sendPush(admin, testerIds, {
    title: `${app.name} is ready to test`,
    body: 'Day 1 is live — open today’s task.',
    data: { url: '/today', kind: 'tasks_ready', role: 'tester' },
    category: 'dailyTasks',
  });
  return true;
}

/** Refund slots that were reserved but never filled. */
export async function refundOpenSlots(admin: Admin, app: App, cfg: DomainConfig, reason: string): Promise<number> {
  if (app.slotsOpen <= 0) return 0;
  const amount = app.slotsOpen * cfg.CREDITS_PER_TESTER_SLOT;
  const res = await applyCredits(admin, {
    developerId: app.ownerId,
    amount,
    type: 'slot_refund',
    refId: app.$id,
    note: `${app.slotsOpen} unused slot(s) — ${reason}`,
    idempotencyKey: `refund:${app.$id}:${reason}:${app.$updatedAt}`,
  });
  if (res.applied) {
    await updateRow<AppRow>(admin, TABLES.apps, app.$id, {
      slotsOpen: 0,
      creditsReserved: Math.max(0, app.creditsReserved - amount),
    });
  }
  return res.applied ? amount : 0;
}

/** When enough testers finished 14 days, the app is production-ready. */
export async function completeAppIfReady(admin: Admin, appId: string, cfg: DomainConfig): Promise<boolean> {
  const app = await getRow<AppRow>(admin, TABLES.apps, appId);
  if (app.status === 'completed' || app.testersCompleted < cfg.TESTERS_REQUIRED) return false;
  const completed = (await updateRow<AppRow>(admin, TABLES.apps, appId, { status: 'completed' }, appPermissions(app.ownerId, 'completed'))) as App;
  await syncPlanPermissions(admin, completed);
  await refundOpenSlots(admin, completed, cfg, 'completed');
  await sendPush(admin, [app.ownerId], {
    title: `${app.name} finished its ${cfg.TEST_DAYS}-day test ✅`,
    body: 'Your production-access checklist is unlocked.',
    data: { url: `/app/${appId}`, kind: 'app_completed', role: 'developer' },
    category: 'testerActivity',
  });
  return true;
}

/** Mark an enrollment completed; awards the bonus only if the tester completed the final day. */
export async function completeEnrollment(
  admin: Admin,
  e: Enrollment,
  cfg: DomainConfig,
  opts: { withBonus: boolean },
): Promise<void> {
  if (e.status === 'completed' || e.status === 'dropped') return;
  await updateRow<EnrollmentRow>(admin, TABLES.enrollments, e.$id, { status: 'completed' });
  if (opts.withBonus && cfg.POINTS_COMPLETION_BONUS > 0) {
    await applyPoints(admin, {
      testerId: e.testerId,
      amount: cfg.POINTS_COMPLETION_BONUS,
      type: 'completion_bonus',
      refId: e.appId,
      note: `Completed ${cfg.TEST_DAYS} days of ${e.appName}`,
      idempotencyKey: `bonus:${e.$id}`,
    });
  }
  await incrementColumn(admin, TABLES.profiles, e.testerId, 'testsCompleted', 1);
  await incrementColumn(admin, TABLES.apps, e.appId, 'testersCompleted', 1);
  await incrementColumn(admin, TABLES.apps, e.appId, 'testersActive', -1);
  await sendPush(admin, [e.testerId], {
    title: `You finished testing ${e.appName} 🏁`,
    body: opts.withBonus ? `+${cfg.POINTS_COMPLETION_BONUS} bonus points. Thanks for sticking with it!` : 'Thanks for testing!',
    data: { url: '/my-tests', kind: 'test_completed', role: 'tester' },
    category: 'testerActivity',
  });
  await completeAppIfReady(admin, e.appId, cfg);
}

/**
 * Drop an enrollment: frees the slot so a replacement can claim it.
 * `penalize` applies the reputation penalty (not for account deletion / app cancellation).
 */
export async function dropEnrollment(
  admin: Admin,
  e: Enrollment,
  cfg: DomainConfig,
  opts: { penalize: boolean; reason: string; notifyDeveloper: boolean },
): Promise<void> {
  if (e.status === 'dropped' || e.status === 'completed') return;
  await updateRow<EnrollmentRow>(admin, TABLES.enrollments, e.$id, { status: 'dropped' });
  await incrementColumn(admin, TABLES.apps, e.appId, 'testersActive', -1);

  const app = await getRowOrNull<AppRow>(admin, TABLES.apps, e.appId);
  if (app && (app.status === 'recruiting' || app.status === 'testing')) {
    // Reopen the slot for a replacement (already paid for — no extra charge).
    await incrementColumn(admin, TABLES.apps, e.appId, 'slotsOpen', 1);
  }

  if (opts.penalize) {
    const p = await getRowOrNull<ProfileRow>(admin, TABLES.profiles, e.testerId);
    if (p) {
      const next = { ...p, drops: p.drops + 1 };
      await updateRow<ProfileRow>(admin, TABLES.profiles, e.testerId, {
        drops: next.drops,
        reputation: Math.max(0, Math.min(recomputeReputation(next), p.reputation - cfg.DROP_REPUTATION_PENALTY)),
        currentStreak: 0,
      });
    }
    await sendPush(admin, [e.testerId], {
      title: `You were removed from ${e.appName}`,
      body: 'No task was completed for 3 days. Your slot went to another tester.',
      data: { url: '/my-tests', kind: 'dropped', role: 'tester' },
      category: 'testerActivity',
    });
  }

  if (opts.notifyDeveloper && app) {
    await sendPush(admin, [e.developerId], {
      title: `${app.name}: a tester dropped out`,
      body: `${e.testerName} left (${opts.reason}). We reopened the slot and are recruiting a replacement.`,
      data: { url: `/app/${app.$id}/testers`, kind: 'tester_dropped', role: 'developer' },
      category: 'testerActivity',
    });
  }
}

/** Invite high-reputation testers whose device matches when an app opens (or a slot reopens). */
export async function inviteTesters(admin: Admin, app: Pick<App, '$id' | 'name' | 'minReputation' | 'minAndroidVersion' | 'ownerId'>, limit = 40): Promise<void> {
  const candidates = await listRows<Profile>(admin, TABLES.profiles, [
    Query.equal('role', 'tester'),
    Query.greaterThanEqual('reputation', app.minReputation),
    Query.greaterThanEqual('androidVersion', app.minAndroidVersion),
    Query.orderDesc('reputation'),
    Query.limit(limit),
  ]);
  const ids = candidates.map((c) => c.userId).filter((id) => id !== app.ownerId);
  if (ids.length === 0) return;
  await sendPush(admin, ids, {
    title: 'A new test matches your device',
    body: `${app.name} is looking for testers. Claim a slot before it fills up.`,
    data: { url: '/available', kind: 'new_test', role: 'tester' },
    category: 'testerActivity',
  });
}
