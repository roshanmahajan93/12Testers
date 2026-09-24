import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';

import { Icon, type IconName } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { useHaptics, useReduceMotion } from '@/hooks/useMotion';
import { useTheme } from '@/theme/ThemeProvider';
import { springs } from '@/theme/motion';
import { radii, shadow, space } from '@/theme/tokens';

import { PressableScale } from './PressableScale';

export type TabIconMap = Record<string, { icon: IconName; activeIcon: IconName; label: string }>;

const BAR_HEIGHT = 66;

function TabItem({
  focused,
  meta,
  badge,
  onPress,
  onLongPress,
}: {
  focused: boolean;
  meta: TabIconMap[string];
  badge?: string | number;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const reduceMotion = useReduceMotion();
  const bounce = useSharedValue(1);
  useEffect(() => {
    if (focused && !reduceMotion) bounce.set(withSequence(withSpring(1.22, springs.snappy), withSpring(1, springs.bouncy)));
  }, [focused, reduceMotion, bounce]);
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: bounce.value }] }));

  return (
    <PressableScale
      onPress={onPress}
      onLongPress={onLongPress}
      haptic={false}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={meta.label}
      style={styles.item}
    >
      <Animated.View style={iconStyle}>
        <Icon name={focused ? meta.activeIcon : meta.icon} size={22} color={focused ? 'onAccent' : 'textMuted'} />
        {badge ? <View style={styles.dot} /> : null}
      </Animated.View>
      <Text variant="caption" color={focused ? 'text' : 'textFaint'} style={styles.label} numberOfLines={1} maxScale={1.2}>
        {meta.label}
      </Text>
    </PressableScale>
  );
}

/**
 * Floating tab bar with a spring-driven sliding pill behind the active icon and an icon bounce.
 * Each role passes its own icon map; the accent comes from the role's AccentProvider.
 */
export function AnimatedTabBar({ state, descriptors, navigation, insets, icons }: BottomTabBarProps & { icons: TabIconMap }) {
  const theme = useTheme();
  const fire = useHaptics();
  const [width, setWidth] = useState(0);
  const routes = state.routes.filter((r) => icons[r.name]);
  const activeName = state.routes[state.index]?.name;
  const activeIdx = Math.max(0, routes.findIndex((r) => r.name === activeName));
  const itemW = routes.length ? width / routes.length : 0;
  const x = useSharedValue(0);

  useEffect(() => {
    x.set(withSpring(activeIdx * itemW, springs.gentle));
  }, [activeIdx, itemW, x]);

  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View pointerEvents="box-none" style={[styles.host, { bottom: Math.max(insets.bottom, space.md) }]}>
      <View
        accessibilityRole="tablist"
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={[styles.bar, { borderColor: theme.colors.border }, shadow(3)]}
      >
        {Platform.OS === 'ios' ? (
          <BlurView intensity={40} tint={theme.isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        ) : null}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.bgElevated, opacity: Platform.OS === 'ios' ? 0.78 : 0.97 }]} />
        {itemW > 0 ? (
          <Animated.View style={[styles.pillWrap, { width: itemW }, pill]}>
            <LinearGradient colors={theme.accent.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.pill} />
          </Animated.View>
        ) : null}
        {routes.map((route) => {
          const meta = icons[route.name]!;
          const focused = route.name === activeName;
          const options = descriptors[route.key]?.options;
          return (
            <TabItem
              key={route.key}
              focused={focused}
              meta={meta}
              badge={options?.tabBarBadge}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) {
                  fire('select');
                  navigation.navigate(route.name, route.params);
                }
              }}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: space.lg, right: space.lg },
  bar: {
    height: BAR_HEIGHT,
    borderRadius: radii.xxl,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  pillWrap: { position: 'absolute', top: 7, height: 34, alignItems: 'center' },
  pill: { width: 52, height: 34, borderRadius: radii.pill },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 2, gap: 3 },
  label: { fontSize: 11, lineHeight: 13 },
  dot: { position: 'absolute', top: -2, right: -6, width: 9, height: 9, borderRadius: 5, backgroundColor: '#FF5C7A' },
});
