import type { LifeCollections } from '../../types/life.ts';
import { isDateOnly } from '../../utils/dates.ts';
import { minor, minorScale } from './selectors.ts';

export type MoneyModule = 'transactions' | 'debts' | 'repayments';
export interface MoneyItem {
  module: MoneyModule; id: string; key: string; name: string; description: string;
  date: string; createdAt: string; amount: number; currency: string; personId: string;
  collectionId: string; tripId: string; kind: string;
}
export interface ExpenseFilters {
  search: string; from: string; to: string; personId: string; collectionId: string;
  allActivity: boolean; tripId?: string;
}

export function quickExpenseAmount(input: string, currency: string): number | null {
  const text = input.trim();
  if (!/^\d+(?:\.\d+)?$/.test(text)) return null;
  const amount = Number(text);
  const scaled = amount * minorScale(currency);
  return Number.isFinite(amount) && amount > 0 && amount <= 1e12 && Math.abs(scaled - Math.round(scaled)) < 0.00001 ? amount : null;
}

export function validExpenseDates(from: string, to: string) {
  return (!from || isDateOnly(from)) && (!to || isDateOnly(to)) && (!from || !to || from <= to);
}

export function moneyActivity(data: LifeCollections): MoneyItem[] {
  const collections = new Map(data.moneyCollections.filter(item => !item.deletedAt).map(item => [item.id, item]));
  const debts = new Map(data.debts.filter(item => !item.deletedAt).map(item => [item.id, item]));
  return (['transactions', 'debts', 'repayments'] as const).flatMap(module => data[module].filter(item => !item.deletedAt).map(item => {
    const debt = 'debtId' in item ? debts.get(item.debtId) : undefined;
    const collectionId = item.collectionId;
    const ownTrip = collections.get(collectionId)?.tripId ?? '';
    const tripId = 'tripId' in item ? item.tripId || ownTrip : ownTrip || debt?.tripId || collections.get(debt?.collectionId ?? '')?.tripId || '';
    return {
      module, id: item.id, key: `${module}:${item.id}`, name: item.name,
      description: 'description' in item ? item.description : item.notes,
      date: item.date, createdAt: item.createdAt, amount: item.amount, currency: item.currency,
      personId: 'personId' in item ? item.personId : debt?.personId ?? '',
      collectionId, tripId,
      kind: 'type' in item ? item.type === 'expense' ? 'Expense' : item.type === 'income' ? 'Income' : 'Transfer'
        : 'direction' in item ? item.direction === 'borrowed' ? 'Borrowed' : 'Lent'
          : debt?.direction === 'borrowed' ? 'Repayment paid' : 'Repayment received',
    };
  }));
}

export function selectMoneyActivity(data: LifeCollections, filter: ExpenseFilters): MoneyItem[] {
  if (!validExpenseDates(filter.from, filter.to)) return [];
  const search = filter.search.trim().toLocaleLowerCase();
  return moneyActivity(data).filter(item => (filter.allActivity || item.kind === 'Expense')
    && (!filter.from || item.date >= filter.from) && (!filter.to || item.date <= filter.to)
    && (!filter.personId || (filter.personId === 'unassigned' ? !item.personId : item.personId === filter.personId))
    && (!filter.collectionId || (filter.collectionId === 'unassigned' ? !item.collectionId : item.collectionId === filter.collectionId))
    && (!filter.tripId || item.tripId === filter.tripId)
    && `${item.name} ${item.description}`.toLocaleLowerCase().includes(search))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt) || a.key.localeCompare(b.key));
}

export function moneyActivityTotals(items: MoneyItem[]) {
  const totals = new Map<string, { kind: string; currency: string; amount: number }>();
  for (const item of items) {
    const key = `${item.kind}:${item.currency}`;
    const total = totals.get(key) ?? { kind: item.kind, currency: item.currency, amount: 0 };
    total.amount += minor(item.amount, item.currency);
    totals.set(key, total);
  }
  return [...totals.values()].map(total => ({ ...total, amount: total.amount / minorScale(total.currency) }));
}

export function groupMoneyByDate(items: MoneyItem[]) {
  const groups = new Map<string, MoneyItem[]>();
  for (const item of items) {
    const group = groups.get(item.date) ?? [];
    group.push(item);
    groups.set(item.date, group);
  }
  return [...groups.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([date, records]) => ({ date, items: records, totals: moneyActivityTotals(records) }));
}

export function toggleMoneySelection(selected: string[], items: MoneyItem[]) {
  const keys = new Set(items.map(item => item.key));
  return items.every(item => selected.includes(item.key)) ? selected.filter(key => !keys.has(key)) : [...new Set([...selected, ...keys])];
}
