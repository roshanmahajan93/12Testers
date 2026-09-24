import * as Notifications from 'expo-notifications';
import { router, type Href } from 'expo-router';
import { useEffect, useRef } from 'react';

import type { NotificationData } from '@/lib/domain/types';
import { api } from '@/store/api';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

/** Only allow in-app paths from push payloads (no external URLs). */
export function safeInAppPath(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  if (!url.startsWith('/') || url.startsWith('//')) return null;
  return url;
}

/**
 * Deep-links notification taps into the app. Stack.Protected + useRequireRole bounce the user
 * to their own home if the payload targets the other role's screen.
 */
export function useNotificationRouting(): void {
  const dispatch = useAppDispatch();
  const ready = useAppSelector((s) => s.auth.status === 'signedIn' && s.auth.role !== null);
  const lastResponse = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!ready || !lastResponse) return;
    const id = lastResponse.notification.request.identifier;
    if (handled.current === id) return;
    handled.current = id;
    const data = lastResponse.notification.request.content.data as NotificationData | undefined;
    const path = safeInAppPath(data?.url);
    if (path) router.push(path as Href);
  }, [ready, lastResponse]);

  // Any push while the app is open → refresh the notification centre and live data.
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener(() => {
      dispatch(api.util.invalidateTags(['Notifications', 'DailyTasks', 'Enrollments']));
    });
    return () => sub.remove();
  }, [dispatch]);
}
