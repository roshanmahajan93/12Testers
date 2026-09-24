import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { useReduceMotion } from '@/hooks/useMotion';
import { useTheme } from '@/theme/ThemeProvider';
import { durations, springs } from '@/theme/motion';
import { radii, space } from '@/theme/tokens';

import { Text } from './Text';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Prevent closing by tapping the backdrop / dragging (for blocking flows). */
  dismissible?: boolean;
}

/** Bottom sheet with spring entrance, drag-to-dismiss and a dimmed backdrop. */
export function Sheet({ visible, onClose, title, children, dismissible = true }: SheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const [mounted, setMounted] = useState(visible);
  // Mount synchronously when opening (state adjustment during render, not in an effect).
  if (visible && !mounted) setMounted(true);
  const y = useSharedValue(height);
  const backdrop = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      backdrop.set(withTiming(1, { duration: durations.base }));
      y.set(reduceMotion ? withTiming(0, { duration: durations.fast }) : withSpring(0, springs.gentle));
    } else if (mounted) {
      backdrop.set(withTiming(0, { duration: durations.fast }));
      y.set(
        withTiming(height, { duration: durations.base }, (finished) => {
          if (finished) scheduleOnRN(setMounted, false);
        }),
      );
    }
  }, [visible, mounted, height, reduceMotion, y, backdrop]);

  const pan = Gesture.Pan()
    .enabled(dismissible)
    .onChange((e) => {
      y.set(Math.max(0, y.get() + e.changeY));
    })
    .onEnd((e) => {
      if (y.get() > 140 || e.velocityY > 900) {
        scheduleOnRN(onClose);
      } else {
        y.set(withSpring(0, springs.snappy));
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));

  if (!mounted) return null;

  return (
    <Modal transparent visible={mounted} onRequestClose={dismissible ? onClose : undefined} statusBarTranslucent navigationBarTranslucent>
      <GestureHandlerRootView style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }, backdropStyle]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={dismissible ? onClose : undefined}
            accessibilityLabel="Close"
            accessibilityRole="button"
          />
        </Animated.View>
        <GestureDetector gesture={pan}>
          <Animated.View
            accessibilityViewIsModal
            style={[
              styles.sheet,
              { backgroundColor: colors.bgElevated, paddingBottom: insets.bottom + space.lg, maxHeight: height * 0.92 },
              sheetStyle,
            ]}
          >
            <View style={[styles.grabber, { backgroundColor: colors.borderStrong }]} />
            {title ? (
              <Text variant="h3" style={styles.title} accessibilityRole="header">
                {title}
              </Text>
            ) : null}
            {children}
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    paddingHorizontal: space.xl,
    paddingTop: space.sm,
    gap: space.md,
  },
  grabber: { alignSelf: 'center', width: 42, height: 5, borderRadius: 3, marginBottom: space.sm },
  title: { marginBottom: space.xs },
});
