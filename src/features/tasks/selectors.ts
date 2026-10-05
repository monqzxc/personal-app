import type { Task } from '../../types/models.ts';
import { dateOnly } from '../../utils/dates.ts';

export type TaskView = 'Today' | 'Upcoming' | 'All' | 'Completed' | 'Overdue';
export type TaskSort = 'Due date' | 'Priority' | 'Newest';
export const isActiveTask = (task: Task) => !task.deletedAt && task.status !== 'completed' && task.status !== 'cancelled';
export const isOverdue = (task: Task, today = dateOnly()) => isActiveTask(task) && task.dueDate !== null && task.dueDate < today;
const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };

export function selectTasks(tasks: Task[], options: { view: TaskView; search: string; category: string; sort: TaskSort }, today = dateOnly()) {
  return tasks.filter(task => {
    if (task.deletedAt) return false;
    const query = options.search.trim().toLowerCase();
    if (!`${task.title} ${task.description} ${task.tags.join(' ')}`.toLowerCase().includes(query)) return false;
    if (options.category !== 'All categories' && task.category !== options.category) return false;
    switch (options.view) {
      case 'Today': return isActiveTask(task) && task.dueDate === today;
      case 'Upcoming': return isActiveTask(task) && task.dueDate !== null && task.dueDate > today;
      case 'Completed': return task.status === 'completed';
      case 'Overdue': return isOverdue(task, today);
      default: return true;
    }
  }).sort((a, b) => {
    if (options.sort === 'Priority') return priorityOrder[a.priority] - priorityOrder[b.priority];
    if (options.sort === 'Newest') return b.createdAt.localeCompare(a.createdAt);
    return `${a.dueDate ?? '9999'} ${a.dueTime ?? '23:59'}`.localeCompare(`${b.dueDate ?? '9999'} ${b.dueTime ?? '23:59'}`);
  });
}
