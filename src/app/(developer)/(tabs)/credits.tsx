import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AnimatedCounter } from '@/components/motion/AnimatedCounter';
import { Badge, Button, Card, EmptyState, Header, Icon, Screen, SkeletonRows, Text } from '@/components/ui';
import { useDomainConfig } from '@/features/config/configApi';
import { useCreditHistoryQuery } from '@/features/ledger/ledgerApi';
import { useMyProfile } from '@/features/profile/profileApi';
import { slotCost, slotsForApp } from '@/lib/domain/config';
import type { CreditTransaction, CreditTxType } from '@/lib/domain/types';
import { friendlyDate, signed } from '@/lib/format';
import { useAppSelector } from '@/store/hooks';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

const TYPE_LABEL: Record<CreditTxType, string> = {
  welcome: 'Welcome credits',
  slot_reserve: 'Tester slots reserved',
  slot_refund: 'Unused slots refunded',
  purchase: 'Credit pack',
  admin: 'Adjustment',
};

function TxRow({ tx }: { tx: CreditTransaction }) {
  const { colors } = useTheme();
  const positive = tx.amount > 0;
  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={[styles.icon, { backgroundColor: positive ? colors.successSoft : colors.surfaceAlt }]}>
        <Icon name={positive ? 'arrow-down' : 'arrow-up'} size={16} color={positive ? 'success' : 'textMuted'} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong">{TYPE_LABEL[tx.type]}</Text>
        <Text variant="caption" color="textMuted" numberOfLines={1}>
          {tx.note ?? friendlyDate(tx.$createdAt)}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text variant="bodyStrong" color={positive ? 'success' : 'text'}>
          {signed(tx.amount)}
        </Text>
        <Text variant="caption" color="textFaint">
          {friendlyDate(tx.$createdAt)}
        </Text>
      </View>
    </View>
  );
}

export default function Credits() {
  const userId = useAppSelector((s) => s.auth.userId) ?? '';
  const cfg = useDomainConfig();
  const profile = useMyProfile();
  const history = useCreditHistoryQuery(userId, { skip: !userId });
  const perApp = slotCost(slotsForApp(cfg), cfg);

  return (
    <Screen scroll={false} tabBarInset>
      <Header title="Credits" large />
      <Card>
        <View style={{ gap: space.sm }}>
          <View style={styles.between}>
            <Text variant="label" color="textFaint">
              Balance
            </Text>
            {profile.data?.isPro ? <Badge label="Pro" tone="accent" icon="sparkles" /> : null}
          </View>
          <AnimatedCounter value={profile.data?.credits ?? 0} />
          <Text variant="caption" color="textMuted">
            Listing an app reserves {slotsForApp(cfg)} tester slots ({cfg.TESTERS_REQUIRED} + {cfg.EXTRA_TESTER_BUFFER} spare) for{' '}
            {perApp} credits. Unused slots are refunded.
          </Text>
          <Button label="Get credits" icon="add-circle-outline" onPress={() => router.push('/paywall')} style={{ marginTop: space.sm }} />
        </View>
      </Card>
      <Text variant="h3">History</Text>
      {history.isLoading ? (
        <SkeletonRows count={5} />
      ) : (
        <FlashList
          data={history.data ?? []}
          keyExtractor={(t) => t.$id}
          renderItem={({ item }) => <TxRow tx={item} />}
          onRefresh={history.refetch}
          refreshing={history.isFetching && !history.isLoading}
          ListEmptyComponent={<EmptyState title="No transactions yet" icon="receipt-outline" />}
          contentContainerStyle={{ paddingBottom: 120 }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, borderBottomWidth: StyleSheet.hairlineWidth },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
