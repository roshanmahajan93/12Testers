import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { FLUSH, PAUSE, PERSIST, persistReducer, persistStore, PURGE, REGISTER, REHYDRATE } from 'redux-persist';

import authReducer, { type AuthState } from '@/features/auth/authSlice';
import settingsReducer from '@/features/settings/settingsSlice';
import uiReducer from '@/features/ui/uiSlice';

import { api } from './api';
import { mmkvStorage } from './storage';

// Persist only session meta (not server data). Session validity is re-checked on boot.
const authPersistConfig = {
  key: 'auth',
  storage: mmkvStorage,
  whitelist: ['userId', 'role', 'intendedRole', 'needsTesterSetup'] satisfies (keyof AuthState)[],
};

const settingsPersistConfig = { key: 'settings', storage: mmkvStorage };

const rootReducer = combineReducers({
  auth: persistReducer(authPersistConfig, authReducer),
  settings: persistReducer(settingsPersistConfig, settingsReducer),
  ui: uiReducer,
  [api.reducerPath]: api.reducer,
});

export function makeStore() {
  return configureStore({
    reducer: rootReducer,
    middleware: (getDefault) =>
      getDefault({
        serializableCheck: { ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER] },
      }).concat(api.middleware),
  });
}

export const store = makeStore();
export const persistor = persistStore(store);
setupListeners(store.dispatch);

export type RootState = ReturnType<typeof rootReducer>;
export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore['dispatch'];
