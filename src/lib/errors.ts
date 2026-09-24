/** Typed app error used across RTK Query endpoints and services. */
export interface AppError {
  code: string;
  message: string;
  status?: number;
}

const FRIENDLY: Record<string, string> = {
  network: 'You seem to be offline. Check your connection and try again.',
  unauthorized: 'Your session expired. Please sign in again.',
  forbidden: 'You don’t have access to that.',
  not_found: 'We couldn’t find that. It may have been removed.',
  rate_limited: 'Slow down a little — try again in a minute.',
  insufficient_credits: 'Not enough credits. Top up to continue.',
  role_exists: 'This account already has a role.',
  user_invalid_token: 'That code is invalid or expired. Request a new one.',
  unknown: 'Something went wrong. Please try again.',
};

export function isAppError(e: unknown): e is AppError {
  return typeof e === 'object' && e !== null && 'code' in e && 'message' in e;
}

/** Normalize anything thrown (AppwriteException, fetch errors, function errors) into AppError. */
export function toAppError(e: unknown): AppError {
  if (isAppError(e)) return e;
  if (e && typeof e === 'object') {
    const obj = e as { code?: unknown; type?: unknown; message?: unknown };
    const status = typeof obj.code === 'number' ? obj.code : undefined;
    const type = typeof obj.type === 'string' ? obj.type : undefined;
    const message = typeof obj.message === 'string' ? obj.message : undefined;
    if (message && /network request failed|failed to fetch/i.test(message)) {
      return { code: 'network', message: FRIENDLY.network! };
    }
    if (status === 401) return { code: type ?? 'unauthorized', message: FRIENDLY[type ?? ''] ?? FRIENDLY.unauthorized!, status };
    if (status === 403) return { code: 'forbidden', message: message ?? FRIENDLY.forbidden!, status };
    if (status === 404) return { code: 'not_found', message: FRIENDLY.not_found!, status };
    if (status === 429) return { code: 'rate_limited', message: FRIENDLY.rate_limited!, status };
    return { code: type ?? 'unknown', message: message ?? FRIENDLY.unknown!, status };
  }
  return { code: 'unknown', message: FRIENDLY.unknown! };
}

export function friendlyMessage(e: unknown): string {
  const err = toAppError(e);
  return FRIENDLY[err.code] ?? err.message;
}
