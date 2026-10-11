/// <reference types="node" />
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { moduleDefaults } from '../src/features/library/catalog.ts';
import { financeSummary, owedTotal, tripSpending, walletBalance } from '../src/features/finance/selectors.ts';
import { LocalFinanceRepository } from '../src/repositories/financeRepository.ts';
import { LocalLifeRepository } from '../src/repositories/lifeRepository.ts';
import { LifeService } from '../src/services/lifeService.ts';
import { newEntity } from '../src/services/entity.ts';
import { validateDatabase } from '../src/services/validation.ts';
import { emptyDatabase, migrateDatabase } from '../src/storage/migrations.ts';
import { DATABASE_KEY, LocalDatabase, type KeyValueStorage } from '../src/storage/localDatabase.ts';
import type { ModuleKey, Repayment } from '../src/types/life.ts';

const date = '2026-01-01';
const today = '2026-01-10';
const input = (key: ModuleKey, values: Record<string, unknown>) => ({ ...moduleDefaults(key), date, ...values });
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
  const finance = new LocalFinanceRepository(db);
  const person = await life.save('people', input('people', { name: 'Alex' }));
  const wallet = await life.save('wallets', input('wallets', { name: 'Cash', openingBalance: 1000 }));
  const debt = (direction: 'lent' | 'borrowed', values: Record<string, unknown> = {}) => life.save('debts', input('debts', { name: direction, direction, amount: 100, personId: person.id, walletId: wallet.id, ...values }));
  const repay = (debtId: string, amount: number) => life.save('repayments', input('repayments', { debtId, amount, walletId: wallet.id }));
  const transaction = (values: Record<string, unknown> = {}) => life.save('transactions', input('transactions', { name: 'Lunch', amount: 10, personId: person.id, walletId: wallet.id, ...values }));
  const trip = (title: string) => life.save('trips', input('trips', { title, destination: 'Cebu', startDate: date, endDate: today, budget: 500, peopleIds: [person.id] }));
  return { storage, db, life, finance, person, wallet, debt, repay, transaction, trip };
}

test('lending and borrowing reverse wallet movements while remaining separate from income and expenses', async () => {
  const { life, wallet, person, debt, repay, transaction } = await setup();
  const lent = await debt('lent', { amount: 200 });
  const borrowed = await debt('borrowed', { amount: 300 });
  await repay(lent.id, 50);
  const paidBack = await repay(borrowed.id, 75);
  const old = await debt('borrowed', { amount: 10, existingDebt: true, walletId: '' });
  await repay(old.id, 2);
  await transaction({ amount: 20 });
  let data = await life.getAll();
  assert.equal(walletBalance(wallet, data.transactions, today, data), 1053);
  assert.equal(owedTotal(data, 'PHP', person.id, today), 150);
  assert.equal(owedTotal(data, 'PHP', person.id, today, 'borrowed'), 233);
  const summary = financeSummary(data, 'PHP', '2026-01', today);
  assert.equal(summary.income, 0);
  assert.equal(summary.expenses, 20);
  await life.save('repayments', { ...paidBack, amount: 100 }, paidBack.id);
  data = await life.getAll();
  assert.equal(walletBalance(wallet, data.transactions, today, data), 1028);
  await life.delete('repayments', paidBack.id);
  data = await life.getAll();
  assert.equal(walletBalance(wallet, data.transactions, today, data), 1128);
});

test('debt direction cannot change after repayment, including concurrent repayment creation', async () => {
  const { life, db, debt, repay, wallet } = await setup();
  const loan = await debt('lent');
  await repay(loan.id, 25);
  await assert.rejects(life.save('debts', { ...loan, direction: 'borrowed' }, loan.id), /repayments|direction|owes/);
  const second = await debt('lent');
  const repo = new LocalLifeRepository(db);
  const results = await Promise.allSettled([
    repo.collection('repayments').create({ ...newEntity(randomUUID()), ...input('repayments', { name: 'Return', debtId: second.id, amount: 10, walletId: wallet.id }) } as Repayment),
    repo.collection('debts').update(second.id, { direction: 'borrowed' }),
  ]);
  assert.equal(results[0]?.status, 'fulfilled');
  assert.equal(results[1]?.status, 'rejected');
  assert.equal((await db.snapshot()).debts.find(item => item.id === second.id)?.direction, 'lent');
});

test('collecting money records preserves identifiers, dates, totals and a single copy of each entry', async () => {
  const { db, life, finance, debt, repay, transaction, trip } = await setup();
  const vacation = await trip('Weekend Vacation');
  const food = await transaction({ amount: 30, date: '2026-01-02', tripId: vacation.id });
  const fare = await transaction({ amount: 15, date: '2026-01-03' });
  const lent = await debt('lent', { amount: 100 });
  const borrowed = await debt('borrowed', { amount: 500 });
  const payment = await repay(lent.id, 25);
  const before = await db.snapshot();
  const selected = [{ module: 'transactions' as const, id: food.id }, { module: 'transactions' as const, id: fare.id }, { module: 'debts' as const, id: lent.id }, { module: 'debts' as const, id: borrowed.id }, { module: 'repayments' as const, id: payment.id }];
  const collectionId = randomUUID();
  await finance.assignMoneyRecords(selected, '', { id: collectionId, name: 'Weekend Vacation', tripId: vacation.id, peopleIds: [], notes: '' });
  let after = await db.snapshot();
  assert.equal(after.moneyCollections.length, 1);
  for (const { module, id } of selected) {
    const old = before[module].find(item => item.id === id)!;
    const current = after[module].find(item => item.id === id)!;
    assert.equal(after[module].filter(item => item.id === id).length, 1);
    assert.deepEqual(current, { ...old, collectionId, updatedAt: current.updatedAt, version: old.version + 1, syncStatus: 'local' });
  }
  assert.deepEqual(financeSummary(after, 'PHP', '2026-01', today), financeSummary(before, 'PHP', '2026-01', today));
  assert.equal(owedTotal(after, 'PHP', undefined, today), owedTotal(before, 'PHP', undefined, today));
  assert.deepEqual(tripSpending(vacation, after, today), { spent: 45, remaining: 455, covered: 100, owed: 75, categories: [{ name: 'Personal', amount: 45 }] });
  const unlinked = await life.save('moneyCollections', input('moneyCollections', { name: 'Loose receipts' }));
  await finance.assignMoneyRecords(selected, unlinked.id);
  after = await db.snapshot();
  assert.equal(tripSpending(vacation, after, today).spent, 30);
  await finance.assignMoneyRecords(selected, '');
  assert.equal((await db.snapshot()).transactions.find(item => item.id === fare.id)?.collectionId, '');
});

test('invalid selection, conflicting trip, and failed writes leave grouping and new collections unchanged', async () => {
  const { storage, finance, life, transaction, trip } = await setup();
  const first = await trip('First trip');
  const second = await trip('Second trip');
  const expense = await transaction({ tripId: first.id });
  const selected = [{ module: 'transactions' as const, id: expense.id }];
  const collection = await life.save('moneyCollections', input('moneyCollections', { name: 'Second trip', tripId: second.id }));
  const before = storage.values.get(DATABASE_KEY);
  await assert.rejects(finance.assignMoneyRecords(selected, collection.id), /another trip/);
  await assert.rejects(finance.assignMoneyRecords([...selected, { module: 'debts', id: randomUUID() }], '', { id: randomUUID(), name: 'New', tripId: '', peopleIds: [], notes: '' }), /no longer exists/);
  await assert.rejects(finance.assignMoneyRecords([...selected, ...selected], collection.id), /only be selected once/);
  await assert.rejects(finance.assignMoneyRecords(selected, randomUUID()), /existing money collection/);
  await assert.rejects(finance.assignMoneyRecords(selected, '', { id: randomUUID(), name: 'Invalid people', tripId: '', peopleIds: [randomUUID()], notes: '' }), /person is still linked/);
  assert.equal(storage.values.get(DATABASE_KEY), before);
  storage.fail = true;
  await assert.rejects(finance.assignMoneyRecords(selected, '', { id: randomUUID(), name: 'New', tripId: '', peopleIds: [], notes: '' }), /Storage unavailable/);
  assert.equal(storage.values.get(DATABASE_KEY), before);
});

test('people links validate unique existing IDs and prevent deletion until links are removed', async () => {
  const { db, life, person } = await setup();
  const plan = await life.save('projects', input('projects', { name: 'Weekend plan', peopleIds: [person.id] }));
  await assert.rejects(life.delete('people', person.id), /person is still linked/);
  await assert.rejects(life.save('projects', { ...plan, peopleIds: [person.id, person.id] }, plan.id), /only be included once/);
  await assert.rejects(life.save('projects', { ...plan, peopleIds: [randomUUID()] }, plan.id), /person is still linked/);
  await assert.rejects(life.save('projects', { ...plan, peopleIds: ['invalid'] }, plan.id), /Invalid record ID/);
  await life.save('projects', { ...plan, peopleIds: [] }, plan.id);
  await life.delete('people', person.id);
  validateDatabase(await db.snapshot());
});

test('schema-5 migration preserves old names, amounts, IDs, deleted entries and an untouched original backup', async () => {
  const { db, storage, life, transaction, debt } = await setup();
  const expense = await transaction({ name: 'Ignored old name', description: 'Yesterday lunch', amount: 123.45 });
  const loan = await debt('lent', { amount: 50 });
  await life.delete('transactions', expense.id);
  const legacy = JSON.parse(JSON.stringify(await db.snapshot()));
  legacy.schemaVersion = 5;
  delete legacy.moneyCollections;
  for (const item of legacy.transactions) { delete item.name; delete item.personId; delete item.collectionId; }
  for (const item of legacy.debts) { delete item.direction; delete item.collectionId; }
  for (const item of legacy.repayments) delete item.collectionId;
  for (const key of ['tasks', 'events', 'trips', 'tripItems', 'projects', 'goals', 'notes', 'activities', 'importantDates']) for (const item of legacy[key]) delete item.peopleIds;
  const raw = JSON.stringify(legacy);
  storage.values.set(DATABASE_KEY, raw);
  storage.fail = true;
  await assert.rejects(db.snapshot(), /Storage unavailable/);
  assert.equal(storage.values.get(DATABASE_KEY), raw);
  storage.fail = false;
  const migrated = await db.snapshot();
  assert.equal(migrated.schemaVersion, 6);
  assert.deepEqual(migrated.transactions[0], { ...legacy.transactions[0], name: 'Yesterday lunch', personId: '', collectionId: '' });
  assert.deepEqual(migrated.debts[0], { ...legacy.debts[0], direction: 'lent', collectionId: '' });
  assert.equal(migrated.transactions[0]?.id, expense.id);
  assert.equal(migrated.debts[0]?.id, loan.id);
  assert.equal(storage.values.get(`${DATABASE_KEY}.backup.v5`), raw);
  assert.deepEqual(migrated.moneyCollections, []);
  const invalid = { ...emptyDatabase(), schemaVersion: 5, transactions: [{ bad: 'data' }] };
  assert.throws(() => migrateDatabase(invalid), /Invalid record ID/);
});
