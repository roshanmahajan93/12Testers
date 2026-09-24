import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

import type { TextColor } from './Text';
import { useTheme } from '@/theme/ThemeProvider';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export interface IconProps {
  name: IconName;
  size?: number;
  color?: TextColor | (string & {});
}

export function Icon({ name, size = 22, color = 'text' }: IconProps) {
  const theme = useTheme();
  const resolved =
    color === 'accent'
      ? theme.accent.primary
      : color === 'onAccent'
        ? theme.accent.onPrimary
        : color in theme.colors
          ? theme.colors[color as keyof typeof theme.colors]
          : color;
  return <Ionicons name={name} size={size} color={resolved} accessibilityElementsHidden importantForAccessibility="no" />;
}
