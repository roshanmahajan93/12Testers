/**
 * deleteAccount (any role) — Google Play requires in-app account deletion.
 * Releases active enrollments (no penalty), withdraws a developer's apps (notifying their
 * testers), deletes the user's rows and files, then deletes the Appwrite user.
 */
import type { TableId } from '../../../src/lib/domain/resources';
import type { AppRow, DailyTaskRow, Enrollment, EnrollmentRow, FeedbackRow, ProfileRow } from '../../../src/lib/domain/types';
import { requireAnyRole } from '../_shared/auth';
import { deleteRow, getRowOrNull, iterateRows, loadConfig, Query, TABLES } from '../_shared/db';
import { deleteFileQuietly } from '../_shared/files';
import { dropEnrollment } from '../_shared/lifecycle';
import { sendPush } from '../_shared/push';
import { handler, type Admin } from '../_shared/runtime';

async function deleteWhere(admin: Admin, table: TableId, column: string, value: string, onRow?: (row: Record<string, unknown>) => Promise<void>) {
  // Collect ids first: deleting while paginating with a cursor would skip rows.
  const ids: string[] = [];
  for await (const row of iterateRows<Record<string, unknown>>(admin, table, [Query.equal(column, value)])) {
    if (onRow) await onRow(row);
    ids.push(row.$id);
  }
  for (const id of ids) await deleteRow(admin, table, id);
  return ids.length;
}

export default handler(async ({ admin, userId }) => {
  const caller = await requireAnyRole(admin, userId);
  const cfg = await loadConfig(admin);
  const uid = caller.userId;

  if (caller.role === 'tester') {
    for await (const e of iterateRows<EnrollmentRow>(admin, TABLES.enrollments, [
      Query.equal('testerId', uid),
      Query.equal('status', ['joined', 'active', 'warned']),
    ])) {
      await dropEnrollment(admin, e as Enrollment, cfg, { penalize: false, reason: 'account deleted', notifyDeveloper: true });
    }
    await deleteWhere(admin, TABLES.dailyTasks, 'testerId', uid, async (row) => {
      await deleteFileQuietly(admin, 'taskScreenshots', (row as unknown as DailyTaskRow).screenshotFileId);
    });
    await deleteWhere(admin, TABLES.feedback, 'testerId', uid, async (row) => {
      for (const f of (row as unknown as FeedbackRow).attachmentFileIds ?? []) await deleteFileQuietly(admin, 'feedbackAttachments', f);
    });
    await deleteWhere(admin, TABLES.enrollments, 'testerId', uid);
    await deleteWhere(admin, TABLES.pointTransactions, 'testerId', uid);
  } else {
    for await (const app of iterateRows<AppRow>(admin, TABLES.apps, [Query.equal('ownerId', uid)])) {
      const released: string[] = [];
      for await (const e of iterateRows<EnrollmentRow>(admin, TABLES.enrollments, [Query.equal('appId', app.$id)])) {
        if (e.status === 'joined' || e.status === 'active' || e.status === 'warned') released.push(e.testerId);
      }
      if (released.length) {
        await sendPush(admin, released, {
          title: `${app.name} is no longer being tested`,
          body: 'The developer closed their account. Your slot is free for another test.',
          data: { url: '/available', kind: 'test_cancelled', role: 'tester' },
          category: 'testerActivity',
        });
      }
      await deleteWhere(admin, TABLES.dailyTasks, 'appId', app.$id);
      await deleteWhere(admin, TABLES.enrollments, 'appId', app.$id);
      await deleteWhere(admin, TABLES.feedback, 'appId', app.$id);
      await deleteWhere(admin, TABLES.testPlans, 'appId', app.$id);
      await deleteFileQuietly(admin, 'appIcons', app.iconFileId);
      await deleteRow(admin, TABLES.apps, app.$id);
    }
    await deleteWhere(admin, TABLES.creditTransactions, 'developerId', uid);
  }

  await deleteWhere(admin, TABLES.notifications, 'userId', uid);
  const profile = await getRowOrNull<ProfileRow>(admin, TABLES.profiles, uid);
  await deleteFileQuietly(admin, 'avatars', profile?.avatarFileId);
  await deleteRow(admin, TABLES.profiles, uid);
  await admin.users.delete({ userId: uid });
  return { deleted: true };
});
