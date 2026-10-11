/// <reference types="node" />
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { comingPayments, dashboardMoney, nextGetaway } from '../src/features/home/dashboardSelectors.ts';
import { emptyLifeCollections, moduleDefaults } from '../src/features/library/catalog.ts';
import { newEntity } from '../src/services/entity.ts';
import type { ModuleKey, ModuleRecord } from '../src/types/life.ts';

const record = <K extends ModuleKey>(module: K, patch: Record<string, unknown>): ModuleRecord<K> => ({ ...newEntity(randomUUID()), ...moduleDefaults(module), ...patch }) as ModuleRecord<K>;
const deletedAt = '2026-10-10T00:00:00.000Z';

test('dashboard money uses local day and selected currency, while monthly budgets stay separate', () => {
  const data = emptyLifeCollections();
  const today = '2026-10-10';
  data.transactions.push(...[
    { amount: 0.1, date: today }, { amount: 0.2, date: today }, { amount: 5, date: '2026-10-09' },
    { amount: 100, date: '2026-10-11' }, { amount: 500, date: '2026-09-30' },
    { amount: 9, date: today, currency: 'USD' }, { amount: 10, date: today, type: 'income' },
    { amount: 10, date: today, type: 'transfer' }, { amount: 100, date: today, deletedAt },
  ].map(patch => record('transactions', { name: 'Food', category: 'Food', ...patch })));
  data.budgets.push(...[
    { name: 'Food', amount: 10 }, { name: 'Duplicate category', amount: 100 },
    { name: 'Previous month', amount: 100, month: '2026-09' },
    { name: 'Other currency', amount: 10, currency: 'USD' }, { name: 'Deleted', amount: 1, deletedAt },
  ].map(patch => record('budgets', { category: ' food ', month: '2026-10', ...patch })));
  const result = dashboardMoney(data, 'PHP', today);
  assert.equal(result.spent, 0.3);
  assert.deepEqual(result.budgets.map(item => [item.budget.name, item.progress.spent, item.progress.percent]), [['Food', 5.3, 53], ['Duplicate category', 5.3, 5]]);
  assert.equal(dashboardMoney(data, 'USD', today).spent, 9);
  assert.equal(dashboardMoney(data, 'PHP', '2026-10-11').spent, 100);
});

test('coming payments includes overdue and the seven-day boundary across years, only unsettled obligations', () => {
  const data = emptyLifeCollections();
  const today = '2026-12-30';
  data.bills.push(...[
    { name: 'Old overdue', dueDate: '2026-11-01' }, { name: 'Today', dueDate: today },
    { name: 'Boundary', dueDate: '2027-01-06', currency: 'USD' }, { name: 'Too far', dueDate: '2027-01-07' },
    { name: 'Paid', dueDate: today, status: 'paid' }, { name: 'Cancelled', dueDate: today, status: 'cancelled' },
    { name: 'Deleted', dueDate: today, deletedAt },
  ].map(patch => record('bills', { amount: 100, ...patch })));
  data.subscriptions.push(...[
    { name: 'Active overdue', nextBillingDate: '2026-12-29' }, { name: 'Active next year', nextBillingDate: '2027-01-01' },
    { name: 'Paused', nextBillingDate: today, status: 'paused' }, { name: 'Cancelled', nextBillingDate: today, status: 'cancelled' },
    { name: 'Deleted', nextBillingDate: today, deletedAt }, { name: 'Too far', nextBillingDate: '2027-01-07' },
  ].map(patch => record('subscriptions', { amount: 50, ...patch })));
  const result = comingPayments(data, today);
  assert.deepEqual(result.map(item => item.name), ['Old overdue', 'Active overdue', 'Today', 'Active next year', 'Boundary']);
  assert.equal(result[1]!.module, 'subscriptions');
  assert.equal(result.at(-1)!.currency, 'USD');
});

test('payments show only remaining borrowing due, excluding lending, future loans and future or deleted repayments', () => {
  const data = emptyLifeCollections();
  const today = '2026-10-10';
  const debt = record('debts', { name: 'Partly paid', direction: 'borrowed', amount: 100, date: '2026-10-01', dueDate: today });
  const settled = record('debts', { ...debt, id: randomUUID(), name: 'Settled' });
  data.debts.push(debt, settled, ...[
    { name: 'They owe me', direction: 'lent' }, { name: 'No due date', dueDate: null },
    { name: 'Future borrowing', date: '2026-10-11' }, { name: 'Deleted', deletedAt },
    { name: 'Too far', dueDate: '2026-10-18' },
  ].map(patch => record('debts', { ...debt, id: randomUUID(), ...patch })));
  data.repayments.push(
    record('repayments', { debtId: debt.id, amount: 30, date: '2026-10-09' }),
    record('repayments', { debtId: debt.id, amount: 20, date: '2026-10-11' }),
    record('repayments', { debtId: debt.id, amount: 10, date: today, deletedAt }),
    record('repayments', { debtId: settled.id, amount: 100, date: today }),
  );
  assert.deepEqual(comingPayments(data, today).map(item => [item.name, item.amount, item.kind]), [['Partly paid', 70, 'I owe']]);
});

test('next getaway prefers current dates, counts calendar days and derives collection spending once', () => {
  const data = emptyLifeCollections();
  const today = '2026-12-31';
  const trip = record('trips', { title: 'Cebu', destination: 'Cebu', startDate: '2027-01-01', endDate: '2027-01-03', budget: 500 });
  const ongoing = record('trips', { ...trip, id: randomUUID(), title: 'Current trip', startDate: '2026-12-29', endDate: today });
  data.trips.push(trip, ...[
    { title: 'Ended', startDate: '2026-12-28', endDate: '2026-12-30' },
    { title: 'Cancelled', startDate: today, status: 'cancelled' }, { title: 'Completed', startDate: today, status: 'completed' },
    { title: 'Deleted', startDate: today, deletedAt },
  ].map(patch => record('trips', { ...trip, id: randomUUID(), ...patch })));
  const collection = record('moneyCollections', { name: 'Vacation', tripId: trip.id });
  data.moneyCollections.push(collection);
  data.transactions.push(record('transactions', { name: 'Booking', amount: 100, date: today, tripId: trip.id, collectionId: collection.id }), record('transactions', { name: 'Future meal', amount: 50, date: '2027-01-01', tripId: trip.id }));
  let result = nextGetaway(data, today)!;
  assert.equal(result.trip.id, trip.id);
  assert.equal(result.days, 1);
  assert.equal(result.spending.spent, 100);
  data.trips.push(ongoing);
  result = nextGetaway(data, today)!;
  assert.equal(result.trip.id, ongoing.id);
  assert.equal(result.days, 0);
  assert.equal(nextGetaway(data, '2027-01-04'), null);
  assert.equal(nextGetaway(emptyLifeCollections(), today), null);
});
