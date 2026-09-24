import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { StaggerIn } from '@/components/motion/StaggerIn';
import { Button, Card, EmptyState, Header, Screen, SegmentedControl, SkeletonRows, Text } from '@/components/ui';
import { AppIdentity, AppStatusBadge, useAppProgress } from '@/features/apps/components/AppBits';
import { useMyAppsQuery } from '@/features/apps/appsApi';
import type { App } from '@/lib/domain/types';
import { useAppSelector } from '@/store/hooks';
import { space } from '@/theme/tokens';

type Filter = 'all' | 'live' | 'drafts' | 'done';

function AppRowCard({ app }: { app: App }) {
  const p = useAppProgress(app);
  const open = () =>
    app.status === 'draft'
      ? router.push({ pathname: '/add-app', params: { appId: app.$id } })
      : router.push({ pathname: '/app/[id]', params: { id: app.$id } });
  return (
    <Card onPress={open} accessibilityLabel={app.name}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <AppIdentity app={app} size={44} />
        <AppStatusBadge status={app.status} />
      </View>
      {app.status !== 'draft' ? (
        <Text variant="caption" color="textMuted" style={{ marginTop: space.md }}>
          {p.testers}/{p.testersRequired} testers · day {p.day}/{p.days}
        </Text>
      ) : (
        <Text variant="caption" color="textMuted" style={{ marginTop: space.md }}>
          Tap to finish setup and reserve slots.
        </Text>
      )}
    </Card>
  );
}

export default function MyApps() {
  const userId = useAppSelector((s) => s.auth.userId) ?? '';
  const { data, isLoading, isFetching, refetch } = useMyAppsQuery(userId, { skip: !userId });
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = (data ?? []).filter((a) =>
    filter === 'all'
      ? true
      : filter === 'drafts'
        ? a.status === 'draft'
        : filter === 'done'
          ? a.status === 'completed'
          : a.status === 'recruiting' || a.status === 'testing' || a.status === 'paused',
  );

  return (
    <Screen tabBarInset refreshing={isFetching && !isLoading} onRefresh={refetch}>
      <Header title="My apps" large right={<Button label="Add" icon="add" size="sm" fullWidth={false} onPress={() => router.push('/add-app')} />} />
      <SegmentedControl<Filter>
        value={filter}
        onChange={setFilter}
        segments={[
          { value: 'all', label: 'All' },
          { value: 'live', label: 'Live' },
          { value: 'drafts', label: 'Drafts' },
          { value: 'done', label: 'Done' },
        ]}
      />
      {isLoading ? (
        <SkeletonRows count={4} />
      ) : filtered.length === 0 ? (
        <EmptyState
          illustration="empty"
          title={filter === 'all' ? 'No apps yet' : 'Nothing here'}
          message={filter === 'all' ? 'Add your first app to start recruiting testers.' : 'Apps will show up here as their status changes.'}
          actionLabel={filter === 'all' ? 'Add an app' : undefined}
          onAction={filter === 'all' ? () => router.push('/add-app') : undefined}
        />
      ) : (
        filtered.map((app, i) => (
          <StaggerIn key={app.$id} index={i}>
            <AppRowCard app={app} />
          </StaggerIn>
        ))
      )}
    </Screen>
  );
}
