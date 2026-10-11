import { useEffect, useState } from 'react';
import { AppState, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Icon, IconButton, Label, Screen, SectionHeader, layout } from '../../../components/common/ui';
import { LifeDashboardCards } from '../LifeDashboardCards';
import { DailyQuoteCard } from '../DailyQuoteCard';
import { WeekStrip } from '../WeekStrip';
import { dayTasks, nextAppointment, overdueTasks, weekDates } from '../dayPlan';
import { TaskCard } from '../../tasks/components/TaskCard';
import { AgendaCard } from '../../calendar/components/AgendaCard';
import { useAppStore } from '../../../stores/useAppStore';
import { useTheme } from '../../../theme/useTheme';
import { agendaForDate, buildAgenda } from '../../../services/calendarService';
import { dateOnly, formatDate, localDate } from '../../../utils/dates';
import { ProfileAvatar } from '../../../components/common/ProfileAvatar';
import { useToday } from '../../../hooks/useToday';

export default function HomeScreen() {
  const { colors, spacing } = useTheme();
  const tasks = useAppStore(state => state.tasks);
  const events = useAppStore(state => state.events);
  const people = useAppStore(state => state.data.people);
  const activities = useAppStore(state => state.data.activities);
  const name = useAppStore(state => state.settings.name);
  const profilePhoto = useAppStore(state => state.settings.profilePhoto);
  const today = useToday();
  const [selected, setSelected] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const update = () => setNow(new Date());
    const timer = setInterval(update, 30_000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') update(); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, []);
  const day = selected ?? today;
  const focus = dayTasks(tasks, day);
  const overdue = overdueTasks(tasks, today);
  const agenda = buildAgenda(events, []);
  const scheduled = agendaForDate(agenda, day);
  const next = nextAppointment(events, day, now);
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const happening = next && day === today && (next.startDate < day || (next.startTime ?? '') <= time);
  const completed = tasks.filter(task => !task.deletedAt && task.status === 'completed' && task.completedAt && dateOnly(new Date(task.completedAt)) === day).length;
  const marked = new Set(weekDates(day).filter(date => dayTasks(tasks, date).length || agendaForDate(agenda, date).length));
  const active = activities.find(item => !item.deletedAt && item.status !== 'completed');
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const nextPeople = next ? people.filter(person => !person.deletedAt && next.peopleIds.includes(person.id)) : [];
  return <Screen>
    <View style={[layout.row, { alignItems: 'flex-start' }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Open your profile and settings" onPress={() => router.push('/settings')}>
        <ProfileAvatar name={name} photo={profilePhoto} />
      </Pressable>
      <View style={{ flex: 1, gap: spacing.xs }}>
        <Label size={11} bold color={colors.primary} style={{ letterSpacing: 1.5 }}>MONAPp</Label>
        <Label size={24} bold>{greeting}{name ? `, ${name}` : ''}</Label>
        <Label size={12} muted>{localDate(today).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</Label>
      </View>
      <IconButton icon="search-outline" label="Search everything" onPress={() => router.push('/search')} />
    </View>

    <DailyQuoteCard />

    <View style={{ gap: spacing.sm }}>
      <Label size={12} bold muted style={{ letterSpacing: 1.2 }}>MAKE A LITTLE PROGRESS</Label>
      <View style={layout.wrap}>
        <View style={{ flexGrow: 1, flexBasis: '46%' }}><Button title="Add expense" icon="wallet-outline" onPress={() => router.push('/quick-expense')} /></View>
        <View style={{ flexGrow: 1, flexBasis: '46%' }}><Button title="Add task" icon="add" variant="secondary" onPress={() => router.push({ pathname: '/task', params: { date: day } })} /></View>
        <View style={{ flexGrow: 1, flexBasis: '46%' }}><Button title="Schedule" icon="calendar-outline" variant="secondary" onPress={() => router.push({ pathname: '/event', params: { date: day } })} /></View>
        <View style={{ flexGrow: 1, flexBasis: '46%' }}><Button title={active ? 'View workout' : 'Start walk'} icon="walk-outline" variant="secondary" onPress={() => router.push({ pathname: '/module', params: { module: 'activities', activityKind: 'walk' } })} /></View>
      </View>
    </View>

    <WeekStrip selected={day} today={today} marked={marked} onSelect={setSelected} />
    <View style={layout.stack}>
      <SectionHeader title={day === today ? 'Your day' : formatDate(day)} action={<Button title="Calendar" variant="ghost" onPress={() => router.push({ pathname: '/calendar', params: { date: day } })} />} />
      <Label muted size={12}>{localDate(day).toLocaleDateString(undefined, { dateStyle: 'full' })}</Label>
      <Card style={{ backgroundColor: colors.primarySoft, borderColor: colors.primarySoft }}>
        <View style={[layout.row, { alignItems: 'flex-start' }]}>
          {[{ value: focus.length, label: 'Pending tasks' }, { value: scheduled.length, label: 'Events' }, { value: completed, label: 'Completed' }].map(item => <View key={item.label} style={{ flex: 1, gap: spacing.xs }}><Label bold size={26} color={colors.primary}>{item.value}</Label><Label muted size={12}>{item.label}</Label></View>)}
        </View>
      </Card>
      {next && <Pressable accessibilityRole="button" accessibilityLabel={`Open ${next.title}`} onPress={() => router.push({ pathname: '/event', params: { id: next.id } })}>
        <Card style={{ borderColor: colors.primary }}>
          <View style={layout.row}><Icon name="time-outline" color={colors.primary} /><Label bold size={12} color={colors.primary}>{happening ? 'HAPPENING NOW' : 'NEXT ON YOUR CALENDAR'}</Label></View>
          <Label size={22} bold>{next.title}</Label>
          <Label>{next.startDate === next.endDate ? `${next.startTime} - ${next.endTime}` : `${formatDate(next.startDate)} ${next.startTime} - ${formatDate(next.endDate)} ${next.endTime}`}</Label>
          {next.location ? <View style={layout.row}><Icon name="location-outline" size={18} color={colors.muted} /><Label muted style={{ flex: 1 }}>{next.location}</Label></View> : null}
          {nextPeople.length > 0 && <Label muted size={12}>With {nextPeople.slice(0, 3).map(person => person.name).join(', ')}{nextPeople.length > 3 ? ` +${nextPeople.length - 3}` : ''}</Label>}
        </Card>
      </Pressable>}
      {focus.slice(0, 3).map(task => <TaskCard key={task.id} task={task} />)}
      {focus.length > 3 && <Button title={`View all ${focus.length} tasks for this date`} variant="ghost" onPress={() => router.push({ pathname: '/tasks', params: { date: day } })} />}
      {scheduled.filter(item => item.sourceId !== next?.id).slice(0, 3).map(item => <AgendaCard key={item.id} item={item} />)}
      {!focus.length && !scheduled.length && <Card><View style={layout.row}><Icon name="moon-outline" color={colors.primary} size={30} /><View style={{ flex: 1 }}><Label bold>A little room to breathe</Label><Label muted size={13}>No tasks or events for this date. Add a small plan when you are ready.</Label></View></View><Button title="Plan something" variant="ghost" onPress={() => router.push({ pathname: '/event', params: { date: day } })} /></Card>}
    </View>

    {overdue.length > 0 && <Card><View style={layout.row}><Icon name="alert-circle-outline" color={colors.warning} /><View style={{ flex: 1 }}><Label bold>{overdue.length} overdue {overdue.length === 1 ? 'task' : 'tasks'}</Label><Label muted size={12}>A small check-in for today</Label></View></View>
      {overdue.slice(0, 2).map(task => <Button key={task.id} title={`${task.title} - ${formatDate(task.dueDate!)}`} variant="ghost" onPress={() => router.push({ pathname: '/task', params: { id: task.id } })} />)}
      <Button title="Review overdue tasks" variant="secondary" onPress={() => router.push({ pathname: '/tasks', params: { view: 'Overdue' } })} />
    </Card>}
    <LifeDashboardCards />
    <View style={[layout.row, { justifyContent: 'center' }]}><Icon name="moon-outline" color={colors.muted} size={14} /><Label muted size={12}>A little progress. A little rest.</Label></View>
  </Screen>;
}
