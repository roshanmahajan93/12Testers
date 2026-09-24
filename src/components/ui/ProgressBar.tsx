import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { useTheme } from '@/theme/ThemeProvider';
import { springs } from '@/theme/motion';

export function ProgressBar({ value, height = 8, label }: { value: number; height?: number; label?: string }) {
  const { colors, accent } = useTheme();
  const clamped = Math.max(0, Math.min(1, value));
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(withSpring(clamped, springs.gentle));
  }, [clamped, p]);
  const fill = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={[styles.track, { height, borderRadius: height / 2, backgroundColor: colors.surfaceAlt }]}
    >
      <Animated.View style={[styles.fill, { borderRadius: height / 2 }, fill]}>
        <LinearGradient colors={accent.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden' },
  fill: { height: '100%', overflow: 'hidden' },
});
