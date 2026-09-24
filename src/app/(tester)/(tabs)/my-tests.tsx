import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { StaggerIn } from '@/components/motion/StaggerIn';
import { Avatar, Badge, Card, EmptyState, ErrorState, Header, Screen, SegmentedControl, SkeletonCardList, Text } from '@/components/ui';
import { ENROLLMENT_STATUS, StreakStrip } from '@/features/apps/components/AppBits';
import { useDomainConfig } from '@/features/config/configApi';
import { useMyEnrollmentsQuery } from '@/features/tests/testsApi';
import type { Enrollment } from '@/lib/domain/types';
import { useAppSelector } from '@/store/hooks';
import { space } from '@/theme/tokens';

type Tab = 'active' | 'history';

function EnrollmentCard({ e, index, days }: { e: Enrollment; index: number; days: number }) {
  const status = ENROLLMENT_STATUS[e.status];
  return (
    <StaggerIn index={index}>
      <Card onPress={() => router.push({ pathname: '/test/[appId]', params: { appId: e.appId } })} style={{ marginBottom: space.md }} accessibilityLabel={`${e.appName}, ${status.label}`}>
        <View style={{ gap: space.md }}>
          <View style={styles.head}>
            <Avatar name={e.appName} fileId={e.appIconFileId} bucket="appIcons" size={44} rounded="squircle" />
            <View style={{ flex: 1 }}>
              <Text variant="h3" numberOfLines={1}>
                {e.appName}
              </Text>
              <Text variant="caption" color="textMuted">
                {e.tasksCompleted}/{days} days · streak {e.streak}
              </Text>
            </View>
            <Badge label={status.label} tone={status.tone} />
          </View>
          <StreakStrip history={e.dayHistory} days={days} size={12} />
          {e.status === 'warned' ? (
            <Text variant="caption" color="warning">
              Complete today’s task to keep your slot.
            </Text>
          ) : null}
        </View>
      </Card>
    </StaggerIn>
  );
}

export default function MyTests() {
  const cfg = useDomainConfig();
  const userId = useAppSelector((s) => s.auth.userId) ?? '';
  const { data, isLoading, isFetching, isError, error, refetch } = useMyEnrollmentsQuery(userId, { skip: !userId });
  const [tab, setTab] = useState<Tab>('active');

  const list = (data ?? []).filter((e) =>
    tab === 'active' ? e.status === 'active' || e.status === 'warned' || e.status === 'joined' : e.status === 'completed' || e.status === 'dropped',
  );

  return (
    <Screen scroll={false} tabBarInset>
      <Header title="My tests" large />
      <SegmentedControl<Tab>
        value={tab}
        onChange={setTab}
        segments={[
          { value: 'active', label: 'Active' },
          { value: 'history', label: 'Completed' },
        ]}
      />
      {isLoading ? (
        <SkeletonCardList count={3} height={130} />
      ) : isError && !data ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <FlashList
          data={list}
          keyExtractor={(e) => e.$id}
          onRefresh={refetch}
          refreshing={isFetching && !isLoading}
          contentContainerStyle={{ paddingBottom: 120 }}
          ListEmptyComponent={
            tab === 'active' ? (
              <EmptyState illustration="empty" title="No active tests" message="Claim one from Available to get started." actionLabel="Find tests" onAction={() => router.push('/available')} />
            ) : (
              <EmptyState icon="ribbon-outline" title="No finished tests yet" message="Completed tests and badges show up here." />
            )
          }
          renderItem={({ item, index }) => <EnrollmentCard e={item} index={index} days={cfg.TEST_DAYS} />}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({ head: { flexDirection: 'row', alignItems: 'center', gap: space.md } });
