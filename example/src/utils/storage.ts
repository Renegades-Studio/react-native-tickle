import { createMMKV } from 'react-native-mmkv';

export const storage = createMMKV({
  id: 'ahap-recorder-storage',
});

export const STORAGE_KEYS = {
  RECORDINGS: 'recordings',
} as const;
