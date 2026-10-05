import type { LocalDatabase } from '../storage/localDatabase.ts';
import type { Bill, Subscription, Transaction } from '../types/life.ts';
import { newEntity } from '../services/entity.ts';
import { ensure } from '../services/validation.ts';
import { advanceDate } from '../utils/recurrence.ts';

export interface FinanceRepository {
  payBill(id: string, transactionId: string, nextBillId: string, paidDate: string): Promise<void>;
  renewSubscription(id: string, transactionId: string, paidDate: string): Promise<void>;
}
function expense(source: Bill | Subscription, id: string, date: string): Transaction {
  return { ...newEntity(id), type: 'expense', amount: source.amount, currency: source.currency,
    category: source.category, description: source.name, date, notes: '', tripId: '', billId: '', subscriptionId: '',
    paymentMethod: 'paymentMethod' in source ? source.paymentMethod : '' };
}
export class LocalFinanceRepository implements FinanceRepository {
  private db: LocalDatabase;
  constructor(db: LocalDatabase) { this.db = db; }
  payBill(id: string, transactionId: string, nextBillId: string, paidDate: string): Promise<void> {
    return this.db.mutate(data => {
      const bill = data.bills.find(item => item.id === id && !item.deletedAt);
      ensure(bill && !['paid', 'cancelled'].includes(bill.status), 'This bill is already paid, cancelled, or deleted.');
      data.transactions.push({ ...expense(bill, transactionId, paidDate), billId: id });
      if (bill.isRecurring) data.bills.push({ ...bill, ...newEntity(nextBillId), status: 'upcoming', dueDate: advanceDate(bill.dueDate, bill.recurrence), reminder: null });
      Object.assign(bill, { status: 'paid', updatedAt: new Date().toISOString(), version: bill.version + 1 });
    });
  }
  renewSubscription(id: string, transactionId: string, paidDate: string): Promise<void> {
    return this.db.mutate(data => {
      const subscription = data.subscriptions.find(item => item.id === id && !item.deletedAt);
      ensure(subscription?.status === 'active', 'Only active subscriptions can be renewed.');
      ensure(subscription.nextBillingDate <= paidDate, 'This renewal is not due yet.');
      data.transactions.push({ ...expense(subscription, transactionId, paidDate), subscriptionId: id });
      Object.assign(subscription, { nextBillingDate: advanceDate(subscription.nextBillingDate, subscription.billingCycle), reminder: null, updatedAt: new Date().toISOString(), version: subscription.version + 1 });
    });
  }
}
