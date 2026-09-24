import { Easing, type WithSpringConfig } from 'react-native-reanimated';

/** Motion tokens. Every animation in the app should pull from here. */
export const durations = {
  instant: 90,
  fast: 160,
  base: 260,
  slow: 420,
  slower: 700,
  celebration: 1600,
} as const;

export const springs = {
  /** Buttons, toggles, small UI feedback. */
  snappy: { damping: 18, stiffness: 320, mass: 0.8 },
  /** Cards and sheets settling into place. */
  gentle: { damping: 22, stiffness: 170, mass: 1 },
  /** Playful overshoot for celebrations, icon bounce. */
  bouncy: { damping: 9, stiffness: 190, mass: 0.9 },
  /** Card fly-off in the tester stack. */
  fling: { damping: 20, stiffness: 120, mass: 1, overshootClamping: true },
} as const satisfies Record<string, WithSpringConfig>;

export const easings = {
  standard: Easing.bezier(0.2, 0, 0, 1),
  emphasized: Easing.bezier(0.3, 0, 0, 1.15),
  exit: Easing.bezier(0.4, 0, 1, 1),
  linear: Easing.linear,
} as const;

/** Stagger between list items entering, in ms. */
export const STAGGER = 55;

/** Scale applied by PressableScale while pressed. */
export const PRESS_SCALE = 0.965;
