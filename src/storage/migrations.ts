import type { Database } from '../types/models.ts';
import { ensure, validateDatabase } from '../services/validation.ts';
import { emptyLifeCollections } from '../features/library/catalog.ts';

export const SCHEMA_VERSION = 2;
export const emptyDatabase = (): Database => ({
  ...emptyLifeCollections(), schemaVersion: 2, tasks: [], events: [],
  settings: { theme: 'system', currency: 'PHP', name: '', notificationsEnabled: false },
});

export function migrateV1ToV2(data: Record<string, unknown>): Record<string, unknown> {
  ensure(data.settings !== null && typeof data.settings === 'object', 'Saved preferences are invalid.');
  return { ...data, ...emptyLifeCollections(), schemaVersion: 2, settings: { ...data.settings, notificationsEnabled: false } };
}
const migrations: Record<number, (data: Record<string, unknown>) => Record<string, unknown>> = { 1: migrateV1ToV2 };

export function migrateDatabase(input: unknown): Database {
  ensure(input !== null && typeof input === 'object' && !Array.isArray(input), 'Saved data is not a valid object.');
  let data = input as Record<string, unknown>;
  ensure(Number.isInteger(data.schemaVersion), 'Saved data has no valid schema version.');
  const version = Number(data.schemaVersion);
  ensure(version <= SCHEMA_VERSION, 'This data was created by a newer app. Update the app to continue.');
  while (Number(data.schemaVersion) < SCHEMA_VERSION) {
    const oldVersion = Number(data.schemaVersion);
    const migrate = migrations[oldVersion];
    ensure(migrate, `No safe migration exists for schema ${oldVersion}. Your original data is preserved.`);
    data = migrate(data);
    ensure(data.schemaVersion === oldVersion + 1, 'Migration did not advance the schema safely.');
  }
  validateDatabase(data);
  return data;
}
