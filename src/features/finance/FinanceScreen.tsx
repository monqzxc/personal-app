import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader, Button, Card, Chips, EmptyState, Field, Label, Screen, SectionHeader, layout } from '../../components/common/ui';
import { useAppStore } from '../../stores/useAppStore';
import { useTheme } from '../../theme/useTheme';
import { useToday } from '../../hooks/useToday';
import { financeSummary, isMonth, money, owedTotal } from './selectors';
import { BudgetCard } from './BudgetCard';
import { RecordCard } from '../library/RecordCard';
import { ModuleList } from '../library/ModuleScreen';
import type { ModuleKey } from '../../types/life';

const sections = { Transactions: 'transactions', Budgets: 'budgets', Bills: 'bills', Wallets: 'wallets', People: 'people', Collections: 'moneyCollections', Debts: 'debts', Repayments: 'repayments', 'Expected income': 'expectedIncome', Subscriptions: 'subscriptions', Savings: 'savings' } satisfies Record<string, ModuleKey>;
export default function FinanceScreen() {
  const data = useAppStore(state => state.data);
  const defaultCurrency = useAppStore(state => state.settings.currency);
  const today = useToday();
  const [currency, setCurrency] = useState(defaultCurrency);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [section, setSection] = useState('Overview');
  const { colors, spacing } = useTheme();
  const summary = financeSummary(data, currency, month, today);
  const budgets = data.budgets.filter(item => item.month === month && item.currency === currency);
  const openNew = (module: ModuleKey, transactionType?: string) => router.push({ pathname: '/record', params: { module, currency, ...(isMonth(month) ? { month } : {}), ...(transactionType ? { transactionType } : {}) } });
  if (section !== 'Overview') return <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}><View style={{ padding: spacing.lg }}><Button title="Back to finance overview" variant="secondary" onPress={() => setSection('Overview')} /><Chips items={Object.keys(sections)} value={section} onChange={setSection} /></View><ModuleList key={section} module={sections[section as keyof typeof sections]} /></SafeAreaView>;
  return <Screen><AppHeader title="Know where your money goes." eyebrow="Finance" />
    <Chips items={['Overview', ...Object.keys(sections)]} value={section} onChange={setSection} />
    <Chips items={['PHP', 'USD', 'EUR', 'JPY', 'GBP']} value={currency} onChange={setCurrency} />
    <Card style={{ backgroundColor: colors.hero }}><Label color={colors.heroMuted}>Money in your wallets today</Label><Label size={32} bold color={colors.onHero}>{money(summary.walletTotal, currency)}</Label><Label color={colors.heroMuted} size={12}>Includes income, spending, lending, borrowing and repayments through {today}. Transfers move money between wallets.</Label></Card>
    <View style={layout.wrap}><Button title="Quick expense" icon="add" onPress={() => router.push({ pathname: '/quick-expense', params: { currency } })} /><Button title="Expenses by date" variant="secondary" onPress={() => router.push('/expenses')} /><Button title="Collections" variant="secondary" onPress={() => setSection('Collections')} /></View>
    <Card><Label muted>People owe you · {currency}</Label><Label bold size={24}>{money(owedTotal(data, currency, undefined, today), currency)}</Label><Label muted>You owe people · {currency}</Label><Label bold size={24}>{money(owedTotal(data, currency, undefined, today, 'borrowed'), currency)}</Label><Label muted size={12}>Outstanding debts are separate from available wallet money. Loan receipts and repayments are separate from income and spending. Each direction is tracked separately under People.</Label><Button title="View people & balances" variant="secondary" onPress={() => setSection('People')} /></Card>
    {!summary.wallets.length && <Button title="Set up your first wallet" icon="add" onPress={() => openNew('wallets')} />}
    {summary.unassignedCount > 0 && <Card><Label bold>{summary.unassignedCount} transactions have no wallet</Label><Label muted>They count in monthly income and expenses, but are excluded from wallet balances. Assign them a wallet from transaction history.</Label><Button title="Review transactions" variant="secondary" onPress={() => setSection('Transactions')} /></Card>}
    <View style={layout.wrap}>{(['income', 'transfer'] as const).map(type => <Button key={type} title={`Add ${type}`} variant="secondary" onPress={() => openNew('transactions', type)} />)}</View>
    <SectionHeader title="Monthly cash flow" />
    <Field label="Month" value={month} onChangeText={setMonth} placeholder="YYYY-MM" maxLength={7} />
    {!isMonth(month) ? <Label color={colors.danger}>Enter a valid month in YYYY-MM format.</Label> : <>
      <View style={layout.wrap}>{[{ label: 'Income received', amount: summary.income }, { label: 'Expenses recorded', amount: summary.expenses }, { label: 'Net cash flow', amount: summary.net }, { label: 'Unpaid bills', amount: summary.bills }, { label: 'Expected income', amount: summary.expected }, { label: 'Net after unpaid bills', amount: summary.available }].map(item => <Card key={item.label} style={{ flexGrow: 1, flexBasis: '45%' }}><Label muted size={12}>{item.label}</Label><Label bold size={20}>{money(item.amount, currency)}</Label></Card>)}</View>
      <Label muted size={12}>Monthly totals include transactions through today. Net after bills = income − expenses − this month's unpaid bills; it is separate from your wallet balance. Expected income is included only after you mark it received. Subscriptions are tracked separately from bills.</Label>
      <View style={layout.wrap}><Button title="Plan income" variant="secondary" onPress={() => openNew('expectedIncome')} /><Button title="Plan a bill" variant="secondary" onPress={() => openNew('bills')} /></View>
      <SectionHeader title="Spending by category" />
      {summary.categories.map(item => <Card key={item.name}><View style={[layout.row, { justifyContent: 'space-between' }]}><Label style={{ flex: 1 }}>{item.name || 'Uncategorized'}</Label><Label bold>{money(item.amount, currency)}</Label></View><View style={{ backgroundColor: colors.surfaceAlt, height: 8, borderRadius: 4 }}><View style={{ backgroundColor: colors.primary, height: 8, borderRadius: 4, width: `${summary.expenses ? item.amount / summary.expenses * 100 : 0}%` }} /></View></Card>)}
      {!summary.categories.length && <EmptyState title="No expenses this month" description="Your category breakdown will appear after you record spending." icon="pie-chart-outline" />}
      <SectionHeader title="Budget check-in" action={<Button title="Add budget" variant="ghost" onPress={() => openNew('budgets')} />} />
      {budgets.map(budget => <BudgetCard key={budget.id} budget={budget} />)}
      {!budgets.length && <Label muted>Set a monthly category limit to track how much you have left.</Label>}
    </>}
    <SectionHeader title="Upcoming payments" />
    {data.bills.filter(item => item.currency === currency && !['paid', 'cancelled'].includes(item.status)).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 5).map(item => <RecordCard key={item.id} module="bills" record={item} />)}
    <Label muted size={12}>Totals include {currency} records only. Savings funds track goals separately from wallets. No automatic currency conversion.</Label>
  </Screen>;
}
