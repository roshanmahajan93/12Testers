import * as Linking from 'expo-linking';
import { router } from 'expo-router';

import { Header, ListGroup, ListRow, Screen, SkeletonCardList } from '@/components/ui';
import { SignOutRow } from '@/features/account/SignOutRow';
import { ProfileHeader } from '@/features/profile/components/ProfileHeader';
import { useMyProfile } from '@/features/profile/profileApi';
import { SUPPORT_EMAIL } from '@/lib/constants';
import { useAppSelector } from '@/store/hooks';

export default function DeveloperAccount() {
  const email = useAppSelector((s) => s.auth.email);
  const { data: profile, isLoading } = useMyProfile();

  return (
    <Screen tabBarInset>
      <Header title="Profile" large />
      {isLoading || !profile ? <SkeletonCardList count={1} height={110} /> : <ProfileHeader profile={profile} email={email} />}
      <ListGroup title="Testing">
        <ListRow icon="apps-outline" title="My apps" onPress={() => router.push('/apps')} />
        <ListRow icon="wallet-outline" title="Credits & Pro" onPress={() => router.push('/paywall')} />
        <ListRow icon="book-outline" title="Closed testing guide" onPress={() => router.push('/guide')} />
      </ListGroup>
      <ListGroup title="App">
        <ListRow icon="notifications-outline" title="Notifications" onPress={() => router.push('/notifications')} />
        <ListRow icon="settings-outline" title="Settings" subtitle="Theme, motion, notifications, account" onPress={() => router.push('/settings')} />
        <ListRow
          icon="help-buoy-outline"
          title="Contact support"
          subtitle={SUPPORT_EMAIL}
          onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
        />
        <SignOutRow />
      </ListGroup>
    </Screen>
  );
}
