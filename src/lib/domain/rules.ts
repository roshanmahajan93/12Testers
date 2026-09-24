/**
 * Pure business rules. Used by the Appwrite Functions (authoritative) and by the app (display /
 * optimistic updates only). Everything here must be deterministic and side-effect free.
 */
import type { DomainConfig } from './config';
import { diffDayKeys, hoursBetween } from './time';
import type { AppStatus, EnrollmentStatus, ProfileRow, TaskStatus } from './types';

// ---------------------------------------------------------------------------------------------
// Streaks
// ---------------------------------------------------------------------------------------------

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastStreakDay: string | null;
}

/**
 * Advance a streak when the tester completes something on `dayKey`.
 * Same day → unchanged, next day → +1, gap → restart at 1.
 */
export function advanceStreak(state: StreakState, dayKey: string): StreakState {
  if (state.lastStreakDay === dayKey) return state;
  const continues = state.lastStreakDay !== null && diffDayKeys(state.lastStreakDay, dayKey) === 1;
  const currentStreak = continues ? state.currentStreak + 1 : 1;
  return {
    currentStreak,
    longestStreak: Math.max(state.longestStreak, currentStreak),
    lastStreakDay: dayKey,
  };
}

/** Streak to display today: a streak is broken if the last completed day is before yesterday. */
export function visibleStreak(state: StreakState, todayKey: string): number {
  if (!state.lastStreakDay) return 0;
  return diffDayKeys(state.lastStreakDay, todayKey) <= 1 ? state.currentStreak : 0;
}

// ---------------------------------------------------------------------------------------------
// Points
// ---------------------------------------------------------------------------------------------

export function pointsForTask(dayNumber: number, cfg: DomainConfig): { task: number; bonus: number } {
  return {
    task: cfg.POINTS_PER_TASK,
    bonus: dayNumber >= cfg.TEST_DAYS ? cfg.POINTS_COMPLETION_BONUS : 0,
  };
}

// ---------------------------------------------------------------------------------------------
// Reputation
// ---------------------------------------------------------------------------------------------

export type ReputationStats = Pick<
  ProfileRow,
  'tasksCompleted' | 'tasksMissed' | 'flagsReceived' | 'drops' | 'ratingSum' | 'ratingCount'
>;

/**
 * Reputation 0–100:
 * - 60% task completion rate (defaults to neutral 0.75 until 5 tasks are recorded)
 * - 25% average developer rating of feedback quality (neutral 3/5 until rated)
 * - 15% baseline
 * - minus 6 per flagged task and 12 per dropped test, capped.
 */
export function computeReputation(s: ReputationStats): number {
  const attempted = s.tasksCompleted + s.tasksMissed;
  const completionRate = attempted < 5 ? 0.75 : s.tasksCompleted / attempted;
  const avgRating = s.ratingCount > 0 ? s.ratingSum / s.ratingCount : 3;
  const base = 60 * completionRate + 25 * (avgRating / 5) + 15;
  const penalty = Math.min(40, s.flagsReceived * 6) + Math.min(45, s.drops * 12);
  return Math.round(Math.max(0, Math.min(100, base - penalty)));
}

/** How many tests a tester may run at once, unlocked by reputation. */
export function maxActiveTestsFor(reputation: number, preferred: number, cfg: DomainConfig): number {
  const cap = cfg.MAX_ACTIVE_TESTS_PER_TESTER;
  const byRep = reputation >= 85 ? cap : reputation >= 70 ? Math.min(cap, 3) : reputation >= 45 ? Math.min(cap, 2) : 1;
  return Math.max(1, Math.min(byRep, preferred > 0 ? preferred : cap));
}

export type ReputationTier = 'new' | 'bronze' | 'silver' | 'gold' | 'platinum';

export function reputationTier(reputation: number): ReputationTier {
  if (reputation >= 90) return 'platinum';
  if (reputation >= 75) return 'gold';
  if (reputation >= 60) return 'silver';
  if (reputation >= 40) return 'bronze';
  return 'new';
}

// ---------------------------------------------------------------------------------------------
// Enrollment / dropout
// ---------------------------------------------------------------------------------------------

export const LIVE_ENROLLMENT: readonly EnrollmentStatus[] = ['joined', 'active', 'warned'];
export const TASKABLE_ENROLLMENT: readonly EnrollmentStatus[] = ['active', 'warned'];

export type DropoutAction = 'none' | 'warn' | 'drop';

/**
 * Decide what to do with an enrollment based on inactivity. The clock starts at the last
 * completed task, or when the tester started the test if they never completed one.
 */
export function dropoutAction(
  e: { status: EnrollmentStatus; lastTaskCompletedAt: string | null; startedAt: string | null },
  now: Date,
  cfg: DomainConfig,
): DropoutAction {
  if (e.status !== 'active' && e.status !== 'warned') return 'none';
  const since = e.lastTaskCompletedAt ?? e.startedAt;
  if (!since) return 'none';
  const idle = hoursBetween(new Date(since), now);
  if (idle >= cfg.DROPOUT_DROP_HOURS) return 'drop';
  if (idle >= cfg.DROPOUT_WARN_HOURS && e.status === 'active') return 'warn';
  return 'none';
}

// ---------------------------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------------------------

export type CompletionError =
  | 'not_owner'
  | 'already_completed'
  | 'not_pending'
  | 'not_today'
  | 'screenshot_required'
  | 'answer_required';

export function validateCompletion(
  task: {
    testerId: string;
    status: TaskStatus;
    dueDate: string;
    requiresScreenshot: boolean;
    question: string | null;
  },
  input: { callerId: string; todayKey: string; screenshotFileId?: string | null; answer?: string | null },
): CompletionError | null {
  if (task.testerId !== input.callerId) return 'not_owner';
  if (task.status === 'completed') return 'already_completed';
  if (task.status !== 'pending') return 'not_pending';
  if (task.dueDate !== input.todayKey) return 'not_today';
  if (task.requiresScreenshot && !input.screenshotFileId) return 'screenshot_required';
  if (task.question && !(input.answer ?? '').trim()) return 'answer_required';
  return null;
}

/** Replace one character of a 14-char day history string. */
export function setDayHistory(history: string, dayNumber: number, mark: 'c' | 'm' | 'f' | 'p', days: number): string {
  const chars = (history || '').padEnd(days, '-').slice(0, days).split('');
  if (dayNumber >= 1 && dayNumber <= days) chars[dayNumber - 1] = mark;
  return chars.join('');
}

export const EMPTY_HISTORY = (days: number) => '-'.repeat(days);

// ---------------------------------------------------------------------------------------------
// App progress
// ---------------------------------------------------------------------------------------------

export interface AppProgress {
  testers: number;
  testersRequired: number;
  day: number;
  days: number;
  /** 0..1 overall progress = active testers × days completed. */
  ratio: number;
  productionReady: boolean;
}

export function appProgress(
  app: { status: AppStatus; testersActive: number; testersCompleted: number; testStartDate: string | null },
  todayKey: string,
  startKey: string | null,
  cfg: DomainConfig,
): AppProgress {
  const testers = app.status === 'completed' ? app.testersCompleted : app.testersActive;
  const day =
    app.status === 'completed'
      ? cfg.TEST_DAYS
      : startKey
        ? Math.max(0, Math.min(cfg.TEST_DAYS, diffDayKeys(startKey, todayKey) + 1))
        : 0;
  const testerRatio = Math.min(1, testers / cfg.TESTERS_REQUIRED);
  const dayRatio = day / cfg.TEST_DAYS;
  return {
    testers,
    testersRequired: cfg.TESTERS_REQUIRED,
    day,
    days: cfg.TEST_DAYS,
    ratio: app.status === 'completed' ? 1 : testerRatio * dayRatio,
    productionReady: app.status === 'completed' || (app.testersCompleted >= cfg.TESTERS_REQUIRED),
  };
}

// ---------------------------------------------------------------------------------------------
// Claim eligibility (display on client, enforced in claimTest)
// ---------------------------------------------------------------------------------------------

export type ClaimBlocker =
  | 'no_slots'
  | 'low_reputation'
  | 'android_version'
  | 'active_cap'
  | 'already_enrolled'
  | 'not_open'
  | 'own_app';

export function claimBlocker(
  app: { status: AppStatus; slotsOpen: number; minReputation: number; minAndroidVersion: number; ownerId: string },
  tester: { userId: string; reputation: number; androidVersion: number | null; activeTests: number; maxActive: number },
  alreadyEnrolled: boolean,
): ClaimBlocker | null {
  if (app.ownerId === tester.userId) return 'own_app';
  if (app.status !== 'recruiting' && app.status !== 'testing') return 'not_open';
  if (alreadyEnrolled) return 'already_enrolled';
  if (app.slotsOpen <= 0) return 'no_slots';
  if (tester.reputation < app.minReputation) return 'low_reputation';
  if (app.minAndroidVersion > 0 && (tester.androidVersion ?? 0) < app.minAndroidVersion) return 'android_version';
  if (tester.activeTests >= tester.maxActive) return 'active_cap';
  return null;
}

export const CLAIM_BLOCKER_MESSAGES: Record<ClaimBlocker, string> = {
  no_slots: 'All tester slots are taken.',
  low_reputation: 'Your reputation is below this test’s minimum.',
  android_version: 'Your Android version is below this app’s minimum.',
  active_cap: 'You’re at your active test limit. Finish a test to take another.',
  already_enrolled: 'You already joined this test.',
  not_open: 'This test is not open for new testers.',
  own_app: 'You can’t test your own app.',
};
