import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useReduceMotion } from '@/hooks/useMotion';
import { useTheme } from '@/theme/ThemeProvider';

/** Deterministic pseudo-random generator so re-renders don't reshuffle the pieces. */
function seededRandom(initial: number): () => number {
  let seed = initial;
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

interface Piece {
  x: number;
  drift: number;
  delay: number;
  spin: number;
  size: number;
  color: string;
  round: boolean;
}

function ConfettiPiece({ piece, progress, height }: { piece: Piece; progress: SharedValue<number>; height: number }) {
  const style = useAnimatedStyle(() => {
    const t = progress.value;
    const local = Math.max(0, Math.min(1, (t - piece.delay) / (1 - piece.delay)));
    const y = -40 + local * (height + 80);
    const x = piece.x + Math.sin(local * Math.PI * 3) * piece.drift;
    return {
      opacity: local <= 0 ? 0 : 1 - Math.max(0, local - 0.85) / 0.15,
      transform: [{ translateX: x }, { translateY: y }, { rotate: `${local * piece.spin}deg` }, { scaleX: Math.cos(local * 12) }],
    };
  });
  return (
    <Animated.View
      style={[
        styles.piece,
        { width: piece.size, height: piece.round ? piece.size : piece.size * 0.45, borderRadius: piece.round ? piece.size / 2 : 2, backgroundColor: piece.color },
        style,
      ]}
    />
  );
}

/**
 * Lightweight confetti burst (Reanimated views, UI-thread only). Remount (change `key`) to replay.
 * Renders nothing with reduced motion.
 */
export function Confetti({ count = 44, duration = 2600, onDone }: { count?: number; duration?: number; onDone?: () => void }) {
  const { width, height } = useWindowDimensions();
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const progress = useSharedValue(0);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  const pieces = useMemo<Piece[]>(() => {
    const palette = [theme.accent.gradient[0], theme.accent.gradient[1], theme.colors.warning, theme.colors.streak, '#FFFFFF'];
    const rand = seededRandom(7);
    return Array.from({ length: count }, (_, i) => ({
      x: rand() * width,
      drift: 20 + rand() * 50,
      delay: rand() * 0.35,
      spin: 360 + rand() * 720,
      size: 7 + rand() * 7,
      color: palette[i % palette.length]!,
      round: rand() > 0.65,
    }));
  }, [count, width, theme]);

  useEffect(() => {
    if (reduceMotion) {
      onDoneRef.current?.();
      return;
    }
    progress.set(withDelay(60, withTiming(1, { duration, easing: Easing.out(Easing.quad) })));
    const t = setTimeout(() => onDoneRef.current?.(), duration + 100);
    return () => clearTimeout(t);
  }, [duration, progress, reduceMotion]);

  if (reduceMotion) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => (
        <ConfettiPiece key={i} piece={p} progress={progress} height={height} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ piece: { position: 'absolute', top: 0, left: 0 } });
