/// <reference types="node" />
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { emptyLifeCollections, moduleDefaults } from '../src/features/library/catalog.ts';
import { groupMoneyByDate, moneyActivity, moneyActivityTotals, quickExpenseAmount, selectMoneyActivity, toggleMoneySelection, type ExpenseFilters } from '../src/features/finance/expenseSelectors.ts';
import { newEntity } from '../src/services/entity.ts';
import type { ModuleKey, ModuleRecord } from '../src/types/life.ts';

const record = <K extends ModuleKey>(module: K, patch: Record<string, unknown>): ModuleRecord<K> => ({ ...newEntity(randomUUID()), ...moduleDefaults(module), ...patch }) as ModuleRecord<K>;
const filters: ExpenseFilters = { search: '', from: '', to: '', personId: '', collectionId: '', allActivity: false };

test('quick amount capture rejects empty, nondecimal, zero, excessive precision and unsupported size', () => {
  for (const value of ['', ' ', '-5', '0', 'NaN', 'Infinity', '1e2', '0x10', '1,000', '1.005', '1000000000001']) assert.equal(quickExpenseAmount(value, 'PHP'), null, value);
  assert.equal(quickExpenseAmount(' 25.50 ', 'PHP'), 25.5);
  assert.equal(quickExpenseAmount('0.01', 'PHP'), 0.01);
  assert.equal(quickExpenseAmount('20.5', 'JPY'), null);
  assert.equal(quickExpenseAmount('20', 'JPY'), 20);
});

test('expense search covers name and description, includes all dates, and excludes deleted or other money types', () => {
  const data = emptyLifeCollections();
  const older = record('transactions', { name: 'Breakfast', description: 'Cafe with friends', amount: 100, date: '2026-09-30' });
  const today = record('transactions', { name: 'Taxi', description: 'Fare from AIRPORT', amount: 80, date: '2026-10-09' });
  data.transactions.push(older, today,
    record('transactions', { name: 'Salary', type: 'income', amount: 1000, date: '2026-10-08' }),
    record('transactions', { name: 'Deleted', amount: 2, date: '2026-10-09', deletedAt: new Date().toISOString() }));
  assert.deepEqual(selectMoneyActivity(data, filters).map(item => item.id), [today.id, older.id]);
  assert.deepEqual(selectMoneyActivity(data, { ...filters, search: ' breakfast ' }).map(item => item.id), [older.id]);
  assert.deepEqual(selectMoneyActivity(data, { ...filters, search: 'airport' }).map(item => item.id), [today.id]);
  assert.equal(selectMoneyActivity(data, { ...filters, allActivity: true }).length, 3);
  assert.equal(selectMoneyActivity(data, { ...filters, from: '2026-09-30', to: '2026-10-09' }).length, 2);
  assert.equal(selectMoneyActivity(data, { ...filters, from: '2026-10-09', to: '2026-10-09' }).length, 1);
  for (const patch of [{ from: '2026-02-30' }, { to: 'today' }, { from: '2026-10-10', to: '2026-10-09' }]) assert.deepEqual(selectMoneyActivity(data, { ...filters, ...patch }), []);
});

test('all-money activity derives people and repayment direction without duplicating planned or paid bills', () => {
  const data = emptyLifeCollections();
  const person = record('people', { name: 'Mia' });
  data.people.push(person);
  const lent = record('debts', { name: 'Dinner share', amount: 200, personId: person.id, date: '2026-10-07' });
  const borrowed = record('debts', { name: 'Borrowed cash', amount: 500, personId: person.id, direction: 'borrowed', date: '2026-10-08' });
  data.debts.push(lent, borrowed);
  data.repayments.push(record('repayments', { name: 'Received part', debtId: lent.id, amount: 50, date: '2026-10-09' }), record('repayments', { name: 'Paid back', debtId: borrowed.id, amount: 100, date: '2026-10-09' }));
  data.bills.push(record('bills', { name: 'Internet', amount: 150, status: 'paid' }));
  data.transactions.push(record('transactions', { name: 'Internet', amount: 150, billId: data.bills[0]!.id, date: '2026-10-09' }));
  const items = selectMoneyActivity(data, { ...filters, allActivity: true, personId: person.id });
  assert.equal(items.length, 4);
  assert.deepEqual(new Set(items.map(item => item.kind)), new Set(['Lent', 'Borrowed', 'Repayment received', 'Repayment paid']));
  assert.equal(moneyActivity(data).length, 5);
  assert.equal(selectMoneyActivity(data, { ...filters, personId: 'unassigned' }).length, 1);
});

test('collections filter existing records and connect collection spending to travel without copies', () => {
  const data = emptyLifeCollections();
  const trip = record('trips', { title: 'Cebu', destination: 'Cebu' });
  const collection = record('moneyCollections', { name: 'Weekend Vacation', tripId: trip.id });
  data.trips.push(trip); data.moneyCollections.push(collection);
  const linked = record('transactions', { name: 'Food', amount: 100, collectionId: collection.id, date: '2026-10-09' });
  const uncollected = record('transactions', { name: 'Fare', amount: 80, tripId: trip.id, date: '2026-10-08' });
  data.transactions.push(linked, uncollected);
  assert.deepEqual(selectMoneyActivity(data, { ...filters, collectionId: collection.id }).map(item => item.id), [linked.id]);
  assert.deepEqual(selectMoneyActivity(data, { ...filters, collectionId: 'unassigned' }).map(item => item.id), [uncollected.id]);
  assert.equal(selectMoneyActivity(data, { ...filters, tripId: trip.id }).length, 2);
  assert.equal(data.transactions.length, 2);
});

test('repayment trip filters prefer their own collection then inherit the debt trip context', () => {
  const data = emptyLifeCollections();
  const first = record('moneyCollections', { name: 'First trip', tripId: randomUUID() });
  const second = record('moneyCollections', { name: 'Second trip', tripId: randomUUID() });
  data.moneyCollections.push(first, second);
  const debt = record('debts', { name: 'Travel share', amount: 100, collectionId: first.id, date: '2026-10-08' });
  data.debts.push(debt);
  const payment = record('repayments', { name: 'Partial repayment', amount: 50, debtId: debt.id, date: '2026-10-09' });
  data.repayments.push(payment);
  assert.equal(selectMoneyActivity(data, { ...filters, allActivity: true, tripId: first.tripId }).length, 2);
  payment.collectionId = second.id;
  assert.deepEqual(selectMoneyActivity(data, { ...filters, allActivity: true, tripId: second.tripId }).map(item => item.id), [payment.id]);
  assert.deepEqual(selectMoneyActivity(data, { ...filters, allActivity: true, tripId: first.tripId }).map(item => item.id), [debt.id]);
});

test('daily totals keep currencies and activity types separate and use integer money arithmetic', () => {
  const data = emptyLifeCollections();
  data.transactions.push(...[
    { name: 'One', amount: 0.1, date: '2026-10-09' }, { name: 'Two', amount: 0.2, date: '2026-10-09' },
    { name: 'Dollars', amount: 8, currency: 'USD', date: '2026-10-09' },
    { name: 'Income', amount: 500, type: 'income', date: '2026-10-09' },
    { name: 'Yesterday', amount: 50, date: '2026-10-08' },
  ].map(patch => record('transactions', patch)));
  const groups = groupMoneyByDate(moneyActivity(data));
  assert.deepEqual(groups.map(group => group.date), ['2026-10-09', '2026-10-08']);
  assert.deepEqual(groups[0]!.totals, [
    { kind: 'Expense', currency: 'PHP', amount: 0.3 },
    { kind: 'Expense', currency: 'USD', amount: 8 },
    { kind: 'Income', currency: 'PHP', amount: 500 },
  ]);
  assert.equal(moneyActivityTotals(moneyActivity(data)).find(item => item.kind === 'Expense' && item.currency === 'PHP')!.amount, 50.3);
});

test('day selection spans dates, toggles every visible day record, and keeps module IDs distinct', () => {
  const data = emptyLifeCollections();
  const id = randomUUID();
  data.transactions.push(record('transactions', { id, name: 'Food', amount: 10, date: '2026-10-09' }), record('transactions', { name: 'Fare', amount: 20, date: '2026-10-08' }));
  data.debts.push(record('debts', { id, name: 'Lent', amount: 50, date: '2026-10-09' }));
  const items = moneyActivity(data);
  const groups = groupMoneyByDate(items);
  let selected = toggleMoneySelection([], groups[0]!.items);
  assert.deepEqual(new Set(selected), new Set([`transactions:${id}`, `debts:${id}`]));
  selected = toggleMoneySelection(selected, groups[1]!.items);
  assert.equal(selected.length, 3);
  selected = toggleMoneySelection(selected, [groups[0]!.items[0]!]);
  assert.equal(selected.length, 2);
  selected = toggleMoneySelection(selected, groups[0]!.items);
  assert.equal(selected.length, 3);
  selected = toggleMoneySelection(selected, groups[0]!.items);
  assert.deepEqual(selected, groups[1]!.items.map(item => item.key));
});
