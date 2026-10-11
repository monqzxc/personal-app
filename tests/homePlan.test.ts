/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { dayTasks, nextAppointment, overdueTasks, weekDates } from '../src/features/home/dayPlan.ts';
import { emptyTask } from '../src/features/tasks/taskService.ts';
import { emptyEvent } from '../src/services/calendarService.ts';
import { newEntity } from '../src/services/entity.ts';
import type { CalendarEvent, Task } from '../src/types/models.ts';

const day = '2026-10-10';
const now = new Date(2026, 9, 10, 10, 30);
const task = (values: Partial<Task> = {}): Task => ({ ...newEntity(randomUUID()), ...emptyTask(), title: 'Task', completedAt: null, dueDate: day, ...values });
const event = (values: Partial<CalendarEvent> = {}): CalendarEvent => ({ ...newEntity(randomUUID()), ...emptyEvent(day), title: 'Event', allDay: false, startTime: '11:00', endTime: '12:00', ...values });

test('home week spans month/year boundaries with seven local calendar dates', () => {
  assert.deepEqual(weekDates('2027-01-01'), ['2026-12-27', '2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02']);
  assert.deepEqual(weekDates('2026-03-08'), ['2026-03-08', '2026-03-09', '2026-03-10', '2026-03-11', '2026-03-12', '2026-03-13', '2026-03-14']);
});

test('day focus prioritizes active tasks without including other dates or mutating input', () => {
  const low = task({ priority: 'low' });
  const highLater = task({ priority: 'high', dueTime: '16:00' });
  const highEarlier = task({ priority: 'high', dueTime: '09:00' });
  const rows = [low, highLater, highEarlier, task({ status: 'completed' }), task({ status: 'cancelled' }), task({ deletedAt: new Date().toISOString() }), task({ dueDate: null }), task({ dueDate: '2026-10-11' })];
  assert.deepEqual(dayTasks(rows, day).map(item => item.id), [highEarlier.id, highLater.id, low.id]);
  assert.equal(rows[0], low);
});

test('overdue focus puts the oldest active deadline first', () => {
  const oldest = task({ dueDate: '2026-10-01' });
  const recent = task({ dueDate: '2026-10-09' });
  assert.deepEqual(overdueTasks([recent, task(), task({ dueDate: '2026-10-02', status: 'completed' }), oldest], day).map(item => item.id), [oldest.id, recent.id]);
});

test('next appointment skips all-day and ended events and prioritizes one in progress', () => {
  const inProgress = event({ startTime: '10:00', endTime: '11:00' });
  const next = event();
  const rows = [event({ endTime: '10:30', startTime: '09:00' }), next, event({ allDay: true, startTime: null, endTime: null }), event({ deletedAt: new Date().toISOString() }), inProgress];
  assert.equal(nextAppointment(rows, day, now)?.id, inProgress.id);
  assert.equal(nextAppointment(rows.filter(item => item !== inProgress), day, now)?.id, next.id);
});

test('next appointment handles multi-day events and future/past day selection', () => {
  const spanning = event({ startDate: '2026-10-09', startTime: '23:00', endTime: '11:00' });
  assert.equal(nextAppointment([spanning, event()], day, now)?.id, spanning.id);
  assert.equal(nextAppointment([event({ startTime: '09:00', endTime: '10:00' })], day, now), undefined);
  assert.equal(nextAppointment([spanning], '2026-10-09', now), undefined);
  const future = event({ startDate: '2026-10-11', endDate: '2026-10-11', startTime: '08:00', endTime: '09:00' });
  assert.equal(nextAppointment([future], '2026-10-11', now)?.id, future.id);
});
