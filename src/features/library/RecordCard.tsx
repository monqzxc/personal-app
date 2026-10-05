import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import type { ModuleKey, ModuleRecord } from '../../types/life';
import { recordTitle } from './catalog';
import { Badge, Card, Icon, Label, layout } from '../../components/common/ui';
import { useTheme } from '../../theme/useTheme';
import { money } from '../finance/selectors';
import { dateOnly } from '../../utils/dates';

export function RecordCard({ module, record }: { module: ModuleKey; record: ModuleRecord }) {
  const { colors } = useTheme();
  const values = record as unknown as Record<string, unknown>;
  const due = values.dueDate ?? values.nextBillingDate ?? values.startDate ?? values.date ?? values.targetDate;
  const amount = values.amount;
  const status = module === 'bills' && !['paid', 'cancelled'].includes(String(values.status)) && String(values.dueDate) < dateOnly() ? 'overdue' : values.status;
  return <Pressable accessibilityRole="button" accessibilityLabel={`Open ${recordTitle(module, record)}`} onPress={() => router.push({ pathname: '/record', params: { module, id: record.id } })}>
    <Card><View style={layout.row}><View style={{ flex: 1, gap: 8 }}><Label bold>{recordTitle(module, record)}</Label>
      <View style={layout.wrap}>{values.category ? <Label muted size={12}>{String(values.category)}</Label> : null}{due ? <Label muted size={12}>{String(due)}</Label> : null}{status ? <Badge title={String(status)} tone={status === 'overdue' ? 'danger' : 'neutral'} /> : null}{values.favorite ? <Icon name="star" color={colors.warning} size={16} /> : null}{module === 'inbox' && <Badge title={values.processed ? 'Processed' : 'Inbox'} tone={values.processed ? 'neutral' : 'primary'} />}</View>
      {Array.isArray(values.technology) && <Label muted size={12}>{values.technology.join(' · ')}</Label>}
    </View>{typeof amount === 'number' && <Label bold color={values.type === 'income' ? colors.primary : colors.text}>{money(amount, String(values.currency))}</Label>}<Icon name="chevron-forward" size={16} color={colors.muted} /></View></Card>
  </Pressable>;
}
