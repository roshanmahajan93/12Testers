import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Avatar, Badge, Button, Card, Chip, EmptyState, Header, Input, Screen, SegmentedControl, Sheet, SkeletonRows, Text } from '@/components/ui';
import { FileImage } from '@/components/ui/FileImage';
import { ENROLLMENT_STATUS, StreakStrip } from '@/features/apps/components/AppBits';
import { useAppEnrollmentsQuery, useAppTasksQuery, useFlagTaskMutation } from '@/features/apps/appsApi';
import { useDomainConfig } from '@/features/config/configApi';
import { useToast } from '@/features/ui/useToast';
import type { DailyTask, Enrollment } from '@/lib/domain/types';
import { friendlyDate } from '@/lib/format';
import { useRequireRole } from '@/navigation/guards';
import { space } from '@/theme/tokens';

type Tab = 'testers' | 'shots';

function TaskProof({ task, onFlag }: { task: DailyTask; onFlag: (t: DailyTask) => void }) {
  return (
    <Card tone="alt">
      <View style={{ gap: space.sm }}>
        <View style={styles.between}>
          <Text variant="bodyStrong">
            Day {task.dayNumber} · {task.title}
          </Text>
          <Badge
            label={task.status}
            tone={task.status === 'completed' ? 'success' : task.status === 'missed' ? 'danger' : task.status === 'flagged' ? 'warning' : 'neutral'}
          />
        </View>
        {task.screenshotFileId ? <FileImage bucket="taskScreenshots" fileId={task.screenshotFileId} style={styles.proof} /> : null}
        {task.question && task.answer ? (
          <Text variant="bodySm">
            <Text variant="bodySm" color="textMuted">
              Q: {task.question}
              {'\n'}
            </Text>
            {task.answer}
          </Text>
        ) : null}
        {task.note ? (
          <Text variant="bodySm" color="textMuted">
            “{task.note}”
          </Text>
        ) : null}
        {task.flagReason ? (
          <Text variant="caption" color="warning">
            Flagged: {task.flagReason}
          </Text>
        ) : null}
        {task.completedAt ? (
          <Text variant="caption" color="textFaint">
            {friendlyDate(task.completedAt)}
          </Text>
        ) : null}
        {task.status === 'completed' ? <Button label="Flag this proof" variant="ghost" size="sm" icon="flag-outline" fullWidth={false} onPress={() => onFlag(task)} /> : null}
      </View>
    </Card>
  );
}

export default function AppTesters() {
  useRequireRole('developer');
  const { id, tab: initialTab } = useLocalSearchParams<{ id: string; tab?: Tab }>();
  const cfg = useDomainConfig();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>(initialTab === 'shots' ? 'shots' : 'testers');
  const [selected, setSelected] = useState<Enrollment | null>(null);
  const [flagging, setFlagging] = useState<DailyTask | null>(null);
  const [reason, setReason] = useState('');
  const [day, setDay] = useState(1);
  const enrollments = useAppEnrollmentsQuery(id);
  const tasks = useAppTasksQuery({ appId: id });
  const [flagTask, flagState] = useFlagTaskMutation();

  const byEnrollment = useMemo(() => {
    const m = new Map<string, DailyTask[]>();
    for (const t of tasks.data ?? []) m.set(t.enrollmentId, [...(m.get(t.enrollmentId) ?? []), t]);
    for (const list of m.values()) list.sort((a, b) => b.dayNumber - a.dayNumber);
    return m;
  }, [tasks.data]);

  const dayShots = (tasks.data ?? []).filter((t) => t.dayNumber === day && t.screenshotFileId);
  const sorted = [...(enrollments.data ?? [])].sort((a, b) => Number(a.status === 'dropped') - Number(b.status === 'dropped'));

  const submitFlag = async () => {
    if (!flagging) return;
    try {
      await flagTask({ taskId: flagging.$id, reason: reason.trim(), appId: id }).unwrap();
      toast.success('Flagged. The tester was notified and their reputation adjusted.');
      setFlagging(null);
      setReason('');
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <Screen scroll={false}>
      <Header title="Testers" back subtitle={`${sorted.filter((e) => e.status === 'active' || e.status === 'warned').length} active`} />
      <SegmentedControl<Tab>
        value={tab}
        onChange={setTab}
        segments={[
          { value: 'testers', label: 'Testers' },
          { value: 'shots', label: 'Screenshots' },
        ]}
      />
      {enrollments.isLoading || tasks.isLoading ? (
        <SkeletonRows count={6} />
      ) : tab === 'testers' ? (
        <FlashList
          data={sorted}
          keyExtractor={(e) => e.$id}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListEmptyComponent={<EmptyState title="No testers yet" message="Testers appear here as soon as they claim a slot." icon="people-outline" />}
          renderItem={({ item: e }) => (
            <Card onPress={() => setSelected(e)} style={{ marginBottom: space.sm }} accessibilityLabel={e.testerName}>
              <View style={{ gap: space.sm }}>
                <View style={styles.testerHead}>
                  <Avatar name={e.testerName} fileId={e.testerAvatarFileId} size={40} />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong">{e.testerName}</Text>
                    <Text variant="caption" color="textMuted">
                      {e.testerDevice ?? 'Android'} · rep {e.testerReputation}
                    </Text>
                  </View>
                  <Badge label={ENROLLMENT_STATUS[e.status].label} tone={ENROLLMENT_STATUS[e.status].tone} />
                </View>
                <StreakStrip history={e.dayHistory} days={cfg.TEST_DAYS} />
              </View>
            </Card>
          )}
        />
      ) : (
        <View style={{ flex: 1, gap: space.md }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }} style={{ flexGrow: 0 }}>
            {Array.from({ length: cfg.TEST_DAYS }, (_, i) => (
              <Chip key={i} label={`Day ${i + 1}`} selected={day === i + 1} onPress={() => setDay(i + 1)} />
            ))}
          </ScrollView>
          <FlashList
            data={dayShots}
            numColumns={2}
            keyExtractor={(t) => t.$id}
            ListEmptyComponent={<EmptyState title={`No screenshots for day ${day} yet`} icon="images-outline" />}
            renderItem={({ item }) => (
              <View style={styles.shotCell}>
                <FileImage bucket="taskScreenshots" fileId={item.screenshotFileId!} style={styles.shot} width={300} />
                <Text variant="caption" color="textMuted" numberOfLines={1}>
                  {(enrollments.data ?? []).find((e) => e.$id === item.enrollmentId)?.testerName ?? 'Tester'}
                </Text>
              </View>
            )}
          />
        </View>
      )}

      <Sheet visible={!!selected} onClose={() => setSelected(null)} title={selected?.testerName}>
        {selected ? (
          <ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ gap: space.sm }}>
            {(byEnrollment.get(selected.$id) ?? []).length === 0 ? (
              <Text variant="bodySm" color="textMuted">
                No tasks yet — tasks start once the test begins.
              </Text>
            ) : (
              (byEnrollment.get(selected.$id) ?? []).map((t) => (
                <TaskProof
                  key={t.$id}
                  task={t}
                  onFlag={(task) => {
                    setSelected(null);
                    setFlagging(task);
                  }}
                />
              ))
            )}
          </ScrollView>
        ) : null}
      </Sheet>

      <Sheet visible={!!flagging} onClose={() => setFlagging(null)} title="Flag this proof">
        <Text variant="bodySm" color="textMuted">
          Flag low-effort or fake proofs. The tester loses {cfg.FLAG_POINTS_PENALTY} points and some reputation. Please be fair.
        </Text>
        <Input label="Reason" placeholder="e.g. Screenshot is from another app" value={reason} onChangeText={setReason} maxLength={300} />
        <Button label="Flag task" variant="danger" disabled={reason.trim().length < 3} loading={flagState.isLoading} onPress={submitFlag} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  testerHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  proof: { width: '100%', aspectRatio: 9 / 16, maxHeight: 360 },
  shotCell: { flex: 1, padding: space.xs, gap: space.xs },
  shot: { width: '100%', aspectRatio: 9 / 16 },
});
