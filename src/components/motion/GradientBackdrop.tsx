import { BlurMask, Canvas, Circle } from '@shopify/react-native-skia';
import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { Easing, useDerivedValue, useSharedValue, withRepeat, withTiming, cancelAnimation } from 'react-native-reanimated';

import { useReduceMotion } from '@/hooks/useMotion';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Slowly drifting, blurred colour blobs (Skia) for auth/onboarding backgrounds.
 * Uses the current accent gradient; static with reduced motion.
 */
export function GradientBackdrop({ intensity = 1, colors }: { intensity?: number; colors?: readonly [string, string] }) {
  const { width, height } = useWindowDimensions();
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const t = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    t.set(withRepeat(withTiming(1, { duration: 14000, easing: Easing.inOut(Easing.sin) }), -1, true));
    return () => cancelAnimation(t);
  }, [reduceMotion, t]);

  const [a, b] = colors ?? theme.accent.gradient;
  const r = Math.max(width, height) * 0.42;

  const c1x = useDerivedValue(() => width * (0.15 + 0.25 * t.value));
  const c1y = useDerivedValue(() => height * (0.18 + 0.08 * Math.sin(t.value * Math.PI * 2)));
  const c2x = useDerivedValue(() => width * (0.9 - 0.3 * t.value));
  const c2y = useDerivedValue(() => height * (0.62 + 0.1 * Math.cos(t.value * Math.PI * 2)));

  const opacity = (theme.isDark ? 0.42 : 0.28) * intensity;

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Circle cx={c1x} cy={c1y} r={r} color={a} opacity={opacity}>
        <BlurMask blur={r * 0.55} style="normal" />
      </Circle>
      <Circle cx={c2x} cy={c2y} r={r * 0.9} color={b} opacity={opacity}>
        <BlurMask blur={r * 0.55} style="normal" />
      </Circle>
    </Canvas>
  );
}
