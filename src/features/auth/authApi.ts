import type { Profile, Role } from '@/lib/domain/types';
import { toAppError } from '@/lib/errors';
import type { TesterSetupInput } from '@/lib/validators';
import {
  callFunction,
  clearJwtCache,
  disconnectRealtime,
  FUNCTIONS,
  sendEmailOtp,
  signInWithGoogle,
  signOutCurrent,
  unregisterPushTarget,
  updateAccountName,
  verifyEmailOtp,
} from '@/services/appwrite';
import { logoutPurchases } from '@/services/purchases';
import { cancelAllLocalReminders } from '@/services/notifications/reminders';
import { api } from '@/store/api';

import { roleAssigned, signedOut, testerSetupCompleted } from './authSlice';
import { refreshSession } from './useSessionBootstrap';

export const authApi = api.injectEndpoints({
  endpoints: (build) => ({
    sendOtp: build.mutation<{ userId: string }, { email: string }>({
      async queryFn({ email }) {
        try {
          return { data: await sendEmailOtp(email) };
        } catch (e) {
          return { error: toAppError(e) };
        }
      },
    }),
    verifyOtp: build.mutation<null, { userId: string; code: string }>({
      async queryFn({ userId, code }, { dispatch }) {
        try {
          await verifyEmailOtp(userId, code);
          await refreshSession(dispatch);
          return { data: null };
        } catch (e) {
          return { error: toAppError(e) };
        }
      },
    }),
    googleSignIn: build.mutation<'success' | 'cancelled', void>({
      async queryFn(_arg, { dispatch }) {
        try {
          const result = await signInWithGoogle();
          if (result === 'success') await refreshSession(dispatch);
          return { data: result };
        } catch (e) {
          return { error: toAppError(e) };
        }
      },
    }),
    /** Server assigns the role label once. The client never writes roles directly. */
    setRole: build.mutation<Profile, { role: Role; timezone?: string; displayName?: string }>({
      async queryFn(input, { dispatch }) {
        try {
          const profile = await callFunction<Profile>(FUNCTIONS.setRole, input);
          clearJwtCache(); // labels changed → old JWT has stale roles
          dispatch(roleAssigned(profile.role));
          return { data: profile };
        } catch (e) {
          return { error: toAppError(e) };
        }
      },
      invalidatesTags: ['Profile'],
    }),
    completeTesterSetup: build.mutation<Profile, TesterSetupInput & { timezone: string }>({
      async queryFn(input, { dispatch }) {
        try {
          const profile = await callFunction<Profile>(FUNCTIONS.updateProfile, input);
          await updateAccountName(input.displayName).catch(() => undefined);
          dispatch(testerSetupCompleted());
          return { data: profile };
        } catch (e) {
          return { error: toAppError(e) };
        }
      },
      invalidatesTags: ['Profile'],
    }),
    signOut: build.mutation<null, void>({
      async queryFn(_arg, { dispatch }) {
        // Remove this device's push target while the session is still valid, then sign out.
        await unregisterPushTarget();
        await Promise.allSettled([signOutCurrent(), disconnectRealtime(), logoutPurchases(), cancelAllLocalReminders()]);
        clearJwtCache();
        dispatch(signedOut());
        dispatch(api.util.resetApiState());
        return { data: null };
      },
    }),
  }),
});

export const {
  useSendOtpMutation,
  useVerifyOtpMutation,
  useGoogleSignInMutation,
  useSetRoleMutation,
  useCompleteTesterSetupMutation,
  useSignOutMutation,
} = authApi;
