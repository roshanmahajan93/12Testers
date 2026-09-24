/**
 * saveApp (developer) — create or update an app draft and its 14-day test plan.
 * Status, slots, credits and tester counts are never taken from input.
 */
import { normalizePlan } from '../../../src/lib/domain/testPlan';
import type { AppRow, TestPlanRow } from '../../../src/lib/domain/types';
import { saveAppSchema } from '../../../src/lib/validators';
import { requireRole } from '../_shared/auth';
import { createRow, deleteRow, getRow, getRowOrNull, ID, listRows, loadConfig, Query, TABLES, updateRow } from '../_shared/db';
import { appPermissions, planRowId } from '../_shared/lifecycle';
import { FnError, handler, validate } from '../_shared/runtime';

export default handler(async ({ admin, body, userId }) => {
  const input = validate(saveAppSchema, body);
  const caller = await requireRole(admin, userId, 'developer');
  const cfg = await loadConfig(admin);

  // One live listing per package across all developers.
  const clash = await listRows<AppRow>(admin, TABLES.apps, [
    Query.equal('packageName', input.packageName),
    Query.equal('status', ['recruiting', 'testing', 'paused']),
    Query.limit(5),
  ]);
  if (clash.some((a) => a.$id !== input.appId)) {
    throw new FnError('package_taken', 'This package is already being tested on 12Testers.', 409);
  }

  const fields = {
    name: input.name,
    shortDescription: input.shortDescription,
    category: input.category,
    packageName: input.packageName,
    optInUrl: input.optInUrl,
    googleGroupUrl: input.googleGroupUrl,
    generalInstructions: input.generalInstructions,
    minReputation: input.minReputation,
    minAndroidVersion: input.minAndroidVersion,
    iconFileId: input.iconFileId,
    ownerName: caller.name,
  };

  let appId = input.appId;
  let status: AppRow['status'] = 'draft';
  if (appId) {
    const existing = await getRow<AppRow>(admin, TABLES.apps, appId);
    if (existing.ownerId !== caller.userId) throw new FnError('forbidden', 'Not your app.', 403);
    if (existing.status !== 'draft' && existing.packageName !== input.packageName) {
      throw new FnError('locked', 'The package name can’t change after the app is listed.', 409);
    }
    status = existing.status;
    await updateRow<AppRow>(admin, TABLES.apps, appId, fields);
  } else {
    appId = ID.unique();
    await createRow<AppRow>(
      admin,
      TABLES.apps,
      {
        ...fields,
        ownerId: caller.userId,
        testersNeeded: cfg.TESTERS_REQUIRED + cfg.EXTRA_TESTER_BUFFER,
        testersActive: 0,
        testersCompleted: 0,
        slotsOpen: 0,
        status: 'draft',
        testStartDate: null,
        isBoosted: false,
        boostUntil: null,
        creditsReserved: 0,
      },
      appPermissions(caller.userId, 'draft'),
      appId,
    );
  }

  // Upsert plan rows with deterministic ids; blanks fall back to the generic instruction.
  const plan = normalizePlan(cfg.TEST_DAYS, input.plan);
  const perms = appPermissions(caller.userId, status);
  for (const day of plan) {
    const rowId = planRowId(appId, day.dayNumber);
    const data: TestPlanRow = { appId, ...day };
    const current = await getRowOrNull<TestPlanRow>(admin, TABLES.testPlans, rowId);
    if (current) await updateRow<TestPlanRow>(admin, TABLES.testPlans, rowId, data, perms);
    else await createRow<TestPlanRow>(admin, TABLES.testPlans, data, perms, rowId);
  }
  // Remove days beyond the configured length (config may have shrunk).
  const extra = await listRows<TestPlanRow>(admin, TABLES.testPlans, [
    Query.equal('appId', appId),
    Query.greaterThan('dayNumber', cfg.TEST_DAYS),
    Query.limit(100),
  ]);
  await Promise.all(extra.map((r) => deleteRow(admin, TABLES.testPlans, r.$id)));

  return getRow<AppRow>(admin, TABLES.apps, appId);
});
