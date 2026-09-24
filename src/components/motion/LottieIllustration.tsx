import LottieView, { type AnimationObject } from 'lottie-react-native';
import { useMemo } from 'react';
import { View } from 'react-native';

import { useReduceMotion } from '@/hooks/useMotion';
import { useTheme } from '@/theme/ThemeProvider';

import { celebrateAnimation, emptyAnimation, successAnimation } from './lottie/builders';

export type IllustrationName = 'success' | 'empty' | 'celebrate';

export interface LottieIllustrationProps {
  name: IllustrationName;
  size?: number;
  loop?: boolean;
  onFinish?: () => void;
}

/**
 * Role-tinted Lottie wrapper. With reduced motion we render the final frame only.
 */
export function LottieIllustration({ name, size = 160, loop, onFinish }: LottieIllustrationProps) {
  const { accent, colors } = useTheme();
  const reduceMotion = useReduceMotion();

  const source = useMemo(() => {
    switch (name) {
      case 'success':
        return successAnimation(accent.primary, accent.onPrimary);
      case 'empty':
        return emptyAnimation(accent.primary, colors.textFaint);
      case 'celebrate':
        return celebrateAnimation(accent.gradient[0], accent.gradient[1]);
    }
  }, [name, accent, colors.textFaint]);

  const shouldLoop = loop ?? name === 'empty';

  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <LottieView
        source={source as unknown as AnimationObject}
        autoPlay={!reduceMotion}
        loop={shouldLoop && !reduceMotion}
        progress={reduceMotion ? 1 : undefined}
        onAnimationFinish={onFinish ? () => onFinish() : undefined}
        style={{ width: size, height: size }}
      />
    </View>
  );
}
