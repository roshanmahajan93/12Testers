/**
 * manageApp (developer) — pause / resume / cancel a listing.
 * Cancel is only allowed before the test starts; it releases joined testers and refunds unused slots.
 */
import type { App, AppRow, Enrollment, EnrollmentRow } from '../../../src/lib/domain/types';
import { manageAppSchema } from '../../../src/lib/validators';
import { requireRole } from '../_shared/auth';
import { getRow, iterateRows, loadConfig, Query, TABLES, updateRow } from '../_shared/db';
import { applyCredits } from '../_shared/ledger';
import { appPermissions, dropEnrollment, syncPlanPermissions } from '../_shared/lifecycle';
import { sendPush } from '../_shared/push';
import { FnError, handler, validate } from '../_shared/runtime';

export default handler(async ({ admin, body, userId }) => {
  const { appId, action } = validate(manageAppSchema, body);
  const caller = await requireRole(admin, userId, 'developer');
  const cfg = await loadConfig(admin);
  const app = await getRow<AppRow>(admin, TABLES.apps, appId);
  if (app.ownerId !== caller.userId) throw new FnError('forbidden', 'Not your app.', 403);

  if (action === 'pause') {
    if (app.status !== 'recruiting' && app.status !== 'testing') throw new FnError('invalid_state', 'Only live apps can be paused.');
    const updated = (await updateRow<AppRow>(admin, TABLES.apps, appId, { status: 'paused' }, appPermissions(app.ownerId, 'paused'))) as App;
    await syncPlanPermissions(admin, updated);
    return updated;
  }

  if (action === 'resume') {
    if (app.status !== 'paused') throw new FnError('invalid_state', 'This app is not paused.');
    const next = app.testStartDate ? 'testing' : 'recruiting';
    const updated = (await updateRow<AppRow>(admin, TABLES.apps, appId, { status: next }, appPermissions(app.ownerId, next))) as App;
    await syncPlanPermissions(admin, updated);
    return updated;
  }

  // cancel
  if (app.testStartDate || (app.status !== 'recruiting' && app.status !== 'paused')) {
    throw new FnError('invalid_state', 'A test that has started can be paused, not cancelled.');
  }
  const released: string[] = [];
  for await (const e of iterateRows<EnrollmentRow>(admin, TABLES.enrollments, [
    Query.equal('appId', appId),
    Query.equal('status', ['joined', 'active', 'warned']),
  ])) {
    await dropEnrollment(admin, e as Enrollment, cfg, { penalize: false, reason: 'listing cancelled', notifyDeveloper: false });
    released.push(e.testerId);
  }
  // Every reserved slot is unused because the test never started.
  const refund = app.creditsReserved;
  if (refund > 0) {
    await applyCredits(admin, {
      developerId: caller.userId,
      amount: refund,
      type: 'slot_refund',
      refId: appId,
      note: `Cancelled listing of ${app.name}`,
      idempotencyKey: `cancel:${appId}:${app.$updatedAt}`,
    });
  }
  const updated = (await updateRow<AppRow>(
    admin,
    TABLES.apps,
    appId,
    { status: 'draft', slotsOpen: 0, testersActive: 0, creditsReserved: 0, isBoosted: false, boostUntil: null },
    appPermissions(app.ownerId, 'draft'),
  )) as App;
  await syncPlanPermissions(admin, updated);
  if (released.length) {
    await sendPush(admin, released, {
      title: `${app.name} was withdrawn`,
      body: 'The developer cancelled this test before it started. Your slot is free for another test.',
      data: { url: '/available', kind: 'test_cancelled', role: 'tester' },
      category: 'testerActivity',
    });
  }
  return { app: updated, refunded: refund };
});
