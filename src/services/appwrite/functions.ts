import { ExecutionMethod } from 'react-native-appwrite';

import type { AppError } from '@/lib/errors';

import { functions } from './client';
import type { FunctionId } from './ids';

interface FunctionEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: AppError;
}

/**
 * Execute an Appwrite Function synchronously and unwrap our `{ ok, data, error }` envelope.
 * All functions validate input + caller role server-side; this is just transport.
 */
export async function callFunction<TOut, TIn = unknown>(functionId: FunctionId, payload?: TIn): Promise<TOut> {
  const exec = await functions.createExecution({
    functionId,
    body: JSON.stringify(payload ?? {}),
    async: false,
    method: ExecutionMethod.POST,
    headers: { 'content-type': 'application/json' },
  });

  let parsed: FunctionEnvelope<TOut> | null = null;
  try {
    parsed = exec.responseBody ? (JSON.parse(exec.responseBody) as FunctionEnvelope<TOut>) : null;
  } catch {
    parsed = null;
  }

  if (exec.status === 'failed' || !parsed) {
    const error: AppError = {
      code: 'function_failed',
      message: 'The server could not complete that request. Please try again.',
      status: exec.responseStatusCode,
    };
    throw error;
  }
  if (!parsed.ok) {
    throw parsed.error ?? ({ code: 'unknown', message: 'Request failed.' } satisfies AppError);
  }
  return parsed.data as TOut;
}
