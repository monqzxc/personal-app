/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { UpdateCheckResultNotAvailableReason } from 'expo-updates';
import { restartAppUpdate, updateCheckMessage, updateDownloadMessage } from '../src/features/settings/appUpdates.ts';

test('update checks distinguish a recovery directive, no compatible update, and rejected updates', () => {
  assert.match(updateCheckMessage({ isAvailable: true, isRollBackToEmbedded: false, reason: undefined }), /Download/);
  assert.match(updateCheckMessage({ isAvailable: false, isRollBackToEmbedded: true, reason: undefined }), /recovery/);
  for (const [reason, expected] of [
    ['noUpdateAvailableOnServer', /No compatible update/],
    ['updatePreviouslyFailed', /previously failed/],
    ['updateRejectedBySelectionPolicy', /No installable update/],
    ['rollbackNoEmbeddedConfiguration', /No installable update/],
  ] as const) assert.match(updateCheckMessage({ isAvailable: false, isRollBackToEmbedded: false, reason: reason as UpdateCheckResultNotAvailableReason }), expected);
});

test('download results do not claim success when the available update disappeared', () => {
  assert.match(updateDownloadMessage({ isNew: true, isRollBackToEmbedded: false }), /downloaded/);
  assert.match(updateDownloadMessage({ isNew: false, isRollBackToEmbedded: true }), /recovery update is ready/);
  assert.match(updateDownloadMessage({ isNew: false, isRollBackToEmbedded: false }), /No new update was downloaded/);
});

test('restart never reloads unsupported builds, missing downloads, saving records, or active workouts', async () => {
  let reloads = 0;
  const options = { enabled: true, pending: true, isSaving: () => false, activeWorkout: async (): Promise<unknown> => undefined, reload: async () => { reloads++; } };
  await assert.rejects(restartAppUpdate({ ...options, enabled: false }), /installed/);
  await assert.rejects(restartAppUpdate({ ...options, pending: false }), /Download/);
  await assert.rejects(restartAppUpdate({ ...options, isSaving: () => true }), /saving/);
  for (const status of ['recording', 'paused']) await assert.rejects(restartAppUpdate({ ...options, activeWorkout: async () => ({ status }) }), /active workout/);
  assert.equal(reloads, 0);
});

test('restart rechecks saving after reading the latest workout and leaves reload last', async () => {
  let saving = false;
  const calls: string[] = [];
  const options = { enabled: true, pending: true, isSaving: () => saving,
    activeWorkout: async () => { calls.push('read'); saving = true; return undefined; },
    reload: async () => { calls.push('reload'); },
  };
  await assert.rejects(restartAppUpdate(options), /saving/);
  assert.deepEqual(calls, ['read']);
  saving = false; calls.length = 0;
  await restartAppUpdate({ ...options, activeWorkout: async () => { calls.push('read'); return undefined; } });
  assert.deepEqual(calls, ['read', 'reload']);
});

test('storage and reload errors propagate so the screen can retain the app and offer a retry', async () => {
  let reloads = 0;
  const options = { enabled: true, pending: true, isSaving: () => false, activeWorkout: async (): Promise<unknown> => undefined, reload: async () => { reloads++; } };
  await assert.rejects(restartAppUpdate({ ...options, activeWorkout: async () => { throw new Error('Storage unavailable'); } }), /Storage unavailable/);
  assert.equal(reloads, 0);
  await assert.rejects(restartAppUpdate({ ...options, reload: async () => { throw new Error('Native reload failed'); } }), /Native reload failed/);
  await restartAppUpdate(options);
  assert.equal(reloads, 1);
});
