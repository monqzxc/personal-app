import { View } from 'react-native';
import { router } from 'expo-router';
import type { Budget } from '../../types/life';
import { Badge, Button, Card, Label, layout } from '../../components/common/ui';
import { useAppStore } from '../../stores/useAppStore';
import { useTheme } from '../../theme/useTheme';
import { budgetProgress, money } from './selectors';
import { useToday } from '../../hooks/useToday';

export function BudgetCard({ budget }: { budget: Budget }) {
  const transactions = useAppStore(state => state.data.transactions);
  const today = useToday();
  const progress = budgetProgress(budget, transactions, today);
  const { colors, radius } = useTheme();
  const tone = progress.level === 'over' || progress.level === 'limit' ? 'danger' : progress.level === 'near' ? 'warning' : 'primary';
  const status = progress.level === 'over' ? 'Over budget' : progress.level === 'limit' ? 'Limit reached' : progress.level === 'near' ? 'Near limit' : 'On track';
  return <Card><View style={[layout.row, { justifyContent: 'space-between' }]}><Label bold style={{ flex: 1 }}>{budget.name}</Label><Badge title={status} tone={tone} /></View>
    <Label muted size={12}>{budget.category} · {budget.month}</Label>
    <Label>{money(progress.spent, budget.currency)} / {money(budget.amount, budget.currency)}</Label>
    <View accessibilityRole="progressbar" accessibilityLabel={`${budget.name} spending`} accessibilityValue={{ min: 0, max: 100, now: progress.barPercent, text: `${progress.percent}% spent` }} style={{ height: 8, backgroundColor: colors.surfaceAlt, borderRadius: radius.pill }}><View style={{ height: 8, width: `${progress.barPercent}%`, backgroundColor: colors[tone], borderRadius: radius.pill }} /></View>
    <Label color={colors[tone]}>{money(Math.abs(progress.remaining), budget.currency)} {progress.remaining < 0 ? 'over budget' : 'left'}</Label>
    {progress.alert && <View accessibilityRole="alert"><Label color={colors[tone]} size={12}>{progress.level === 'near' ? '80% budget alert: approaching your limit.' : '100% budget alert: your limit has been reached.'}</Label></View>}
    <Button title="Edit budget" variant="ghost" onPress={() => router.push({ pathname: '/record', params: { module: 'budgets', id: budget.id } })} />
  </Card>;
}
