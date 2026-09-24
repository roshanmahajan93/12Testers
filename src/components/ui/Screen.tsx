import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

export interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  padded?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Extra space at the bottom so content clears the floating tab bar. */
  tabBarInset?: boolean;
  footer?: ReactNode;
}

export const TAB_BAR_CLEARANCE = 96;

export function Screen({
  children,
  scroll = true,
  edges = ['top'],
  padded = true,
  contentStyle,
  refreshing,
  onRefresh,
  tabBarInset = false,
  footer,
}: ScreenProps) {
  const { colors, accent } = useTheme();
  const insets = useSafeAreaInsets();
  const padTop = edges.includes('top') ? insets.top : 0;
  const padBottom = (edges.includes('bottom') ? insets.bottom : 0) + (tabBarInset ? TAB_BAR_CLEARANCE : space.xl);
  const inner: ViewStyle = {
    paddingTop: padTop + space.sm,
    paddingBottom: padBottom,
    paddingHorizontal: padded ? space.xl : 0,
    gap: space.lg,
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[inner, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={!!refreshing}
                onRefresh={onRefresh}
                tintColor={accent.primary}
                colors={[accent.primary]}
                progressViewOffset={padTop}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.root, inner, contentStyle]}>{children}</View>
      )}
      {footer ? (
        <View
          style={[
            styles.footer,
            { paddingBottom: insets.bottom + space.md, backgroundColor: colors.bg, borderTopColor: colors.border },
          ]}
        >
          {footer}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  footer: { paddingHorizontal: space.xl, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, gap: space.sm },
});
