import type { ErrorBoundaryProps } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { logger } from '@/services/logger';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

import { Button } from './ui/Button';
import { Icon } from './ui/Icon';
import { Text } from './ui/Text';

/** Exported as `ErrorBoundary` from each route group layout (Expo Router convention). */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const { colors } = useTheme();
  useEffect(() => {
    logger.error('route crashed', error);
  }, [error]);
  return (
    <View style={[styles.wrap, { backgroundColor: colors.bg }]}>
      <Icon name="bug-outline" size={40} color="warning" />
      <Text variant="h2" align="center">
        This screen hit a snag
      </Text>
      <Text variant="bodySm" color="textMuted" align="center">
        {__DEV__ ? error.message : 'Something unexpected happened. Your data is safe — try again.'}
      </Text>
      <Button label="Try again" onPress={() => void retry()} fullWidth={false} icon="refresh" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xxxl },
});
