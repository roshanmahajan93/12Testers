import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';
import { springs } from '@/theme/motion';
import { fonts, radii, space } from '@/theme/tokens';

const LENGTH = 6;

function Cell({ char, active, error }: { char: string; active: boolean; error: boolean }) {
  const { colors, accent } = useTheme();
  const pop = useSharedValue(1);
  useEffect(() => {
    if (char) pop.set(withSequence(withTiming(1.12, { duration: 80 }), withSpring(1, springs.bouncy)));
  }, [char, pop]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  return (
    <Animated.View
      style={[
        styles.cell,
        {
          backgroundColor: colors.surfaceAlt,
          borderColor: error ? colors.danger : active ? accent.primary : char ? colors.borderStrong : colors.border,
        },
        style,
      ]}
    >
      <Text variant="h2" style={{ fontFamily: fonts.bold }}>
        {char}
      </Text>
    </Animated.View>
  );
}

/** 6-digit code input: one hidden TextInput (keeps SMS/email autofill + paste) and animated cells. */
export function OtpInput({ onComplete, error, disabled }: { onComplete: (code: string) => void; error?: string; disabled?: boolean }) {
  const [value, setValue] = useState('');
  const ref = useRef<TextInput>(null);
  const shake = useSharedValue(0);

  useEffect(() => {
    if (error) {
      shake.set(withSequence(withTiming(-8, { duration: 50 }), withTiming(8, { duration: 50 }), withTiming(-6, { duration: 50 }), withTiming(0, { duration: 50 })));
    }
  }, [error, shake]);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  return (
    <View style={{ gap: space.sm }}>
      <Pressable onPress={() => ref.current?.focus()} accessibilityLabel="Verification code" accessibilityHint="Enter the 6-digit code from your email">
        <Animated.View style={[styles.row, shakeStyle]}>
          {Array.from({ length: LENGTH }, (_, i) => (
            <Cell key={i} char={value[i] ?? ''} active={i === value.length} error={!!error} />
          ))}
        </Animated.View>
      </Pressable>
      <TextInput
        ref={ref}
        value={value}
        autoFocus
        editable={!disabled}
        onChangeText={(t) => {
          const digits = t.replace(/\D/g, '').slice(0, LENGTH);
          setValue(digits);
          if (digits.length === LENGTH) onComplete(digits);
        }}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={LENGTH}
        style={styles.hidden}
      />
      {error ? (
        <Text variant="caption" color="danger" align="center" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  cell: { flex: 1, aspectRatio: 0.82, maxWidth: 56, borderRadius: radii.md, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  hidden: { position: 'absolute', opacity: 0, height: 1, width: 1 },
});
