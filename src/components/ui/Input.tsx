import { forwardRef, useEffect, useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useTheme } from '@/theme/ThemeProvider';
import { durations } from '@/theme/motion';
import { fonts, radii, space } from '@/theme/tokens';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface InputProps extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string;
  icon?: IconName;
  right?: React.ReactNode;
}

/** Text field with an animated focus ring and inline error. */
export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, hint, error, icon, right, onFocus, onBlur, style, multiline, ...rest },
  ref,
) {
  const { colors, accent } = useTheme();
  const [focused, setFocused] = useState(false);
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(withTiming(focused ? 1 : 0, { duration: durations.fast }));
  }, [focused, progress]);

  const ringStyle = useAnimatedStyle(() => ({
    borderColor: error ? colors.danger : interpolateColor(progress.value, [0, 1], [colors.border, accent.primary]),
    transform: [{ scale: 1 + progress.value * 0.004 }],
  }));

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text variant="caption" color="textMuted" style={styles.label}>
          {label}
        </Text>
      ) : null}
      <Animated.View
        style={[
          styles.field,
          { backgroundColor: colors.surfaceAlt, minHeight: multiline ? 110 : 52 },
          ringStyle,
        ]}
      >
        {icon ? <Icon name={icon} size={18} color="textFaint" /> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.textFaint}
          selectionColor={accent.primary}
          multiline={multiline}
          accessibilityLabel={label}
          accessibilityHint={hint}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            styles.input,
            { color: colors.text, textAlignVertical: multiline ? 'top' : 'center', paddingTop: multiline ? space.md : 0 },
            style,
          ]}
          {...rest}
        />
        {right}
      </Animated.View>
      {error ? (
        <Text variant="caption" color="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" color="textFaint">
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: space.xs + 2 },
  label: { marginLeft: space.xxs },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderRadius: radii.md,
    borderWidth: 1.5,
    paddingHorizontal: space.md + 2,
  },
  input: { flex: 1, fontFamily: fonts.medium, fontSize: 16, minHeight: 48, paddingVertical: space.sm },
});
