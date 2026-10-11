/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ONBOARDING_KEY, OnboardingService } from '../src/features/onboarding/onboarding.ts';
import { DATABASE_KEY, LocalDatabase, type KeyValueStorage } from '../src/storage/localDatabase.ts';
import { emptyDatabase } from '../src/storage/migrations.ts';

class MemoryStorage implements KeyValueStorage {
  data = new Map<string, string>();
  failReadKey = '';
  failWrites = false;
  async getItem(key: string) {
    if (key === this.failReadKey) throw new Error('Storage unavailable');
    return this.data.get(key) ?? null;
  }
  async setItem(key: string, value: string) {
    if (this.failWrites) throw new Error('Disk full');
    this.data.set(key, value);
  }
}

test('fresh install persists a pending intro before any database exists and resumes it after restart', async () => {
  const storage = new MemoryStorage();
  assert.equal(await new OnboardingService(storage).required(), true);
  assert.equal(storage.data.get(ONBOARDING_KEY), 'pending');
  assert.equal(storage.data.has(DATABASE_KEY), false);
  const raw = JSON.stringify(emptyDatabase());
  storage.data.set(DATABASE_KEY, raw);
  assert.equal(await new OnboardingService(storage).required(), true);
  assert.equal(storage.data.get(DATABASE_KEY), raw);
});

test('completion is durable and does not require or create a database', async () => {
  const storage = new MemoryStorage();
  const intro = new OnboardingService(storage);
  await intro.required();
  await intro.complete();
  storage.failReadKey = DATABASE_KEY;
  assert.equal(await new OnboardingService(storage).required(), false);
  assert.equal(storage.data.get(ONBOARDING_KEY), 'complete');
  assert.equal(storage.data.has(DATABASE_KEY), false);
});

test('existing installations skip intro while preserving even an empty saved database', async () => {
  for (const name of ['', 'Mon']) {
    const storage = new MemoryStorage();
    const database = emptyDatabase();
    database.settings.name = name;
    const raw = JSON.stringify(database);
    storage.data.set(DATABASE_KEY, raw);
    assert.equal(await new OnboardingService(storage).required(), false);
    assert.equal(storage.data.get(ONBOARDING_KEY), 'complete');
    assert.equal(storage.data.get(DATABASE_KEY), raw);
  }
});

test('existing corrupt data remains preserved and database validation still reports an error', async () => {
  const storage = new MemoryStorage();
  storage.data.set(DATABASE_KEY, 'corrupt data');
  assert.equal(await new OnboardingService(storage).required(), false);
  await assert.rejects(new LocalDatabase(storage).snapshot(), /Saved data could not be read/);
  assert.equal(storage.data.get(DATABASE_KEY), 'corrupt data');
});

test('read failures never infer a fresh installation or change stored data and can be retried', async () => {
  for (const key of [ONBOARDING_KEY, DATABASE_KEY]) {
    const storage = new MemoryStorage();
    const raw = JSON.stringify(emptyDatabase());
    storage.data.set(DATABASE_KEY, raw);
    storage.failReadKey = key;
    const intro = new OnboardingService(storage);
    await assert.rejects(intro.required(), /Storage unavailable/);
    assert.equal(storage.data.has(ONBOARDING_KEY), false);
    assert.equal(storage.data.get(DATABASE_KEY), raw);
    storage.failReadKey = '';
    assert.equal(await intro.required(), false);
  }
});

test('pending-marker write failure is reported and the next attempt can safely initialize', async () => {
  const storage = new MemoryStorage();
  const intro = new OnboardingService(storage);
  storage.failWrites = true;
  await assert.rejects(intro.required(), /Disk full/);
  assert.equal(storage.data.size, 0);
  storage.failWrites = false;
  assert.equal(await intro.required(), true);
});

test('failed completion keeps the intro pending until a successful retry', async () => {
  const storage = new MemoryStorage();
  const intro = new OnboardingService(storage);
  await intro.required();
  storage.failWrites = true;
  await assert.rejects(intro.complete(), /Disk full/);
  assert.equal(storage.data.get(ONBOARDING_KEY), 'pending');
  assert.equal(await new OnboardingService(storage).required(), true);
  storage.failWrites = false;
  await intro.complete();
  assert.equal(await new OnboardingService(storage).required(), false);
});

test('an invalid intro marker is preserved and reported rather than silently resetting it', async () => {
  const storage = new MemoryStorage();
  storage.data.set(ONBOARDING_KEY, 'damaged');
  await assert.rejects(new OnboardingService(storage).required(), /intro preference could not be read/);
  assert.equal(storage.data.get(ONBOARDING_KEY), 'damaged');
  assert.equal(storage.data.has(DATABASE_KEY), false);
});
