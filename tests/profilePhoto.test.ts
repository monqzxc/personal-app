/// <reference types="node" />
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { isProfilePhoto, MAX_PROFILE_PHOTO_LENGTH, squarePhotoCrop } from '../src/utils/profilePhoto.ts';
import { LocalDatabase, DATABASE_KEY, type KeyValueStorage } from '../src/storage/localDatabase.ts';
import { emptyDatabase } from '../src/storage/migrations.ts';
import { LocalSettingsRepository } from '../src/repositories/settingsRepository.ts';
import { BackupService, encodeBackup, parseBackup } from '../src/services/backupService.ts';
import { moduleDefaults } from '../src/features/library/catalog.ts';

// JPEG header bytes exercise storage/format checks; decoding is the native Image's responsibility.
const photo = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2Q==';
class MemoryStorage implements KeyValueStorage {
  data = new Map<string, string>();
  fail = false;
  async getItem(key: string) { return this.data.get(key) ?? null; }
  async setItem(key: string, value: string) { if (this.fail) throw new Error('Disk full'); this.data.set(key, value); }
}
function setup() {
  const storage = new MemoryStorage();
  const db = new LocalDatabase(storage);
  return { storage, db, settings: new LocalSettingsRepository(db), backup: new BackupService(db) };
}

test('profile photo persists across restarts, transfers with backup, and can be removed', async () => {
  const source = setup();
  assert.equal((await source.settings.get()).profilePhoto, undefined);
  await source.settings.update({ name: 'Mon', profilePhoto: photo });
  const reopened = new LocalSettingsRepository(new LocalDatabase(source.storage));
  assert.equal((await reopened.get()).profilePhoto, photo);
  const destination = setup();
  await destination.backup.restore(await destination.backup.preview(await source.backup.exportJson()));
  assert.equal((await destination.settings.get()).profilePhoto, photo);
  await destination.settings.update({ profilePhoto: '' });
  assert.equal(parseBackup(await destination.backup.exportJson()).data.settings.profilePhoto, '');
  assert.equal((await destination.settings.get()).name, 'Mon');
  assert.equal(parseBackup(encodeBackup(emptyDatabase())).data.settings.profilePhoto, undefined);
});

test('invalid, oversized, and external profile images never overwrite saved preferences or enter backups', async () => {
  const source = setup();
  await source.settings.update({ profilePhoto: photo });
  const before = new Map(source.storage.data);
  const invalid: unknown[] = [null, 3, {}, 'file:///photo.jpg', 'https://example.com/photo.jpg',
    'data:image/svg+xml;base64,PHN2Zz4=', 'data:image/jpeg;base64,YWJj',
    'data:image/jpeg;base64,/9j/@@==', 'data:image/jpeg;base64,/9j/A',
    'data:image/jpeg;base64,/9j/' + 'A'.repeat(MAX_PROFILE_PHOTO_LENGTH)];
  assert.equal(isProfilePhoto(photo), true);
  for (const value of invalid) {
    assert.equal(isProfilePhoto(value), false);
    await assert.rejects(source.settings.update({ profilePhoto: value as string }), /Profile photo/);
    const backup = JSON.parse(encodeBackup(emptyDatabase()));
    backup.data.settings.profilePhoto = value;
    assert.throws(() => parseBackup(JSON.stringify(backup)), /Profile photo/);
  }
  assert.deepEqual(source.storage.data, before);
});

test('failed photo writes preserve the previous image and an oversized database blocks only adding a photo', async () => {
  const source = setup();
  await source.settings.update({ profilePhoto: photo });
  source.storage.fail = true;
  await assert.rejects(source.settings.update({ profilePhoto: '' }), /Disk full/);
  assert.equal((await source.settings.get()).profilePhoto, photo);
  source.storage.fail = false;
  const large = emptyDatabase();
  const now = new Date().toISOString();
  large.notes = Array.from({ length: 170 }, () => ({ ...moduleDefaults('notes'), title: 'Large note', content: 'x'.repeat(9500),
    id: randomUUID(), createdAt: now, updatedAt: now, deletedAt: null, syncStatus: 'local', version: 1 } as typeof large.notes[number]));
  source.storage.data.set(DATABASE_KEY, JSON.stringify(large));
  const before = source.storage.data.get(DATABASE_KEY);
  await assert.rejects(source.settings.update({ profilePhoto: photo }), /1.5 MB/);
  assert.equal(source.storage.data.get(DATABASE_KEY), before);
  await source.settings.update({ name: 'Still editable', profilePhoto: '' });
  assert.equal((await source.settings.get()).name, 'Still editable');
});

test('profile crop centers portrait and landscape photos without stretching', () => {
  assert.deepEqual(squarePhotoCrop(1200, 800), { originX: 200, originY: 0, width: 800, height: 800 });
  assert.deepEqual(squarePhotoCrop(800, 1200), { originX: 0, originY: 200, width: 800, height: 800 });
  assert.deepEqual(squarePhotoCrop(801, 800), { originX: 0, originY: 0, width: 800, height: 800 });
  for (const size of [0, -1, NaN, Infinity]) assert.throws(() => squarePhotoCrop(size, 800), /could not be read/);
});
