import { View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Label, SectionHeader, layout } from '../../components/common/ui';
import { useAppStore } from '../../stores/useAppStore';
import { moduleKeys } from './catalog';
import { RecordCard } from './RecordCard';
import { TaskCard } from '../tasks/components/TaskCard';
import { LendingWorkspace } from '../finance/LendingWorkspace';

export function PersonWorkspace({ personId }: { personId: string }) {
  const data = useAppStore(state => state.data);
  const allTasks = useAppStore(state => state.tasks);
  const allEvents = useAppStore(state => state.events);
  const tasks = allTasks.filter(item => item.peopleIds.includes(personId));
  const events = allEvents.filter(item => item.peopleIds.includes(personId));
  const linked = moduleKeys.flatMap(module => data[module].filter(record => 'peopleIds' in record && record.peopleIds.includes(personId)).map(record => ({ module, record })));
  return <View style={layout.stack}>
    <Card><SectionHeader title="Plans together" /><Label muted>Link this person to tasks, schedules, trips, projects, goals, notes, activities, and collections.</Label>
      <View style={layout.wrap}><Button title="Add task" variant="secondary" onPress={() => router.push({ pathname: '/task', params: { personId } })} /><Button title="Schedule event" variant="secondary" onPress={() => router.push({ pathname: '/event', params: { personId } })} />
        {([{ module: 'trips', title: 'Plan a trip' }, { module: 'projects', title: 'Plan a project' }, { module: 'notes', title: 'Add a note' }] as const).map(item => <Button key={item.module} title={item.title} variant="secondary" onPress={() => router.push({ pathname: '/record', params: { module: item.module, parentId: personId, parentType: 'person' } })} />)}
      </View>
      <Button title="Expenses involving this person" variant="secondary" onPress={() => router.push({ pathname: '/expenses', params: { personId } })} />
      <Button title="Quick expense with this person" variant="ghost" onPress={() => router.push({ pathname: '/quick-expense', params: { personId } })} />
    </Card>
    {tasks.map(task => <TaskCard key={task.id} task={task} />)}
    {events.map(event => <Card key={event.id}><Label bold>{event.title}</Label><Label muted>{event.startDate}{event.startTime ? ` · ${event.startTime}` : ''}</Label><Button title="Open event" variant="ghost" onPress={() => router.push({ pathname: '/event', params: { id: event.id } })} /></Card>)}
    {linked.map(({ module, record }) => <RecordCard key={`${module}:${record.id}`} module={module} record={record} />)}
    {!tasks.length && !events.length && !linked.length && <Label muted>No linked plans yet. You can also add people while editing an existing plan.</Label>}
    <LendingWorkspace personId={personId} />
  </View>;
}
