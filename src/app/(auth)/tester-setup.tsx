import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { Illustration } from '@/components/motion/Illustration';
import { StaggerIn } from '@/components/motion/StaggerIn';
import { Button, Chip, Header, Input, Screen, Text } from '@/components/ui';
import { Stepper } from '@/components/ui/Stepper';
import { useCompleteTesterSetupMutation } from '@/features/auth/authApi';
import { useDomainConfig } from '@/features/config/configApi';
import { useToast } from '@/features/ui/useToast';
import { ANDROID_VERSIONS, COMMON_LANGUAGES } from '@/lib/constants';
import { androidMajorVersion, deviceLanguages, deviceModelName, deviceRegion, deviceTimeZone } from '@/lib/device';
import { testerSetupSchema, type TesterSetupInput } from '@/lib/validators';
import { useAppSelector } from '@/store/hooks';
import { AccentProvider } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

function TesterSetupForm() {
  const toast = useToast();
  const cfg = useDomainConfig();
  const name = useAppSelector((s) => s.auth.name);
  const [complete, state] = useCompleteTesterSetupMutation();

  const { control, handleSubmit, formState } = useForm<TesterSetupInput>({
    resolver: zodResolver(testerSetupSchema),
    defaultValues: {
      displayName: name ?? '',
      deviceModel: deviceModelName(),
      androidVersion: androidMajorVersion() ?? 14,
      country: deviceRegion(),
      languages: deviceLanguages(),
      maxActiveTests: Math.min(3, cfg.MAX_ACTIVE_TESTS_PER_TESTER),
    },
  });

  const submit = handleSubmit(async (values) => {
    try {
      await complete({ ...values, timezone: deviceTimeZone() }).unwrap();
      router.replace('/');
    } catch (e) {
      toast.error(e);
    }
  });

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen footer={<Button label="Start testing" icon="rocket-outline" onPress={submit} loading={state.isLoading} />}>
        <Header title="Set up your tester profile" subtitle="Developers see your name, device and reputation — never your email." />
        <View style={styles.art}>
          <Illustration kind="tester" size={150} />
        </View>

        <StaggerIn index={1} style={styles.block}>
          <Controller
            control={control}
            name="displayName"
            render={({ field }) => (
              <Input label="Display name" icon="person-outline" value={field.value} onChangeText={field.onChange} error={formState.errors.displayName?.message} />
            )}
          />
          <Controller
            control={control}
            name="deviceModel"
            render={({ field }) => (
              <Input
                label="Device model"
                icon="phone-portrait-outline"
                hint="Prefilled from this phone — change it if you test on another device."
                value={field.value}
                onChangeText={field.onChange}
                error={formState.errors.deviceModel?.message}
              />
            )}
          />
        </StaggerIn>

        <StaggerIn index={2} style={styles.block}>
          <Text variant="caption" color="textMuted">
            Android version
          </Text>
          <Controller
            control={control}
            name="androidVersion"
            render={({ field }) => (
              <View style={styles.chips}>
                {ANDROID_VERSIONS.map((v) => (
                  <Chip key={v} label={`Android ${v}`} selected={field.value === v} onPress={() => field.onChange(v)} />
                ))}
              </View>
            )}
          />
        </StaggerIn>

        <StaggerIn index={3} style={styles.block}>
          <Controller
            control={control}
            name="country"
            render={({ field }) => (
              <Input label="Country" icon="earth-outline" value={field.value} onChangeText={field.onChange} error={formState.errors.country?.message} />
            )}
          />
          <Text variant="caption" color="textMuted">
            Languages you can give feedback in
          </Text>
          <Controller
            control={control}
            name="languages"
            render={({ field }) => (
              <View style={styles.chips}>
                {COMMON_LANGUAGES.map((l) => {
                  const selected = field.value.includes(l);
                  return (
                    <Chip
                      key={l}
                      label={l}
                      selected={selected}
                      onPress={() => field.onChange(selected ? field.value.filter((x) => x !== l) : [...field.value, l].slice(0, 6))}
                    />
                  );
                })}
              </View>
            )}
          />
          {formState.errors.languages ? (
            <Text variant="caption" color="danger">
              {formState.errors.languages.message}
            </Text>
          ) : null}
        </StaggerIn>

        <StaggerIn index={4} style={styles.block}>
          <Text variant="caption" color="textMuted">
            How many apps can you test at once?
          </Text>
          <Controller
            control={control}
            name="maxActiveTests"
            render={({ field }) => (
              <Stepper
                label="Apps at once"
                value={field.value}
                min={1}
                max={cfg.MAX_ACTIVE_TESTS_PER_TESTER}
                onChange={field.onChange}
                format={(n) => `${n} app${n === 1 ? '' : 's'}`}
              />
            )}
          />
          <Text variant="caption" color="textFaint">
            Each app takes ~3 minutes a day for 14 days. Higher reputation unlocks more at once.
          </Text>
        </StaggerIn>
      </Screen>
    </KeyboardAvoidingView>
  );
}

export default function TesterSetup() {
  return (
    <AccentProvider accent="tester">
      <TesterSetupForm />
    </AccentProvider>
  );
}

const styles = StyleSheet.create({
  art: { alignItems: 'center' },
  block: { gap: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
