import { View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Label, SectionHeader, layout } from '../../components/common/ui';
import { RecordCard } from '../library/RecordCard';
import { useAppStore } from '../../stores/useAppStore';
import { useToday } from '../../hooks/useToday';
import { goalProgress } from '../goals/progress';
import { localDate } from '../../utils/dates';

export function LifeDashboardCards() {
  const data = useAppStore(state => state.data);
  const tasks = useAppStore(state => state.tasks);
  const today = useToday();
  const bills = data.bills.filter(item => !['paid', 'cancelled'].includes(item.status)).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const trips = data.trips.filter(item => !['completed', 'cancelled'].includes(item.status) && item.endDate >= today).sort((a, b) => a.startDate.localeCompare(b.startDate));
  const goals = data.goals.filter(item => item.status === 'active');
  const projects = data.projects.filter(item => item.status === 'active');
  const notes = [...data.notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return <View style={layout.stack}>
    <Card><Label bold>A thought worth keeping?</Label><Label muted>{data.inbox.filter(item => !item.processed).length} captures waiting in your inbox.</Label><Button title="Quick capture" variant="secondary" icon="file-tray-outline" onPress={() => router.push({ pathname: '/record', params: { module: 'inbox' } })} /></Card>
    {!!bills.length && <><SectionHeader title="Upcoming payments" action={<Button title="All" variant="ghost" onPress={() => router.push({ pathname: '/module', params: { module: 'bills' } })} />} />{bills.slice(0, 2).map(item => <RecordCard key={item.id} module="bills" record={item} />)}</>}
    {!!trips.length && <><SectionHeader title="A change of scenery" />{trips.slice(0, 2).map(item => <View key={item.id} style={layout.stack}><RecordCard module="trips" record={item} /><Label muted size={12}>{item.startDate > today ? `${Math.round((localDate(item.startDate).getTime() - localDate(today).getTime()) / 86400000)} days until departure` : 'Travel dates are underway'}</Label></View>)}</>}
    {!!goals.length && <><SectionHeader title="Goals in motion" />{goals.slice(0, 2).map(goal => <Card key={goal.id}><Label bold>{goal.title}</Label><Label>{Math.round(goalProgress(goal, tasks))}% complete</Label><Button title="View goal" variant="ghost" onPress={() => router.push({ pathname: '/record', params: { module: 'goals', id: goal.id } })} /></Card>)}</>}
    {!!projects.length && <><SectionHeader title="What you’re building" />{projects.slice(0, 2).map(item => <RecordCard key={item.id} module="projects" record={item} />)}</>}
    {!!notes.length && <><SectionHeader title="Recent notes" />{notes.slice(0, 2).map(item => <RecordCard key={item.id} module="notes" record={item} />)}</>}
  </View>;
}
