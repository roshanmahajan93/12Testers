import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Button, Header, Screen, SkeletonCardList, Text } from '@/components/ui';
import { useAppQuery, useSaveAppMutation, useTestPlanQuery } from '@/features/apps/appsApi';
import { PlanEditor } from '@/features/apps/components/PlanEditor';
import { useDomainConfig } from '@/features/config/configApi';
import { useToast } from '@/features/ui/useToast';
import type { PlanDayDraft } from '@/lib/domain/testPlan';
import { useRequireRole } from '@/navigation/guards';

export default function TestPlanScreen() {
  useRequireRole('developer');
  const { id } = useLocalSearchParams<{ id: string }>();
  const cfg = useDomainConfig();
  const toast = useToast();
  const app = useAppQuery(id);
  const plan = useTestPlanQuery(id);
  const [saveApp, state] = useSaveAppMutation();
  const [draft, setDraft] = useState<PlanDayDraft[] | null>(null);

  const initial: PlanDayDraft[] = (plan.data ?? []).map(({ dayNumber, title, instruction, requiresScreenshot, question }) => ({
    dayNumber,
    title,
    instruction,
    requiresScreenshot,
    question,
  }));

  const save = async () => {
    const a = app.data;
    if (!a || !draft) return;
    try {
      await saveApp({
        appId: a.$id,
        name: a.name,
        shortDescription: a.shortDescription,
        category: a.category,
        packageName: a.packageName,
        optInUrl: a.optInUrl,
        googleGroupUrl: a.googleGroupUrl,
        iconFileId: a.iconFileId,
        minReputation: a.minReputation,
        minAndroidVersion: a.minAndroidVersion,
        generalInstructions: a.generalInstructions,
        plan: draft,
      }).unwrap();
      toast.success('Test plan saved. New days use it from tomorrow.');
      router.back();
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <Screen footer={<Button label="Save plan" onPress={save} loading={state.isLoading} disabled={!draft} />}>
      <Header title="Test plan" back subtitle={app.data?.name} />
      <Text variant="bodySm" color="textMuted">
        Changes apply to tasks generated from now on — days testers already received stay as they were.
      </Text>
      {plan.isLoading || app.isLoading ? (
        <SkeletonCardList count={5} height={72} />
      ) : (
        <PlanEditor value={draft ?? initial} onChange={setDraft} days={cfg.TEST_DAYS} />
      )}
    </Screen>
  );
}
