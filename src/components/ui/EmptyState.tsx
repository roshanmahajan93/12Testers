import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { LottieIllustration, type IllustrationName } from '@/components/motion/LottieIllustration';
import { useTheme } from '@/theme/ThemeProvider';
import { radii, space } from '@/theme/tokens';

import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface EmptyStateProps {
  title: string;
  message?: string;
  icon?: IconName;
  illustration?: IllustrationName;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, message, icon = 'sparkles-outline', illustration, actionLabel, onAction }: EmptyStateProps) {
  const { accent } = useTheme();
  return (
    <Animated.View entering={FadeInDown.springify().damping(18)} style={styles.wrap}>
      {illustration ? (
        <LottieIllustration name={illustration} size={150} />
      ) : (
        <View style={[styles.iconWrap, { backgroundColor: accent.soft }]}>
          <Icon name={icon} size={34} color="accent" />
        </View>
      )}
      <Text variant="h3" align="center">
        {title}
      </Text>
      {message ? (
        <Text variant="bodySm" color="textMuted" align="center" style={styles.message}>
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} fullWidth={false} style={{ marginTop: space.sm }} />
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: space.md, paddingVertical: space.huge, paddingHorizontal: space.xl },
  iconWrap: { width: 76, height: 76, borderRadius: radii.xl, alignItems: 'center', justifyContent: 'center' },
  message: { maxWidth: 320 },
});
