import { Tabs } from 'expo-router/js-tabs';

import { AnimatedTabBar, type TabIconMap } from '@/components/motion/AnimatedTabBar';
import { useTheme } from '@/theme/ThemeProvider';

const ICONS: TabIconMap = {
  dashboard: { icon: 'grid-outline', activeIcon: 'grid', label: 'Dashboard' },
  apps: { icon: 'apps-outline', activeIcon: 'apps', label: 'My Apps' },
  credits: { icon: 'wallet-outline', activeIcon: 'wallet', label: 'Credits' },
  account: { icon: 'person-circle-outline', activeIcon: 'person-circle', label: 'Profile' },
};

export default function DeveloperTabs() {
  const { colors } = useTheme();
  return (
    <Tabs
      tabBar={(props) => <AnimatedTabBar {...props} icons={ICONS} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg }, animation: 'shift' }}
    >
      <Tabs.Screen name="dashboard" />
      <Tabs.Screen name="apps" />
      <Tabs.Screen name="credits" />
      <Tabs.Screen name="account" />
    </Tabs>
  );
}
