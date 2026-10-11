import { isProfilePhoto } from '../utils/profilePhoto.ts';
import type { CalendarEvent, Database, Entity, Settings, Task } from '../types/models.ts';
import { isDateOnly } from '../utils/dates.ts';
import { moduleKeys, modules } from '../features/library/catalog.ts';
import type { ModuleKey, ModuleRecord } from '../types/life.ts';

export function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function object(value: unknown): asserts value is Record<string, unknown> {
  ensure(value !== null && typeof value === 'object' && !Array.isArray(value), 'Invalid saved record.');
}
function text(value: unknown, label: string, required = false, limit = 10000) {
  ensure(typeof value === 'string' && value.length <= limit && (!required || value.trim().length > 0), `${label} ${required ? 'is required and' : ''} must be valid text (up to ${limit} characters).`);
}
function oneOf(value: unknown, options: readonly string[], label: string) {
  ensure(typeof value === 'string' && options.includes(value), `Invalid ${label}.`);
}
function timestamp(value: unknown) {
  ensure(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value)), 'Invalid timestamp.');
}
function uuid(value: unknown) {
  ensure(typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value), 'Invalid record ID.');
}
function peopleIds(value: unknown) {
  ensure(Array.isArray(value), 'Choose people from your saved list.');
  const ids = new Set<string>();
  for (const id of value) { uuid(id); ensure(!ids.has(String(id)), 'A person can only be included once.'); ids.add(String(id)); }
}
function time(value: unknown) {
  ensure(value === null || (typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)), 'Use a time in HH:mm format, such as 09:30.');
}
function reminder(value: unknown) {
  if (value === null) return;
  object(value);
  timestamp(value.at);
}
export function entity(value: unknown): asserts value is Entity & Record<string, unknown> {
  object(value);
  uuid(value.id);
  timestamp(value.createdAt);
  timestamp(value.updatedAt);
  if (value.deletedAt !== null) timestamp(value.deletedAt);
  oneOf(value.syncStatus, ['local', 'pending', 'synced', 'conflict'], 'sync status');
  ensure(Number.isInteger(value.version) && Number(value.version) >= 1, 'Invalid record version.');
  if (value.lastSyncedAt !== undefined) timestamp(value.lastSyncedAt);
  if (value.serverUpdatedAt !== undefined) timestamp(value.serverUpdatedAt);
}
export function validateTask(value: unknown): asserts value is Task {
  entity(value);
  text(value.title, 'Title', true, 200);
  peopleIds(value.peopleIds);
  for (const key of ['description', 'category', 'notes']) text(value[key], key);
  oneOf(value.status, ['pending', 'in_progress', 'completed', 'cancelled'], 'task status');
  oneOf(value.priority, ['low', 'medium', 'high', 'urgent'], 'priority');
  ensure(value.dueDate === null || isDateOnly(value.dueDate), 'Use a valid due date: YYYY-MM-DD.');
  time(value.dueTime);
  ensure(value.dueTime === null || value.dueDate !== null, 'Add a due date before adding a time.');
  ensure(typeof value.isRecurring === 'boolean', 'Invalid recurrence setting.');
  if (value.recurrence !== null) {
    object(value.recurrence);
    oneOf(value.recurrence.frequency, ['daily', 'weekly', 'monthly'], 'recurrence');
    ensure(Number.isInteger(value.recurrence.interval) && Number(value.recurrence.interval) > 0, 'Recurrence interval must be positive.');
  }
  ensure(value.isRecurring === (value.recurrence !== null), 'Recurring tasks need a recurrence rule.');
  ensure(Array.isArray(value.tags) && value.tags.every(tag => typeof tag === 'string'), 'Invalid tags.');
  ensure(Array.isArray(value.subtasks), 'Invalid subtasks.');
  const ids = new Set<string>();
  for (const subtask of value.subtasks) {
    object(subtask);
    uuid(subtask.id);
    text(subtask.title, 'Subtask', true, 200);
    ensure(typeof subtask.completed === 'boolean', 'Invalid subtask completion.');
    ensure(!ids.has(String(subtask.id)), 'Duplicate subtask ID.');
    ids.add(String(subtask.id));
  }
  reminder(value.reminder);
  if (value.completedAt !== null) timestamp(value.completedAt);
  ensure((value.status === 'completed') === (value.completedAt !== null), 'Task completion date does not match its status.');
  if (value.goalId !== undefined) uuid(value.goalId);
  if (value.projectId !== undefined) uuid(value.projectId);
  if (value.nextOccurrenceId !== undefined) uuid(value.nextOccurrenceId);
}
export function validateEvent(value: unknown): asserts value is CalendarEvent {
  entity(value);
  text(value.title, 'Title', true, 200);
  peopleIds(value.peopleIds);
  for (const key of ['description', 'category', 'location']) text(value[key], key);
  ensure(isDateOnly(value.startDate) && isDateOnly(value.endDate), 'Use valid dates: YYYY-MM-DD.');
  ensure(value.endDate >= value.startDate, 'End date must be on or after start date.');
  ensure(typeof value.allDay === 'boolean', 'Invalid all-day setting.');
  time(value.startTime);
  time(value.endTime);
  if (!value.allDay) {
    ensure(typeof value.startTime === 'string' && typeof value.endTime === 'string', 'Timed events need a start and end time.');
    ensure(`${value.endDate}T${value.endTime}` > `${value.startDate}T${value.startTime}`, 'End time must be after start time.');
  }
  reminder(value.reminder);
  if (value.relatedEntityType !== null) oneOf(value.relatedEntityType, ['task', 'bill', 'trip', 'subscription'], 'related entity');
  if (value.relatedEntityId !== null) uuid(value.relatedEntityId);
  ensure((value.relatedEntityType === null) === (value.relatedEntityId === null), 'Related records need both a type and an ID.');
}
export function validateSettings(value: unknown): asserts value is Settings {
  object(value);
  oneOf(value.theme, ['light', 'dark', 'system'], 'theme');
  ensure(typeof value.currency === 'string' && ['PHP', 'USD', 'EUR', 'JPY', 'GBP'].includes(value.currency), 'Choose a supported currency.');
  text(value.name, 'Name', false, 80);
  ensure(typeof value.notificationsEnabled === 'boolean', 'Invalid notification preference.');
  ensure(value.profilePhoto === undefined || value.profilePhoto === '' || isProfilePhoto(value.profilePhoto), 'Profile photo must be a small JPEG image. Choose it again in Settings.');
}
export function validateModule<K extends ModuleKey>(key: K, value: unknown): asserts value is ModuleRecord<K> {
  entity(value);
  for (const field of modules[key].fields) {
    const item = value[field.key];
    switch (field.type) {
      case 'number':
        ensure(typeof item === 'number' && Number.isFinite(item) && item >= (field.min ?? 0) && item <= (field.max ?? 1e12), `${field.label} must be a valid number between ${field.min ?? 0} and ${field.max ?? '1 trillion'}.`); break;
      case 'date': ensure((!field.required && item === null) || isDateOnly(item), `${field.label} must be a valid YYYY-MM-DD date.`); break;
      case 'month': ensure(typeof item === 'string' && isDateOnly(`${item}-01`), 'Use a valid month: YYYY-MM.'); break;
      case 'time': ensure(item === '' || (typeof item === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(item)), 'Use a valid time: HH:mm.'); break;
      case 'boolean': ensure(typeof item === 'boolean', `Invalid ${field.label}.`); break;
      case 'choice': oneOf(item, field.options ?? [], field.label); break;
      case 'tags': ensure(Array.isArray(item) && item.length <= 100 && item.every(tag => typeof tag === 'string' && tag.length <= 200), 'Use up to 100 short tags.'); break;
      case 'checklist': {
        ensure(Array.isArray(item) && item.length <= 200, 'Use up to 200 milestones.');
        const ids = new Set<string>();
        for (const step of item) { object(step); uuid(step.id); text(step.title, 'Milestone', true, 200); ensure(typeof step.completed === 'boolean', 'Invalid milestone status.'); ensure(!ids.has(String(step.id)), 'Duplicate milestone.'); ids.add(String(step.id)); }
        break;
      }
      case 'people': peopleIds(item); break;
      case 'reminder': reminder(item); break;
      case 'route': {
        ensure(Array.isArray(item) && item.length <= 20000, 'Invalid or oversized GPS route.');
        let previousTime = 0;
        let previousSegment = 0;
        for (const point of item) {
          object(point);
          for (const key of ['latitude', 'longitude', 'timestamp', 'accuracy', 'segment']) ensure(typeof point[key] === 'number' && Number.isFinite(point[key]), 'Invalid GPS coordinate.');
          ensure(Math.abs(Number(point.latitude)) <= 90 && Math.abs(Number(point.longitude)) <= 180 && Number(point.accuracy) >= 0 && Number(point.accuracy) <= 35, 'Invalid GPS position or accuracy.');
          ensure(Number(point.timestamp) > previousTime && Number.isInteger(point.segment) && Number(point.segment) >= previousSegment, 'GPS route must be ordered.');
          previousTime = Number(point.timestamp); previousSegment = Number(point.segment);
        }
        break;
      }
      case 'relation': ensure(!field.required || item !== '', `Choose ${field.label}.`); if (item !== '') uuid(item); break;
      default:
        text(item, field.label, field.required, field.type === 'long' ? 100000 : 2000);
        if (field.type === 'url' && item) {
          try { const parsed = new URL(String(item)); ensure(['https:', 'http:'].includes(parsed.protocol) && !parsed.username && !parsed.password, ''); }
          catch { throw new Error(`${field.label} must be an http:// or https:// URL without embedded credentials.`); }
        }
        if (field.type === 'email' && item) ensure(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(item)), 'Enter a valid email address.');
    }
  }
  if (key === 'accounts') ensure(!Object.keys(value).some(name => /password|secret|token|recoveryCode/i.test(name)), 'Passwords, tokens, and recovery codes must not be stored in the account directory.');
  if (key === 'activities') {
    if (value.taskId) uuid(value.taskId);
    ensure(Number.isInteger(value.segment), 'Invalid route segment.');
    ensure((value.status === 'recording') === (Number(value.resumedAt) > 0), 'Invalid recording timer.');
    if (value.source === 'manual') ensure(value.status === 'completed' && (value.route as unknown[]).length === 0 && value.elapsedMs === 0 && value.resumedAt === 0 && value.segment === 0 && Number(value.durationMinutes) > 0, 'Manual activities need a positive duration and no GPS data.');
  }
  if (typeof value.currency === 'string') {
    const scale = value.currency === 'JPY' ? 1 : 100;
    for (const field of ['amount', 'budget', 'currentValue', 'targetValue', 'openingBalance']) if (typeof value[field] === 'number') {
      const scaled = value[field] * scale;
      ensure(Math.abs(scaled - Math.round(scaled)) < 0.00001, `${field} supports ${scale === 1 ? 'whole amounts' : 'up to 2 decimal places'} in ${value.currency}.`);
    }
  }
  if (key === 'transactions') {
    if (value.type === 'transfer') {
      ensure(value.walletId && value.toWalletId && value.walletId !== value.toWalletId, 'Transfers need two different wallets.');
      ensure(!value.billId && !value.subscriptionId && !value.expectedIncomeId, 'A payment or receipt cannot be changed into a transfer.');
    } else ensure(value.toWalletId === '', 'Only transfers can have a destination wallet.');
    ensure(!value.expectedIncomeId || value.type === 'income', 'An expected-income receipt must stay an income transaction.');
    ensure((!value.billId && !value.subscriptionId) || value.type === 'expense', 'A bill payment or renewal must stay an expense.');
  }
  if (key === 'debts') {
    ensure(value.existingDebt ? value.walletId === '' : Boolean(value.walletId), 'Choose a wallet for new lending or borrowing; existing debts must not move money in a wallet.');
    ensure(value.dueDate === null || String(value.dueDate) >= String(value.date), 'Due date cannot precede the debt date.');
  }
  if (value.startDate && (value.endDate || value.targetDate)) ensure(String(value.endDate || value.targetDate) >= String(value.startDate), 'End / target date must not precede start date.');
  if (key === 'inbox') {
    ensure(value.processed === Boolean(value.convertedType && value.convertedEntityId), 'Inbox conversion metadata is incomplete.');
    if (value.processed) { uuid(value.convertedEntityId); ensure(['tasks', 'events', ...moduleKeys].includes(String(value.convertedType)), 'Invalid converted record type.'); }
  }
}
export function validateDatabase(value: unknown): asserts value is Database {
  object(value);
  ensure(value.schemaVersion === 6, 'Unsupported data version. Update the app to open this data.');
  ensure(Array.isArray(value.tasks) && Array.isArray(value.events), 'Saved collections are invalid.');
  for (const [records, validate] of [[value.tasks, validateTask], [value.events, validateEvent]] as const) {
    const ids = new Set<string>();
    for (const record of records) {
      validate(record);
      ensure(!ids.has(record.id), 'Duplicate record ID in saved data.');
      ids.add(record.id);
    }
  }
  validateSettings(value.settings);
  for (const key of moduleKeys) {
    const records: unknown = value[key];
    ensure(Array.isArray(records), `Saved ${key} collection is invalid.`);
    const ids = new Set<string>();
    for (const record of records) { validateModule(key, record); ensure(!ids.has(record.id), `Duplicate ${key} ID.`); ids.add(record.id); }
  }
  const data = value as unknown as Database;
  ensure(data.activities.filter(item => !item.deletedAt && item.status !== 'completed').length <= 1, 'Finish the active workout before starting another.');
  const wallets = new Map(data.wallets.filter(wallet => !wallet.deletedAt).map(wallet => [wallet.id, wallet]));
  for (const record of [...data.transactions, ...data.bills, ...data.subscriptions, ...data.expectedIncome, ...data.debts, ...data.repayments].filter(record => !record.deletedAt)) {
    for (const id of [record.walletId, 'toWalletId' in record ? record.toWalletId : '']) if (id) {
      const wallet = wallets.get(id);
      ensure(wallet, 'A wallet is still linked to financial records. Keep it or reassign those records first.');
      ensure(wallet.currency === record.currency, 'Wallet and transaction currencies must match. Currency conversion is not supported.');
    }
  }
  const people = new Set(data.people.filter(item => !item.deletedAt).map(item => item.id));
  for (const record of [...data.tasks, ...data.events, ...moduleKeys.flatMap<ModuleRecord>(key => data[key])].filter(item => !item.deletedAt)) {
    const linked = 'peopleIds' in record ? record.peopleIds : 'personId' in record && typeof record.personId === 'string' && record.personId ? [record.personId] : [];
    for (const id of linked) ensure(people.has(id), 'A person is still linked to records. Keep the person or remove those links first.');
  }
  const collections = new Map(data.moneyCollections.filter(item => !item.deletedAt).map(item => [item.id, item]));
  for (const collection of collections.values()) if (collection.tripId) {
    ensure(data.trips.some(trip => !trip.deletedAt && trip.id === collection.tripId), 'A trip is still linked to a money collection. Keep it or remove that link first.');
  }
  for (const record of [...data.transactions, ...data.debts, ...data.repayments].filter(item => !item.deletedAt)) if (record.collectionId) {
    const collection = collections.get(record.collectionId);
    ensure(collection, 'A money collection is still linked to records. Keep it or remove those links first.');
    if ('tripId' in record && record.tripId && collection.tripId) ensure(record.tripId === collection.tripId, 'This record already belongs to another trip. Remove its trip link before moving it to this collection.');
  }
  const debts = new Map(data.debts.filter(item => !item.deletedAt).map(item => [item.id, item]));
  const paid = new Map<string, number>();
  for (const payment of data.repayments.filter(item => !item.deletedAt)) {
    const debt = debts.get(payment.debtId);
    ensure(debt, 'This debt has repayments. Remove or reassign them before deleting the debt.');
    ensure(payment.currency === debt.currency, 'Repayment and debt currencies must match.');
    ensure(payment.date >= debt.date, 'Repayment date cannot precede the debt date.');
    const scale = payment.currency === 'JPY' ? 1 : 100;
    const total = (paid.get(debt.id) ?? 0) + Math.round(payment.amount * scale);
    ensure(total <= Math.round(debt.amount * scale), 'Repayments cannot exceed the amount owed.');
    paid.set(debt.id, total);
  }
}
