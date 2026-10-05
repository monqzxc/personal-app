import { View } from 'react-native';
import { router } from 'expo-router';
import { AppHeader, Button, Card, EmptyState, Icon, IconButton, Label, Screen, SectionHeader, layout } from '../../../components/common/ui';
import { LifeDashboardCards } from '../LifeDashboardCards';
import { TaskCard } from '../../tasks/components/TaskCard';
import { AgendaCard } from '../../calendar/components/AgendaCard';
import { useAppStore } from '../../../stores/useAppStore';
import { useTheme } from '../../../theme/useTheme';
import { isActiveTask, isOverdue } from '../../tasks/selectors';
import { agendaForDate, buildAgenda } from '../../../services/calendarService';
import { localDate } from '../../../utils/dates';
import { useToday } from '../../../hooks/useToday';

export default function HomeScreen() {
  const { colors, spacing, radius } = useTheme();
  const tasks = useAppStore(state => state.tasks);
  const events = useAppStore(state => state.events);
  const name = useAppStore(state => state.settings.name);
  const today = useToday();
  const todayTasks = tasks.filter(task => isActiveTask(task) && task.dueDate === today);
  const overdue = tasks.filter(task => isOverdue(task, today));
  const todayEvents = agendaForDate(buildAgenda(events, []), today);
  const completed = tasks.filter(task => task.status === 'completed' && task.completedAt && new Date(task.completedAt).toDateString() === localDate(today).toDateString()).length;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const progress = completed + todayTasks.length ? completed / (completed + todayTasks.length) : 0;
  return <Screen>
    <View style={[layout.row, { justifyContent: 'space-between' }]}>
      <View style={layout.row}><Icon name="leaf" color={colors.primary} /><Label size={20} bold style={{ letterSpacing: -0.5 }}>daywell</Label></View>
      <IconButton icon="search-outline" label="Search everything" onPress={() => router.push('/search')} />
    </View>
    <AppHeader title={`${greeting}${name ? `, ${name}` : ''}.`} eyebrow={localDate(today).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} />
    <Card style={{ backgroundColor: colors.hero, borderColor: colors.hero, padding: spacing.xl }}>
      <View style={[layout.row, { justifyContent: 'space-between' }]}><Label color={colors.heroMuted} size={12} bold style={{ letterSpacing: 1.5 }}>A LITTLE CLARITY, EVERY DAY</Label><Icon name="sunny-outline" color={colors.accent} size={28} /></View>
      <Label size={30} bold color={colors.onHero}>{todayTasks.length ? 'Your day, at a glance.' : 'Space for what matters.'}</Label>
      <Label color={colors.heroMuted}>{todayTasks.length ? 'A few small steps. A little more progress.' : 'Capture a thought, make a plan, and take it one thing at a time.'}</Label>
      <View style={[layout.row, { paddingVertical: spacing.md }]}>
        {[{ number: todayTasks.length, label: 'Tasks today' }, { number: todayEvents.length, label: 'Events' }, { number: completed, label: 'Done today' }].map(stat => <View key={stat.label} style={{ flex: 1, gap: spacing.xs }}><Label size={34} bold color={colors.onHero}>{stat.number}</Label><Label size={12} color={colors.heroMuted}>{stat.label}</Label></View>)}
      </View>
      <View accessibilityRole="progressbar" accessibilityLabel="Today's task progress" accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }} style={{ height: 5, borderRadius: radius.pill, backgroundColor: colors.primary, overflow: 'hidden' }}>
        <View style={{ width: `${progress * 100}%`, height: '100%', backgroundColor: colors.accent }} />
      </View>
    </Card>
    <View style={layout.row}><View style={{ flex: 1 }}><Button title="Add task" icon="add" variant="secondary" onPress={() => router.push('/task')} /></View><View style={{ flex: 1 }}><Button title="Plan event" icon="calendar-outline" variant="secondary" onPress={() => router.push('/event')} /></View></View>
    {overdue.length > 0 && <View style={layout.stack}><SectionHeader title="Needs a little attention" /><Label color={colors.danger}>{overdue.length} overdue {overdue.length === 1 ? 'task' : 'tasks'}</Label>{overdue.slice(0, 3).map(task => <TaskCard key={task.id} task={task} />)}</View>}
    <View style={layout.stack}><SectionHeader title="Today’s focus" action={<Button title="View tasks" variant="ghost" onPress={() => router.push('/tasks')} />} />
      {todayTasks.slice(0, 4).map(task => <TaskCard key={task.id} task={task} />)}
      {!todayTasks.length && <Card><EmptyState title="Start with one small thing" description="Give a task today’s date to bring it into focus here." icon="checkmark-circle-outline" action={<Button title="Create a task" variant="ghost" onPress={() => router.push('/task')} />} /></Card>}
    </View>
    <View style={layout.stack}><SectionHeader title="On your calendar" action={<Button title="View all" variant="ghost" onPress={() => router.push('/calendar')} />} />
      {todayEvents.slice(0, 3).map(item => <AgendaCard key={item.id} item={item} />)}
      {!todayEvents.length && <Card><View style={layout.row}><Icon name="partly-sunny-outline" color={colors.primary} size={28} /><View style={{ flex: 1 }}><Label bold>No events today</Label><Label muted size={13}>A little space in your schedule.</Label></View></View></Card>}
    </View>
    <LifeDashboardCards />
    <View style={[layout.row, { justifyContent: 'center' }]}><Icon name="phone-portrait-outline" color={colors.muted} size={14} /><Label muted size={12}>On your device. At your pace.</Label></View>
  </Screen>;
}
