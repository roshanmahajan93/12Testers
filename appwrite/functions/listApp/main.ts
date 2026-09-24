/**
 * listApp (developer) — validates the draft + plan, reserves tester slots by deducting credits
 * through the ledger, and opens the app for recruiting.
 */
import { slotCost, slotsForApp } from '../../../src/lib/domain/config';
import type { App, AppRow, ProfileRow } from '../../../src/lib/domain/types';
import { appLinksSchema, listAppSchema } from '../../../src/lib/validators';
import { requireRole } from '../_shared/auth';
import { countRows, getRow, loadConfig, Query, TABLES, updateRow } from '../_shared/db';
import { applyCredits } from '../_shared/ledger';
import { appPermissions, inviteTesters, syncPlanPermissions } from '../_shared/lifecycle';
import { FnError, handler, validate } from '../_shared/runtime';

const BOOST_DAYS = 7;

export default handler(async ({ admin, body, userId }) => {
  const { appId } = validate(listAppSchema, body);
  const caller = await requireRole(admin, userId, 'developer');
  const cfg = await loadConfig(admin);

  const app = await getRow<AppRow>(admin, TABLES.apps, appId);
  if (app.ownerId !== caller.userId) throw new FnError('forbidden', 'Not your app.', 403);
  if (app.status !== 'draft') throw new FnError('already_listed', 'This app is already listed.', 409);

  // Re-validate what testers will rely on.
  validate(appLinksSchema, { packageName: app.packageName, optInUrl: app.optInUrl, googleGroupUrl: app.googleGroupUrl });
  const planDays = await countRows(admin, TABLES.testPlans, [Query.equal('appId', appId), Query.lessThanEqual('dayNumber', cfg.TEST_DAYS)]);
  if (planDays < cfg.TEST_DAYS) throw new FnError('plan_incomplete', `Add a ${cfg.TEST_DAYS}-day test plan first.`);

  const slots = slotsForApp(cfg);
  const cost = slotCost(slots, cfg);
  await applyCredits(admin, {
    developerId: caller.userId,
    amount: -cost,
    type: 'slot_reserve',
    refId: appId,
    note: `${slots} tester slots for ${app.name}`,
    // $updatedAt makes relisting after a cancel a new charge, while retries of this call stay idempotent.
    idempotencyKey: `reserve:${appId}:${app.$updatedAt}`,
  });

  const profile = await getRow<ProfileRow>(admin, TABLES.profiles, caller.userId);
  const boostUntil = profile.isPro ? new Date(Date.now() + BOOST_DAYS * 86_400_000).toISOString() : null;

  const listed = (await updateRow<AppRow>(
    admin,
    TABLES.apps,
    appId,
    {
      status: 'recruiting',
      testersNeeded: slots,
      slotsOpen: slots,
      testersActive: 0,
      testersCompleted: 0,
      creditsReserved: cost,
      ownerName: profile.displayName,
      isBoosted: profile.isPro,
      boostUntil,
    },
    appPermissions(caller.userId, 'recruiting'),
  )) as App;
  await syncPlanPermissions(admin, listed);
  await inviteTesters(admin, listed, profile.isPro ? 80 : 40);

  return { app: listed, creditsSpent: cost };
});

