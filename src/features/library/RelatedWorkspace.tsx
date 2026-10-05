import { View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Label, SectionHeader, layout } from '../../components/common/ui';
import { useAppStore } from '../../stores/useAppStore';
import type { ModuleKey, ModuleRecord } from '../../types/life';
import { TaskCard } from '../tasks/components/TaskCard';
import { goalProgress } from '../goals/progress';
import { money } from '../finance/selectors';

export function RelatedWorkspace({ module, record }: { module: ModuleKey; record: ModuleRecord }) {
  const data = useAppStore(state => state.data);
  const tasks = useAppStore(state => state.tasks);
  const id = record.id;
  if (module === 'trips') {
    const trip = data.trips.find(item => item.id === id)!;
    const spent = data.transactions.filter(item => item.tripId === id && item.type === 'expense' && item.currency === trip.currency).reduce((sum, item) => sum + item.amount, 0);
    const groups = ['flight', 'hotel', 'place', 'itinerary', 'booking', 'packing', 'note', 'document'];
    return <Card><SectionHeader title="Trip workspace" /><Label>{money(spent, trip.currency)} spent of {money(trip.budget, trip.currency)} budget</Label>
      <Label muted size={12}>Expenses in other currencies are kept separate. Document entries store links.</Label>
      <View style={layout.wrap}>{groups.map(kind => <Button key={kind} title={`Add ${kind} (${data.tripItems.filter(item => item.tripId === id && item.kind === kind).length})`} variant="secondary" onPress={() => router.push({ pathname: '/record', params: { module: 'tripItems', parentId: id, kind } })} />)}</View>
      <Button title="View all trip items" variant="ghost" onPress={() => router.push({ pathname: '/module', params: { module: 'tripItems', parentId: id } })} />
      <Button title="Add trip expense" variant="secondary" onPress={() => router.push({ pathname: '/record', params: { module: 'transactions', parentId: id } })} />
      <Button title="View trip expenses" variant="ghost" onPress={() => router.push({ pathname: '/module', params: { module: 'transactions', parentId: id } })} />
      <Button title="Trip notes" variant="ghost" onPress={() => router.push({ pathname: '/module', params: { module: 'notes', parentId: id } })} />
    </Card>;
  }
  if (module === 'projects' || module === 'goals') {
    const linked = tasks.filter(task => module === 'projects' ? task.projectId === id : task.goalId === id);
    const goal = module === 'goals' ? data.goals.find(item => item.id === id) : undefined;
    return <View style={layout.stack}><SectionHeader title={goal ? 'Goal progress' : 'Project workspace'} />
      {goal && <Label bold>{Math.round(goalProgress(goal, tasks))}% complete · {goal.progressMode}</Label>}
      <Label muted>{linked.filter(task => task.status === 'completed').length} of {linked.length} tasks completed</Label>
      <Button title="Add linked task" variant="secondary" onPress={() => router.push({ pathname: '/task', params: { [module === 'projects' ? 'projectId' : 'goalId']: id } })} />
      {linked.map(task => <TaskCard key={task.id} task={task} />)}
      {module === 'projects' && <View style={layout.wrap}>
        <Button title={`Notes (${data.notes.filter(item => item.projectId === id).length})`} variant="secondary" onPress={() => router.push({ pathname: '/module', params: { module: 'notes', parentId: id, parentType: 'project' } })} />
        <Button title={`Links (${data.bookmarks.filter(item => item.projectId === id).length})`} variant="secondary" onPress={() => router.push({ pathname: '/module', params: { module: 'bookmarks', parentId: id, parentType: 'project' } })} />
      </View>}
    </View>;
  }
  return null;
}
