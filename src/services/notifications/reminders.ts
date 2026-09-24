import * as Notifications from 'expo-notifications';

import { kv } from '@/store/storage';

import { CHANNELS } from './permissions';

const REMINDER_KEY = 'reminder.pendingTasks.id';

export function parseTime(hhmm: string): { hour: number; minute: number } {
  const [h, m] = hhmm.split(':').map(Number);
  return { hour: Math.min(23, Math.max(0, h ?? 19)), minute: Math.min(59, Math.max(0, m ?? 0)) };
}

/** Next occurrence of hh:mm after `now` — today if still ahead, otherwise tomorrow. */
export function nextReminderDate(now: Date, hhmm: string, skipToday: boolean): Date {
  const { hour, minute } = parseTime(hhmm);
  const d = new Date(now);
  d.setHours(hour, minute, 0, 0);
  if (skipToday || d.getTime() <= now.getTime()) d.setDate(d.getDate() + 1);
  return d;
}

/**
 * Keep exactly one local reminder scheduled for pending tester tasks:
 * - tasks still pending today → remind at today's chosen time (if not passed)
 * - all done (or time passed) → remind tomorrow at that time
 */
export async function syncPendingTaskReminder(opts: {
  pendingToday: number;
  reminderTime: string;
  enabled: boolean;
}): Promise<void> {
  const existing = kv.getString(REMINDER_KEY);
  if (existing) {
    await Notifications.cancelScheduledNotificationAsync(existing).catch(() => undefined);
    kv.remove(REMINDER_KEY);
  }
  if (!opts.enabled) return;

  const date = nextReminderDate(new Date(), opts.reminderTime, opts.pendingToday === 0);
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: opts.pendingToday > 0 ? 'Your testers’ day isn’t done yet' : 'New test tasks are waiting',
      body:
        opts.pendingToday > 0
          ? `You have ${opts.pendingToday} task${opts.pendingToday === 1 ? '' : 's'} left today. Keep your streak alive!`
          : 'Open 12Testers to see today’s tasks.',
      data: { url: '/today', kind: 'reminder', role: 'tester' },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: CHANNELS.reminders },
  });
  kv.set(REMINDER_KEY, id);
}

export async function cancelAllLocalReminders(): Promise<void> {
  kv.remove(REMINDER_KEY);
  await Notifications.cancelAllScheduledNotificationsAsync();
}
