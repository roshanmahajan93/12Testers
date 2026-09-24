import { forwardRef, type ComponentRef } from 'react';
import { Pressable, type PressableProps, type StyleProp, type View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { useHaptics, useReduceMotion, type HapticKind } from '@/hooks/useMotion';
import { PRESS_SCALE, springs } from '@/theme/motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** Scale while pressed (default from motion tokens). */
  scaleTo?: number;
  haptic?: HapticKind | false;
}

/** Every tappable surface uses this: spring scale-down + optional haptic tick. */
export const PressableScale = forwardRef<ComponentRef<typeof View>, PressableScaleProps>(function PressableScale(
  { style, scaleTo = PRESS_SCALE, haptic = 'tap', onPressIn, onPressOut, onPress, disabled, children, ...rest },
  ref,
) {
  const reduceMotion = useReduceMotion();
  const pressed = useSharedValue(0);
  const fire = useHaptics();

  const animatedStyle = useAnimatedStyle(() => {
    const scale = 1 - (1 - scaleTo) * pressed.value;
    return {
      transform: [{ scale: reduceMotion ? 1 : scale }],
      opacity: reduceMotion ? 1 - pressed.value * 0.25 : 1,
    };
  });

  return (
    <AnimatedPressable
      ref={ref}
      accessibilityRole="button"
      disabled={disabled}
      onPressIn={(e) => {
        pressed.set(withSpring(1, springs.snappy));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        pressed.set(withSpring(0, springs.snappy));
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic) fire(haptic);
        onPress?.(e);
      }}
      style={[style, animatedStyle, disabled ? { opacity: 0.5 } : null]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
});
