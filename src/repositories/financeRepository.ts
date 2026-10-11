import type { LocalDatabase } from '../storage/localDatabase.ts';
import type { Bill, Subscription, Transaction } from '../types/life.ts';
import { newEntity } from '../services/entity.ts';
import { ensure } from '../services/validation.ts';
import { advanceDate } from '../utils/recurrence.ts';

export interface MoneyRecordSelection { module: 'transactions' | 'debts' | 'repayments'; id: string }
export interface NewMoneyCollection { id: string; name: string; tripId: string; peopleIds: string[]; notes: string }
export interface FinanceRepository {
  assignMoneyRecords(items: MoneyRecordSelection[], collectionId: string, newCollection?: NewMoneyCollection): Promise<void>;
  payBill(id: string, transactionId: string, nextBillId: string, paidDate: string): Promise<void>;
  renewSubscription(id: string, transactionId: string, paidDate: string): Promise<void>;
  receiveIncome(id: string, transactionId: string, receivedDate: string): Promise<void>;
}
function expense(source: Bill | Subscription, id: string, date: string): Transaction {
  return { ...newEntity(id), type: 'expense', amount: source.amount, currency: source.currency,
    category: source.category, name: source.name, description: source.name, personId: '', collectionId: '', date, notes: '', tripId: '', billId: '', subscriptionId: '', expectedIncomeId: '', walletId: source.walletId, toWalletId: '',
    paymentMethod: 'paymentMethod' in source ? source.paymentMethod : '' };
}
export class LocalFinanceRepository implements FinanceRepository {
  private db: LocalDatabase;
  constructor(db: LocalDatabase) { this.db = db; }
  assignMoneyRecords(items: MoneyRecordSelection[], collectionId: string, newCollection?: NewMoneyCollection): Promise<void> {
    return this.db.mutate(data => {
      ensure(items.length > 0, 'Select at least one money record.');
      const selected = new Set<string>();
      const records = items.map(item => {
        ensure(['transactions', 'debts', 'repayments'].includes(item.module), 'Choose an existing money record.');
        const key = `${item.module}:${item.id}`;
        ensure(!selected.has(key), 'A money record can only be selected once.');
        selected.add(key);
        const record = data[item.module].find(record => record.id === item.id && !record.deletedAt);
        ensure(record, 'A selected record no longer exists. Refresh and select it again.');
        return record;
      });
      if (newCollection) {
        ensure(!collectionId, 'Choose an existing collection or create a new one.');
        ensure(!data.moneyCollections.some(item => item.id === newCollection.id), 'This collection already exists.');
        data.moneyCollections.push({ ...newEntity(newCollection.id), ...newCollection });
        collectionId = newCollection.id;
      }
      ensure(!collectionId || data.moneyCollections.some(item => item.id === collectionId && !item.deletedAt), 'Choose an existing money collection.');
      const now = new Date().toISOString();
      for (const record of records) if (record.collectionId !== collectionId) {
        Object.assign(record, { collectionId, updatedAt: now, version: record.version + 1, syncStatus: 'local' });
      }
    });
  }
  payBill(id: string, transactionId: string, nextBillId: string, paidDate: string): Promise<void> {
    return this.db.mutate(data => {
      const bill = data.bills.find(item => item.id === id && !item.deletedAt);
      ensure(bill && !['paid', 'cancelled'].includes(bill.status), 'This bill is already paid, cancelled, or deleted.');
      ensure(!data.transactions.some(item => item.billId === id), 'A payment was already recorded for this bill. Edit the transaction to correct it.');
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
  receiveIncome(id: string, transactionId: string, receivedDate: string): Promise<void> {
    return this.db.mutate(data => {
      const plan = data.expectedIncome.find(item => item.id === id && !item.deletedAt);
      ensure(plan?.status === 'expected' && !data.transactions.some(item => item.expectedIncomeId === id), 'This income was already received, cancelled, or deleted.');
      data.transactions.push({ ...newEntity(transactionId), type: 'income', amount: plan.amount, currency: plan.currency,
        name: plan.name, description: plan.name, personId: '', collectionId: '', date: receivedDate, category: plan.category, walletId: plan.walletId, toWalletId: '',
        notes: '', paymentMethod: '', tripId: '', billId: '', subscriptionId: '', expectedIncomeId: id });
      Object.assign(plan, { status: 'received', updatedAt: new Date().toISOString(), version: plan.version + 1, syncStatus: 'local' });
    });
  }
}
