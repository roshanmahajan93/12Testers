import * as WebBrowser from 'expo-web-browser';
import { ID, OAuthProvider } from 'react-native-appwrite';

import { ROLES, type Role } from '@/lib/domain/types';
import { env } from '@/lib/env';
import { toAppError } from '@/lib/errors';

import { account } from './client';

export interface SessionUser {
  userId: string;
  email: string;
  name: string;
  /** Role label set by the setRole function. Null for brand-new accounts. */
  role: Role | null;
}

function roleFromLabels(labels: readonly string[]): Role | null {
  return (ROLES as readonly string[]).find((r) => labels.includes(r)) as Role | undefined ?? null;
}

/** Returns the signed-in user or null when there is no valid session. */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const u = await account.get();
    return { userId: u.$id, email: u.email, name: u.name, role: roleFromLabels(u.labels ?? []) };
  } catch (e) {
    const err = toAppError(e);
    if (err.status === 401) return null;
    throw err;
  }
}

/** Step 1 of email OTP: Appwrite emails a 6-digit code. Returns the userId to verify against. */
export async function sendEmailOtp(email: string): Promise<{ userId: string }> {
  const token = await account.createEmailToken({ userId: ID.unique(), email });
  return { userId: token.userId };
}

/** Step 2 of email OTP. */
export async function verifyEmailOtp(userId: string, code: string): Promise<void> {
  await account.createSession({ userId, secret: code });
}

/**
 * Google OAuth via the token flow: open the browser, receive userId+secret on the Appwrite
 * callback scheme, then exchange for a session. The scheme is registered in app.config.ts.
 */
export async function signInWithGoogle(): Promise<'success' | 'cancelled'> {
  const redirect = `appwrite-callback-${env.appwriteProjectId}://`;
  const url = account.createOAuth2Token({ provider: OAuthProvider.Google, success: redirect, failure: redirect });
  if (!url) throw toAppError({ message: 'Could not start Google sign-in.' });
  const result = await WebBrowser.openAuthSessionAsync(url.toString(), redirect);
  if (result.type !== 'success') return 'cancelled';
  const parsed = new URL(result.url);
  const secret = parsed.searchParams.get('secret');
  const userId = parsed.searchParams.get('userId');
  if (!secret || !userId) throw toAppError({ message: 'Google sign-in was not completed.' });
  await account.createSession({ userId, secret });
  return 'success';
}

export async function updateAccountName(name: string): Promise<void> {
  await account.updateName({ name });
}

export async function signOutCurrent(): Promise<void> {
  try {
    await account.deleteSession({ sessionId: 'current' });
  } catch {
    // Already signed out server-side — nothing to do.
  }
}

let jwtCache: { token: string; expires: number } | null = null;

/** Short-lived JWT used to load private images (expo-image can't share the SDK session). */
export async function getJwt(): Promise<string> {
  const now = Date.now();
  if (jwtCache && jwtCache.expires > now + 60_000) return jwtCache.token;
  const { jwt } = await account.createJWT({ duration: 900 });
  jwtCache = { token: jwt, expires: now + 900_000 };
  return jwt;
}

export function clearJwtCache(): void {
  jwtCache = null;
}
