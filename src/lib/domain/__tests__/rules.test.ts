import { DEFAULT_CONFIG, resolveConfig, slotCost, slotsForApp } from '../config';
import {
  advanceStreak,
  appProgress,
  claimBlocker,
  computeReputation,
  dropoutAction,
  maxActiveTestsFor,
  pointsForTask,
  reputationTier,
  setDayHistory,
  validateCompletion,
  visibleStreak,
} from '../rules';

const cfg = DEFAULT_CONFIG;

describe('streaks', () => {
  const start = { currentStreak: 0, longestStreak: 0, lastStreakDay: null };

  it('starts, continues and resets', () => {
    const d1 = advanceStreak(start, '2026-05-01');
    expect(d1).toEqual({ currentStreak: 1, longestStreak: 1, lastStreakDay: '2026-05-01' });
    const d2 = advanceStreak(d1, '2026-05-02');
    expect(d2.currentStreak).toBe(2);
    const same = advanceStreak(d2, '2026-05-02');
    expect(same).toBe(d2); // completing a second app the same day doesn't double count
    const gap = advanceStreak(d2, '2026-05-05');
    expect(gap).toEqual({ currentStreak: 1, longestStreak: 2, lastStreakDay: '2026-05-05' });
  });

  it('shows 0 once a day has been skipped', () => {
    const s = { currentStreak: 4, longestStreak: 4, lastStreakDay: '2026-05-10' };
    expect(visibleStreak(s, '2026-05-11')).toBe(4);
    expect(visibleStreak(s, '2026-05-12')).toBe(0);
  });
});

describe('points', () => {
  it('awards the completion bonus only on the final day', () => {
    expect(pointsForTask(1, cfg)).toEqual({ task: cfg.POINTS_PER_TASK, bonus: 0 });
    expect(pointsForTask(cfg.TEST_DAYS, cfg)).toEqual({ task: cfg.POINTS_PER_TASK, bonus: cfg.POINTS_COMPLETION_BONUS });
  });
});

describe('reputation', () => {
  const base = { tasksCompleted: 0, tasksMissed: 0, flagsReceived: 0, drops: 0, ratingSum: 0, ratingCount: 0 };

  it('is neutral for new testers', () => {
    expect(computeReputation(base)).toBe(75);
  });

  it('rewards completion and good ratings', () => {
    expect(computeReputation({ ...base, tasksCompleted: 40, ratingSum: 25, ratingCount: 5 })).toBe(100);
  });

  it('penalises misses, flags and drops, clamped to 0..100', () => {
    const r = computeReputation({ ...base, tasksCompleted: 5, tasksMissed: 5, flagsReceived: 2, drops: 1 });
    expect(r).toBeLessThan(40);
    expect(computeReputation({ ...base, tasksMissed: 50, flagsReceived: 20, drops: 10 })).toBeGreaterThanOrEqual(0);
  });

  it('unlocks more simultaneous tests with reputation', () => {
    expect(maxActiveTestsFor(30, 5, cfg)).toBe(1);
    expect(maxActiveTestsFor(50, 5, cfg)).toBe(2);
    expect(maxActiveTestsFor(72, 5, cfg)).toBe(3);
    expect(maxActiveTestsFor(95, 5, cfg)).toBe(cfg.MAX_ACTIVE_TESTS_PER_TESTER);
    expect(maxActiveTestsFor(95, 2, cfg)).toBe(2); // tester's own preference caps it
  });

  it('maps to tiers', () => {
    expect(reputationTier(20)).toBe('new');
    expect(reputationTier(92)).toBe('platinum');
  });
});

describe('dropoutAction', () => {
  const now = new Date('2026-05-10T12:00:00Z');
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600_000).toISOString();

  it('warns after 48h and drops after 72h without a completed task', () => {
    expect(dropoutAction({ status: 'active', lastTaskCompletedAt: hoursAgo(10), startedAt: null }, now, cfg)).toBe('none');
    expect(dropoutAction({ status: 'active', lastTaskCompletedAt: hoursAgo(49), startedAt: null }, now, cfg)).toBe('warn');
    expect(dropoutAction({ status: 'warned', lastTaskCompletedAt: hoursAgo(60), startedAt: null }, now, cfg)).toBe('none');
    expect(dropoutAction({ status: 'warned', lastTaskCompletedAt: hoursAgo(73), startedAt: null }, now, cfg)).toBe('drop');
  });

  it('counts from the start when the tester never completed a task', () => {
    expect(dropoutAction({ status: 'active', lastTaskCompletedAt: null, startedAt: hoursAgo(80) }, now, cfg)).toBe('drop');
  });

  it('ignores enrollments that are not running', () => {
    expect(dropoutAction({ status: 'joined', lastTaskCompletedAt: null, startedAt: null }, now, cfg)).toBe('none');
    expect(dropoutAction({ status: 'completed', lastTaskCompletedAt: hoursAgo(500), startedAt: null }, now, cfg)).toBe('none');
  });
});

describe('validateCompletion', () => {
  const task = { testerId: 't1', status: 'pending' as const, dueDate: '2026-05-10', requiresScreenshot: true, question: 'Any bugs?' };
  const ok = { callerId: 't1', todayKey: '2026-05-10', screenshotFileId: 'f1', answer: 'None' };

  it('accepts a complete, on-time submission', () => {
    expect(validateCompletion(task, ok)).toBeNull();
  });

  it.each([
    [{ ...ok, callerId: 'other' }, 'not_owner'],
    [{ ...ok, todayKey: '2026-05-11' }, 'not_today'],
    [{ ...ok, screenshotFileId: null }, 'screenshot_required'],
    [{ ...ok, answer: '   ' }, 'answer_required'],
  ])('rejects %o with %s', (input, code) => {
    expect(validateCompletion(task, input)).toBe(code);
  });

  it('can only complete once', () => {
    expect(validateCompletion({ ...task, status: 'completed' }, ok)).toBe('already_completed');
    expect(validateCompletion({ ...task, status: 'missed' }, ok)).toBe('not_pending');
  });
});

describe('day history', () => {
  it('writes marks into a fixed-length string', () => {
    let h = '-'.repeat(14);
    h = setDayHistory(h, 1, 'c', 14);
    h = setDayHistory(h, 3, 'm', 14);
    h = setDayHistory(h, 20, 'c', 14); // out of range → ignored
    expect(h).toBe('c-m-----------');
  });
});

describe('appProgress', () => {
  it('multiplies tester and day progress', () => {
    const p = appProgress({ status: 'testing', testersActive: 12, testersCompleted: 0, testStartDate: '2026-05-01' }, '2026-05-07', '2026-05-01', cfg);
    expect(p.day).toBe(7);
    expect(p.ratio).toBeCloseTo(0.5);
    expect(p.productionReady).toBe(false);
  });

  it('is complete when the app is completed', () => {
    const p = appProgress({ status: 'completed', testersActive: 0, testersCompleted: 13, testStartDate: '2026-05-01' }, '2026-06-01', '2026-05-01', cfg);
    expect(p).toMatchObject({ ratio: 1, day: cfg.TEST_DAYS, productionReady: true, testers: 13 });
  });
});

describe('claimBlocker', () => {
  const app = { status: 'recruiting' as const, slotsOpen: 3, minReputation: 50, minAndroidVersion: 12, ownerId: 'dev' };
  const tester = { userId: 't', reputation: 70, androidVersion: 14, activeTests: 1, maxActive: 3 };

  it('allows an eligible tester', () => {
    expect(claimBlocker(app, tester, false)).toBeNull();
  });

  it('checks every requirement', () => {
    expect(claimBlocker({ ...app, ownerId: 't' }, tester, false)).toBe('own_app');
    expect(claimBlocker({ ...app, status: 'paused' }, tester, false)).toBe('not_open');
    expect(claimBlocker(app, tester, true)).toBe('already_enrolled');
    expect(claimBlocker({ ...app, slotsOpen: 0 }, tester, false)).toBe('no_slots');
    expect(claimBlocker(app, { ...tester, reputation: 40 }, false)).toBe('low_reputation');
    expect(claimBlocker(app, { ...tester, androidVersion: 11 }, false)).toBe('android_version');
    expect(claimBlocker(app, { ...tester, activeTests: 3 }, false)).toBe('active_cap');
  });
});

describe('config', () => {
  it('merges a stringly config row over defaults and ignores junk', () => {
    const c = resolveConfig({ TESTERS_REQUIRED: '20', TEST_DAYS: null, POINTS_PER_TASK: 'abc' });
    expect(c.TESTERS_REQUIRED).toBe(20);
    expect(c.TEST_DAYS).toBe(DEFAULT_CONFIG.TEST_DAYS);
    expect(c.POINTS_PER_TASK).toBe(DEFAULT_CONFIG.POINTS_PER_TASK);
  });

  it('prices slots with the buffer', () => {
    expect(slotsForApp(cfg)).toBe(14);
    expect(slotCost(14, cfg)).toBe(14 * cfg.CREDITS_PER_TESTER_SLOT);
  });
});
