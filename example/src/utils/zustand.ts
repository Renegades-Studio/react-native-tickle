import { type StateStorage } from 'zustand/middleware';
import { type MMKV } from 'react-native-mmkv';

export const getZustandStorage: (storage: MMKV) => StateStorage = (
  storage
) => ({
  setItem: (name, value) => {
    return storage.set(name, value);
  },
  getItem: (name) => {
    const value = storage.getString(name);
    return value ?? null;
  },
  removeItem: (name) => {
    return storage.remove(name);
  },
});
