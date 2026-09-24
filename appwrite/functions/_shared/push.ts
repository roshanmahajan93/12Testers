/**
 * sendPush: writes an in-app notification row for each user and delivers an Expo push to users
 * who have a token and haven't muted that category. Batches 100 messages per Expo request and
 * clears tokens Expo reports as `DeviceNotRegistered`.
 */
import { Permission, Role } from 'node-appwrite';

import type { NotificationData, NotificationPrefs, ProfileRow } from '../../../src/lib/domain/types';

import { createRow, getRowOrNull, TABLES, updateRow } from './db';
import type { Admin } from './runtime';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export type PushCategory = keyof Pick<NotificationPrefs, 'dailyTasks' | 'reminders' | 'testerActivity' | 'feedback'>;

export interface PushMessage {
  title: string;
  body: string;
  data?: NotificationData;
  /** Preference toggle that can mute this push (in-app row is still written). */
  category?: PushCategory;
}

interface ExpoTicket {
  status: 'ok' | 'error';
  details?: { error?: string };
}

function prefsAllow(raw: string | null, category?: PushCategory): boolean {
  if (!category || !raw) return true;
  try {
    const prefs = JSON.parse(raw) as Partial<NotificationPrefs>;
    return prefs[category] !== false;
  } catch {
    return true;
  }
}

export async function sendPush(admin: Admin, userIds: string[], msg: PushMessage, log?: (m: string) => void): Promise<void> {
  const unique = [...new Set(userIds)];
  const targets: { userId: string; token: string }[] = [];

  for (const userId of unique) {
    await createRow(
      admin,
      TABLES.notifications,
      { userId, title: msg.title, body: msg.body, data: msg.data ? JSON.stringify(msg.data) : null, read: false },
      [Permission.read(Role.user(userId)), Permission.update(Role.user(userId)), Permission.delete(Role.user(userId))],
    );
    const profile = await getRowOrNull<ProfileRow>(admin, TABLES.profiles, userId);
    if (profile?.expoPushToken && prefsAllow(profile.notificationPrefs, msg.category)) {
      targets.push({ userId, token: profile.expoPushToken });
    }
  }

  for (let i = 0; i < targets.length; i += 100) {
    const batch = targets.slice(i, i + 100);
    const headers: Record<string, string> = { 'content-type': 'application/json', accept: 'application/json' };
    if (process.env.EXPO_ACCESS_TOKEN) headers.authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(
          batch.map((t) => ({
            to: t.token,
            title: msg.title,
            body: msg.body,
            data: msg.data ?? {},
            sound: 'default',
            channelId: msg.category === 'reminders' || msg.category === 'dailyTasks' ? 'reminders' : 'default',
          })),
        ),
      });
      const json = (await res.json()) as { data?: ExpoTicket[] };
      const tickets = json.data ?? [];
      await Promise.all(
        tickets.map(async (ticket, idx) => {
          const target = batch[idx];
          if (target && ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
            await updateRow<ProfileRow>(admin, TABLES.profiles, target.userId, { expoPushToken: null });
          }
        }),
      );
    } catch (e) {
      log?.(`expo push failed: ${String(e)}`);
    }
  }
}
