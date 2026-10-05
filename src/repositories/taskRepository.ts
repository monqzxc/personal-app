import { LocalRepository } from './localRepository.ts';
import type { LocalDatabase } from '../storage/localDatabase.ts';
import type { TaskRepository } from './contracts.ts';
import type { Task } from '../types/models.ts';
import { ensure } from '../services/validation.ts';

export class LocalTaskRepository extends LocalRepository<'tasks'> implements TaskRepository {
  constructor(db: LocalDatabase) { super(db, 'tasks'); }
  completeWithNext(task: Task, next: Task): Promise<Task> {
    return this.db.mutate(data => {
      const previous = data.tasks.find(item => item.id === task.id && !item.deletedAt);
      ensure(previous && previous.version === task.version && !previous.nextOccurrenceId, 'Task changed. Reload before completing it again.');
      Object.assign(previous, task, { nextOccurrenceId: next.id, version: previous.version + 1, updatedAt: new Date().toISOString() });
      data.tasks.push(next);
      return previous;
    });
  }
}
