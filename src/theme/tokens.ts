import { Platform, type TextStyle, type ViewStyle } from 'react-native';

/** 4pt spacing grid. */
export const space = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const radii = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
  pill: 999,
} as const;

/** Minimum accessible touch target. */
export const HIT_TARGET = 44;

export const fonts = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
} as const;

export type TypographyVariant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'body'
  | 'bodyStrong'
  | 'bodySm'
  | 'caption'
  | 'label'
  | 'mono';

export const typography: Record<TypographyVariant, TextStyle> = {
  display: { fontFamily: fonts.extrabold, fontSize: 34, lineHeight: 40, letterSpacing: -0.8 },
  h1: { fontFamily: fonts.extrabold, fontSize: 28, lineHeight: 34, letterSpacing: -0.6 },
  h2: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  h3: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 24, letterSpacing: -0.2 },
  body: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 23 },
  bodyStrong: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 23 },
  bodySm: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16 },
  label: {
    fontFamily: fonts.bold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  mono: {
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    fontSize: 13,
    lineHeight: 18,
  },
};

export function shadow(level: 1 | 2 | 3, color = '#000'): ViewStyle {
  const map = {
    1: { radius: 6, opacity: 0.12, y: 2, elevation: 2 },
    2: { radius: 14, opacity: 0.18, y: 6, elevation: 6 },
    3: { radius: 28, opacity: 0.28, y: 14, elevation: 12 },
  }[level];
  return {
    shadowColor: color,
    shadowOpacity: map.opacity,
    shadowRadius: map.radius,
    shadowOffset: { width: 0, height: map.y },
    elevation: map.elevation,
  };
}
