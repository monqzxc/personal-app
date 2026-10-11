import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Card, Icon, Label, layout } from '../../../components/common/ui';
import type { AgendaItem } from '../../../services/calendarService';
import type { DateOnly } from '../../../types/models';
import { useTheme } from '../../../theme/useTheme';
import { formatDate } from '../../../utils/dates';

const kinds = { task: 'task', event: 'event', record: 'plan' } as const;

// `day` is the agenda day being shown; the + button adds an event on it, at this item's time when it has one.
export function AgendaCard({ item, day }: { item: AgendaItem; day: DateOnly }) {
  const { colors, radius, spacing } = useTheme();
  return <Card><View style={layout.row}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${kinds[item.kind]} ${item.title}`} style={({ pressed }) => [layout.row, { flex: 1, opacity: pressed ? 0.75 : 1 }]}
      onPress={() => router.push({ pathname: item.kind === 'task' ? '/task' : item.kind === 'event' ? '/event' : '/record', params: { id: item.sourceId, ...(item.module ? { module: item.module } : {}) } })}>
      <View style={{ width: 52, alignItems: 'center', gap: spacing.xs }}>
        <View style={{ width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}><Icon name={item.kind === 'task' ? 'checkbox-outline' : 'calendar-outline'} color={colors.primary} /></View>
        <Label muted size={11}>{item.time ?? (item.kind === 'task' ? 'Due' : 'All day')}</Label>
      </View>
      <View style={{ flex: 1, gap: spacing.xs }}><Label bold>{item.title}</Label><Label muted size={12}>{item.detail}</Label></View>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={`Add an event on ${formatDate(day)}${item.time ? ` at ${item.time}` : ''}`}
      onPress={() => router.push({ pathname: '/event', params: { date: day, ...(item.time ? { time: item.time } : {}) } })}
      style={({ pressed }) => ({ width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.75 : 1 })}>
      <Icon name="add" color={colors.onPrimary} size={26} />
    </Pressable>
  </View></Card>;
}
