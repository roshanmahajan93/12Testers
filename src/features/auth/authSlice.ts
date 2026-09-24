import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { Role } from '@/lib/domain/types';

export type SessionStatus = 'unknown' | 'signedOut' | 'signedIn';

export interface AuthState {
  status: SessionStatus;
  userId: string | null;
  email: string | null;
  name: string | null;
  /** Role from the server-side user label. Null for a brand-new account before setRole. */
  role: Role | null;
  /** Role picked on the welcome screen; only used to call setRole on first sign-up. */
  intendedRole: Role | null;
  /** Tester signed up but hasn't finished the device/profile step. */
  needsTesterSetup: boolean;
  /** Existing account signed in through the other role's entry — show the explainer sheet. */
  roleMismatch: Role | null;
}

const initialState: AuthState = {
  status: 'unknown',
  userId: null,
  email: null,
  name: null,
  role: null,
  intendedRole: null,
  needsTesterSetup: false,
  roleMismatch: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    intendedRoleChosen(state, action: PayloadAction<Role>) {
      state.intendedRole = action.payload;
    },
    sessionResolved(
      state,
      action: PayloadAction<{ userId: string; email: string; name: string; role: Role | null; needsTesterSetup: boolean }>,
    ) {
      const { userId, email, name, role, needsTesterSetup } = action.payload;
      state.status = 'signedIn';
      state.userId = userId;
      state.email = email;
      state.name = name;
      state.role = role;
      state.needsTesterSetup = needsTesterSetup;
      state.roleMismatch = role && state.intendedRole && role !== state.intendedRole ? role : null;
    },
    roleAssigned(state, action: PayloadAction<Role>) {
      state.role = action.payload;
      state.needsTesterSetup = action.payload === 'tester';
      state.roleMismatch = null;
    },
    testerSetupCompleted(state) {
      state.needsTesterSetup = false;
    },
    roleMismatchDismissed(state) {
      state.roleMismatch = null;
      state.intendedRole = state.role;
    },
    signedOut() {
      return { ...initialState, status: 'signedOut' as const };
    },
  },
});

export const {
  intendedRoleChosen,
  sessionResolved,
  roleAssigned,
  testerSetupCompleted,
  roleMismatchDismissed,
  signedOut,
} = authSlice.actions;
export default authSlice.reducer;
