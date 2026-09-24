import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { PressableScale } from '@/components/motion/PressableScale';
import { Avatar, Badge, Card, Icon, Text } from '@/components/ui';
import { useToast } from '@/features/ui/useToast';
import type { Profile } from '@/lib/domain/types';
import { reputationTier } from '@/lib/domain/rules';
import { pickImage } from '@/lib/pickImage';
import { uploadImage } from '@/services/appwrite';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

import { useUpdateProfileMutation } from '../profileApi';

export function ProfileHeader({ profile, email }: { profile: Profile; email?: string | null }) {
  const toast = useToast();
  const { colors } = useTheme();
  const [updateProfile] = useUpdateProfileMutation();
  const [uploading, setUploading] = useState(false);

  const changeAvatar = async () => {
    const image = await pickImage('library', { square: true });
    if (!image) return;
    setUploading(true);
    try {
      const fileId = await uploadImage('avatars', image, { publicToUsers: true, maxEdge: 512 });
      await updateProfile({ userId: profile.userId, avatarFileId: fileId }).unwrap();
      toast.success('Profile photo updated');
    } catch (e) {
      toast.error(e);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <View style={styles.row}>
        <PressableScale onPress={changeAvatar} accessibilityLabel="Change profile photo" haptic="select">
          <Avatar name={profile.displayName} fileId={profile.avatarFileId} size={64} />
          <View style={[styles.cam, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}>
            {uploading ? <ActivityIndicator size="small" /> : <Icon name="camera" size={14} />}
          </View>
        </PressableScale>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="h2" numberOfLines={1}>
            {profile.displayName}
          </Text>
          {email ? (
            <Text variant="caption" color="textMuted" numberOfLines={1}>
              {email}
            </Text>
          ) : null}
          <View style={styles.badges}>
            <Badge label={profile.role === 'developer' ? 'Developer' : 'Tester'} tone="accent" />
            {profile.role === 'tester' ? <Badge label={`${reputationTier(profile.reputation)} · ${profile.reputation}`} tone="neutral" icon="shield-checkmark-outline" /> : null}
            {profile.isPro ? <Badge label="Pro" tone="success" icon="sparkles" /> : null}
          </View>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  cam: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  badges: { flexDirection: 'row', gap: space.xs, flexWrap: 'wrap', marginTop: space.xs },
});
