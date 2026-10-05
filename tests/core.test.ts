/// <reference types="node" />
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { LocalDatabase, DATABASE_KEY, type KeyValueStorage } from '../src/storage/localDatabase.ts';
import { emptyDatabase, migrateDatabase } from '../src/storage/migrations.ts';
import { LocalTaskRepository } from '../src/repositories/taskRepository.ts';
import { LocalCalendarRepository } from '../src/repositories/calendarRepository.ts';
import { TaskService, emptyTask } from '../src/features/tasks/taskService.ts';
import { CalendarService, emptyEvent, buildAgenda, agendaForDate } from '../src/services/calendarService.ts';
import { selectTasks } from '../src/features/tasks/selectors.ts';
import { isDateOnly, monthCells } from '../src/utils/dates.ts';

class MemoryStorage implements KeyValueStorage {
  data = new Map<string, string>();
  failWrites = false;
  async getItem(key: string) { return this.data.get(key) ?? null; }
  async setItem(key: string, value: string) {
    if (this.failWrites) throw new Error('Disk full');
    this.data.set(key, value);
  }
}
function setup() {
  const storage = new MemoryStorage();
  const database = new LocalDatabase(storage);
  const tasks = new TaskService(new LocalTaskRepository(database), randomUUID);
  const calendar = new CalendarService(new LocalCalendarRepository(database), randomUUID);
  return { storage, database, tasks, calendar };
}

test('task lifecycle persists across reload, preserves identity, versions writes, and retains deletion tombstones', async () => {
  const { storage, database, tasks } = setup();
  const original = await tasks.save({ ...emptyTask(), title: '  Plan the week  ', dueDate: '2026-10-05' });
  assert.equal(original.title, 'Plan the week');
  const reloaded = new TaskService(new LocalTaskRepository(new LocalDatabase(storage)), randomUUID);
  assert.equal((await reloaded.getAll())[0]?.id, original.id);
  const edited = await tasks.save({ ...original, title: 'Plan tomorrow' }, original.id);
  assert.equal(edited.createdAt, original.createdAt);
  assert.equal(edited.version, 2);
  const done = await tasks.toggle(original.id);
  assert.equal(done.status, 'completed');
  assert.ok(done.completedAt);
  assert.equal((await tasks.toggle(original.id)).completedAt, null);
  await tasks.delete(original.id);
  assert.equal((await tasks.getAll()).length, 0);
  assert.ok((await database.snapshot()).tasks[0]?.deletedAt);
  await assert.rejects(tasks.toggle(original.id), /no longer exists/);
});

test('concurrent writes across repositories do not overwrite each other', async () => {
  const { tasks, calendar } = setup();
  await Promise.all([
    ...Array.from({ length: 15 }, (_, i) => tasks.save({ ...emptyTask(), title: `Task ${i}` })),
    calendar.save({ ...emptyEvent('2026-10-05'), title: 'Lunch' }),
  ]);
  assert.equal((await tasks.getAll()).length, 15);
  assert.equal((await calendar.getAll()).length, 1);
});

test('write failure leaves the original data intact and does not poison the queue', async () => {
  const { storage, tasks } = setup();
  const original = await tasks.save({ ...emptyTask(), title: 'Keep me' });
  const raw = storage.data.get(DATABASE_KEY);
  storage.failWrites = true;
  await assert.rejects(tasks.save({ ...original, title: 'Unsaved' }, original.id), /Disk full/);
  assert.equal(storage.data.get(DATABASE_KEY), raw);
  storage.failWrites = false;
  assert.equal((await tasks.getAll())[0]?.title, 'Keep me');
  await tasks.save({ ...emptyTask(), title: 'Queue recovered' });
  assert.equal((await tasks.getAll()).length, 2);
});

test('malformed, corrupt, missing-version, and future data are rejected without overwriting', async () => {
  for (const raw of ['{oops', '{"schemaVersion":99}', '{"schemaVersion":1,"tasks":[]}', '{}']) {
    const { storage, database, tasks } = setup();
    storage.data.set(DATABASE_KEY, raw);
    await assert.rejects(database.snapshot());
    await assert.rejects(tasks.save({ ...emptyTask(), title: 'Do not overwrite' }));
    assert.equal(storage.data.get(DATABASE_KEY), raw);
  }
  assert.deepEqual(migrateDatabase(emptyDatabase()), emptyDatabase());
  assert.throws(() => migrateDatabase({ ...emptyDatabase(), schemaVersion: 0 }), /No safe migration/);
});

test('validation rejects invalid task dates, empty titles, times, and invalid event ranges', async () => {
  const { tasks, calendar } = setup();
  await assert.rejects(tasks.save({ ...emptyTask(), title: '   ' }), /Title/);
  await assert.rejects(tasks.save({ ...emptyTask(), title: 'Impossible date', dueDate: '2026-02-30' }), /due date/);
  await assert.rejects(tasks.save({ ...emptyTask(), title: 'Time only', dueTime: '09:00' }), /due date/);
  await assert.rejects(calendar.save({ ...emptyEvent('2026-10-06'), title: 'Backwards', endDate: '2026-10-05' }), /End date/);
  await assert.rejects(calendar.save({ ...emptyEvent('2026-10-05'), title: 'Backwards time', allDay: false, startTime: '10:00', endTime: '09:00' }), /End time/);
  await assert.rejects(calendar.save({ ...emptyEvent('2026-10-05'), title: 'Invalid time', allDay: false, startTime: '25:00', endTime: '26:00' }), /HH:mm/);
  assert.equal((await tasks.getAll()).length, 0);
  assert.equal((await calendar.getAll()).length, 0);
});

test('calendar includes multi-day events and active deadlines, updates without duplication', async () => {
  const { tasks, calendar } = setup();
  const task = await tasks.save({ ...emptyTask(), title: 'Pack', dueDate: '2026-10-05' });
  const trip = await calendar.save({ ...emptyEvent('2026-10-05'), title: 'Weekend away', endDate: '2026-10-07' });
  assert.equal(agendaForDate(buildAgenda(await calendar.getAll(), await tasks.getAll()), '2026-10-05').length, 2);
  assert.equal(agendaForDate(buildAgenda(await calendar.getAll(), []), '2026-10-06').length, 1);
  await tasks.save({ ...task, dueDate: '2026-10-08' }, task.id);
  assert.equal(agendaForDate(buildAgenda([], await tasks.getAll()), '2026-10-05').length, 0);
  assert.equal(agendaForDate(buildAgenda([], await tasks.getAll()), '2026-10-08').length, 1);
  await tasks.toggle(task.id);
  assert.equal(buildAgenda([], await tasks.getAll()).length, 0);
  await calendar.delete(trip.id);
  assert.equal((await calendar.getAll()).length, 0);
});

test('task views distinguish overdue, completed, cancelled, undated, and searchable tasks', async () => {
  const { tasks } = setup();
  await tasks.save({ ...emptyTask(), title: 'Overdue', dueDate: '2026-10-04' });
  await tasks.save({ ...emptyTask(), title: 'Today', dueDate: '2026-10-05', priority: 'urgent', tags: ['focus'] });
  await tasks.save({ ...emptyTask(), title: 'Later', dueDate: '2026-10-06' });
  await tasks.save({ ...emptyTask(), title: 'Cancelled', dueDate: '2026-10-04', status: 'cancelled' });
  await tasks.save({ ...emptyTask(), title: 'Done', dueDate: '2026-10-04', status: 'completed' });
  await tasks.save({ ...emptyTask(), title: 'Undated' });
  const all = await tasks.getAll();
  const options = { search: '', category: 'All categories', sort: 'Due date' as const };
  for (const [view, expected] of [['Today', 'Today'], ['Upcoming', 'Later'], ['Overdue', 'Overdue'], ['Completed', 'Done']] as const) {
    assert.deepEqual(selectTasks(all, { ...options, view }, '2026-10-05').map(task => task.title), [expected]);
  }
  assert.equal(selectTasks(all, { ...options, view: 'All', search: 'focus' })[0]?.title, 'Today');
  assert.equal(selectTasks(all, { ...options, view: 'All', sort: 'Priority' })[0]?.title, 'Today');
});

test('calendar dates handle leap years and month-grid boundaries without UTC date shifts', () => {
  assert.ok(isDateOnly('2028-02-29'));
  assert.ok(!isDateOnly('2026-02-29'));
  assert.ok(!isDateOnly('2026-13-01'));
  const cells = monthCells('2026-10-01');
  assert.equal(cells[4], '2026-10-01');
  assert.equal(cells.filter(Boolean).length, 31);
  assert.equal(cells.length % 7, 0);
});
