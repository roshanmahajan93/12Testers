import * as Linking from 'expo-linking';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CheckTick } from '@/components/motion/CheckTick';
import { Button, Sheet, Text } from '@/components/ui';
import { openInPlay } from '@/features/tasks/TaskCard';
import type { App } from '@/lib/domain/types';
import { space } from '@/theme/tokens';

type StepId = 'group' | 'optin' | 'install' | 'confirm';

/**
 * After claiming: walk the tester through Google's opt-in (group → opt-in link → install →
 * confirm). Each tick animates as the tester completes the step.
 */
export function JoinChecklist({ app, visible, onClose, onDone }: { app: App; visible: boolean; onClose: () => void; onDone: () => void }) {
  const [done, setDone] = useState<StepId[]>([]);
  const mark = (s: StepId) => setDone((d) => (d.includes(s) ? d : [...d, s]));

  const steps: { id: StepId; title: string; body: string; action?: { label: string; run: () => void } }[] = [
    ...(app.googleGroupUrl
      ? [
          {
            id: 'group' as const,
            title: 'Join the Google Group',
            body: 'Use the same Google account as your Play Store.',
            action: { label: 'Open group', run: () => void Linking.openURL(app.googleGroupUrl!) },
          },
        ]
      : []),
    {
      id: 'optin',
      title: 'Become a tester',
      body: 'Open the opt-in link and tap “Become a tester”.',
      action: { label: 'Open opt-in link', run: () => void Linking.openURL(app.optInUrl) },
    },
    {
      id: 'install',
      title: 'Install from Google Play',
      body: 'It can take a few minutes after opting in for the install button to appear.',
      action: { label: 'Open Play Store', run: () => void openInPlay(app.packageName) },
    },
    { id: 'confirm', title: 'Keep it installed for 14 days', body: 'Uninstalling or opting out may not count toward the developer’s test.' },
  ];

  const allDone = steps.every((s) => done.includes(s.id));

  return (
    <Sheet visible={visible} onClose={onClose} title={`Join ${app.name}`}>
      <View style={{ gap: space.lg }}>
        {steps.map((s, i) => (
          <View key={s.id} style={styles.step}>
            <CheckTick checked={done.includes(s.id)} size={28} />
            <View style={{ flex: 1, gap: space.xs }}>
              <Text variant="bodyStrong">
                {i + 1}. {s.title}
              </Text>
              <Text variant="caption" color="textMuted">
                {s.body}
              </Text>
              {s.action ? (
                <Button
                  label={s.action.label}
                  size="sm"
                  variant="secondary"
                  fullWidth={false}
                  onPress={() => {
                    s.action!.run();
                    mark(s.id);
                  }}
                />
              ) : (
                <Button label="I’ll keep it installed" size="sm" variant="secondary" fullWidth={false} onPress={() => mark(s.id)} />
              )}
            </View>
          </View>
        ))}
        <Button label={allDone ? 'All set!' : 'Finish later'} variant={allDone ? 'primary' : 'ghost'} haptic={allDone ? 'success' : 'select'} onPress={onDone} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  step: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
});
