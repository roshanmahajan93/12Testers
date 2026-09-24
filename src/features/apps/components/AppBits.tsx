import { StyleSheet, View } from 'react-native';

import { ProgressRing } from '@/components/motion/ProgressRing';
import { Avatar, Badge, Card, Icon, Text, type BadgeTone } from '@/components/ui';
import { useDomainConfig } from '@/features/config/configApi';
import { appProgress } from '@/lib/domain/rules';
import { localDateKey } from '@/lib/domain/time';
import type { App, AppStatus, EnrollmentStatus } from '@/lib/domain/types';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

export const APP_STATUS: Record<AppStatus, { label: string; tone: BadgeTone }> = {
  draft: { label: 'Draft', tone: 'neutral' },
  recruiting: { label: 'Recruiting', tone: 'info' },
  testing: { label: 'Testing', tone: 'accent' },
  completed: { label: 'Completed', tone: 'success' },
  paused: { label: 'Paused', tone: 'warning' },
};

export const ENROLLMENT_STATUS: Record<EnrollmentStatus, { label: string; tone: BadgeTone }> = {
  joined: { label: 'Waiting to start', tone: 'info' },
  active: { label: 'Active', tone: 'success' },
  warned: { label: 'At risk', tone: 'warning' },
  dropped: { label: 'Dropped', tone: 'danger' },
  completed: { label: 'Completed', tone: 'accent' },
};

export function AppStatusBadge({ status }: { status: AppStatus }) {
  const s = APP_STATUS[status];
  return <Badge label={s.label} tone={s.tone} />;
}

export function useAppProgress(app: App) {
  const cfg = useDomainConfig();
  const today = localDateKey(new Date(), 'UTC');
  return appProgress(app, today, app.testStartDate, cfg);
}

/** 14 dots: completed / missed / flagged / pending / future. */
export function StreakStrip({ history, days, size = 10 }: { history: string; days: number; size?: number }) {
  const { colors, accent } = useTheme();
  const chars = (history || '').padEnd(days, '-').slice(0, days).split('');
  const color = (c: string) =>
    c === 'c' ? accent.primary : c === 'm' ? colors.danger : c === 'f' ? colors.warning : c === 'p' ? colors.borderStrong : colors.surfaceAlt;
  const done = chars.filter((c) => c === 'c').length;
  return (
    <View style={styles.strip} accessible accessibilityLabel={`${done} of ${days} days completed`}>
      {chars.map((c, i) => (
        <View
          key={i}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color(c),
            borderWidth: c === 'p' ? 1.5 : 0,
            borderColor: accent.primary,
          }}
        />
      ))}
    </View>
  );
}

export function AppIdentity({ app, size = 48 }: { app: Pick<App, 'name' | 'packageName' | 'iconFileId'>; size?: number }) {
  return (
    <View style={styles.identity}>
      <Avatar name={app.name} fileId={app.iconFileId} bucket="appIcons" size={size} rounded="squircle" />
      <View style={{ flex: 1 }}>
        <Text variant="h3" numberOfLines={1}>
          {app.name}
        </Text>
        <Text variant="caption" color="textFaint" numberOfLines={1}>
          {app.packageName}
        </Text>
      </View>
    </View>
  );
}

/** Dashboard card: testers ring (x/12) + days ring (x/14). */
export function AppProgressCard({ app, onPress, index = 0 }: { app: App; onPress: () => void; index?: number }) {
  const p = useAppProgress(app);
  const cfg = useDomainConfig();
  const filled = app.testersNeeded - app.slotsOpen;
  return (
    <Card onPress={onPress} accessibilityLabel={`${app.name}, ${APP_STATUS[app.status].label}`}>
      <View style={{ gap: space.lg }}>
        <View style={styles.header}>
          <AppIdentity app={app} size={44} />
          <AppStatusBadge status={app.status} />
        </View>
        <View style={styles.rings}>
          <View style={styles.ringCol}>
            <ProgressRing progress={p.testers / p.testersRequired} size={84} stroke={9} delay={index * 80} accessibilityLabel="Testers">
              <Text variant="h3">{p.testers}</Text>
              <Text variant="caption" color="textFaint">
                /{p.testersRequired}
              </Text>
            </ProgressRing>
            <Text variant="caption" color="textMuted">
              Testers
            </Text>
          </View>
          <View style={styles.ringCol}>
            <ProgressRing progress={p.day / p.days} size={84} stroke={9} delay={index * 80 + 120} accessibilityLabel="Days">
              <Text variant="h3">{p.day}</Text>
              <Text variant="caption" color="textFaint">
                /{p.days}
              </Text>
            </ProgressRing>
            <Text variant="caption" color="textMuted">
              Days
            </Text>
          </View>
          <View style={styles.meta}>
            {app.status === 'recruiting' ? (
              <Text variant="bodySm" color="textMuted">
                {filled} of {app.testersNeeded} slots filled. The test starts at {cfg.TESTERS_REQUIRED} testers.
              </Text>
            ) : app.status === 'completed' ? (
              <Text variant="bodySm" color="success">
                Requirement met — open the production checklist.
              </Text>
            ) : (
              <Text variant="bodySm" color="textMuted">
                {app.testersActive} active · {app.testersCompleted} finished
              </Text>
            )}
            <View style={styles.more}>
              <Text variant="caption" color="accent">
                Details
              </Text>
              <Icon name="chevron-forward" size={14} color="accent" />
            </View>
          </View>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  identity: { flexDirection: 'row', alignItems: 'center', gap: space.md, flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  rings: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  ringCol: { alignItems: 'center', gap: space.xs },
  meta: { flex: 1, gap: space.sm },
  more: { flexDirection: 'row', alignItems: 'center', gap: 2 },
});
