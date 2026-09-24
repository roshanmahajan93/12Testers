import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { PressableScale } from '@/components/motion/PressableScale';
import { useTheme } from '@/theme/ThemeProvider';
import { HIT_TARGET, radii, space } from '@/theme/tokens';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  icon?: IconName;
  left?: ReactNode;
  right?: ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  chevron?: boolean;
}

export function ListRow({ title, subtitle, icon, left, right, onPress, destructive, chevron = !!onPress }: ListRowProps) {
  const { colors } = useTheme();
  const body = (
    <View style={styles.row}>
      {left ??
        (icon ? (
          <View style={[styles.iconWrap, { backgroundColor: destructive ? colors.dangerSoft : colors.surfaceAlt }]}>
            <Icon name={icon} size={18} color={destructive ? 'danger' : 'textMuted'} />
          </View>
        ) : null)}
      <View style={styles.text}>
        <Text variant="bodyStrong" color={destructive ? 'danger' : 'text'} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color="textMuted" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
      {chevron ? <Icon name="chevron-forward" size={18} color="textFaint" /> : null}
    </View>
  );
  if (!onPress) return body;
  return (
    <PressableScale onPress={onPress} haptic="select" accessibilityLabel={title} accessibilityHint={subtitle}>
      {body}
    </PressableScale>
  );
}

export function ListGroup({ children, title }: { children: ReactNode; title?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: space.sm }}>
      {title ? (
        <Text variant="label" color="textFaint" style={{ marginLeft: space.xs }}>
          {title}
        </Text>
      ) : null}
      <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: HIT_TARGET + 12, paddingVertical: space.sm },
  iconWrap: { width: 36, height: 36, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  group: { borderRadius: radii.xl, borderWidth: 1, paddingHorizontal: space.lg, paddingVertical: space.xs },
});
