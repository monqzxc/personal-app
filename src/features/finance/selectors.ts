import type { LifeCollections, Subscription } from '../../types/life.ts';

export const minorScale = (currency: string) => currency === 'JPY' ? 1 : 100;
export const minor = (amount: number, currency: string) => Math.round(amount * minorScale(currency));
export function money(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
}
export function monthlySubscription(subscription: Subscription) {
  const periods = { weekly: 52 / 12, monthly: 1, quarterly: 1 / 3, yearly: 1 / 12 };
  return subscription.amount * periods[subscription.billingCycle];
}
export function financeSummary(data: LifeCollections, currency: string, month: string) {
  const transactions = data.transactions.filter(item => !item.deletedAt && item.currency === currency && item.date.startsWith(month));
  const sum = (values: number[]) => values.reduce((total, value) => total + minor(value, currency), 0) / minorScale(currency);
  const income = sum(transactions.filter(item => item.type === 'income').map(item => item.amount));
  const expenses = sum(transactions.filter(item => item.type === 'expense').map(item => item.amount));
  const bills = sum(data.bills.filter(item => !item.deletedAt && item.currency === currency && item.dueDate.startsWith(month) && !['paid', 'cancelled'].includes(item.status)).map(item => item.amount));
  const savings = sum(data.savings.filter(item => !item.deletedAt && item.currency === currency).map(item => item.currentValue));
  const categories = new Map<string, number>();
  for (const item of transactions.filter(item => item.type === 'expense')) categories.set(item.category, (categories.get(item.category) ?? 0) + minor(item.amount, currency));
  return { income, expenses, bills, savings, available: (minor(income, currency) - minor(expenses, currency) - minor(bills, currency)) / minorScale(currency), categories: [...categories].map(([name, value]) => ({ name, amount: value / minorScale(currency) })).sort((a, b) => b.amount - a.amount) };
}
