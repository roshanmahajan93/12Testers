import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CheckTick } from '@/components/motion/CheckTick';
import { PressableScale } from '@/components/motion/PressableScale';
import { Card, Icon, Text } from '@/components/ui';
import { kv } from '@/store/storage';
import { space } from '@/theme/tokens';

const ITEMS = [
  { id: 'requirement', title: 'Closed test requirement met', body: 'Enough testers stayed opted in for the full period.', auto: true },
  { id: 'feedback', title: 'Review and act on tester feedback', body: 'Fix the bugs testers reported and note what changed.' },
  { id: 'release', title: 'Ship an update to your closed track', body: 'Shows Google the app is actively improved from testing.' },
  { id: 'questions', title: 'Prepare your production-access answers', body: 'Describe who tested, how you recruited them and what you learned.' },
  { id: 'apply', title: 'Apply for production in Play Console', body: 'Google reviews the application and decides — usually within days.' },
] as const;

/** Local, per-app checklist (ticks stored on device). Locked until the requirement is met. */
export function ProductionChecklist({ appId, unlocked }: { appId: string; unlocked: boolean }) {
  const key = `checklist.${appId}`;
  const [done, setDone] = useState<string[]>(() => {
    try {
      return JSON.parse(kv.getString(key) ?? '[]') as string[];
    } catch {
      return [];
    }
  });

  const toggle = (id: string) => {
    const next = done.includes(id) ? done.filter((d) => d !== id) : [...done, id];
    setDone(next);
    kv.set(key, JSON.stringify(next));
  };

  return (
    <Card tone={unlocked ? 'surface' : 'alt'}>
      <View style={{ gap: space.md }}>
        <View style={styles.head}>
          <Icon name={unlocked ? 'rocket' : 'lock-closed'} size={20} color={unlocked ? 'accent' : 'textFaint'} />
          <Text variant="h3" style={{ flex: 1 }}>
            Ready for production
          </Text>
        </View>
        {!unlocked ? (
          <Text variant="bodySm" color="textMuted">
            Unlocks when 12 testers have completed 14 days. Keep an eye on drop-outs — we refill slots automatically.
          </Text>
        ) : null}
        {ITEMS.map((item) => {
          const checked = item.id === 'requirement' ? unlocked : done.includes(item.id);
          return (
            <PressableScale
              key={item.id}
              disabled={!unlocked || item.id === 'requirement'}
              onPress={() => toggle(item.id)}
              haptic="select"
              accessibilityRole="checkbox"
              accessibilityState={{ checked, disabled: !unlocked }}
              accessibilityLabel={item.title}
              style={styles.item}
            >
              <CheckTick checked={checked} />
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong" color={unlocked ? 'text' : 'textFaint'}>
                  {item.title}
                </Text>
                <Text variant="caption" color="textMuted">
                  {item.body}
                </Text>
              </View>
            </PressableScale>
          );
        })}
        <Text variant="caption" color="textFaint">
          This checklist is guidance only. Google decides production access.
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  item: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start', paddingVertical: space.xs },
});
