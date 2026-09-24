import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CardStack } from '@/components/motion/CardStack';
import { Confetti } from '@/components/motion/Confetti';
import { LottieIllustration } from '@/components/motion/LottieIllustration';
import { Badge, Card, EmptyState, Icon, IconButton, ProgressBar, SkeletonCardList, Text } from '@/components/ui';
import { useDomainConfig } from '@/features/config/configApi';
import { useUnreadCount } from '@/features/notifications/notificationsApi';
import { parsePrefs, useMyProfile } from '@/features/profile/profileApi';
import { TaskCard } from '@/features/tasks/TaskCard';
import { useTaskCompletion } from '@/features/tasks/useTaskCompletion';
import { useMyEnrollmentsQuery, useTasksForDayQuery } from '@/features/tests/testsApi';
import { useTaskDay } from '@/features/tests/useTodayKey';
import { visibleStreak } from '@/lib/domain/rules';
import type { DailyTask } from '@/lib/domain/types';
import { countdown } from '@/lib/format';
import { syncPendingTaskReminder } from '@/services/notifications/reminders';
import { logger } from '@/services/logger';
import { useAppSelector } from '@/store/hooks';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export default function Today() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const cfg = useDomainConfig();
  const testerId = useAppSelector((s) => s.auth.userId) ?? '';
  const reminderTime = useAppSelector((s) => s.settings.reminderTime);
  const { data: profile } = useMyProfile();
  const unread = useUnreadCount();
  const { todayKey, msToReset } = useTaskDay();
  const tasks = useTasksForDayQuery({ testerId, dueDate: todayKey }, { skip: !testerId });
  const enrollments = useMyEnrollmentsQuery(testerId, { skip: !testerId });
  const completion = useTaskCompletion();

  const [order, setOrder] = useState<string[]>([]);
  const [removingKey, setRemovingKey] = useState<string | null>(null);
  const [justFinished, setJustFinished] = useState(false);

  const all = tasks.data ?? [];
  const pending = all.filter((t) => t.status === 'pending' || t.$id === removingKey);
  const pendingIds = pending.map((t) => t.$id);
  const orderedIds = [...order.filter((id) => pendingIds.includes(id)), ...pendingIds.filter((id) => !order.includes(id))];
  const ordered = orderedIds.map((id) => pending.find((t) => t.$id === id)!).filter(Boolean);
  const doneCount = all.filter((t) => t.status === 'completed' || t.status === 'flagged').length;
  const pendingCount = all.filter((t) => t.status === 'pending').length;

  // Keep one local reminder scheduled: today if tasks are pending, otherwise tomorrow.
  const prefs = parsePrefs(profile?.notificationPrefs);
  useEffect(() => {
    if (!tasks.isSuccess) return;
    syncPendingTaskReminder({ pendingToday: pendingCount, reminderTime: prefs.reminderTime || reminderTime, enabled: prefs.reminders }).catch((e) =>
      logger.warn('reminder sync failed', e),
    );
  }, [tasks.isSuccess, pendingCount, prefs.reminderTime, prefs.reminders, reminderTime]);

  const rotate = (dir: 'left' | 'right') => {
    const ids = orderedIds;
    if (ids.length < 2) return;
    setOrder(dir === 'left' ? [...ids.slice(1), ids[0]!] : [ids[ids.length - 1]!, ...ids.slice(0, -1)]);
  };

  const completeTop = async (task: DailyTask) => {
    const res = await completion.complete(task);
    if (!res) return;
    setRemovingKey(task.$id);
    if (pendingCount <= 1) setJustFinished(true);
  };

  const streak = profile ? visibleStreak(profile, todayKey) : 0;
  const live = (enrollments.data ?? []).filter((e) => e.status === 'active' || e.status === 'warned');
  const waiting = (enrollments.data ?? []).filter((e) => e.status === 'joined');

  let body: React.ReactNode;
  if (tasks.isLoading || enrollments.isLoading) {
    body = <SkeletonCardList count={1} height={420} />;
  } else if (ordered.length > 0) {
    body = (
      <CardStack
        items={ordered}
        keyOf={(t) => t.$id}
        onSwipe={rotate}
        removingKey={removingKey}
        onRemoved={() => setRemovingKey(null)}
        renderCard={(task, isTop) => (
          <TaskCard
            task={task}
            days={cfg.TEST_DAYS}
            draft={completion.draftFor(task.$id)}
            onChange={(p) => completion.patch(task.$id, p)}
            onPickScreenshot={(src) => void completion.pickScreenshot(task, src)}
            onComplete={() => void completeTop(task)}
            completing={completion.completingId === task.$id}
            position={`${orderedIds.indexOf(task.$id) + 1} of ${ordered.length}`}
            onPrev={isTop && ordered.length > 1 ? () => rotate('right') : undefined}
            onNext={isTop && ordered.length > 1 ? () => rotate('left') : undefined}
          />
        )}
      />
    );
  } else if (all.length > 0) {
    body = (
      <Animated.View entering={ZoomIn.springify().damping(14)} style={styles.done}>
        <LottieIllustration name={justFinished ? 'celebrate' : 'success'} size={200} loop={false} />
        <Text variant="h1" align="center">
          All done for today!
        </Text>
        <Text variant="body" color="textMuted" align="center">
          {doneCount} app{doneCount === 1 ? '' : 's'} tested. New tasks in {countdown(msToReset)}.
        </Text>
        <Badge label={`${streak}-day streak`} tone="warning" icon="flame" />
      </Animated.View>
    );
  } else if (live.length > 0) {
    body = (
      <EmptyState
        icon="hourglass-outline"
        title="Preparing today’s tasks"
        message="Your tasks appear shortly after the day resets. Pull to refresh in a moment."
        actionLabel="Refresh"
        onAction={() => void tasks.refetch()}
      />
    );
  } else if (waiting.length > 0) {
    body = (
      <View style={{ gap: space.md }}>
        <EmptyState icon="people-outline" title="Waiting for testers to join" message={`Tests start when ${cfg.TESTERS_REQUIRED} testers have joined. We’ll notify you on day 1.`} />
        {waiting.map((e) => (
          <Card key={e.$id}>
            <Text variant="bodyStrong">{e.appName}</Text>
            <Text variant="caption" color="textMuted">
              Joined — waiting to start
            </Text>
          </Card>
        ))}
      </View>
    );
  } else {
    body = (
      <EmptyState
        illustration="empty"
        title="No active tests"
        message="Claim a test to get your first daily task. Each one takes about 3 minutes a day."
        actionLabel="Find tests"
        onAction={() => router.push('/available')}
      />
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.bg, paddingTop: insets.top + space.sm }]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text variant="caption" color="textMuted">
            {greeting()}, {profile?.displayName?.split(' ')[0] ?? 'tester'}
          </Text>
          <Text variant="h1">Today</Text>
        </View>
        <View style={[styles.streak, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} accessibilityLabel={`${streak} day streak`}>
          <Icon name="flame" size={18} color={streak > 0 ? theme.colors.streak : 'textFaint'} />
          <Text variant="bodyStrong">{streak}</Text>
        </View>
        <IconButton icon="notifications-outline" label="Notifications" onPress={() => router.push('/notifications')} badge={unread} />
      </View>

      {all.length > 0 ? (
        <Animated.View entering={FadeIn} style={styles.progress}>
          <View style={styles.progressText}>
            <Text variant="bodyStrong">
              {doneCount} of {all.length} done
            </Text>
            <Text variant="caption" color="textMuted">
              Resets in {countdown(msToReset)}
            </Text>
          </View>
          <ProgressBar value={doneCount / all.length} label="Today's progress" />
        </Animated.View>
      ) : null}

      <View style={[styles.body, { paddingBottom: insets.bottom + 96 }]}>{body}</View>
      {justFinished && ordered.length === 0 ? <Confetti onDone={() => setJustFinished(false)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.xl },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: space.md, height: 44, borderRadius: 14, borderWidth: 1 },
  progress: { paddingHorizontal: space.xl, gap: space.sm, marginTop: space.md },
  progressText: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  body: { flex: 1, paddingHorizontal: space.lg, paddingTop: space.lg },
  done: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, paddingHorizontal: space.xl },
});
