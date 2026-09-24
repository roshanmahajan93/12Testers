import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { PressableScale } from '@/components/motion/PressableScale';
import type { HapticKind } from '@/hooks/useMotion';
import type { AccentKey } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import { HIT_TARGET, radii, space } from '@/theme/tokens';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  accent?: AccentKey;
  haptic?: HapticKind | false;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
  testID?: string;
}

const HEIGHT: Record<ButtonSize, number> = { sm: 38, md: 50, lg: 58 };

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading,
  disabled,
  fullWidth = true,
  accent,
  haptic,
  style,
  accessibilityHint,
  testID,
}: ButtonProps) {
  const theme = useTheme(accent);
  const { colors } = theme;

  const fg =
    variant === 'primary'
      ? theme.accent.onPrimary
      : variant === 'danger'
        ? '#FFFFFF'
        : (variant === 'outline' || variant === 'ghost') && theme.accentKey !== 'neutral'
          ? theme.accent.primary
          : colors.text;

  const container: ViewStyle = {
    height: Math.max(HEIGHT[size], size === 'sm' ? 38 : HIT_TARGET),
    borderRadius: size === 'lg' ? radii.lg : radii.md,
    paddingHorizontal: size === 'sm' ? space.md : space.xl,
    alignSelf: fullWidth ? 'stretch' : 'flex-start',
    backgroundColor:
      variant === 'secondary' ? colors.surfaceAlt : variant === 'danger' ? colors.danger : 'transparent',
    borderWidth: variant === 'outline' ? 1.5 : 0,
    borderColor: variant === 'outline' ? colors.borderStrong : 'transparent',
    overflow: 'hidden',
  };

  const content = (
    <View style={styles.row}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={size === 'sm' ? 16 : 20} color={fg} /> : null}
          <Text variant={size === 'sm' ? 'caption' : 'bodyStrong'} style={{ color: fg }} numberOfLines={1}>
            {label}
          </Text>
          {iconRight ? <Icon name={iconRight} size={size === 'sm' ? 16 : 20} color={fg} /> : null}
        </>
      )}
    </View>
  );

  return (
    <PressableScale
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      haptic={haptic ?? (variant === 'primary' ? 'tap' : 'select')}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      style={[container, style]}
    >
      {variant === 'primary' ? (
        <LinearGradient
          colors={theme.accent.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, styles.center]}
        >
          {content}
        </LinearGradient>
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.center]}>{content}</View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
