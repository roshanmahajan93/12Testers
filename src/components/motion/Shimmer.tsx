import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '@/hooks/useMotion';
import { useTheme } from '@/theme/ThemeProvider';

/** Sweeping highlight used by skeletons. Runs entirely on the UI thread. */
export function Shimmer({ style }: { style?: StyleProp<ViewStyle> }) {
  const { colors, isDark } = useTheme();
  const reduceMotion = useReduceMotion();
  const [width, setWidth] = useState(0);
  const x = useSharedValue(-1);

  useEffect(() => {
    if (reduceMotion || width === 0) return;
    x.set(withRepeat(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.quad) }), -1, false));
    return () => cancelAnimation(x);
  }, [reduceMotion, width, x]);

  const sweep = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * width }] }));
  const highlight = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.65)';

  return (
    <View
      style={[{ backgroundColor: colors.surfaceAlt, overflow: 'hidden' }, style]}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
    >
      {!reduceMotion ? (
        <Animated.View style={[StyleSheet.absoluteFill, sweep]}>
          <LinearGradient
            colors={['transparent', highlight, 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}
