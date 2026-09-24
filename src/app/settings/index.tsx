import * as Application from 'expo-application';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button, Chip, Header, Input, ListGroup, ListRow, Screen, SegmentedControl, Sheet, Text, Toggle } from '@/components/ui';
import { useDeleteAccountMutation } from '@/features/account/accountApi';
import { SignOutRow } from '@/features/account/SignOutRow';
import { parsePrefs, useMyProfile, useUpdateProfileMutation } from '@/features/profile/profileApi';
import { hapticsToggled, motionPrefChanged, reminderTimeChanged, themeModeChanged, type MotionPref } from '@/features/settings/settingsSlice';
import { useToast } from '@/features/ui/useToast';
import { APP_NAME, PUBLISHER } from '@/lib/constants';
import type { NotificationPrefs } from '@/lib/domain/types';
import { env } from '@/lib/env';
import { getPermissionState, requestPermission, type PermissionState } from '@/services/notifications/permissions';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import type { ThemeMode } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

const REMINDER_TIMES = ['08:00', '12:00', '17:00', '19:00', '21:00'];

function PrefRow({ title, subtitle, value, onChange }: { title: string; subtitle?: string; value: boolean; onChange: (v: boolean) => void }) {
  return <ListRow title={title} subtitle={subtitle} right={<Toggle label={title} value={value} onChange={onChange} />} chevron={false} />;
}

export default function Settings() {
  const dispatch = useAppDispatch();
  const toast = useToast();
  const settings = useAppSelector((s) => s.settings);
  const role = useAppSelector((s) => s.auth.role);
  const { data: profile } = useMyProfile();
  const [update] = useUpdateProfileMutation();
  const [deleteAccount, deleteState] = useDeleteAccountMutation();
  const [perm, setPerm] = useState<PermissionState>('undetermined');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirm, setConfirm] = useState('');
  const prefs = parsePrefs(profile?.notificationPrefs);

  useEffect(() => {
    void getPermissionState().then(setPerm);
  }, []);

  const setPref = async (patch: Partial<NotificationPrefs>) => {
    if (!profile) return;
    try {
      await update({ userId: profile.userId, notificationPrefs: { ...prefs, ...patch } }).unwrap();
    } catch (e) {
      toast.error(e);
    }
  };

  const openUrl = (url: string) => (url ? void Linking.openURL(url) : toast.info('Link not configured yet.'));

  return (
    <Screen>
      <Header title="Settings" back />

      <ListGroup title="Appearance">
        <View style={styles.block}>
          <Text variant="caption" color="textMuted">
            Theme
          </Text>
          <SegmentedControl<ThemeMode>
            value={settings.themeMode}
            onChange={(v) => dispatch(themeModeChanged(v))}
            segments={[
              { value: 'system', label: 'System' },
              { value: 'dark', label: 'Dark' },
              { value: 'light', label: 'Light' },
            ]}
          />
          <Text variant="caption" color="textMuted">
            Motion
          </Text>
          <SegmentedControl<MotionPref>
            value={settings.motion}
            onChange={(v) => dispatch(motionPrefChanged(v))}
            segments={[
              { value: 'system', label: 'System' },
              { value: 'reduced', label: 'Reduced' },
              { value: 'full', label: 'Full' },
            ]}
          />
        </View>
        <PrefRow title="Haptics" value={settings.haptics} onChange={(v) => dispatch(hapticsToggled(v))} />
      </ListGroup>

      <ListGroup title="Notifications">
        {perm !== 'granted' ? (
          <ListRow
            icon="notifications-off-outline"
            title="Notifications are off"
            subtitle="Tap to allow — you won’t get task reminders or drop-out warnings."
            onPress={async () => {
              const next = await requestPermission();
              setPerm(next);
              if (next !== 'granted') void Linking.openSettings();
            }}
          />
        ) : null}
        {role === 'tester' ? (
          <>
            <PrefRow title="Daily tasks ready" value={prefs.dailyTasks} onChange={(v) => void setPref({ dailyTasks: v })} />
            <PrefRow title="Pending task reminder" subtitle="Only if you still have tasks left" value={prefs.reminders} onChange={(v) => void setPref({ reminders: v })} />
            {prefs.reminders ? (
              <View style={styles.block}>
                <Text variant="caption" color="textMuted">
                  Reminder time
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
                  {REMINDER_TIMES.map((t) => (
                    <Chip
                      key={t}
                      label={t}
                      selected={prefs.reminderTime === t}
                      onPress={() => {
                        dispatch(reminderTimeChanged(t));
                        void setPref({ reminderTime: t });
                      }}
                    />
                  ))}
                </ScrollView>
              </View>
            ) : null}
            <PrefRow title="Test updates" subtitle="New matching tests, completions, warnings" value={prefs.testerActivity} onChange={(v) => void setPref({ testerActivity: v })} />
          </>
        ) : (
          <>
            <PrefRow title="Tester activity" subtitle="Joins, drop-outs, test started, daily summary" value={prefs.testerActivity} onChange={(v) => void setPref({ testerActivity: v })} />
            <PrefRow title="New feedback" value={prefs.feedback} onChange={(v) => void setPref({ feedback: v })} />
          </>
        )}
      </ListGroup>

      <ListGroup title="About">
        <ListRow icon="shield-outline" title="Privacy policy" onPress={() => openUrl(env.privacyUrl)} />
        <ListRow icon="document-text-outline" title="Terms of service" onPress={() => openUrl(env.termsUrl)} />
        {__DEV__ ? <ListRow icon="color-palette-outline" title="Motion playground" subtitle="Dev only" onPress={() => router.push('/dev/playground')} /> : null}
        <ListRow
          icon="information-circle-outline"
          title={`${APP_NAME} ${Application.nativeApplicationVersion ?? ''}`}
          subtitle={`Build ${Application.nativeBuildVersion ?? '—'} · by ${PUBLISHER}`}
          chevron={false}
        />
      </ListGroup>

      <ListGroup title="Account">
        <SignOutRow />
        <ListRow icon="trash-outline" title="Delete account" subtitle="Permanently remove your account and data" destructive onPress={() => setDeleteOpen(true)} />
        {env.accountDeletionUrl ? <ListRow icon="globe-outline" title="Delete on the web" onPress={() => openUrl(env.accountDeletionUrl)} /> : null}
      </ListGroup>

      <Sheet visible={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete your account?">
        <Text variant="body" color="textMuted">
          {role === 'developer'
            ? 'Your apps, test plans, tester progress, feedback and credit history are deleted. Active tests end and their testers are notified. Unused credits are lost.'
            : 'Your tests, tasks, screenshots, feedback and points are deleted. Active tests are released without a penalty.'}{' '}
          This can’t be undone. Subscriptions must be cancelled separately in Google Play.
        </Text>
        <Input label='Type "DELETE" to confirm' autoCapitalize="characters" value={confirm} onChangeText={setConfirm} />
        <Button
          label="Delete account"
          variant="danger"
          disabled={confirm.trim() !== 'DELETE'}
          loading={deleteState.isLoading}
          onPress={async () => {
            try {
              await deleteAccount().unwrap();
            } catch (e) {
              toast.error(e);
            }
          }}
        />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { gap: space.sm, paddingVertical: space.sm },
});
