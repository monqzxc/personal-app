import { useState } from 'react';
import { router } from 'expo-router';
import { AppHeader, Button, Chips, EmptyState, Field, Label, Screen } from '../../../components/common/ui';
import { useAppStore } from '../../../stores/useAppStore';
import { TaskCard } from '../components/TaskCard';
import { selectTasks, type TaskSort, type TaskView } from '../selectors';
import { useToday } from '../../../hooks/useToday';

export default function TasksScreen() {
  const tasks = useAppStore(state => state.tasks);
  const [view, setView] = useState<TaskView>('Today');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All categories');
  const [sort, setSort] = useState<TaskSort>('Due date');
  const today = useToday();
  const categories = ['All categories', ...new Set(tasks.map(task => task.category))];
  const visible = selectTasks(tasks, { view, search, category, sort }, today);
  return <Screen>
    <AppHeader title="Make room for focus." eyebrow="Your tasks" />
    <Button title="New task" icon="add" onPress={() => router.push('/task')} />
    <Field label="Search tasks" placeholder="Search titles, descriptions, or tags" value={search} onChangeText={setSearch} returnKeyType="search" />
    <Chips items={['Today', 'Upcoming', 'All', 'Completed', 'Overdue'] as const} value={view} onChange={setView} />
    {categories.length > 1 && <Chips items={categories} value={category} onChange={setCategory} />}
    <Chips items={['Due date', 'Priority', 'Newest'] as const} value={sort} onChange={setSort} />
    <Label muted size={12}>{visible.length} {visible.length === 1 ? 'TASK' : 'TASKS'} · {view.toUpperCase()}</Label>
    {visible.map(task => <TaskCard key={task.id} task={task} />)}
    {!visible.length && <EmptyState icon="checkmark-done-outline" title={search ? 'No matching tasks' : 'A little breathing room'} description={search ? 'Try a different search or category.' : view === 'Today' ? 'Nothing is due today. Add a task or explore your other views.' : 'Tasks in this view will appear here.'} />}
  </Screen>;
}
