import { z } from 'zod';

import { FnError, handler, validate, type FnContext } from '../_shared/runtime';

process.env.APPWRITE_FUNCTION_API_ENDPOINT = 'http://127.0.0.1:9/v1';
process.env.APPWRITE_FUNCTION_PROJECT_ID = 'test';

function ctx(bodyText: string, headers: Record<string, string> = {}) {
  const out: { status: number; body: unknown }[] = [];
  const c: FnContext = {
    req: { bodyText, headers, method: 'POST', path: '/', query: {} },
    res: {
      json: (body, status = 200) => out.push({ status, body }),
      text: () => undefined,
      empty: () => undefined,
    },
    log: () => undefined,
    error: () => undefined,
  };
  return { c, out };
}

const schema = z.object({ appId: z.string().min(1) });

describe('function handler envelope', () => {
  const fn = handler(async ({ body, userId }) => {
    const input = validate(schema, body);
    if (!userId) throw new FnError('unauthorized', 'Sign in', 401);
    return { echoed: input.appId, userId };
  });

  it('returns { ok, data } on success with the caller id from the header', async () => {
    const { c, out } = ctx('{"appId":"a1"}', { 'x-appwrite-user-id': 'u1' });
    await fn(c);
    expect(out[0]).toEqual({ status: 200, body: { ok: true, data: { echoed: 'a1', userId: 'u1' } } });
  });

  it('maps validation errors to invalid_input (400)', async () => {
    const { c, out } = ctx('{"appId":""}', { 'x-appwrite-user-id': 'u1' });
    await fn(c);
    expect(out[0]?.status).toBe(400);
    expect(out[0]?.body).toMatchObject({ ok: false, error: { code: 'invalid_input' } });
  });

  it('rejects malformed JSON and missing callers', async () => {
    const bad = ctx('{not json');
    await fn(bad.c);
    expect(bad.out[0]?.body).toMatchObject({ ok: false, error: { code: 'invalid_json' } });

    const anon = ctx('{"appId":"a1"}');
    await fn(anon.c);
    expect(anon.out[0]).toMatchObject({ status: 401, body: { ok: false, error: { code: 'unauthorized' } } });
  });

  it('hides unexpected errors behind a generic 500', async () => {
    const boom = handler(async () => {
      throw new Error('db exploded: secret details');
    });
    const { c, out } = ctx('{}');
    await boom(c);
    expect(out[0]).toEqual({ status: 500, body: { ok: false, error: { code: 'server_error', message: 'Something went wrong on our side.' } } });
  });
});
