/// <reference types="node" />
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { BackupService, backupCounts, encodeBackup, MAX_BACKUP_BYTES, parseBackup } from '../src/services/backupService.ts';
import { BEFORE_IMPORT_KEY, DATABASE_KEY, LocalDatabase, type KeyValueStorage } from '../src/storage/localDatabase.ts';
import { emptyDatabase } from '../src/storage/migrations.ts';
import { LocalLifeRepository } from '../src/repositories/lifeRepository.ts';
import { LocalFitnessRepository } from '../src/repositories/fitnessRepository.ts';
import { LocalTaskRepository } from '../src/repositories/taskRepository.ts';
import { LocalCalendarRepository } from '../src/repositories/calendarRepository.ts';
import { LifeService } from '../src/services/lifeService.ts';
import { TaskService, emptyTask } from '../src/features/tasks/taskService.ts';
import { CalendarService, emptyEvent } from '../src/services/calendarService.ts';
import { moduleDefaults, moduleKeys, modules } from '../src/features/library/catalog.ts';
import { financeSummary, owedTotal } from '../src/features/finance/selectors.ts';

class MemoryStorage implements KeyValueStorage {
  data = new Map<string, string>();
  failKey = '';
  async getItem(key: string) { return this.data.get(key) ?? null; }
  async setItem(key: string, value: string) {
    if (this.failKey === key) throw new Error('Disk full');
    this.data.set(key, value);
  }
}
function setup() {
  const storage = new MemoryStorage();
  const db = new LocalDatabase(storage);
  const backup = new BackupService(db);
  const tasks = new TaskService(new LocalTaskRepository(db), randomUUID);
  const calendar = new CalendarService(new LocalCalendarRepository(db), randomUUID);
  const life = new LifeService(new LocalLifeRepository(db), randomUUID);
  return { storage, db, backup, tasks, calendar, life, fitness: new LocalFitnessRepository(db) };
}
const input = (key: Parameters<typeof moduleDefaults>[0], values: Record<string, unknown>) => ({ ...moduleDefaults(key), ...(key === 'transactions' ? { name: values.description } : {}), ...values });

test('JSON round trip preserves every collection, relationships, money, Unicode, GPS, and deletion history', async () => {
  const source = setup();
  const date = '2026-01-01';
  const task = await source.tasks.save({ ...emptyTask(), title: 'Pack for Cebu', subtasks: [{ id: randomUUID(), title: 'Shoes', completed: false }] });
  const deleted = await source.tasks.save({ ...emptyTask(), title: 'Deleted' });
  await source.tasks.delete(deleted.id);
  await source.calendar.save({ ...emptyEvent(date), title: 'Holiday' });
  const wallet = await source.life.save('wallets', input('wallets', { name: 'Cash', openingBalance: 1000 }));
  const person = await source.life.save('people', input('people', { name: 'José 🌙' }));
  const trip = await source.life.save('trips', input('trips', { title: 'Cebu', destination: 'Cebu' }));
  const debt = await source.life.save('debts', input('debts', { name: 'Lunch', personId: person.id, walletId: wallet.id, amount: 100, date }));
  const skipped = new Set(['wallets', 'people', 'trips', 'debts', 'activities']);
  for (const key of moduleKeys.filter(key => !skipped.has(key))) {
    const defaults = moduleDefaults(key);
    for (const field of modules[key].fields) if (field.required && defaults[field.key] === '') defaults[field.key] = 'Example';
    await source.life.save(key, { ...defaults, amount: 10, targetValue: 100, date, walletId: wallet.id, personId: person.id, tripId: trip.id, debtId: debt.id, url: 'https://example.com' });
  }
  const start = Date.parse(`${date}T00:00:00.000Z`);
  const activity = await source.fitness.create(randomUUID(), 'walk', false, start, trip.id);
  await source.fitness.transition(activity.id, 'resume', start);
  await source.fitness.append([{ latitude: 10.3, longitude: 123.9, timestamp: start, accuracy: 5 }], start);
  await source.fitness.transition(activity.id, 'finish', start + 60000);
  await source.db.mutate(data => { data.settings.name = 'Mon'; data.settings.notificationsEnabled = true; data.activities[0]!.taskId = task.id; });
  const original = await source.db.snapshot();
  const json = await source.backup.exportJson();
  assert.deepEqual(parseBackup(json).data, original);
  assert.equal(backupCounts(original).length, moduleKeys.length + 2);
  assert.ok(backupCounts(original).every(item => item.count === 1));

  const destination = setup();
  await destination.backup.restore(await destination.backup.preview(json));
  const restored = await new LocalDatabase(destination.storage).snapshot();
  assert.deepEqual(restored, { ...original, settings: { ...original.settings, notificationsEnabled: false } });
  assert.deepEqual(financeSummary(restored, 'PHP', '2026-01', date), financeSummary(original, 'PHP', '2026-01', date));
  assert.equal(owedTotal(restored, 'PHP', person.id, date), 90);
});

test('invalid JSON, foreign/future formats, unsafe keys, and invalid schemas never change local storage', async () => {
  const { backup, tasks, storage } = setup();
  await tasks.save({ ...emptyTask(), title: 'Keep me' });
  const before = new Map(storage.data);
  const valid = JSON.parse(encodeBackup(emptyDatabase()));
  for (const json of [
    '', '{oops', 'null', '[]', '{}', '{"format":"another-app"}',
    JSON.stringify({ ...valid, formatVersion: 2 }),
    JSON.stringify({ ...valid, exportedAt: 'bad date' }),
    JSON.stringify({ ...valid, data: { ...valid.data, schemaVersion: 99 } }),
    JSON.stringify({ ...valid, data: { ...valid.data, wallets: null } }),
    JSON.stringify({ ...valid, data: { ...valid.data, settings: {} } }),
    encodeBackup(emptyDatabase()).replace('"data": {', '"data": { "__proto__": {"polluted":true},'),
  ]) await assert.rejects(backup.preview(json));
  assert.deepEqual(storage.data, before);
  assert.equal(({} as Record<string, unknown>).polluted, undefined);
});

test('import rejects duplicate IDs, broken financial references and malformed routes', async () => {
  const { backup, tasks, fitness } = setup();
  await tasks.save({ ...emptyTask(), title: 'A task' });
  const original = JSON.parse(await backup.exportJson());
  original.data.tasks.push(original.data.tasks[0]);
  await assert.rejects(backup.preview(JSON.stringify(original)), /Duplicate/);
  const source = setup();
  await source.life.save('transactions', input('transactions', { description: 'Fare', amount: 10 }));
  const broken = JSON.parse(await source.backup.exportJson());
  broken.data.transactions[0].walletId = randomUUID();
  await assert.rejects(backup.preview(JSON.stringify(broken)), /wallet/);
  const activity = await fitness.create(randomUUID(), 'walk', false);
  await fitness.transition(activity.id, 'finish');
  const badRoute = JSON.parse(await backup.exportJson());
  badRoute.data.activities[0].route = [{ latitude: 91, longitude: 123, accuracy: 5, timestamp: Date.now(), segment: 0 }];
  await assert.rejects(backup.preview(JSON.stringify(badRoute)), /route|latitude|GPS/i);
});

test('UTF-8 size limits apply to imports and exports, and BOM files and legacy data are supported', () => {
  const legacy = { ...JSON.parse(encodeBackup(emptyDatabase())), data: { schemaVersion: 1, tasks: [], events: [], settings: { theme: 'dark', currency: 'PHP', name: 'Old app' } } };
  const parsed = parseBackup('\uFEFF' + JSON.stringify(legacy));
  assert.equal(parsed.data.schemaVersion, 6);
  assert.equal(parsed.data.settings.name, 'Old app');
  assert.deepEqual(parsed.data.activities, []);
  assert.throws(() => parseBackup(' '.repeat(MAX_BACKUP_BYTES + 1)), /10 MB/);
  assert.throws(() => parseBackup('🌙'.repeat(MAX_BACKUP_BYTES / 4 + 1)), /10 MB/);
  const huge = emptyDatabase();
  huge.settings.name = 'a'.repeat(MAX_BACKUP_BYTES);
  assert.throws(() => encodeBackup(huge), /10 MB/);
});

test('restore replaces rather than duplicates, and previous data can be previewed and restored after relaunch', async () => {
  const { backup, tasks, db, storage } = setup();
  await assert.rejects(backup.previous(), /no previous import/);
  await tasks.save({ ...emptyTask(), title: 'Original' });
  const original = await db.snapshot();
  const other = setup();
  await other.tasks.save({ ...emptyTask(), title: 'Replacement' });
  const json = await other.backup.exportJson();
  await backup.restore(await backup.preview(json));
  assert.equal((await tasks.getAll())[0]?.title, 'Replacement');
  assert.deepEqual((await backup.previous()).backup.data, original);
  const reloaded = new BackupService(new LocalDatabase(storage));
  await reloaded.restore(await reloaded.previous());
  assert.equal((await tasks.getAll())[0]?.title, 'Original');
  await backup.restore(await backup.preview(json));
  await backup.restore(await backup.preview(json));
  assert.equal((await tasks.getAll()).length, 1);
});

test('oversized saved records are rejected before replacing data or its recovery copy', async () => {
  const { backup, tasks, db, storage } = setup();
  const task = await tasks.save({ ...emptyTask(), title: 'Keep me' });
  const large = await db.snapshot();
  large.tasks = Array.from({ length: 180 }, () => ({ ...task, id: randomUUID(), description: 'a'.repeat(10000) }));
  const original = new Map(storage.data);
  const json = encodeBackup(large);
  await assert.rejects(backup.preview(json), /1.5 MB/);
  assert.throws(() => db.replace(large, JSON.stringify(emptyDatabase())), /1.5 MB/);
  assert.deepEqual(storage.data, original);
  storage.data.set(DATABASE_KEY, JSON.stringify(large));
  await assert.rejects(backup.preview(encodeBackup(emptyDatabase())), /1.5 MB/);
});

test('failed recovery-copy or database writes preserve the original and allow retry', async () => {
  for (const failKey of [BEFORE_IMPORT_KEY, DATABASE_KEY]) {
    const { backup, tasks, storage } = setup();
    await tasks.save({ ...emptyTask(), title: 'Keep me' });
    const original = storage.data.get(DATABASE_KEY);
    const preview = await backup.preview(encodeBackup(emptyDatabase()));
    storage.failKey = failKey;
    await assert.rejects(backup.restore(preview), /Disk full/);
    assert.equal(storage.data.get(DATABASE_KEY), original);
    storage.failKey = '';
    await backup.restore(preview);
    assert.equal((await tasks.getAll()).length, 0);
    assert.equal(storage.data.get(BEFORE_IMPORT_KEY), original);
  }
});

test('edits after preview and concurrent restores cannot silently overwrite newer records', async () => {
  const { backup, tasks, db } = setup();
  const json = encodeBackup(emptyDatabase());
  const preview = await backup.preview(json);
  const write = tasks.save({ ...emptyTask(), title: 'Newer data' });
  await write;
  await assert.rejects(backup.restore(preview), /changed after the preview/);
  assert.equal((await tasks.getAll())[0]?.title, 'Newer data');
  const fresh = await backup.preview(json);
  const result = await Promise.allSettled([backup.restore(fresh), backup.restore(fresh)]);
  assert.equal(result.filter(item => item.status === 'fulfilled').length, 1);
  assert.equal((await db.snapshot()).tasks.length, 0);
});

test('active workouts are blocked on export, import, and final restore even if started after preview', async () => {
  const { backup, fitness, db } = setup();
  const json = encodeBackup(emptyDatabase());
  const preview = await backup.preview(json);
  const workout = await fitness.create(randomUUID(), 'walk', false);
  await assert.rejects(backup.exportJson(), /Finish/);
  await assert.rejects(backup.preview(json), /Finish/);
  await assert.rejects(backup.restore(preview), /Finish/);
  const untrusted = JSON.parse(json);
  untrusted.data = await db.snapshot();
  assert.throws(() => parseBackup(JSON.stringify(untrusted)), /Finish/);
  await fitness.transition(workout.id, 'finish');
  await backup.restore(await backup.preview(json));
  assert.equal((await db.snapshot()).activities.length, 0);
});
