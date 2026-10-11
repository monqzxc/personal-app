import type { Database } from '../types/models.ts';
import { ensure, validateDatabase } from '../services/validation.ts';
import { emptyLifeCollections } from '../features/library/catalog.ts';

export const SCHEMA_VERSION = 6;
export const emptyDatabase = (): Database => ({
  ...emptyLifeCollections(), schemaVersion: 6, tasks: [], events: [],
  settings: { theme: 'system', currency: 'PHP', name: '', notificationsEnabled: false },
});

export function migrateV1ToV2(data: Record<string, unknown>): Record<string, unknown> {
  ensure(data.settings !== null && typeof data.settings === 'object', 'Saved preferences are invalid.');
  return { ...data, ...emptyLifeCollections(), schemaVersion: 2, settings: { ...data.settings, notificationsEnabled: false } };
}
export function migrateV2ToV3(data: Record<string, unknown>): Record<string, unknown> {
  const addFields = (key: string, defaults: Record<string, unknown>) => {
    const records = data[key];
    ensure(Array.isArray(records), `Saved ${key} collection is invalid.`);
    return records.map((record: unknown) => {
      ensure(record !== null && typeof record === 'object' && !Array.isArray(record), 'Invalid saved record.');
      return { ...defaults, ...record };
    });
  };
  return { ...data, schemaVersion: 3, wallets: [], expectedIncome: [],
    transactions: addFields('transactions', { walletId: '', toWalletId: '', expectedIncomeId: '' }),
    bills: addFields('bills', { walletId: '' }), subscriptions: addFields('subscriptions', { walletId: '' }),
    budgets: addFields('budgets', { alertsEnabled: true }) };
}
export function migrateV3ToV4(data: Record<string, unknown>): Record<string, unknown> {
  return { ...data, schemaVersion: 4, people: [], debts: [], repayments: [] };
}
export function migrateV4ToV5(data: Record<string, unknown>): Record<string, unknown> {
  return { ...data, schemaVersion: 5, activities: [] };
}
export function migrateV5ToV6(data: Record<string, unknown>): Record<string, unknown> {
  const addFields = (key: string, fields: (record: Record<string, unknown>) => Record<string, unknown>) => {
    const records = data[key];
    ensure(Array.isArray(records), `Saved ${key} collection is invalid.`);
    return records.map((record: unknown) => {
      ensure(record !== null && typeof record === 'object' && !Array.isArray(record), 'Invalid saved record.');
      return { ...fields(record as Record<string, unknown>), ...record };
    });
  };
  const migrated = { ...data, schemaVersion: 6, moneyCollections: [],
    transactions: addFields('transactions', record => ({ name: record.description, personId: '', collectionId: '' })),
    debts: addFields('debts', () => ({ direction: 'lent', collectionId: '' })),
    repayments: addFields('repayments', () => ({ collectionId: '' })),
  };
  for (const key of ['tasks', 'events', 'trips', 'tripItems', 'projects', 'goals', 'notes', 'activities', 'importantDates']) {
    Object.assign(migrated, { [key]: addFields(key, () => ({ peopleIds: [] })) });
  }
  return migrated;
}
const migrations: Record<number, (data: Record<string, unknown>) => Record<string, unknown>> = { 1: migrateV1ToV2, 2: migrateV2ToV3, 3: migrateV3ToV4, 4: migrateV4ToV5, 5: migrateV5ToV6 };

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
