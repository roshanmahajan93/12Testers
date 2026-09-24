import {
  Canvas,
  Circle,
  Group,
  LinearGradient,
  Path,
  RoundedRect,
  Skia,
  vec,
} from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { cancelAnimation, Easing, useDerivedValue, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { useReduceMotion } from '@/hooks/useMotion';
import { useTheme } from '@/theme/ThemeProvider';

export type IllustrationKind =
  | 'developer'
  | 'tester'
  | 'dev-plan'
  | 'dev-progress'
  | 'tester-daily'
  | 'tester-streak'
  | 'notifications';

/**
 * Original vector illustrations drawn with Skia primitives (no external art). Everything floats
 * gently on the UI thread; static with reduced motion. Canvas is square (`size`).
 */
export function Illustration({ kind, size = 220 }: { kind: IllustrationKind; size?: number }) {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const t = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    t.set(withRepeat(withTiming(1, { duration: 3600, easing: Easing.inOut(Easing.sin) }), -1, true));
    return () => cancelAnimation(t);
  }, [reduceMotion, t]);

  const s = size / 220; // design at 220
  const [a, b] = theme.accent.gradient;
  const surface = theme.colors.surfaceAlt;
  const line = theme.colors.borderStrong;
  const white = theme.isDark ? '#F4F4FA' : '#FFFFFF';

  const float = useDerivedValue(() => [{ translateY: (t.value - 0.5) * 10 * s }]);
  const floatInv = useDerivedValue(() => [{ translateY: (0.5 - t.value) * 8 * s }]);
  const orbit = useDerivedValue(() => [{ rotate: t.value * 0.6 }]);

  const check = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(-14 * s, 0);
    p.lineTo(-4 * s, 10 * s);
    p.lineTo(16 * s, -12 * s);
    return p;
  }, [s]);

  const flame = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(0, -30 * s);
    p.cubicTo(20 * s, -8 * s, 26 * s, 8 * s, 18 * s, 22 * s);
    p.cubicTo(10 * s, 34 * s, -10 * s, 34 * s, -18 * s, 22 * s);
    p.cubicTo(-26 * s, 8 * s, -12 * s, -2 * s, -6 * s, -14 * s);
    p.cubicTo(-2 * s, -6 * s, 2 * s, -4 * s, 4 * s, -10 * s);
    p.close();
    return p;
  }, [s]);

  const bell = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(-30 * s, 20 * s);
    p.cubicTo(-22 * s, 10 * s, -24 * s, -30 * s, 0, -34 * s);
    p.cubicTo(24 * s, -30 * s, 22 * s, 10 * s, 30 * s, 20 * s);
    p.close();
    return p;
  }, [s]);

  const grad = (x0: number, y0: number, x1: number, y1: number) => (
    <LinearGradient start={vec(x0 * s, y0 * s)} end={vec(x1 * s, y1 * s)} colors={[a, b]} />
  );

  const ring12 = (cx: number, cy: number, r: number, filled: number) =>
    Array.from({ length: 12 }, (_, i) => {
      const ang = (i / 12) * Math.PI * 2 - Math.PI / 2;
      return (
        <Circle key={i} cx={(cx + Math.cos(ang) * r) * s} cy={(cy + Math.sin(ang) * r) * s} r={7 * s} color={i < filled ? (i % 2 ? b : a) : line} />
      );
    });

  let body: React.ReactNode = null;
  switch (kind) {
    case 'developer':
      body = (
        <>
          <Group origin={vec(110 * s, 110 * s)} transform={orbit}>
            {ring12(110, 110, 92, 12)}
          </Group>
          <Group transform={float}>
            <RoundedRect x={72 * s} y={42 * s} width={76 * s} height={136 * s} r={16 * s} color={surface} />
            <RoundedRect x={80 * s} y={54 * s} width={60 * s} height={96 * s} r={8 * s}>
              {grad(80, 54, 140, 150)}
            </RoundedRect>
            <RoundedRect x={100 * s} y={160 * s} width={20 * s} height={6 * s} r={3 * s} color={line} />
            <Group transform={[{ translateX: 110 * s }, { translateY: 102 * s }]}>
              <Path path={check} style="stroke" strokeWidth={7 * s} strokeCap="round" strokeJoin="round" color={white} />
            </Group>
          </Group>
        </>
      );
      break;
    case 'tester':
      body = (
        <>
          <Group transform={floatInv}>
            <RoundedRect x={46 * s} y={70 * s} width={128 * s} height={110 * s} r={18 * s} color={line} opacity={0.5} />
            <RoundedRect x={38 * s} y={58 * s} width={144 * s} height={112 * s} r={18 * s} color={surface} />
          </Group>
          <Group transform={float}>
            <RoundedRect x={30 * s} y={44 * s} width={160 * s} height={112 * s} r={20 * s}>
              {grad(30, 44, 190, 156)}
            </RoundedRect>
            <Circle cx={62 * s} cy={76 * s} r={14 * s} color={white} opacity={0.9} />
            <RoundedRect x={86 * s} y={68 * s} width={78 * s} height={8 * s} r={4 * s} color={white} opacity={0.9} />
            <RoundedRect x={86 * s} y={82 * s} width={52 * s} height={6 * s} r={3 * s} color={white} opacity={0.6} />
            <Group transform={[{ translateX: 110 * s }, { translateY: 122 * s }]}>
              <Circle cx={0} cy={0} r={22 * s} color={white} opacity={0.25} />
              <Path path={check} style="stroke" strokeWidth={6 * s} strokeCap="round" strokeJoin="round" color={white} />
            </Group>
          </Group>
          <Group transform={[{ translateX: 178 * s }, { translateY: 176 * s }]}>
            <Path path={flame} color={theme.colors.streak} />
          </Group>
        </>
      );
      break;
    case 'dev-plan':
      body = (
        <Group transform={float}>
          <RoundedRect x={40 * s} y={30 * s} width={140 * s} height={160 * s} r={20 * s} color={surface} />
          {Array.from({ length: 5 }, (_, i) => (
            <Group key={i}>
              <Circle cx={64 * s} cy={(62 + i * 26) * s} r={8 * s} color={i < 3 ? a : line} />
              <RoundedRect x={82 * s} y={(58 + i * 26) * s} width={(76 - (i % 2) * 20) * s} height={8 * s} r={4 * s} color={i < 3 ? b : line} opacity={i < 3 ? 0.9 : 0.6} />
            </Group>
          ))}
        </Group>
      );
      break;
    case 'dev-progress':
      body = (
        <>
          {ring12(110, 110, 80, 9)}
          <Group transform={float}>
            <Circle cx={110 * s} cy={110 * s} r={46 * s}>
              {grad(64, 64, 156, 156)}
            </Circle>
            <Group transform={[{ translateX: 110 * s }, { translateY: 112 * s }]}>
              <Path path={check} style="stroke" strokeWidth={7 * s} strokeCap="round" strokeJoin="round" color={white} />
            </Group>
          </Group>
        </>
      );
      break;
    case 'tester-daily':
      body = (
        <Group transform={float}>
          {Array.from({ length: 3 }, (_, i) => (
            <RoundedRect
              key={i}
              x={(34 + i * 10) * s}
              y={(40 + i * 18) * s}
              width={(152 - i * 20) * s}
              height={96 * s}
              r={18 * s}
              color={i === 2 ? a : surface}
              opacity={i === 2 ? 1 : 0.9 - i * 0.2}
            />
          ))}
          <Group transform={[{ translateX: 110 * s }, { translateY: 124 * s }]}>
            <Path path={check} style="stroke" strokeWidth={7 * s} strokeCap="round" strokeJoin="round" color={white} />
          </Group>
        </Group>
      );
      break;
    case 'tester-streak':
      body = (
        <>
          {Array.from({ length: 7 }, (_, i) => (
            <Circle key={i} cx={(38 + i * 24) * s} cy={184 * s} r={8 * s} color={i < 5 ? b : line} />
          ))}
          <Group transform={float}>
            <Group transform={[{ translateX: 110 * s }, { translateY: 96 * s }, { scale: 2 }]}>
              <Path path={flame} color={theme.colors.streak} />
            </Group>
          </Group>
        </>
      );
      break;
    case 'notifications':
      body = (
        <Group transform={float}>
          <Group transform={[{ translateX: 110 * s }, { translateY: 106 * s }, { scale: 1.6 }]}>
            <Path path={bell}>{grad(-30, -34, 30, 20)}</Path>
            <Circle cx={0} cy={28 * s} r={8 * s} color={b} />
          </Group>
          <Circle cx={160 * s} cy={60 * s} r={16 * s} color={theme.colors.danger} />
        </Group>
      );
      break;
  }

  return <Canvas style={{ width: size, height: size }}>{body}</Canvas>;
}
