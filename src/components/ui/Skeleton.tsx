import { View, type DimensionValue } from 'react-native';

import { Shimmer } from '@/components/motion/Shimmer';
import { radii, space } from '@/theme/tokens';

export function Skeleton({
  width = '100%',
  height = 16,
  radius = radii.sm,
}: {
  width?: DimensionValue;
  height?: number;
  radius?: number;
}) {
  return <Shimmer style={{ width, height, borderRadius: radius }} />;
}

/** Layout-matching placeholder for a list of cards. */
export function SkeletonCardList({ count = 3, height = 120 }: { count?: number; height?: number }) {
  return (
    <View style={{ gap: space.md }} accessibilityLabel="Loading" accessibilityRole="progressbar">
      {Array.from({ length: count }, (_, i) => (
        <Shimmer key={i} style={{ height, borderRadius: radii.xl }} />
      ))}
    </View>
  );
}

export function SkeletonRows({ count = 5 }: { count?: number }) {
  return (
    <View style={{ gap: space.lg }} accessibilityLabel="Loading" accessibilityRole="progressbar">
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
          <Skeleton width={44} height={44} radius={22} />
          <View style={{ flex: 1, gap: space.sm }}>
            <Skeleton width="60%" height={14} />
            <Skeleton width="35%" height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}
