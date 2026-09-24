import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Button, Chip, Header, Input, ListGroup, ListRow, Screen, Sheet, SkeletonCardList, Text } from '@/components/ui';
import { Stepper } from '@/components/ui/Stepper';
import { SignOutRow } from '@/features/account/SignOutRow';
import { useDomainConfig } from '@/features/config/configApi';
import { ProfileHeader } from '@/features/profile/components/ProfileHeader';
import { useMyProfile, useUpdateProfileMutation } from '@/features/profile/profileApi';
import { useEligibility } from '@/features/tests/useEligibility';
import { useToast } from '@/features/ui/useToast';
import { ANDROID_VERSIONS, SUPPORT_EMAIL } from '@/lib/constants';
import { useAppSelector } from '@/store/hooks';
import { space } from '@/theme/tokens';

function DeviceSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const toast = useToast();
  const cfg = useDomainConfig();
  const { data: profile } = useMyProfile();
  const [update, state] = useUpdateProfileMutation();
  const [device, setDevice] = useState(profile?.deviceModel ?? '');
  const [version, setVersion] = useState(profile?.androidVersion ?? 14);
  const [max, setMax] = useState(profile?.maxActiveTests ?? 3);

  const save = async () => {
    if (!profile) return;
    try {
      await update({ userId: profile.userId, deviceModel: device.trim(), androidVersion: version, maxActiveTests: max }).unwrap();
      toast.success('Tester profile updated');
      onClose();
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Device & capacity">
      <Input label="Device model" value={device} onChangeText={setDevice} />
      <Text variant="caption" color="textMuted">
        Android version
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
        {ANDROID_VERSIONS.map((v) => (
          <Chip key={v} label={`Android ${v}`} selected={version === v} onPress={() => setVersion(v)} />
        ))}
      </ScrollView>
      <Text variant="caption" color="textMuted">
        Apps you can test at once
      </Text>
      <Stepper label="Apps at once" value={max} min={1} max={cfg.MAX_ACTIVE_TESTS_PER_TESTER} onChange={setMax} />
      <Button label="Save" onPress={save} loading={state.isLoading} disabled={device.trim().length < 2} />
    </Sheet>
  );
}

export default function TesterProfile() {
  const email = useAppSelector((s) => s.auth.email);
  const { data: profile, isLoading } = useMyProfile();
  const { maxActive } = useEligibility();
  const [deviceOpen, setDeviceOpen] = useState(false);

  return (
    <Screen tabBarInset>
      <Header title="Profile" large />
      {isLoading || !profile ? <SkeletonCardList count={1} height={110} /> : <ProfileHeader profile={profile} email={email} />}
      {profile ? (
        <ListGroup title="Tester profile">
          <ListRow
            icon="phone-portrait-outline"
            title={profile.deviceModel ?? 'Add your device'}
            subtitle={`Android ${profile.androidVersion ?? '?'} · up to ${Math.min(profile.maxActiveTests, maxActive)} tests at once`}
            onPress={() => setDeviceOpen(true)}
          />
          <ListRow icon="language-outline" title="Languages" subtitle={profile.languages.join(', ') || '—'} />
          <ListRow icon="podium-outline" title="Leaderboard" onPress={() => router.push('/leaderboard')} />
        </ListGroup>
      ) : null}
      <ListGroup title="App">
        <ListRow icon="notifications-outline" title="Notifications" onPress={() => router.push('/notifications')} />
        <ListRow icon="settings-outline" title="Settings" subtitle="Reminders, theme, motion, account" onPress={() => router.push('/settings')} />
        <ListRow icon="help-buoy-outline" title="Contact support" subtitle={SUPPORT_EMAIL} onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} />
        <SignOutRow />
      </ListGroup>
      <View style={{ height: space.lg }} />
      {deviceOpen ? <DeviceSheet visible={deviceOpen} onClose={() => setDeviceOpen(false)} /> : null}
    </Screen>
  );
}
