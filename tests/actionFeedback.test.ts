/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { ModuleKind, transpileModule } from 'typescript';
import { create } from 'zustand';
import { emptyLifeCollections, modules, moduleDefaults } from '../src/features/library/catalog.ts';
import { useToastStore } from '../src/stores/useToastStore.ts';
import type { useAppStore } from '../src/stores/useAppStore.ts';
import type { TaskInput, EventInput } from '../src/types/models.ts';
import type { BackupPreview } from '../src/services/backupService.ts';

// Load the actual store with native service boundaries replaced by in-memory fakes.
function appStore() {
  const failures = { write: false, refresh: false, reminders: false };
  const write = async () => { if (failures.write) throw new Error('Disk full'); return { id: 'record' }; };
  const service = { save: write, delete: write, toggle: write, importEvents: write, getAll: async () => {
    if (failures.refresh) throw new Error('Read failed');
    return [];
  } };
  const dependencies: Record<string, unknown> = {
    zustand: { create },
    './useToastStore': { useToastStore },
    '../features/library/catalog': { emptyLifeCollections, modules },
    '../utils/dates': { dateOnly: () => '2026-10-11' },
    '../services/container': {
      taskService: service, calendarService: service,
      lifeService: { ...service, getAll: async () => emptyLifeCollections() },
      settingsRepository: { get: async () => ({ theme: 'light', currency: 'PHP' }), update: write },
      financeRepository: { payBill: write, renewSubscription: write, receiveIncome: write, assignMoneyRecords: write },
      backupService: { restore: write }, createId: () => 'new-record',
    },
    '../services/notificationService': { notificationService: { reconcile: async () => {
      if (failures.reminders) throw new Error('Permission denied');
      return '';
    } } },
    '../services/reminderSelectors': { collectReminders: () => [] },
    '../services/fitnessTracking': { fitnessTracking: {} },
  };
  const exports = {} as { useAppStore: typeof useAppStore };
  const source = readFileSync(new URL('../src/stores/useAppStore.ts', import.meta.url), 'utf8');
  runInNewContext(transpileModule(source, { compilerOptions: { module: ModuleKind.CommonJS } }).outputText, {
    exports, Error, require: (name: string) => {
      assert.ok(name in dependencies, name);
      return dependencies[name];
    },
  });
  return { store: exports.useAppStore, failures };
}

test('all app mutations show success only after completion, including expense save and update', async () => {
  const { store } = appStore();
  const state = store.getState();
  const cases: [() => Promise<boolean>, string][] = [
    [() => state.saveTask({} as TaskInput), 'Task saved.'],
    [() => state.saveTask({} as TaskInput, 'record'), 'Task updated.'],
    [() => state.toggleTask('record'), 'Task updated.'],
    [() => state.deleteTask('record'), 'Task deleted.'],
    [() => state.saveEvent({} as EventInput), 'Event saved.'],
    [() => state.saveEvent({} as EventInput, 'record'), 'Event updated.'],
    [() => state.deleteEvent('record'), 'Event deleted.'],
    [() => state.updateSettings({ name: 'Mon' }), 'Preferences updated.'],
    [() => state.saveRecord('transactions', { type: 'expense' }), 'Expense saved.'],
    [() => state.saveRecord('transactions', { type: 'expense' }, 'record'), 'Expense updated.'],
    [() => state.payBill('record'), 'Payment saved.'],
    [() => state.renewSubscription('record'), 'Renewal saved.'],
    [() => state.receiveIncome('record'), 'Income received and saved.'],
    [() => state.importEvents([]), 'Events imported.'],
    [() => state.restoreBackup({} as BackupPreview), 'Backup restored.'],
    [() => state.assignMoneyRecords([], 'collection'), 'Collection updated.'],
  ];
  for (const key of Object.keys(modules) as (keyof typeof modules)[]) {
    cases.push([() => state.saveRecord(key, { ...moduleDefaults(key), type: 'income' }), modules[key].singular + ' saved.']);
    cases.push([() => state.saveRecord(key, { ...moduleDefaults(key), type: 'income' }, 'record'), modules[key].singular + ' updated.']);
    cases.push([() => state.deleteRecord(key, 'record'), modules[key].singular + ' deleted.']);
  }
  try {
    for (const [action, expected] of cases) {
      const pending = action();
      assert.equal(useToastStore.getState().toast, null);
      assert.equal(store.getState().saving, true);
      assert.equal(await pending, true);
      assert.equal(store.getState().saving, false);
      assert.equal(useToastStore.getState().toast?.message, expected);
      assert.equal(store.getState().actionError, null);
    }
  } finally { useToastStore.getState().clearToast(); }
});

test('failed or blocked mutations never report success; reminder failure preserves saved feedback', async () => {
  const { store, failures } = appStore();
  try {
    for (const failure of ['write', 'refresh'] as const) {
      useToastStore.getState().showToast('Previous success.');
      failures[failure] = true;
      assert.equal(await store.getState().saveRecord('transactions', { type: 'expense' }), false);
      assert.equal(useToastStore.getState().toast, null);
      assert.equal(store.getState().saving, false);
      assert.ok(store.getState().actionError);
      failures[failure] = false;
    }
    const pending = store.getState().saveRecord('transactions', { type: 'expense' });
    assert.equal(await store.getState().deleteTask('record'), false);
    assert.equal(await pending, true);
    assert.equal(useToastStore.getState().toast?.message, 'Expense saved.');
    failures.reminders = true;
    assert.equal(await store.getState().deleteTask('record'), true);
    assert.equal(useToastStore.getState().toast?.message, 'Task deleted.');
    assert.match(store.getState().notificationStatus, /reminder scheduling failed/);
  } finally { useToastStore.getState().clearToast(); }
});
