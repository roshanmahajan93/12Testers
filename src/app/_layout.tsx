import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/manrope';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';

import { OfflineBanner } from '@/components/OfflineBanner';
import { RoleMismatchSheet } from '@/components/RoleMismatchSheet';
import { Toaster } from '@/components/ui/Toaster';
import { useSessionBootstrap } from '@/features/auth/useSessionBootstrap';
import { useNotificationRouting } from '@/services/notifications/useNotificationRouting';
import { useAppSelector } from '@/store/hooks';
import { persistor, store } from '@/store/store';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

export { ErrorBoundary } from '@/components/RouteErrorBoundary';

void SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  useSessionBootstrap(true);
  useNotificationRouting();
  const theme = useTheme();
  const { status, role, needsTesterSetup } = useAppSelector((s) => s.auth);
  const onboardingSeen = useAppSelector((s) => s.settings.onboardingSeen);

  const ready = status !== 'unknown';
  const signedIn = status === 'signedIn';
  const hasRole = signedIn && role !== null && !needsTesterSetup;
  const onboarded = hasRole && role !== null && onboardingSeen[role];

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  const navTheme = theme.isDark ? DarkTheme : DefaultTheme;

  return (
    <NavThemeProvider value={{ ...navTheme, colors: { ...navTheme.colors, background: theme.colors.bg } }}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.bg }, animation: 'fade_from_bottom' }}>
        {/* Always reachable: decides where to go based on session + role. */}
        <Stack.Screen name="index" />
        <Stack.Protected guard={ready && !hasRole}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={hasRole && !onboarded}>
          <Stack.Screen name="(onboarding)" />
        </Stack.Protected>
        <Stack.Protected guard={onboarded && role === 'developer'}>
          <Stack.Screen name="(developer)" />
        </Stack.Protected>
        <Stack.Protected guard={onboarded && role === 'tester'}>
          <Stack.Screen name="(tester)" />
        </Stack.Protected>
        <Stack.Protected guard={onboarded}>
          <Stack.Screen name="notifications" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
        </Stack.Protected>
        <Stack.Screen name="dev/playground" options={{ animation: 'slide_from_right' }} />
      </Stack>
      <OfflineBanner />
      <RoleMismatchSheet />
      <Toaster />
    </NavThemeProvider>
  );
}

function ThemedApp() {
  const mode = useAppSelector((s) => s.settings.themeMode);
  return (
    <ThemeProvider mode={mode}>
      <RootNavigator />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Provider store={store}>
          <PersistGate persistor={persistor} loading={null}>
            <ThemedApp />
          </PersistGate>
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
