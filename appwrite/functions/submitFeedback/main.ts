/**
 * submitFeedback (tester) — structured feedback for an app the tester is enrolled in.
 * Attachments must be the caller's own uploads; they are shared read-only with the developer.
 */
import type { DailyTaskRow, EnrollmentRow, FeedbackRow, ProfileRow } from '../../../src/lib/domain/types';
import { feedbackSchema } from '../../../src/lib/validators';
import { requireRole } from '../_shared/auth';
import { createRow, getRow, listRows, Query, readableBy, TABLES } from '../_shared/db';
import { shareOwnedFile } from '../_shared/files';
import { sendPush } from '../_shared/push';
import { FnError, handler, validate } from '../_shared/runtime';

export default handler(async ({ admin, body, userId }) => {
  const input = validate(feedbackSchema, body);
  const caller = await requireRole(admin, userId, 'tester');

  const [enrollment] = await listRows<EnrollmentRow>(admin, TABLES.enrollments, [
    Query.equal('appId', input.appId),
    Query.equal('testerId', caller.userId),
    Query.limit(1),
  ]);
  if (!enrollment) throw new FnError('forbidden', 'You can only send feedback for apps you are testing.', 403);

  if (input.taskId) {
    const task = await getRow<DailyTaskRow>(admin, TABLES.dailyTasks, input.taskId);
    if (task.testerId !== caller.userId || task.appId !== input.appId) throw new FnError('forbidden', 'Invalid task.', 403);
  }
  for (const fileId of input.attachmentFileIds) {
    await shareOwnedFile(admin, 'feedbackAttachments', fileId, caller.userId, [enrollment.developerId]);
  }

  const profile = await getRow<ProfileRow>(admin, TABLES.profiles, caller.userId);
  const feedback = await createRow<FeedbackRow>(
    admin,
    TABLES.feedback,
    {
      appId: input.appId,
      developerId: enrollment.developerId,
      testerId: caller.userId,
      testerName: profile.displayName,
      taskId: input.taskId,
      type: input.type,
      severity: input.severity,
      title: input.title,
      body: input.body,
      attachmentFileIds: input.attachmentFileIds,
      deviceInfo: input.deviceInfo,
      ownerRating: 0,
    },
    readableBy(caller.userId, enrollment.developerId),
  );

  const emoji = { bug: '🐞', crash: '💥', ux: '🧭', suggestion: '💡', praise: '🎉' }[input.type];
  await sendPush(admin, [enrollment.developerId], {
    title: `${emoji} New ${input.type} on ${enrollment.appName}`,
    body: input.title,
    data: { url: `/app/${input.appId}/feedback`, kind: 'feedback', role: 'developer' },
    category: 'feedback',
  });
  return feedback;
});
