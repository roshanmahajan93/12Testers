import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ProgressRing } from '@/components/motion/ProgressRing';
import { StaggerIn } from '@/components/motion/StaggerIn';
import { Avatar, Button, Card, EmptyState, Header, IconButton, ListRow, ProgressBar, Screen, Sheet, SkeletonCardList, Text } from '@/components/ui';
import { AppIdentity, AppStatusBadge, StreakStrip, useAppProgress } from '@/features/apps/components/AppBits';
import { ProductionChecklist } from '@/features/apps/components/ProductionChecklist';
import { useAppEnrollmentsQuery, useAppFeedbackQuery, useAppQuery, useAppTasksQuery, useManageAppMutation } from '@/features/apps/appsApi';
import { useDomainConfig } from '@/features/config/configApi';
import { useToast } from '@/features/ui/useToast';
import { addDaysToKey, localDateKey } from '@/lib/domain/time';
import type { App, DailyTask, Enrollment } from '@/lib/domain/types';
import { useRequireRole } from '@/navigation/guards';
import { space } from '@/theme/tokens';

/** For each live tester, their latest task decides whether they're "done today". */
function todayCompletion(enrollments: Enrollment[], tasks: DailyTask[]) {
  const live = enrollments.filter((e) => e.status === 'active' || e.status === 'warned');
  const latest = new Map<string, DailyTask>();
  for (const t of tasks) {
    const prev = latest.get(t.enrollmentId);
    if (!prev || t.dueDate > prev.dueDate) latest.set(t.enrollmentId, t);
  }
  const done = live.filter((e) => {
    const t = latest.get(e.$id);
    return t?.status === 'completed' || t?.status === 'flagged';
  }).length;
  return { done, total: live.length };
}

function Overview({ app }: { app: App }) {
  const p = useAppProgress(app);
  const cfg = useDomainConfig();
  const filled = app.testersNeeded - app.slotsOpen;
  return (
    <Card>
      <View style={styles.rings}>
        <View style={styles.ringCol}>
          <ProgressRing progress={p.testers / p.testersRequired} size={110} stroke={12} accessibilityLabel="Testers">
            <Text variant="h2">{p.testers}</Text>
            <Text variant="caption" color="textFaint">
              of {p.testersRequired}
            </Text>
          </ProgressRing>
          <Text variant="caption" color="textMuted">
            Testers
          </Text>
        </View>
        <View style={styles.ringCol}>
          <ProgressRing progress={p.day / p.days} size={110} stroke={12} delay={150} accessibilityLabel="Days">
            <Text variant="h2">{p.day}</Text>
            <Text variant="caption" color="textFaint">
              of {p.days} days
            </Text>
          </ProgressRing>
          <Text variant="caption" color="textMuted">
            Test day
          </Text>
        </View>
      </View>
      {app.status === 'recruiting' ? (
        <View style={{ gap: space.sm, marginTop: space.lg }}>
          <Text variant="bodySm" color="textMuted">
            {filled} of {app.testersNeeded} slots filled — the 14 days start when {cfg.TESTERS_REQUIRED} testers join.
          </Text>
          <ProgressBar value={filled / cfg.TESTERS_REQUIRED} label="Recruiting progress" />
        </View>
      ) : null}
    </Card>
  );
}

export default function OwnerAppDashboard() {
  useRequireRole('developer');
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const app = useAppQuery(id);
  const enrollments = useAppEnrollmentsQuery(id);
  const since = addDaysToKey(localDateKey(new Date(), 'UTC'), -2);
  const tasks = useAppTasksQuery({ appId: id, since });
  const feedback = useAppFeedbackQuery(id);
  const [manage, manageState] = useManageAppMutation();
  const [menu, setMenu] = useState(false);

  const completion = useMemo(() => todayCompletion(enrollments.data ?? [], tasks.data ?? []), [enrollments.data, tasks.data]);
  const p = app.data;

  const refresh = () => {
    void app.refetch();
    void enrollments.refetch();
    void tasks.refetch();
    void feedback.refetch();
  };

  const act = async (action: 'pause' | 'resume' | 'cancel') => {
    try {
      await manage({ appId: id, action }).unwrap();
      toast.success(action === 'pause' ? 'Paused — testers can’t claim new slots.' : action === 'resume' ? 'Resumed' : 'Listing cancelled and credits refunded.');
      setMenu(false);
    } catch (e) {
      toast.error(e);
    }
  };

  if (app.isLoading) {
    return (
      <Screen>
        <Header title="" back />
        <SkeletonCardList count={3} height={150} />
      </Screen>
    );
  }
  if (!p) {
    return (
      <Screen>
        <Header title="App" back />
        <EmptyState title="App not found" message="It may have been deleted." icon="alert-circle-outline" />
      </Screen>
    );
  }

  const live = (enrollments.data ?? []).filter((e) => e.status !== 'dropped').slice(0, 5);
  const newFeedback = (feedback.data ?? []).filter((f) => !f.ownerRating).length;

  return (
    <Screen refreshing={app.isFetching && !app.isLoading} onRefresh={refresh}>
      <Header title="" back right={<IconButton icon="ellipsis-horizontal" label="App actions" onPress={() => setMenu(true)} />} />
      <StaggerIn index={0} style={styles.identity}>
        <AppIdentity app={p} size={56} />
        <AppStatusBadge status={p.status} />
      </StaggerIn>

      <StaggerIn index={1}>
        <Overview app={p} />
      </StaggerIn>

      {p.status === 'testing' ? (
        <StaggerIn index={2}>
          <Card tone="accent">
            <Text variant="h3">
              {completion.done} of {completion.total} testers done today
            </Text>
            <View style={{ marginTop: space.sm }}>
              <ProgressBar value={completion.total ? completion.done / completion.total : 0} label="Today's completion" />
            </View>
          </Card>
        </StaggerIn>
      ) : null}

      <StaggerIn index={3} style={{ gap: space.sm }}>
        <View style={styles.sectionHead}>
          <Text variant="h3">Testers</Text>
          <Button label="See all" variant="ghost" size="sm" fullWidth={false} onPress={() => router.push({ pathname: '/app/[id]/testers', params: { id } })} />
        </View>
        {live.length === 0 ? (
          <Text variant="bodySm" color="textMuted">
            No testers yet. We notify matching testers when you list — share your listing to speed it up.
          </Text>
        ) : (
          live.map((e) => (
            <View key={e.$id} style={styles.testerRow}>
              <Avatar name={e.testerName} fileId={e.testerAvatarFileId} size={36} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {e.testerName}
                </Text>
                <StreakStrip history={e.dayHistory} days={14} size={8} />
              </View>
            </View>
          ))
        )}
      </StaggerIn>

      <StaggerIn index={4} style={{ gap: space.sm }}>
        <ListRow
          icon="chatbubbles-outline"
          title="Feedback inbox"
          subtitle={`${feedback.data?.length ?? 0} reports${newFeedback ? ` · ${newFeedback} unrated` : ''}`}
          onPress={() => router.push({ pathname: '/app/[id]/feedback', params: { id } })}
        />
        <ListRow icon="images-outline" title="Screenshots & daily proofs" onPress={() => router.push({ pathname: '/app/[id]/testers', params: { id, tab: 'shots' } })} />
        <ListRow icon="list-outline" title="Test plan" subtitle="Edit upcoming days any time" onPress={() => router.push({ pathname: '/app/[id]/test-plan', params: { id } })} />
      </StaggerIn>

      <StaggerIn index={5}>
        <ProductionChecklist appId={id} unlocked={p.status === 'completed'} />
      </StaggerIn>

      <Sheet visible={menu} onClose={() => setMenu(false)} title={p.name}>
        <View style={{ gap: space.sm }}>
          <Button
            label="Copy opt-in link"
            variant="secondary"
            icon="link-outline"
            onPress={() => {
              void Clipboard.setStringAsync(p.optInUrl);
              toast.success('Opt-in link copied');
            }}
          />
          {p.status === 'recruiting' || p.status === 'testing' ? (
            <Button label="Pause listing" variant="secondary" icon="pause" loading={manageState.isLoading} onPress={() => void act('pause')} />
          ) : null}
          {p.status === 'paused' ? <Button label="Resume listing" icon="play" loading={manageState.isLoading} onPress={() => void act('resume')} /> : null}
          {!p.testStartDate && (p.status === 'recruiting' || p.status === 'paused') ? (
            <Button label="Cancel listing & refund" variant="danger" icon="close-circle-outline" loading={manageState.isLoading} onPress={() => void act('cancel')} />
          ) : null}
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  rings: { flexDirection: 'row', justifyContent: 'space-around' },
  ringCol: { alignItems: 'center', gap: space.sm },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  testerRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
