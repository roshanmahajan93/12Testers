import { DEFAULT_CONFIG } from '../../../src/lib/domain/config';
import { TABLES } from '../../../src/lib/domain/resources';
import { EMPTY_HISTORY } from '../../../src/lib/domain/rules';
import { templatePlan } from '../../../src/lib/domain/testPlan';
import type { App, AppRow, DailyTaskRow, Enrollment, EnrollmentRow, ProfileRow } from '../../../src/lib/domain/types';
import { applyCredits, applyPoints } from '../_shared/ledger';
import {
  completeEnrollment,
  dropEnrollment,
  ensureTodayTask,
  markMissedTasks,
  planRowId,
  startTestIfReady,
} from '../_shared/lifecycle';
import { FnError } from '../_shared/runtime';

import { fakeAdmin, type FakeTables } from './fakeAdmin';

const cfg = DEFAULT_CONFIG;

function profile(userId: string, extra: Partial<ProfileRow> = {}): ProfileRow {
  return {
    userId,
    role: 'tester',
    displayName: userId,
    avatarFileId: null,
    country: null,
    languages: [],
    timezone: 'UTC',
    expoPushToken: null,
    notificationPrefs: null,
    credits: 0,
    isPro: false,
    companyName: null,
    deviceModel: 'Pixel 8',
    androidVersion: 14,
    maxActiveTests: 3,
    points: 0,
    reputation: 60,
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
    ...extra,
  };
}

async function seedApp(db: FakeTables, status: AppRow['status'] = 'recruiting'): Promise<App> {
  const app: AppRow = {
    ownerId: 'dev',
    ownerName: 'Dev',
    name: 'Trail Log',
    packageName: 'com.example.trail',
    iconFileId: null,
    shortDescription: 'Hiking log',
    category: 'lifestyle',
    optInUrl: 'https://play.google.com/apps/testing/com.example.trail',
    googleGroupUrl: null,
    generalInstructions: '',
    minReputation: 0,
    minAndroidVersion: 0,
    testersNeeded: 14,
    testersActive: 0,
    testersCompleted: 0,
    slotsOpen: 14,
    status,
    testStartDate: null,
    isBoosted: false,
    boostUntil: null,
    creditsReserved: 140,
  };
  await db.createRow({ tableId: TABLES.apps, rowId: 'app1', data: app as unknown as Record<string, unknown> });
  await db.createRow({ tableId: TABLES.profiles, rowId: 'dev', data: profile('dev', { role: 'developer', credits: 0 }) as unknown as Record<string, unknown> });
  for (const day of templatePlan(cfg.TEST_DAYS)) {
    await db.createRow({ tableId: TABLES.testPlans, rowId: planRowId('app1', day.dayNumber), data: { appId: 'app1', ...day } });
  }
  return (await db.getRow({ tableId: TABLES.apps, rowId: 'app1' })) as unknown as App;
}

async function seedEnrollment(db: FakeTables, testerId: string, extra: Partial<EnrollmentRow> = {}): Promise<Enrollment> {
  await db.createRow({ tableId: TABLES.profiles, rowId: testerId, data: profile(testerId) as unknown as Record<string, unknown> });
  const row: EnrollmentRow = {
    appId: 'app1',
    appName: 'Trail Log',
    appIconFileId: null,
    packageName: 'com.example.trail',
    testerId,
    developerId: 'dev',
    testerName: testerId,
    testerAvatarFileId: null,
    testerDevice: 'Pixel 8',
    testerReputation: 60,
    status: 'joined',
    joinedAt: '2026-05-01T00:00:00Z',
    startedAt: null,
    startDay: null,
    lastTaskCompletedAt: null,
    tasksCompleted: 0,
    streak: 0,
    dayHistory: EMPTY_HISTORY(cfg.TEST_DAYS),
    ...extra,
  };
  const created = await db.createRow({ tableId: TABLES.enrollments, rowId: `e-${testerId}`, data: row as unknown as Record<string, unknown> });
  return created as unknown as Enrollment;
}

describe('generateDailyTasks building blocks', () => {
  it('creates exactly one task per enrollment per tester-local day (idempotent)', async () => {
    const { admin, db } = fakeAdmin();
    await seedApp(db, 'testing');
    const e = await seedEnrollment(db, 't1', { status: 'active', startDay: '2026-05-01' });
    const now = new Date('2026-05-03T10:00:00Z'); // day 3 in UTC

    const first = await ensureTodayTask(admin, e, { timezone: 'UTC' }, cfg, now);
    expect(first).toMatchObject({ dayNumber: 3, dueDate: '2026-05-03', status: 'pending', instruction: templatePlan(14)[2]!.instruction });
    expect(await ensureTodayTask(admin, e, { timezone: 'UTC' }, cfg, now)).toBeNull();
    expect(db.rows(TABLES.dailyTasks)).toHaveLength(1);
  });

  it('uses the tester timezone + reset hour for the task day', async () => {
    const { admin, db } = fakeAdmin();
    await seedApp(db, 'testing');
    const e = await seedEnrollment(db, 't1', { status: 'active', startDay: '2026-05-01' });
    // 02:00 on May 4th in Kolkata is still May 3rd's task day (reset at 04:00).
    const task = await ensureTodayTask(admin, e, { timezone: 'Asia/Kolkata' }, cfg, new Date('2026-05-03T20:30:00Z'));
    expect(task).toMatchObject({ dueDate: '2026-05-03', dayNumber: 3 });
  });

  it('does not create tasks past the last test day', async () => {
    const { admin, db } = fakeAdmin();
    await seedApp(db, 'testing');
    const e = await seedEnrollment(db, 't1', { status: 'active', startDay: '2026-05-01' });
    expect(await ensureTodayTask(admin, e, { timezone: 'UTC' }, cfg, new Date('2026-05-15T10:00:00Z'))).toBeNull();
  });

  it('marks yesterday’s unfinished task missed and updates tester stats', async () => {
    const { admin, db } = fakeAdmin();
    await seedApp(db, 'testing');
    const e = await seedEnrollment(db, 't1', { status: 'active', startDay: '2026-05-01' });
    await ensureTodayTask(admin, e, { timezone: 'UTC' }, cfg, new Date('2026-05-01T10:00:00Z'));

    const fresh = (await db.getRow({ tableId: TABLES.enrollments, rowId: e.$id })) as unknown as Enrollment;
    expect(await markMissedTasks(admin, fresh, '2026-05-02', cfg)).toBe(1);

    const [task] = db.rows(TABLES.dailyTasks) as unknown as DailyTaskRow[];
    expect(task!.status).toBe('missed');
    const after = (await db.getRow({ tableId: TABLES.enrollments, rowId: e.$id })) as unknown as EnrollmentRow;
    expect(after.dayHistory[0]).toBe('m');
    const p = (await db.getRow({ tableId: TABLES.profiles, rowId: 't1' })) as unknown as ProfileRow;
    expect(p.tasksMissed).toBe(1);
  });
});

describe('startTestIfReady', () => {
  it('waits for the required number of testers', async () => {
    const { admin, db } = fakeAdmin();
    const app = await seedApp(db);
    for (let i = 0; i < cfg.TESTERS_REQUIRED - 1; i++) await seedEnrollment(db, `t${i}`);
    expect(await startTestIfReady(admin, app, cfg, new Date('2026-05-02T09:00:00Z'))).toBe(false);
  });

  it('starts the test, activates everyone and creates day-1 tasks', async () => {
    const { admin, db } = fakeAdmin();
    const app = await seedApp(db);
    for (let i = 0; i < cfg.TESTERS_REQUIRED; i++) await seedEnrollment(db, `t${i}`);
    expect(await startTestIfReady(admin, app, cfg, new Date('2026-05-02T09:00:00Z'))).toBe(true);

    const updated = (await db.getRow({ tableId: TABLES.apps, rowId: 'app1' })) as unknown as AppRow;
    expect(updated).toMatchObject({ status: 'testing', testStartDate: '2026-05-02' });
    const enrollments = db.rows(TABLES.enrollments) as unknown as EnrollmentRow[];
    expect(enrollments.every((e) => e.status === 'active' && e.startDay === '2026-05-02')).toBe(true);
    const tasks = db.rows(TABLES.dailyTasks) as unknown as DailyTaskRow[];
    expect(tasks).toHaveLength(cfg.TESTERS_REQUIRED);
    expect(tasks.every((t) => t.dayNumber === 1)).toBe(true);
    // Testers can read the app while it's testing; developer is notified.
    expect(db.table(TABLES.apps).get('app1')!.$permissions).toContain('read("label:tester")');
    expect(db.rows(TABLES.notifications).some((n) => n.userId === 'dev')).toBe(true);
  });
});

describe('dropout and completion', () => {
  it('drop frees the slot and penalises reputation', async () => {
    const { admin, db } = fakeAdmin();
    await seedApp(db, 'testing');
    await db.updateRow({ tableId: TABLES.apps, rowId: 'app1', data: { slotsOpen: 2, testersActive: 12 } });
    const e = await seedEnrollment(db, 't1', { status: 'active', startDay: '2026-05-01' });

    await dropEnrollment(admin, e, cfg, { penalize: true, reason: 'inactive', notifyDeveloper: true });

    const app = (await db.getRow({ tableId: TABLES.apps, rowId: 'app1' })) as unknown as AppRow;
    expect(app).toMatchObject({ slotsOpen: 3, testersActive: 11 });
    const p = (await db.getRow({ tableId: TABLES.profiles, rowId: 't1' })) as unknown as ProfileRow;
    expect(p.drops).toBe(1);
    expect(p.reputation).toBeLessThanOrEqual(60 - cfg.DROP_REPUTATION_PENALTY);
    // Dropping twice is a no-op.
    const again = (await db.getRow({ tableId: TABLES.enrollments, rowId: e.$id })) as unknown as Enrollment;
    await dropEnrollment(admin, again, cfg, { penalize: true, reason: 'inactive', notifyDeveloper: true });
    expect(((await db.getRow({ tableId: TABLES.apps, rowId: 'app1' })) as unknown as AppRow).slotsOpen).toBe(3);
  });

  it('completion bonus is awarded once and the app completes at the required count', async () => {
    const { admin, db } = fakeAdmin();
    await seedApp(db, 'testing');
    await db.updateRow({ tableId: TABLES.apps, rowId: 'app1', data: { testersCompleted: cfg.TESTERS_REQUIRED - 1, testersActive: 2, slotsOpen: 1 } });
    const e = await seedEnrollment(db, 't1', { status: 'active', startDay: '2026-05-01' });

    await completeEnrollment(admin, e, cfg, { withBonus: true });
    await applyPoints(admin, { testerId: 't1', amount: cfg.POINTS_COMPLETION_BONUS, type: 'completion_bonus', idempotencyKey: `bonus:${e.$id}` });

    const p = (await db.getRow({ tableId: TABLES.profiles, rowId: 't1' })) as unknown as ProfileRow;
    expect(p.points).toBe(cfg.POINTS_COMPLETION_BONUS); // retried grant didn't double
    expect(p.testsCompleted).toBe(1);
    const app = (await db.getRow({ tableId: TABLES.apps, rowId: 'app1' })) as unknown as AppRow;
    expect(app.status).toBe('completed');
    // The unused slot was refunded to the developer.
    const dev = (await db.getRow({ tableId: TABLES.profiles, rowId: 'dev' })) as unknown as ProfileRow;
    expect(dev.credits).toBe(cfg.CREDITS_PER_TESTER_SLOT);
  });
});

describe('credit ledger', () => {
  it('is idempotent and refuses to go negative', async () => {
    const { admin, db } = fakeAdmin();
    await db.createRow({ tableId: TABLES.profiles, rowId: 'dev', data: profile('dev', { role: 'developer', credits: 0 }) as unknown as Record<string, unknown> });

    expect(await applyCredits(admin, { developerId: 'dev', amount: 50, type: 'purchase', idempotencyKey: 'rc:evt1' })).toEqual({ applied: true });
    expect(await applyCredits(admin, { developerId: 'dev', amount: 50, type: 'purchase', idempotencyKey: 'rc:evt1' })).toEqual({ applied: false });

    await expect(applyCredits(admin, { developerId: 'dev', amount: -140, type: 'slot_reserve', idempotencyKey: 'reserve:app1' })).rejects.toMatchObject({
      code: 'insufficient_credits',
    } satisfies Partial<FnError>);

    const dev = (await db.getRow({ tableId: TABLES.profiles, rowId: 'dev' })) as unknown as ProfileRow;
    expect(dev.credits).toBe(50);
    // The failed deduction left no ledger row behind.
    expect(db.rows(TABLES.creditTransactions)).toHaveLength(1);
  });
});
