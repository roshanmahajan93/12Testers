import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/motion/PressableScale';
import { toastDismissed, type Toast } from '@/features/ui/uiSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { useTheme } from '@/theme/ThemeProvider';
import { radii, shadow, space } from '@/theme/tokens';

import { Icon } from './Icon';
import { Text } from './Text';

function ToastItem({ toast }: { toast: Toast }) {
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  useEffect(() => {
    const t = setTimeout(() => dispatch(toastDismissed(toast.id)), 3800);
    return () => clearTimeout(t);
  }, [dispatch, toast.id]);

  const tone = toast.kind === 'success' ? colors.success : toast.kind === 'error' ? colors.danger : colors.info;
  const icon = toast.kind === 'success' ? 'checkmark-circle' : toast.kind === 'error' ? 'alert-circle' : 'information-circle';

  return (
    <Animated.View entering={FadeInUp.springify().damping(16)} exiting={FadeOutUp} layout={LinearTransition}>
      <PressableScale
        onPress={() => dispatch(toastDismissed(toast.id))}
        haptic={false}
        accessibilityRole="alert"
        accessibilityLabel={toast.message}
        style={[styles.toast, { backgroundColor: colors.bgElevated, borderColor: colors.border }, shadow(2)]}
      >
        <Icon name={icon} color={tone} size={20} />
        <Text variant="bodySm" style={styles.msg}>
          {toast.message}
        </Text>
      </PressableScale>
    </Animated.View>
  );
}

export function Toaster() {
  const toasts = useAppSelector((s) => s.ui.toasts);
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[styles.host, { top: insets.top + space.sm }]}>
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: space.lg, right: space.lg, gap: space.sm },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md + 2,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  msg: { flex: 1 },
});
