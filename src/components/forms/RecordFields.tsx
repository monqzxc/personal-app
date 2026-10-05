import { useState } from 'react';
import { Switch, View } from 'react-native';
import type { Reminder, Subtask } from '../../types/models';
import type { FieldDefinition } from '../../features/library/catalog';
import { recordTitle } from '../../features/library/catalog';
import { useAppStore } from '../../stores/useAppStore';
import { createId } from '../../services/container';
import { dateOnly, isDateOnly } from '../../utils/dates';
import { Button, Card, Chips, Field, Label, layout } from '../common/ui';
import { useTheme } from '../../theme/useTheme';
import { DateField } from './DateField';

export function ReminderField({ value, onChange }: { value: Reminder | null; onChange: (value: Reminder | null) => void }) {
  const date = value && Number.isFinite(Date.parse(value.at)) ? new Date(value.at) : null;
  const [input, setInput] = useState(date ? `${dateOnly(date)} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` : value?.at ?? '');
  return <Field label="Remind me" placeholder="YYYY-MM-DD HH:mm" hint="Optional · device local time. Enable device reminders in Settings." value={input} onChangeText={text => {
    setInput(text);
    if (!text.trim()) { onChange(null); return; }
    const [day, time] = text.trim().split(' ');
    onChange({ at: isDateOnly(day) && time && /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? new Date(`${day}T${time}:00`).toISOString() : text });
  }} />;
}
export function RelationField({ field, value, onChange }: { field: FieldDefinition; value: string; onChange: (value: string) => void }) {
  const data = useAppStore(state => state.data);
  const [search, setSearch] = useState('');
  const collection = field.collection!;
  const records = data[collection];
  const selected = records.find(item => item.id === value);
  const visible = records.filter(item => recordTitle(collection, item).toLowerCase().includes(search.toLowerCase())).slice(0, 15);
  return <Card><Label bold>{field.label}{field.required ? ' *' : ''}</Label>
    <Label muted>{selected ? recordTitle(collection, selected) : value ? 'Linked record no longer available' : 'None selected'}</Label>
    <Field label={`Find ${field.label.toLowerCase()}`} placeholder="Search by name" value={search} onChangeText={setSearch} />
    <View style={layout.wrap}>{visible.map(item => <Button key={item.id} title={recordTitle(collection, item)} variant={item.id === value ? 'primary' : 'secondary'} onPress={() => onChange(item.id)} />)}</View>
    {!records.length && <Label muted>Create a {field.label.toLowerCase()} first, then link it here.</Label>}
    {value && <Button title="Clear link" variant="ghost" onPress={() => onChange('')} />}
  </Card>;
}
export function ChecklistField({ label, value, onChange }: { label: string; value: Subtask[]; onChange: (value: Subtask[]) => void }) {
  const [title, setTitle] = useState('');
  return <Card><Label bold>{label}</Label>{value.map(item => <View key={item.id} style={layout.row}>
    <Switch accessibilityLabel={`Complete ${item.title}`} value={item.completed} onValueChange={completed => onChange(value.map(step => step.id === item.id ? { ...step, completed } : step))} />
    <View style={{ flex: 1 }}><Field label="Milestone title" value={item.title} maxLength={200} onChangeText={text => onChange(value.map(step => step.id === item.id ? { ...step, title: text } : step))} /></View>
    <Button title="Remove" variant="ghost" onPress={() => onChange(value.filter(step => step.id !== item.id))} />
  </View>)}<Field label="New milestone" value={title} maxLength={200} onChangeText={setTitle} placeholder="A small step forward" /><Button title="Add milestone" variant="secondary" disabled={!title.trim()} onPress={() => { onChange([...value, { id: createId(), title: title.trim(), completed: false }]); setTitle(''); }} /></Card>;
}
export function RecordField({ field, value, onChange }: { field: FieldDefinition; value: unknown; onChange: (value: unknown) => void }) {
  const { colors } = useTheme();
  const label = `${field.label}${field.required ? ' *' : ''}`;
  if (field.type === 'boolean') return <View style={[layout.row, { justifyContent: 'space-between' }]}><View style={{ flex: 1 }}><Label bold>{label}</Label></View><Switch accessibilityLabel={label} value={Boolean(value)} trackColor={{ true: colors.primary }} onValueChange={onChange} /></View>;
  if (field.type === 'choice') return <View style={layout.stack}><Label bold>{label}</Label><Chips items={field.options ?? []} value={String(value)} onChange={onChange} /></View>;
  if (field.type === 'relation') return <RelationField field={field} value={String(value ?? '')} onChange={onChange} />;
  if (field.type === 'checklist') return <ChecklistField label={label} value={value as Subtask[]} onChange={onChange} />;
  if (field.type === 'reminder') return <ReminderField value={value as Reminder | null} onChange={onChange} />;
  if (field.type === 'date') return <DateField label={label} value={value as string | null} optional={!field.required} onChange={onChange} />;
  const placeholder = field.type === 'month' ? 'YYYY-MM' : field.type === 'time' ? 'HH:mm' : field.type === 'url' ? 'https://' : undefined;
  return <Field label={label} value={field.type === 'tags' ? (value as string[]).join(',') : value === null ? '' : String(value ?? '')} placeholder={placeholder}
    multiline={field.type === 'long'} keyboardType={field.type === 'number' ? 'decimal-pad' : field.type === 'email' ? 'email-address' : field.type === 'url' ? 'url' : 'default'}
    autoCapitalize={['email', 'url', 'date', 'time', 'month'].includes(field.type) ? 'none' : 'sentences'}
    hint={field.type === 'tags' ? 'Separate with commas.' : undefined}
    onChangeText={text => onChange(field.type === 'tags' ? text.split(',') : text)} />;
}
