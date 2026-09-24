/**
 * updateProfile — the only way to change a profile. Whitelists user-editable fields per role;
 * credits, points, reputation, role and stats are never accepted from the client.
 */
import { isValidTimeZone } from '../../../src/lib/domain/time';
import type { EnrollmentRow, ProfileRow } from '../../../src/lib/domain/types';
import { updateProfileSchema } from '../../../src/lib/validators';
import { requireAnyRole } from '../_shared/auth';
import { getRow, iterateRows, loadConfig, Query, TABLES, updateRow } from '../_shared/db';
import { testerDeviceLabel } from '../_shared/lifecycle';
import { FnError, handler, validate } from '../_shared/runtime';

export default handler(async ({ admin, body, userId }) => {
  const input = validate(updateProfileSchema, body);
  const caller = await requireAnyRole(admin, userId);
  const cfg = await loadConfig(admin);

  const patch: Partial<ProfileRow> = {};
  if (input.displayName !== undefined) patch.displayName = input.displayName;
  if (input.avatarFileId !== undefined) patch.avatarFileId = input.avatarFileId;
  if (input.country !== undefined) patch.country = input.country;
  if (input.languages !== undefined) patch.languages = input.languages;
  if (input.notificationPrefs !== undefined) patch.notificationPrefs = JSON.stringify(input.notificationPrefs);
  if (input.timezone !== undefined) {
    if (!isValidTimeZone(input.timezone)) throw new FnError('invalid_input', 'Unknown timezone.');
    patch.timezone = input.timezone;
  }

  if (caller.role === 'developer') {
    if (input.companyName !== undefined) patch.companyName = input.companyName;
  } else {
    if (input.deviceModel !== undefined) patch.deviceModel = input.deviceModel;
    if (input.androidVersion !== undefined) patch.androidVersion = input.androidVersion;
    if (input.maxActiveTests !== undefined) {
      patch.maxActiveTests = Math.min(input.maxActiveTests, cfg.MAX_ACTIVE_TESTS_PER_TESTER);
    }
  }

  const updated = await updateRow<ProfileRow>(admin, TABLES.profiles, caller.userId, patch);
  if (patch.displayName) await admin.users.updateName({ userId: caller.userId, name: patch.displayName });

  // Keep the public tester info developers see on enrollments in sync.
  if (caller.role === 'tester' && (patch.displayName || patch.avatarFileId !== undefined || patch.deviceModel || patch.androidVersion)) {
    const denorm: Partial<EnrollmentRow> = {
      testerName: updated.displayName,
      testerAvatarFileId: updated.avatarFileId,
      testerDevice: testerDeviceLabel(updated),
    };
    for await (const e of iterateRows<EnrollmentRow>(admin, TABLES.enrollments, [
      Query.equal('testerId', caller.userId),
      Query.equal('status', ['joined', 'active', 'warned']),
    ])) {
      await updateRow<EnrollmentRow>(admin, TABLES.enrollments, e.$id, denorm);
    }
  }

  return getRow<ProfileRow>(admin, TABLES.profiles, caller.userId);
});
