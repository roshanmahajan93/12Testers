import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { GradientBackdrop } from '@/components/motion/GradientBackdrop';
import { PressableScale } from '@/components/motion/PressableScale';
import { StaggerIn } from '@/components/motion/StaggerIn';
import { Badge, Button, EmptyState, Header, Icon, Screen, SkeletonCardList, Text } from '@/components/ui';
import { useMyProfile } from '@/features/profile/profileApi';
import { useToast } from '@/features/ui/useToast';
import { env } from '@/lib/env';
import { useRequireRole } from '@/navigation/guards';
import {
  buyPackage,
  getCurrentOffering,
  isPurchasesAvailable,
  restorePurchases,
  useEntitlement,
  type PurchasesOffering,
  type PurchasesPackage,
} from '@/services/purchases';
import { api } from '@/store/api';
import { useAppDispatch } from '@/store/hooks';
import { useTheme } from '@/theme/ThemeProvider';
import { springs } from '@/theme/motion';
import { radii, space } from '@/theme/tokens';

const PRO_PERKS = ['Boosted listing for 7 days — shown first to testers', 'Invites sent to twice as many high-reputation testers', 'Priority access to top testers'];

function creditsIn(p: PurchasesPackage): number | null {
  const m = /credits?_(\d+)/i.exec(p.product.identifier);
  return m ? Number(m[1]) : null;
}

function PackageCard({ pkg, selected, onPress }: { pkg: PurchasesPackage; selected: boolean; onPress: () => void }) {
  const { colors, accent } = useTheme();
  const t = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    t.set(withSpring(selected ? 1 : 0, springs.snappy));
  }, [selected, t]);
  const style = useAnimatedStyle(() => ({
    borderColor: interpolateColor(t.value, [0, 1], [colors.border, accent.primary]),
    transform: [{ scale: 1 + t.value * 0.015 }],
  }));
  const credits = creditsIn(pkg);
  const sub = credits === null;
  return (
    <PressableScale onPress={onPress} haptic="select" accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={pkg.product.title}>
      <Animated.View style={[styles.pkg, { backgroundColor: selected ? accent.soft : colors.surface }, style]}>
        <View style={[styles.pkgIcon, { backgroundColor: colors.surfaceAlt }]}>
          <Icon name={sub ? 'sparkles' : 'wallet'} size={20} color="accent" />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong">{credits ? `${credits} credits` : 'Pro'}</Text>
          <Text variant="caption" color="textMuted" numberOfLines={2}>
            {sub ? `${pkg.product.priceString} / ${pkg.packageType === 'ANNUAL' ? 'year' : 'month'} · boosted recruiting` : pkg.product.description || 'One-time credit pack'}
          </Text>
        </View>
        <Text variant="h3">{pkg.product.priceString}</Text>
      </Animated.View>
    </PressableScale>
  );
}

export default function Paywall() {
  useRequireRole('developer');
  const theme = useTheme();
  const toast = useToast();
  const dispatch = useAppDispatch();
  const profile = useMyProfile();
  const pro = useEntitlement();
  const available = isPurchasesAvailable();
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [loading, setLoading] = useState(available);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!available) return;
    getCurrentOffering()
      .then((o) => {
        setOffering(o);
        setSelected(o?.availablePackages[0]?.identifier ?? null);
      })
      .catch((e) => toast.error(e))
      .finally(() => setLoading(false));
  }, [available, toast]);

  // Credits are granted by the webhook → poll the profile briefly after a purchase.
  const awaitGrant = () => {
    [1500, 4000, 9000].forEach((ms) => setTimeout(() => dispatch(api.util.invalidateTags(['Profile', 'Credits'])), ms));
  };

  const buy = async () => {
    const pkg = offering?.availablePackages.find((p) => p.identifier === selected);
    if (!pkg) return;
    setBusy(true);
    try {
      const res = await buyPackage(pkg);
      if (res.status === 'purchased') {
        toast.success(creditsIn(pkg) ? 'Purchase complete — credits arrive in a few seconds.' : 'Welcome to Pro!');
        awaitGrant();
        router.back();
      }
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    setBusy(true);
    try {
      await restorePurchases();
      awaitGrant();
      toast.success('Purchases restored.');
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };

  const packages = offering?.availablePackages ?? [];
  const packs = packages.filter((p) => creditsIn(p) !== null);
  const subs = packages.filter((p) => creditsIn(p) === null);

  return (
    <View style={{ flex: 1 }}>
      <GradientBackdrop intensity={0.7} />
      <Screen
        edges={['top']}
        footer={
          available && packages.length ? (
            <>
              <Button label="Continue" icon="lock-closed-outline" onPress={buy} loading={busy} disabled={!selected} />
              <Button label="Restore purchases" variant="ghost" size="sm" onPress={restore} disabled={busy} />
            </>
          ) : null
        }
      >
        <Header title="Credits & Pro" back subtitle={`Balance: ${profile.data?.credits ?? 0} credits`} />

        <StaggerIn index={0}>
          <View style={[styles.proCard, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
            <View style={styles.proHead}>
              <Text variant="h2">12Testers Pro</Text>
              {pro.active || profile.data?.isPro ? <Badge label="Active" tone="success" icon="checkmark" /> : null}
            </View>
            {PRO_PERKS.map((perk) => (
              <View key={perk} style={styles.perk}>
                <Icon name="checkmark-circle" size={18} color="accent" />
                <Text variant="bodySm" style={{ flex: 1 }}>
                  {perk}
                </Text>
              </View>
            ))}
          </View>
        </StaggerIn>

        {!available ? (
          <EmptyState
            icon="card-outline"
            title="Purchases aren’t available here"
            message="In-app purchases need the Android app (development or store build) with RevenueCat configured."
          />
        ) : loading ? (
          <SkeletonCardList count={3} height={76} />
        ) : packages.length === 0 ? (
          <EmptyState icon="pricetags-outline" title="No products yet" message="Configure an offering with credit packs and a Pro subscription in RevenueCat." />
        ) : (
          <>
            {packs.length ? (
              <Text variant="label" color="textFaint">
                Credit packs
              </Text>
            ) : null}
            {packs.map((p, i) => (
              <StaggerIn key={p.identifier} index={i + 1}>
                <PackageCard pkg={p} selected={selected === p.identifier} onPress={() => setSelected(p.identifier)} />
              </StaggerIn>
            ))}
            {subs.length ? (
              <Text variant="label" color="textFaint">
                Subscription
              </Text>
            ) : null}
            {subs.map((p, i) => (
              <StaggerIn key={p.identifier} index={packs.length + i + 1}>
                <PackageCard pkg={p} selected={selected === p.identifier} onPress={() => setSelected(p.identifier)} />
              </StaggerIn>
            ))}
          </>
        )}

        <Text variant="caption" color="textFaint" align="center">
          Payments are processed by Google Play. Subscriptions renew until cancelled in Play Store settings.{' '}
          {env.termsUrl ? (
            <Text variant="caption" color="accent" onPress={() => void Linking.openURL(env.termsUrl)}>
              Terms
            </Text>
          ) : null}
          {env.privacyUrl ? (
            <Text variant="caption" color="accent" onPress={() => void Linking.openURL(env.privacyUrl)}>
              {' '}
              · Privacy
            </Text>
          ) : null}
        </Text>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  proCard: { borderRadius: radii.xl, padding: space.lg, gap: space.sm, borderWidth: 1 },
  proHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  perk: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  pkg: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radii.xl, borderWidth: 1.5 },
  pkgIcon: { width: 42, height: 42, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
});
