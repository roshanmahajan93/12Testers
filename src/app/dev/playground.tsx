import { Redirect } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AnimatedCounter } from '@/components/motion/AnimatedCounter';
import { CardStack } from '@/components/motion/CardStack';
import { CheckTick } from '@/components/motion/CheckTick';
import { Confetti } from '@/components/motion/Confetti';
import { Illustration } from '@/components/motion/Illustration';
import { LottieIllustration } from '@/components/motion/LottieIllustration';
import { ProgressRing } from '@/components/motion/ProgressRing';
import { Button, Card, Chip, Header, Screen, SegmentedControl, Skeleton, Text, Toggle } from '@/components/ui';
import type { AccentKey } from '@/theme/colors';
import { AccentProvider } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

/** Hidden dev route showcasing the motion kit. Not reachable in production builds. */
function Playground() {
  const [value, setValue] = useState(0.35);
  const [count, setCount] = useState(120);
  const [checked, setChecked] = useState(false);
  const [confetti, setConfetti] = useState(0);
  const [cards, setCards] = useState(['A', 'B', 'C', 'D']);
  const [removing, setRemoving] = useState<string | null>(null);

  return (
    <Screen>
      <Header title="Motion playground" back subtitle="Dev only" />
      <View style={styles.row}>
        <ProgressRing progress={value} size={100}>
          <Text variant="h3">{Math.round(value * 100)}%</Text>
        </ProgressRing>
        <View style={{ flex: 1, gap: space.sm }}>
          <Button label="Randomise ring" size="sm" onPress={() => setValue(Math.random())} />
          <AnimatedCounter value={count} variant="h1" />
          <Button label="+250" size="sm" variant="secondary" onPress={() => setCount((c) => c + 250)} />
        </View>
      </View>
      <View style={styles.row}>
        <CheckTick checked={checked} size={36} />
        <Toggle label="Check" value={checked} onChange={setChecked} />
        <Chip label="Chip" selected={checked} onPress={() => setChecked(!checked)} />
      </View>
      <SegmentedControl value="a" onChange={() => undefined} segments={[{ value: 'a', label: 'One' }, { value: 'b', label: 'Two' }]} />
      <Skeleton height={60} />
      <View style={styles.row}>
        <LottieIllustration name="success" size={110} />
        <LottieIllustration name="empty" size={110} />
        <LottieIllustration name="celebrate" size={110} />
      </View>
      <View style={styles.row}>
        <Illustration kind="developer" size={110} />
        <Illustration kind="tester" size={110} />
        <Illustration kind="tester-streak" size={110} />
      </View>
      <Button label="Confetti" onPress={() => setConfetti((c) => c + 1)} />
      <View style={{ height: 260 }}>
        <CardStack
          items={cards}
          keyOf={(c) => c}
          removingKey={removing}
          onRemoved={(k) => {
            setRemoving(null);
            setCards((cs) => cs.filter((c) => c !== k));
          }}
          onSwipe={(d) => setCards((cs) => (d === 'left' ? [...cs.slice(1), cs[0]!] : [cs[cs.length - 1]!, ...cs.slice(0, -1)]))}
          renderCard={(c) => (
            <Card style={{ flex: 1 }}>
              <Text variant="display">{c}</Text>
              <Button label="Complete" size="sm" fullWidth={false} onPress={() => setRemoving(c)} />
            </Card>
          )}
        />
      </View>
      {confetti ? <Confetti key={confetti} /> : null}
    </Screen>
  );
}

export default function PlaygroundRoute() {
  const [accent, setAccent] = useState<AccentKey>('developer');
  if (!__DEV__) return <Redirect href="/" />;
  return (
    <AccentProvider accent={accent}>
      <View style={{ flex: 1 }}>
        <Playground />
        <View style={styles.switcher}>
          {(['developer', 'tester', 'neutral'] as const).map((a) => (
            <Chip key={a} label={a} selected={accent === a} onPress={() => setAccent(a)} />
          ))}
        </View>
      </View>
    </AccentProvider>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.lg, flexWrap: 'wrap' },
  switcher: { position: 'absolute', bottom: 24, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: space.sm },
});
