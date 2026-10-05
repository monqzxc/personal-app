import { View } from 'react-native';
import { AppHeader, Card, Label, Screen, SectionHeader, layout } from '../../components/common/ui';
import { useAppStore } from '../../stores/useAppStore';
import { useTheme } from '../../theme/useTheme';
import { addDays, dateOnly, localDate } from '../../utils/dates';
import { useToday } from '../../hooks/useToday';
import { financeSummary, money } from '../finance/selectors';
import { goalProgress } from '../goals/progress';

export default function AnalyticsScreen() {
  const today = useToday();
  const tasks = useAppStore(state => state.tasks);
  const data = useAppStore(state => state.data);
  const currency = useAppStore(state => state.settings.currency);
  const { colors } = useTheme();
  const days = Array.from({ length: 7 }, (_, index) => addDays(today, index - 6));
  const completions = days.map(date => ({ date, count: tasks.filter(task => task.completedAt && dateOnly(new Date(task.completedAt)) === date).length }));
  const max = Math.max(1, ...completions.map(item => item.count));
  const summary = financeSummary(data, currency, today.slice(0, 7));
  return <Screen><AppHeader title="See your small wins." eyebrow="Personal analytics" /><SectionHeader title="Tasks completed this week" />
    <Card>{completions.map(item => <View key={item.date} style={layout.row}><Label size={12} style={{ width: 65 }}>{localDate(item.date).toLocaleDateString(undefined, { weekday: 'short' })}</Label><View style={{ flex: 1, height: 12, backgroundColor: colors.surfaceAlt, borderRadius: 6 }}><View style={{ width: `${item.count / max * 100}%`, backgroundColor: colors.primary, height: 12, borderRadius: 6 }} /></View><Label>{item.count}</Label></View>)}</Card>
    <SectionHeader title="This month’s money" /><Card><Label>Income: {money(summary.income, currency)}</Label><Label>Spending: {money(summary.expenses, currency)}</Label><Label>Net: {money(summary.income - summary.expenses, currency)}</Label><Label muted size={12}>{currency} only · based on recorded transactions</Label></Card>
    <SectionHeader title="Goals in motion" />{data.goals.filter(goal => goal.status === 'active').map(goal => <Card key={goal.id}><Label bold>{goal.title}</Label><Label>{Math.round(goalProgress(goal, tasks))}% complete</Label></Card>)}
    <Card><Label>{data.projects.filter(item => item.status === 'active').length} active projects</Label><Label>{data.inbox.filter(item => !item.processed).length} unprocessed captures</Label><Label>{data.accounts.filter(item => item.twoFactorEnabled).length} of {data.accounts.length} accounts marked with 2FA</Label></Card>
    <Label muted size={12}>These summaries describe records you have entered, not tracked device activity. Reopening a task removes its completion from the chart.</Label>
  </Screen>;
}
