import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { PressableScale } from '@/components/motion/PressableScale';
import { useTheme } from '@/theme/ThemeProvider';
import { springs } from '@/theme/motion';

const W = 52;
const H = 32;
const KNOB = 24;

export function Toggle({
  value,
  onChange,
  label,
  disabled,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  const { colors, accent } = useTheme();
  const t = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    t.set(withSpring(value ? 1 : 0, springs.snappy));
  }, [value, t]);

  const track = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(t.value, [0, 1], [colors.borderStrong, accent.primary]),
  }));
  const knob = useAnimatedStyle(() => ({
    transform: [{ translateX: t.value * (W - KNOB - 8) }, { scale: 1 + 0.08 * Math.sin(t.value * Math.PI) }],
  }));

  return (
    <PressableScale
      onPress={() => onChange(!value)}
      disabled={disabled}
      haptic="select"
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      hitSlop={8}
    >
      <Animated.View style={[styles.track, track]}>
        <Animated.View style={[styles.knob, knob]} />
      </Animated.View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  track: { width: W, height: H, borderRadius: H / 2, padding: 4, justifyContent: 'center' },
  knob: { width: KNOB, height: KNOB, borderRadius: KNOB / 2, backgroundColor: '#FFFFFF' },
});
