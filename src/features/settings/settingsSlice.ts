import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { Role } from '@/lib/domain/types';
import type { ThemeMode } from '@/theme/ThemeProvider';

export type MotionPref = 'system' | 'reduced' | 'full';

export interface SettingsState {
  themeMode: ThemeMode;
  motion: MotionPref;
  haptics: boolean;
  /** Local reminder time for pending tester tasks (HH:mm). */
  reminderTime: string;
  onboardingSeen: Record<Role, boolean>;
  notificationPrimerSeen: boolean;
}

const initialState: SettingsState = {
  themeMode: 'system',
  motion: 'system',
  haptics: true,
  reminderTime: '19:00',
  onboardingSeen: { developer: false, tester: false },
  notificationPrimerSeen: false,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    themeModeChanged(state, action: PayloadAction<ThemeMode>) {
      state.themeMode = action.payload;
    },
    motionPrefChanged(state, action: PayloadAction<MotionPref>) {
      state.motion = action.payload;
    },
    hapticsToggled(state, action: PayloadAction<boolean>) {
      state.haptics = action.payload;
    },
    reminderTimeChanged(state, action: PayloadAction<string>) {
      state.reminderTime = action.payload;
    },
    onboardingCompleted(state, action: PayloadAction<Role>) {
      state.onboardingSeen[action.payload] = true;
    },
    notificationPrimerSeen(state) {
      state.notificationPrimerSeen = true;
    },
  },
});

export const {
  themeModeChanged,
  motionPrefChanged,
  hapticsToggled,
  reminderTimeChanged,
  onboardingCompleted,
  notificationPrimerSeen,
} = settingsSlice.actions;
export default settingsSlice.reducer;
