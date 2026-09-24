import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';

import { StaggerIn } from '@/components/motion/StaggerIn';
import { Avatar, EmptyState, Header, Screen, SegmentedControl, SkeletonRows, Text } from '@/components/ui';
import { useLeaderboardQuery } from '@/features/ledger/ledgerApi';
import { useReduceMotion } from '@/hooks/useMotion';
import type { LeaderboardEntry } from '@/lib/domain/types';
import { useAppSelector } from '@/store/hooks';
import { useTheme } from '@/theme/ThemeProvider';
import { springs } from '@/theme/motion';
import { radii, space } from '@/theme/tokens';

type Period = 'month' | 'all';

const HEIGHTS = [150, 116, 92];
const MEDALS = ['🥇', '🥈', '🥉'];

function Podium({ entry, rank, metric }: { entry: LeaderboardEntry; rank: number; metric: string }) {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const h = useSharedValue(reduceMotion ? HEIGHTS[rank]! : 0);
  useEffect(() => {
    if (!reduceMotion) h.set(withDelay(200 + (2 - rank) * 140, withSpring(HEIGHTS[rank]!, springs.bouncy)));
  }, [h, rank, reduceMotion]);
  const barStyle = useAnimatedStyle(() => ({ height: h.value }));
  return (
    <View style={styles.podiumCol} accessible accessibilityLabel={`Rank ${rank + 1}: ${entry.displayName}, ${metric}`}>
      <Avatar name={entry.displayName} fileId={entry.avatarFileId} size={rank === 0 ? 64 : 52} />
      <Text variant="caption" numberOfLines={1} style={{ maxWidth: 96 }}>
        {entry.displayName}
      </Text>
      <Animated.View style={[styles.bar, barStyle]}>
        <LinearGradient
          colors={rank === 0 ? theme.accent.gradient : [theme.colors.surfaceAlt, theme.colors.surface]}
          style={StyleSheet.absoluteFill}
        />
        <Text variant="h2">{MEDALS[rank]}</Text>
        <Text variant="caption" color={rank === 0 ? 'onAccent' : 'textMuted'}>
          {metric}
        </Text>
      </Animated.View>
    </View>
  );
}

export default function Leaderboard() {
  const [period, setPeriod] = useState<Period>('month');
  const me = useAppSelector((s) => s.auth.userId);
  const { data, isLoading, isFetching, refetch } = useLeaderboardQuery(period);
  const theme = useTheme();
  const entries = data?.entries ?? [];
  const metric = (e: LeaderboardEntry) => (period === 'month' ? `${e.tasksThisMonth} tasks` : `${e.points} pts`);
  const [first, second, third] = entries;

  return (
    <Screen refreshing={isFetching && !isLoading} onRefresh={refetch}>
      <Header title="Leaderboard" back subtitle="Top testers by completed tasks" />
      <SegmentedControl<Period>
        value={period}
        onChange={setPeriod}
        segments={[
          { value: 'month', label: 'This month' },
          { value: 'all', label: 'All time' },
        ]}
      />
      {isLoading ? (
        <SkeletonRows count={6} />
      ) : entries.length === 0 ? (
        <EmptyState icon="podium-outline" title="No rankings yet" message="Complete tasks this month to appear here." />
      ) : (
        <>
          <View style={styles.podium} key={period}>
            {second ? <Podium entry={second} rank={1} metric={metric(second)} /> : <View style={styles.podiumCol} />}
            {first ? <Podium entry={first} rank={0} metric={metric(first)} /> : null}
            {third ? <Podium entry={third} rank={2} metric={metric(third)} /> : <View style={styles.podiumCol} />}
          </View>
          {entries.slice(3).map((e, i) => (
            <StaggerIn key={e.testerId} index={i}>
              <View style={[styles.row, { backgroundColor: e.testerId === me ? theme.accent.soft : theme.colors.surface, borderColor: theme.colors.border }]}>
                <Text variant="bodyStrong" color="textMuted" style={{ width: 28 }}>
                  {i + 4}
                </Text>
                <Avatar name={e.displayName} fileId={e.avatarFileId} size={36} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {e.displayName}
                    {e.testerId === me ? ' (you)' : ''}
                  </Text>
                  <Text variant="caption" color="textMuted">
                    rep {e.reputation} · {e.testsCompleted} tests
                  </Text>
                </View>
                <Text variant="bodyStrong">{metric(e)}</Text>
              </View>
            </StaggerIn>
          ))}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  podium: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: space.sm, marginTop: space.lg },
  podiumCol: { flex: 1, alignItems: 'center', gap: space.xs },
  bar: { width: '100%', borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, overflow: 'hidden', alignItems: 'center', paddingTop: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radii.lg, borderWidth: 1 },
});
