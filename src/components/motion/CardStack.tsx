import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useHaptics, useReduceMotion } from '@/hooks/useMotion';
import { durations, springs } from '@/theme/motion';
import { space } from '@/theme/tokens';

const VISIBLE = 3;
const SWIPE_THRESHOLD = 0.28;

export type SwipeDirection = 'left' | 'right';

export interface CardStackProps<T> {
  /** Ordered cards; `items[0]` is on top. */
  items: readonly T[];
  keyOf: (item: T) => string;
  renderCard: (item: T, isTop: boolean) => ReactNode;
  /** Called after a swipe animation finishes; the parent reorders `items`. */
  onSwipe: (direction: SwipeDirection) => void;
  /** When set to the top card's key, that card flies up and away (completion). */
  removingKey?: string | null;
  onRemoved?: (key: string) => void;
}

function StackCard({
  index,
  isTop,
  removing,
  children,
  canSwipe,
  onSwipe,
  onRemoved,
}: {
  index: number;
  isTop: boolean;
  removing: boolean;
  children: ReactNode;
  canSwipe: boolean;
  onSwipe: (d: SwipeDirection) => void;
  onRemoved: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const fire = useHaptics();
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const depth = useSharedValue(index);
  const leaving = useSharedValue(0);
  // Stable callback so parent re-renders don't restart the fly-off animation.
  const onRemovedRef = useRef(onRemoved);
  useEffect(() => {
    onRemovedRef.current = onRemoved;
  });
  const fireRemoved = useCallback(() => onRemovedRef.current(), []);

  // Cards behind the top one rise into place when the stack changes.
  useEffect(() => {
    depth.set(withSpring(index, springs.gentle));
    if (index > 0) {
      // A card that was swiped away and re-queued comes back from the centre.
      x.set(0);
      y.set(0);
    }
  }, [index, depth, x, y]);

  // Completion: fly up and off with a spring, then tell the parent.
  useEffect(() => {
    if (!removing) return;
    leaving.set(withTiming(1, { duration: durations.slow }));
    y.set(
      withSpring(-height * 1.1, springs.fling, (done) => {
        if (done) scheduleOnRN(fireRemoved);
      }),
    );
  }, [removing, height, leaving, y, fireRemoved]);

  const pan = Gesture.Pan()
    .enabled(isTop && canSwipe && !removing)
    .activeOffsetX([-18, 18])
    .failOffsetY([-14, 14])
    .onUpdate((e) => {
      x.set(e.translationX);
      y.set(e.translationY * 0.15);
    })
    .onEnd((e) => {
      const shouldSwipe = Math.abs(e.translationX) > width * SWIPE_THRESHOLD || Math.abs(e.velocityX) > 900;
      if (shouldSwipe) {
        const dir: SwipeDirection = e.translationX < 0 ? 'left' : 'right';
        scheduleOnRN(fire, 'select');
        x.set(
          withTiming(Math.sign(e.translationX) * width * 1.3, { duration: durations.base }, (done) => {
            if (done) scheduleOnRN(onSwipe, dir);
          }),
        );
      } else {
        x.set(withSpring(0, springs.snappy));
        y.set(withSpring(0, springs.snappy));
      }
    });

  const style = useAnimatedStyle(() => {
    const d = depth.value;
    const tiltZ = interpolate(x.value, [-width, width], [-12, 12], Extrapolation.CLAMP);
    const tiltY = interpolate(x.value, [-width, width], [10, -10], Extrapolation.CLAMP);
    return {
      opacity: interpolate(d, [VISIBLE - 1, VISIBLE], [1, 0], Extrapolation.CLAMP) * (1 - leaving.value * 0.6),
      transform: [
        { perspective: 900 },
        { translateX: x.value },
        { translateY: y.value + d * 14 },
        { scale: 1 - d * 0.05 - leaving.value * 0.08 },
        { rotateZ: `${tiltZ + leaving.value * -6}deg` },
        { rotateY: `${tiltY}deg` },
      ],
    };
  });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[StyleSheet.absoluteFill, { zIndex: VISIBLE - index }, style]}
        pointerEvents={isTop ? 'auto' : 'none'}
        importantForAccessibility={isTop ? 'auto' : 'no-hide-descendants'}
        accessibilityElementsHidden={!isTop}
      >
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

/**
 * Gesture-driven card stack (Gesture Handler + Reanimated): spring physics, subtle 3D tilt while
 * dragging, swipe left/right to cycle, fly-off on completion. With reduced motion it degrades to a
 * plain vertical list (navigation happens with buttons inside the cards).
 */
export function CardStack<T>({ items, keyOf, renderCard, onSwipe, removingKey, onRemoved }: CardStackProps<T>) {
  const reduceMotion = useReduceMotion();

  if (reduceMotion) {
    return (
      <View style={{ gap: space.lg }}>
        {items.map((item, i) => (
          <View key={keyOf(item)}>{renderCard(item, i === 0)}</View>
        ))}
      </View>
    );
  }

  const visible = items.slice(0, VISIBLE);
  return (
    <View style={styles.stack}>
      {visible
        .map((item, i) => {
          const key = keyOf(item);
          return (
            <StackCard
              key={key}
              index={i}
              isTop={i === 0}
              removing={removingKey === key}
              canSwipe={items.length > 1}
              onSwipe={onSwipe}
              onRemoved={() => onRemoved?.(key)}
            >
              {renderCard(item, i === 0)}
            </StackCard>
          );
        })
        .reverse()}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { flex: 1, marginBottom: VISIBLE * 14 },
});
