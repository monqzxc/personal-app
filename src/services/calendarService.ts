import type { CalendarRepository } from '../repositories/contracts.ts';
import type { CalendarEvent, DateOnly, EventInput, Task } from '../types/models.ts';
import { newEntity } from './entity.ts';
import { ensure, validateEvent } from './validation.ts';
import { dateOnly } from '../utils/dates.ts';
import { isActiveTask } from '../features/tasks/selectors.ts';
import type { LifeCollections, ModuleKey } from '../types/life.ts';
import { emptyLifeCollections } from '../features/library/catalog.ts';

export const emptyEvent = (date = dateOnly()): EventInput => ({
  title: '', description: '', startDate: date, endDate: date, startTime: null, endTime: null,
  allDay: true, location: '', category: 'Personal', reminder: null,
  relatedEntityType: null, relatedEntityId: null, peopleIds: [],
});
// A new event beside an agenda item: starts at its time and runs an hour, ending by 23:59 the same day.
export function emptyEventAt(date?: DateOnly, time?: string | null): EventInput {
  const event = emptyEvent(date);
  if (!time || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return event;
  const start = Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  const end = Math.min(start + 60, 23 * 60 + 59);
  const pad = (value: number) => String(value).padStart(2, '0');
  return { ...event, allDay: false, startTime: time, endTime: end > start ? `${pad(Math.floor(end / 60))}:${pad(end % 60)}` : null };
}
export interface AgendaItem {
  id: string; title: string; date: DateOnly; endDate: DateOnly;
  time: string | null; kind: 'event' | 'task' | 'record'; sourceId: string; detail: string; module?: ModuleKey;
}

export class CalendarService {
  private repository: CalendarRepository;
  private uuid: () => string;
  constructor(repository: CalendarRepository, uuid: () => string) { this.repository = repository; this.uuid = uuid; }
  getAll() { return this.repository.getAll(); }
  async save(input: EventInput, id?: string, inboxId?: string): Promise<CalendarEvent> {
    const existing = id ? await this.repository.getById(id) : null;
    if (id) ensure(existing, 'This event no longer exists.');
    const event: CalendarEvent = { ...(existing ?? newEntity(this.uuid())), ...input,
      title: input.title.trim(), category: input.category.trim() || 'Personal',
      startTime: input.allDay ? null : input.startTime, endTime: input.allDay ? null : input.endTime };
    validateEvent(event);
    if (!id) return this.repository.create(event, inboxId);
    const { id: _id, createdAt: _created, updatedAt: _updated, deletedAt: _deleted,
      version: _version, syncStatus: _sync, lastSyncedAt: _last, serverUpdatedAt: _server, ...patch } = event;
    return this.repository.update(id, patch);
  }
  delete(id: string) { return this.repository.delete(id); }
  async importEvents(events: EventInput[]) {
    const existing = new Set((await this.getAll()).map(item => item.providerEventId).filter(Boolean));
    for (const event of events) {
      if (!event.providerEventId || existing.has(event.providerEventId)) continue;
      await this.save(event);
      existing.add(event.providerEventId);
    }
  }
}

/** Derived deadlines avoid stale duplicate events when a task is edited or completed. */
export function buildAgenda(events: CalendarEvent[], tasks: Task[], data: LifeCollections = emptyLifeCollections(), year = new Date().getFullYear()): AgendaItem[] {
  const records: AgendaItem[] = [];
  const add = (module: ModuleKey, id: string, title: string, date: string, endDate = date, detail = '') => records.push({ id: `${module}:${id}`, title, date, endDate, time: null, kind: 'record', sourceId: id, module, detail });
  data.bills.filter(item => !item.deletedAt && !['paid', 'cancelled'].includes(item.status)).forEach(item => add('bills', item.id, item.name, item.dueDate, item.dueDate, 'Payment due'));
  data.subscriptions.filter(item => !item.deletedAt && item.status === 'active').forEach(item => add('subscriptions', item.id, item.name, item.nextBillingDate, item.nextBillingDate, 'Subscription renewal'));
  data.trips.filter(item => !item.deletedAt && item.showInCalendar && item.status !== 'cancelled').forEach(item => add('trips', item.id, item.title, item.startDate, item.endDate, item.destination));
  data.importantDates.filter(item => !item.deletedAt).forEach(item => {
    // February 29 anniversaries are observed on February 28 in non-leap years.
    const suffix = item.date.slice(4);
    const leap = new Date(year, 1, 29).getMonth() === 1;
    const date = item.yearly ? `${year}${suffix === '-02-29' && !leap ? '-02-28' : suffix}` : item.date;
    add('importantDates', item.id, item.title, date, date, item.category);
  });
  return [
    ...records,
    ...events.filter(event => !event.deletedAt).map(event => ({ id: `event:${event.id}`, title: event.title,
      date: event.startDate, endDate: event.endDate, time: event.allDay ? null : event.startTime,
      kind: 'event' as const, sourceId: event.id, detail: event.location || event.category })),
    ...tasks.filter(task => isActiveTask(task) && task.dueDate).map(task => ({ id: `task:${task.id}`,
      title: task.title, date: task.dueDate!, endDate: task.dueDate!, time: task.dueTime,
      kind: 'task' as const, sourceId: task.id, detail: 'Task deadline' })),
  ].sort((a, b) => `${a.date}${a.time ?? ''}`.localeCompare(`${b.date}${b.time ?? ''}`));
}
export const agendaForDate = (items: AgendaItem[], date: DateOnly) => items.filter(item => item.date <= date && item.endDate >= date);
