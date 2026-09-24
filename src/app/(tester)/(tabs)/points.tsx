import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AnimatedCounter } from '@/components/motion/AnimatedCounter';
import { ProgressRing } from '@/components/motion/ProgressRing';
import { StaggerIn } from '@/components/motion/StaggerIn';
import { Button, Card, Header, Icon, Screen, SkeletonCardList, SkeletonRows, Text, type IconName } from '@/components/ui';
import { usePointHistoryQuery } from '@/features/ledger/ledgerApi';
import { useMyProfile } from '@/features/profile/profileApi';
import { useTaskDay } from '@/features/tests/useTodayKey';
import { BADGES } from '@/lib/domain/badges';
import { reputationTier, visibleStreak } from '@/lib/domain/rules';
import type { PointTxType } from '@/lib/domain/types';
import { friendlyDate, signed } from '@/lib/format';
import { useAppSelector } from '@/store/hooks';
import { useTheme } from '@/theme/ThemeProvider';
import { radii, space } from '@/theme/tokens';

const TX_LABEL: Record<PointTxType, string> = {
  task: 'Daily task',
  completion_bonus: 'Test completed',
  penalty: 'Flagged proof',
  admin: 'Adjustment',
};

export default function Points() {
  const theme = useTheme();
  const userId = useAppSelector((s) => s.auth.userId) ?? '';
  const { data: profile, isLoading, refetch, isFetching } = useMyProfile();
  const history = usePointHistoryQuery(userId, { skip: !userId });
  const { todayKey } = useTaskDay();

  if (isLoading || !profile) {
    return (
      <Screen tabBarInset>
        <Header title="Points" large />
        <SkeletonCardList count={3} />
      </Screen>
    );
  }

  const tier = reputationTier(profile.reputation);
  const streak = visibleStreak(profile, todayKey);

  return (
    <Screen tabBarInset refreshing={isFetching} onRefresh={() => void (refetch(), history.refetch())}>
      <Header title="Points" large right={<Button label="Leaderboard" icon="podium-outline" size="sm" variant="secondary" fullWidth={false} onPress={() => router.push('/leaderboard')} />} />

      <StaggerIn index={0}>
        <Card tone="accent">
          <View style={styles.balance}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="label" color="accent">
                Points balance
              </Text>
              <AnimatedCounter value={profile.points} />
              <Text variant="caption" color="textMuted">
                {profile.tasksCompleted} tasks · {profile.testsCompleted} tests completed
              </Text>
            </View>
            <View style={[styles.streak, { backgroundColor: theme.colors.surface }]}>
              <Icon name="flame" size={26} color={streak ? theme.colors.streak : 'textFaint'} />
              <Text variant="h2">{streak}</Text>
              <Text variant="caption" color="textMuted">
                best {profile.longestStreak}
              </Text>
            </View>
          </View>
        </Card>
      </StaggerIn>

      <StaggerIn index={1}>
        <Card>
          <View style={styles.rep}>
            <ProgressRing progress={profile.reputation / 100} size={96} stroke={10} accessibilityLabel="Reputation">
              <Text variant="h2">{profile.reputation}</Text>
            </ProgressRing>
            <View style={{ flex: 1, gap: space.xs }}>
              <Text variant="h3">Reputation · {tier.charAt(0).toUpperCase() + tier.slice(1)}</Text>
              <Text variant="caption" color="textMuted">
                Built from completing your daily tasks, developers’ ratings of your feedback, and staying in tests. Higher reputation
                unlocks more tests at once and earlier access to new ones.
              </Text>
            </View>
          </View>
        </Card>
      </StaggerIn>

      <Text variant="h3">Badges</Text>
      <View style={styles.badges}>
        {BADGES.map((b, i) => {
          const earned = b.earned(profile);
          return (
            <StaggerIn key={b.id} index={i + 2} style={styles.badgeCell}>
              <View
                style={[styles.badge, { backgroundColor: earned ? theme.accent.soft : theme.colors.surfaceAlt, opacity: earned ? 1 : 0.7 }]}
                accessible
                accessibilityLabel={`${b.title}: ${b.description}. ${earned ? 'Earned' : `${Math.round(b.progress(profile) * 100)}% there`}`}
              >
                <ProgressRing progress={b.progress(profile)} size={56} stroke={5}>
                  <Icon name={b.icon as IconName} size={22} color={earned ? 'accent' : 'textFaint'} />
                </ProgressRing>
                <Text variant="caption" align="center" numberOfLines={1}>
                  {b.title}
                </Text>
              </View>
            </StaggerIn>
          );
        })}
      </View>

      <Card tone="alt">
        <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
          <Icon name="gift-outline" size={20} color="textMuted" />
          <Text variant="bodySm" color="textMuted" style={{ flex: 1 }}>
            Rewards for points are coming soon. Keep earning — your balance is safe.
          </Text>
        </View>
      </Card>

      <Text variant="h3">History</Text>
      {history.isLoading ? (
        <SkeletonRows count={4} />
      ) : (history.data ?? []).length === 0 ? (
        <Text variant="bodySm" color="textMuted">
          Complete your first task to earn points.
        </Text>
      ) : (
        (history.data ?? []).map((tx) => (
          <View key={tx.$id} style={[styles.tx, { borderBottomColor: theme.colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">{TX_LABEL[tx.type]}</Text>
              <Text variant="caption" color="textMuted" numberOfLines={1}>
                {tx.note ?? ''} · {friendlyDate(tx.$createdAt)}
              </Text>
            </View>
            <Text variant="bodyStrong" color={tx.amount >= 0 ? 'success' : 'danger'}>
              {signed(tx.amount)}
            </Text>
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  balance: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  streak: { alignItems: 'center', padding: space.md, borderRadius: radii.lg, minWidth: 86 },
  rep: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  badges: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -space.xs },
  badgeCell: { width: '33.33%', padding: space.xs },
  badge: { borderRadius: radii.lg, padding: space.md, alignItems: 'center', gap: space.sm },
  tx: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.md, borderBottomWidth: StyleSheet.hairlineWidth },
});
