import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Badge, Button, Card, Chip, EmptyState, Header, Icon, Input, Screen, Sheet, SkeletonCardList, Text, type BadgeTone } from '@/components/ui';
import { FileImage } from '@/components/ui/FileImage';
import { useReportMutation } from '@/features/account/accountApi';
import { useAppFeedbackQuery, useRateFeedbackMutation } from '@/features/apps/appsApi';
import { FEEDBACK_META } from '@/features/feedback/meta';
import { StarRating } from '@/features/feedback/StarRating';
import { useToast } from '@/features/ui/useToast';
import { FEEDBACK_TYPES, type Feedback, type FeedbackSeverity, type FeedbackType } from '@/lib/domain/types';
import { relativeTime } from '@/lib/format';
import { useRequireRole } from '@/navigation/guards';
import { space } from '@/theme/tokens';

const SEVERITY_TONE: Record<FeedbackSeverity, BadgeTone> = { low: 'neutral', medium: 'info', high: 'warning', critical: 'danger' };

function FeedbackCard({ f, appId, onReport }: { f: Feedback; appId: string; onReport: (f: Feedback) => void }) {
  const toast = useToast();
  const [rate] = useRateFeedbackMutation();
  const meta = FEEDBACK_META[f.type];
  return (
    <Card style={{ marginBottom: space.md }}>
      <View style={{ gap: space.sm }}>
        <View style={styles.head}>
          <Icon name={meta.icon} size={18} color="accent" />
          <Text variant="caption" color="accent">
            {meta.label}
          </Text>
          <Badge label={f.severity} tone={SEVERITY_TONE[f.severity]} />
          <View style={{ flex: 1 }} />
          <Text variant="caption" color="textFaint">
            {relativeTime(f.$createdAt)}
          </Text>
        </View>
        <Text variant="bodyStrong">{f.title}</Text>
        <Text variant="bodySm" color="textMuted">
          {f.body}
        </Text>
        {f.attachmentFileIds.length ? (
          <ScrollView horizontal contentContainerStyle={{ gap: space.sm }} showsHorizontalScrollIndicator={false}>
            {f.attachmentFileIds.map((fid) => (
              <FileImage key={fid} bucket="feedbackAttachments" fileId={fid} style={styles.attachment} width={240} />
            ))}
          </ScrollView>
        ) : null}
        <Text variant="caption" color="textFaint">
          {f.testerName}
          {f.deviceInfo ? ` · ${f.deviceInfo}` : ''}
        </Text>
        <View style={styles.footer}>
          <View style={{ gap: 2 }}>
            <Text variant="caption" color="textMuted">
              Rate usefulness
            </Text>
            <StarRating
              value={f.ownerRating ?? 0}
              onChange={(rating) =>
                rate({ feedbackId: f.$id, rating, appId })
                  .unwrap()
                  .catch((e) => toast.error(e))
              }
            />
          </View>
          <Button label="Report" variant="ghost" size="sm" icon="flag-outline" fullWidth={false} onPress={() => onReport(f)} />
        </View>
      </View>
    </Card>
  );
}

export default function FeedbackInbox() {
  useRequireRole('developer');
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const { data, isLoading, refetch, isFetching } = useAppFeedbackQuery(id);
  const [type, setType] = useState<FeedbackType | 'all'>('all');
  const [reporting, setReporting] = useState<Feedback | null>(null);
  const [reason, setReason] = useState('');
  const [report, reportState] = useReportMutation();

  const list = (data ?? []).filter((f) => type === 'all' || f.type === type);

  return (
    <Screen scroll={false}>
      <Header title="Feedback" back subtitle="Rate feedback — it shapes tester reputation." />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }} style={{ flexGrow: 0 }}>
        <Chip label="All" selected={type === 'all'} onPress={() => setType('all')} />
        {FEEDBACK_TYPES.map((t) => (
          <Chip key={t} label={FEEDBACK_META[t].label} icon={FEEDBACK_META[t].icon} selected={type === t} onPress={() => setType(t)} />
        ))}
      </ScrollView>
      {isLoading ? (
        <SkeletonCardList count={3} height={160} />
      ) : (
        <FlashList
          data={list}
          keyExtractor={(f) => f.$id}
          onRefresh={refetch}
          refreshing={isFetching && !isLoading}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListEmptyComponent={<EmptyState illustration="empty" title="No feedback yet" message="Testers can send bugs, ideas and praise from each daily task." />}
          renderItem={({ item }) => <FeedbackCard f={item} appId={id} onReport={setReporting} />}
        />
      )}
      <Sheet visible={!!reporting} onClose={() => setReporting(null)} title="Report feedback">
        <Input label="What’s wrong?" placeholder="Spam, abusive, unrelated…" value={reason} onChangeText={setReason} multiline />
        <Button
          label="Send report"
          variant="danger"
          loading={reportState.isLoading}
          disabled={reason.trim().length < 5}
          onPress={async () => {
            if (!reporting) return;
            try {
              await report({ targetType: 'feedback', targetId: reporting.$id, reason: reason.trim() }).unwrap();
              toast.success('Thanks — our team will review it.');
              setReporting(null);
              setReason('');
            } catch (e) {
              toast.error(e);
            }
          }}
        />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  attachment: { width: 96, height: 170 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
});
