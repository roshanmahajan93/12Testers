import { Stack } from 'expo-router';

import { useTheme } from '@/theme/ThemeProvider';

export { ErrorBoundary } from '@/components/RouteErrorBoundary';

export default function AuthLayout() {
  const { colors } = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'fade' }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="tester-setup" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
