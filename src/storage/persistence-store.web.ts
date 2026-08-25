import type { PersistenceStore } from './persistence-store';

export const persistenceStore: PersistenceStore = {
  async getItem(key: string): Promise<string | null> {
    return globalThis.localStorage?.getItem(key) ?? null;
  },

  async setItem(key: string, value: string): Promise<void> {
    globalThis.localStorage?.setItem(key, value);
  },

  async removeItem(key: string): Promise<void> {
    globalThis.localStorage?.removeItem(key);
  },
};
