import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { AppHeader, Button, Card, EmptyState, IconButton, Label, Screen, SectionHeader, layout } from '../../../components/common/ui';
import { useAppStore } from '../../../stores/useAppStore';
import { useTheme } from '../../../theme/useTheme';
import { agendaForDate, buildAgenda } from '../../../services/calendarService';
import { dateOnly, formatDate, localDate, monthCells } from '../../../utils/dates';
import { useToday } from '../../../hooks/useToday';
import { AgendaCard } from '../components/AgendaCard';

export default function CalendarScreen() {
  const today = useToday();
  const [selected, setSelected] = useState(today);
  const [month, setMonth] = useState(`${today.slice(0, 7)}-01`);
  const { colors, radius, spacing } = useTheme();
  const tasks = useAppStore(state => state.tasks);
  const events = useAppStore(state => state.events);
  const data = useAppStore(state => state.data);
  const agenda = buildAgenda(events, tasks, data, Number(month.slice(0, 4)));
  const visible = agendaForDate(agenda, selected);
  function moveMonth(offset: number) {
    const next = localDate(month);
    next.setMonth(next.getMonth() + offset);
    const value = dateOnly(next);
    setMonth(value);
    setSelected(value);
  }
  return <Screen>
    <AppHeader eyebrow="Your calendar" title="A little perspective." />
    <Card>
      <View style={[layout.row, { justifyContent: 'space-between' }]}>
        <IconButton icon="chevron-back" label="Previous month" onPress={() => moveMonth(-1)} />
        <Label size={18} bold style={{ flex: 1, textAlign: 'center' }}>{localDate(month).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</Label>
        <IconButton icon="chevron-forward" label="Next month" onPress={() => moveMonth(1)} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <View key={`header-${index}`} style={{ width: '14.2857%', alignItems: 'center', paddingVertical: spacing.sm }}><Label muted size={12}>{day}</Label></View>)}
        {monthCells(month).map((date, index) => <View key={date ?? `blank-${index}`} style={{ width: '14.2857%', padding: 1 }}>
          {date ? <Pressable accessibilityRole="button" accessibilityLabel={localDate(date).toLocaleDateString(undefined, { dateStyle: 'full' })} accessibilityState={{ selected: selected === date }}
            onPress={() => setSelected(date)} style={{ minHeight: 46, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', gap: 3,
              backgroundColor: selected === date ? colors.primary : date === today ? colors.primarySoft : colors.transparent }}>
            <Label size={14} bold={date === today || date === selected} color={selected === date ? colors.onPrimary : colors.text}>{Number(date.slice(-2))}</Label>
            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: agendaForDate(agenda, date).length ? selected === date ? colors.onPrimary : colors.primary : colors.transparent }} />
          </Pressable> : <View style={{ minHeight: 46 }} />}
        </View>)}
      </View>
      <Button title="Back to today" variant="ghost" onPress={() => { setSelected(today); setMonth(`${today.slice(0, 7)}-01`); }} />
    </Card>
    <SectionHeader title={selected === today ? 'Today’s agenda' : formatDate(selected)} />
    <Button title="Add an event" variant="secondary" icon="add" onPress={() => router.push({ pathname: '/event', params: { date: selected } })} />
    {visible.map(item => <AgendaCard key={item.id} item={item} />)}
    {!visible.length && <EmptyState icon="sunny-outline" title="An open day" description="Your events and active task deadlines will appear here." />}
    <Button title="Device calendar integration" variant="ghost" onPress={() => router.push('/calendar-integration')} />
    <Label muted size={12}>Events, deadlines, payments, trips, renewals, and important dates</Label>
  </Screen>;
}
