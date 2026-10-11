/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emptyEvent, emptyEventAt } from '../src/services/calendarService.ts';

test('adding an event from an agenda item starts at its time and lasts an hour', () => {
  const draft = emptyEventAt('2026-10-11', '06:30');
  assert.deepEqual(draft, { ...emptyEvent('2026-10-11'), allDay: false, startTime: '06:30', endTime: '07:30' });
  assert.equal(emptyEventAt('2026-10-11', '09:45').endTime, '10:45');
});

test('late starts end by 23:59 on the same day, leaving the end open when no later minute exists', () => {
  assert.equal(emptyEventAt('2026-10-11', '23:30').endTime, '23:59');
  assert.equal(emptyEventAt('2026-10-11', '22:59').endTime, '23:59');
  const lastMinute = emptyEventAt('2026-10-11', '23:59');
  assert.equal(lastMinute.startTime, '23:59');
  assert.equal(lastMinute.endTime, null);
  assert.equal(lastMinute.allDay, false);
});

test('items without a valid time add an all-day event on that date', () => {
  for (const time of [undefined, null, '', '24:00', '7:30', 'noon']) {
    assert.deepEqual(emptyEventAt('2026-10-11', time), emptyEvent('2026-10-11'), String(time));
  }
});
