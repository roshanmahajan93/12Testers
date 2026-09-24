import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  SensorType,
  useAnimatedSensor,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

import { Illustration } from '@/components/motion/Illustration';
import { PressableScale } from '@/components/motion/PressableScale';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { useReduceMotion } from '@/hooks/useMotion';
import type { Role } from '@/lib/domain/types';
import { AccentProvider, useTheme } from '@/theme/ThemeProvider';
import { radii, space } from '@/theme/tokens';

const COPY: Record<Role, { title: string; body: string; cta: string }> = {
  developer: {
    title: 'I’m a Developer',
    body: 'Get 12 real testers for 14 days and watch your closed test fill up live.',
    cta: 'List my app',
  },
  tester: {
    title: 'I’m a Tester',
    body: 'Try new apps for a few minutes a day, earn points and build your reputation.',
    cta: 'Start testing',
  },
};

function Card({ role, onPress, expand }: { role: Role; onPress: () => void; expand: SharedValue<number> }) {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const sensor = useAnimatedSensor(SensorType.ROTATION, { interval: 32 });

  // Parallax: the illustration drifts against device tilt.
  const parallax = useAnimatedStyle(() => {
    if (reduceMotion) return {};
    const { pitch, roll } = sensor.sensor.value;
    return {
      transform: [
        { translateX: Math.max(-14, Math.min(14, roll * 22)) },
        { translateY: Math.max(-10, Math.min(10, pitch * 16)) },
      ],
    };
  });

  // "Morph": the chosen card grows toward full screen before we navigate.
  const morph = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(expand.value, [0, 1], [1, 1.08]) }],
    opacity: interpolate(expand.value, [0, 0.8, 1], [1, 1, 0.9]),
  }));

  const copy = COPY[role];
  return (
    <Animated.View style={morph}>
      <PressableScale
        onPress={onPress}
        haptic="heavy"
        accessibilityLabel={copy.title}
        accessibilityHint={copy.body}
        style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
      >
        <LinearGradient
          colors={[theme.accent.soft, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View style={[styles.art, parallax]}>
          <Illustration kind={role} size={132} />
        </Animated.View>
        <View style={styles.text}>
          <Text variant="h2">{copy.title}</Text>
          <Text variant="bodySm" color="textMuted">
            {copy.body}
          </Text>
          <View style={styles.cta}>
            <Text variant="bodyStrong" color="accent">
              {copy.cta}
            </Text>
            <Icon name="arrow-forward" size={18} color="accent" />
          </View>
        </View>
      </PressableScale>
    </Animated.View>
  );
}

export function RoleCard(props: { role: Role; onPress: () => void; expand: SharedValue<number> }) {
  return (
    <AccentProvider accent={props.role}>
      <Card {...props} />
    </AccentProvider>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xxl,
    borderWidth: 1,
    padding: space.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    overflow: 'hidden',
    minHeight: 180,
  },
  art: { width: 132, height: 132 },
  text: { flex: 1, gap: space.xs },
  cta: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.sm },
});
