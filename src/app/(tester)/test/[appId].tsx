import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { StaggerIn } from '@/components/motion/StaggerIn';
import { Avatar, Badge, Button, Card, EmptyState, Header, Icon, ListRow, Screen, SkeletonCardList, Text } from '@/components/ui';
import { ENROLLMENT_STATUS, StreakStrip } from '@/features/apps/components/AppBits';
import { useDomainConfig } from '@/features/config/configApi';
import { JoinChecklist } from '@/features/tests/JoinChecklist';
import { useClaimTestMutation, useEnrollmentTasksQuery, useMyEnrollmentsQuery, useOpenTestQuery, usePlanPreviewQuery } from '@/features/tests/testsApi';
import { useEligibility } from '@/features/tests/useEligibility';
import { useToast } from '@/features/ui/useToast';
import { useRequireRole } from '@/navigation/guards';
import { useAppSelector } from '@/store/hooks';
import { space } from '@/theme/tokens';

export default function TestDetail() {
  useRequireRole('tester');
  const { appId } = useLocalSearchParams<{ appId: string }>();
  const toast = useToast();
  const cfg = useDomainConfig();
  const userId = useAppSelector((s) => s.auth.userId) ?? '';
  const app = useOpenTestQuery(appId);
  const plan = usePlanPreviewQuery(appId);
  const enrollments = useMyEnrollmentsQuery(userId, { skip: !userId });
  const enrollment = (enrollments.data ?? []).find((e) => e.appId === appId);
  const history = useEnrollmentTasksQuery(enrollment?.$id ?? '', { skip: !enrollment });
  const { check } = useEligibility();
  const [claim, claimState] = useClaimTestMutation();
  const [checklist, setChecklist] = useState(false);
  const [showPlan, setShowPlan] = useState(false);

  // An enrolled tester can still see the app after it leaves "Available" (from the enrollment copy).
  if (app.isLoading) {
    return (
      <Screen>
        <Header title="" back />
        <SkeletonCardList count={3} />
      </Screen>
    );
  }
  const a = app.data;
  if (!a) {
    return (
      <Screen>
        <Header title={enrollment?.appName ?? 'Test'} back />
        {enrollment ? (
          <Card>
            <Text variant="bodySm" color="textMuted">
              This test is no longer listed. Your progress:
            </Text>
            <View style={{ marginTop: space.sm }}>
              <StreakStrip history={enrollment.dayHistory} days={cfg.TEST_DAYS} />
            </View>
          </Card>
        ) : (
          <EmptyState title="Test not available" message="It may be full, paused or finished." icon="alert-circle-outline" />
        )}
      </Screen>
    );
  }

  const eligibility = check(a);
  const doClaim = async () => {
    try {
      const res = await claim({ appId }).unwrap();
      toast.success(res.testStarted ? 'You’re in — day 1 starts today!' : 'Slot claimed! We’ll tell you when the test starts.');
      setChecklist(true);
    } catch (e) {
      toast.error(e);
    }
  };

  const footer = enrollment ? (
    <Button label="Join steps (opt-in & install)" variant="secondary" icon="list-outline" onPress={() => setChecklist(true)} />
  ) : (
    <>
      {eligibility.message ? (
        <Text variant="caption" color="warning" align="center">
          {eligibility.message}
        </Text>
      ) : null}
      <Button label="Claim test" icon="hand-right-outline" onPress={doClaim} loading={claimState.isLoading} disabled={!!eligibility.blocker} haptic="heavy" />
    </>
  );

  return (
    <Screen footer={footer}>
      <Header title="" back />
      <StaggerIn index={0} style={styles.hero}>
        <Avatar name={a.name} fileId={a.iconFileId} bucket="appIcons" size={72} rounded="squircle" />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="h1" numberOfLines={2}>
            {a.name}
          </Text>
          <Text variant="caption" color="textMuted">
            by {a.ownerName || 'a developer'}
          </Text>
        </View>
      </StaggerIn>
      <StaggerIn index={1}>
        <Text variant="body" color="textMuted">
          {a.shortDescription}
        </Text>
      </StaggerIn>

      <StaggerIn index={2} style={styles.badges}>
        <Badge label={`${a.slotsOpen} slots left`} tone="accent" icon="people-outline" />
        <Badge label={`${cfg.TEST_DAYS} days · ~3 min/day`} icon="time-outline" />
        {a.minAndroidVersion ? <Badge label={`Android ${a.minAndroidVersion}+`} icon="logo-android" /> : null}
        {a.minReputation ? <Badge label={`Reputation ${a.minReputation}+`} icon="shield-checkmark-outline" /> : null}
      </StaggerIn>

      {enrollment ? (
        <StaggerIn index={3}>
          <Card>
            <View style={{ gap: space.md }}>
              <View style={styles.between}>
                <Text variant="h3">Your progress</Text>
                <Badge label={ENROLLMENT_STATUS[enrollment.status].label} tone={ENROLLMENT_STATUS[enrollment.status].tone} />
              </View>
              <StreakStrip history={enrollment.dayHistory} days={cfg.TEST_DAYS} size={14} />
              <Text variant="caption" color="textMuted">
                {enrollment.tasksCompleted} of {cfg.TEST_DAYS} days completed · {enrollment.streak}-day streak
              </Text>
            </View>
          </Card>
        </StaggerIn>
      ) : null}

      {a.generalInstructions ? (
        <Card tone="alt">
          <Text variant="label" color="textFaint">
            From the developer
          </Text>
          <Text variant="bodySm" style={{ marginTop: space.xs }}>
            {a.generalInstructions}
          </Text>
        </Card>
      ) : null}

      {enrollment && (history.data ?? []).length ? (
        <View style={{ gap: space.sm }}>
          <Text variant="h3">Your days</Text>
          {(history.data ?? []).map((t) => (
            <ListRow
              key={t.$id}
              icon={t.status === 'completed' ? 'checkmark-circle' : t.status === 'missed' ? 'close-circle' : t.status === 'flagged' ? 'flag' : 'ellipse-outline'}
              title={`Day ${t.dayNumber} · ${t.title}`}
              subtitle={t.status}
              onPress={() => router.push({ pathname: '/task/[taskId]', params: { taskId: t.$id } })}
            />
          ))}
        </View>
      ) : (
        <View style={{ gap: space.sm }}>
          <ListRow icon="list-outline" title="14-day test plan" subtitle="What you’ll do each day" onPress={() => setShowPlan(!showPlan)} chevron={false} right={<Icon name={showPlan ? 'chevron-up' : 'chevron-down'} size={18} color="textFaint" />} />
          {showPlan
            ? (plan.data ?? []).map((d) => (
                <StaggerIn key={d.$id} index={d.dayNumber}>
                  <View style={styles.planRow}>
                    <Text variant="caption" color="accent" style={styles.day}>
                      Day {d.dayNumber}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodySm">{d.title}</Text>
                      <Text variant="caption" color="textMuted">
                        {d.instruction}
                      </Text>
                    </View>
                  </View>
                </StaggerIn>
              ))
            : null}
        </View>
      )}

      {enrollment ? (
        <Button
          label="Send feedback"
          icon="chatbubble-ellipses-outline"
          variant="ghost"
          onPress={() => router.push({ pathname: '/feedback/new', params: { appId: a.$id, appName: a.name } })}
        />
      ) : null}

      <JoinChecklist
        app={a}
        visible={checklist}
        onClose={() => setChecklist(false)}
        onDone={() => {
          setChecklist(false);
          router.replace('/today');
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planRow: { flexDirection: 'row', gap: space.md, paddingVertical: space.xs },
  day: { width: 52 },
});
