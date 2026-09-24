import { zodResolver } from '@hookform/resolvers/zod';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch, type FieldPath } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, SlideInLeft, SlideInRight, SlideOutLeft, SlideOutRight } from 'react-native-reanimated';

import { Confetti } from '@/components/motion/Confetti';
import { LottieIllustration } from '@/components/motion/LottieIllustration';
import { PressableScale } from '@/components/motion/PressableScale';
import { Avatar, Badge, Button, Card, Chip, Header, Icon, Input, ProgressBar, Screen, SkeletonCardList, Text } from '@/components/ui';
import { Stepper } from '@/components/ui/Stepper';
import { useAppQuery, useListAppMutation, useSaveAppMutation, useTestPlanQuery } from '@/features/apps/appsApi';
import { PlanEditor } from '@/features/apps/components/PlanEditor';
import { useDomainConfig } from '@/features/config/configApi';
import { useMyProfile } from '@/features/profile/profileApi';
import { useToast } from '@/features/ui/useToast';
import { useReduceMotion } from '@/hooks/useMotion';
import { ANDROID_VERSIONS } from '@/lib/constants';
import { slotCost, slotsForApp } from '@/lib/domain/config';
import { APP_CATEGORIES } from '@/lib/domain/types';
import { isAppError } from '@/lib/errors';
import { pickImage } from '@/lib/pickImage';
import { optInUrlFor, saveAppSchema, type SaveAppInput } from '@/lib/validators';
import { uploadImage } from '@/services/appwrite';
import { useTheme } from '@/theme/ThemeProvider';
import { radii, space } from '@/theme/tokens';

type Form = Omit<SaveAppInput, 'appId'>;

const STEPS: { key: string; title: string; subtitle: string; fields: FieldPath<Form>[] }[] = [
  { key: 'basics', title: 'Basics', subtitle: 'What testers will see first.', fields: ['name', 'shortDescription', 'category'] },
  { key: 'links', title: 'Package & opt-in link', subtitle: 'From your Play Console closed testing track.', fields: ['packageName', 'optInUrl'] },
  { key: 'group', title: 'Google Group', subtitle: 'Optional — if your track uses a group for testers.', fields: ['googleGroupUrl'] },
  { key: 'icon', title: 'App icon', subtitle: 'Helps testers recognise your app.', fields: ['iconFileId'] },
  { key: 'plan', title: '14-day test plan', subtitle: 'One short task per day.', fields: ['plan'] },
  { key: 'reqs', title: 'Requirements', subtitle: 'Who can claim your test.', fields: ['minReputation', 'minAndroidVersion', 'generalInstructions'] },
  { key: 'review', title: 'Review & reserve', subtitle: 'Reserve tester slots to start recruiting.', fields: [] },
];

const CATEGORY_LABEL = (c: string) => c.charAt(0).toUpperCase() + c.slice(1);

export default function AddAppWizard() {
  const params = useLocalSearchParams<{ appId?: string }>();
  const [appId, setAppId] = useState<string | undefined>(params.appId);
  const toast = useToast();
  const theme = useTheme();
  const cfg = useDomainConfig();
  const reduceMotion = useReduceMotion();
  const profile = useMyProfile();
  const existing = useAppQuery(params.appId ?? '', { skip: !params.appId });
  const existingPlan = useTestPlanQuery(params.appId ?? '', { skip: !params.appId });
  const [saveApp, saveState] = useSaveAppMutation();
  const [listApp, listState] = useListAppMutation();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [listedId, setListedId] = useState<string | null>(null);

  const { control, handleSubmit, trigger, setValue, getValues, reset, formState } = useForm<Form>({
    resolver: zodResolver(saveAppSchema.omit({ appId: true })),
    defaultValues: {
      name: '',
      shortDescription: '',
      category: 'productivity',
      packageName: '',
      optInUrl: '',
      googleGroupUrl: null,
      iconFileId: null,
      plan: [],
      minReputation: 0,
      minAndroidVersion: 0,
      generalInstructions: 'Please keep the app installed for the full test and open it every day.',
    },
  });

  // Editing a draft: load it once.
  const loaded = existing.data && existingPlan.data;
  useEffect(() => {
    if (!existing.data || !existingPlan.data) return;
    const a = existing.data;
    reset({
      name: a.name,
      shortDescription: a.shortDescription,
      category: a.category,
      packageName: a.packageName,
      optInUrl: a.optInUrl,
      googleGroupUrl: a.googleGroupUrl,
      iconFileId: a.iconFileId,
      plan: existingPlan.data.map(({ dayNumber, title, instruction, requiresScreenshot, question }) => ({ dayNumber, title, instruction, requiresScreenshot, question })),
      minReputation: a.minReputation,
      minAndroidVersion: a.minAndroidVersion,
      generalInstructions: a.generalInstructions,
    });
  }, [existing.data, existingPlan.data, reset]);

  // Keep the opt-in link in sync with the package unless the developer edited it.
  const pkg = useWatch({ control, name: 'packageName' });
  useEffect(() => {
    const current = getValues('optInUrl');
    if (!current || current.startsWith('https://play.google.com/apps/testing/')) {
      setValue('optInUrl', pkg ? optInUrlFor(pkg.trim()) : '', { shouldValidate: false });
    }
  }, [pkg, getValues, setValue]);

  const slots = slotsForApp(cfg);
  const cost = slotCost(slots, cfg);
  const balance = profile.data?.credits ?? 0;
  const values = useWatch({ control }) as Form;

  const goto = async (next: number) => {
    if (next > step) {
      const ok = await trigger(STEPS[step]!.fields);
      if (!ok) return;
    }
    setDir(next > step ? 1 : -1);
    setStep(next);
  };

  const persist = async (): Promise<string | null> => {
    try {
      const saved = await saveApp({ ...getValues(), appId }).unwrap();
      setAppId(saved.$id);
      return saved.$id;
    } catch (e) {
      toast.error(e);
      return null;
    }
  };

  const saveDraft = handleSubmit(async () => {
    const id = await persist();
    if (id) toast.success('Draft saved');
  });

  const reserve = handleSubmit(async () => {
    const id = await persist();
    if (!id) return;
    try {
      await listApp({ appId: id }).unwrap();
      setListedId(id);
    } catch (e) {
      if (isAppError(e) && e.code === 'insufficient_credits') {
        toast.info('You need more credits to reserve slots.');
        router.push('/paywall');
      } else toast.error(e);
    }
  });

  const chooseIcon = async () => {
    const image = await pickImage('library', { square: true });
    if (!image) return;
    setUploading(true);
    setIconPreview(image.uri);
    try {
      const fileId = await uploadImage('appIcons', image, { publicToUsers: true, maxEdge: 512 });
      setValue('iconFileId', fileId);
    } catch (e) {
      setIconPreview(null);
      toast.error(e);
    } finally {
      setUploading(false);
    }
  };

  if (listedId) {
    return (
      <Screen scroll={false} contentStyle={styles.success}>
        <Confetti />
        <LottieIllustration name="success" size={180} loop={false} />
        <Text variant="h1" align="center">
          You’re recruiting!
        </Text>
        <Text variant="body" color="textMuted" align="center">
          {slots} slots are open. We’re notifying testers whose devices match. Your test starts automatically at{' '}
          {cfg.TESTERS_REQUIRED} testers.
        </Text>
        <Button label="Open app dashboard" onPress={() => router.replace({ pathname: '/app/[id]', params: { id: listedId } })} />
      </Screen>
    );
  }

  if (params.appId && !loaded) {
    return (
      <Screen>
        <Header title="Loading draft…" back />
        <SkeletonCardList count={3} />
      </Screen>
    );
  }

  const current = STEPS[step]!;
  const entering = reduceMotion ? FadeIn : dir === 1 ? SlideInRight.springify().damping(20) : SlideInLeft.springify().damping(20);
  const exiting = reduceMotion ? undefined : dir === 1 ? SlideOutLeft.duration(180) : SlideOutRight.duration(180);
  const isLast = step === STEPS.length - 1;

  const footer = (
    <View style={styles.footer}>
      {step > 0 ? <Button label="Back" variant="secondary" fullWidth={false} icon="chevron-back" onPress={() => void goto(step - 1)} style={{ flex: 1 }} /> : null}
      {isLast ? (
        balance >= cost ? (
          <Button label={`Reserve for ${cost} credits`} icon="rocket-outline" onPress={reserve} loading={saveState.isLoading || listState.isLoading} style={{ flex: 2 }} fullWidth={false} />
        ) : (
          <Button label="Get credits" icon="wallet-outline" onPress={() => router.push('/paywall')} style={{ flex: 2 }} fullWidth={false} />
        )
      ) : (
        <Button label="Continue" iconRight="arrow-forward" onPress={() => void goto(step + 1)} style={{ flex: 2 }} fullWidth={false} />
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen footer={footer}>
        <Header
          title={appId ? 'Edit app' : 'Add an app'}
          back
          right={step >= 2 ? <Button label="Save draft" variant="ghost" size="sm" fullWidth={false} onPress={saveDraft} loading={saveState.isLoading} /> : null}
        />
        <View style={{ gap: space.sm }}>
          <View style={styles.stepMeta}>
            <Text variant="label" color="accent">
              Step {step + 1} of {STEPS.length}
            </Text>
            <Text variant="caption" color="textFaint">
              {current.title}
            </Text>
          </View>
          <ProgressBar value={(step + 1) / STEPS.length} height={6} label="Wizard progress" />
        </View>

        <Animated.View key={current.key} entering={entering} exiting={exiting} style={{ gap: space.lg }}>
          <View style={{ gap: 2 }}>
            <Text variant="h2">{current.title}</Text>
            <Text variant="bodySm" color="textMuted">
              {current.subtitle}
            </Text>
          </View>

          {current.key === 'basics' ? (
            <>
              <Controller control={control} name="name" render={({ field }) => <Input label="App name" value={field.value} onChangeText={field.onChange} maxLength={50} error={formState.errors.name?.message} />} />
              <Controller
                control={control}
                name="shortDescription"
                render={({ field }) => (
                  <Input label="Short description" multiline maxLength={160} value={field.value} onChangeText={field.onChange} error={formState.errors.shortDescription?.message} hint={`${field.value.length}/160`} />
                )}
              />
              <Text variant="caption" color="textMuted">
                Category
              </Text>
              <Controller
                control={control}
                name="category"
                render={({ field }) => (
                  <View style={styles.chips}>
                    {APP_CATEGORIES.map((c) => (
                      <Chip key={c} label={CATEGORY_LABEL(c)} selected={field.value === c} onPress={() => field.onChange(c)} />
                    ))}
                  </View>
                )}
              />
            </>
          ) : null}

          {current.key === 'links' ? (
            <>
              <Controller
                control={control}
                name="packageName"
                render={({ field }) => (
                  <Input label="Package name" placeholder="com.yourcompany.app" autoCapitalize="none" autoCorrect={false} value={field.value} onChangeText={field.onChange} error={formState.errors.packageName?.message} />
                )}
              />
              <Controller
                control={control}
                name="optInUrl"
                render={({ field }) => (
                  <Input
                    label="Opt-in link"
                    autoCapitalize="none"
                    keyboardType="url"
                    value={field.value}
                    onChangeText={field.onChange}
                    error={formState.errors.optInUrl?.message}
                    hint="Generated from your package — edit it if Play Console shows a different link."
                  />
                )}
              />
              <Card tone="accent">
                <Text variant="bodySm">
                  Make sure your closed testing track is published and “Testers can join on the web” is enabled, otherwise the
                  opt-in link won’t work for testers.
                </Text>
              </Card>
            </>
          ) : null}

          {current.key === 'group' ? (
            <>
              <Controller
                control={control}
                name="googleGroupUrl"
                render={({ field }) => (
                  <Input
                    label="Google Group link (optional)"
                    placeholder="https://groups.google.com/g/your-group"
                    autoCapitalize="none"
                    keyboardType="url"
                    value={field.value ?? ''}
                    onChangeText={(t) => field.onChange(t.trim() ? t : null)}
                    error={formState.errors.googleGroupUrl?.message}
                  />
                )}
              />
              <Text variant="bodySm" color="textMuted">
                If your track uses a Google Group as its tester list, testers will be asked to join it before opting in. Set the
                group so anyone can join without approval.
              </Text>
            </>
          ) : null}

          {current.key === 'icon' ? (
            <View style={styles.iconStep}>
              <PressableScale onPress={chooseIcon} accessibilityLabel="Choose app icon" style={[styles.iconPick, { borderColor: theme.colors.borderStrong, backgroundColor: theme.colors.surfaceAlt }]}>
                {iconPreview ? (
                  <Image source={{ uri: iconPreview }} style={styles.iconImg} contentFit="cover" />
                ) : values.iconFileId ? (
                  <Avatar name={values.name || 'App'} fileId={values.iconFileId} bucket="appIcons" size={120} rounded="squircle" />
                ) : (
                  <Icon name="image-outline" size={36} color="textFaint" />
                )}
              </PressableScale>
              <Button label={uploading ? 'Uploading…' : values.iconFileId ? 'Change icon' : 'Choose icon'} variant="secondary" loading={uploading} onPress={chooseIcon} fullWidth={false} />
              <Text variant="caption" color="textFaint" align="center">
                Square PNG or JPG. We resize it to 512 px.
              </Text>
            </View>
          ) : null}

          {current.key === 'plan' ? (
            <Controller control={control} name="plan" render={({ field }) => <PlanEditor value={field.value} onChange={field.onChange} days={cfg.TEST_DAYS} />} />
          ) : null}

          {current.key === 'reqs' ? (
            <>
              <Text variant="caption" color="textMuted">
                Minimum tester reputation
              </Text>
              <Controller
                control={control}
                name="minReputation"
                render={({ field }) => <Stepper label="Minimum reputation" value={field.value} min={0} max={90} step={5} onChange={field.onChange} format={(n) => (n === 0 ? 'Anyone' : `${n}+`)} />}
              />
              <Text variant="caption" color="textMuted">
                Minimum Android version
              </Text>
              <Controller
                control={control}
                name="minAndroidVersion"
                render={({ field }) => (
                  <View style={styles.chips}>
                    <Chip label="Any" selected={field.value === 0} onPress={() => field.onChange(0)} />
                    {[...ANDROID_VERSIONS].reverse().map((v) => (
                      <Chip key={v} label={`${v}+`} selected={field.value === v} onPress={() => field.onChange(v)} />
                    ))}
                  </View>
                )}
              />
              <Controller
                control={control}
                name="generalInstructions"
                render={({ field }) => <Input label="General instructions for testers" multiline maxLength={1000} value={field.value} onChangeText={field.onChange} />}
              />
            </>
          ) : null}

          {current.key === 'review' ? (
            <>
              <Card>
                <View style={{ gap: space.md }}>
                  <View style={styles.reviewHead}>
                    <Avatar name={values.name || 'App'} fileId={values.iconFileId} bucket="appIcons" size={52} rounded="squircle" />
                    <View style={{ flex: 1 }}>
                      <Text variant="h3">{values.name}</Text>
                      <Text variant="caption" color="textFaint">
                        {values.packageName}
                      </Text>
                    </View>
                    <Badge label={CATEGORY_LABEL(values.category)} />
                  </View>
                  <Text variant="bodySm" color="textMuted">
                    {values.shortDescription}
                  </Text>
                  <Text variant="caption" color="textMuted">
                    {values.plan.length} plan days · min reputation {values.minReputation} · Android {values.minAndroidVersion || 'any'}
                  </Text>
                </View>
              </Card>
              <Card tone="accent">
                <View style={{ gap: space.sm }}>
                  <View style={styles.costRow}>
                    <Text variant="bodyStrong">
                      {slots} tester slots × {cfg.CREDITS_PER_TESTER_SLOT}
                    </Text>
                    <Text variant="h3">{cost} credits</Text>
                  </View>
                  <View style={styles.costRow}>
                    <Text variant="bodySm" color="textMuted">
                      Your balance
                    </Text>
                    <Text variant="bodyStrong" color={balance >= cost ? 'success' : 'danger'}>
                      {balance} credits
                    </Text>
                  </View>
                  <Text variant="caption" color="textMuted">
                    Includes {cfg.EXTRA_TESTER_BUFFER} spare slots so drop-outs don’t stall your test. Unused slots are refunded.
                  </Text>
                </View>
              </Card>
              <Text variant="caption" color="textFaint">
                12Testers helps you meet the testing requirement. Google alone decides whether production access is granted.
              </Text>
            </>
          ) : null}
        </Animated.View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  stepMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  footer: { flexDirection: 'row', gap: space.sm },
  iconStep: { alignItems: 'center', gap: space.lg, paddingVertical: space.lg },
  iconPick: { width: 132, height: 132, borderRadius: radii.xxl, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  iconImg: { width: '100%', height: '100%' },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  costRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  success: { alignItems: 'center', justifyContent: 'center', gap: space.lg, paddingHorizontal: space.xxl },
});
