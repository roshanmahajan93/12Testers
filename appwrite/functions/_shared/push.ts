/**
 * sendPush: writes an in-app notification row for each user and delivers a push through
 * **Appwrite Messaging → Firebase Cloud Messaging** (free). No Expo push service is used.
 *
 * Devices register their FCM token as an Appwrite push target (`account.createPushTarget`), so we
 * address users by id and Appwrite fans out to all of their devices. Users who muted a category
 * (notificationPrefs) still get the in-app row, but no push.
 */
import { ID, Permission, Role } from 'node-appwrite';

import type { NotificationData, NotificationPrefs, ProfileRow } from '../../../src/lib/domain/types';

import { createRow, getRowOrNull, TABLES } from './db';
import type { Admin } from './runtime';

export type PushCategory = keyof Pick<NotificationPrefs, 'dailyTasks' | 'reminders' | 'testerActivity' | 'feedback'>;

export interface PushMessage {
  title: string;
  body: string;
  data?: NotificationData;
  /** Preference toggle that can mute this push (in-app row is still written). */
  category?: PushCategory;
}

/** Appwrite caps the recipients of a single message; stay well under it. */
const MAX_USERS_PER_MESSAGE = 100;

function prefsAllow(raw: string | null, category?: PushCategory): boolean {
  if (!category || !raw) return true;
  try {
    const prefs = JSON.parse(raw) as Partial<NotificationPrefs>;
    return prefs[category] !== false;
  } catch {
    return true;
  }
}

/** FCM data payloads must be string → string. */
function toStringMap(data: NotificationData | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(data ?? {})) if (v !== undefined && v !== null) out[k] = String(v);
  return out;
}

export async function sendPush(admin: Admin, userIds: string[], msg: PushMessage, log?: (m: string) => void): Promise<void> {
  const unique = [...new Set(userIds)];
  const recipients: string[] = [];

  for (const userId of unique) {
    await createRow(
      admin,
      TABLES.notifications,
      { userId, title: msg.title, body: msg.body, data: msg.data ? JSON.stringify(msg.data) : null, read: false },
      [Permission.read(Role.user(userId)), Permission.update(Role.user(userId)), Permission.delete(Role.user(userId))],
    );
    const profile = await getRowOrNull<ProfileRow>(admin, TABLES.profiles, userId);
    if (profile && prefsAllow(profile.notificationPrefs, msg.category)) recipients.push(userId);
  }

  for (let i = 0; i < recipients.length; i += MAX_USERS_PER_MESSAGE) {
    try {
      await admin.messaging.createPush({
        messageId: ID.unique(),
        title: msg.title,
        body: msg.body,
        users: recipients.slice(i, i + MAX_USERS_PER_MESSAGE),
        data: toStringMap(msg.data),
      });
    } catch (e) {
      // Users without a registered device, or no FCM provider configured yet — the in-app row
      // above still reaches them, so a failed push is never fatal.
      log?.(`push failed: ${String(e)}`);
    }
  }
}
