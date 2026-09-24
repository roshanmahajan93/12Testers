import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { useReduceMotion } from '@/hooks/useMotion';
import { useTheme } from '@/theme/ThemeProvider';
import { durations, springs } from '@/theme/motion';

/** Circular checkbox whose tick draws itself (Skia path trim) when `checked` flips on. */
export function CheckTick({ checked, size = 26 }: { checked: boolean; size?: number }) {
  const { colors, accent } = useTheme();
  const reduceMotion = useReduceMotion();
  const draw = useSharedValue(checked ? 1 : 0);
  const pop = useSharedValue(checked ? 1 : 0);

  useEffect(() => {
    draw.set(reduceMotion ? (checked ? 1 : 0) : withTiming(checked ? 1 : 0, { duration: durations.base }));
    pop.set(reduceMotion ? (checked ? 1 : 0) : withSpring(checked ? 1 : 0, springs.bouncy));
  }, [checked, reduceMotion, draw, pop]);

  const path = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(size * 0.28, size * 0.52);
    p.lineTo(size * 0.44, size * 0.67);
    p.lineTo(size * 0.73, size * 0.36);
    return p;
  }, [size]);

  const fill = useAnimatedStyle(() => ({
    transform: [{ scale: 0.6 + 0.4 * pop.value }],
    opacity: pop.value,
  }));

  return (
    <View style={{ width: size, height: size }}>
      <View style={[StyleSheet.absoluteFill, { borderRadius: size / 2, borderWidth: 2, borderColor: colors.borderStrong }]} />
      <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: size / 2, backgroundColor: accent.primary }, fill]} />
      <Canvas style={StyleSheet.absoluteFill}>
        <Path path={path} style="stroke" strokeWidth={size * 0.11} strokeCap="round" strokeJoin="round" color={accent.onPrimary} end={draw} />
      </Canvas>
    </View>
  );
}
