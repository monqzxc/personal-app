import type { TaskRepository } from '../../repositories/contracts.ts';
import type { Task, TaskInput } from '../../types/models.ts';
import { newEntity } from '../../services/entity.ts';
import { ensure, validateTask } from '../../services/validation.ts';
import { advanceDate } from '../../utils/recurrence.ts';

export const emptyTask = (): TaskInput => ({
  title: '', description: '', category: 'Personal', priority: 'medium', status: 'pending',
  dueDate: null, dueTime: null, isRecurring: false, recurrence: null, tags: [], subtasks: [],
  notes: '', reminder: null, peopleIds: [],
});

export class TaskService {
  private repository: TaskRepository;
  private uuid: () => string;
  constructor(repository: TaskRepository, uuid: () => string) { this.repository = repository; this.uuid = uuid; }
  getAll() { return this.repository.getAll(); }
  async save(input: TaskInput, id?: string, inboxId?: string): Promise<Task> {
    const existing = id ? await this.repository.getById(id) : null;
    if (id) ensure(existing, 'This task no longer exists.');
    ensure(!input.isRecurring || input.dueDate, 'Recurring tasks need a due date.');
    ensure(id || !input.isRecurring || input.status !== 'completed', 'Create a recurring task as pending, then complete it to generate the next occurrence.');
    const task: Task = {
      ...(existing ?? newEntity(this.uuid())), ...input, title: input.title.trim(),
      category: input.category.trim() || 'Personal', tags: [...new Set(input.tags.map(tag => tag.trim()).filter(Boolean))],
      completedAt: input.status === 'completed' ? existing?.completedAt ?? new Date().toISOString() : null,
    };
    validateTask(task);
    if (!id) return this.repository.create(task, inboxId);
    if (task.status === 'completed' && existing?.status !== 'completed' && task.isRecurring && task.recurrence && task.dueDate && !existing?.nextOccurrenceId) {
      const next: Task = { ...task, ...newEntity(this.uuid()), title: task.title, status: 'pending', completedAt: null,
        dueDate: advanceDate(task.dueDate, task.recurrence.frequency, task.recurrence.interval),
        reminder: null, subtasks: task.subtasks.map(step => ({ ...step, id: this.uuid(), completed: false })) };
      delete next.nextOccurrenceId;
      return this.repository.completeWithNext(task, next);
    }
    const { id: _id, createdAt: _created, updatedAt: _updated, deletedAt: _deleted,
      version: _version, syncStatus: _sync, lastSyncedAt: _last, serverUpdatedAt: _server, ...patch } = task;
    return this.repository.update(id, patch);
  }
  async toggle(id: string) {
    const task = await this.repository.getById(id);
    ensure(task, 'This task no longer exists.');
    return this.save({ ...task, status: task.status === 'completed' ? 'pending' : 'completed' }, id);
  }
  delete(id: string) { return this.repository.delete(id); }
}
