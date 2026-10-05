import type { Entity, DateOnly, Reminder, Subtask } from './models.ts';

export interface Transaction extends Entity {
  type: 'income' | 'expense'; amount: number; currency: string; category: string;
  description: string; date: DateOnly; paymentMethod: string; notes: string;
  tripId: string; billId: string; subscriptionId: string;
}
export interface Bill extends Entity {
  name: string; amount: number; currency: string; dueDate: DateOnly; category: string;
  status: 'upcoming' | 'paid' | 'overdue' | 'cancelled'; isRecurring: boolean;
  recurrence: 'monthly' | 'yearly'; reminder: Reminder | null; notes: string;
}
export interface Subscription extends Entity {
  name: string; amount: number; currency: string; billingCycle: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  nextBillingDate: DateOnly; category: string; paymentMethod: string; status: 'active' | 'paused' | 'cancelled';
  website: string; notes: string; reminder: Reminder | null;
}
export interface Budget extends Entity { name: string; category: string; month: string; amount: number; currency: string }
export interface Saving extends Entity { name: string; currentValue: number; targetValue: number; currency: string; notes: string }
export interface Trip extends Entity {
  title: string; destination: string; startDate: DateOnly; endDate: DateOnly;
  status: 'planning' | 'booked' | 'ongoing' | 'completed' | 'cancelled'; budget: number; currency: string;
  notes: string; showInCalendar: boolean; reminder: Reminder | null;
}
export interface TripItem extends Entity {
  tripId: string; title: string; kind: 'flight' | 'hotel' | 'place' | 'itinerary' | 'booking' | 'packing' | 'note' | 'document';
  date: DateOnly | null; time: string; location: string; url: string; reference: string; notes: string; completed: boolean;
}
export interface Project extends Entity {
  name: string; description: string; status: 'idea' | 'planning' | 'active' | 'paused' | 'completed' | 'archived';
  progress: number; technology: string[]; repositoryUrl: string; stagingUrl: string; productionUrl: string;
  documentationUrl: string; startDate: DateOnly | null; targetDate: DateOnly | null; notes: string; milestones: Subtask[];
}
export interface Goal extends Entity {
  title: string; description: string; category: string; targetValue: number; currentValue: number; unit: string;
  progress: number; progressMode: 'manual' | 'milestones' | 'tasks'; startDate: DateOnly | null; targetDate: DateOnly | null;
  status: 'active' | 'paused' | 'completed' | 'cancelled'; milestones: Subtask[]; notes: string;
}
export interface Note extends Entity { title: string; content: string; category: string; tags: string[]; favorite: boolean; projectId: string; tripId: string }
export interface Bookmark extends Entity { title: string; url: string; description: string; category: string; tags: string[]; favorite: boolean; projectId: string }
export interface Account extends Entity {
  serviceName: string; username: string; email: string; website: string; category: string;
  twoFactorEnabled: boolean; recoveryConfigured: boolean; notes: string;
}
export interface InboxItem extends Entity { content: string; processed: boolean; convertedType: string; convertedEntityId: string }
export interface ImportantDate extends Entity { title: string; date: DateOnly; category: string; yearly: boolean; notes: string; reminder: Reminder | null }
export interface LifeCollections {
  transactions: Transaction[]; bills: Bill[]; subscriptions: Subscription[]; budgets: Budget[]; savings: Saving[];
  trips: Trip[]; tripItems: TripItem[]; projects: Project[]; goals: Goal[]; notes: Note[]; bookmarks: Bookmark[];
  accounts: Account[]; inbox: InboxItem[]; importantDates: ImportantDate[];
}
export type ModuleKey = keyof LifeCollections;
export type ModuleRecord<K extends ModuleKey = ModuleKey> = LifeCollections[K][number];
