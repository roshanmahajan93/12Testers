import type { Role } from '@/lib/domain/types';

export type ColorScheme = 'light' | 'dark';

export interface Palette {
  bg: string;
  bgElevated: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textFaint: string;
  overlay: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  info: string;
  infoSoft: string;
  streak: string;
}

const dark: Palette = {
  bg: '#0B0B14',
  bgElevated: '#101019',
  surface: '#15151F',
  surfaceAlt: '#1D1D2B',
  border: '#272738',
  borderStrong: '#3A3A52',
  text: '#F4F4FA',
  textMuted: '#A4A4BC',
  textFaint: '#6E6E88',
  overlay: 'rgba(5,5,10,0.72)',
  success: '#2BD9A0',
  successSoft: 'rgba(43,217,160,0.14)',
  warning: '#FFB547',
  warningSoft: 'rgba(255,181,71,0.14)',
  danger: '#FF5C7A',
  dangerSoft: 'rgba(255,92,122,0.14)',
  info: '#5CC8FF',
  infoSoft: 'rgba(92,200,255,0.14)',
  streak: '#FF8A3D',
};

const light: Palette = {
  bg: '#F5F5FA',
  bgElevated: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#EEEEF6',
  border: '#E1E1EC',
  borderStrong: '#C9C9DA',
  text: '#11111B',
  textMuted: '#55556E',
  textFaint: '#8E8EA6',
  overlay: 'rgba(12,12,24,0.45)',
  success: '#0FA878',
  successSoft: 'rgba(15,168,120,0.12)',
  warning: '#C77800',
  warningSoft: 'rgba(199,120,0,0.12)',
  danger: '#E0304F',
  dangerSoft: 'rgba(224,48,79,0.1)',
  info: '#0784C9',
  infoSoft: 'rgba(7,132,201,0.1)',
  streak: '#E86A1C',
};

export const palettes: Record<ColorScheme, Palette> = { dark, light };

export interface Accent {
  /** Main accent used for primary buttons, active tab, rings. */
  primary: string;
  /** Two-stop gradient used on hero surfaces and ring strokes. */
  gradient: readonly [string, string];
  /** Tinted background for chips, selected rows. */
  soft: string;
  /** Text/icon color drawn on top of `primary`/`gradient`. */
  onPrimary: string;
}

export type AccentKey = Role | 'neutral';

export const accents: Record<ColorScheme, Record<AccentKey, Accent>> = {
  dark: {
    developer: {
      primary: '#8B6CFF',
      gradient: ['#8B6CFF', '#4D7CFF'],
      soft: 'rgba(139,108,255,0.16)',
      onPrimary: '#FFFFFF',
    },
    tester: {
      primary: '#22E0A8',
      gradient: ['#2AF0B0', '#12B5C9'],
      soft: 'rgba(34,224,168,0.15)',
      onPrimary: '#03231A',
    },
    neutral: {
      primary: '#E6E6F5',
      gradient: ['#8B6CFF', '#22E0A8'],
      soft: 'rgba(230,230,245,0.1)',
      onPrimary: '#0B0B14',
    },
  },
  light: {
    developer: {
      primary: '#6A48F5',
      gradient: ['#7657FF', '#3C6BF0'],
      soft: 'rgba(106,72,245,0.1)',
      onPrimary: '#FFFFFF',
    },
    tester: {
      primary: '#089C7A',
      gradient: ['#10B888', '#0A92B0'],
      soft: 'rgba(8,156,122,0.1)',
      onPrimary: '#FFFFFF',
    },
    neutral: {
      primary: '#15151F',
      gradient: ['#6A48F5', '#10B888'],
      soft: 'rgba(21,21,31,0.06)',
      onPrimary: '#FFFFFF',
    },
  },
};
