import { useCallback, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { AppHeader, Button, Chips, EmptyState, Field, Label, Screen } from '../../../components/common/ui';
import { useAppStore } from '../../../stores/useAppStore';
import { TaskCard } from '../components/TaskCard';
import { selectTasks, type TaskSort, type TaskView } from '../selectors';
import { useToday } from '../../../hooks/useToday';
import { isDateOnly, localDate } from '../../../utils/dates';

export default function TasksScreen() {
  const tasks = useAppStore(state => state.tasks);
  const params = useLocalSearchParams<{ date?: string; view?: string }>();
  const views = ['Today', 'Upcoming', 'All', 'Completed', 'Overdue'] as const;
  const requestedView = views.find(value => value === params.view);
  const [scopedDate, setScopedDate] = useState<string | null>(isDateOnly(params.date) ? params.date : null);
  const [view, setView] = useState<TaskView>(scopedDate ? 'All' : requestedView ?? 'Today');
  useFocusEffect(useCallback(() => {
    if (isDateOnly(params.date)) { setScopedDate(params.date); setView('All'); setSearch(''); setCategory('All categories'); router.setParams({ date: undefined, view: undefined }); }
    else if (requestedView) { setScopedDate(null); setView(requestedView); setSearch(''); setCategory('All categories'); router.setParams({ date: undefined, view: undefined }); }
  }, [params.date, requestedView]));
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All categories');
  const [sort, setSort] = useState<TaskSort>('Due date');
  const today = useToday();
  const categories = ['All categories', ...new Set(tasks.map(task => task.category))];
  const visible = selectTasks(tasks, { view, search, category, sort }, today).filter(task => !scopedDate || task.dueDate === scopedDate);
  return <Screen>
    <AppHeader title="Make room for focus." eyebrow="Your tasks" />
    <Button title="New task" icon="add" onPress={() => router.push({ pathname: '/task', params: scopedDate ? { date: scopedDate } : {} })} />
    <Field label="Search tasks" placeholder="Search titles, descriptions, or tags" value={search} onChangeText={setSearch} returnKeyType="search" />
    {scopedDate && <><Label bold>Due {localDate(scopedDate).toLocaleDateString(undefined, { dateStyle: 'full' })}</Label><Button title="Clear date filter" variant="ghost" onPress={() => setScopedDate(null)} /></>}
    <Chips items={views} value={view} onChange={value => { setView(value); setScopedDate(null); }} />
    {categories.length > 1 && <Chips items={categories} value={category} onChange={setCategory} />}
    <Chips items={['Due date', 'Priority', 'Newest'] as const} value={sort} onChange={setSort} />
    <Label muted size={12}>{visible.length} {visible.length === 1 ? 'TASK' : 'TASKS'} · {view.toUpperCase()}</Label>
    {visible.map(task => <TaskCard key={task.id} task={task} />)}
    {!visible.length && <EmptyState icon="checkmark-done-outline" title={search ? 'No matching tasks' : 'A little breathing room'} description={search ? 'Try a different search or category.' : view === 'Today' ? 'Nothing is due today. Add a task or explore your other views.' : 'Tasks in this view will appear here.'} />}
  </Screen>;
}
