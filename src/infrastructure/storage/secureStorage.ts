import * as SecureStore from 'expo-secure-store';

const getKey = (key: string): string => `libot_kiosk:${key}`;

export const secureStorage = {
  async get<T>(key: string): Promise<T | null> {
    const value = await SecureStore.getItemAsync(getKey(key));
    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  },

  async set<T>(key: string, value: T): Promise<void> {
    const storageValue = typeof value === 'string' ? value : JSON.stringify(value);
    await SecureStore.setItemAsync(getKey(key), storageValue);
  },

  async remove(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(getKey(key));
  },

  async clear(): Promise<void> {
    await Promise.resolve();
  },
};
