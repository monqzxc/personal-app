import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Badge, Card, Icon, Label, layout } from '../../../components/common/ui';
import type { AgendaItem } from '../../../services/calendarService';
import { useTheme } from '../../../theme/useTheme';

export function AgendaCard({ item }: { item: AgendaItem }) {
  const { colors, spacing } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${item.title}`} onPress={() => router.push({ pathname: item.kind === 'task' ? '/task' : item.kind === 'event' ? '/event' : '/record', params: { id: item.sourceId, ...(item.module ? { module: item.module } : {}) } })}>
    <Card><View style={layout.row}><View style={{ width: 52, alignItems: 'center', gap: spacing.xs }}><Icon name={item.kind === 'task' ? 'checkbox-outline' : 'calendar-outline'} color={colors.primary} /><Label muted size={11}>{item.time ?? (item.kind === 'task' ? 'Due' : 'All day')}</Label></View>
      <View style={{ flex: 1, gap: spacing.xs }}><Label bold>{item.title}</Label><Label muted size={12}>{item.detail}</Label></View>
      <Badge title={item.kind === 'task' ? 'Task' : item.kind === 'event' ? 'Event' : 'Plan'} tone={item.kind === 'task' ? 'neutral' : 'primary'} />
    </View></Card>
  </Pressable>;
}
