import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  kind: ToastKind;
  message: string;
}

export interface UiState {
  toasts: Toast[];
  online: boolean;
}

const initialState: UiState = { toasts: [], online: true };

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toastShown: {
      reducer(state, action: PayloadAction<Toast>) {
        // Keep at most 3 on screen.
        state.toasts = [...state.toasts.slice(-2), action.payload];
      },
      prepare(kind: ToastKind, message: string) {
        return { payload: { id: nanoid(), kind, message } };
      },
    },
    toastDismissed(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
    connectivityChanged(state, action: PayloadAction<boolean>) {
      state.online = action.payload;
    },
  },
});

export const { toastShown, toastDismissed, connectivityChanged } = uiSlice.actions;
export default uiSlice.reducer;
