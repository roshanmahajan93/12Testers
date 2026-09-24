import { useNetworkState } from 'expo-network';
import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { connectivityChanged } from '@/features/ui/uiSlice';
import { api } from '@/store/api';
import { useAppDispatch } from '@/store/hooks';
import { useTheme } from '@/theme/ThemeProvider';
import { radii, space } from '@/theme/tokens';

import { Icon } from './ui/Icon';
import { Text } from './ui/Text';

/** Floating banner while offline; refetches everything when the connection comes back. */
export function OfflineBanner() {
  const net = useNetworkState();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  // `isInternetReachable` can be undefined while probing — only treat explicit false as offline.
  const offline = net.isConnected === false || net.isInternetReachable === false;

  const wasOffline = useRef(false);

  useEffect(() => {
    dispatch(connectivityChanged(!offline));
    if (wasOffline.current && !offline) {
      dispatch(api.util.invalidateTags(['DailyTasks', 'Enrollments', 'Apps', 'Notifications', 'Profile']));
    }
    wasOffline.current = offline;
  }, [offline, dispatch]);

  if (!offline) return null;
  return (
    <Animated.View
      entering={FadeInDown}
      exiting={FadeOutDown}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.banner, { bottom: insets.bottom + 100, backgroundColor: colors.bgElevated, borderColor: colors.warning }]}
    >
      <Icon name="cloud-offline-outline" color="warning" size={18} />
      <Text variant="caption" style={{ flex: 1 }}>
        You’re offline. We’ll sync as soon as you’re back.
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
});
