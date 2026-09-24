import { FlashList } from '@shopify/flash-list';
import { router, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { PressableScale } from '@/components/motion/PressableScale';
import { Button, EmptyState, Header, Icon, Screen, SkeletonRows, Text, type IconName } from '@/components/ui';
import { parseNotificationData, useMarkReadMutation, useNotificationsQuery } from '@/features/notifications/notificationsApi';
import type { AppNotification } from '@/lib/domain/types';
import { relativeTime } from '@/lib/format';
import { safeInAppPath } from '@/services/notifications/useNotificationRouting';
import { useAppSelector } from '@/store/hooks';
import { AccentProvider, useTheme } from '@/theme/ThemeProvider';
import { radii, space } from '@/theme/tokens';

const KIND_ICON: Record<string, IconName> = {
  tasks_ready: 'today-outline',
  reminder: 'alarm-outline',
  dropout_warning: 'warning-outline',
  dropped: 'person-remove-outline',
  test_completed: 'ribbon-outline',
  new_test: 'compass-outline',
  tester_joined: 'person-add-outline',
  tester_dropped: 'person-remove-outline',
  test_started: 'rocket-outline',
  feedback: 'chatbubble-ellipses-outline',
  daily_summary: 'stats-chart-outline',
  app_completed: 'trophy-outline',
  credits_received: 'wallet-outline',
  task_flagged: 'flag-outline',
  test_cancelled: 'close-circle-outline',
};

function Row({ n, onOpen }: { n: AppNotification; onOpen: (n: AppNotification) => void }) {
  const { colors, accent } = useTheme();
  const data = parseNotificationData(n.data);
  return (
    <Animated.View layout={LinearTransition} entering={FadeIn}>
      <PressableScale
        onPress={() => onOpen(n)}
        haptic="select"
        accessibilityLabel={`${n.read ? '' : 'Unread. '}${n.title}. ${n.body}`}
        style={[styles.row, { backgroundColor: n.read ? 'transparent' : accent.soft, borderColor: colors.border }]}
      >
        <View style={[styles.icon, { backgroundColor: colors.surfaceAlt }]}>
          <Icon name={KIND_ICON[data.kind ?? ''] ?? 'notifications-outline'} size={18} color="accent" />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="bodyStrong" numberOfLines={2}>
            {n.title}
          </Text>
          <Text variant="caption" color="textMuted" numberOfLines={3}>
            {n.body}
          </Text>
          <Text variant="caption" color="textFaint">
            {relativeTime(n.$createdAt)}
          </Text>
        </View>
        {!n.read ? <View style={[styles.dot, { backgroundColor: accent.primary }]} /> : null}
      </PressableScale>
    </Animated.View>
  );
}

function NotificationsScreen() {
  const userId = useAppSelector((s) => s.auth.userId) ?? '';
  const { data, isLoading, isFetching, refetch } = useNotificationsQuery(userId, { skip: !userId });
  const [markRead] = useMarkReadMutation();
  const unread = (data ?? []).filter((n) => !n.read).map((n) => n.$id);

  const open = (n: AppNotification) => {
    if (!n.read) void markRead({ userId, ids: [n.$id] });
    const path = safeInAppPath(parseNotificationData(n.data).url);
    if (path) router.push(path as Href);
  };

  return (
    <Screen scroll={false}>
      <Header
        title="Notifications"
        back
        right={unread.length ? <Button label="Mark all read" size="sm" variant="ghost" fullWidth={false} onPress={() => void markRead({ userId, ids: unread })} /> : null}
      />
      {isLoading ? (
        <SkeletonRows count={6} />
      ) : (
        <FlashList
          data={data ?? []}
          keyExtractor={(n) => n.$id}
          onRefresh={refetch}
          refreshing={isFetching && !isLoading}
          ItemSeparatorComponent={() => <View style={{ height: space.sm }} />}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListEmptyComponent={<EmptyState illustration="empty" title="You’re all caught up" message="Updates about your tests will appear here." />}
          renderItem={({ item }) => <Row n={item} onOpen={open} />}
        />
      )}
    </Screen>
  );
}

export default function Notifications() {
  const role = useAppSelector((s) => s.auth.role);
  return (
    <AccentProvider accent={role ?? 'neutral'}>
      <NotificationsScreen />
    </AccentProvider>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.md, padding: space.md, borderRadius: radii.lg, borderWidth: 1, alignItems: 'flex-start' },
  icon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 9, height: 9, borderRadius: 5, marginTop: 6 },
});
