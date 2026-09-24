import { useCallback, useState } from 'react';

import { useCompleteTaskMutation, type CompleteTaskResult } from '@/features/tests/testsApi';
import { useToast } from '@/features/ui/useToast';
import { useHaptics } from '@/hooks/useMotion';
import type { DailyTask } from '@/lib/domain/types';
import { pickImage } from '@/lib/pickImage';
import { uploadImage } from '@/services/appwrite';
import { useAppSelector } from '@/store/hooks';

import { EMPTY_DRAFT, type TaskDraft } from './TaskCard';

/** Per-task drafts (kept while swiping between cards), screenshot upload and completion. */
export function useTaskCompletion() {
  const toast = useToast();
  const fire = useHaptics();
  const testerId = useAppSelector((s) => s.auth.userId) ?? '';
  const [drafts, setDrafts] = useState<Record<string, TaskDraft>>({});
  const [completeTask, state] = useCompleteTaskMutation();
  const [completingId, setCompletingId] = useState<string | null>(null);

  const draftFor = useCallback((id: string) => drafts[id] ?? EMPTY_DRAFT, [drafts]);

  const patch = useCallback((id: string, p: Partial<TaskDraft>) => {
    setDrafts((d) => ({ ...d, [id]: { ...(d[id] ?? EMPTY_DRAFT), ...p } }));
  }, []);

  const pickScreenshot = useCallback(
    async (task: DailyTask, source: 'camera' | 'library') => {
      const image = await pickImage(source);
      if (!image) return;
      patch(task.$id, { localUri: image.uri, uploading: true, screenshotFileId: null });
      try {
        const fileId = await uploadImage('taskScreenshots', image);
        patch(task.$id, { screenshotFileId: fileId, uploading: false });
      } catch (e) {
        patch(task.$id, { uploading: false, localUri: null });
        toast.error(e);
      }
    },
    [patch, toast],
  );

  const complete = useCallback(
    async (task: DailyTask): Promise<CompleteTaskResult | null> => {
      const d = drafts[task.$id] ?? EMPTY_DRAFT;
      setCompletingId(task.$id);
      try {
        const res = await completeTask({
          taskId: task.$id,
          testerId,
          dueDate: task.dueDate,
          screenshotFileId: d.screenshotFileId,
          answer: d.answer.trim() || null,
          note: d.note.trim() || null,
        }).unwrap();
        fire('success');
        toast.success(res.bonus ? `+${res.pointsAwarded + res.bonus} points — test complete!` : `+${res.pointsAwarded} points · ${res.streak}-day streak`);
        return res;
      } catch (e) {
        fire('error');
        toast.error(e);
        return null;
      } finally {
        setCompletingId(null);
      }
    },
    [drafts, completeTask, testerId, fire, toast],
  );

  return { draftFor, patch, pickScreenshot, complete, completingId, isCompleting: state.isLoading };
}
