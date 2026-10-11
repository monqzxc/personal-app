import type { LifeCollections } from '../../types/life.ts';
import { addDays, dateOnly, localDate } from '../../utils/dates.ts';
import { budgetProgress, debtProgress, minor, minorScale, tripSpending } from '../finance/selectors.ts';

export function dashboardMoney(data: LifeCollections, currency: string, today = dateOnly()) {
  const spent = data.transactions.filter(item => !item.deletedAt && item.type === 'expense' && item.currency === currency && item.date === today)
    .reduce((sum, item) => sum + minor(item.amount, currency), 0) / minorScale(currency);
  const budgets = data.budgets.filter(item => !item.deletedAt && item.currency === currency && item.month === today.slice(0, 7))
    .map(budget => ({ budget, progress: budgetProgress(budget, data.transactions, today) }))
    .sort((a, b) => b.progress.percent - a.progress.percent || a.budget.name.localeCompare(b.budget.name));
  return { spent, budgets };
}

export interface UpcomingPayment {
  id: string; module: 'bills' | 'subscriptions' | 'debts'; name: string; kind: string;
  date: string; amount: number; currency: string;
}
export function comingPayments(data: LifeCollections, today = dateOnly()): UpcomingPayment[] {
  const through = addDays(today, 7);
  const payments: UpcomingPayment[] = [
    ...data.bills.filter(item => !item.deletedAt && !['paid', 'cancelled'].includes(item.status))
      .map(item => ({ id: item.id, module: 'bills' as const, name: item.name, kind: 'Bill', date: item.dueDate, amount: item.amount, currency: item.currency })),
    ...data.subscriptions.filter(item => !item.deletedAt && item.status === 'active')
      .map(item => ({ id: item.id, module: 'subscriptions' as const, name: item.name, kind: 'Subscription', date: item.nextBillingDate, amount: item.amount, currency: item.currency })),
    ...data.debts.filter(item => !item.deletedAt && item.direction === 'borrowed' && item.dueDate && item.date <= today)
      .map(item => ({ id: item.id, module: 'debts' as const, name: item.name, kind: 'I owe', date: item.dueDate!, amount: debtProgress(item, data.repayments, today).remaining, currency: item.currency })),
  ];
  return payments.filter(item => item.date <= through && item.amount > 0)
    .sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}

export function nextGetaway(data: LifeCollections, today = dateOnly()) {
  const trip = data.trips.filter(item => !item.deletedAt && !['completed', 'cancelled'].includes(item.status) && item.endDate >= today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.title.localeCompare(b.title))[0];
  if (!trip) return null;
  return { trip, days: Math.max(0, Math.round((localDate(trip.startDate).getTime() - localDate(today).getTime()) / 86400000)), spending: tripSpending(trip, data, today) };
}
