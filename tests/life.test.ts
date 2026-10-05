/// <reference types="node" />
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { LocalDatabase, DATABASE_KEY, type KeyValueStorage } from '../src/storage/localDatabase.ts';
import { LocalLifeRepository } from '../src/repositories/lifeRepository.ts';
import { LocalFinanceRepository } from '../src/repositories/financeRepository.ts';
import { LocalTaskRepository } from '../src/repositories/taskRepository.ts';
import { LocalCalendarRepository } from '../src/repositories/calendarRepository.ts';
import { LifeService } from '../src/services/lifeService.ts';
import { TaskService, emptyTask } from '../src/features/tasks/taskService.ts';
import { CalendarService, emptyEvent, buildAgenda, agendaForDate } from '../src/services/calendarService.ts';
import { moduleDefaults, moduleKeys } from '../src/features/library/catalog.ts';
import { emptyDatabase } from '../src/storage/migrations.ts';
import { financeSummary, monthlySubscription } from '../src/features/finance/selectors.ts';
import { goalProgress } from '../src/features/goals/progress.ts';
import { collectReminders } from '../src/services/reminderSelectors.ts';
import { searchService } from '../src/services/searchService.ts';
import { advanceDate } from '../src/utils/recurrence.ts';
import type { ModuleKey } from '../src/types/life.ts';

class MemoryStorage implements KeyValueStorage {
  values = new Map<string, string>();
  fail = false;
  async getItem(key: string) { return this.values.get(key) ?? null; }
  async setItem(key: string, value: string) { if (this.fail) throw new Error('Storage unavailable'); this.values.set(key, value); }
}
function setup() {
  const storage = new MemoryStorage();
  const db = new LocalDatabase(storage);
  return { storage, db, life: new LifeService(new LocalLifeRepository(db), randomUUID),
    finance: new LocalFinanceRepository(db), tasks: new TaskService(new LocalTaskRepository(db), randomUUID),
    calendar: new CalendarService(new LocalCalendarRepository(db), randomUUID) };
}
const input = (key: ModuleKey, values: Record<string, unknown>) => ({ ...moduleDefaults(key), ...values });

test('schema-1 migration retains existing records and settings and saves an untouched backup', async () => {
  const { storage, db, tasks, life } = setup();
  const task = await tasks.save({ ...emptyTask(), title: 'Existing task' });
  const legacy = JSON.stringify({ schemaVersion: 1, tasks: [task], events: [], settings: { theme: 'dark', currency: 'JPY', name: 'Alex' } });
  storage.values.set(DATABASE_KEY, legacy);
  const migrated = await db.snapshot();
  assert.equal(migrated.schemaVersion, 2);
  assert.equal(migrated.tasks[0]?.id, task.id);
  assert.equal(migrated.settings.name, 'Alex');
  assert.equal(migrated.settings.notificationsEnabled, false);
  assert.equal(storage.values.get(`${DATABASE_KEY}.backup.v1`), legacy);
  assert.equal((await life.getAll()).transactions.length, 0);
  for (const key of moduleKeys) assert.deepEqual(migrated[key], []);
});

test('each local module has validated CRUD and survives a fresh repository instance', async () => {
  const { life, db } = setup();
  const trip = await life.save('trips', input('trips', { title: 'Japan', destination: 'Tokyo' }));
  const samples: Record<ModuleKey, Record<string, unknown>> = {
    transactions: { description: 'Lunch', amount: 150 }, bills: { name: 'Internet', amount: 1699 },
    subscriptions: { name: 'Music', amount: 149 }, budgets: { name: 'Food', amount: 5000 },
    savings: { name: 'Emergency fund', targetValue: 100000 }, trips: { title: 'Beach', destination: 'Batangas' },
    tripItems: { title: 'Pack charger', tripId: trip.id, kind: 'packing' }, projects: { name: 'Personal app' },
    goals: { title: 'Read books' }, notes: { title: 'Ideas', content: 'A useful thought' },
    bookmarks: { title: 'Expo', url: 'https://expo.dev' }, accounts: { serviceName: 'GitHub' },
    inbox: { content: 'Something to organize' }, importantDates: { title: 'Birthday' },
  };
  for (const key of moduleKeys) {
    const created = await life.save(key, input(key, samples[key]));
    const reloaded = new LocalLifeRepository(db).collection(key);
    assert.equal((await reloaded.getById(created.id))?.id, created.id);
    const edited = await life.save(key, { ...created }, created.id);
    assert.equal(edited.version, 2);
    await life.delete(key, created.id);
    assert.equal(await reloaded.getById(created.id), null);
  }
});

test('paying a recurring bill atomically adds expense and next bill; duplicate payment is rejected', async () => {
  const { life, finance, storage } = setup();
  const bill = await life.save('bills', input('bills', { name: 'Internet', amount: 1699, dueDate: '2026-01-31', isRecurring: true }));
  const before = storage.values.get(DATABASE_KEY);
  storage.fail = true;
  await assert.rejects(finance.payBill(bill.id, randomUUID(), randomUUID(), '2026-01-31'));
  assert.equal(storage.values.get(DATABASE_KEY), before);
  storage.fail = false;
  await finance.payBill(bill.id, randomUUID(), randomUUID(), '2026-01-31');
  const data = await life.getAll();
  assert.equal(data.transactions.length, 1);
  assert.equal(data.transactions[0]?.billId, bill.id);
  assert.equal(data.bills.find(item => item.id !== bill.id)?.dueDate, '2026-02-28');
  assert.equal(data.bills.find(item => item.id === bill.id)?.status, 'paid');
  await assert.rejects(finance.payBill(bill.id, randomUUID(), randomUUID(), '2026-01-31'), /already paid/);
});

test('renewals record one cycle, advance the date, and do not allow an early repeat', async () => {
  const { life, finance } = setup();
  const subscription = await life.save('subscriptions', input('subscriptions', { name: 'Hosting', amount: 1200, billingCycle: 'yearly', nextBillingDate: '2026-10-05' }));
  assert.equal(monthlySubscription(subscription), 100);
  await finance.renewSubscription(subscription.id, randomUUID(), '2026-10-05');
  const data = await life.getAll();
  assert.equal(data.subscriptions[0]?.nextBillingDate, '2027-10-05');
  assert.equal(data.transactions[0]?.subscriptionId, subscription.id);
  await assert.rejects(finance.renewSubscription(subscription.id, randomUUID(), '2026-10-05'), /not due/);
});

test('currency-safe monthly totals use minor units and reject excessive precision', async () => {
  const { life } = setup();
  for (const amount of [0.1, 0.2]) await life.save('transactions', input('transactions', { description: 'Small expense', amount, date: '2026-10-05', category: '__proto__' }));
  await life.save('transactions', input('transactions', { description: 'Salary', amount: 100, type: 'income', date: '2026-10-05' }));
  await life.save('transactions', input('transactions', { description: 'USD expense', amount: 90, currency: 'USD', date: '2026-10-05' }));
  await life.save('bills', input('bills', { name: 'Bill', amount: 20, dueDate: '2026-10-08' }));
  const summary = financeSummary(await life.getAll(), 'PHP', '2026-10');
  assert.equal(summary.expenses, 0.3);
  assert.equal(summary.available, 79.7);
  assert.equal(summary.categories[0]?.name, '__proto__');
  await assert.rejects(life.save('transactions', input('transactions', { description: 'Too precise', amount: 1.001 })), /decimal/);
  await assert.rejects(life.save('transactions', input('transactions', { description: 'JPY fraction', amount: 0.5, currency: 'JPY' })), /whole amounts/);
});

test('Inbox conversions are atomic, retain original capture, and cannot be repeated', async () => {
  const { life, tasks, storage } = setup();
  const capture = await life.save('inbox', input('inbox', { content: 'Buy milk' }));
  storage.fail = true;
  await assert.rejects(tasks.save({ ...emptyTask(), title: capture.content }, undefined, capture.id));
  storage.fail = false;
  assert.equal((await life.getAll()).inbox[0]?.processed, false);
  const task = await tasks.save({ ...emptyTask(), title: capture.content }, undefined, capture.id);
  const inbox = (await life.getAll()).inbox[0];
  assert.equal(inbox?.content, 'Buy milk');
  assert.equal(inbox?.convertedEntityId, task.id);
  assert.equal(inbox?.convertedType, 'tasks');
  await assert.rejects(life.save('notes', input('notes', { title: 'Duplicate' }), undefined, capture.id), /already been processed/);
  assert.equal((await life.getAll()).notes.length, 0);
});

test('recurring tasks create one next occurrence even after reopen/recomplete', async () => {
  const { tasks } = setup();
  const task = await tasks.save({ ...emptyTask(), title: 'Review month', dueDate: '2026-01-31', isRecurring: true, recurrence: { frequency: 'monthly', interval: 1 } });
  const completed = await tasks.toggle(task.id);
  assert.ok(completed.nextOccurrenceId);
  assert.equal((await tasks.getAll()).find(item => item.id !== task.id)?.dueDate, '2026-02-28');
  await tasks.toggle(task.id);
  await tasks.toggle(task.id);
  assert.equal((await tasks.getAll()).length, 2);
  assert.equal(advanceDate('2028-02-29', 'yearly'), '2029-02-28');
});

test('goals derive progress from values, milestones, or linked completed tasks', async () => {
  const { life, tasks } = setup();
  const goal = await life.save('goals', input('goals', { title: 'Read', targetValue: 10, currentValue: 3 }));
  assert.equal(goalProgress(goal, []), 30);
  assert.equal(goalProgress({ ...goal, progressMode: 'milestones', milestones: [{ id: randomUUID(), title: 'First', completed: true }, { id: randomUUID(), title: 'Second', completed: false }] }, []), 50);
  await tasks.save({ ...emptyTask(), title: 'Book one', goalId: goal.id, status: 'completed' });
  await tasks.save({ ...emptyTask(), title: 'Book two', goalId: goal.id });
  await tasks.save({ ...emptyTask(), title: 'Ignore cancelled', goalId: goal.id, status: 'cancelled' });
  assert.equal(goalProgress({ ...goal, progressMode: 'tasks' }, await tasks.getAll()), 50);
});

test('calendar links plans and normalizes leap-day anniversaries; completed/paid records are excluded', async () => {
  const { life } = setup();
  await life.save('bills', input('bills', { name: 'Paid bill', amount: 50, dueDate: '2026-02-28', status: 'paid' }));
  await life.save('importantDates', input('importantDates', { title: 'Leap birthday', date: '2024-02-29', yearly: true }));
  await life.save('trips', input('trips', { title: 'Weekend', destination: 'Beach', startDate: '2026-02-27', endDate: '2026-03-01' }));
  const agenda = buildAgenda([], [], await life.getAll(), 2026);
  assert.equal(agendaForDate(agenda, '2026-02-28').length, 2);
  assert.ok(agenda.every(item => item.module !== 'bills'));
});

test('validation rejects unsafe URLs and credential fields, while search and reminders use live records', async () => {
  const { life, tasks } = setup();
  await assert.rejects(life.save('bookmarks', input('bookmarks', { title: 'Unsafe', url: 'javascript:alert(1)' })), /http/);
  await assert.rejects(life.save('accounts', input('accounts', { serviceName: 'Site', password: 'do-not-save' })), /credentials/);
  await life.save('notes', input('notes', { title: 'Japan hotel', content: 'Kyoto garden' }));
  const task = await tasks.save({ ...emptyTask(), title: 'Book Kyoto', reminder: { at: '2027-01-01T01:00:00.000Z' } });
  const data = await life.getAll();
  assert.equal(searchService.search('kyoto', { tasks: await tasks.getAll(), events: [], data }).length, 2);
  assert.equal(collectReminders(await tasks.getAll(), [], data, Date.parse('2026-01-01')).length, 1);
  await tasks.toggle(task.id);
  assert.equal(collectReminders(await tasks.getAll(), [], data, Date.parse('2026-01-01')).length, 0);
});

test('re-importing calendar snapshots skips previously imported occurrences', async () => {
  const { calendar } = setup();
  const event = { ...emptyEvent('2026-10-05'), title: 'Imported', providerEventId: 'calendar:event:occurrence' };
  await calendar.importEvents([event, event]);
  await calendar.importEvents([event]);
  assert.equal((await calendar.getAll()).length, 1);
  assert.equal(emptyDatabase().schemaVersion, 2);
});
