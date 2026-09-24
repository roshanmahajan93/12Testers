import * as Linking from 'expo-linking';
import { View } from 'react-native';

import { roleMismatchDismissed } from '@/features/auth/authSlice';
import { SUPPORT_EMAIL } from '@/lib/constants';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { space } from '@/theme/tokens';

import { Button } from './ui/Button';
import { Sheet } from './ui/Sheet';
import { Text } from './ui/Text';

const LABEL = { developer: 'Developer', tester: 'Tester' } as const;

/** Shown when an existing account signs in through the other role's entry. Roles never switch in-app. */
export function RoleMismatchSheet() {
  const dispatch = useAppDispatch();
  const mismatch = useAppSelector((s) => s.auth.roleMismatch);
  const close = () => dispatch(roleMismatchDismissed());

  return (
    <Sheet visible={mismatch !== null} onClose={close} title={mismatch ? `This account is registered as a ${LABEL[mismatch]}` : ''}>
      <Text variant="body" color="textMuted">
        Each account has one role. We’ll take you to your {mismatch ? LABEL[mismatch] : ''} experience. To use the other role,
        sign in with a different email.
      </Text>
      <View style={{ gap: space.sm, marginTop: space.sm }}>
        <Button label={`Continue as ${mismatch ? LABEL[mismatch] : ''}`} onPress={close} accent={mismatch ?? 'neutral'} />
        <Button
          label="Contact support to change role"
          variant="ghost"
          onPress={() => {
            void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Role change request')}`);
          }}
        />
      </View>
    </Sheet>
  );
}
