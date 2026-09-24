import type { NotificationPrefs, Profile, ProfileRow } from '@/lib/domain/types';
import { toAppError } from '@/lib/errors';
import type { UpdateProfileInput } from '@/lib/validators';
import { callFunction, FUNCTIONS, getRowOrNull, TABLES } from '@/services/appwrite';
import { api } from '@/store/api';
import { useAppSelector } from '@/store/hooks';

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  dailyTasks: true,
  reminders: true,
  reminderTime: '19:00',
  testerActivity: true,
  feedback: true,
  marketing: false,
};

export function parsePrefs(raw: string | null | undefined): NotificationPrefs {
  if (!raw) return DEFAULT_NOTIFICATION_PREFS;
  try {
    return { ...DEFAULT_NOTIFICATION_PREFS, ...(JSON.parse(raw) as Partial<NotificationPrefs>) };
  } catch {
    return DEFAULT_NOTIFICATION_PREFS;
  }
}

export const profileApi = api.injectEndpoints({
  endpoints: (build) => ({
    getProfile: build.query<Profile | null, string>({
      async queryFn(userId) {
        try {
          return { data: await getRowOrNull<ProfileRow>(TABLES.profiles, userId) };
        } catch (e) {
          return { error: toAppError(e) };
        }
      },
      providesTags: ['Profile'],
    }),
    updateProfile: build.mutation<Profile, UpdateProfileInput & { userId: string }>({
      async queryFn({ userId: _userId, ...input }) {
        try {
          return { data: await callFunction<Profile>(FUNCTIONS.updateProfile, input) };
        } catch (e) {
          return { error: toAppError(e) };
        }
      },
      // Optimistic: patch the cached profile, roll back if the function rejects.
      async onQueryStarted({ userId, ...input }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          profileApi.util.updateQueryData('getProfile', userId, (draft) => {
            if (!draft) return;
            const { notificationPrefs, ...rest } = input;
            Object.assign(draft, rest);
            if (notificationPrefs) draft.notificationPrefs = JSON.stringify(notificationPrefs);
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: ['Profile'],
    }),
  }),
});

export const { useGetProfileQuery, useUpdateProfileMutation } = profileApi;

/** Current user's profile (skips while signed out). */
export function useMyProfile() {
  const userId = useAppSelector((s) => s.auth.userId);
  return useGetProfileQuery(userId ?? '', { skip: !userId });
}
