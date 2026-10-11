import type { LifeCollections } from './life.ts';
/** Calendar dates use YYYY-MM-DD; timestamps use full ISO 8601. */
export type DateOnly = string;
export type Timestamp = string;
export type SyncStatus = 'local' | 'pending' | 'synced' | 'conflict';

export interface Entity {
  id: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt: Timestamp | null;
  syncStatus: SyncStatus;
  version: number;
  lastSyncedAt?: Timestamp;
  serverUpdatedAt?: Timestamp;
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export interface Recurrence { frequency: 'daily' | 'weekly' | 'monthly'; interval: number }
export interface Reminder { at: Timestamp }
export interface Subtask { id: string; title: string; completed: boolean }
export interface Task extends Entity {
  peopleIds: string[];
  title: string;
  description: string;
  category: string;
  priority: Priority;
  status: TaskStatus;
  dueDate: DateOnly | null;
  dueTime: string | null;
  isRecurring: boolean;
  recurrence: Recurrence | null;
  tags: string[];
  subtasks: Subtask[];
  notes: string;
  reminder: Reminder | null;
  completedAt: Timestamp | null;
  goalId?: string;
  projectId?: string;
  nextOccurrenceId?: string;
}

export type RelatedEntityType = 'task' | 'bill' | 'trip' | 'subscription';
export interface CalendarEvent extends Entity {
  peopleIds: string[];
  title: string;
  description: string;
  startDate: DateOnly;
  endDate: DateOnly;
  startTime: string | null;
  endTime: string | null;
  allDay: boolean;
  location: string;
  category: string;
  reminder: Reminder | null;
  relatedEntityType: RelatedEntityType | null;
  relatedEntityId: string | null;
  providerEventId?: string;
}

export interface Settings {
  theme: 'light' | 'dark' | 'system';
  currency: string;
  name: string;
  notificationsEnabled: boolean;
  profilePhoto?: string;
}

export interface Database extends LifeCollections {
  schemaVersion: 6;
  tasks: Task[];
  events: CalendarEvent[];
  settings: Settings;
}

export type TaskInput = Omit<Task, keyof Entity | 'completedAt'>;
export type EventInput = Omit<CalendarEvent, keyof Entity>;
export type EntityPatch<T extends Entity> = Partial<Omit<T, keyof Entity>>;
