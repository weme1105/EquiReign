import * as SQLite from 'expo-sqlite';
import type { PersistenceStore } from './persistence-store';

const DATABASE_NAME = 'equireign.db';
const TABLE_NAME = 'app_storage';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (databasePromise === null) {
    databasePromise = SQLite.openDatabaseAsync(DATABASE_NAME)
      .then(async (database) => {
        await database.execAsync(`
          CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
            key TEXT PRIMARY KEY NOT NULL,
            value TEXT NOT NULL,
            updated_at INTEGER NOT NULL
          );
        `);
        return database;
      })
      .catch((error: unknown) => {
        databasePromise = null;
        throw error;
      });
  }

  return databasePromise;
}

export const persistenceStore: PersistenceStore = {
  async getItem(key: string): Promise<string | null> {
    const database = await openDatabase();
    const row = await database.getFirstAsync<{ value: string }>(
      `SELECT value FROM ${TABLE_NAME} WHERE key = ?`,
      key,
    );
    return row?.value ?? null;
  },

  async setItem(key: string, value: string): Promise<void> {
    const database = await openDatabase();
    await database.runAsync(
      `INSERT INTO ${TABLE_NAME} (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         updated_at = excluded.updated_at`,
      key,
      value,
      Date.now(),
    );
  },

  async removeItem(key: string): Promise<void> {
    const database = await openDatabase();
    await database.runAsync(`DELETE FROM ${TABLE_NAME} WHERE key = ?`, key);
  },
};
