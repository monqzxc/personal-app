import type { CalendarEvent, Entity, EntityPatch, Settings, Task } from '../types/models.ts';

export interface Repository<T extends Entity> {
  getAll(): Promise<T[]>;
  getById(id: string): Promise<T | null>;
  create(entity: T, inboxId?: string): Promise<T>;
  update(id: string, patch: EntityPatch<T>): Promise<T>;
  /** Soft-delete: retain a tombstone for eventual synchronization. */
  delete(id: string): Promise<void>;
}
export interface TaskRepository extends Repository<Task> {
  completeWithNext(task: Task, next: Task): Promise<Task>;
}
export interface CalendarRepository extends Repository<CalendarEvent> {}
export interface SettingsRepository {
  get(): Promise<Settings>;
  update(patch: Partial<Settings>): Promise<Settings>;
}
