import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radii, space } from '@/theme/tokens';

import { IconButton } from './Header';
import { Text } from './Text';

/** −/+ number control with accessible adjustable semantics. */
export function Stepper({
  value,
  onChange,
  min,
  max,
  label,
  step = 1,
  format = (n) => String(n),
}: {
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  label: string;
  step?: number;
  format?: (n: number) => string;
}) {
  const { colors } = useTheme();
  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min, max, now: value, text: format(value) }}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'increment') onChange(Math.min(max, value + step));
        if (e.nativeEvent.actionName === 'decrement') onChange(Math.max(min, value - step));
      }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      style={[styles.row, { backgroundColor: colors.surfaceAlt }]}
    >
      <IconButton icon="remove" label={`Decrease ${label}`} onPress={() => onChange(Math.max(min, value - step))} tone="plain" />
      <Text variant="h3" style={styles.value}>
        {format(value)}
      </Text>
      <IconButton icon="add" label={`Increase ${label}`} onPress={() => onChange(Math.min(max, value + step))} tone="plain" />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: radii.md, padding: space.xs },
  value: { flex: 1, textAlign: 'center' },
});
