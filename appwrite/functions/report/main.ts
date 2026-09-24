/** report (any role) — rate-limited abuse reports. Rows are readable only from the console. */
import type { ReportRow } from '../../../src/lib/domain/types';
import { reportSchema } from '../../../src/lib/validators';
import { requireAnyRole } from '../_shared/auth';
import { countRows, createRow, loadConfig, Query, TABLES } from '../_shared/db';
import { FnError, handler, validate } from '../_shared/runtime';

export default handler(async ({ admin, body, userId }) => {
  const input = validate(reportSchema, body);
  const caller = await requireAnyRole(admin, userId);
  const cfg = await loadConfig(admin);
  const recent = await countRows(admin, TABLES.reports, [
    Query.equal('reporterId', caller.userId),
    Query.greaterThan('$createdAt', new Date(Date.now() - 86_400_000).toISOString()),
  ]);
  if (recent >= cfg.REPORT_RATE_LIMIT_PER_DAY) throw new FnError('rate_limited', 'You’ve sent many reports today. Try again tomorrow.', 429);
  await createRow<ReportRow>(admin, TABLES.reports, { reporterId: caller.userId, ...input }, []);
  return { received: true };
});
