import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { PressableScale } from '@/components/motion/PressableScale';
import { useTheme } from '@/theme/ThemeProvider';
import { springs } from '@/theme/motion';
import { radii, space } from '@/theme/tokens';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  disabled?: boolean;
}

/** Selectable pill with an animated fill. */
export function Chip({ label, selected = false, onPress, icon, disabled }: ChipProps) {
  const { colors, accent } = useTheme();
  const t = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    t.set(withSpring(selected ? 1 : 0, springs.snappy));
  }, [selected, t]);

  const style = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(t.value, [0, 1], [colors.surfaceAlt, accent.soft]),
    borderColor: interpolateColor(t.value, [0, 1], [colors.border, accent.primary]),
  }));

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || !onPress}
      haptic="select"
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected, disabled }}
      accessibilityLabel={label}
    >
      <Animated.View style={[styles.chip, style]}>
        {icon ? <Icon name={icon} size={14} color={selected ? 'accent' : 'textMuted'} /> : null}
        <Text variant="caption" color={selected ? 'accent' : 'textMuted'}>
          {label}
        </Text>
      </Animated.View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.md,
    minHeight: 36,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
});
