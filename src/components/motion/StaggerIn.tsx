import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { useReduceMotion } from '@/hooks/useMotion';
import { STAGGER } from '@/theme/motion';

/** Staggered entrance for list items / cards (index × STAGGER ms). Fades only with reduced motion. */
export function StaggerIn({ index = 0, children, style }: { index?: number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduceMotion = useReduceMotion();
  const delay = Math.min(index, 10) * STAGGER;
  const entering = reduceMotion ? FadeIn.duration(150) : FadeInDown.delay(delay).springify().damping(18).mass(0.8);
  return (
    <Animated.View entering={entering} style={style}>
      {children}
    </Animated.View>
  );
}
