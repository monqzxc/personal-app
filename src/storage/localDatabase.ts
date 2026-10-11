import type { Database } from '../types/models.ts';
import { ensure, validateDatabase } from '../services/validation.ts';
import { emptyDatabase, migrateDatabase, SCHEMA_VERSION } from './migrations.ts';

export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}
export const DATABASE_KEY = 'daywell.database';
export const BEFORE_IMPORT_KEY = `${DATABASE_KEY}.beforeImport`;

export function requireRestorableSize(data: Database): void {
  // shortcut: stay below Android's per-entry read limit; use SQLite for larger datasets.
  ensure(new TextEncoder().encode(JSON.stringify(data)).byteLength <= 1.5 * 1024 * 1024,
    'This version can restore up to 1.5 MB of saved records. This dataset is too large; your current data has not changed.');
}

export function requireFinishedWorkouts(data: Database): void {
  ensure(!data.activities.some(item => !item.deletedAt && item.status !== 'completed'), 'Finish and save the active workout before exporting or importing a backup.');
}

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

  previousSnapshot(): Promise<Database | null> {
    return this.exclusive(async () => {
      const raw = await this.storage.getItem(BEFORE_IMPORT_KEY);
      return raw === null ? null : migrateDatabase(JSON.parse(raw));
    });
  }

  replace(data: Database, expected: string): Promise<void> {
    validateDatabase(data);
    requireFinishedWorkouts(data);
    requireRestorableSize(data);
    const replacement = JSON.stringify(data);
    return this.exclusive(async () => {
      const current = await this.read();
      requireFinishedWorkouts(current);
      requireRestorableSize(current);
      const original = JSON.stringify(current);
      ensure(original === expected, 'Your data changed after the preview. Choose the backup again to review the latest data before replacing it.');
      // Keep a recoverable copy before the single write that replaces the database.
      await this.storage.setItem(BEFORE_IMPORT_KEY, original);
      await this.storage.setItem(DATABASE_KEY, replacement);
    });
  }

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
