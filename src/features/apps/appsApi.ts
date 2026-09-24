/** Developer-side data: my apps, plans, testers (enrollments), tasks, feedback + moderation. */
import type { App, AppRow, DailyTask, DailyTaskRow, Enrollment, EnrollmentRow, Feedback, FeedbackRow, TestPlanDay, TestPlanRow } from '@/lib/domain/types';
import { toAppError } from '@/lib/errors';
import type { SaveAppInput } from '@/lib/validators';
import { callFunction, FUNCTIONS, getRow, listRows, Query, TABLES } from '@/services/appwrite';
import { api } from '@/store/api';

async function run<T>(fn: () => Promise<T>): Promise<{ data: T } | { error: ReturnType<typeof toAppError> }> {
  try {
    return { data: await fn() };
  } catch (e) {
    return { error: toAppError(e) };
  }
}

export const appsApi = api.injectEndpoints({
  endpoints: (build) => ({
    myApps: build.query<App[], string>({
      queryFn: (ownerId) =>
        run(() => listRows<AppRow>(TABLES.apps, [Query.equal('ownerId', ownerId), Query.orderDesc('$updatedAt'), Query.limit(100)])),
      providesTags: (res) => ['Apps', ...(res ?? []).map((a) => ({ type: 'App' as const, id: a.$id }))],
    }),
    app: build.query<App, string>({
      queryFn: (id) => run(() => getRow<AppRow>(TABLES.apps, id)),
      providesTags: (_r, _e, id) => [{ type: 'App', id }],
    }),
    testPlan: build.query<TestPlanDay[], string>({
      queryFn: (appId) =>
        run(() => listRows<TestPlanRow>(TABLES.testPlans, [Query.equal('appId', appId), Query.orderAsc('dayNumber'), Query.limit(60)])),
      providesTags: (_r, _e, appId) => [{ type: 'TestPlan', id: appId }],
    }),
    saveApp: build.mutation<App, SaveAppInput>({
      queryFn: (input) => run(() => callFunction<App>(FUNCTIONS.saveApp, input)),
      invalidatesTags: (res) => ['Apps', ...(res ? [{ type: 'App' as const, id: res.$id }, { type: 'TestPlan' as const, id: res.$id }] : [])],
    }),
    listApp: build.mutation<{ app: App; creditsSpent: number }, { appId: string }>({
      queryFn: (input) => run(() => callFunction<{ app: App; creditsSpent: number }>(FUNCTIONS.listApp, input)),
      invalidatesTags: (_r, _e, { appId }) => ['Apps', { type: 'App', id: appId }, 'Credits', 'Profile'],
    }),
    manageApp: build.mutation<unknown, { appId: string; action: 'pause' | 'resume' | 'cancel' }>({
      queryFn: (input) => run(() => callFunction<unknown>(FUNCTIONS.manageApp, input)),
      invalidatesTags: (_r, _e, { appId }) => ['Apps', { type: 'App', id: appId }, 'Credits', 'Profile', 'Enrollments'],
    }),
    appEnrollments: build.query<Enrollment[], string>({
      queryFn: (appId) =>
        run(() => listRows<EnrollmentRow>(TABLES.enrollments, [Query.equal('appId', appId), Query.orderAsc('joinedAt'), Query.limit(100)])),
      providesTags: ['Enrollments'],
    }),
    appTasks: build.query<DailyTask[], { appId: string; since?: string }>({
      queryFn: ({ appId, since }) =>
        run(() =>
          listRows<DailyTaskRow>(TABLES.dailyTasks, [
            Query.equal('appId', appId),
            ...(since ? [Query.greaterThanEqual('dueDate', since)] : []),
            Query.orderDesc('dueDate'),
            Query.limit(500),
          ]),
        ),
      providesTags: ['DailyTasks'],
    }),
    appFeedback: build.query<Feedback[], string>({
      queryFn: (appId) =>
        run(() => listRows<FeedbackRow>(TABLES.feedback, [Query.equal('appId', appId), Query.orderDesc('$createdAt'), Query.limit(200)])),
      providesTags: ['Feedback'],
    }),
    developerFeedback: build.query<Feedback[], string>({
      queryFn: (developerId) =>
        run(() => listRows<FeedbackRow>(TABLES.feedback, [Query.equal('developerId', developerId), Query.orderDesc('$createdAt'), Query.limit(20)])),
      providesTags: ['Feedback'],
    }),
    flagTask: build.mutation<DailyTask, { taskId: string; reason: string; appId: string }>({
      queryFn: ({ taskId, reason }) => run(() => callFunction<DailyTask>(FUNCTIONS.moderate, { action: 'flagTask', taskId, reason })),
      invalidatesTags: ['DailyTasks', 'Enrollments'],
    }),
    rateFeedback: build.mutation<Feedback, { feedbackId: string; rating: number; appId: string }>({
      queryFn: ({ feedbackId, rating }) => run(() => callFunction<Feedback>(FUNCTIONS.moderate, { action: 'rateFeedback', feedbackId, rating })),
      async onQueryStarted({ feedbackId, rating, appId }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          appsApi.util.updateQueryData('appFeedback', appId, (draft) => {
            const f = draft.find((x) => x.$id === feedbackId);
            if (f) f.ownerRating = rating;
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),
  }),
});

export const {
  useMyAppsQuery,
  useAppQuery,
  useTestPlanQuery,
  useSaveAppMutation,
  useListAppMutation,
  useManageAppMutation,
  useAppEnrollmentsQuery,
  useAppTasksQuery,
  useAppFeedbackQuery,
  useDeveloperFeedbackQuery,
  useFlagTaskMutation,
  useRateFeedbackMutation,
} = appsApi;
