import { Canvas, Circle, Group, Path, Skia, SweepGradient, vec } from '@shopify/react-native-skia';
import { useEffect, useMemo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { useReduceMotion } from '@/hooks/useMotion';
import { useTheme } from '@/theme/ThemeProvider';
import { durations, easings } from '@/theme/motion';

export interface ProgressRingProps {
  /** 0..1 */
  progress: number;
  size?: number;
  stroke?: number;
  children?: ReactNode;
  delay?: number;
  /** Override gradient (defaults to the role accent). */
  colors?: readonly [string, string];
  accessibilityLabel?: string;
}

/** Skia ring with a gradient stroke; the sweep animates on the UI thread. */
export function ProgressRing({
  progress,
  size = 88,
  stroke = 10,
  children,
  delay = 0,
  colors,
  accessibilityLabel,
}: ProgressRingProps) {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const clamped = Math.max(0, Math.min(1, progress));
  const end = useSharedValue(reduceMotion ? clamped : 0);

  useEffect(() => {
    end.set(
      reduceMotion
        ? clamped
        : withDelay(delay, withTiming(clamped, { duration: durations.slower, easing: easings.emphasized })),
    );
  }, [clamped, delay, reduceMotion, end]);

  const r = (size - stroke) / 2;
  const c = size / 2;
  const path = useMemo(() => {
    const p = Skia.Path.Make();
    p.addCircle(c, c, r);
    return p;
  }, [c, r]);
  const [a, b] = colors ?? theme.accent.gradient;

  return (
    <View
      style={{ width: size, height: size }}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
    >
      <Canvas style={StyleSheet.absoluteFill}>
        <Circle cx={c} cy={c} r={r} style="stroke" strokeWidth={stroke} color={theme.colors.surfaceAlt} />
        {/* Rotate so the sweep starts at 12 o'clock. */}
        <Group origin={vec(c, c)} transform={[{ rotate: -Math.PI / 2 }]}>
          <Path path={path} style="stroke" strokeWidth={stroke} strokeCap="round" start={0} end={end}>
            <SweepGradient c={vec(c, c)} colors={[a, b, a]} />
          </Path>
        </Group>
      </Canvas>
      {children ? <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({ center: { alignItems: 'center', justifyContent: 'center' } });
