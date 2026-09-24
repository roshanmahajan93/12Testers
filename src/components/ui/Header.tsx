import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { PressableScale } from '@/components/motion/PressableScale';
import { useTheme } from '@/theme/ThemeProvider';
import { HIT_TARGET, radii, space } from '@/theme/tokens';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface HeaderProps {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
  large?: boolean;
}

export function Header({ title, subtitle, back = false, right, large = false }: HeaderProps) {
  return (
    <View style={styles.row}>
      {back ? (
        <IconButton
          icon="chevron-back"
          label="Go back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        />
      ) : null}
      <View style={styles.titles}>
        <Text variant={large ? 'h1' : 'h2'} accessibilityRole="header" numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="bodySm" color="textMuted" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

export function IconButton({
  icon,
  label,
  onPress,
  tone = 'surface',
  badge,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  tone?: 'surface' | 'accent' | 'plain';
  badge?: number;
}) {
  const { colors, accent } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      accessibilityLabel={label}
      haptic="select"
      hitSlop={6}
      style={[
        styles.iconBtn,
        {
          backgroundColor: tone === 'accent' ? accent.soft : tone === 'plain' ? 'transparent' : colors.surface,
          borderColor: tone === 'surface' ? colors.border : 'transparent',
        },
      ]}
    >
      <Icon name={icon} size={20} color={tone === 'accent' ? 'accent' : 'text'} />
      {badge ? (
        <View style={[styles.badge, { backgroundColor: colors.danger, borderColor: colors.bg }]}>
          <Text variant="caption" style={styles.badgeText}>
            {badge > 9 ? '9+' : badge}
          </Text>
        </View>
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: HIT_TARGET },
  titles: { flex: 1, gap: 2 },
  iconBtn: {
    width: HIT_TARGET,
    height: HIT_TARGET,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  badgeText: { color: '#FFFFFF', fontSize: 10, lineHeight: 12 },
});
