import type { CalendarEvent, Task } from '../../types/models.ts';
import { addDays, dateOnly, localDate } from '../../utils/dates.ts';
import { isActiveTask, isOverdue } from '../tasks/selectors.ts';

export function weekDates(day: string): string[] {
  const start = addDays(day, -localDate(day).getDay());
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

const priority = { urgent: 0, high: 1, medium: 2, low: 3 };
export function dayTasks(tasks: Task[], day: string) {
  return tasks.filter(task => isActiveTask(task) && task.dueDate === day)
    .sort((a, b) => priority[a.priority] - priority[b.priority] || (a.dueTime ?? '24:00').localeCompare(b.dueTime ?? '24:00'));
}
export function overdueTasks(tasks: Task[], today: string) {
  return tasks.filter(task => isOverdue(task, today)).sort((a, b) => a.dueDate!.localeCompare(b.dueDate!) || priority[a.priority] - priority[b.priority]);
}

export function nextAppointment(events: CalendarEvent[], day: string, now: Date) {
  const today = dateOnly(now);
  if (day < today) return undefined;
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return events.filter(event => !event.deletedAt && !event.allDay && event.startDate <= day && event.endDate >= day
    && (day > today || event.endDate > today || (event.endTime ?? '') > time))
    .sort((a, b) => `${a.startDate}${a.startTime}`.localeCompare(`${b.startDate}${b.startTime}`))[0];
}
