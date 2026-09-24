/**
 * dropoutMonitor (cron, hourly)
 * - No completed task for DROPOUT_WARN_HOURS → `warned` + push warning.
 * - No completed task for DROPOUT_DROP_HOURS → `dropped`, reputation penalty, slot reopens,
 *   replacement testers are invited, developer notified.
 * - Once a day at ~20:00 developer-local time: "X of Y testers done today" summary.
 */
import { dropoutAction } from '../../../src/lib/domain/rules';
import { localParts } from '../../../src/lib/domain/time';
import type { App, AppRow, DailyTaskRow, Enrollment, EnrollmentRow, ProfileRow } from '../../../src/lib/domain/types';
import { requireSchedule } from '../_shared/auth';
import { countRows, getRowOrNull, iterateRows, loadConfig, Query, TABLES, updateRow } from '../_shared/db';
import { dropEnrollment, inviteTesters } from '../_shared/lifecycle';
import { sendPush } from '../_shared/push';
import { handler } from '../_shared/runtime';

const SUMMARY_HOUR = 20;

export default handler(async ({ admin, trigger, ctx }) => {
  requireSchedule(trigger);
  const cfg = await loadConfig(admin);
  const now = new Date();
  let warned = 0;
  let dropped = 0;
  const reopened = new Set<string>();

  for await (const row of iterateRows<EnrollmentRow>(admin, TABLES.enrollments, [Query.equal('status', ['active', 'warned'])])) {
    const e = row as Enrollment;
    const action = dropoutAction(e, now, cfg);
    if (action === 'warn') {
      await updateRow<EnrollmentRow>(admin, TABLES.enrollments, e.$id, { status: 'warned' });
      await sendPush(admin, [e.testerId], {
        title: `Don’t lose your spot on ${e.appName}`,
        body: `No task done in ${cfg.DROPOUT_WARN_HOURS}h. Complete today’s task to stay in the test.`,
        data: { url: '/today', kind: 'dropout_warning', role: 'tester' },
        category: 'reminders',
      });
      warned++;
    } else if (action === 'drop') {
      await dropEnrollment(admin, e, cfg, {
        penalize: true,
        reason: `inactive for ${cfg.DROPOUT_DROP_HOURS}h`,
        notifyDeveloper: true,
      });
      reopened.add(e.appId);
      dropped++;
    }
  }

  // Recruit replacements for every app that just got a slot back.
  for (const appId of reopened) {
    const app = await getRowOrNull<AppRow>(admin, TABLES.apps, appId);
    if (app && (app.status === 'testing' || app.status === 'recruiting') && app.slotsOpen > 0) {
      await inviteTesters(admin, app as App, 25);
    }
  }

  // Daily developer summary.
  let summaries = 0;
  for await (const app of iterateRows<AppRow>(admin, TABLES.apps, [Query.equal('status', 'testing')])) {
    const owner = await getRowOrNull<ProfileRow>(admin, TABLES.profiles, app.ownerId);
    if (!owner || localParts(now, owner.timezone || 'UTC').hour !== SUMMARY_HOUR) continue;
    const since = new Date(now.getTime() - 24 * 3_600_000).toISOString();
    const [total, done] = await Promise.all([
      countRows(admin, TABLES.dailyTasks, [Query.equal('appId', app.$id), Query.greaterThan('$createdAt', since)]),
      countRows(admin, TABLES.dailyTasks, [
        Query.equal('appId', app.$id),
        Query.greaterThan('$createdAt', since),
        Query.equal('status', 'completed' satisfies DailyTaskRow['status']),
      ]),
    ]);
    if (total === 0) continue;
    await sendPush(admin, [app.ownerId], {
      title: `${app.name} today: ${done} of ${total} testers done`,
      body: `${app.testersActive} active testers · ${app.testersCompleted} finished.`,
      data: { url: `/app/${app.$id}`, kind: 'daily_summary', role: 'developer' },
      category: 'testerActivity',
    });
    summaries++;
  }

  ctx.log(`dropoutMonitor: warned=${warned} dropped=${dropped} summaries=${summaries}`);
  return { warned, dropped, summaries };
});
