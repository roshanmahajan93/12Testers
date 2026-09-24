import { Stack } from 'expo-router';
import { useEffect } from 'react';

import { useRealtimeSync } from '@/features/realtime/useRealtimeSync';
import { useRequireRole } from '@/navigation/guards';
import { usePushRegistration } from '@/services/notifications/usePushRegistration';
import { initPurchases } from '@/services/purchases';
import { useAppSelector } from '@/store/hooks';
import { AccentProvider, useTheme } from '@/theme/ThemeProvider';

export { ErrorBoundary } from '@/components/RouteErrorBoundary';

function DeveloperStack() {
  const { colors } = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'slide_from_right' }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="add-app/index" options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
      <Stack.Screen name="paywall" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
    </Stack>
  );
}

export default function DeveloperLayout() {
  const allowed = useRequireRole('developer');
  const userId = useAppSelector((s) => s.auth.userId);
  usePushRegistration();
  useRealtimeSync('developer', allowed);

  // RevenueCat is developer-only: identify with the Appwrite user id.
  useEffect(() => {
    if (allowed && userId) void initPurchases(userId);
  }, [allowed, userId]);

  return (
    <AccentProvider accent="developer">
      <DeveloperStack />
    </AccentProvider>
  );
}
