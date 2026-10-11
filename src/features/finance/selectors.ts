import type { Budget, Debt, LifeCollections, Repayment, Subscription, Transaction, Trip, Wallet } from '../../types/life.ts';
import { dateOnly, isDateOnly } from '../../utils/dates.ts';

export const minorScale = (currency: string) => currency === 'JPY' ? 1 : 100;
export const minor = (amount: number, currency: string) => Math.round(amount * minorScale(currency));
export function money(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
}
export function monthlySubscription(subscription: Subscription) {
  const periods = { weekly: 52 / 12, monthly: 1, quarterly: 1 / 3, yearly: 1 / 12 };
  return subscription.amount * periods[subscription.billingCycle];
}
export const isMonth = (month: string) => /^\d{4}-\d{2}$/.test(month) && isDateOnly(`${month}-01`);
export const categoryKey = (category: string) => category.trim().toLocaleLowerCase();

export function walletBalance(wallet: Wallet, transactions: Transaction[], asOf = dateOnly(), lending: Pick<LifeCollections, 'debts' | 'repayments'> = { debts: [], repayments: [] }): number {
  let balance = minor(wallet.openingBalance, wallet.currency);
  for (const transaction of transactions) {
    if (transaction.deletedAt || transaction.currency !== wallet.currency || transaction.date > asOf) continue;
    const amount = minor(transaction.amount, wallet.currency);
    if (transaction.walletId === wallet.id) balance += transaction.type === 'income' ? amount : -amount;
    if (transaction.type === 'transfer' && transaction.toWalletId === wallet.id) balance += amount;
  }
  for (const debt of lending.debts) if (!debt.deletedAt && !debt.existingDebt && debt.walletId === wallet.id && debt.currency === wallet.currency && debt.date <= asOf) balance += (debt.direction === 'borrowed' ? 1 : -1) * minor(debt.amount, wallet.currency);
  const debts = new Map(lending.debts.filter(item => !item.deletedAt).map(item => [item.id, item]));
  for (const payment of lending.repayments) if (!payment.deletedAt && payment.walletId === wallet.id && payment.currency === wallet.currency && payment.date <= asOf) {
    const debt = debts.get(payment.debtId);
    if (debt) balance += (debt.direction === 'borrowed' ? -1 : 1) * minor(payment.amount, wallet.currency);
  }
  return balance / minorScale(wallet.currency);
}

export function debtProgress(debt: Debt, repayments: Repayment[], asOf = dateOnly()) {
  const amount = !debt.deletedAt && debt.date <= asOf ? minor(debt.amount, debt.currency) : 0;
  const paid = debt.deletedAt ? 0 : repayments.filter(item => !item.deletedAt && item.debtId === debt.id && item.currency === debt.currency && item.date <= asOf).reduce((sum, item) => sum + minor(item.amount, debt.currency), 0);
  const remaining = amount - paid;
  return { paid: paid / minorScale(debt.currency), remaining: remaining / minorScale(debt.currency), status: remaining === 0 ? 'Settled' : debt.dueDate && debt.dueDate < asOf ? 'Overdue' : paid > 0 ? 'Partly repaid' : 'Outstanding' };
}
export function owedTotal(data: LifeCollections, currency: string, personId?: string, asOf = dateOnly(), direction: Debt['direction'] = 'lent') {
  return data.debts.filter(item => !item.deletedAt && item.direction === direction && item.currency === currency && (!personId || item.personId === personId)).reduce((sum, item) => sum + minor(debtProgress(item, data.repayments, asOf).remaining, currency), 0) / minorScale(currency);
}
export function tripSpending(trip: Trip, data: LifeCollections, asOf = dateOnly()) {
  const categories = new Map<string, { name: string; amount: number }>();
  const collections = new Set(data.moneyCollections.filter(item => !item.deletedAt && item.tripId === trip.id).map(item => item.id));
  const belongsToTrip = (item: Transaction | Debt) => item.tripId === trip.id || collections.has(item.collectionId);
  let spent = 0;
  for (const item of data.transactions.filter(item => !item.deletedAt && belongsToTrip(item) && item.type === 'expense' && item.currency === trip.currency && item.date <= asOf)) {
    const value = minor(item.amount, trip.currency);
    spent += value;
    const key = categoryKey(item.category);
    const category = categories.get(key) ?? { name: item.category || 'Other', amount: 0 };
    category.amount += value;
    categories.set(key, category);
  }
  const debts = data.debts.filter(item => !item.deletedAt && item.direction === 'lent' && belongsToTrip(item) && item.currency === trip.currency && item.date <= asOf);
  const covered = debts.filter(item => !item.existingDebt).reduce((sum, item) => sum + minor(item.amount, trip.currency), 0);
  const owed = debts.reduce((sum, item) => sum + minor(debtProgress(item, data.repayments, asOf).remaining, trip.currency), 0);
  const scale = minorScale(trip.currency);
  return { spent: spent / scale, remaining: (minor(trip.budget, trip.currency) - spent) / scale, covered: covered / scale, owed: owed / scale,
    categories: [...categories.values()].map(item => ({ ...item, amount: item.amount / scale })).sort((a, b) => b.amount - a.amount) };
}

export function budgetProgress(budget: Budget, transactions: Transaction[], asOf = dateOnly()) {
  const spentMinor = transactions.filter(item => !item.deletedAt && item.type === 'expense' && item.currency === budget.currency && item.date.startsWith(budget.month) && item.date <= asOf && categoryKey(item.category) === categoryKey(budget.category))
    .reduce((total, item) => total + minor(item.amount, item.currency), 0);
  const limit = minor(budget.amount, budget.currency);
  const ratio = limit > 0 ? spentMinor / limit : 0;
  const level = ratio > 1 ? 'over' : ratio >= 1 ? 'limit' : ratio >= 0.8 ? 'near' : 'healthy';
  return { spent: spentMinor / minorScale(budget.currency), remaining: (limit - spentMinor) / minorScale(budget.currency), percent: Math.round(ratio * 100), level,
    alert: budget.alertsEnabled && ratio >= 0.8, barPercent: Math.min(100, Math.max(0, ratio * 100)) };
}

export interface TransactionFilters { month: string; type: 'all' | Transaction['type']; walletId: string; category: string; search: string; tripId?: string }
export function selectTransactions(transactions: Transaction[], filter: TransactionFilters) {
  if (filter.month && !isMonth(filter.month)) return [];
  const search = filter.search.trim().toLowerCase();
  return transactions.filter(item => !item.deletedAt && (!filter.month || item.date.startsWith(filter.month))
    && (filter.type === 'all' || item.type === filter.type)
    && (!filter.walletId || (filter.walletId === 'unassigned' ? !item.walletId : item.walletId === filter.walletId || item.toWalletId === filter.walletId))
    && (!filter.category || categoryKey(item.category) === categoryKey(filter.category))
    && (!filter.tripId || item.tripId === filter.tripId)
    && `${item.name} ${item.description} ${item.notes} ${item.category} ${item.paymentMethod}`.toLowerCase().includes(search))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}

export function financeSummary(data: LifeCollections, currency: string, month: string, asOf = dateOnly()) {
  const transactions = data.transactions.filter(item => !item.deletedAt && item.currency === currency && isMonth(month) && item.date.startsWith(month) && item.date <= asOf);
  const sum = (values: number[]) => values.reduce((total, value) => total + minor(value, currency), 0) / minorScale(currency);
  const income = sum(transactions.filter(item => item.type === 'income').map(item => item.amount));
  const expenses = sum(transactions.filter(item => item.type === 'expense').map(item => item.amount));
  const bills = sum(data.bills.filter(item => !item.deletedAt && item.currency === currency && isMonth(month) && item.dueDate.startsWith(month) && !['paid', 'cancelled'].includes(item.status)).map(item => item.amount));
  const expected = sum(data.expectedIncome.filter(item => !item.deletedAt && item.currency === currency && item.status === 'expected' && isMonth(month) && item.expectedDate.startsWith(month)).map(item => item.amount));
  const savings = sum(data.savings.filter(item => !item.deletedAt && item.currency === currency).map(item => item.currentValue));
  const categories = new Map<string, number>();
  for (const item of transactions.filter(item => item.type === 'expense')) categories.set(item.category, (categories.get(item.category) ?? 0) + minor(item.amount, currency));
  const wallets = data.wallets.filter(item => !item.deletedAt && item.currency === currency).map(wallet => ({ wallet, balance: walletBalance(wallet, data.transactions, asOf, data) }));
  const unassigned = data.transactions.filter(item => !item.deletedAt && item.currency === currency && !item.walletId && item.date <= asOf);
  const net = (minor(income, currency) - minor(expenses, currency)) / minorScale(currency);
  return { income, expenses, net, bills, expected, savings, wallets, walletTotal: sum(wallets.map(item => item.balance)), unassignedCount: unassigned.length,
    available: (minor(net, currency) - minor(bills, currency)) / minorScale(currency), categories: [...categories].map(([name, value]) => ({ name, amount: value / minorScale(currency) })).sort((a, b) => b.amount - a.amount) };
}
