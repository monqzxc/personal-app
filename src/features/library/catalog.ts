import type { ModuleKey } from '../../types/life.ts';
import { dateOnly } from '../../utils/dates.ts';

export type FieldType = 'text' | 'long' | 'number' | 'date' | 'month' | 'time' | 'url' | 'email' | 'choice' | 'boolean' | 'tags' | 'checklist' | 'reminder' | 'relation';
export interface FieldDefinition {
  key: string; label: string; type: FieldType; required?: boolean; options?: readonly string[];
  collection?: 'trips' | 'projects' | 'goals'; default?: unknown; min?: number; max?: number; hidden?: boolean;
}
export interface ModuleDefinition { title: string; singular: string; titleField: string; fields: FieldDefinition[] }
const f = (key: string, label: string, type: FieldType = 'text', extra: Omit<FieldDefinition, 'key' | 'label' | 'type'> = {}): FieldDefinition => ({ key, label, type, ...extra });
const name = f('name', 'Name', 'text', { required: true });
const title = f('title', 'Title', 'text', { required: true });
const notes = f('notes', 'Notes', 'long');
const category = f('category', 'Category', 'text', { default: 'Personal' });
const currency = f('currency', 'Currency', 'choice', { options: ['PHP', 'USD', 'EUR', 'JPY', 'GBP'], default: 'PHP' });
const amount = f('amount', 'Amount', 'number', { required: true, min: 0.01 });
const reminder = f('reminder', 'Reminder', 'reminder');
const relation = (key: string, label: string, collection: 'trips' | 'projects' | 'goals', required = false) => f(key, label, 'relation', { collection, required });
const choice = (key: string, label: string, options: readonly string[], defaultValue = options[0]) => f(key, label, 'choice', { options, default: defaultValue });
const date = (key: string, label: string, required = false) => f(key, label, 'date', { required });

export const modules: Record<ModuleKey, ModuleDefinition> = {
  transactions: { title: 'Transactions', singular: 'Transaction', titleField: 'description', fields: [f('description', 'Description', 'text', { required: true }), choice('type', 'Type', ['expense', 'income']), amount, currency, category, date('date', 'Date', true), f('paymentMethod', 'Payment method'), relation('tripId', 'Trip', 'trips'), f('billId', 'Bill ID', 'text', { hidden: true }), f('subscriptionId', 'Subscription ID', 'text', { hidden: true }), notes] },
  bills: { title: 'Bills & payments', singular: 'Payment', titleField: 'name', fields: [name, amount, currency, date('dueDate', 'Due date', true), category, choice('status', 'Status', ['upcoming', 'paid', 'overdue', 'cancelled']), f('isRecurring', 'Repeats', 'boolean'), choice('recurrence', 'Repeat every', ['monthly', 'yearly']), reminder, notes] },
  subscriptions: { title: 'Subscriptions', singular: 'Subscription', titleField: 'name', fields: [name, amount, currency, choice('billingCycle', 'Billing cycle', ['monthly', 'yearly', 'quarterly', 'weekly']), date('nextBillingDate', 'Next billing date', true), category, f('paymentMethod', 'Payment method'), choice('status', 'Status', ['active', 'paused', 'cancelled']), f('website', 'Website', 'url'), reminder, notes] },
  budgets: { title: 'Budgets', singular: 'Budget', titleField: 'name', fields: [name, category, f('month', 'Month', 'month', { required: true }), amount, currency] },
  savings: { title: 'Savings', singular: 'Savings fund', titleField: 'name', fields: [name, f('currentValue', 'Current savings', 'number', { min: 0 }), f('targetValue', 'Target savings', 'number', { min: 0.01 }), currency, notes] },
  trips: { title: 'Travel', singular: 'Trip', titleField: 'title', fields: [title, f('destination', 'Destination', 'text', { required: true }), date('startDate', 'Start date', true), date('endDate', 'End date', true), choice('status', 'Status', ['planning', 'booked', 'ongoing', 'completed', 'cancelled']), f('budget', 'Budget', 'number', { min: 0 }), currency, f('showInCalendar', 'Show in Calendar', 'boolean', { default: true }), reminder, notes] },
  tripItems: { title: 'Trip workspace', singular: 'Trip item', titleField: 'title', fields: [title, relation('tripId', 'Trip', 'trips', true), choice('kind', 'Kind', ['flight', 'hotel', 'place', 'itinerary', 'booking', 'packing', 'note', 'document']), date('date', 'Date'), f('time', 'Time', 'time'), f('location', 'Location'), f('url', 'Website or document link', 'url'), f('reference', 'Booking reference'), f('completed', 'Done / packed', 'boolean'), notes] },
  projects: { title: 'Projects', singular: 'Project', titleField: 'name', fields: [name, f('description', 'Description', 'long'), choice('status', 'Status', ['idea', 'planning', 'active', 'paused', 'completed', 'archived']), f('progress', 'Progress (%)', 'number', { min: 0, max: 100 }), f('technology', 'Technologies', 'tags'), f('repositoryUrl', 'Repository', 'url'), f('stagingUrl', 'Staging', 'url'), f('productionUrl', 'Production', 'url'), f('documentationUrl', 'Documentation', 'url'), date('startDate', 'Start date'), date('targetDate', 'Target date'), f('milestones', 'Milestones', 'checklist'), notes] },
  goals: { title: 'Goals', singular: 'Goal', titleField: 'title', fields: [title, f('description', 'Description', 'long'), category, f('targetValue', 'Target value', 'number', { min: 0.01, default: 100 }), f('currentValue', 'Current value', 'number', { min: 0 }), f('unit', 'Unit', 'text', { default: '%' }), f('progress', 'Manual progress (%)', 'number', { hidden: true, default: 0 }), choice('progressMode', 'Calculate progress from', ['manual', 'milestones', 'tasks']), date('startDate', 'Start date'), date('targetDate', 'Target date'), choice('status', 'Status', ['active', 'paused', 'completed', 'cancelled']), f('milestones', 'Milestones', 'checklist'), notes] },
  notes: { title: 'Notes', singular: 'Note', titleField: 'title', fields: [title, f('content', 'Content', 'long'), category, f('tags', 'Tags', 'tags'), f('favorite', 'Favorite', 'boolean'), relation('projectId', 'Project', 'projects'), relation('tripId', 'Trip', 'trips')] },
  bookmarks: { title: 'Bookmarks', singular: 'Bookmark', titleField: 'title', fields: [title, f('url', 'URL', 'url', { required: true }), f('description', 'Description', 'long'), category, f('tags', 'Tags', 'tags'), f('favorite', 'Favorite', 'boolean'), relation('projectId', 'Project', 'projects')] },
  accounts: { title: 'Account directory', singular: 'Account', titleField: 'serviceName', fields: [f('serviceName', 'Service name', 'text', { required: true }), f('username', 'Username'), f('email', 'Email', 'email'), f('website', 'Website', 'url'), category, f('twoFactorEnabled', 'Two-factor authentication enabled', 'boolean'), f('recoveryConfigured', 'Recovery configured', 'boolean'), notes] },
  inbox: { title: 'Inbox', singular: 'Capture', titleField: 'content', fields: [f('content', 'What’s on your mind?', 'long', { required: true }), f('processed', 'Processed', 'boolean', { hidden: true }), f('convertedType', 'Converted type', 'text', { hidden: true }), f('convertedEntityId', 'Converted ID', 'text', { hidden: true })] },
  importantDates: { title: 'Important dates', singular: 'Important date', titleField: 'title', fields: [title, date('date', 'Date', true), category, f('yearly', 'Every year', 'boolean'), reminder, notes] },
};
export const moduleKeys = Object.keys(modules) as ModuleKey[];
export const isModuleKey = (value: unknown): value is ModuleKey => typeof value === 'string' && Object.hasOwn(modules, value);
export function moduleDefaults(key: ModuleKey, selectedCurrency = 'PHP'): Record<string, unknown> {
  return Object.fromEntries(modules[key].fields.map(field => [field.key,
    field.key === 'currency' ? selectedCurrency : field.default !== undefined ? field.default :
      field.type === 'boolean' ? false : field.type === 'number' ? 0 : ['tags', 'checklist'].includes(field.type) ? [] :
        field.type === 'reminder' ? null : field.type === 'date' ? field.required ? dateOnly() : null :
          field.type === 'month' ? dateOnly().slice(0, 7) : field.type === 'choice' ? field.options?.[0] ?? '' : '',
  ]));
}
export const emptyLifeCollections = () => Object.fromEntries(moduleKeys.map(key => [key, []])) as unknown as import('../../types/life.ts').LifeCollections;
export function recordTitle(key: ModuleKey, record: object): string {
  return String((record as Record<string, unknown>)[modules[key].titleField] ?? 'Untitled');
}
