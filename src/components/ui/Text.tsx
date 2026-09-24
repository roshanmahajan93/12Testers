import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import type { Palette } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import type { TypographyVariant } from '@/theme/tokens';

export type TextColor = keyof Palette | 'accent' | 'onAccent';

export interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  color?: TextColor;
  align?: 'left' | 'center' | 'right';
  /** Cap font scaling so large accessibility sizes don't explode tight layouts. */
  maxScale?: number;
}

export function Text({ variant = 'body', color = 'text', align, maxScale = 1.6, style, ...rest }: TextProps) {
  const theme = useTheme();
  const resolved =
    color === 'accent' ? theme.accent.primary : color === 'onAccent' ? theme.accent.onPrimary : theme.colors[color];
  return (
    <RNText
      maxFontSizeMultiplier={maxScale}
      style={[theme.typography[variant], { color: resolved }, align ? { textAlign: align } : null, style]}
      {...rest}
    />
  );
}
