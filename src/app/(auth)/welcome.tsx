import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { GradientBackdrop } from '@/components/motion/GradientBackdrop';
import { StaggerIn } from '@/components/motion/StaggerIn';
import { Text } from '@/components/ui/Text';
import { intendedRoleChosen } from '@/features/auth/authSlice';
import { RoleCard } from '@/features/auth/components/RoleCard';
import { useReduceMotion } from '@/hooks/useMotion';
import { APP_NAME, PUBLISHER } from '@/lib/constants';
import type { Role } from '@/lib/domain/types';
import { env } from '@/lib/env';
import { useAppDispatch } from '@/store/hooks';
import { accents } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import { durations, easings } from '@/theme/motion';
import { space } from '@/theme/tokens';

export default function Welcome() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const reduceMotion = useReduceMotion();
  const [chosen, setChosen] = useState<Role | null>(null);
  const devExpand = useSharedValue(0);
  const testerExpand = useSharedValue(0);
  const veil = useSharedValue(0);

  const go = () => router.push('/sign-in');

  const choose = (role: Role) => {
    if (chosen) return;
    setChosen(role);
    dispatch(intendedRoleChosen(role));
    const expand = role === 'developer' ? devExpand : testerExpand;
    if (reduceMotion) {
      go();
      setChosen(null);
      return;
    }
    expand.set(withTiming(1, { duration: durations.base, easing: easings.emphasized }));
    veil.set(
      withTiming(1, { duration: durations.slow, easing: easings.standard }, (done) => {
        if (done) scheduleOnRN(go);
      }),
    );
    // Reset once the next screen covers us, so "back" shows the cards again.
    setTimeout(() => {
      devExpand.set(0);
      testerExpand.set(0);
      veil.set(0);
      setChosen(null);
    }, durations.slow + 400);
  };

  const veilStyle = useAnimatedStyle(() => ({ opacity: veil.value * 0.92 }));
  const veilColors = chosen ? accents[theme.scheme][chosen].gradient : theme.accent.gradient;

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.bg, paddingTop: insets.top + space.xl, paddingBottom: insets.bottom + space.lg }]}>
      <GradientBackdrop intensity={0.8} />
      <StaggerIn index={0} style={styles.hero}>
        <Text variant="label" color="textMuted">
          {APP_NAME}
        </Text>
        <Text variant="display">Get through your closed test</Text>
        <Text variant="body" color="textMuted">
          12 real testers × 14 days, tracked in one place. Pick how you want to use the app.
        </Text>
      </StaggerIn>

      <View style={styles.cards}>
        <StaggerIn index={2}>
          <RoleCard role="developer" onPress={() => choose('developer')} expand={devExpand} />
        </StaggerIn>
        <StaggerIn index={3}>
          <RoleCard role="tester" onPress={() => choose('tester')} expand={testerExpand} />
        </StaggerIn>
      </View>

      <StaggerIn index={5}>
        <Text variant="caption" color="textFaint" align="center">
          By continuing you agree to our Terms and Privacy Policy.{'\n'}Google decides production access — we help you meet
          the testing requirement. · {PUBLISHER}
        </Text>
        {!env.appwriteProjectId && __DEV__ ? (
          <Text variant="caption" color="warning" align="center" style={{ marginTop: space.sm }}>
            Dev: EXPO_PUBLIC_APPWRITE_* is not set — sign-in will fail. See README.
          </Text>
        ) : null}
      </StaggerIn>

      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, veilStyle]}>
        <LinearGradient colors={veilColors} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: space.xl, justifyContent: 'space-between' },
  hero: { gap: space.sm, marginTop: space.lg },
  cards: { gap: space.lg },
});
