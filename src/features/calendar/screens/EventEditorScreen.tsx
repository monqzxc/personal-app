import { useState } from 'react';
import { Switch, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AppHeader, Button, Card, EmptyState, Field, Label, Screen, layout } from '../../../components/common/ui';
import { ConfirmationModal } from '../../../components/common/ConfirmationModal';
import { useAppStore } from '../../../stores/useAppStore';
import { useTheme } from '../../../theme/useTheme';
import { emptyEvent } from '../../../services/calendarService';
import type { EventInput } from '../../../types/models';
import { isDateOnly } from '../../../utils/dates';
import { ReminderField } from '../../../components/forms/RecordFields';
import { deviceCalendarService } from '../../../services/deviceCalendarService';
import { DateField } from '../../../components/forms/DateField';
import { PeopleField } from '../../../components/forms/PeopleField';

export default function EventEditorScreen() {
  const { id, date, inboxId, personId } = useLocalSearchParams<{ id?: string; date?: string; inboxId?: string; personId?: string }>();
  const capture = useAppStore(state => state.data.inbox.find(item => item.id === inboxId));
  const existing = useAppStore(state => state.events.find(event => event.id === id));
  const save = useAppStore(state => state.saveEvent);
  const remove = useAppStore(state => state.deleteEvent);
  const saving = useAppStore(state => state.saving);
  const { colors } = useTheme();
  const [draft, setDraft] = useState<EventInput>(() => existing ?? { ...emptyEvent(isDateOnly(date) ? date : undefined), title: capture?.content ?? '', ...(personId ? { peopleIds: [personId] } : {}) });
  const [exportMessage, setExportMessage] = useState('');
  const [exporting, setExporting] = useState(false);
  const [confirm, setConfirm] = useState(false);
  function change<K extends keyof EventInput>(key: K, value: EventInput[K]) { setDraft(previous => ({ ...previous, [key]: value })); }
  if (id && !existing) return <Screen><EmptyState title="Event not found" description="This event may have been deleted." action={<Button title="Back" onPress={() => router.back()} />} /></Screen>;
  return <Screen>
    <AppHeader title={id ? 'Keep your plans in view.' : 'Make time for it.'} eyebrow={id ? 'Edit event' : 'New event'} />
    <Field label="Title *" placeholder="What’s on your calendar?" value={draft.title} onChangeText={value => change('title', value)} maxLength={200} autoFocus />
    <Field label="Description" placeholder="A few helpful details" value={draft.description} onChangeText={value => change('description', value)} multiline />
    <View style={[layout.row, { alignItems: 'flex-start' }]}>
      <View style={{ flex: 1 }}><DateField label="Start date *" value={draft.startDate} onChange={value => setDraft(previous => ({ ...previous, startDate: value ?? '', endDate: previous.endDate === previous.startDate ? value ?? '' : previous.endDate }))} /></View>
      <View style={{ flex: 1 }}><DateField label="End date *" value={draft.endDate} onChange={value => change('endDate', value ?? '')} /></View>
    </View>
    <Card><View style={[layout.row, { justifyContent: 'space-between' }]}><Label bold>All-day event</Label><Switch trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.surface} accessibilityLabel="All-day event" value={draft.allDay} onValueChange={value => change('allDay', value)} /></View></Card>
    {!draft.allDay && <View style={[layout.row, { alignItems: 'flex-start' }]}>
      <View style={{ flex: 1 }}><Field label="Start time *" placeholder="09:00" hint="24-hour · HH:mm" value={draft.startTime ?? ''} maxLength={5} onChangeText={value => change('startTime', value || null)} /></View>
      <View style={{ flex: 1 }}><Field label="End time *" placeholder="10:00" hint="24-hour · HH:mm" value={draft.endTime ?? ''} maxLength={5} onChangeText={value => change('endTime', value || null)} /></View>
    </View>}
    <Field label="Location" placeholder="Where will you be?" value={draft.location} onChangeText={value => change('location', value)} />
    <Field label="Category" placeholder="Personal, Work, Birthday…" value={draft.category} onChangeText={value => change('category', value)} />
    <ReminderField value={draft.reminder} onChange={value => change('reminder', value)} />
    <PeopleField value={draft.peopleIds} onChange={value => change('peopleIds', value)} />
    <Button title={id ? 'Save changes' : 'Create event'} busy={saving} onPress={() => { void save(draft, id, inboxId).then(ok => { if (ok) router.back(); }); }} />
    {existing && <Button title="Export a copy to device calendar" variant="secondary" busy={exporting} onPress={() => {
      setExporting(true); void deviceCalendarService.exportEvent(existing).then(setExportMessage).catch((error: unknown) => setExportMessage(error instanceof Error ? error.message : 'Export failed.')).finally(() => setExporting(false));
    }} />}
    {exportMessage && <Label>{exportMessage}</Label>}
    <Button title="Cancel" variant="ghost" disabled={saving} onPress={() => router.back()} />
    {id && <Button title="Delete event" variant="danger" disabled={saving} onPress={() => setConfirm(true)} />}
    <ConfirmationModal visible={confirm} title="Delete this event?" message="This event will be removed from your calendar." busy={saving} onCancel={() => setConfirm(false)} onConfirm={() => {
      if (id) void remove(id).then(ok => { setConfirm(false); if (ok) router.back(); });
    }} />
  </Screen>;
}
