/**
 * completeDailyTask (tester) — completes one app's task for today.
 * Validates ownership, due day (tester timezone), status and required proof; shares the screenshot
 * with the developer; awards points (idempotent); updates streaks, enrollment progress and
 * reputation; on the final day completes the enrollment (+bonus) and possibly the whole app.
 */
import { advanceStreak, pointsForTask, setDayHistory, validateCompletion, type CompletionError } from '../../../src/lib/domain/rules';
import { taskDayKey } from '../../../src/lib/domain/time';
import type { DailyTaskRow, Enrollment, EnrollmentRow, ProfileRow } from '../../../src/lib/domain/types';
import { completeTaskSchema } from '../../../src/lib/validators';
import { requireRole } from '../_shared/auth';
import { getRow, loadConfig, TABLES, updateRow } from '../_shared/db';
import { shareOwnedFile } from '../_shared/files';
import { applyPoints } from '../_shared/ledger';
import { completeEnrollment, currentMonthKey, recomputeReputation } from '../_shared/lifecycle';
import { FnError, handler, validate } from '../_shared/runtime';

const MESSAGES: Record<CompletionError, string> = {
  not_owner: 'This task belongs to someone else.',
  already_completed: 'You already completed this task.',
  not_pending: 'This task can no longer be completed.',
  not_today: 'This task was for another day. Check today’s tasks.',
  screenshot_required: 'Add a screenshot to complete today’s task.',
  answer_required: 'Answer today’s question to complete the task.',
};

export default handler(async ({ admin, body, userId }) => {
  const input = validate(completeTaskSchema, body);
  const caller = await requireRole(admin, userId, 'tester');
  const cfg = await loadConfig(admin);
  const now = new Date();

  const [task, profile] = await Promise.all([
    getRow<DailyTaskRow>(admin, TABLES.dailyTasks, input.taskId),
    getRow<ProfileRow>(admin, TABLES.profiles, caller.userId),
  ]);
  const todayKey = taskDayKey(now, profile.timezone || 'UTC', cfg.TASK_DAY_RESET_HOUR);
  const problem = validateCompletion(task, {
    callerId: caller.userId,
    todayKey,
    screenshotFileId: input.screenshotFileId,
    answer: input.answer,
  });
  if (problem) throw new FnError(problem, MESSAGES[problem], problem === 'not_owner' ? 403 : 409);

  if (input.screenshotFileId) {
    await shareOwnedFile(admin, 'taskScreenshots', input.screenshotFileId, caller.userId, [task.developerId]);
  }

  // Points first: the ledger's idempotency key makes a double-submit a no-op for all counters below.
  const pts = pointsForTask(task.dayNumber, cfg);
  const award = await applyPoints(admin, {
    testerId: caller.userId,
    amount: pts.task,
    type: 'task',
    refId: task.$id,
    note: `Day ${task.dayNumber} · ${task.appName}`,
    idempotencyKey: `task:${task.$id}`,
  });
  if (!award.applied) throw new FnError('already_completed', MESSAGES.already_completed, 409);

  const completedTask = await updateRow<DailyTaskRow>(admin, TABLES.dailyTasks, task.$id, {
    status: 'completed',
    screenshotFileId: input.screenshotFileId,
    answer: input.answer,
    note: input.note,
    completedAt: now.toISOString(),
  });

  // Enrollment progress.
  const enrollment = (await getRow<EnrollmentRow>(admin, TABLES.enrollments, task.enrollmentId)) as Enrollment;
  const prevMark = enrollment.dayHistory?.[task.dayNumber - 2];
  const enrollmentUpdated = (await updateRow<EnrollmentRow>(admin, TABLES.enrollments, enrollment.$id, {
    status: enrollment.status === 'warned' ? 'active' : enrollment.status,
    tasksCompleted: enrollment.tasksCompleted + 1,
    streak: prevMark === 'c' ? enrollment.streak + 1 : 1,
    lastTaskCompletedAt: now.toISOString(),
    dayHistory: setDayHistory(enrollment.dayHistory, task.dayNumber, 'c', cfg.TEST_DAYS),
    testerReputation: profile.reputation,
  })) as Enrollment;

  // Tester stats: streak, month counter (leaderboard), reputation.
  const streak = advanceStreak(profile, todayKey);
  const monthKey = currentMonthKey(now);
  const next: ProfileRow = {
    ...profile,
    ...streak,
    tasksCompleted: profile.tasksCompleted + 1,
    monthKey,
    tasksThisMonth: profile.monthKey === monthKey ? profile.tasksThisMonth + 1 : 1,
  };
  await updateRow<ProfileRow>(admin, TABLES.profiles, caller.userId, {
    currentStreak: next.currentStreak,
    longestStreak: next.longestStreak,
    lastStreakDay: next.lastStreakDay,
    tasksCompleted: next.tasksCompleted,
    monthKey: next.monthKey,
    tasksThisMonth: next.tasksThisMonth,
    reputation: recomputeReputation(next),
  });

  let bonus = 0;
  if (task.dayNumber >= cfg.TEST_DAYS) {
    await completeEnrollment(admin, enrollmentUpdated, cfg, { withBonus: true });
    bonus = pts.bonus;
  }

  return {
    task: completedTask,
    pointsAwarded: pts.task,
    bonus,
    streak: next.currentStreak,
    enrollmentCompleted: task.dayNumber >= cfg.TEST_DAYS,
  };
});
