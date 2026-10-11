/// <reference types="node" />
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { LocalDatabase, DATABASE_KEY, type KeyValueStorage } from '../src/storage/localDatabase.ts';
import { LocalLifeRepository } from '../src/repositories/lifeRepository.ts';
import { LocalFinanceRepository } from '../src/repositories/financeRepository.ts';
import { LifeService } from '../src/services/lifeService.ts';
import { moduleDefaults } from '../src/features/library/catalog.ts';
import { budgetProgress, financeSummary, selectTransactions, walletBalance } from '../src/features/finance/selectors.ts';
import type { ModuleKey } from '../src/types/life.ts';

const today = '2026-10-08';
const input = (key: ModuleKey, values: Record<string, unknown>) => ({ ...moduleDefaults(key), ...(key === 'transactions' ? { name: values.description } : {}), ...values });
class MemoryStorage implements KeyValueStorage {
  values = new Map<string, string>();
  fail = false;
  async getItem(key: string) { return this.values.get(key) ?? null; }
  async setItem(key: string, value: string) { if (this.fail) throw new Error('Storage unavailable'); this.values.set(key, value); }
}
function setup() {
  const storage = new MemoryStorage();
  const db = new LocalDatabase(storage);
  const repository = new LocalLifeRepository(db);
  return { storage, db, repository, life: new LifeService(repository, randomUUID), finance: new LocalFinanceRepository(db) };
}

test('schema-2 upgrade preserves finance records, keeps them unassigned, and backs up original bytes', async () => {
  const { storage, db, life } = setup();
  const transaction = await life.save('transactions', input('transactions', { description: 'Old lunch', amount: 150, date: today }));
  await life.save('bills', input('bills', { name: 'Internet', amount: 1699 }));
  await life.save('subscriptions', input('subscriptions', { name: 'Music', amount: 149 }));
  await life.save('budgets', input('budgets', { name: 'Food', amount: 3000 }));
  const old = JSON.parse(storage.values.get(DATABASE_KEY)!);
  old.schemaVersion = 2;
  delete old.wallets; delete old.expectedIncome;
  for (const key of ['transactions', 'bills', 'subscriptions']) for (const record of old[key]) {
    delete record.walletId; delete record.toWalletId; delete record.expectedIncomeId;
  }
  for (const budget of old.budgets) delete budget.alertsEnabled;
  const raw = JSON.stringify(old);
  storage.values.set(DATABASE_KEY, raw);
  const migrated = await db.snapshot();
  assert.equal(migrated.schemaVersion, 6);
  assert.deepEqual(migrated.transactions[0], transaction);
  assert.equal(migrated.bills[0]?.walletId, '');
  assert.equal(migrated.subscriptions[0]?.walletId, '');
  assert.equal(migrated.budgets[0]?.alertsEnabled, true);
  assert.deepEqual(migrated.wallets, []);
  assert.deepEqual(migrated.expectedIncome, []);
  assert.equal(storage.values.get(`${DATABASE_KEY}.backup.v2`), raw);
  assert.equal(financeSummary(migrated, 'PHP', '2026-10', today).unassignedCount, 1);
  assert.deepEqual(await new LocalDatabase(storage).snapshot(), migrated);

  storage.values.set(DATABASE_KEY, raw);
  storage.fail = true;
  await assert.rejects(db.snapshot(), /Storage unavailable/);
  assert.equal(storage.values.get(DATABASE_KEY), raw);
  storage.fail = false;
  old.transactions[0].amount = 'invalid';
  const corrupt = JSON.stringify(old);
  storage.values.set(DATABASE_KEY, corrupt);
  await assert.rejects(db.snapshot(), /Amount/);
  assert.equal(storage.values.get(DATABASE_KEY), corrupt);
});

test('wallet balances include opening money and preserve total wealth through transfer edits and deletion', async () => {
  const { life, db } = setup();
  const cash = await life.save('wallets', input('wallets', { name: 'Cash', openingBalance: 1000 }));
  const bank = await life.save('wallets', input('wallets', { name: 'Bank', openingBalance: 2000 }));
  await life.save('transactions', input('transactions', { description: 'Salary', type: 'income', amount: 500, walletId: bank.id, date: today }));
  await life.save('transactions', input('transactions', { description: 'Lunch', amount: 100, walletId: cash.id, date: today }));
  const transfer = await life.save('transactions', input('transactions', { description: 'Withdraw cash', type: 'transfer', amount: 300, walletId: bank.id, toWalletId: cash.id, date: today }));
  let data = await life.getAll();
  assert.equal(walletBalance(cash, data.transactions, today), 1200);
  assert.equal(walletBalance(bank, data.transactions, today), 2200);
  const summary = financeSummary(data, 'PHP', '2026-10', today);
  assert.equal(summary.walletTotal, 3400);
  assert.equal(summary.income, 500);
  assert.equal(summary.expenses, 100);
  assert.equal(summary.net, 400);
  await life.save('transactions', { ...transfer, amount: 400 }, transfer.id);
  data = await life.getAll();
  assert.equal(walletBalance(cash, data.transactions, today), 1300);
  assert.equal(walletBalance(bank, data.transactions, today), 2100);
  await life.delete('transactions', transfer.id);
  data = await db.snapshot();
  assert.equal(walletBalance(cash, data.transactions, today), 900);
  assert.equal(walletBalance(bank, data.transactions, today), 2500);
  assert.equal(financeSummary(data, 'PHP', '2026-10', today).walletTotal, 3400);
});

test('financial validation rejects missing, identical, mismatched, and in-use wallets without writing', async () => {
  const { life, storage } = setup();
  const cash = await life.save('wallets', input('wallets', { name: 'Cash' }));
  const usd = await life.save('wallets', input('wallets', { name: 'USD', currency: 'USD' }));
  const transfer = input('transactions', { description: 'Move', type: 'transfer', amount: 50, walletId: cash.id, date: today });
  const before = storage.values.get(DATABASE_KEY);
  await assert.rejects(life.save('transactions', transfer), /two different wallets/);
  await assert.rejects(life.save('transactions', { ...transfer, toWalletId: cash.id }), /two different wallets/);
  await assert.rejects(life.save('transactions', { ...transfer, toWalletId: usd.id }), /currencies must match/);
  await assert.rejects(life.save('transactions', { ...transfer, toWalletId: randomUUID() }), /existing/);
  await assert.rejects(life.save('transactions', { ...transfer, type: 'expense', toWalletId: cash.id }), /Only transfers/);
  await assert.rejects(life.save('wallets', input('wallets', { name: 'Bad precision', openingBalance: 1.001 })), /decimal/);
  assert.equal(storage.values.get(DATABASE_KEY), before);
  const expense = await life.save('transactions', { ...transfer, type: 'expense' });
  const linked = storage.values.get(DATABASE_KEY);
  await assert.rejects(life.delete('wallets', cash.id), /still linked/);
  await assert.rejects(life.save('wallets', { ...cash, currency: 'USD' }, cash.id), /currencies must match/);
  assert.equal(storage.values.get(DATABASE_KEY), linked);
  await life.save('transactions', { ...expense, walletId: '' }, expense.id);
  await life.delete('wallets', cash.id);
  assert.equal((await life.getAll()).wallets.length, 1);
});

test('actual totals exclude future, deleted, and other-currency transactions but retain past balances', async () => {
  const { life, db } = setup();
  const wallet = await life.save('wallets', input('wallets', { name: 'Cash', openingBalance: 0.1 }));
  const income = input('transactions', { description: 'Income', type: 'income', walletId: wallet.id, date: today, amount: 0.2 });
  await life.save('transactions', income);
  await life.save('transactions', { ...income, amount: 10, date: '2026-09-30' });
  await life.save('transactions', { ...income, amount: 100, date: '2026-10-09' });
  const deleted = await life.save('transactions', { ...income, amount: 200 });
  await life.delete('transactions', deleted.id);
  await life.save('transactions', { ...income, amount: 300, walletId: '', currency: 'USD' });
  await life.save('transactions', { ...income, amount: 400, walletId: '' });
  const data = await db.snapshot();
  const summary = financeSummary(data, 'PHP', '2026-10', today);
  assert.equal(walletBalance(wallet, data.transactions, today), 10.3);
  assert.equal(summary.income, 400.2);
  assert.equal(summary.walletTotal, 10.3);
  assert.equal(summary.unassignedCount, 1);
  assert.equal(walletBalance(wallet, data.transactions, '2026-10-09'), 110.3);
  assert.equal(financeSummary(data, 'PHP', '2026-13', today).income, 0);
});

test('expected income stays planned until an atomic, once-only receipt and respects write failures', async () => {
  const { life, finance, storage, repository } = setup();
  const bank = await life.save('wallets', input('wallets', { name: 'Bank' }));
  const plan = await life.save('expectedIncome', input('expectedIncome', { name: 'Salary', amount: 30000, walletId: bank.id, expectedDate: today }));
  let summary = financeSummary(await life.getAll(), 'PHP', '2026-10', today);
  assert.equal(summary.expected, 30000);
  assert.equal(summary.income, 0);
  assert.equal(summary.walletTotal, 0);
  await assert.rejects(life.save('expectedIncome', { ...plan, status: 'received' }, plan.id), /Mark received/);
  const before = storage.values.get(DATABASE_KEY);
  storage.fail = true;
  await assert.rejects(finance.receiveIncome(plan.id, randomUUID(), today), /Storage unavailable/);
  assert.equal(storage.values.get(DATABASE_KEY), before);
  storage.fail = false;
  const results = await Promise.allSettled([finance.receiveIncome(plan.id, randomUUID(), today), finance.receiveIncome(plan.id, randomUUID(), today)]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  let data = await life.getAll();
  summary = financeSummary(data, 'PHP', '2026-10', today);
  assert.equal(data.transactions.length, 1);
  assert.equal(data.transactions[0]?.expectedIncomeId, plan.id);
  assert.equal(summary.expected, 0);
  assert.equal(summary.income, 30000);
  assert.equal(summary.walletTotal, 30000);
  await assert.rejects(repository.collection('expectedIncome').update(plan.id, { status: 'expected' }), /settled/);
  const receipt = data.transactions[0]!;
  await assert.rejects(life.save('transactions', { ...receipt, expectedIncomeId: '' }, receipt.id), /links/);
  await assert.rejects(life.save('transactions', { ...receipt, type: 'expense' }, receipt.id), /must stay/);
  await life.save('transactions', { ...receipt, amount: 31000 }, receipt.id);
  assert.equal(financeSummary(await life.getAll(), 'PHP', '2026-10', today).income, 31000);
  await life.delete('transactions', receipt.id);
  await assert.rejects(finance.receiveIncome(plan.id, randomUUID(), today), /already received/);
  data = await life.getAll();
  assert.equal(data.expectedIncome[0]?.status, 'received');
  assert.equal(financeSummary(data, 'PHP', '2026-10', today).walletTotal, 0);
});

test('paying a bill moves its saved wallet balance and unpaid forecast once, including concurrent taps', async () => {
  const { life, finance, repository } = setup();
  const wallet = await life.save('wallets', input('wallets', { name: 'GCash', openingBalance: 1000 }));
  await life.save('transactions', input('transactions', { description: 'Income', type: 'income', amount: 500, walletId: wallet.id, date: today }));
  const bill = await life.save('bills', input('bills', { name: 'Internet', amount: 100, walletId: wallet.id, dueDate: today }));
  const before = financeSummary(await life.getAll(), 'PHP', '2026-10', today);
  assert.equal(before.bills, 100);
  assert.equal(before.available, 400);
  const results = await Promise.allSettled([finance.payBill(bill.id, randomUUID(), randomUUID(), today), finance.payBill(bill.id, randomUUID(), randomUUID(), today)]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  const data = await life.getAll();
  const after = financeSummary(data, 'PHP', '2026-10', today);
  assert.equal(after.expenses, 100);
  assert.equal(after.bills, 0);
  assert.equal(after.available, 400);
  assert.equal(after.walletTotal, 1400);
  await assert.rejects(repository.collection('bills').update(bill.id, { status: 'upcoming' }), /settled/);
  const payment = data.transactions.find(item => item.billId === bill.id)!;
  assert.equal(payment.walletId, wallet.id);
  await life.delete('transactions', payment.id);
  await assert.rejects(finance.payBill(bill.id, randomUUID(), randomUUID(), today), /already paid/);
});

test('subscription renewals use their wallet and cancelled income cannot be received', async () => {
  const { life, finance } = setup();
  const wallet = await life.save('wallets', input('wallets', { name: 'Bank', openingBalance: 500 }));
  const subscription = await life.save('subscriptions', input('subscriptions', { name: 'Music', amount: 149, walletId: wallet.id, nextBillingDate: today }));
  await finance.renewSubscription(subscription.id, randomUUID(), today);
  assert.equal(walletBalance(wallet, (await life.getAll()).transactions, today), 351);
  const plan = await life.save('expectedIncome', input('expectedIncome', { name: 'Cancelled job', amount: 500, expectedDate: today, status: 'cancelled' }));
  await assert.rejects(finance.receiveIncome(plan.id, randomUUID(), today), /cancelled/);
  assert.equal(financeSummary(await life.getAll(), 'PHP', '2026-10', today).expected, 0);
});

test('budget thresholds use expenses in the matching month, category and currency and can mute alerts', async () => {
  const { life } = setup();
  const budget = await life.save('budgets', input('budgets', { name: 'Food', category: 'food', amount: 100, month: '2026-10' }));
  const expense = await life.save('transactions', input('transactions', { description: 'Lunch', category: ' FOOD ', amount: 79.99, date: today }));
  for (const [amount, level, alert] of [[79.99, 'healthy', false], [80, 'near', true], [100, 'limit', true], [100.01, 'over', true]] as const) {
    const progress = budgetProgress(budget, [{ ...expense, amount }], today);
    assert.equal(progress.level, level);
    assert.equal(progress.alert, alert);
    assert.equal(progress.spent, amount);
    assert.ok(progress.barPercent <= 100);
  }
  assert.equal(budgetProgress(budget, [{ ...expense, amount: 100.01 }], today).remaining, -0.01);
  assert.equal(budgetProgress({ ...budget, alertsEnabled: false }, [{ ...expense, amount: 100 }], today).alert, false);
  const ignored = [{ ...expense, type: 'income' as const }, { ...expense, type: 'transfer' as const }, { ...expense, currency: 'USD' }, { ...expense, category: 'Travel' }, { ...expense, date: '2026-09-30' }, { ...expense, date: '2026-10-09' }, { ...expense, deletedAt: '2026-10-08T00:00:00.000Z' }];
  assert.equal(budgetProgress(budget, [expense, ...ignored], today).spent, 79.99);
  const edited = await life.save('transactions', { ...expense, amount: 90 }, expense.id);
  assert.equal(budgetProgress(budget, (await life.getAll()).transactions, today).remaining, 10);
  await life.delete('transactions', edited.id);
  assert.equal(budgetProgress(budget, (await life.getAll()).transactions, today).spent, 0);
});

test('transaction history combines filters, finds either transfer wallet, and sorts newest first', async () => {
  const { life } = setup();
  const bank = await life.save('wallets', input('wallets', { name: 'Bank' }));
  const cash = await life.save('wallets', input('wallets', { name: 'Cash' }));
  const trip = await life.save('trips', input('trips', { title: 'Trip', destination: 'Beach' }));
  const transfer = await life.save('transactions', input('transactions', { description: 'Travel cash', type: 'transfer', amount: 100, walletId: bank.id, toWalletId: cash.id, date: today, tripId: trip.id, category: 'Travel', notes: 'Weekend ATM' }));
  const expense = await life.save('transactions', input('transactions', { description: 'Lunch', amount: 50, date: '2026-09-30' }));
  const data = (await life.getAll()).transactions;
  const filter = { month: '', type: 'all' as const, walletId: '', category: '', search: '' };
  assert.deepEqual(selectTransactions(data, filter).map(item => item.id), [transfer.id, expense.id]);
  for (const walletId of [bank.id, cash.id]) assert.deepEqual(selectTransactions(data, { ...filter, month: '2026-10', type: 'transfer', walletId, category: ' travel ', search: 'ATM', tripId: trip.id }).map(item => item.id), [transfer.id]);
  assert.deepEqual(selectTransactions(data, { ...filter, walletId: 'unassigned' }).map(item => item.id), [expense.id]);
  assert.equal(selectTransactions(data, { ...filter, month: '2026-13' }).length, 0);
  assert.equal(selectTransactions(data, { ...filter, month: '2026-10', type: 'income' }).length, 0);
  assert.equal(selectTransactions([{ ...expense, deletedAt: new Date().toISOString() }], filter).length, 0);
});
