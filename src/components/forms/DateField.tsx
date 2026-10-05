import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { Button, Card, Field, IconButton, Label, layout } from '../common/ui';
import { dateOnly, isDateOnly, localDate, monthCells } from '../../utils/dates';
import { useTheme } from '../../theme/useTheme';

export function DateField({ label, value, onChange, optional = false }: { label: string; value: string | null; onChange: (value: string | null) => void; optional?: boolean }) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(`${isDateOnly(value) ? value.slice(0, 7) : dateOnly().slice(0, 7)}-01`);
  const { colors, spacing, radius } = useTheme();
  function move(offset: number) { const date = localDate(month); date.setMonth(date.getMonth() + offset); setMonth(dateOnly(date)); }
  return <View style={{ gap: spacing.sm }}><Field label={label} placeholder="YYYY-MM-DD" value={value ?? ''} maxLength={10} onChangeText={text => onChange(text || null)} />
    <Button title="Choose date" icon="calendar-outline" variant="ghost" onPress={() => { setMonth(`${isDateOnly(value) ? value.slice(0, 7) : dateOnly().slice(0, 7)}-01`); setOpen(true); }} />
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}><View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, backgroundColor: colors.overlay }}><Card style={{ width: '100%', maxWidth: 430 }}><View accessibilityViewIsModal style={{ gap: spacing.md }}>
      <View style={[layout.row, { justifyContent: 'space-between' }]}><IconButton icon="chevron-back" label="Previous month" onPress={() => move(-1)} /><Label bold style={{ flex: 1, textAlign: 'center' }}>{localDate(month).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</Label><IconButton icon="chevron-forward" label="Next month" onPress={() => move(1)} /></View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <View key={index} style={{ width: '14.2857%', alignItems: 'center', paddingVertical: spacing.sm }}><Label muted size={12}>{day}</Label></View>)}
        {monthCells(month).map((date, index) => <View key={date ?? `blank-${index}`} style={{ width: '14.2857%' }}>{date ? <Pressable accessibilityRole="button" accessibilityLabel={date} accessibilityState={{ selected: date === value }} onPress={() => { onChange(date); setOpen(false); }} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, backgroundColor: date === value ? colors.primary : colors.transparent }}><Label color={date === value ? colors.onPrimary : colors.text}>{Number(date.slice(-2))}</Label></Pressable> : <View style={{ minHeight: 44 }} />}</View>)}
      </View><Button title="Today" variant="secondary" onPress={() => { onChange(dateOnly()); setOpen(false); }} />{optional && <Button title="Clear date" variant="ghost" onPress={() => { onChange(null); setOpen(false); }} />}<Button title="Close" variant="ghost" onPress={() => setOpen(false)} />
    </View></Card></View></Modal>
  </View>;
}
