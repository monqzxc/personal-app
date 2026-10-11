import { View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Label, SectionHeader, layout } from '../../components/common/ui';
import { useAppStore } from '../../stores/useAppStore';
import type { ModuleKey, ModuleRecord } from '../../types/life';
import { TaskCard } from '../tasks/components/TaskCard';
import { goalProgress } from '../goals/progress';
import { money, tripSpending } from '../finance/selectors';
import { LendingWorkspace } from '../finance/LendingWorkspace';
import { useToday } from '../../hooks/useToday';
import { RecordCard } from './RecordCard';
import { PersonWorkspace } from './PersonWorkspace';

export function RelatedWorkspace({ module, record }: { module: ModuleKey; record: ModuleRecord }) {
  const data = useAppStore(state => state.data);
  const tasks = useAppStore(state => state.tasks);
  const today = useToday();
  const id = record.id;
  if (module === 'people') return <PersonWorkspace personId={id} />;
  if (module === 'debts') return <LendingWorkspace debtId={id} />;
  if (module === 'moneyCollections') {
    const collection = data.moneyCollections.find(item => item.id === id)!;
    const count = [...data.transactions, ...data.debts, ...data.repayments].filter(item => item.collectionId === id).length;
    return <Card><SectionHeader title="Collected money activity" /><Label>{count} recorded items</Label><Label muted>Items keep their original dates and amounts. Organizing them here does not add another transaction.</Label>
      <Button title="Review collection by date" onPress={() => router.push({ pathname: '/expenses', params: { collectionId: id } })} />
      <Button title="Add quick expense" variant="secondary" onPress={() => router.push({ pathname: '/quick-expense', params: { collectionId: id } })} />
      <Button title="Collect existing items" variant="secondary" onPress={() => router.push('/expenses')} />
      {collection.tripId && <Button title="Open linked trip" variant="ghost" onPress={() => router.push({ pathname: '/record', params: { module: 'trips', id: collection.tripId } })} />}
    </Card>;
  }
  if (module === 'trips') {
    const trip = data.trips.find(item => item.id === id)!;
    const summary = tripSpending(trip, data, today);
    const groups = ['flight', 'hotel', 'place', 'itinerary', 'booking', 'packing', 'note', 'document'];
    return <Card><SectionHeader title="Trip workspace" /><Label>{money(summary.spent, trip.currency)} personal spending of {money(trip.budget, trip.currency)} budget</Label>
      <Label bold>{money(Math.abs(summary.remaining), trip.currency)} {summary.remaining < 0 ? 'over budget' : 'budget remaining'}</Label>
      {summary.categories.map(item => <View key={item.name} style={[layout.row, { justifyContent: 'space-between' }]}><Label>{item.name}</Label><Label bold>{money(item.amount, trip.currency)}</Label></View>)}
      <View style={layout.wrap}>{['Food', 'Fare', 'Stay', 'Activities', 'Other'].map(category => <Button key={category} title={`Add ${category.toLowerCase()}`} variant="secondary" onPress={() => router.push({ pathname: '/record', params: { module: 'transactions', parentId: id, category } })} />)}</View>
      <Label>{money(summary.covered, trip.currency)} covered for others · {money(summary.owed, trip.currency)} still owed to you</Label>
      <Button title="I paid for someone" variant="secondary" onPress={() => router.push({ pathname: '/record', params: { module: 'debts', parentId: id } })} />
      <Label muted size={12}>For a shared bill, enter your own share as an expense and each person's share as money owed. Do not also enter the full bill as an expense. Totals include recorded activity through today.</Label>
      {data.debts.filter(item => item.tripId === id).map(item => <RecordCard key={item.id} module="debts" record={item} />)}
      <Label muted size={12}>Expenses in other currencies are kept separate. Document entries store links.</Label>
      <View style={layout.wrap}>{groups.map(kind => <Button key={kind} title={`Add ${kind} (${data.tripItems.filter(item => item.tripId === id && item.kind === kind).length})`} variant="secondary" onPress={() => router.push({ pathname: '/record', params: { module: 'tripItems', parentId: id, kind } })} />)}</View>
      <Button title="View all trip items" variant="ghost" onPress={() => router.push({ pathname: '/module', params: { module: 'tripItems', parentId: id } })} />
      <Button title="Add trip expense" variant="secondary" onPress={() => router.push({ pathname: '/record', params: { module: 'transactions', parentId: id } })} />
      <Button title="View trip expenses" variant="ghost" onPress={() => router.push({ pathname: '/expenses', params: { tripId: id } })} />
      <Button title="Add trip collection" variant="secondary" onPress={() => router.push({ pathname: '/record', params: { module: 'moneyCollections', parentId: id } })} />
      {data.moneyCollections.filter(item => item.tripId === id).map(item => <RecordCard key={item.id} module="moneyCollections" record={item} />)}
      <Button title="Trip notes" variant="ghost" onPress={() => router.push({ pathname: '/module', params: { module: 'notes', parentId: id } })} />
      <Button title="Trip walks & runs" variant="secondary" onPress={() => router.push({ pathname: '/module', params: { module: 'activities', parentId: id } })} />
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
