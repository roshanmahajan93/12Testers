import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { PressableScale } from '@/components/motion/PressableScale';
import { useTheme } from '@/theme/ThemeProvider';
import { springs } from '@/theme/motion';
import { radii } from '@/theme/tokens';

import { Text } from './Text';

export interface Segment<T extends string> {
  value: T;
  label: string;
}

export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
}: {
  segments: readonly Segment<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  const { colors, accent } = useTheme();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, segments.findIndex((s) => s.value === value));
  const segW = segments.length ? (width - 8) / segments.length : 0;
  const x = useSharedValue(0);
  useEffect(() => {
    x.set(withSpring(index * segW, springs.snappy));
  }, [index, segW, x]);
  const indicator = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View
      accessibilityRole="tablist"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.wrap, { backgroundColor: colors.surfaceAlt }]}
    >
      {width > 0 ? (
        <Animated.View style={[styles.indicator, { width: segW, backgroundColor: colors.surface, borderColor: accent.soft }, indicator]} />
      ) : null}
      {segments.map((s) => (
        <PressableScale
          key={s.value}
          onPress={() => onChange(s.value)}
          haptic="select"
          accessibilityRole="tab"
          accessibilityState={{ selected: s.value === value }}
          style={styles.item}
        >
          <Text variant="caption" color={s.value === value ? 'text' : 'textMuted'}>
            {s.label}
          </Text>
        </PressableScale>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', borderRadius: radii.md, padding: 4, height: 44 },
  indicator: { position: 'absolute', top: 4, left: 4, bottom: 4, borderRadius: radii.sm, borderWidth: 1 },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
