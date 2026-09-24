import { toAppError } from '@/lib/errors';
import { callFunction, clearJwtCache, disconnectRealtime, FUNCTIONS } from '@/services/appwrite';
import { cancelAllLocalReminders } from '@/services/notifications/reminders';
import { logoutPurchases } from '@/services/purchases';
import { api } from '@/store/api';

import { signedOut } from '../auth/authSlice';

export const accountApi = api.injectEndpoints({
  endpoints: (build) => ({
    /** Server deletes all user data + the Appwrite user (Play policy). */
    deleteAccount: build.mutation<null, void>({
      async queryFn(_arg, { dispatch }) {
        try {
          await callFunction(FUNCTIONS.deleteAccount, {});
          await Promise.allSettled([disconnectRealtime(), logoutPurchases(), cancelAllLocalReminders()]);
          clearJwtCache();
          dispatch(signedOut());
          dispatch(api.util.resetApiState());
          return { data: null };
        } catch (e) {
          return { error: toAppError(e) };
        }
      },
    }),
    report: build.mutation<null, { targetType: 'app' | 'feedback' | 'tester' | 'task'; targetId: string; reason: string }>({
      async queryFn(input) {
        try {
          await callFunction(FUNCTIONS.report, input);
          return { data: null };
        } catch (e) {
          return { error: toAppError(e) };
        }
      },
    }),
  }),
});

export const { useDeleteAccountMutation, useReportMutation } = accountApi;
