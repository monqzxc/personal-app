import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { AppHeader, Button, Card, Chips, EmptyState, Field, Label, Screen, SectionHeader, layout } from '../../components/common/ui';
import { useAppStore } from '../../stores/useAppStore';
import { useTheme } from '../../theme/useTheme';
import { dateOnly } from '../../utils/dates';
import { financeSummary, money } from './selectors';
import { RecordCard } from '../library/RecordCard';
import { ModuleList } from '../library/ModuleScreen';
import type { ModuleKey } from '../../types/life';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FinanceScreen() {
  const data = useAppStore(state => state.data);
  const defaultCurrency = useAppStore(state => state.settings.currency);
  const [currency, setCurrency] = useState(defaultCurrency);
  const [month, setMonth] = useState(dateOnly().slice(0, 7));
  const [section, setSection] = useState('Overview');
  const { colors, spacing } = useTheme();
  const sections = { Transactions: 'transactions', Bills: 'bills', Subscriptions: 'subscriptions', Budgets: 'budgets', Savings: 'savings' } satisfies Record<string, ModuleKey>;
  const summary = financeSummary(data, currency, month);
  if (section !== 'Overview') return <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}><View style={{ padding: spacing.lg }}><Button title="Back to finance overview" variant="secondary" onPress={() => setSection('Overview')} /></View><ModuleList key={section} module={sections[section as keyof typeof sections]} /></SafeAreaView>;
  return <Screen><AppHeader title="A clearer view of money." eyebrow="Finance" />
    <Chips items={['Overview', ...Object.keys(sections)]} value={section} onChange={setSection} />
    <Field label="Month" value={month} onChangeText={setMonth} placeholder="YYYY-MM" maxLength={7} />
    <Chips items={['PHP', 'USD', 'EUR', 'JPY', 'GBP']} value={currency} onChange={setCurrency} />
    <Card style={{ backgroundColor: colors.hero }}><Label color={colors.heroMuted}>Available after this month’s bills</Label><Label size={32} bold color={colors.onHero}>{money(summary.available, currency)}</Label><Label color={colors.heroMuted} size={12}>Monthly income − expenses − unpaid bills. Savings balances are tracked separately.</Label></Card>
    <View style={layout.wrap}>{[{ label: 'Monthly income', amount: summary.income }, { label: 'Monthly expenses', amount: summary.expenses }, { label: 'Remaining bills', amount: summary.bills }, { label: 'Tracked savings', amount: summary.savings }].map(item => <Card key={item.label} style={{ flexGrow: 1, flexBasis: '45%' }}><Label muted size={12}>{item.label}</Label><Label bold size={20}>{money(item.amount, currency)}</Label></Card>)}</View>
    <View style={layout.row}><View style={{ flex: 1 }}><Button title="Add expense" icon="add" onPress={() => router.push({ pathname: '/record', params: { module: 'transactions' } })} /></View><View style={{ flex: 1 }}><Button title="Add income" variant="secondary" onPress={() => router.push({ pathname: '/record', params: { module: 'transactions', transactionType: 'income' } })} /></View></View>
    <SectionHeader title="Spending by category" />
    {summary.categories.map(item => <Card key={item.name}><View style={[layout.row, { justifyContent: 'space-between' }]}><Label>{item.name}</Label><Label bold>{money(item.amount, currency)}</Label></View><View style={{ backgroundColor: colors.surfaceAlt, height: 8, borderRadius: 4 }}><View style={{ backgroundColor: colors.primary, height: 8, borderRadius: 4, width: `${summary.expenses ? item.amount / summary.expenses * 100 : 0}%` }} /></View></Card>)}
    {!summary.categories.length && <EmptyState title="No expenses this month" description="Your category breakdown will appear after you record spending." icon="pie-chart-outline" />}
    <SectionHeader title="Budget check-in" />
    {data.budgets.filter(item => item.month === month && item.currency === currency).map(budget => { const spent = summary.categories.find(item => item.name === budget.category)?.amount ?? 0; return <Card key={budget.id}><Label bold>{budget.name}</Label><Label color={spent > budget.amount ? colors.danger : colors.muted}>{money(spent, currency)} of {money(budget.amount, currency)} · {budget.category}</Label><Button title="Edit budget" variant="ghost" onPress={() => router.push({ pathname: '/record', params: { module: 'budgets', id: budget.id } })} /></Card>; })}
    <SectionHeader title="Upcoming payments" />
    {data.bills.filter(item => item.currency === currency && !['paid', 'cancelled'].includes(item.status)).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 5).map(item => <RecordCard key={item.id} module="bills" record={item} />)}
    <Label muted size={12}>Totals include {currency} records only. No automatic exchange-rate conversion.</Label>
  </Screen>;
}
