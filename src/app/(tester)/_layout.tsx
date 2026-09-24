import { Stack } from 'expo-router';

import { useRealtimeSync } from '@/features/realtime/useRealtimeSync';
import { useRequireRole } from '@/navigation/guards';
import { usePushRegistration } from '@/services/notifications/usePushRegistration';
import { AccentProvider, useTheme } from '@/theme/ThemeProvider';

export { ErrorBoundary } from '@/components/RouteErrorBoundary';

function TesterStack() {
  const { colors } = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'slide_from_right' }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="feedback/new" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
    </Stack>
  );
}

export default function TesterLayout() {
  const allowed = useRequireRole('tester');
  usePushRegistration();
  useRealtimeSync('tester', allowed);
  return (
    <AccentProvider accent="tester">
      <TesterStack />
    </AccentProvider>
  );
}
