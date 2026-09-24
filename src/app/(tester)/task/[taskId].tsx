import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { EmptyState, Header, Screen, SkeletonCardList } from '@/components/ui';
import { useDomainConfig } from '@/features/config/configApi';
import { TaskCard } from '@/features/tasks/TaskCard';
import { useTaskCompletion } from '@/features/tasks/useTaskCompletion';
import { useTaskQuery } from '@/features/tests/testsApi';
import { useRequireRole } from '@/navigation/guards';

/** Deep-link target from notifications: one task on its own screen. */
export default function TaskDetail() {
  useRequireRole('tester');
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const cfg = useDomainConfig();
  const { data: task, isLoading, refetch } = useTaskQuery(taskId);
  const completion = useTaskCompletion();

  return (
    <Screen scroll={false}>
      <Header title={task ? `Day ${task.dayNumber}` : 'Task'} subtitle={task?.appName} back />
      {isLoading ? (
        <SkeletonCardList count={1} height={420} />
      ) : !task ? (
        <EmptyState title="Task not found" message="It may belong to another account or have expired." icon="alert-circle-outline" />
      ) : (
        <View style={{ flex: 1 }}>
          <TaskCard
            task={task}
            days={cfg.TEST_DAYS}
            draft={completion.draftFor(task.$id)}
            onChange={(p) => completion.patch(task.$id, p)}
            onPickScreenshot={(src) => void completion.pickScreenshot(task, src)}
            onComplete={async () => {
              if (await completion.complete(task)) void refetch();
            }}
            completing={completion.completingId === task.$id}
          />
        </View>
      )}
    </Screen>
  );
}
