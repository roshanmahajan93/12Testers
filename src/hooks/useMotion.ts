import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

import { useAppSelector } from '@/store/hooks';

/** True when animations should fall back to simple fades (OS setting or in-app override). */
export function useReduceMotion(): boolean {
  const system = useReducedMotion();
  const pref = useAppSelector((s) => s.settings.motion);
  if (pref === 'reduced') return true;
  if (pref === 'full') return false;
  return system;
}

export type HapticKind = 'tap' | 'select' | 'success' | 'warning' | 'error' | 'heavy';

export function useHaptics() {
  const enabled = useAppSelector((s) => s.settings.haptics);
  return useCallback(
    (kind: HapticKind = 'tap') => {
      if (!enabled) return;
      switch (kind) {
        case 'tap':
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'heavy':
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case 'select':
          void Haptics.selectionAsync();
          break;
        case 'success':
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'warning':
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case 'error':
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
      }
    },
    [enabled],
  );
}
