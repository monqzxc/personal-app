import type { Database } from '../types/models.ts';
import { validateDatabase } from '../services/validation.ts';
import { emptyDatabase, migrateDatabase, SCHEMA_VERSION } from './migrations.ts';

export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}
export const DATABASE_KEY = 'daywell.database';

export class LocalDatabase {
  private storage: KeyValueStorage;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(storage: KeyValueStorage) { this.storage = storage; }

  // ponytail: one serialized JSON document suits a personal Phase 1 dataset.
  // Move to SQLite/per-collection storage if dataset size makes rewrites expensive.
  private exclusive<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.then(operation);
    this.queue = result.catch(() => undefined);
    return result;
  }

  private async read(): Promise<Database> {
    const raw = await this.storage.getItem(DATABASE_KEY);
    if (raw === null) return emptyDatabase();
    let parsed: unknown;
    try { parsed = JSON.parse(raw); }
    catch { throw new Error('Saved data could not be read. It has been preserved; please restore from a device backup.'); }
    const data = migrateDatabase(parsed);
    const previousVersion = (parsed as { schemaVersion: number }).schemaVersion;
    if (previousVersion !== SCHEMA_VERSION) {
      // The original document must be backed up before a migration is committed.
      await this.storage.setItem(`${DATABASE_KEY}.backup.v${previousVersion}`, raw);
      await this.storage.setItem(DATABASE_KEY, JSON.stringify(data));
    }
    return data;
  }

  snapshot(): Promise<Database> { return this.exclusive(() => this.read()); }

  mutate<T>(change: (draft: Database) => T): Promise<T> {
    return this.exclusive(async () => {
      const draft = await this.read();
      const result = change(draft);
      validateDatabase(draft);
      await this.storage.setItem(DATABASE_KEY, JSON.stringify(draft));
      return result;
    });
  }
}
