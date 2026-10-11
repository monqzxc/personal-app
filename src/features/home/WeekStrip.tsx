import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { Button, IconButton, Label, layout } from '../../components/common/ui';
import { useTheme } from '../../theme/useTheme';
import { addDays, formatDate, localDate } from '../../utils/dates';
import { weekDates } from './dayPlan';

export function WeekStrip({ selected, today, marked, onSelect }: { selected: string; today: string; marked: Set<string>; onSelect: (date: string | null) => void }) {
  const { colors, spacing, radius } = useTheme();
  const { fontScale } = useWindowDimensions();
  const [width, setWidth] = useState(0);
  const scroll = useRef<ScrollView>(null);
  const days = weekDates(selected);
  const cellWidth = Math.max(48 * fontScale, Math.floor((width - spacing.sm * 6) / 7));
  const selectedIndex = days.indexOf(selected);
  const offset = Math.max(0, selectedIndex * (cellWidth + spacing.sm) - width / 2 + cellWidth / 2);
  useEffect(() => { scroll.current?.scrollTo({ x: offset, animated: false }); }, [offset, days[0]]);
  return <View style={{ gap: spacing.md }}>
    <View style={[layout.row, { justifyContent: 'space-between' }]}><Label size={22} bold>Your week</Label><Button title="Today" variant="ghost" onPress={() => onSelect(null)} /></View>
    <View style={layout.row}>
      <IconButton icon="chevron-back" label="Previous week" onPress={() => onSelect(addDays(selected, -7))} />
      <Label muted bold style={{ flex: 1, textAlign: 'center' }}>{formatDate(days[0]!)} - {formatDate(days[6]!)}</Label>
      <IconButton icon="chevron-forward" label="Next week" onPress={() => onSelect(addDays(selected, 7))} />
    </View>
    <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator={false} onLayout={event => setWidth(event.nativeEvent.layout.width)} onContentSizeChange={() => scroll.current?.scrollTo({ x: offset, animated: false })} contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.sm }}>
      {days.map(day => {
        const active = day === selected;
        const text = active ? colors.onPrimary : colors.text;
        return <Pressable key={day} accessibilityRole="button" accessibilityLabel={`${localDate(day).toLocaleDateString(undefined, { dateStyle: 'full' })}${day === today ? ', today' : ''}${marked.has(day) ? ', has plans' : ', no plans'}`} accessibilityState={{ selected: active }} onPress={() => onSelect(day === today ? null : day)}
          style={({ pressed }) => ({ width: cellWidth, minHeight: 92, alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: active || day === today ? colors.primary : colors.border, backgroundColor: active ? colors.primary : colors.surface, opacity: pressed ? 0.8 : 1, shadowColor: colors.primary, shadowOpacity: active ? 0.3 : 0, shadowRadius: 9, shadowOffset: { width: 0, height: 2 }, elevation: active ? 3 : 0 })}>
          <Label size={12} color={text}>{localDate(day).toLocaleDateString(undefined, { weekday: 'short' })}</Label>
          <Label size={22} bold color={text}>{Number(day.slice(-2))}</Label>
          <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: marked.has(day) ? text : colors.transparent }} />
        </Pressable>;
      })}
    </ScrollView>
  </View>;
}
