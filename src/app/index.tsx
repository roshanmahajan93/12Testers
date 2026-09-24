import { Redirect } from 'expo-router';
import { View } from 'react-native';

import { homeHrefFor } from '@/navigation/guards';
import { useAppSelector } from '@/store/hooks';
import { useTheme } from '@/theme/ThemeProvider';

/** Entry point: routes to the right experience for the current session + role. */
export default function Index() {
  const { colors } = useTheme();
  const auth = useAppSelector((s) => s.auth);
  const onboardingSeen = useAppSelector((s) => s.settings.onboardingSeen);

  if (auth.status === 'unknown') return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  return <Redirect href={homeHrefFor(auth, onboardingSeen)} />;
}
