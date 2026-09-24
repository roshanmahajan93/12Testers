import { createMMKV } from 'react-native-mmkv';
import type { Storage } from 'redux-persist';

/** MMKV-backed storage for redux-persist (sync under the hood, Promise API on top). */
const mmkv = createMMKV({ id: 'twelvetesters.persist' });

export const mmkvStorage: Storage = {
  setItem: (key: string, value: string) => {
    mmkv.set(key, value);
    return Promise.resolve(true);
  },
  getItem: (key: string) => Promise.resolve(mmkv.getString(key) ?? null),
  removeItem: (key: string) => {
    mmkv.remove(key);
    return Promise.resolve();
  },
};

/** Small synchronous KV for non-redux flags (e.g. cached JWT). */
export const kv = mmkv;
