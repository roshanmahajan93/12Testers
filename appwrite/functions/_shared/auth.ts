import { ROLES, type Role } from '../../../src/lib/domain/types';

import { FnError, type Admin } from './runtime';

export interface Caller {
  userId: string;
  name: string;
  email: string;
  role: Role | null;
  labels: string[];
}

/** Resolve the caller from the server — labels are read fresh, never trusted from the client. */
export async function getCaller(admin: Admin, userId: string | null): Promise<Caller> {
  if (!userId) throw new FnError('unauthorized', 'Sign in to continue.', 401);
  const user = await admin.users.get({ userId });
  const labels = user.labels ?? [];
  const role = (ROLES as readonly string[]).find((r) => labels.includes(r)) as Role | undefined;
  return { userId, name: user.name, email: user.email, role: role ?? null, labels };
}

export async function requireRole(admin: Admin, userId: string | null, role: Role): Promise<Caller> {
  const caller = await getCaller(admin, userId);
  if (caller.role !== role) {
    throw new FnError('forbidden', role === 'developer' ? 'Only developer accounts can do that.' : 'Only tester accounts can do that.', 403);
  }
  return caller;
}

export async function requireAnyRole(admin: Admin, userId: string | null): Promise<Caller & { role: Role }> {
  const caller = await getCaller(admin, userId);
  if (!caller.role) throw new FnError('no_role', 'Finish setting up your account first.', 403);
  return caller as Caller & { role: Role };
}

/** Only allow schedule-triggered executions (cron functions). */
export function requireSchedule(trigger: string): void {
  if (trigger !== 'schedule') throw new FnError('forbidden', 'Scheduled function.', 403);
}
