import { Stack } from 'expo-router';

import { useAppSelector } from '@/store/hooks';
import { AccentProvider } from '@/theme/ThemeProvider';

export { ErrorBoundary } from '@/components/RouteErrorBoundary';

export default function OnboardingLayout() {
  const role = useAppSelector((s) => s.auth.role);
  return (
    <AccentProvider accent={role ?? 'neutral'}>
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
    </AccentProvider>
  );
}
