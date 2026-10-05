import type { Goal } from '../../types/life.ts';
import type { Task } from '../../types/models.ts';

export function goalProgress(goal: Goal, tasks: Task[]): number {
  if (goal.progressMode === 'milestones') return goal.milestones.length ? goal.milestones.filter(item => item.completed).length / goal.milestones.length * 100 : 0;
  if (goal.progressMode === 'tasks') {
    const linked = tasks.filter(task => !task.deletedAt && task.goalId === goal.id && task.status !== 'cancelled');
    return linked.length ? linked.filter(task => task.status === 'completed').length / linked.length * 100 : 0;
  }
  return Math.min(100, Math.max(0, goal.currentValue / goal.targetValue * 100));
}
