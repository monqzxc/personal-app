/// <reference types="node" />
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { LocalDatabase, DATABASE_KEY, type KeyValueStorage } from '../src/storage/localDatabase.ts';
import { LocalLifeRepository } from '../src/repositories/lifeRepository.ts';
import { LocalFitnessRepository } from '../src/repositories/fitnessRepository.ts';
import { LifeService } from '../src/services/lifeService.ts';
import { moduleDefaults } from '../src/features/library/catalog.ts';
import { appendPosition, distanceMeters, durationText, elapsedMilliseconds, paceText, routeSegments, weeklyFitness } from '../src/features/fitness/tracking.ts';
import { validateDatabase } from '../src/services/validation.ts';

const start = Date.parse('2026-10-05T00:00:00.000Z');
class MemoryStorage implements KeyValueStorage {
  values = new Map<string, string>();
  fail = false;
  async getItem(key: string) { return this.values.get(key) ?? null; }
  async setItem(key: string, value: string) { if (this.fail) throw new Error('Storage unavailable'); this.values.set(key, value); }
}
function setup() {
  const storage = new MemoryStorage();
  const db = new LocalDatabase(storage);
  return { storage, db, fitness: new LocalFitnessRepository(db), life: new LifeService(new LocalLifeRepository(db), randomUUID) };
}
const point = (seconds: number, longitude = 123.9) => ({ latitude: 10.3, longitude, accuracy: 5, timestamp: start + seconds * 1000 });

test('manual activities validate measurements and retain task/trip links, identity and persistence', async () => {
  const { life, db, storage } = setup();
  const trip = await life.save('trips', { ...moduleDefaults('trips'), title: 'Cebu', destination: 'Cebu' });
  const activity = await life.save('activities', { ...moduleDefaults('activities'), name: 'Evening walk', date: '2026-10-05', durationMinutes: 30, distanceKm: 2.5, tripId: trip.id, taskId: randomUUID() });
  const edited = await life.save('activities', { ...activity, durationMinutes: 35 }, activity.id);
  assert.equal(edited.version, 2);
  assert.equal(edited.taskId, activity.taskId);
  assert.deepEqual((await new LocalFitnessRepository(new LocalDatabase(storage)).list())[0], edited);
  await assert.rejects(life.save('activities', { ...activity, durationMinutes: 0 }), /positive duration/);
  await assert.rejects(life.save('activities', { ...activity, distanceKm: -1 }), /Distance/);
  await assert.rejects(life.save('activities', { ...activity, distanceKm: NaN }), /Distance/);
  await assert.rejects(life.save('activities', { ...activity, source: 'gps' }), /Start GPS/);
  await life.delete('activities', activity.id);
  assert.equal((await life.getAll()).activities.length, 0);
  assert.ok((await db.snapshot()).activities[0]?.deletedAt);
});

test('distance and pace use real units, handle the date line, and do not divide by zero', () => {
  assert.ok(Math.abs(distanceMeters({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 0.01 }) - 1111.949) < 0.01);
  assert.ok(distanceMeters({ latitude: 0, longitude: 179.999 }, { latitude: 0, longitude: -179.999 }) < 225);
  assert.equal(paceText(30, 2.5), '12:00 /km');
  assert.equal(paceText(30, 0), '—');
  assert.equal(durationText(90.5), '01:30:30');
});

test('GPS timer excludes pauses, ignores late callbacks, separates resumed route segments, and finishes once', async () => {
  const { fitness, life, db } = setup();
  const activity = await fitness.create(randomUUID(), 'walk', true, start);
  await fitness.transition(activity.id, 'resume', start);
  await fitness.append([point(0), point(10, 123.9001)], start + 10000);
  const paused = await fitness.transition(activity.id, 'pause', start + 60000);
  assert.equal(paused.durationMinutes, 1);
  assert.equal(elapsedMilliseconds(paused, start + 600000), 60000);
  assert.equal(await fitness.append([point(70, 123.9002)], start + 70000), null);
  await assert.rejects(life.delete('activities', activity.id), /Finish/);
  await assert.rejects(life.save('activities', { ...paused, name: 'Edited' }, activity.id), /Finish/);
  await fitness.transition(activity.id, 'resume', start + 120000);
  await fitness.append([point(80, 123.9002), point(121, 124), point(131, 124.0001)], start + 131000);
  const finished = await fitness.transition(activity.id, 'finish', start + 180000);
  assert.equal(finished.durationMinutes, 2);
  assert.equal(finished.route.length, 4);
  assert.equal(routeSegments(finished.route).length, 2);
  assert.ok(finished.distanceKm > 0.020 && finished.distanceKm < 0.023);
  assert.equal(await fitness.active(), undefined);
  await assert.rejects(fitness.transition(activity.id, 'resume'), /no longer active/);
  const edited = await life.save('activities', { ...finished, name: 'Cebu walk', distanceKm: 999, durationMinutes: 999, route: [] }, activity.id);
  assert.equal(edited.name, 'Cebu walk');
  assert.equal(edited.distanceKm, finished.distanceKm);
  assert.deepEqual(edited.route, finished.route);
  await life.delete('activities', activity.id);
  assert.deepEqual((await db.snapshot()).activities[0]?.route, []);
});

test('GPS rejects poor, invalid, stale and implausible fixes and never bridges a long signal gap', async () => {
  const { fitness } = setup();
  const activity = await fitness.create(randomUUID(), 'run', false, start);
  const recording = await fitness.transition(activity.id, 'resume', start);
  for (const bad of [{ ...point(0), accuracy: 100 }, { ...point(0), accuracy: Infinity }, { ...point(0), latitude: 91 }, { ...point(0), longitude: NaN }, point(-1), point(200)]) {
    assert.equal(appendPosition(recording, bad, start), false);
  }
  assert.ok(appendPosition(recording, point(0), start));
  assert.equal(appendPosition(recording, point(0), start), false);
  assert.equal(appendPosition(recording, point(1, 124.9), start + 1000), false);
  assert.equal(appendPosition(recording, point(2, 123.900001), start + 2000), false);
  assert.ok(appendPosition(recording, point(10, 123.9001), start + 10000));
  const before = recording.distanceKm;
  assert.ok(appendPosition(recording, point(100, 124.9), start + 100000));
  assert.equal(recording.distanceKm, before);
  assert.equal(routeSegments(recording.route).length, 2);
});

test('a cold restart recovers at the last saved GPS fix rather than counting time while killed', async () => {
  const { fitness, storage } = setup();
  const activity = await fitness.create(randomUUID(), 'walk', false, start);
  await fitness.transition(activity.id, 'resume', start);
  await fitness.append([point(0), point(10, 123.9001)], start + 10000);
  const reloaded = new LocalFitnessRepository(new LocalDatabase(storage));
  assert.equal((await reloaded.active())?.id, activity.id);
  const recovered = await reloaded.transition(activity.id, 'recover', start + 3600000, 'Interrupted');
  assert.equal(recovered.elapsedMs, 10000);
  assert.equal(recovered.resumedAt, 0);
  assert.equal(recovered.status, 'paused');
  assert.equal(recovered.trackingError, 'Interrupted');
});

test('concurrent starts, location batches, and failed writes cannot lose or duplicate recorded progress', async () => {
  const { fitness, storage } = setup();
  const results = await Promise.allSettled([fitness.create(randomUUID(), 'walk', false, start), fitness.create(randomUUID(), 'run', false, start)]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  const activity = (await fitness.active())!;
  await fitness.transition(activity.id, 'resume', start);
  const before = storage.values.get(DATABASE_KEY);
  storage.fail = true;
  await assert.rejects(fitness.append([point(0)], start), /Storage/);
  assert.equal(storage.values.get(DATABASE_KEY), before);
  storage.fail = false;
  await Promise.all([fitness.append([point(10, 123.9001), point(0)], start + 10000), fitness.append([point(10, 123.9001), point(20, 123.9002)], start + 20000)]);
  assert.equal((await fitness.active())?.route.length, 3);
});

test('weekly fitness uses Monday boundaries, only completed records, and excludes deleted and future activities', async () => {
  const { life } = setup();
  const activity = await life.save('activities', { ...moduleDefaults('activities'), name: 'Walk', date: '2026-10-05', durationMinutes: 30, distanceKm: 2.5 });
  const summary = weeklyFitness([activity, { ...activity, date: '2026-10-04' }, { ...activity, date: '2026-10-10' }, { ...activity, status: 'paused' }, { ...activity, deletedAt: new Date().toISOString() }], '2026-10-09');
  assert.deepEqual(summary, { start: '2026-10-05', count: 1, minutes: 30, distanceKm: 2.5 });
});

test('schema-4 upgrade preserves original records and backs up before adding activity storage', async () => {
  const { db, life, storage } = setup();
  await life.save('people', { ...moduleDefaults('people'), name: 'Juan' });
  const legacy = JSON.parse(storage.values.get(DATABASE_KEY)!);
  legacy.schemaVersion = 4; delete legacy.activities;
  const raw = JSON.stringify(legacy);
  storage.values.set(DATABASE_KEY, raw);
  storage.fail = true;
  await assert.rejects(db.snapshot(), /Storage/);
  assert.equal(storage.values.get(DATABASE_KEY), raw);
  storage.fail = false;
  const migrated = await db.snapshot();
  assert.deepEqual(migrated, { ...legacy, schemaVersion: 6, activities: [] });
  assert.equal(storage.values.get(`${DATABASE_KEY}.backup.v4`), raw);
  const activity = await life.save('activities', { ...moduleDefaults('activities'), name: 'Walk', durationMinutes: 10 });
  assert.throws(() => validateDatabase({ ...migrated, activities: [{ ...activity, route: [{ latitude: 200 }] }] }), /GPS/);
});
