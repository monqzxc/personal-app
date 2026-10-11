import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Badge, Button, Card, Icon, Label, layout } from '../../components/common/ui';
import { useAppStore } from '../../stores/useAppStore';
import { useToday } from '../../hooks/useToday';
import { useTheme } from '../../theme/useTheme';
import { addDays, formatDate, localDate } from '../../utils/dates';
import { money } from '../finance/selectors';
import { weeklyFitness } from '../fitness/tracking';
import { comingPayments, dashboardMoney, nextGetaway } from './dashboardSelectors';

export function LifeDashboardCards() {
  const data = useAppStore(state => state.data);
  const currency = useAppStore(state => state.settings.currency);
  const today = useToday();
  const { colors, radius, spacing } = useTheme();
  const [hidden, setHidden] = useState(false);
  const [allPayments, setAllPayments] = useState(false);
  const finances = dashboardMoney(data, currency, today);
  const payments = comingPayments(data, today);
  const movement = weeklyFitness(data.activities, today);
  const active = data.activities.find(item => !item.deletedAt && item.status !== 'completed');
  const getaway = nextGetaway(data, today);
  const uncollected = data.transactions.filter(item => !item.deletedAt && item.type === 'expense' && !item.collectionId).length;
  const amount = (value: number, unit: string) => hidden ? 'Amount hidden' : money(value, unit);
  return <View style={layout.stack}>
    {active && <Card style={{ borderColor: colors.primary, backgroundColor: colors.primarySoft }}>
      <View style={layout.row}><Icon name="walk-outline" color={colors.primary} /><Label bold style={{ flex: 1 }}>{active.status === 'recording' ? 'Workout in progress' : 'Your workout is paused'}</Label></View>
      <Label>{active.name}</Label><Button title={active.status === 'recording' ? 'View current workout' : 'Open workout to resume'} onPress={() => router.push({ pathname: '/module', params: { module: 'activities' } })} />
    </Card>}
    <Card>
      <View style={[layout.row, { flexWrap: 'wrap', justifyContent: 'space-between' }]}><Label size={22} bold>Money today</Label><Button title={hidden ? 'Show amounts' : 'Hide amounts'} icon={hidden ? 'eye-outline' : 'eye-off-outline'} variant="ghost" onPress={() => setHidden(value => !value)} /></View>
      <Label muted size={12}>{formatDate(today)} / {currency} only</Label>
      <Label bold size={hidden ? 22 : 32}>{amount(finances.spent, currency)}</Label><Label muted>Spent today</Label>
      <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md, gap: spacing.md }}>
        <Label bold>{localDate(today).toLocaleDateString(undefined, { month: 'long' })} budgets</Label>
        {finances.budgets.slice(0, 2).map(({ budget, progress }) => <View key={budget.id} style={{ gap: spacing.sm }}>
          <Label>{budget.name}</Label>
          <Label muted size={12}>{hidden ? 'Budget amounts hidden' : `${money(progress.spent, currency)} of ${money(budget.amount, currency)} / ${progress.percent}% spent`}</Label>
          {!hidden && <View accessibilityRole="progressbar" accessibilityLabel={`${budget.name} spending`} accessibilityValue={{ min: 0, max: 100, now: progress.barPercent, text: `${progress.percent}% spent` }} style={{ height: 6, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt }}>
            <View style={{ width: `${progress.barPercent}%`, height: 6, borderRadius: radius.pill, backgroundColor: progress.level === 'over' || progress.level === 'limit' ? colors.danger : colors.primary }} />
          </View>}
        </View>)}
        {!finances.budgets.length && <Label muted size={12}>Set a category budget to see your progress here.</Label>}
        <View style={layout.wrap}><Button title="Open finance" variant="secondary" onPress={() => router.push('/finance')} /><Button title={finances.budgets.length ? 'All budgets' : 'Set a budget'} variant="ghost" onPress={() => router.push({ pathname: '/module', params: { module: 'budgets' } })} /></View>
      </View>
    </Card>
    <Card>
      <View style={layout.row}><Icon name="calendar-outline" color={colors.primary} /><Label size={22} bold style={{ flex: 1 }}>Coming due</Label></View>
      <Label muted size={12}>Overdue and due through {formatDate(addDays(today, 7))}</Label>
      {(allPayments ? payments : payments.slice(0, 3)).map(payment => {
        const due = payment.date < today ? `Overdue / ${formatDate(payment.date)}` : payment.date === today ? 'Due today' : `Due ${formatDate(payment.date)}`;
        return <Pressable key={`${payment.module}:${payment.id}`} accessibilityRole="button" accessibilityLabel={`${payment.name}, ${payment.kind}, ${due}, ${amount(payment.amount, payment.currency)}. Open payment.`}
          onPress={() => router.push({ pathname: '/record', params: { module: payment.module, id: payment.id } })}
          style={({ pressed }) => ({ minHeight: 60, padding: spacing.md, gap: spacing.xs, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, opacity: pressed ? 0.7 : 1 })}>
          <View style={layout.row}><Label bold style={{ flex: 1 }}>{payment.name}</Label><Icon name="chevron-forward" size={18} color={colors.muted} /></View>
          <Label muted size={12}>{payment.kind} / {amount(payment.amount, payment.currency)}</Label>
          <Label size={12} color={payment.date < today ? colors.danger : colors.muted}>{due}</Label>
        </Pressable>;
      })}
      {!payments.length && <Label muted>No payments coming due. A little breathing room.</Label>}
      {payments.length > 3 && <Button title={allPayments ? 'Show fewer' : `Show all ${payments.length} payments`} variant="ghost" onPress={() => setAllPayments(value => !value)} />}
      <Button title="Manage payments" variant="secondary" onPress={() => router.push('/finance')} />
    </Card>
    <Card>
      <View style={layout.row}><Icon name="footsteps-outline" color={colors.primary} /><Label size={22} bold style={{ flex: 1 }}>This week's movement</Label></View>
      <Label muted size={12}>{formatDate(movement.start)} to {formatDate(today)} / completed walks and runs</Label>
      <View style={[layout.wrap, { justifyContent: 'space-between' }]}>
        <View><Label size={28} bold>{movement.count}</Label><Label muted size={12}>activities</Label></View>
        <View><Label size={28} bold>{movement.distanceKm.toFixed(2)}</Label><Label muted size={12}>kilometers</Label></View>
        <View><Label size={28} bold>{Math.round(movement.minutes)}</Label><Label muted size={12}>active minutes</Label></View>
      </View>
      {active ? <Button title="Open fitness" variant="secondary" onPress={() => router.push({ pathname: '/module', params: { module: 'activities' } })} /> : <>
        <View style={layout.wrap}><Button title="Start walk" icon="walk-outline" onPress={() => router.push({ pathname: '/module', params: { module: 'activities', activityKind: 'walk' } })} /><Button title="Start run" variant="secondary" onPress={() => router.push({ pathname: '/module', params: { module: 'activities', activityKind: 'run' } })} /></View>
        <Label muted size={12}>Choose your tracking mode in Fitness, or log an activity manually.</Label>
      </>}
    </Card>
    <Card style={{ backgroundColor: colors.primarySoft }}>
      <View style={layout.row}><Icon name="albums-outline" color={colors.primary} /><Label size={22} bold style={{ flex: 1 }}>Organize later</Label></View>
      <Label>{uncollected ? `${uncollected} ${uncollected === 1 ? 'expense is' : 'expenses are'} waiting to be collected.` : 'Your expenses are all collected.'}</Label>
      <Label muted size={12}>Bring food, fares, and other expenses together in a collection like Weekend Vacation.</Label>
      <Button title="Review uncollected expenses" variant="secondary" onPress={() => router.push({ pathname: '/expenses', params: { collectionId: 'unassigned' } })} />
    </Card>
    {getaway && <Card>
      <View style={layout.row}><Icon name="airplane-outline" color={colors.primary} /><Label size={22} bold style={{ flex: 1 }}>Next getaway</Label></View>
      <Badge title={getaway.days ? `In ${getaway.days} ${getaway.days === 1 ? 'day' : 'days'}` : getaway.trip.startDate === today ? 'Starts today' : 'Underway'} tone="primary" />
      <Label bold size={22}>{getaway.trip.title}</Label><Label muted>{getaway.trip.destination}</Label>
      <Label muted size={12}>{formatDate(getaway.trip.startDate)} to {formatDate(getaway.trip.endDate)}</Label>
      <Label>{amount(getaway.spending.spent, getaway.trip.currency)} spent{getaway.trip.budget > 0 ? hidden ? ' / Budget hidden' : ` of ${money(getaway.trip.budget, getaway.trip.currency)} budget` : ''}</Label>
      <Button title="Open trip" variant="secondary" onPress={() => router.push({ pathname: '/record', params: { module: 'trips', id: getaway.trip.id } })} />
    </Card>}
  </View>;
}
