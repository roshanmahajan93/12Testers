/** Tester-side data: open tests, claiming, my enrollments, today's tasks, completion, feedback. */
import type { App, AppRow, DailyTask, DailyTaskRow, Enrollment, EnrollmentRow, Feedback, TestPlanDay, TestPlanRow } from '@/lib/domain/types';
import { toAppError } from '@/lib/errors';
import type { CompleteTaskInput, FeedbackInput } from '@/lib/validators';
import { callFunction, FUNCTIONS, getRow, listRows, Query, TABLES } from '@/services/appwrite';
import { api } from '@/store/api';

async function run<T>(fn: () => Promise<T>): Promise<{ data: T } | { error: ReturnType<typeof toAppError> }> {
  try {
    return { data: await fn() };
  } catch (e) {
    return { error: toAppError(e) };
  }
}

export interface CompleteTaskResult {
  task: DailyTask;
  pointsAwarded: number;
  bonus: number;
  streak: number;
  enrollmentCompleted: boolean;
}

export const testsApi = api.injectEndpoints({
  endpoints: (build) => ({
    openTests: build.query<App[], void>({
      queryFn: () =>
        run(() =>
          listRows<AppRow>(TABLES.apps, [
            Query.equal('status', ['recruiting', 'testing']),
            Query.greaterThan('slotsOpen', 0),
            Query.orderDesc('isBoosted'),
            Query.orderDesc('$createdAt'),
            Query.limit(100),
          ]),
        ),
      providesTags: ['Apps'],
    }),
    openTest: build.query<App, string>({
      queryFn: (id) => run(() => getRow<AppRow>(TABLES.apps, id)),
      providesTags: (_r, _e, id) => [{ type: 'App', id }],
    }),
    planPreview: build.query<TestPlanDay[], string>({
      queryFn: (appId) =>
        run(() => listRows<TestPlanRow>(TABLES.testPlans, [Query.equal('appId', appId), Query.orderAsc('dayNumber'), Query.limit(60)])),
      providesTags: (_r, _e, appId) => [{ type: 'TestPlan', id: appId }],
    }),
    myEnrollments: build.query<Enrollment[], string>({
      queryFn: (testerId) =>
        run(() => listRows<EnrollmentRow>(TABLES.enrollments, [Query.equal('testerId', testerId), Query.orderDesc('joinedAt'), Query.limit(100)])),
      providesTags: ['Enrollments'],
    }),
    claimTest: build.mutation<{ enrollment: Enrollment; testStarted: boolean }, { appId: string }>({
      queryFn: (input) => run(() => callFunction<{ enrollment: Enrollment; testStarted: boolean }>(FUNCTIONS.claimTest, input)),
      invalidatesTags: (_r, _e, { appId }) => ['Enrollments', 'Apps', { type: 'App', id: appId }, 'DailyTasks'],
    }),
    tasksForDay: build.query<DailyTask[], { testerId: string; dueDate: string }>({
      queryFn: ({ testerId, dueDate }) =>
        run(() =>
          listRows<DailyTaskRow>(TABLES.dailyTasks, [
            Query.equal('testerId', testerId),
            Query.equal('dueDate', dueDate),
            Query.orderAsc('$createdAt'),
            Query.limit(50),
          ]),
        ),
      providesTags: ['DailyTasks'],
    }),
    enrollmentTasks: build.query<DailyTask[], string>({
      queryFn: (enrollmentId) =>
        run(() => listRows<DailyTaskRow>(TABLES.dailyTasks, [Query.equal('enrollmentId', enrollmentId), Query.orderAsc('dayNumber'), Query.limit(60)])),
      providesTags: ['DailyTasks'],
    }),
    task: build.query<DailyTask, string>({
      queryFn: (id) => run(() => getRow<DailyTaskRow>(TABLES.dailyTasks, id)),
      providesTags: ['DailyTasks'],
    }),
    completeTask: build.mutation<CompleteTaskResult, CompleteTaskInput & { testerId: string; dueDate: string }>({
      queryFn: ({ testerId: _t, dueDate: _d, ...input }) => run(() => callFunction<CompleteTaskResult>(FUNCTIONS.completeDailyTask, input)),
      // Optimistic: flip the card to completed immediately; roll back if the server says no.
      async onQueryStarted({ taskId, testerId, dueDate, screenshotFileId, answer, note }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          testsApi.util.updateQueryData('tasksForDay', { testerId, dueDate }, (draft) => {
            const t = draft.find((x) => x.$id === taskId);
            if (t) Object.assign(t, { status: 'completed', screenshotFileId, answer, note, completedAt: new Date().toISOString() });
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: ['Enrollments', 'Points', 'Profile'],
    }),
    submitFeedback: build.mutation<Feedback, FeedbackInput>({
      queryFn: (input) => run(() => callFunction<Feedback>(FUNCTIONS.submitFeedback, input)),
      invalidatesTags: ['Feedback'],
    }),
  }),
});

export const {
  useOpenTestsQuery,
  useOpenTestQuery,
  usePlanPreviewQuery,
  useMyEnrollmentsQuery,
  useClaimTestMutation,
  useTasksForDayQuery,
  useEnrollmentTasksQuery,
  useTaskQuery,
  useCompleteTaskMutation,
  useSubmitFeedbackMutation,
} = testsApi;
