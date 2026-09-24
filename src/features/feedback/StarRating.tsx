import { View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { PressableScale } from '@/components/motion/PressableScale';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/theme/ThemeProvider';

export function StarRating({ value, onChange, size = 24 }: { value: number; onChange?: (n: number) => void; size?: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 4 }} accessibilityRole="adjustable" accessibilityLabel={`Rating ${value} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <PressableScale key={n} onPress={onChange ? () => onChange(n) : undefined} disabled={!onChange} haptic="select" hitSlop={4} accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`}>
          {n <= value ? (
            <Animated.View entering={ZoomIn.springify()}>
              <Icon name="star" size={size} color={colors.warning} />
            </Animated.View>
          ) : (
            <Icon name="star-outline" size={size} color="textFaint" />
          )}
        </PressableScale>
      ))}
    </View>
  );
}
