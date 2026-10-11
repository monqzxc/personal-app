/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { closeQuickExpense, finishQuickExpense } from '../src/features/finance/quickExpenseNavigation.ts';

test('saving Quick Expense dismisses the keyboard, then returns Home in one navigation action', () => {
  const events: string[] = [];
  finishQuickExpense({ dismissTo: href => { events.push(`dismissTo ${String(href)}`); } }, () => events.push('keyboard'));
  assert.deepEqual(events, ['keyboard', 'dismissTo /']);
});

test('cancelling Quick Expense returns to the caller and dismisses the keyboard first', () => {
  for (const caller of ['/(tabs)', '/finance', '/expenses?collectionId=weekend', '/record?module=people&id=alex']) {
    const history = [caller, '/quick-expense'];
    const events: string[] = [];
    closeQuickExpense({
      canDismiss: () => history.length > 1,
      dismiss: () => { events.push('dismiss'); history.pop(); },
      replace: () => assert.fail('Existing caller must stay in history'),
    }, () => events.push('keyboard'));
    assert.deepEqual(history, [caller]);
    assert.deepEqual(events, ['keyboard', 'dismiss']);
  }
});

test('Quick Expense opened without a caller returns to Finance instead of popping an empty stack', () => {
  const history = ['/quick-expense'];
  const events: string[] = [];
  closeQuickExpense({
    canDismiss: () => false,
    dismiss: () => assert.fail('Cannot dismiss the only route'),
    replace: href => { events.push('replace'); history[0] = String(href); },
  }, () => events.push('keyboard'));
  assert.deepEqual(history, ['/finance']);
  assert.deepEqual(events, ['keyboard', 'replace']);
});
