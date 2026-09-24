import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radii, space } from '@/theme/tokens';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

export function Badge({ label, tone = 'neutral', icon }: { label: string; tone?: BadgeTone; icon?: IconName }) {
  const { colors, accent } = useTheme();
  const map: Record<BadgeTone, { bg: string; fg: string }> = {
    neutral: { bg: colors.surfaceAlt, fg: colors.textMuted },
    accent: { bg: accent.soft, fg: accent.primary },
    success: { bg: colors.successSoft, fg: colors.success },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
    info: { bg: colors.infoSoft, fg: colors.info },
  };
  const c = map[tone];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      {icon ? <Icon name={icon} size={12} color={c.fg} /> : null}
      <Text variant="caption" style={{ color: c.fg }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
});
