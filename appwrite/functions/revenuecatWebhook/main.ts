/**
 * revenuecatWebhook — RevenueCat → Appwrite. Configure in RevenueCat with the function's public
 * URL and an Authorization header equal to REVENUECAT_WEBHOOK_AUTH.
 *
 * - Consumable credit packs (NON_RENEWING_PURCHASE) → credit ledger, idempotent by event id.
 * - `pro` entitlement lifecycle → profiles.isPro.
 * Developer accounts only; anything else is acknowledged (200) and ignored so RC stops retrying.
 */
import { timingSafeEqual } from 'node:crypto';

import type { ProfileRow } from '../../../src/lib/domain/types';
import { getCaller } from '../_shared/auth';
import { getRowOrNull, TABLES, updateRow } from '../_shared/db';
import { applyCredits } from '../_shared/ledger';
import { sendPush } from '../_shared/push';
import { FnError, handler } from '../_shared/runtime';

/** Product id → credits. Override with env CREDIT_PACKS='{"credits_50":50,...}'. */
function creditPacks(): Record<string, number> {
  const fallback = { credits_50: 50, credits_150: 150, credits_500: 500 };
  try {
    return process.env.CREDIT_PACKS ? (JSON.parse(process.env.CREDIT_PACKS) as Record<string, number>) : fallback;
  } catch {
    return fallback;
  }
}

const PRO_ENTITLEMENT = process.env.PRO_ENTITLEMENT_ID ?? 'pro';
const GRANT_PRO = new Set(['INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'PRODUCT_CHANGE', 'SUBSCRIPTION_EXTENDED', 'TEMPORARY_ENTITLEMENT_GRANT']);
const REVOKE_PRO = new Set(['EXPIRATION']);

interface RcEvent {
  id: string;
  type: string;
  app_user_id: string;
  original_app_user_id?: string;
  product_id?: string;
  entitlement_ids?: string[] | null;
  environment?: string;
}

function authorized(header: string | undefined): boolean {
  const expected = process.env.REVENUECAT_WEBHOOK_AUTH;
  if (!expected || !header) return false;
  const a = Buffer.from(header.replace(/^Bearer\s+/i, ''));
  const b = Buffer.from(expected.replace(/^Bearer\s+/i, ''));
  return a.length === b.length && timingSafeEqual(a, b);
}

export default handler(async ({ admin, body, ctx }) => {
  if (!authorized(ctx.req.headers.authorization)) throw new FnError('unauthorized', 'Bad webhook auth.', 401);
  const event = (body as { event?: RcEvent }).event;
  if (!event?.id || !event.type) throw new FnError('invalid_input', 'Missing event.');
  if (event.type === 'TEST') return { ignored: 'test event' };

  const userId = event.app_user_id;
  if (!userId || userId.startsWith('$RCAnonymousID')) return { ignored: 'anonymous user' };

  let role: string | null = null;
  try {
    role = (await getCaller(admin, userId)).role;
  } catch {
    return { ignored: 'unknown user' };
  }
  if (role !== 'developer') {
    ctx.log(`RC event ${event.id} for non-developer ${userId} ignored`);
    return { ignored: 'not a developer' };
  }
  const profile = await getRowOrNull<ProfileRow>(admin, TABLES.profiles, userId);
  if (!profile) return { ignored: 'no profile' };

  const packs = creditPacks();
  const credits = event.product_id ? packs[event.product_id] : undefined;
  if (event.type === 'NON_RENEWING_PURCHASE' && credits) {
    const res = await applyCredits(admin, {
      developerId: userId,
      amount: credits,
      type: 'purchase',
      refId: event.product_id ?? null,
      note: `Purchased ${credits} credits${event.environment === 'SANDBOX' ? ' (sandbox)' : ''}`,
      idempotencyKey: `rc:${event.id}`,
    });
    if (res.applied) {
      await sendPush(admin, [userId], {
        title: `+${credits} credits added`,
        body: 'Thanks! Your credits are ready to reserve tester slots.',
        data: { url: '/credits', kind: 'credits_received', role: 'developer' },
      });
    }
    return { credited: res.applied ? credits : 0 };
  }

  const touchesPro = (event.entitlement_ids ?? []).includes(PRO_ENTITLEMENT);
  if (touchesPro && GRANT_PRO.has(event.type) && !profile.isPro) {
    await updateRow<ProfileRow>(admin, TABLES.profiles, userId, { isPro: true });
    return { pro: true };
  }
  if (touchesPro && REVOKE_PRO.has(event.type) && profile.isPro) {
    await updateRow<ProfileRow>(admin, TABLES.profiles, userId, { isPro: false });
    return { pro: false };
  }
  return { ignored: event.type };
});
