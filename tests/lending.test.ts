/// <reference types="node" />
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { LocalDatabase, DATABASE_KEY, type KeyValueStorage } from '../src/storage/localDatabase.ts';
import { LocalLifeRepository } from '../src/repositories/lifeRepository.ts';
import { LifeService } from '../src/services/lifeService.ts';
import { moduleDefaults } from '../src/features/library/catalog.ts';
import { budgetProgress, debtProgress, financeSummary, owedTotal, tripSpending } from '../src/features/finance/selectors.ts';
import { collectReminders } from '../src/services/reminderSelectors.ts';
import type { ModuleKey } from '../src/types/life.ts';

const date = '2026-01-01';
const today = '2026-01-10';
const input = (key: ModuleKey, values: Record<string, unknown>) => ({ ...moduleDefaults(key), date, ...(key === 'transactions' ? { name: values.description } : {}), ...values });
class MemoryStorage implements KeyValueStorage {
  values = new Map<string, string>();
  fail = false;
  async getItem(key: string) { return this.values.get(key) ?? null; }
  async setItem(key: string, value: string) { if (this.fail) throw new Error('Storage unavailable'); this.values.set(key, value); }
}
async function setup() {
  const storage = new MemoryStorage();
  const db = new LocalDatabase(storage);
  const life = new LifeService(new LocalLifeRepository(db), randomUUID);
  const person = await life.save('people', input('people', { name: 'Juan' }));
  const wallet = await life.save('wallets', input('wallets', { name: 'Cash', openingBalance: 10000 }));
  const lend = (values: Record<string, unknown> = {}) => life.save('debts', input('debts', { name: 'Lent money', personId: person.id, walletId: wallet.id, amount: 2000, ...values }));
  const repay = (debtId: string, amount: number, values: Record<string, unknown> = {}) => life.save('repayments', input('repayments', { debtId, amount, walletId: wallet.id, ...values }));
  return { storage, db, life, person, wallet, lend, repay };
}

test('person totals combine loans and covered expenses, separate currencies, and exclude lending from spending', async () => {
  const { life, person, lend, repay, storage } = await setup();
  const loan = await lend();
  await lend({ name: 'Lunch covered', amount: 300, category: 'Food' });
  await repay(loan.id, 500);
  await lend({ name: 'Old USD loan', existingDebt: true, walletId: '', currency: 'USD', amount: 10 });
  const data = await life.getAll();
  assert.equal(owedTotal(data, 'PHP', person.id, today), 1800);
  assert.equal(owedTotal(data, 'USD', person.id, today), 10);
  assert.deepEqual(debtProgress(loan, data.repayments, today), { paid: 500, remaining: 1500, status: 'Partly repaid' });
  const summary = financeSummary(data, 'PHP', '2026-01', today);
  assert.equal(summary.walletTotal, 8200);
  assert.equal(summary.income, 0);
  assert.equal(summary.expenses, 0);
  const budget = await life.save('budgets', input('budgets', { name: 'Food', category: 'Food', amount: 1000, month: '2026-01' }));
  assert.equal(budgetProgress(budget, data.transactions, today).spent, 0);
  const reloaded = await new LocalLifeRepository(new LocalDatabase(storage)).getAll();
  assert.equal(owedTotal(reloaded, 'PHP', person.id, today), 1800);
});

test('existing debt does not withdraw again; repayment edits and deletion recalculate wallets and amounts owed', async () => {
  const { life, lend, repay } = await setup();
  const debt = await lend({ existingDebt: true, walletId: '', amount: 100.3 });
  const summary = async () => financeSummary(await life.getAll(), 'PHP', '2026-01', today);
  assert.equal((await summary()).walletTotal, 10000);
  const payment = await repay(debt.id, 0.1);
  await repay(debt.id, 0.2);
  assert.equal((await summary()).walletTotal, 10000.3);
  assert.equal(debtProgress(debt, (await life.getAll()).repayments, today).remaining, 100);
  await life.save('repayments', { ...payment, amount: 1.1 }, payment.id);
  assert.equal((await summary()).walletTotal, 10001.3);
  await life.delete('repayments', payment.id);
  assert.equal((await summary()).walletTotal, 10000.2);
  const data = await life.getAll();
  assert.equal(debtProgress(debt, data.repayments, today).remaining, 100.1);
  await life.delete('repayments', data.repayments[0]!.id);
  await life.delete('debts', debt.id);
  assert.equal((await summary()).walletTotal, 10000);
});

test('invalid lending and repayment mutations preserve data and enforce relation, date, currency and amount rules', async () => {
  const { life, storage, wallet, person, lend, repay } = await setup();
  const debt = await lend({ amount: 100 });
  await repay(debt.id, 50);
  const before = storage.values.get(DATABASE_KEY);
  await assert.rejects(lend({ walletId: '' }), /Choose a wallet/);
  await assert.rejects(lend({ existingDebt: true }), /existing debts/);
  await assert.rejects(lend({ dueDate: '2025-12-31' }), /Due date/);
  await assert.rejects(lend({ date: '9999-01-01' }), /after they happen/);
  await assert.rejects(repay(debt.id, 1, { date: '2025-12-31' }), /precede/);
  await assert.rejects(repay(debt.id, 1, { date: '9999-01-01' }), /after they happen/);
  await assert.rejects(repay(debt.id, 51), /cannot exceed/);
  await assert.rejects(repay(debt.id, 0), /Amount/);
  await assert.rejects(repay(debt.id, 1.001), /decimal/);
  await assert.rejects(repay(debt.id, 1, { walletId: '' }), /Choose/);
  await assert.rejects(repay(randomUUID(), 1), /existing/);
  await assert.rejects(life.save('debts', { ...debt, amount: 49 }, debt.id), /cannot exceed/);
  await assert.rejects(life.delete('people', person.id), /person is still linked/);
  await assert.rejects(life.delete('debts', debt.id), /has repayments/);
  await assert.rejects(life.delete('wallets', wallet.id), /still linked/);
  assert.equal(storage.values.get(DATABASE_KEY), before);
  const usd = await life.save('wallets', input('wallets', { name: 'USD', currency: 'USD' }));
  await assert.rejects(repay(debt.id, 1, { walletId: usd.id, currency: 'USD' }), /debt currencies/);
  await assert.rejects(repay(debt.id, 1, { walletId: usd.id }), /currencies must match/);
});

test('full repayments are serialized, failed writes leave no receipt, and deleting a new loan restores money', async () => {
  const { storage, life, lend, repay } = await setup();
  const debt = await lend({ amount: 100 });
  const before = storage.values.get(DATABASE_KEY);
  storage.fail = true;
  await assert.rejects(repay(debt.id, 100), /Storage unavailable/);
  assert.equal(storage.values.get(DATABASE_KEY), before);
  storage.fail = false;
  const results = await Promise.allSettled([repay(debt.id, 100), repay(debt.id, 100)]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  const data = await life.getAll();
  assert.equal(data.repayments.length, 1);
  assert.equal(debtProgress(debt, data.repayments, today).status, 'Settled');
  await life.delete('repayments', data.repayments[0]!.id);
  await life.save('debts', { ...debt, amount: 200 }, debt.id);
  assert.equal(financeSummary(await life.getAll(), 'PHP', '2026-01', today).walletTotal, 9800);
  await life.delete('debts', debt.id);
  assert.equal(financeSummary(await life.getAll(), 'PHP', '2026-01', today).walletTotal, 10000);
});

test('Cebu separates personal food and fare from covered shares and updates after corrections', async () => {
  const { life, wallet, lend, repay } = await setup();
  const trip = await life.save('trips', input('trips', { title: 'Travel to Cebu', destination: 'Cebu', startDate: date, endDate: today, budget: 1000 }));
  const food = await life.save('transactions', input('transactions', { description: 'My lunch', amount: 300, category: 'Food', walletId: wallet.id, tripId: trip.id }));
  await life.save('transactions', input('transactions', { description: 'My fare', amount: 100, category: 'Fare', tripId: trip.id }));
  const covered = await lend({ name: 'Juan lunch', amount: 300, category: 'Food', tripId: trip.id });
  await repay(covered.id, 100);
  let data = await life.getAll();
  let summary = tripSpending(trip, data, today);
  assert.deepEqual(summary, { spent: 400, remaining: 600, covered: 300, owed: 200, categories: [{ name: 'Food', amount: 300 }, { name: 'Fare', amount: 100 }] });
  const ignored = [{ ...food, currency: 'USD' }, { ...food, type: 'income' as const }, { ...food, type: 'transfer' as const }, { ...food, deletedAt: '2026-01-02T00:00:00.000Z' }, { ...food, date: '2026-02-01' }, { ...food, tripId: randomUUID() }];
  assert.equal(tripSpending(trip, { ...data, transactions: [...data.transactions, ...ignored] }, today).spent, 400);
  await life.save('transactions', { ...food, amount: 950 }, food.id);
  data = await life.getAll();
  assert.equal(tripSpending(trip, data, today).remaining, -50);
  await life.delete('transactions', food.id);
  summary = tripSpending(trip, await life.getAll(), today);
  assert.equal(summary.spent, 100);
  assert.equal(summary.owed, 200);
});

test('schema-3 migration preserves existing records and backs up original data before adding people collections', async () => {
  const { db, storage, life } = await setup();
  await life.save('transactions', input('transactions', { description: 'Old fare', amount: 50 }));
  const legacy = JSON.parse(storage.values.get(DATABASE_KEY)!);
  legacy.schemaVersion = 3;
  delete legacy.people; delete legacy.debts; delete legacy.repayments;
  const raw = JSON.stringify(legacy);
  storage.values.set(DATABASE_KEY, raw);
  storage.fail = true;
  await assert.rejects(db.snapshot(), /Storage unavailable/);
  assert.equal(storage.values.get(DATABASE_KEY), raw);
  storage.fail = false;
  const migrated = await db.snapshot();
  assert.deepEqual(migrated, { ...legacy, schemaVersion: 6, people: [], debts: [], repayments: [], activities: [] });
  assert.equal(storage.values.get(`${DATABASE_KEY}.backup.v3`), raw);
});

test('due debts show overdue status and reminders stop after settlement', async () => {
  const { life, lend, repay } = await setup();
  const debt = await lend({ amount: 100, dueDate: '2026-01-05', reminder: { at: '2026-01-11T12:00:00.000Z' } });
  const now = Date.parse('2026-01-10T12:00:00.000Z');
  assert.equal(debtProgress(debt, [], today).status, 'Overdue');
  assert.equal(collectReminders([], [], await life.getAll(), now).length, 1);
  await repay(debt.id, 100);
  assert.equal(collectReminders([], [], await life.getAll(), now).length, 0);
});
