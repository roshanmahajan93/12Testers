import { useState } from 'react';
import { View } from 'react-native';

import { Button, ListRow, Sheet, Text } from '@/components/ui';
import { useSignOutMutation } from '@/features/auth/authApi';
import { space } from '@/theme/tokens';

export function SignOutRow() {
  const [open, setOpen] = useState(false);
  const [signOut, { isLoading }] = useSignOutMutation();
  return (
    <>
      <ListRow icon="log-out-outline" title="Sign out" destructive onPress={() => setOpen(true)} chevron={false} />
      <Sheet visible={open} onClose={() => setOpen(false)} title="Sign out?">
        <Text variant="body" color="textMuted">
          Local reminders on this device will be cleared. Your data stays safe in your account.
        </Text>
        <View style={{ gap: space.sm }}>
          <Button label="Sign out" variant="danger" loading={isLoading} onPress={() => void signOut()} />
          <Button label="Cancel" variant="ghost" onPress={() => setOpen(false)} />
        </View>
      </Sheet>
    </>
  );
}
