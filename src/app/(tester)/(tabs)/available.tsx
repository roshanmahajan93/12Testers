import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { StaggerIn } from '@/components/motion/StaggerIn';
import { Avatar, Badge, Card, Chip, EmptyState, ErrorState, Header, ProgressBar, Screen, SkeletonCardList, Text } from '@/components/ui';
import { useOpenTestsQuery } from '@/features/tests/testsApi';
import { useEligibility } from '@/features/tests/useEligibility';
import { APP_CATEGORIES, type App, type AppCategory } from '@/lib/domain/types';
import { space } from '@/theme/tokens';

const label = (c: string) => c.charAt(0).toUpperCase() + c.slice(1);

function OpenTestCard({ app, index, blocked, enrolled }: { app: App; index: number; blocked: string | null; enrolled: boolean }) {
  const filled = app.testersNeeded - app.slotsOpen;
  return (
    <StaggerIn index={index}>
      <Card onPress={() => router.push({ pathname: '/test/[appId]', params: { appId: app.$id } })} style={{ marginBottom: space.md }} accessibilityLabel={`${app.name}, ${app.slotsOpen} slots left`}>
        <View style={{ gap: space.md }}>
          <View style={styles.head}>
            <Avatar name={app.name} fileId={app.iconFileId} bucket="appIcons" size={48} rounded="squircle" />
            <View style={{ flex: 1 }}>
              <Text variant="h3" numberOfLines={1}>
                {app.name}
              </Text>
              <Text variant="caption" color="textMuted" numberOfLines={1}>
                by {app.ownerName || 'a developer'} · {label(app.category)}
              </Text>
            </View>
            {app.isBoosted ? <Badge label="Boosted" tone="accent" icon="flash" /> : null}
          </View>
          <Text variant="bodySm" color="textMuted" numberOfLines={2}>
            {app.shortDescription}
          </Text>
          <View style={{ gap: space.xs }}>
            <View style={styles.between}>
              <Text variant="caption" color="textMuted">
                {app.slotsOpen} slot{app.slotsOpen === 1 ? '' : 's'} left
              </Text>
              <Text variant="caption" color="textFaint">
                {app.status === 'testing' ? 'In progress — replacement slot' : 'Recruiting'}
              </Text>
            </View>
            <ProgressBar value={filled / app.testersNeeded} height={6} />
          </View>
          <View style={styles.badges}>
            {app.minAndroidVersion ? <Badge label={`Android ${app.minAndroidVersion}+`} icon="logo-android" /> : null}
            {app.minReputation ? <Badge label={`Rep ${app.minReputation}+`} icon="shield-checkmark-outline" /> : null}
            {enrolled ? <Badge label="Joined" tone="success" icon="checkmark" /> : blocked ? <Badge label="Not eligible" tone="warning" /> : null}
          </View>
        </View>
      </Card>
    </StaggerIn>
  );
}

export default function Available() {
  const { data, isLoading, isFetching, isError, error, refetch } = useOpenTestsQuery();
  const { check, activeTests, maxActive, enrolledIds } = useEligibility();
  const [category, setCategory] = useState<AppCategory | 'all'>('all');
  const [eligibleOnly, setEligibleOnly] = useState(true);

  const list = (data ?? [])
    .filter((a) => category === 'all' || a.category === category)
    .filter((a) => !eligibleOnly || enrolledIds.has(a.$id) || !check(a).blocker || check(a).blocker === 'active_cap');

  return (
    <Screen scroll={false} tabBarInset>
      <Header title="Available tests" large subtitle={`${activeTests} of ${maxActive} active test slots used`} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }} style={{ flexGrow: 0 }}>
        <Chip label="Matches my device" icon="phone-portrait-outline" selected={eligibleOnly} onPress={() => setEligibleOnly(!eligibleOnly)} />
        <Chip label="All" selected={category === 'all'} onPress={() => setCategory('all')} />
        {APP_CATEGORIES.map((c) => (
          <Chip key={c} label={label(c)} selected={category === c} onPress={() => setCategory(c)} />
        ))}
      </ScrollView>
      {isLoading ? (
        <SkeletonCardList count={3} height={180} />
      ) : isError && !data ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <FlashList
          data={list}
          keyExtractor={(a) => a.$id}
          onRefresh={refetch}
          refreshing={isFetching && !isLoading}
          contentContainerStyle={{ paddingBottom: 120 }}
          ListEmptyComponent={
            <EmptyState illustration="empty" title="No open tests right now" message="New apps are listed every day. We’ll notify you when one matches your device." />
          }
          renderItem={({ item, index }) => (
            <OpenTestCard app={item} index={index} blocked={check(item).message} enrolled={enrolledIds.has(item.$id)} />
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  between: { flexDirection: 'row', justifyContent: 'space-between' },
  badges: { flexDirection: 'row', gap: space.xs, flexWrap: 'wrap' },
});
