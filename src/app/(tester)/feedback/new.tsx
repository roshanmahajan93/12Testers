import { zodResolver } from '@hookform/resolvers/zod';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { PressableScale } from '@/components/motion/PressableScale';
import { Button, Chip, Header, Icon, Input, Screen, Text } from '@/components/ui';
import { FEEDBACK_META, SEVERITY_LABEL } from '@/features/feedback/meta';
import { useSubmitFeedbackMutation } from '@/features/tests/testsApi';
import { useToast } from '@/features/ui/useToast';
import { deviceInfoString } from '@/lib/device';
import { FEEDBACK_SEVERITIES, FEEDBACK_TYPES } from '@/lib/domain/types';
import { pickImage } from '@/lib/pickImage';
import { feedbackSchema, type FeedbackInput } from '@/lib/validators';
import { uploadImage } from '@/services/appwrite';
import { useRequireRole } from '@/navigation/guards';
import { useTheme } from '@/theme/ThemeProvider';
import { radii, space } from '@/theme/tokens';

interface Attachment {
  uri: string;
  fileId: string | null;
}

export default function NewFeedback() {
  useRequireRole('tester');
  const { appId, taskId, appName } = useLocalSearchParams<{ appId: string; taskId?: string; appName?: string }>();
  const toast = useToast();
  const { colors } = useTheme();
  const [submit, state] = useSubmitFeedbackMutation();
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const { control, handleSubmit, formState } = useForm<FeedbackInput>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      appId,
      taskId: taskId ?? null,
      type: 'bug',
      severity: 'medium',
      title: '',
      body: '',
      attachmentFileIds: [],
      deviceInfo: deviceInfoString(),
    },
  });

  const addAttachment = async () => {
    const image = await pickImage('library');
    if (!image) return;
    const entry: Attachment = { uri: image.uri, fileId: null };
    setAttachments((a) => [...a, entry]);
    try {
      const fileId = await uploadImage('feedbackAttachments', image);
      setAttachments((a) => a.map((x) => (x.uri === entry.uri ? { ...x, fileId } : x)));
    } catch (e) {
      setAttachments((a) => a.filter((x) => x.uri !== entry.uri));
      toast.error(e);
    }
  };

  const uploading = attachments.some((a) => !a.fileId);

  const send = handleSubmit(async (values) => {
    try {
      await submit({ ...values, attachmentFileIds: attachments.map((a) => a.fileId).filter((x): x is string => !!x) }).unwrap();
      toast.success('Thanks! The developer got your feedback.');
      router.back();
    } catch (e) {
      toast.error(e);
    }
  });

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={['top']} footer={<Button label="Send feedback" icon="send" onPress={send} loading={state.isLoading} disabled={uploading} />}>
        <Header title="Feedback" subtitle={appName} back />
        <Text variant="caption" color="textMuted">
          Type
        </Text>
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <View style={styles.chips}>
              {FEEDBACK_TYPES.map((t) => (
                <Chip key={t} label={FEEDBACK_META[t].label} icon={FEEDBACK_META[t].icon} selected={field.value === t} onPress={() => field.onChange(t)} />
              ))}
            </View>
          )}
        />
        <Text variant="caption" color="textMuted">
          Severity
        </Text>
        <Controller
          control={control}
          name="severity"
          render={({ field }) => (
            <View style={styles.chips}>
              {FEEDBACK_SEVERITIES.map((s) => (
                <Chip key={s} label={SEVERITY_LABEL[s]} selected={field.value === s} onPress={() => field.onChange(s)} />
              ))}
            </View>
          )}
        />
        <Controller control={control} name="title" render={({ field }) => <Input label="Title" value={field.value} onChangeText={field.onChange} maxLength={100} error={formState.errors.title?.message} />} />
        <Controller
          control={control}
          name="body"
          render={({ field }) => (
            <Input
              label="What happened?"
              placeholder="Steps to reproduce, what you expected, what you saw…"
              multiline
              value={field.value}
              onChangeText={field.onChange}
              maxLength={4000}
              error={formState.errors.body?.message}
            />
          )}
        />
        <Text variant="caption" color="textMuted">
          Screenshots (up to 4)
        </Text>
        <View style={styles.chips}>
          {attachments.map((a) => (
            <View key={a.uri} style={[styles.thumb, { opacity: a.fileId ? 1 : 0.5 }]}>
              <Image source={{ uri: a.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
            </View>
          ))}
          {attachments.length < 4 ? (
            <PressableScale onPress={addAttachment} accessibilityLabel="Add screenshot" style={[styles.thumb, styles.add, { borderColor: colors.borderStrong }]}>
              <Icon name="add" size={26} color="textFaint" />
            </PressableScale>
          ) : null}
        </View>
        <Controller
          control={control}
          name="deviceInfo"
          render={({ field }) => <Input label="Device" value={field.value ?? ''} onChangeText={(t) => field.onChange(t || null)} icon="phone-portrait-outline" />}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  thumb: { width: 76, height: 120, borderRadius: radii.md, overflow: 'hidden' },
  add: { borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
});
