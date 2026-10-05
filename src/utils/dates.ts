import type { DateOnly } from '../types/models.ts';

export function dateOnly(date = new Date()): DateOnly {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function localDate(value: DateOnly): Date {
  const [year = 0, month = 1, day = 1] = value.split('-').map(Number);
  // Noon avoids daylight-saving transitions around midnight.
  const result = new Date(0);
  result.setFullYear(year, month - 1, day);
  result.setHours(12, 0, 0, 0);
  return result;
}

export function isDateOnly(value: unknown): value is DateOnly {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number(value.slice(0, 4)) >= 1 && dateOnly(localDate(value)) === value;
}

export function formatDate(value: DateOnly): string {
  return localDate(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function addDays(value: DateOnly, days: number): DateOnly {
  const date = localDate(value);
  date.setDate(date.getDate() + days);
  return dateOnly(date);
}

export function monthCells(month: DateOnly): (DateOnly | null)[] {
  const first = localDate(`${month.slice(0, 7)}-01`);
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells: (DateOnly | null)[] = Array.from({ length: first.getDay() }, () => null);
  for (let day = 1; day <= days; day++) cells.push(`${month.slice(0, 7)}-${String(day).padStart(2, '0')}`);
  while (cells.length % 7) cells.push(null);
  return cells;
}
