/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { useToastStore } from '../src/stores/useToastStore.ts';

test('success toasts expire, repeat, replace and dismiss without an old timer clearing the next one', context => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const { showToast, clearToast } = useToastStore.getState();
  try {
    showToast('Expense saved.');
    const first = useToastStore.getState().toast;
    context.mock.timers.tick(4000);
    showToast('Expense saved.');
    assert.notEqual(useToastStore.getState().toast, first);
    context.mock.timers.tick(1000);
    assert.equal(useToastStore.getState().toast?.message, 'Expense saved.');
    showToast('Record deleted.');
    context.mock.timers.tick(4000);
    assert.equal(useToastStore.getState().toast?.message, 'Record deleted.');
    context.mock.timers.tick(1000);
    assert.equal(useToastStore.getState().toast, null);
    showToast('Updated.');
    clearToast();
    assert.equal(useToastStore.getState().toast, null);
    showToast('Saved.');
    context.mock.timers.tick(4999);
    assert.equal(useToastStore.getState().toast?.message, 'Saved.');
    context.mock.timers.tick(1);
    assert.equal(useToastStore.getState().toast, null);
  } finally { clearToast(); }
});
