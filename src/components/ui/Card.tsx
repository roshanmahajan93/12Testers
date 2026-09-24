import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { PressableScale } from '@/components/motion/PressableScale';
import { useTheme } from '@/theme/ThemeProvider';
import { radii, shadow, space } from '@/theme/tokens';

export interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  padded?: boolean;
  tone?: 'surface' | 'alt' | 'accent';
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

export function Card({ children, onPress, padded = true, tone = 'surface', style, accessibilityLabel, testID }: CardProps) {
  const { colors, accent, isDark } = useTheme();
  const base: ViewStyle = {
    backgroundColor: tone === 'alt' ? colors.surfaceAlt : tone === 'accent' ? accent.soft : colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: tone === 'accent' ? 'transparent' : colors.border,
    padding: padded ? space.lg : 0,
    ...(isDark ? null : shadow(1)),
  };
  if (onPress) {
    return (
      <PressableScale
        testID={testID}
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
        haptic="select"
        style={[base, style]}
      >
        {children}
      </PressableScale>
    );
  }
  return (
    <View testID={testID} style={[base, style]} accessibilityLabel={accessibilityLabel}>
      {children}
    </View>
  );
}
