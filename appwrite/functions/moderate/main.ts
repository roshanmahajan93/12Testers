/**
 * moderate (developer) — `flagTask` for low-effort / fake proofs and `rateFeedback` (1–5) for
 * feedback quality. Both feed the tester's reputation; flags also remove points.
 */
import { setDayHistory } from '../../../src/lib/domain/rules';
import type { DailyTaskRow, EnrollmentRow, FeedbackRow, ProfileRow } from '../../../src/lib/domain/types';
import { moderateSchema } from '../../../src/lib/validators';
import { requireRole } from '../_shared/auth';
import { getRow, loadConfig, TABLES, updateRow } from '../_shared/db';
import { applyPoints } from '../_shared/ledger';
import { recomputeReputation } from '../_shared/lifecycle';
import { sendPush } from '../_shared/push';
import { FnError, handler, validate } from '../_shared/runtime';

export default handler(async ({ admin, body, userId }) => {
  const input = validate(moderateSchema, body);
  const caller = await requireRole(admin, userId, 'developer');
  const cfg = await loadConfig(admin);

  if (input.action === 'flagTask') {
    const task = await getRow<DailyTaskRow>(admin, TABLES.dailyTasks, input.taskId);
    if (task.developerId !== caller.userId) throw new FnError('forbidden', 'Not your app’s task.', 403);
    if (task.status !== 'completed') throw new FnError('invalid_state', 'Only completed tasks can be flagged.');

    const updated = await updateRow<DailyTaskRow>(admin, TABLES.dailyTasks, task.$id, { status: 'flagged', flagReason: input.reason });
    const enrollment = await getRow<EnrollmentRow>(admin, TABLES.enrollments, task.enrollmentId);
    await updateRow<EnrollmentRow>(admin, TABLES.enrollments, enrollment.$id, {
      dayHistory: setDayHistory(enrollment.dayHistory, task.dayNumber, 'f', cfg.TEST_DAYS),
    });

    const penalty = await applyPoints(admin, {
      testerId: task.testerId,
      amount: -cfg.FLAG_POINTS_PENALTY,
      type: 'penalty',
      refId: task.$id,
      note: `Flagged: ${input.reason}`,
      idempotencyKey: `flag:${task.$id}`,
    });
    if (penalty.applied) {
      const p = await getRow<ProfileRow>(admin, TABLES.profiles, task.testerId);
      const next = { ...p, flagsReceived: p.flagsReceived + 1 };
      await updateRow<ProfileRow>(admin, TABLES.profiles, task.testerId, {
        flagsReceived: next.flagsReceived,
        reputation: recomputeReputation(next),
      });
      await sendPush(admin, [task.testerId], {
        title: `Your day ${task.dayNumber} proof for ${task.appName} was flagged`,
        body: input.reason,
        data: { url: `/task/${task.$id}`, kind: 'task_flagged', role: 'tester' },
        category: 'testerActivity',
      });
    }
    return updated;
  }

  // rateFeedback
  const feedback = await getRow<FeedbackRow>(admin, TABLES.feedback, input.feedbackId);
  if (feedback.developerId !== caller.userId) throw new FnError('forbidden', 'Not your app’s feedback.', 403);
  const previous = feedback.ownerRating ?? 0;
  const updated = await updateRow<FeedbackRow>(admin, TABLES.feedback, feedback.$id, { ownerRating: input.rating });
  const p = await getRow<ProfileRow>(admin, TABLES.profiles, feedback.testerId);
  const next = {
    ...p,
    ratingSum: p.ratingSum + input.rating - previous,
    ratingCount: p.ratingCount + (previous > 0 ? 0 : 1),
  };
  await updateRow<ProfileRow>(admin, TABLES.profiles, feedback.testerId, {
    ratingSum: next.ratingSum,
    ratingCount: next.ratingCount,
    reputation: recomputeReputation(next),
  });
  return updated;
});
