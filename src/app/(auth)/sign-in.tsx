import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { z } from 'zod';

import { GradientBackdrop } from '@/components/motion/GradientBackdrop';
import { Button, Header, Input, Screen, Text } from '@/components/ui';
import {
  useGoogleSignInMutation,
  useSendOtpMutation,
  useSetRoleMutation,
  useVerifyOtpMutation,
} from '@/features/auth/authApi';
import { OtpInput } from '@/features/auth/components/OtpInput';
import { useToast } from '@/features/ui/useToast';
import { deviceTimeZone } from '@/lib/device';
import { friendlyMessage } from '@/lib/errors';
import { emailSchema } from '@/lib/validators';
import { useAppSelector } from '@/store/hooks';
import { AccentProvider, useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

const formSchema = z.object({ email: emailSchema });
const RESEND_SECONDS = 30;

const ROLE_COPY = {
  developer: { title: 'Developer sign in', subtitle: 'List your app and track your 14-day test.' },
  tester: { title: 'Tester sign in', subtitle: 'Claim tests and complete one short task per app a day.' },
} as const;

function SignInContent() {
  const toast = useToast();
  const { colors } = useTheme();
  const auth = useAppSelector((s) => s.auth);
  const role = auth.intendedRole;
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [otpUserId, setOtpUserId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [codeError, setCodeError] = useState<string | undefined>();
  const [cooldown, setCooldown] = useState(0);
  const settingRole = useRef(false);

  const [sendOtp, sendState] = useSendOtpMutation();
  const [verifyOtp, verifyState] = useVerifyOtpMutation();
  const [googleSignIn, googleState] = useGoogleSignInMutation();
  const [setRole, setRoleState] = useSetRoleMutation();

  const { control, handleSubmit, formState } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '' },
  });

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // New account (no role label yet) → assign the role picked on the welcome screen, server-side.
  useEffect(() => {
    if (auth.status !== 'signedIn' || auth.role || !role || settingRole.current) return;
    settingRole.current = true;
    setRole({ role, timezone: deviceTimeZone() })
      .unwrap()
      .then((profile) => router.replace(profile.role === 'tester' ? '/tester-setup' : '/'))
      .catch((e) => {
        settingRole.current = false;
        toast.error(e);
      });
  }, [auth.status, auth.role, role, setRole, toast]);

  // Existing account: go home (the role-mismatch sheet explains if it's the other role).
  useEffect(() => {
    if (auth.status === 'signedIn' && auth.role) {
      router.replace(auth.role === 'tester' && auth.needsTesterSetup ? '/tester-setup' : '/');
    }
  }, [auth.status, auth.role, auth.needsTesterSetup]);

  if (!role) {
    return (
      <Screen>
        <Header title="Choose a role first" back />
        <Button label="Back to start" onPress={() => router.replace('/welcome')} />
      </Screen>
    );
  }
  const copy = ROLE_COPY[role];

  const requestCode = handleSubmit(async ({ email: value }) => {
    try {
      const { userId } = await sendOtp({ email: value }).unwrap();
      setOtpUserId(userId);
      setEmail(value);
      setStep('code');
      setCooldown(RESEND_SECONDS);
      setCodeError(undefined);
    } catch (e) {
      toast.error(e);
    }
  });

  const submitCode = async (code: string) => {
    if (!otpUserId) return;
    setCodeError(undefined);
    try {
      await verifyOtp({ userId: otpUserId, code }).unwrap();
    } catch (e) {
      setCodeError(friendlyMessage(e));
    }
  };

  const resend = async () => {
    try {
      const { userId } = await sendOtp({ email }).unwrap();
      setOtpUserId(userId);
      setCooldown(RESEND_SECONDS);
      toast.info('We sent you a new code.');
    } catch (e) {
      toast.error(e);
    }
  };

  const google = async () => {
    try {
      await googleSignIn().unwrap();
    } catch (e) {
      toast.error(e);
    }
  };

  const busy = verifyState.isLoading || setRoleState.isLoading;

  return (
    <View style={{ flex: 1 }}>
      <GradientBackdrop intensity={0.9} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Screen contentStyle={styles.content}>
          <Header title={copy.title} subtitle={copy.subtitle} back />
          {step === 'email' ? (
            <Animated.View key="email" entering={FadeInDown.springify().damping(18)} exiting={FadeOutUp} style={styles.block}>
              <Controller
                control={control}
                name="email"
                render={({ field }) => (
                  <Input
                    label="Email"
                    icon="mail-outline"
                    placeholder="you@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    textContentType="emailAddress"
                    returnKeyType="send"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    onSubmitEditing={requestCode}
                    error={formState.errors.email?.message}
                  />
                )}
              />
              <Button label="Email me a code" icon="paper-plane-outline" onPress={requestCode} loading={sendState.isLoading} />
              <View style={styles.divider}>
                <View style={[styles.rule, { backgroundColor: colors.border }]} />
                <Text variant="caption" color="textFaint">
                  or
                </Text>
                <View style={[styles.rule, { backgroundColor: colors.border }]} />
              </View>
              <Button label="Continue with Google" icon="logo-google" variant="secondary" onPress={google} loading={googleState.isLoading} />
            </Animated.View>
          ) : (
            <Animated.View key="code" entering={FadeInDown.springify().damping(18)} exiting={FadeOutUp} style={styles.block}>
              <Text variant="body" color="textMuted">
                Enter the 6-digit code we sent to <Text variant="bodyStrong">{email}</Text>.
              </Text>
              <OtpInput onComplete={submitCode} error={codeError} disabled={busy} />
              {busy ? (
                <Text variant="caption" color="textMuted" align="center">
                  {setRoleState.isLoading ? 'Setting up your account…' : 'Verifying…'}
                </Text>
              ) : null}
              <Button
                label={cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
                variant="ghost"
                disabled={cooldown > 0}
                onPress={resend}
              />
              <Button label="Use a different email" variant="ghost" onPress={() => setStep('email')} />
            </Animated.View>
          )}
        </Screen>
      </KeyboardAvoidingView>
    </View>
  );
}

export default function SignIn() {
  const role = useAppSelector((s) => s.auth.intendedRole);
  return (
    <AccentProvider accent={role ?? 'neutral'}>
      <SignInContent />
    </AccentProvider>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.xxl },
  block: { gap: space.lg },
  divider: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  rule: { flex: 1, height: StyleSheet.hairlineWidth },
});
