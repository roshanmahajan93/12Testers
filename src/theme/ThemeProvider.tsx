import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { accents, palettes, type Accent, type AccentKey, type ColorScheme, type Palette } from './colors';
import { radii, space, typography } from './tokens';

export type ThemeMode = 'system' | 'light' | 'dark';

export interface Theme {
  scheme: ColorScheme;
  isDark: boolean;
  colors: Palette;
  accent: Accent;
  accentKey: AccentKey;
  space: typeof space;
  radii: typeof radii;
  typography: typeof typography;
}

const SchemeContext = createContext<ColorScheme>('dark');
const AccentContext = createContext<AccentKey>('neutral');

export function ThemeProvider({ mode, children }: { mode: ThemeMode; children: ReactNode }) {
  const system = useColorScheme();
  // Dark mode first: when the OS gives no preference we stay dark.
  const scheme: ColorScheme = mode === 'system' ? (system === 'light' ? 'light' : 'dark') : mode;
  return <SchemeContext.Provider value={scheme}>{children}</SchemeContext.Provider>;
}

/** Scopes a subtree to a role accent (developer = violet, tester = green). */
export function AccentProvider({ accent, children }: { accent: AccentKey; children: ReactNode }) {
  return <AccentContext.Provider value={accent}>{children}</AccentContext.Provider>;
}

export function useTheme(overrideAccent?: AccentKey): Theme {
  const scheme = useContext(SchemeContext);
  const ctxAccent = useContext(AccentContext);
  const accentKey = overrideAccent ?? ctxAccent;
  return useMemo(
    () => ({
      scheme,
      isDark: scheme === 'dark',
      colors: palettes[scheme],
      accent: accents[scheme][accentKey],
      accentKey,
      space,
      radii,
      typography,
    }),
    [scheme, accentKey],
  );
}
