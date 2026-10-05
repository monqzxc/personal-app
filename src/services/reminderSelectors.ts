import type { CalendarEvent, Task } from '../types/models.ts';
import type { LifeCollections } from '../types/life.ts';
import { isActiveTask } from '../features/tasks/selectors.ts';

export interface ScheduledReminder { id: string; title: string; at: string; route: string }
export function collectReminders(tasks: Task[], events: CalendarEvent[], data: LifeCollections, now = Date.now()): ScheduledReminder[] {
  const items: ScheduledReminder[] = [];
  const add = (prefix: string, id: string, title: string, at: string | undefined, route: string) => {
    if (at && Date.parse(at) > now) items.push({ id: `daywell:${prefix}:${id}`, title, at, route });
  };
  for (const task of tasks.filter(isActiveTask)) add('task', task.id, task.title, task.reminder?.at, `/task?id=${task.id}`);
  for (const event of events.filter(item => !item.deletedAt)) add('event', event.id, event.title, event.reminder?.at, `/event?id=${event.id}`);
  for (const bill of data.bills.filter(item => !item.deletedAt && !['paid', 'cancelled'].includes(item.status))) add('bill', bill.id, bill.name, bill.reminder?.at, `/record?module=bills&id=${bill.id}`);
  for (const item of data.subscriptions.filter(item => !item.deletedAt && item.status === 'active')) add('subscription', item.id, item.name, item.reminder?.at, `/record?module=subscriptions&id=${item.id}`);
  for (const item of data.trips.filter(item => !item.deletedAt && !['completed', 'cancelled'].includes(item.status))) add('trip', item.id, item.title, item.reminder?.at, `/record?module=trips&id=${item.id}`);
  for (const item of data.importantDates.filter(item => !item.deletedAt)) add('date', item.id, item.title, item.reminder?.at, `/record?module=importantDates&id=${item.id}`);
  return items.sort((a, b) => a.at.localeCompare(b.at));
}
