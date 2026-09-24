import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { CheckTick } from '@/components/motion/CheckTick';
import { PressableScale } from '@/components/motion/PressableScale';
import { ProgressRing } from '@/components/motion/ProgressRing';
import { Avatar, Badge, Button, Icon, Input, Text } from '@/components/ui';
import { FileImage } from '@/components/ui/FileImage';
import type { DailyTask } from '@/lib/domain/types';
import { marketUrlFor, playStoreUrlFor } from '@/lib/validators';
import { useTheme } from '@/theme/ThemeProvider';
import { radii, shadow, space } from '@/theme/tokens';

export interface TaskDraft {
  opened: boolean;
  did: boolean;
  screenshotFileId: string | null;
  localUri: string | null;
  uploading: boolean;
  answer: string;
  note: string;
}

export const EMPTY_DRAFT: TaskDraft = {
  opened: false,
  did: false,
  screenshotFileId: null,
  localUri: null,
  uploading: false,
  answer: '',
  note: '',
};

export function canComplete(task: DailyTask, d: TaskDraft): boolean {
  if (d.uploading || !d.did) return false;
  if (task.requiresScreenshot && !d.screenshotFileId) return false;
  if (task.question && !d.answer.trim()) return false;
  return true;
}

/** Opens the app's Play listing (installed apps show "Open"); falls back to the web page. */
export async function openInPlay(packageName: string): Promise<void> {
  try {
    await Linking.openURL(marketUrlFor(packageName));
  } catch {
    await Linking.openURL(playStoreUrlFor(packageName));
  }
}

function Step({ n, done, title, children }: { n: number; done: boolean; title: string; children?: React.ReactNode }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepHead}>
        <CheckTick checked={done} size={24} />
        <Text variant="bodyStrong" color={done ? 'textMuted' : 'text'} style={{ flex: 1 }}>
          {n}. {title}
        </Text>
      </View>
      {children ? <View style={styles.stepBody}>{children}</View> : null}
    </View>
  );
}

export interface TaskCardProps {
  task: DailyTask;
  draft: TaskDraft;
  days: number;
  onChange: (patch: Partial<TaskDraft>) => void;
  onPickScreenshot: (source: 'camera' | 'library') => void;
  onComplete: () => void;
  completing: boolean;
  /** Stack position text, e.g. "2 of 3". */
  position?: string;
  onPrev?: () => void;
  onNext?: () => void;
}

/** One app, one day: instruction + 5-step checklist + complete. Used by Today and task/[taskId]. */
export function TaskCard({ task, draft, days, onChange, onPickScreenshot, onComplete, completing, position, onPrev, onNext }: TaskCardProps) {
  const theme = useTheme();
  const done = task.status !== 'pending';
  let n = 0;

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, shadow(3)]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
        <View style={styles.header}>
          <Avatar name={task.appName} fileId={task.appIconFileId} bucket="appIcons" size={52} rounded="squircle" />
          <View style={{ flex: 1 }}>
            <Text variant="h2" numberOfLines={1}>
              {task.appName}
            </Text>
            <Text variant="caption" color="textMuted">
              {position ? `${position} · ` : ''}
              {task.packageName}
            </Text>
          </View>
          <ProgressRing progress={task.dayNumber / days} size={58} stroke={6} accessibilityLabel={`Day ${task.dayNumber} of ${days}`}>
            <Text variant="caption">
              {task.dayNumber}/{days}
            </Text>
          </ProgressRing>
        </View>

        <View style={[styles.instruction, { backgroundColor: theme.accent.soft }]}>
          <Text variant="label" color="accent">
            Day {task.dayNumber} · {task.title}
          </Text>
          <Text variant="body">{task.instruction}</Text>
        </View>

        {done ? (
          <View style={{ gap: space.sm }}>
            <Badge label={task.status === 'completed' ? 'Completed' : task.status === 'flagged' ? 'Flagged' : 'Missed'} tone={task.status === 'completed' ? 'success' : 'warning'} />
            {task.screenshotFileId ? <FileImage bucket="taskScreenshots" fileId={task.screenshotFileId} style={styles.preview} /> : null}
            {task.answer ? <Text variant="bodySm">Your answer: {task.answer}</Text> : null}
            {task.flagReason ? (
              <Text variant="bodySm" color="warning">
                Developer note: {task.flagReason}
              </Text>
            ) : null}
          </View>
        ) : (
          <>
            <Step n={++n} done={draft.opened} title="Open the app">
              <Button
                label="Open in Google Play"
                icon="logo-google-playstore"
                variant="secondary"
                size="sm"
                fullWidth={false}
                onPress={() => {
                  onChange({ opened: true });
                  void openInPlay(task.packageName);
                }}
              />
            </Step>

            <Step n={++n} done={draft.did} title="Do today’s task">
              <PressableScale
                onPress={() => onChange({ did: !draft.did })}
                haptic="select"
                accessibilityRole="checkbox"
                accessibilityState={{ checked: draft.did }}
                style={[styles.didRow, { borderColor: theme.colors.border }]}
              >
                <Text variant="bodySm" style={{ flex: 1 }}>
                  I did today’s task in the app
                </Text>
                <Icon name={draft.did ? 'checkbox' : 'square-outline'} size={22} color={draft.did ? 'accent' : 'textFaint'} />
              </PressableScale>
            </Step>

            {task.requiresScreenshot ? (
              <Step n={++n} done={!!draft.screenshotFileId} title="Upload a screenshot">
                {draft.localUri ? (
                  <View>
                    <Image source={{ uri: draft.localUri }} style={styles.preview} contentFit="cover" />
                    {draft.uploading ? (
                      <View style={[styles.uploading, { backgroundColor: theme.colors.overlay }]}>
                        <Text variant="caption" style={{ color: '#fff' }}>
                          Uploading…
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}
                <View style={styles.row}>
                  <Button label="Camera" icon="camera-outline" size="sm" variant="secondary" fullWidth={false} onPress={() => onPickScreenshot('camera')} disabled={draft.uploading} />
                  <Button label={draft.localUri ? 'Replace' : 'Gallery'} icon="image-outline" size="sm" variant="secondary" fullWidth={false} onPress={() => onPickScreenshot('library')} disabled={draft.uploading} />
                </View>
              </Step>
            ) : null}

            <Step n={++n} done={task.question ? !!draft.answer.trim() : !!draft.note.trim()} title={task.question ? 'Answer today’s question' : 'Add a note (optional)'}>
              {task.question ? (
                <Input label={task.question} multiline value={draft.answer} onChangeText={(answer) => onChange({ answer })} maxLength={1000} />
              ) : (
                <Input placeholder="Anything worth mentioning?" multiline value={draft.note} onChangeText={(note) => onChange({ note })} maxLength={1000} />
              )}
            </Step>

            <Step n={++n} done={false} title="Report a bug or give feedback (optional)">
              <Button
                label="Send feedback"
                icon="chatbubble-ellipses-outline"
                size="sm"
                variant="ghost"
                fullWidth={false}
                onPress={() => router.push({ pathname: '/feedback/new', params: { appId: task.appId, taskId: task.$id, appName: task.appName } })}
              />
            </Step>

            <Button
              label="Complete task"
              icon="checkmark-done"
              onPress={onComplete}
              loading={completing}
              disabled={!canComplete(task, draft)}
              haptic="success"
              accessibilityHint="Submits today’s proof and earns points"
            />
          </>
        )}

        {onPrev || onNext ? (
          <View style={styles.nav}>
            <Button label="Previous" icon="chevron-back" variant="ghost" size="sm" fullWidth={false} onPress={onPrev} disabled={!onPrev} />
            <Button label="Next" iconRight="chevron-forward" variant="ghost" size="sm" fullWidth={false} onPress={onNext} disabled={!onNext} />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, borderRadius: radii.xxl, borderWidth: 1, overflow: 'hidden' },
  content: { padding: space.xl, gap: space.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  instruction: { borderRadius: radii.lg, padding: space.lg, gap: space.xs },
  step: { gap: space.sm },
  stepHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  stepBody: { marginLeft: 24 + space.md, gap: space.sm },
  didRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderWidth: 1, borderRadius: radii.md, padding: space.md },
  row: { flexDirection: 'row', gap: space.sm },
  preview: { width: '100%', height: 220, borderRadius: radii.md },
  uploading: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  nav: { flexDirection: 'row', justifyContent: 'space-between' },
});
