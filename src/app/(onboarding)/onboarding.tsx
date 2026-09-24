import { useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GradientBackdrop } from '@/components/motion/GradientBackdrop';
import { Illustration, type IllustrationKind } from '@/components/motion/Illustration';
import { Button, Text } from '@/components/ui';
import { notificationPrimerSeen, onboardingCompleted } from '@/features/settings/settingsSlice';
import { useToast } from '@/features/ui/useToast';
import type { Role } from '@/lib/domain/types';
import { requestPermission } from '@/services/notifications/permissions';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

interface Slide {
  art: IllustrationKind;
  title: string;
  body: string;
}

const SLIDES: Record<Role, Slide[]> = {
  developer: [
    { art: 'developer', title: 'Testers, not favours', body: 'List your app once. Real testers claim your slots — no group chats, no chasing people.' },
    { art: 'dev-plan', title: 'You set the daily task', body: 'Write a short 14-day test plan. Testers get one clear task per day and send structured feedback.' },
    { art: 'dev-progress', title: 'Watch 12 × 14 fill up', body: 'Live progress rings, drop-out replacement and a production checklist when you’re done.' },
  ],
  tester: [
    { art: 'tester', title: 'Test new apps daily', body: 'Claim tests that fit your phone. Each day you get one small task per app — about 3 minutes.' },
    { art: 'tester-daily', title: 'Prove it, earn points', body: 'Open the app, do the task, add a screenshot. Every completed day earns points.' },
    { art: 'tester-streak', title: 'Keep the streak', body: 'Finish all 14 days to earn a bonus and raise your reputation — that unlocks more tests.' },
  ],
};

const PRIMER: Record<Role, string> = {
  developer: 'Get told when testers join, drop out or send feedback — and when your 14 days are done.',
  tester: 'Get a nudge when today’s tasks are ready and before you’d lose a slot. You pick the reminder time.',
};

function Dot({ index, x, width }: { index: number; x: SharedValue<number>; width: number }) {
  const { accent, colors } = useTheme();
  const style = useAnimatedStyle(() => {
    const p = interpolate(x.value / width, [index - 1, index, index + 1], [0, 1, 0], 'clamp');
    return { width: 8 + p * 18, opacity: 0.4 + p * 0.6 };
  });
  return <Animated.View style={[styles.dot, { backgroundColor: index >= 0 ? accent.primary : colors.border }, style]} />;
}

function SlideView({ slide, index, x, width }: { slide: Slide; index: number; x: SharedValue<number>; width: number }) {
  const artStyle = useAnimatedStyle(() => {
    const p = x.value / width - index;
    return { transform: [{ translateX: p * -width * 0.35 }, { scale: 1 - Math.abs(p) * 0.15 }], opacity: 1 - Math.abs(p) * 0.8 };
  });
  return (
    <View style={[styles.slide, { width }]}>
      <Animated.View style={artStyle}>
        <Illustration kind={slide.art} size={Math.min(260, width * 0.66)} />
      </Animated.View>
      <View style={styles.copy}>
        <Text variant="h1" align="center">
          {slide.title}
        </Text>
        <Text variant="body" color="textMuted" align="center">
          {slide.body}
        </Text>
      </View>
    </View>
  );
}

export default function Onboarding() {
  const dispatch = useAppDispatch();
  const toast = useToast();
  const role = useAppSelector((s) => s.auth.role) ?? 'tester';
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const x = useSharedValue(0);

  const slides: Slide[] = [...SLIDES[role], { art: 'notifications', title: 'Stay in the loop', body: PRIMER[role] }];
  const last = page === slides.length - 1;

  const onScroll = useAnimatedScrollHandler((e) => {
    x.value = e.contentOffset.x;
  });

  const finish = () => {
    dispatch(notificationPrimerSeen());
    dispatch(onboardingCompleted(role));
  };

  const enable = async () => {
    const state = await requestPermission();
    if (state !== 'granted') toast.info('You can turn notifications on later in Settings.');
    finish();
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg, paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.lg }]}>
      <GradientBackdrop intensity={0.7} />
      <View style={styles.skipRow}>
        {!last ? <Button label="Skip" variant="ghost" size="sm" fullWidth={false} onPress={() => scrollRef.current?.scrollToEnd()} /> : null}
      </View>
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
      >
        {slides.map((s, i) => (
          <SlideView key={s.title} slide={s} index={i} x={x} width={width} />
        ))}
      </Animated.ScrollView>
      <View style={styles.dots} accessibilityLabel={`Page ${page + 1} of ${slides.length}`}>
        {slides.map((s, i) => (
          <Dot key={s.title} index={i} x={x} width={width} />
        ))}
      </View>
      <View style={styles.actions}>
        {last ? (
          <>
            <Button
              label={Platform.OS === 'android' ? 'Allow notifications' : 'Enable notifications'}
              icon="notifications-outline"
              onPress={enable}
            />
            <Button label="Maybe later" variant="ghost" onPress={finish} />
          </>
        ) : (
          <Button
            label="Next"
            iconRight="arrow-forward"
            onPress={() => {
              scrollRef.current?.scrollTo({ x: (page + 1) * width, animated: true });
              setPage(page + 1);
            }}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  skipRow: { height: 40, alignItems: 'flex-end', paddingHorizontal: space.lg },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xxl, gap: space.xxl },
  copy: { gap: space.md },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginVertical: space.lg },
  dot: { height: 8, borderRadius: 4 },
  actions: { paddingHorizontal: space.xl, gap: space.sm, minHeight: 110 },
});
