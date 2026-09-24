import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { logger } from '@/services/logger';

export const CHANNELS = {
  default: 'default',
  reminders: 'reminders',
} as const;

// Foreground presentation: show banners for pushes while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

export async function ensureAndroidChannels(accentColor = '#7C5CFF'): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNELS.default, {
    name: 'Activity',
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: accentColor,
  });
  await Notifications.setNotificationChannelAsync(CHANNELS.reminders, {
    name: 'Daily reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: accentColor,
  });
}

export type PermissionState = 'granted' | 'denied' | 'undetermined';

export async function getPermissionState(): Promise<PermissionState> {
  const { status } = await Notifications.getPermissionsAsync();
  return status as PermissionState;
}

/** Android 13+ shows the POST_NOTIFICATIONS prompt here; call only after our own primer. */
export async function requestPermission(): Promise<PermissionState> {
  await ensureAndroidChannels();
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return 'granted';
  const next = await Notifications.requestPermissionsAsync();
  return next.status as PermissionState;
}

/** Expo push token for this device, or null on simulators / missing projectId / denied. */
export async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;
  const projectId =
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ??
    Constants.easConfig?.projectId;
  if (!projectId) {
    logger.warn('EAS projectId missing — push notifications disabled');
    return null;
  }
  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data;
  } catch (e) {
    logger.warn('getExpoPushTokenAsync failed', e);
    return null;
  }
}
