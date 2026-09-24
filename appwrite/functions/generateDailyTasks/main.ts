/**
 * generateDailyTasks (cron, hourly) — for every tester whose local task day rolled over, create one
 * task per active enrollment from that app's plan, mark yesterday's unfinished tasks `missed`,
 * finish enrollments past the last day, and push "Your tasks for today are ready".
 * Idempotent: the unique (enrollmentId, dueDate) index means re-runs create nothing twice.
 */
import { dayNumberFor, taskDayKey } from '../../../src/lib/domain/time';
import type { Enrollment, EnrollmentRow, ProfileRow } from '../../../src/lib/domain/types';
import { requireSchedule } from '../_shared/auth';
import { getRow, getRowOrNull, iterateRows, loadConfig, Query, TABLES } from '../_shared/db';
import { completeEnrollment, ensureTodayTask, markMissedTasks } from '../_shared/lifecycle';
import { sendPush } from '../_shared/push';
import { handler } from '../_shared/runtime';

export default handler(async ({ admin, trigger, ctx }) => {
  requireSchedule(trigger);
  const cfg = await loadConfig(admin);
  const now = new Date();
  const profiles = new Map<string, ProfileRow | null>();
  const newTasksByTester = new Map<string, number>();
  let created = 0;
  let missed = 0;
  let finished = 0;

  for await (const row of iterateRows<EnrollmentRow>(admin, TABLES.enrollments, [Query.equal('status', ['active', 'warned'])])) {
    const e = row as Enrollment;
    if (!e.startDay) continue;
    if (!profiles.has(e.testerId)) profiles.set(e.testerId, await getRowOrNull<ProfileRow>(admin, TABLES.profiles, e.testerId));
    const tester = profiles.get(e.testerId);
    if (!tester) continue;

    const todayKey = taskDayKey(now, tester.timezone || 'UTC', cfg.TASK_DAY_RESET_HOUR);
    missed += await markMissedTasks(admin, e, todayKey, cfg);
    const fresh = (await getRow<EnrollmentRow>(admin, TABLES.enrollments, e.$id)) as Enrollment;

    if (dayNumberFor(e.startDay, todayKey) > cfg.TEST_DAYS) {
      // Stayed opted in for the full period without being dropped; bonus only for finishing day N.
      await completeEnrollment(admin, fresh, cfg, { withBonus: false });
      finished++;
      continue;
    }

    const task = await ensureTodayTask(admin, fresh, tester, cfg, now);
    if (task) {
      created++;
      newTasksByTester.set(e.testerId, (newTasksByTester.get(e.testerId) ?? 0) + 1);
    }
  }

  for (const [testerId, count] of newTasksByTester) {
    await sendPush(
      admin,
      [testerId],
      {
        title: 'Your tasks for today are ready',
        body: count === 1 ? 'One app is waiting for you. It takes about 3 minutes.' : `${count} apps are waiting for you today.`,
        data: { url: '/today', kind: 'tasks_ready', role: 'tester' },
        category: 'dailyTasks',
      },
      ctx.log,
    );
  }

  ctx.log(`generateDailyTasks: created=${created} missed=${missed} finished=${finished}`);
  return { created, missed, finished };
});
