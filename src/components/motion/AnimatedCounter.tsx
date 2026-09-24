import { useEffect } from 'react';
import { StyleSheet, TextInput, type TextStyle } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';

import { useReduceMotion } from '@/hooks/useMotion';
import { useTheme } from '@/theme/ThemeProvider';
import { durations, easings } from '@/theme/motion';
import type { TypographyVariant } from '@/theme/tokens';

Animated.addWhitelistedNativeProps({ text: true });
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export interface AnimatedCounterProps {
  value: number;
  variant?: TypographyVariant;
  prefix?: string;
  suffix?: string;
  color?: string;
  style?: TextStyle;
  duration?: number;
}

/** Number that counts up/down to `value` on the UI thread (read-only TextInput trick). */
export function AnimatedCounter({
  value,
  variant = 'display',
  prefix = '',
  suffix = '',
  color,
  style,
  duration = durations.slower,
}: AnimatedCounterProps) {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const current = useSharedValue(reduceMotion ? value : 0);

  useEffect(() => {
    current.set(reduceMotion ? value : withTiming(value, { duration, easing: easings.standard }));
  }, [value, reduceMotion, duration, current]);

  const animatedProps = useAnimatedProps(() => {
    const n = Math.round(current.value);
    const text = `${prefix}${n.toLocaleString('en-US')}${suffix}`;
    return { text, defaultValue: text } as unknown as Partial<React.ComponentProps<typeof TextInput>>;
  });

  const label = `${prefix}${value.toLocaleString('en-US')}${suffix}`;
  return (
    <AnimatedTextInput
      editable={false}
      underlineColorAndroid="transparent"
      accessibilityLabel={label}
      defaultValue={label}
      animatedProps={animatedProps}
      maxFontSizeMultiplier={1.4}
      style={[theme.typography[variant], styles.reset, { color: color ?? theme.colors.text }, style]}
    />
  );
}

const styles = StyleSheet.create({ reset: { padding: 0, margin: 0 } });
