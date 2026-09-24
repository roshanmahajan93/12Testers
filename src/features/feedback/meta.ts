import type { IconName } from '@/components/ui/Icon';
import type { FeedbackSeverity, FeedbackType } from '@/lib/domain/types';

export const FEEDBACK_META: Record<FeedbackType, { label: string; icon: IconName }> = {
  bug: { label: 'Bug', icon: 'bug-outline' },
  crash: { label: 'Crash', icon: 'flash-outline' },
  ux: { label: 'UX', icon: 'color-wand-outline' },
  suggestion: { label: 'Idea', icon: 'bulb-outline' },
  praise: { label: 'Praise', icon: 'heart-outline' },
};

export const SEVERITY_LABEL: Record<FeedbackSeverity, string> = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' };
