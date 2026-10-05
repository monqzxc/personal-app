import type { Recurrence } from '../types/models.ts';
import { addDays, dateOnly, localDate } from './dates.ts';

export function advanceDate(value: string, frequency: Recurrence['frequency'] | 'yearly' | 'quarterly', interval = 1): string {
  if (frequency === 'daily' || frequency === 'weekly') return addDays(value, interval * (frequency === 'weekly' ? 7 : 1));
  const date = localDate(value);
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + interval * (frequency === 'yearly' ? 12 : frequency === 'quarterly' ? 3 : 1));
  date.setDate(Math.min(day, new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()));
  return dateOnly(date);
}
