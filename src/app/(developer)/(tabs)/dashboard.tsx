import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AnimatedCounter } from '@/components/motion/AnimatedCounter';
import { StaggerIn } from '@/components/motion/StaggerIn';
import { Badge, Button, EmptyState, Header, IconButton, ListRow, Screen, SkeletonCardList, Text } from '@/components/ui';
import { AppProgressCard } from '@/features/apps/components/AppBits';
import { useMyAppsQuery } from '@/features/apps/appsApi';
import { parseNotificationData, useNotificationsQuery, useUnreadCount } from '@/features/notifications/notificationsApi';
import { useMyProfile } from '@/features/profile/profileApi';
import { useAppSelector } from '@/store/hooks';
import { useTheme } from '@/theme/ThemeProvider';
import { radii, shadow, space } from '@/theme/tokens';

const ALERT_KINDS = new Set(['tester_dropped', 'feedback', 'test_started', 'app_completed']);

export default function Dashboard() {
  const theme = useTheme();
  const userId = useAppSelector((s) => s.auth.userId) ?? '';
  const profile = useMyProfile();
  const apps = useMyAppsQuery(userId, { skip: !userId });
  const notifications = useNotificationsQuery(userId, { skip: !userId });
  const unread = useUnreadCount();

  const live = (apps.data ?? []).filter((a) => a.status !== 'draft');
  const drafts = (apps.data ?? []).filter((a) => a.status === 'draft');
  const alerts = (notifications.data ?? [])
    .filter((n) => !n.read && ALERT_KINDS.has(parseNotificationData(n.data).kind ?? ''))
    .slice(0, 3);

  const refresh = () => {
    void apps.refetch();
    void profile.refetch();
    void notifications.refetch();
  };

  return (
    <Screen tabBarInset refreshing={apps.isFetching && !apps.isLoading} onRefresh={refresh}>
      <Header
        title={`Hi, ${profile.data?.displayName?.split(' ')[0] ?? 'there'}`}
        subtitle="Your closed tests at a glance"
        large
        right={<IconButton icon="notifications-outline" label="Notifications" onPress={() => router.push('/notifications')} badge={unread} />}
      />

      <StaggerIn index={0}>
        <View style={[styles.hero, shadow(2, theme.accent.gradient[1])]}>
          <LinearGradient colors={theme.accent.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <View style={styles.heroTop}>
            <Text variant="label" style={{ color: theme.accent.onPrimary, opacity: 0.8 }}>
              Credit balance
            </Text>
            {profile.data?.isPro ? <Badge label="PRO" tone="neutral" icon="sparkles" /> : null}
          </View>
          <AnimatedCounter value={profile.data?.credits ?? 0} color={theme.accent.onPrimary} />
          <View style={styles.heroActions}>
            <Button label="Buy credits" size="sm" variant="secondary" icon="add" fullWidth={false} onPress={() => router.push('/paywall')} />
            <Button label="History" size="sm" variant="ghost" fullWidth={false} onPress={() => router.push('/credits')} />
          </View>
        </View>
      </StaggerIn>

      {alerts.length ? (
        <StaggerIn index={1} style={{ gap: space.sm }}>
          <Text variant="label" color="textFaint">
            Needs your attention
          </Text>
          {alerts.map((n) => {
            const data = parseNotificationData(n.data);
            return (
              <ListRow
                key={n.$id}
                icon={data.kind === 'tester_dropped' ? 'person-remove-outline' : data.kind === 'feedback' ? 'chatbubble-ellipses-outline' : 'sparkles-outline'}
                title={n.title}
                subtitle={n.body}
                onPress={() => (data.url ? router.push(data.url as never) : router.push('/notifications'))}
              />
            );
          })}
        </StaggerIn>
      ) : null}

      <View style={styles.sectionHead}>
        <Text variant="h3">Your tests</Text>
        <Button label="Add app" icon="add" size="sm" fullWidth={false} onPress={() => router.push('/add-app')} />
      </View>

      {apps.isLoading ? (
        <SkeletonCardList count={2} height={170} />
      ) : live.length === 0 ? (
        <EmptyState
          illustration="empty"
          title={drafts.length ? 'Finish your draft to start recruiting' : 'List your first app'}
          message="Add your package, write a short 14-day test plan and reserve tester slots with credits."
          actionLabel={drafts.length ? 'Continue draft' : 'Add an app'}
          onAction={() => router.push(drafts[0] ? { pathname: '/add-app', params: { appId: drafts[0].$id } } : '/add-app')}
        />
      ) : (
        live.map((app, i) => (
          <StaggerIn key={app.$id} index={i + 2}>
            <AppProgressCard app={app} index={i} onPress={() => router.push({ pathname: '/app/[id]', params: { id: app.$id } })} />
          </StaggerIn>
        ))
      )}

      <ListRow icon="book-outline" title="Closed testing guide" subtitle="Set up your track, avoid resets, prepare for production" onPress={() => router.push('/guide')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radii.xxl, padding: space.xl, gap: space.sm, overflow: 'hidden' },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroActions: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
