import { Tabs } from 'expo-router/js-tabs';

import { AnimatedTabBar, type TabIconMap } from '@/components/motion/AnimatedTabBar';
import { useTheme } from '@/theme/ThemeProvider';

const ICONS: TabIconMap = {
  today: { icon: 'today-outline', activeIcon: 'today', label: 'Today' },
  available: { icon: 'compass-outline', activeIcon: 'compass', label: 'Available' },
  'my-tests': { icon: 'layers-outline', activeIcon: 'layers', label: 'My Tests' },
  points: { icon: 'trophy-outline', activeIcon: 'trophy', label: 'Points' },
  profile: { icon: 'person-circle-outline', activeIcon: 'person-circle', label: 'Profile' },
};

export default function TesterTabs() {
  const { colors } = useTheme();
  return (
    <Tabs
      tabBar={(props) => <AnimatedTabBar {...props} icons={ICONS} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg }, animation: 'shift' }}
    >
      <Tabs.Screen name="today" />
      <Tabs.Screen name="available" />
      <Tabs.Screen name="my-tests" />
      <Tabs.Screen name="points" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
