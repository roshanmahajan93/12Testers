/**
 * Minimal typing of the Appwrite (open-runtimes) Node context + a handler wrapper that gives
 * every function the same shape:
 *   parse JSON → build admin SDK → resolve caller → run → `{ ok, data }` / `{ ok:false, error }`.
 */
import { Client, Messaging, Storage, TablesDB, Users } from 'node-appwrite';
import type { ZodType } from 'zod';

export interface FnRequest {
  bodyText?: string;
  body?: unknown;
  headers: Record<string, string | undefined>;
  method: string;
  path: string;
  query: Record<string, string>;
}

export interface FnResponse {
  json(body: unknown, status?: number, headers?: Record<string, string>): unknown;
  text(body: string, status?: number, headers?: Record<string, string>): unknown;
  empty(): unknown;
}

export interface FnContext {
  req: FnRequest;
  res: FnResponse;
  log: (msg: unknown) => void;
  error: (msg: unknown) => void;
}

/** Error with a stable machine code the app maps to friendly copy. */
export class FnError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export const DATABASE_ID = process.env.APPWRITE_DATABASE_ID ?? 'main';

export interface Admin {
  client: Client;
  db: TablesDB;
  users: Users;
  storage: Storage;
  messaging: Messaging;
}

/** Server SDK with the function's dynamic API key (scopes set in appwrite.json). */
export function createAdmin(req: FnRequest): Admin {
  const endpoint = process.env.APPWRITE_FUNCTION_API_ENDPOINT ?? process.env.APPWRITE_ENDPOINT ?? '';
  const project = process.env.APPWRITE_FUNCTION_PROJECT_ID ?? '';
  const key = req.headers['x-appwrite-key'] ?? process.env.APPWRITE_API_KEY ?? '';
  const client = new Client().setEndpoint(endpoint).setProject(project).setKey(key);
  return {
    client,
    db: new TablesDB(client),
    users: new Users(client),
    storage: new Storage(client),
    messaging: new Messaging(client),
  };
}

export function parseBody(req: FnRequest): unknown {
  const raw = typeof req.bodyText === 'string' ? req.bodyText : typeof req.body === 'string' ? req.body : null;
  if (raw === null) return req.body ?? {};
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new FnError('invalid_json', 'Request body must be JSON.');
  }
}

export function validate<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    const first = result.error.issues[0];
    throw new FnError('invalid_input', first ? `${first.path.join('.') || 'input'}: ${first.message}` : 'Invalid input.');
  }
  return result.data;
}

export interface HandlerArgs {
  ctx: FnContext;
  admin: Admin;
  body: unknown;
  /** Caller user id (null for schedule/webhook triggers). */
  userId: string | null;
  trigger: string;
}

/** Wrap a function body with parsing, admin SDK creation and the response envelope. */
export function handler(run: (args: HandlerArgs) => Promise<unknown>) {
  return async (ctx: FnContext) => {
    try {
      const admin = createAdmin(ctx.req);
      const userId = ctx.req.headers['x-appwrite-user-id'] || null;
      const trigger = ctx.req.headers['x-appwrite-trigger'] ?? 'http';
      const body = parseBody(ctx.req);
      const data = await run({ ctx, admin, body, userId, trigger });
      return ctx.res.json({ ok: true, data: data ?? null });
    } catch (e) {
      if (e instanceof FnError) {
        return ctx.res.json({ ok: false, error: { code: e.code, message: e.message } }, e.status);
      }
      ctx.error(e instanceof Error ? `${e.message}\n${e.stack ?? ''}` : String(e));
      return ctx.res.json({ ok: false, error: { code: 'server_error', message: 'Something went wrong on our side.' } }, 500);
    }
  };
}
